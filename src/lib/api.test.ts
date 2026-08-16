import { beforeEach, describe, expect, it, vi } from "vitest";

// ---- Mock the Firestore SDK + Firebase app so api.ts logic runs in-memory ----
// vi.hoisted runs before the (hoisted) vi.mock factory, so the module object
// exists when the factory closes over it.
const firestoreModule = vi.hoisted(() => ({
  getFirestore: vi.fn(() => ({ __type: "firestore" })),
  collection: vi.fn((_db: unknown, path: string) => ({ __type: "collection", path })),
  doc: vi.fn(
    (_db: unknown, path: string, ...ids: string[]) => ({ __type: "doc", path, ids }),
  ),
  getDoc: vi.fn(),
  setDoc: vi.fn(),
  updateDoc: vi.fn(),
  deleteDoc: vi.fn(),
  addDoc: vi.fn(async (_ref: unknown, data: unknown) => ({ id: "new-idea-id", ...(data as object) })),
  getDocs: vi.fn(),
  query: vi.fn((q: unknown) => q),
  where: vi.fn(),
  orderBy: vi.fn(),
  limit: vi.fn(),
  onSnapshot: vi.fn(),
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

beforeEach(() => {
  vi.clearAllMocks();
});

describe("createIdea", () => {
  it("creates an idea in pending status with empty upvotes and timeline", async () => {
    const id = await createIdea(
      { title: "Solar benches", description: "Charge your phone in the sun", authorId: "u1", authorName: "Ada" },
      db,
    );

    expect(firestoreModule.addDoc).toHaveBeenCalledTimes(1);
    const [ref, data] = firestoreModule.addDoc.mock.calls[0] as [unknown, Record<string, unknown>];
    expect(ref).toEqual({ __type: "collection", path: "ideas" });
    expect(data).toMatchObject({
      title: "Solar benches",
      description: "Charge your phone in the sun",
      authorId: "u1",
      authorName: "Ada",
      status: "pending",
      upvoteUserIds: [],
      upvoteCount: 0,
      moderationFeedback: null,
      timeline: [],
    });
    expect(data.createdAt).toEqual({ __type: "serverTimestamp" });
    expect(id).toBe("new-idea-id");
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
  it("creates a support doc keyed ideaId_leaderId", async () => {
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
  });

  it("deletes the support doc to un-support", async () => {
    await unsupportIdea("i1", "u9", db);

    expect(firestoreModule.deleteDoc).toHaveBeenCalledWith(
      { __type: "doc", path: "supports", ids: ["i1_u9"] },
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