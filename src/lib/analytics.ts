// Analytics — a thin wrapper over Simple Analytics client-side event tracking.
// Keeping every call in one module means event names stay consistent, and we
// can document the (deliberately small) event vocabulary in one place.
//
// Privacy notes (matches Simple Analytics' cookie-less model):
// - No user IDs, emails, or names are ever attached to events.
// - Metadata values are coarse (booleans, small enums, counts), not contents.

import { trackEvent } from "@simpleanalytics/next";

/**
 * Fire a Simple Analytics event. The `sa_event` global only exists once the
 * script injected by `<SimpleAnalytics />` has loaded — the package already
 * no-ops safely when it is missing (dev, offline, blocked), so no try/catch
 * or feature detection is needed here.
 *
 * Note: events are only sent in production-like environments (see the
 * `isProduction()` gate inside @simpleanalytics/next).
 */
export function saEvent(
  event: AnalyticsEventName,
  metadata?: AnalyticsMetadata,
): void {
  trackEvent(event, metadata);
}

// ---------------------------------------------------------------------------
// Event vocabulary
// ---------------------------------------------------------------------------

/** Every event name below must be listed here (single source of truth). */
export const ANALYTICS_EVENTS = [
  "idea_open", // an idea card was opened in the detail modal
  "idea_upvote", // an idea was upvoted or un-upvoted from the card or modal
  "idea_support", // a leader supported / withdrew support for an idea
  "idea_timeline_post", // a leader posted a timeline update
  "idea_delete", // an admin deleted an idea
  "idea_submitted", // a new idea was submitted for moderation
  "signin_microsoft", // signed in via the school Microsoft popup
  "signin_email", // signed in via email/password
  "signout", // signed out
  "moderation_approve", // a moderator approved a pending idea
  "moderation_changes_requested", // a moderator sent an idea back with feedback
  "moderation_delete", // an admin deleted a pending idea
  "ideas_sort", // the sort order on the ideas grid was changed
  "ideas_search_open", // the search box on the ideas grid was opened
] as const;

export type AnalyticsEventName = (typeof ANALYTICS_EVENTS)[number];

type AnalyticsMetadata = Record<string, string | boolean | number>;

// Convenience wrappers so call sites read well and stay consistent.

/** idea_open — someone opened an idea's detail modal. */
export function trackIdeaOpen(source: "card" | "modal") {
  saEvent("idea_open", { source });
}

/** idea_upvote — upvote toggled; `active` is the resulting state. */
export function trackIdeaUpvote(active: boolean, source: "card" | "modal") {
  saEvent("idea_upvote", { active, source });
}

/** idea_support — a leader supported (active=true) or withdrew support. */
export function trackIdeaSupport(active: boolean) {
  saEvent("idea_support", { active });
}

/** idea_timeline_post — a leader posted an update to an idea's timeline. */
export function trackTimelinePost() {
  saEvent("idea_timeline_post");
}

/** idea_delete — an admin deleted an idea (from the modal or queue). */
export function trackIdeaDelete(source: "modal" | "moderation") {
  saEvent("idea_delete", { source });
}

/** idea_submitted — a new idea was sent to moderation. */
export function trackIdeaSubmitted(showAuthorName: boolean) {
  saEvent("idea_submitted", { showAuthorName });
}

/** signin_microsoft — signed in with the school Microsoft account. */
export function trackSignInMicrosoft() {
  saEvent("signin_microsoft");
}

/** signin_email — signed in with email/password. */
export function trackSignInEmail() {
  saEvent("signin_email");
}

/** signout — the user signed out. */
export function trackSignOut() {
  saEvent("signout");
}

/** moderation_approve — a pending idea was approved. */
export function trackModerationApprove() {
  saEvent("moderation_approve");
}

/** moderation_changes_requested — an idea was sent back with feedback. */
export function trackModerationChangesRequested() {
  saEvent("moderation_changes_requested");
}

/** moderation_delete — an admin deleted a pending idea from the queue. */
export function trackModerationDelete() {
  saEvent("moderation_delete");
}

/** ideas_sort — the grid sort order changed (e.g. "new" or "upvotes"). */
export function trackIdeasSort(value: "new" | "upvotes") {
  saEvent("ideas_sort", { value });
}

/** ideas_search_open — the search box was toggled open. */
export function trackIdeasSearchOpen() {
  saEvent("ideas_search_open");
}
