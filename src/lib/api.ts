// Firestore data-access layer for the Ideas portal.
// All reads/writes go through these functions; components never touch the SDK
// directly. Timestamps, server-side counters and array ops keep the UI in sync
// without client-side re-computation.

import {
  getFirestore,
  collection,
  collectionGroup,
  doc,
  setDoc,
  updateDoc,
  deleteDoc,
  getDoc,
  getDocs,
  query,
  where,
  orderBy,
  limit,
  serverTimestamp,
  arrayUnion,
  arrayRemove,
  increment,
  runTransaction,
  Timestamp,
  type Firestore,
} from "firebase/firestore";
import { getFirebaseApp } from "@/lib/firebase";
import {
  MAX_TITLE_LENGTH,
  MAX_DESCRIPTION_LENGTH,
  MAX_PENDING_PER_AUTHOR,
  MIN_IDEA_GAP_SECONDS,
  LAST_IDEA_AT_FIELD,
} from "@/lib/defs";
import {
  DEFAULT_ROLE,
  type Idea,
  type IdeaStatus,
  type Role,
  type SupportDoc,
  type Topic,
  type UserDoc,
} from "@/lib/types";
import { MAX_TOPIC_LENGTH } from "@/lib/defs";

function db(): Firestore {
  return getFirestore(getFirebaseApp());
}

export interface NewIdeaInput {
  title: string;
  description: string;
  authorId: string;
  authorName: string;
  authorTitle?: string;
  showAuthorName: boolean;
  /** Denormalized author email (stored when the idea is not anonymous). */
  authorEmail?: string;
  /** When set, the idea is a response to this topic (the topic box flow). */
  topic?: { id: string; question: string };
}

export interface IdeaLimits {
  title: number;
  description: number;
  pendingPerAuthor: number;
  minGapMinutes: number;
}

/** The limits the UI displays; mirrors firestore.rules + defs.ts. */
export function ideaLimits(): IdeaLimits {
  return {
    title: MAX_TITLE_LENGTH,
    description: MAX_DESCRIPTION_LENGTH,
    pendingPerAuthor: MAX_PENDING_PER_AUTHOR,
    minGapMinutes: Math.ceil(MIN_IDEA_GAP_SECONDS / 60),
  };
}

/**
 * Create an idea — always starts in `pending` and goes to moderation.
 * The per-author rate window runs atomically in a transaction (doc reads
 * only: users/{uid}.lastIdeaAt). The pending-per-author cap is enforced with
 * a best-effort pre-read before submission and by firestore.rules' rate gate;
 * a strict cap would require a FieldValue counter the rules can't read.
 */
export async function createIdea(
  input: NewIdeaInput,
  firestore: Firestore = db(),
): Promise<string> {
  const userRef = doc(firestore, "users", input.authorId);
  const now = new Date();

  // Best-effort cap check: at most MAX_PENDING_PER_AUTHOR pending ideas.
  const recent = query(
    collection(firestore, "ideas"),
    where("authorId", "==", input.authorId),
    where("status", "==", "pending"),
    limit(MAX_PENDING_PER_AUTHOR),
  );
  const recentSnap = await getDocs(recent);
  if (recentSnap.size >= MAX_PENDING_PER_AUTHOR) {
    throw new Error("ideas_limit_reached");
  }

  return runTransaction(firestore, async (tx) => {
    const userSnap = await tx.get(userRef);
    if (!userSnap.exists()) {
      throw new Error("user_not_found");
    }
    const lastAt = userSnap.get("lastIdeaAt") as { toMillis: () => number } | null | undefined;
    if (lastAt && now.getTime() - lastAt.toMillis() < MIN_IDEA_GAP_SECONDS * 1000) {
      throw new Error("ideas_rate_limited");
    }

    const ref = doc(collection(firestore, "ideas"));
    tx.set(ref, {
      title: input.title,
      description: input.description,
      status: "pending",
      authorId: input.authorId,
      authorName: input.authorName,
      authorTitle: input.authorTitle ?? null,
      authorEmail: input.authorEmail ?? null,
      showAuthorName: input.showAuthorName,
      topicId: input.topic?.id ?? null,
      topicQuestion: input.topic?.question ?? null,
      upvoteUserIds: [],
      upvoteCount: 0,
      supportCount: 0,
      moderationFeedback: null,
      timeline: [],
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    tx.update(userRef, { [LAST_IDEA_AT_FIELD]: serverTimestamp() });
    return ref.id;
  });
}

/** Toggle a user's upvote on an idea and keep the counter in sync. */
export async function setUpvote(
  ideaId: string,
  userId: string,
  active: boolean,
  firestore: Firestore = db(),
): Promise<void> {
  await updateDoc(doc(firestore, "ideas", ideaId), {
    upvoteUserIds: active ? arrayUnion(userId) : arrayRemove(userId),
    upvoteCount: increment(active ? 1 : -1),
    updatedAt: serverTimestamp(),
  });
}

export type ModerationAction = "approve" | "request_changes" | "reject";

/**
 * Moderate an idea. `approve` and `reject` need no message;
 * `request_changes` attaches `moderationFeedback` that is shown back to the
 * author.
 */
export async function moderateIdea(
  ideaId: string,
  action: ModerationAction,
  message: string,
  moderatorId: string,
  firestore: Firestore = db(),
): Promise<void> {
  if (action === "approve") {
    await updateDoc(doc(firestore, "ideas", ideaId), {
      status: "approved",
      moderatedBy: moderatorId,
      updatedAt: serverTimestamp(),
    });
    return;
  }

  if (action === "reject") {
    await updateDoc(doc(firestore, "ideas", ideaId), {
      status: "rejected",
      moderatedBy: moderatorId,
      updatedAt: serverTimestamp(),
    });
    return;
  }

  await updateDoc(doc(firestore, "ideas", ideaId), {
    status: "changes_requested",
    moderationFeedback: {
      message,
      by: moderatorId,
      at: serverTimestamp(),
    },
    moderatedBy: moderatorId,
    updatedAt: serverTimestamp(),
  });
}

/** Publicly mark an idea as supported by a leader. Runs in one transaction so
 * the support doc and the denormalized `supportCount` can never drift apart,
 * and re-clicking Support is a no-op instead of inflating the counter. */
export async function supportIdea(
  ideaId: string,
  leader: { uid: string; displayName: string; title?: string },
  firestore: Firestore = db(),
): Promise<void> {
  const supportRef = doc(firestore, "supports", `${ideaId}_${leader.uid}`);
  await runTransaction(firestore, async (tx) => {
    const existing = await tx.get(supportRef);
    if (existing.exists()) return; // already supported
    tx.set(supportRef, {
      ideaId,
      leaderId: leader.uid,
      leaderName: leader.displayName,
      leaderTitle: leader.title ?? null,
      createdAt: serverTimestamp(),
    });
    tx.update(doc(firestore, "ideas", ideaId), {
      supportCount: increment(1),
      updatedAt: serverTimestamp(),
    });
  });
}

/** Remove a leader's support (atomically with the counter decrement; no-op
 * when the support doc is already gone). */
export async function unsupportIdea(
  ideaId: string,
  leaderId: string,
  firestore: Firestore = db(),
): Promise<void> {
  const supportRef = doc(firestore, "supports", `${ideaId}_${leaderId}`);
  await runTransaction(firestore, async (tx) => {
    const existing = await tx.get(supportRef);
    if (!existing.exists()) return; // nothing to remove
    tx.delete(supportRef);
    tx.update(doc(firestore, "ideas", ideaId), {
      supportCount: increment(-1),
      updatedAt: serverTimestamp(),
    });
  });
}

// ---- Topics (question mode) ----

export interface NewTopicInput {
  question: string;
  authorId: string;
  authorName: string;
}

/** A leader submits a topic (question). Like ideas, it starts in `pending`
 * and must be approved by ANOTHER moderator before it appears in the topic
 * box — firestore.rules reject a moderator moderating their own topic. */
export async function createTopic(
  input: NewTopicInput,
  firestore: Firestore = db(),
): Promise<string> {
  const question = input.question.trim();
  if (question.length === 0 || question.length > MAX_TOPIC_LENGTH) {
    throw new Error("topic_invalid_length");
  }
  const ref = doc(collection(firestore, "topics"));
  await setDoc(ref, {
    question,
    status: "pending",
    authorId: input.authorId,
    authorName: input.authorName,
    moderatedBy: null,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return ref.id;
}

export type TopicModerationAction = "approve" | "reject";

/** Moderate a topic — approve (goes live in the topic box) or reject.
 * Request-changes is deliberately not offered: leaders cannot resubmit a
 * topic, so that state would be a dead end. */
export async function moderateTopic(
  topicId: string,
  action: TopicModerationAction,
  moderatorId: string,
  firestore: Firestore = db(),
): Promise<void> {
  await updateDoc(doc(firestore, "topics", topicId), {
    status: action === "approve" ? "approved" : "rejected",
    moderatedBy: moderatorId,
    updatedAt: serverTimestamp(),
  });
}

/** Delete a topic — admins only (enforced by firestore.rules). Responses
 * keep their denormalized topicQuestion, so nothing else needs cleaning. */
export async function deleteTopic(
  topicId: string,
  firestore: Firestore = db(),
): Promise<void> {
  await deleteDoc(doc(firestore, "topics", topicId));
}

function topicFromSnapshot(snap: {
  id: string;
  data: () => Record<string, unknown>;
}): Topic {
  const d = snap.data();
  return {
    id: snap.id,
    question: String(d.question ?? ""),
    status: (d.status as IdeaStatus) ?? "pending",
    authorId: String(d.authorId ?? ""),
    authorName: String(d.authorName ?? ""),
    moderatedBy: d.moderatedBy ? String(d.moderatedBy) : undefined,
    createdAt: (d.createdAt as Topic["createdAt"]) ?? null,
    updatedAt: (d.updatedAt as Topic["updatedAt"]) ?? null,
  };
}

/** Every live topic shown on the ideas page — all approved, newest first. */
export async function getActiveTopics(
  firestore: Firestore = db(),
): Promise<Topic[]> {
  const q = query(
    collection(firestore, "topics"),
    where("status", "==", "approved"),
    orderBy("createdAt", "desc"),
  );
  const snap = await getDocs(q);
  return snap.docs.map(topicFromSnapshot);
}

/** Fetch a single topic by id — used by the topic page. */
export async function getTopic(
  topicId: string,
  firestore: Firestore = db(),
): Promise<Topic | null> {
  const snap = await getDoc(doc(firestore, "topics", topicId));
  return snap.exists() ? topicFromSnapshot(snap) : null;
}

/** The approved responses to one topic (the topic card's preview row and the
 * topic page's full grid). */
export async function getApprovedIdeasByTopic(
  topicId: string,
  maxCount?: number,
  firestore: Firestore = db(),
): Promise<Idea[]> {
  const q = query(
    collection(firestore, "ideas"),
    where("topicId", "==", topicId),
    where("status", "==", "approved"),
    orderBy("createdAt", "desc"),
    ...(maxCount ? [limit(maxCount)] : []),
  );
  const snap = await getDocs(q);
  return snap.docs.map(ideaFromSnapshot);
}

/** Topics awaiting review — used by /moderation. */
export async function getPendingTopics(
  firestore: Firestore = db(),
): Promise<Topic[]> {
  const q = query(
    collection(firestore, "topics"),
    where("status", "==", "pending"),
    orderBy("createdAt", "asc"),
  );
  const snap = await getDocs(q);
  return snap.docs.map(topicFromSnapshot);
}

/** Topics the given leader submitted (any status) — used by /me. */
export async function getTopicsByAuthor(
  authorId: string,
  firestore: Firestore = db(),
): Promise<Topic[]> {
  const q = query(
    collection(firestore, "topics"),
    where("authorId", "==", authorId),
    orderBy("createdAt", "desc"),
  );
  const snap = await getDocs(q);
  return snap.docs.map(topicFromSnapshot);
}

/** Every topic, regardless of status — used by the admin delete view. */
export async function getAllTopics(
  firestore: Firestore = db(),
): Promise<Topic[]> {
  const q = query(collection(firestore, "topics"), orderBy("createdAt", "desc"));
  const snap = await getDocs(q);
  return snap.docs.map(topicFromSnapshot);
}

/**
 * Post a leader timeline update on an idea. Entries are embedded in the idea
 * document (arrayUnion) so the modal's Timeline tab reads them in one fetch.
 */
export async function postTimelineUpdate(
  ideaId: string,
  leader: { uid: string; displayName: string },
  message: string,
  firestore: Firestore = db(),
): Promise<void> {
  // NOTE: serverTimestamp() can only live at the top level of update()/set()
  // data — it is rejected when nested inside an arrayUnion() element. The
  // timeline entry embeds a concrete client Timestamp for createdAt; the
  // surrounding updatedAt still uses the server sentinel.
  const entry = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    leaderId: leader.uid,
    leaderName: leader.displayName,
    message,
    createdAt: Timestamp.now(),
  };
  await updateDoc(doc(firestore, "ideas", ideaId), {
    timeline: arrayUnion(entry),
    updatedAt: serverTimestamp(),
  });
}

/** Author deletes their own idea. */
export async function deleteIdea(
  ideaId: string,
  firestore: Firestore = db(),
): Promise<void> {
  await deleteDoc(doc(firestore, "ideas", ideaId));
}

// ---- Read helpers ----

function ideaFromSnapshot(snap: {
  id: string;
  data: () => Record<string, unknown>;
}): Idea {
  const d = snap.data();
  return {
    id: snap.id,
    title: String(d.title ?? ""),
    description: String(d.description ?? ""),
    status: (d.status as IdeaStatus) ?? "pending",
    authorId: String(d.authorId ?? ""),
    authorName: String(d.authorName ?? ""),
    authorTitle: d.authorTitle ? String(d.authorTitle) : undefined,
    authorEmail: d.authorEmail ? String(d.authorEmail) : undefined,
    upvoteUserIds: Array.isArray(d.upvoteUserIds) ? (d.upvoteUserIds as string[]) : [],
    upvoteCount: Number(d.upvoteCount ?? 0),
    supportCount: Number(d.supportCount ?? 0),
    showAuthorName: d.showAuthorName !== false,
    topicId: d.topicId ? String(d.topicId) : undefined,
    topicQuestion: d.topicQuestion ? String(d.topicQuestion) : undefined,
    moderationFeedback: (d.moderationFeedback as Idea["moderationFeedback"]) ?? null,
    moderatedBy: d.moderatedBy ? String(d.moderatedBy) : undefined,
    timeline: Array.isArray(d.timeline) ? (d.timeline as Idea["timeline"]) : [],
    createdAt: (d.createdAt as Idea["createdAt"]) ?? null,
    updatedAt: (d.updatedAt as Idea["updatedAt"]) ?? null,
  };
}

/** Fetch a single idea by id. */
export async function getIdea(
  ideaId: string,
  firestore: Firestore = db(),
): Promise<Idea | null> {
  const snap = await getDoc(doc(firestore, "ideas", ideaId));
  return snap.exists() ? ideaFromSnapshot(snap) : null;
}

/** The home feed — only approved standalone ideas (topic responses live on
 * their topic's card + page instead), sorted by newest or most upvotes. */
export async function getApprovedIdeas(
  sort: "new" | "upvotes" = "new",
  firestore: Firestore = db(),
): Promise<Idea[]> {
  const q = query(
    collection(firestore, "ideas"),
    where("status", "==", "approved"),
    // `== null` also matches docs where the field is missing (ideas created
    // before question mode), so legacy ideas stay in the feed.
    where("topicId", "==", null),
    orderBy(sort === "upvotes" ? "upvoteCount" : "createdAt", "desc"),
  );
  const snap = await getDocs(q);
  return snap.docs.map(ideaFromSnapshot);
}

/** The idea the given author submitted (any status) — used by /me. */
export async function getIdeasByAuthor(
  authorId: string,
  firestore: Firestore = db(),
): Promise<Idea[]> {
  const q = query(
    collection(firestore, "ideas"),
    where("authorId", "==", authorId),
    orderBy("createdAt", "desc"),
  );
  const snap = await getDocs(q);
  return snap.docs.map(ideaFromSnapshot);
}

/** Count of ideas sent back to the given author (for notification dot). */
export async function getChangesRequestedCount(
  authorId: string,
  firestore: Firestore = db(),
): Promise<number> {
  const q = query(
    collection(firestore, "ideas"),
    where("authorId", "==", authorId),
    where("status", "==", "changes_requested"),
  );
  const snap = await getDocs(q);
  return snap.size;
}

/** Every idea, regardless of status — used by the admin delete view. */
export async function getAllIdeas(
  firestore: Firestore = db(),
): Promise<Idea[]> {
  const q = query(collection(firestore, "ideas"), orderBy("createdAt", "desc"));
  const snap = await getDocs(q);
  return snap.docs.map(ideaFromSnapshot);
}

/** All ideas still awaiting moderation — used by /moderation. */
export async function getPendingIdeas(
  firestore: Firestore = db(),
): Promise<Idea[]> {
  const q = query(
    collection(firestore, "ideas"),
    where("status", "==", "pending"),
    orderBy("createdAt", "asc"),
  );
  const snap = await getDocs(q);
  return snap.docs.map(ideaFromSnapshot);
}

/** All ideas that have been moderated (approved or changes_requested) — used by leaderboard. */
export async function getModeratedIdeas(
  firestore: Firestore = db(),
): Promise<Idea[]> {
  const q = query(
    collection(firestore, "ideas"),
    where("status", "!=", "pending"),
  );
  const snap = await getDocs(q);
  return snap.docs.map(ideaFromSnapshot);
}

/** Support docs for a single idea (= the leaders backing it). */
export async function getIdeaSupports(
  ideaId: string,
  firestore: Firestore = db(),
): Promise<SupportDoc[]> {
  const q = query(
    collectionGroup(firestore, "supports"),
    where("ideaId", "==", ideaId),
  );
  const snap = await getDocs(q);
  return snap.docs.map(supportFromSnapshot);
}

function supportFromSnapshot(s: {
  data: () => Record<string, unknown>;
}): SupportDoc {
  const d = s.data();
  return {
    ideaId: String(d.ideaId ?? ""),
    leaderId: String(d.leaderId ?? ""),
    leaderName: String(d.leaderName ?? ""),
    leaderTitle: d.leaderTitle ? String(d.leaderTitle) : undefined,
    createdAt: (d.createdAt as SupportDoc["createdAt"]) ?? null,
  };
}

/**
 * Support docs for many ideas in one round-trip per chunk of 30 ids
 * (Firestore caps `in` filters at 30 values), instead of one collection-group
 * query per idea. Returns a map with an entry (possibly empty) per id.
 */
export async function getSupportsForIdeas(
  ideaIds: string[],
  firestore: Firestore = db(),
): Promise<Map<string, SupportDoc[]>> {
  const map = new Map<string, SupportDoc[]>(ideaIds.map((id) => [id, []]));
  const chunks: string[][] = [];
  for (let i = 0; i < ideaIds.length; i += 30) {
    chunks.push(ideaIds.slice(i, i + 30));
  }
  await Promise.all(
    chunks.map(async (ids) => {
      const q = query(
        collectionGroup(firestore, "supports"),
        where("ideaId", "in", ids),
      );
      const snap = await getDocs(q);
      for (const s of snap.docs) {
        const support = supportFromSnapshot(s);
        map.get(support.ideaId)?.push(support);
      }
    }),
  );
  return map;
}

/** Support docs for every idea one leader backs — used by /me. */
export async function getLeaderSupports(
  leaderId: string,
  firestore: Firestore = db(),
): Promise<SupportDoc[]> {
  const q = query(
    collectionGroup(firestore, "supports"),
    where("leaderId", "==", leaderId),
    orderBy("createdAt", "desc"),
  );
  const snap = await getDocs(q);
  return snap.docs.map((s) => ({
    ideaId: String(s.data().ideaId ?? ""),
    leaderId: String(s.data().leaderId ?? ""),
    leaderName: String(s.data().leaderName ?? ""),
    createdAt: (s.data().createdAt as SupportDoc["createdAt"]) ?? null,
  }));
}

/** A user doc by email — used by the admin to promote leaders. */
export async function getUserByEmail(
  email: string,
  firestore: Firestore = db(),
): Promise<UserDoc | null> {
  const q = query(collection(firestore, "users"), where("email", "==", email.toLowerCase()));
  const snap = await getDocs(q);
  const first = snap.docs[0];
  if (!first) return null;
  const d = first.data() as Partial<UserDoc>;
  return {
    uid: first.id,
    email: d.email ?? "",
    displayName: d.displayName ?? "",
    displayNameSet: d.displayNameSet ?? Boolean(d.displayName),
    role: (d.role as Role) ?? DEFAULT_ROLE,
    createdAt: d.createdAt ?? null,
  };
}

/** Every user with a leader role (leaders + admins) — used by the admin page. */
export async function getLeaders(
  firestore: Firestore = db(),
): Promise<UserDoc[]> {
  const q = query(collection(firestore, "users"), where("role", "in", ["leader", "admin"]));
  const snap = await getDocs(q);
  return snap.docs.map((s) => {
    const d = s.data() as Partial<UserDoc>;
    return {
      uid: s.id,
      email: d.email ?? "",
      displayName: d.displayName ?? "",
      displayNameSet: d.displayNameSet ?? Boolean(d.displayName),
      role: (d.role as Role) ?? DEFAULT_ROLE,
      createdAt: d.createdAt ?? null,
    };
  });
}

/** Promote/demote a user's role — admins only (enforced by firestore.rules). */
export async function setUserRole(
  uid: string,
  role: Role,
  firestore: Firestore = db(),
): Promise<void> {
  await updateDoc(doc(firestore, "users", uid), { role });
}

/** Update a user's leader title (e.g. "Digital Leader", "Head Girl"). */
export async function updateUserTitle(
  uid: string,
  title: string,
  firestore: Firestore = db(),
): Promise<void> {
  await updateDoc(doc(firestore, "users", uid), { title });
}

// ---- Invited leaders (pre-signup) ----

/** An invited leader record — stores the email (and optional display name /
 * title) of a leader who hasn't signed up yet. */
export interface InvitedLeader {
  email: string;
  displayName?: string;
  title?: string;
  invitedBy: string;
  createdAt: Timestamp | null;
}

/** Add a leader before they've signed up. Document ID = normalized email. */
export async function addInvitedLeader(
  email: string,
  invitedBy: string,
  displayName?: string,
  title?: string,
  firestore: Firestore = db(),
): Promise<void> {
  const normalized = email.trim().toLowerCase();
  await setDoc(doc(firestore, "invitedLeaders", normalized), {
    email: normalized,
    displayName: displayName ?? null,
    title: title ?? null,
    invitedBy,
    createdAt: serverTimestamp(),
  });
}

/** Remove a pending leader invitation by email. */
export async function removeInvitedLeader(
  email: string,
  firestore: Firestore = db(),
): Promise<void> {
  const normalized = email.trim().toLowerCase();
  await deleteDoc(doc(firestore, "invitedLeaders", normalized));
}

/** Check if an email is in the invited-leaders list. */
export async function getInvitedLeaderByEmail(
  email: string,
  firestore: Firestore = db(),
): Promise<InvitedLeader | null> {
  const normalized = email.trim().toLowerCase();
  const snap = await getDoc(doc(firestore, "invitedLeaders", normalized));
  if (!snap.exists()) return null;
  const d = snap.data();
  return {
    email: String(d.email ?? ""),
    displayName: d.displayName ? String(d.displayName) : undefined,
    title: d.title ? String(d.title) : undefined,
    invitedBy: String(d.invitedBy ?? ""),
    createdAt: (d.createdAt as Timestamp) ?? null,
  };
}

/** All pending leader invitations — used by the admin page. */
export async function getInvitedLeaders(
  firestore: Firestore = db(),
): Promise<InvitedLeader[]> {
  const q = query(
    collection(firestore, "invitedLeaders"),
    orderBy("createdAt", "desc"),
  );
  const snap = await getDocs(q);
  return snap.docs.map((s) => {
    const d = s.data();
    return {
      email: String(d.email ?? ""),
      displayName: d.displayName ? String(d.displayName) : undefined,
      title: d.title ? String(d.title) : undefined,
      invitedBy: String(d.invitedBy ?? ""),
      createdAt: (d.createdAt as Timestamp) ?? null,
    };
  });
}

/** Update an idea (for resubmission after changes_requested). */
export async function updateIdea(
  ideaId: string,
  input: { title: string; description: string; showAuthorName: boolean },
  firestore: Firestore = db(),
): Promise<void> {
  await updateDoc(doc(firestore, "ideas", ideaId), {
    title: input.title,
    description: input.description,
    showAuthorName: input.showAuthorName,
    status: "pending",
    moderationFeedback: null,
    moderatedBy: null,
    updatedAt: serverTimestamp(),
  });
}

export type { Firestore };
export type { IdeaStatus };