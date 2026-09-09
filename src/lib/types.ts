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
  /** Denormalized author email (shown when the idea is not anonymous). */
  authorEmail?: string;
  upvoteUserIds: string[];
  upvoteCount: number;
  /** Denormalized leader-support count; maintained next to the supports
   * collection so the home feed can render badges without N+1 reads. */
  supportCount: number;
  /** When false the author's name is hidden in public views. */
  showAuthorName: boolean;
  /** The topic (question) this idea responds to, when it was submitted from
   * the topic box. Regular ideas leave this undefined. */
  topicId?: string;
  /** Denormalized copy of the topic's question text, so cards and the Me
   * page can show which prompt a response came from even after the topic
   * document itself is deleted by an admin. */
  topicQuestion?: string;
  moderationFeedback: ModerationFeedback | null;
  /** uid of the moderator who last approved or sent-back this idea. */
  moderatedBy?: string;
  timeline: TimelineEntry[];
  createdAt: Timestamp | null;
  updatedAt: Timestamp | null;
}

/** Mirrors the `topics` Firestore document shape — a question set by a
 * leader (e.g. "What do you think of the timetable changes?") that students
 * can respond to like an idea. Topics are themselves moderated before they
 * go live. */
export interface Topic {
  id: string;
  question: string;
  status: IdeaStatus;
  authorId: string;
  authorName: string;
  moderatedBy?: string;
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
