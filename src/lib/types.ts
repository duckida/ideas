import type { Timestamp } from "firebase/firestore";

export type Role = "student" | "leader" | "admin";

/** Role assigned to a brand-new account (students upvote; leaders/admins
 * are promoted by an admin). Shared by auth + data layers. */
export const DEFAULT_ROLE: Role = "student";

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
  /** Optional leader title of the author (e.g. "Digital Leader"). */
  authorTitle?: string;
  upvoteUserIds: string[];
  upvoteCount: number;
  /** Denormalized leader-support count; maintained next to the supports
   * collection so the home feed can render badges without N+1 reads. */
  supportCount: number;
  /** When false the author's name is hidden in public views. */
  showAuthorName: boolean;
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
  /** False until the user picks a display name once at signup (or has a real
   * one from the provider). Drives the one-time NameSetup gate. */
  displayNameSet: boolean;
  role: Role;
  /** Optional leader title (e.g. "Digital Leader", "Head Girl"). */
  title?: string;
  createdAt: Timestamp | null;
}

/** Mirrors the `supports` Firestore document shape. */
export interface SupportDoc {
  ideaId: string;
  leaderId: string;
  leaderName: string;
  leaderTitle?: string;
  createdAt: Timestamp | null;
}

/** Mirrors the `invitedLeaders` Firestore document shape. */
export interface InvitedLeader {
  email: string;
  displayName?: string;
  title?: string;
  invitedBy: string;
  createdAt: Timestamp | null;
}
