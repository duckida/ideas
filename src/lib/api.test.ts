import { beforeEach, describe, expect, it, vi } from "vitest";

// ---- Mock the Firestore SDK + Firebase app so api.ts logic runs in-memory ----
// vi.hoisted runs before the (hoisted) vi.mock factory, so the module object
// exists when the factory closes over it.
const firestoreModule = vi.hoisted(() => ({
  getFirestore: vi.fn(() => ({ __type: "firestore" })),
  collection: vi.fn((_db: unknown, path: string) => ({ __type: "collection", path })),
  collectionGroup: vi.fn((_db: unknown, path: string) => ({ __type: "collectionGroup", path })),
  doc: vi.fn((_db: unknown, path?: string, ...ids: string[]) => {
    // doc(collectionRef) — mint a fresh doc ref under that collection.
    if (
      path === undefined &&
      _db &&
      typeof _db === "object" &&
      (_db as { __type?: string }).__type === "collection"
    ) {
      return { __type: "doc", path: (_db as { path: string }).path, ids: ["auto-id"], id: "auto-id" };
    }
    return { __type: "doc", path: String(path), ids };
  }),
  getDoc: vi.fn(),
  setDoc: vi.fn(),
  updateDoc: vi.fn(),
  deleteDoc: vi.fn(),
  getDocs: vi.fn(),
  query: vi.fn((q: unknown) => q),
  where: vi.fn(),
  orderBy: vi.fn(),
  limit: vi.fn(),
  onSnapshot: vi.fn(),
  runTransaction: vi.fn(async (_db: unknown, fn: (tx: unknown) => Promise<unknown>) => fn({})),
  serverTimestamp: vi.fn(() => ({ __type: "serverTimestamp" })),
  arrayUnion: vi.fn((...vals: unknown[]) => ({ __op: "arrayUnion", vals })),
  arrayRemove: vi.fn((...vals: unknown[]) => ({ __op: "arrayRemove", vals })),
  increment: vi.fn((n: number) => ({ __op: "increment", n })),
}));

vi.mock("firebase/firestore", () => firestoreModule);
vi.mock("@/lib/firebase", () => ({ getFirebaseApp: vi.fn(() => ({})) }));

import {
  createIdea,
  deleteIdea,
  moderateIdea,
  postTimelineUpdate,
  setUpvote,
  supportIdea,
  unsupportIdea,
} from "./api";

const db = { __type: "firestore" } as never;
const ideaDoc = (id: string) => ({ __type: "doc", path: "ideas", ids: [id] });

/**
 * A minimal fake Transaction bound to a users store. The real transaction in
 * createIdea only reads the users/{uid} document (no queries), so this covers
 * exactly the calls api.ts makes.
 */
function txSnapshot(userData: Record<string, unknown> | null) {
  return {
    get: vi.fn(async () => ({
      exists: () => userData !== null,
      data: () => userData ?? {},
      get: (k: string) => (userData ? userData[k] : undefined),
    })),
    set: vi.fn(),
    update: vi.fn(),
  };
}

/** A fake query snapshot returned from getDocs (for the cap pre-read). */
function querySnap(size: number) {
  return { size, empty: size === 0, docs: Array.from({ length: size }, () => ({})) };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("createIdea (rate-limited)", () => {
  it("creates an idea in pending status with empty upvotes/timeline + stamps lastIdeaAt", async () => {
    firestoreModule.getDocs.mockResolvedValue(querySnap(0)); // cap pre-read under limit
    const tx = txSnapshot({ uid: "u1", displayName: "Ada", lastIdeaAt: null });
    firestoreModule.runTransaction.mockImplementationOnce(async (_db: unknown, fn: (t: unknown) => Promise<unknown>) =>
      fn(tx),
    );

    const id = await createIdea(
      { title: "Solar benches", description: "Charge your phone in the sun", authorId: "u1", authorName: "Ada", showAuthorName: true },
      db,
    );

    // Cap pre-read: queried against the ideas collection with a limit.
    expect(firestoreModule.getDocs).toHaveBeenCalledTimes(1);
    expect(firestoreModule.limit).toHaveBeenCalledWith(5);

    expect(firestoreModule.runTransaction).toHaveBeenCalledTimes(1);
    expect(tx.get).toHaveBeenCalledWith({ __type: "doc", path: "users", ids: ["u1"] });
    expect(tx.set).toHaveBeenCalledTimes(1);
    const [ref, data] = tx.set.mock.calls[0] as [unknown, Record<string, unknown>];
    expect(ref).toEqual(expect.objectContaining({ __type: "doc", path: "ideas" }));
    expect(data).toMatchObject({
      title: "Solar benches",
      description: "Charge your phone in the sun",
      authorId: "u1",
      authorName: "Ada",
      showAuthorName: true,
      status: "pending",
      upvoteUserIds: [],
      upvoteCount: 0,
      supportCount: 0,
      moderationFeedback: null,
      timeline: [],
    });
    expect(data.createdAt).toEqual({ __type: "serverTimestamp" });
    expect(tx.update).toHaveBeenCalledWith(
      { __type: "doc", path: "users", ids: ["u1"] },
      { lastIdeaAt: { __type: "serverTimestamp" } },
    );
    expect(id).toBeTruthy();
  });

  it("rejects a second idea submitted inside the rate window", async () => {
    firestoreModule.getDocs.mockResolvedValue(querySnap(0));
    // lastIdeaAt 8s ago — inside the 10s window.
    const tx = txSnapshot({
      uid: "u1",
      displayName: "Ada",
      lastIdeaAt: { toMillis: () => Date.now() - 8 * 1000 },
    });
    firestoreModule.runTransaction.mockImplementationOnce(async (_db: unknown, fn: (t: unknown) => Promise<unknown>) =>
      fn(tx),
    );

    await expect(
      createIdea({ title: "T2", description: "d", authorId: "u1", authorName: "Ada", showAuthorName: true }, db),
    ).rejects.toThrow("ideas_rate_limited");
    expect(tx.set).not.toHaveBeenCalled();
  });

  it("allows an idea once the rate window has elapsed", async () => {
    firestoreModule.getDocs.mockResolvedValue(querySnap(0));
    const tx = txSnapshot({
      uid: "u1",
      displayName: "Ada",
      lastIdeaAt: { toMillis: () => Date.now() - 60 * 1000 },
    });
    firestoreModule.runTransaction.mockImplementationOnce(async (_db: unknown, fn: (t: unknown) => Promise<unknown>) =>
      fn(tx),
    );

    await expect(
      createIdea({ title: "T3", description: "d", authorId: "u1", authorName: "Ada", showAuthorName: true }, db),
    ).resolves.toBeTruthy();
  });

  it("aborts before the transaction when the author already has the max pending ideas", async () => {
    // Cap pre-read sees 5 pending ideas → 5 >= 5.
    firestoreModule.getDocs.mockResolvedValue(querySnap(5));

    await expect(
      createIdea({ title: "T4", description: "d", authorId: "u1", authorName: "Ada", showAuthorName: true }, db),
    ).rejects.toThrow("ideas_limit_reached");
    expect(firestoreModule.runTransaction).not.toHaveBeenCalled();
  });

  it("fails fast when the user doc is missing", async () => {
    firestoreModule.getDocs.mockResolvedValue(querySnap(0));
    const tx = txSnapshot(null);
    firestoreModule.runTransaction.mockImplementationOnce(async (_db: unknown, fn: (t: unknown) => Promise<unknown>) =>
      fn(tx),
    );

    await expect(
      createIdea({ title: "T5", description: "d", authorId: "nobody", authorName: "Ghost", showAuthorName: true }, db),
    ).rejects.toThrow("user_not_found");
    expect(tx.set).not.toHaveBeenCalled();
  });
});

describe("setUpvote (upvote toggle)", () => {
  it("adds the user and increments the count when active", async () => {
    await setUpvote("i1", "u1", true, db);

    expect(firestoreModule.updateDoc).toHaveBeenCalledWith(
      ideaDoc("i1"),
      {
        upvoteUserIds: { __op: "arrayUnion", vals: ["u1"] },
        upvoteCount: { __op: "increment", n: 1 },
        updatedAt: { __type: "serverTimestamp" },
      },
    );
  });

  it("removes the user and decrements the count when inactive", async () => {
    await setUpvote("i1", "u1", false, db);

    expect(firestoreModule.updateDoc).toHaveBeenCalledWith(
      ideaDoc("i1"),
      {
        upvoteUserIds: { __op: "arrayRemove", vals: ["u1"] },
        upvoteCount: { __op: "increment", n: -1 },
        updatedAt: { __type: "serverTimestamp" },
      },
    );
  });
});

describe("moderateIdea", () => {
  it("approves and attaches no feedback", async () => {
    await moderateIdea("i1", "approve", "", "mod1", db);

    expect(firestoreModule.updateDoc).toHaveBeenCalledWith(
      ideaDoc("i1"),
      expect.objectContaining({ status: "approved" }),
    );
  });

  it("request_changes sets changes_requested with a message for the author", async () => {
    await moderateIdea("i1", "request_changes", "Add a budget estimate", "mod1", db);

    const update = firestoreModule.updateDoc.mock.calls[0][1] as Record<string, unknown>;
    expect(update.status).toBe("changes_requested");
    expect(update.moderationFeedback).toEqual({
      message: "Add a budget estimate",
      by: "mod1",
      at: { __type: "serverTimestamp" },
    });
  });

  it("reject sets rejected with a message", async () => {
    await moderateIdea("i1", "reject", "Out of scope for this year", "mod1", db);

    const update = firestoreModule.updateDoc.mock.calls[0][1] as Record<string, unknown>;
    expect(update.status).toBe("rejected");
    expect(update.moderationFeedback).toEqual({
      message: "Out of scope for this year",
      by: "mod1",
      at: { __type: "serverTimestamp" },
    });
  });
});

describe("supportIdea / unsupportIdea", () => {
  it("creates a support doc and increments the idea's supportCount", async () => {
    await supportIdea("i1", { uid: "u9", displayName: "Ms. Kim" }, db);

    expect(firestoreModule.setDoc).toHaveBeenCalledWith(
      { __type: "doc", path: "supports", ids: ["i1_u9"] },
      {
        ideaId: "i1",
        leaderId: "u9",
        leaderName: "Ms. Kim",
        createdAt: { __type: "serverTimestamp" },
      },
    );
    expect(firestoreModule.updateDoc).toHaveBeenCalledWith(
      ideaDoc("i1"),
      expect.objectContaining({
        supportCount: { __op: "increment", n: 1 },
        updatedAt: { __type: "serverTimestamp" },
      }),
    );
  });

  it("deletes the support doc and decrements the idea's supportCount", async () => {
    await unsupportIdea("i1", "u9", db);

    expect(firestoreModule.deleteDoc).toHaveBeenCalledWith(
      { __type: "doc", path: "supports", ids: ["i1_u9"] },
    );
    expect(firestoreModule.updateDoc).toHaveBeenCalledWith(
      ideaDoc("i1"),
      expect.objectContaining({
        supportCount: { __op: "increment", n: -1 },
        updatedAt: { __type: "serverTimestamp" },
      }),
    );
  });
});

describe("postTimelineUpdate (embedded in idea doc)", () => {
  it("appends a timeline entry with leader info, message, id and timestamp", async () => {
    await postTimelineUpdate("i1", { uid: "u9", displayName: "Ms. Kim" }, "Funding secured!", db);

    expect(firestoreModule.updateDoc).toHaveBeenCalledTimes(1);
    const update = firestoreModule.updateDoc.mock.calls[0][1] as {
      timeline: { __op: string; vals: unknown[] };
    };
    expect(update.timeline.__op).toBe("arrayUnion");
    const entry = update.timeline.vals[0] as Record<string, unknown>;
    expect(entry).toMatchObject({
      leaderId: "u9",
      leaderName: "Ms. Kim",
      message: "Funding secured!",
      createdAt: { __type: "serverTimestamp" },
    });
    expect(typeof entry.id).toBe("string");
    expect((entry.id as string).length).toBeGreaterThan(0);
  });
});

describe("deleteIdea", () => {
  it("deletes the idea doc", async () => {
    await deleteIdea("i1", db);

    expect(firestoreModule.deleteDoc).toHaveBeenCalledWith(ideaDoc("i1"));
  });
});