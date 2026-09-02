import { describe, expect, it, vi, beforeEach } from "vitest";
import * as analytics from "./analytics";

const mockTrackEvent = vi.fn();

vi.mock("@simpleanalytics/next", () => ({
  trackEvent: (...args: unknown[]) => mockTrackEvent(...args),
}));

beforeEach(() => {
  mockTrackEvent.mockClear();
});

describe("analytics", () => {
  it("exports a stable set of event names", () => {
    expect(new Set(analytics.ANALYTICS_EVENTS).size).toBe(analytics.ANALYTICS_EVENTS.length);
    expect(analytics.ANALYTICS_EVENTS).toContain("idea_open");
    expect(analytics.ANALYTICS_EVENTS).toContain("signout");
  });

  it("forwards idea events through trackEvent", () => {
    analytics.trackIdeaOpen("card");
    analytics.trackIdeaUpvote(true, "modal");
    analytics.trackIdeaSupport(false);
    analytics.trackTimelinePost();
    analytics.trackIdeaSubmitted(true);
    analytics.trackIdeaDelete("moderation");

    expect(mockTrackEvent).toHaveBeenNthCalledWith(1, "idea_open", { source: "card" });
    expect(mockTrackEvent).toHaveBeenNthCalledWith(2, "idea_upvote", { active: true, source: "modal" });
    expect(mockTrackEvent).toHaveBeenNthCalledWith(3, "idea_support", { active: false });
    expect(mockTrackEvent).toHaveBeenNthCalledWith(4, "idea_timeline_post", undefined);
    expect(mockTrackEvent).toHaveBeenNthCalledWith(5, "idea_submitted", { showAuthorName: true });
    expect(mockTrackEvent).toHaveBeenNthCalledWith(6, "idea_delete", { source: "moderation" });
  });

  it("forwards sign-in and moderation events through trackEvent", () => {
    analytics.trackSignInMicrosoft();
    analytics.trackSignInEmail();
    analytics.trackSignOut();
    analytics.trackModerationApprove();
    analytics.trackModerationChangesRequested();
    analytics.trackModerationDelete();
    analytics.trackIdeasSort("upvotes");
    analytics.trackIdeasSearchOpen();

    expect(mockTrackEvent).toHaveBeenNthCalledWith(1, "signin_microsoft", undefined);
    expect(mockTrackEvent).toHaveBeenNthCalledWith(2, "signin_email", undefined);
    expect(mockTrackEvent).toHaveBeenNthCalledWith(3, "signout", undefined);
    expect(mockTrackEvent).toHaveBeenNthCalledWith(4, "moderation_approve", undefined);
    expect(mockTrackEvent).toHaveBeenNthCalledWith(5, "moderation_changes_requested", undefined);
    expect(mockTrackEvent).toHaveBeenNthCalledWith(6, "moderation_delete", undefined);
    expect(mockTrackEvent).toHaveBeenNthCalledWith(7, "ideas_sort", { value: "upvotes" });
    expect(mockTrackEvent).toHaveBeenNthCalledWith(8, "ideas_search_open", undefined);
  });
});
