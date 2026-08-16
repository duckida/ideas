import type { Timestamp } from "firebase/firestore";

export type Role = "student" | "leader" | "admin";

export type IdeaStatus =
  | "pending"
  | "changes_requested"
  | "approved"
  | "rejected";

export interface TimelineEntry {
  id: string;
  leaderId: string;
  leaderName: string;
  message: string;
  createdAt: Timestamp | null;
}

export interface ModerationFeedback {
  message: string;
  by: string; // uid
  at: Timestamp | null;
}

/** Mirrors the `ideas` Firestore document shape. */
export interface Idea {
  id: string;
  title: string;
  description: string;
  status: IdeaStatus;
  authorId: string;
  authorName: string;
  upvoteUserIds: string[];
  upvoteCount: number;
  moderationFeedback: ModerationFeedback | null;
  timeline: TimelineEntry[];
  createdAt: Timestamp | null;
  updatedAt: Timestamp | null;
}

/** Mirrors the `users` Firestore document shape. */
export interface UserDoc {
  uid: string;
  email: string;
  displayName: string;
  role: Role;
  createdAt: Timestamp | null;
}

/** Mirrors the `supports` Firestore document shape. */
export interface SupportDoc {
  ideaId: string;
  leaderId: string;
  leaderName: string;
  createdAt: Timestamp | null;
}
