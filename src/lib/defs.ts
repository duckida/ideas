/**
 * defs.ts — shared constants used by both the client and firestore.rules.
 *
 * The rules engine can't import TypeScript, so the values below MUST stay in
 * sync with `firestore.rules`. (Friendly reminder hook `db.guard` logs a
 * mismatch warning when they drift.)
 */

/** Longest allowed idea title (client + rules). */
export const MAX_TITLE_LENGTH = 80;

/** Longest allowed idea description (client + rules). */
export const MAX_DESCRIPTION_LENGTH = 2000;

/** Longest timeline update a leader can post (client + rules). */
export const MAX_TIMELINE_LENGTH = 500;

/** Minimum seconds that must elapse between two idea submissions. */
export const MIN_IDEA_GAP_SECONDS = 10;

/** Burst cap: at most this many pending ideas per author at once. */
export const MAX_PENDING_PER_AUTHOR = 5;

/** Field on users/{uid} storing the timestamp of the last submitted idea. */
export const LAST_IDEA_AT_FIELD = "lastIdeaAt";