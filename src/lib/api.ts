// Firestore data-access layer for the Ideas portal.
// All reads/writes go through these functions; components never touch the SDK
// directly. Timestamps, server-side counters and array ops keep the UI in sync
// without client-side re-computation.

import {
  getFirestore,
  collection,
  doc,
  setDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  serverTimestamp,
  arrayUnion,
  arrayRemove,
  increment,
  type Firestore,
} from "firebase/firestore";
import { getFirebaseApp } from "@/lib/firebase";
import type { IdeaStatus } from "@/lib/types";

function db(): Firestore {
  return getFirestore(getFirebaseApp());
}

export interface NewIdeaInput {
  title: string;
  description: string;
  authorId: string;
  authorName: string;
}

/** Create an idea — always starts in `pending` and goes to moderation. */
export async function createIdea(
  input: NewIdeaInput,
  firestore: Firestore = db(),
): Promise<string> {
  const ref = await addDoc(collection(firestore, "ideas"), {
    title: input.title,
    description: input.description,
    status: "pending",
    authorId: input.authorId,
    authorName: input.authorName,
    upvoteUserIds: [],
    upvoteCount: 0,
    moderationFeedback: null,
    timeline: [],
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return ref.id;
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
 * Moderate an idea. `approve` needs no message; the other two attach
 * `moderationFeedback` that is shown back to the author.
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
      updatedAt: serverTimestamp(),
    });
    return;
  }

  await updateDoc(doc(firestore, "ideas", ideaId), {
    status: action === "request_changes" ? "changes_requested" : "rejected",
    moderationFeedback: {
      message,
      by: moderatorId,
      at: serverTimestamp(),
    },
    updatedAt: serverTimestamp(),
  });
}

/** Publicly mark an idea as supported by a leader. */
export async function supportIdea(
  ideaId: string,
  leader: { uid: string; displayName: string },
  firestore: Firestore = db(),
): Promise<void> {
  await setDoc(doc(firestore, "supports", `${ideaId}_${leader.uid}`), {
    ideaId,
    leaderId: leader.uid,
    leaderName: leader.displayName,
    createdAt: serverTimestamp(),
  });
}

/** Remove a leader's support. */
export async function unsupportIdea(
  ideaId: string,
  leaderId: string,
  firestore: Firestore = db(),
): Promise<void> {
  await deleteDoc(doc(firestore, "supports", `${ideaId}_${leaderId}`));
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
  const entry = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    leaderId: leader.uid,
    leaderName: leader.displayName,
    message,
    createdAt: serverTimestamp(),
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

export type { Firestore };
export type { IdeaStatus };