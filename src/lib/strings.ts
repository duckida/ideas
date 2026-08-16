/**
 * strings.ts — the single editable file for ALL user-facing text and branding.
 *
 * Every string rendered in the app lives here. Edit the values in this file to
 * change wording, branding, or language — no strings are hardcoded in components.
 */
export const strings = {
  brand: {
    name: "Ideas",
    tagline: "Where school ideas grow",
    nameKakao: "아이디어",
  },

  nav: {
    ideas: "Ideas",
    moderation: "Moderation",
    me: "Me",
    admin: "Admin",
    signOut: "Sign out",
  },

  auth: {
    title: "Welcome to {brand}",
    subtitle: "Sign in with your school account to share and support ideas.",
    microsoftButton: "Sign in with Microsoft",
    emailLabel: "Email",
    passwordLabel: "Password",
    emailButton: "Sign in with email",
    emailError: "Please enter a valid email and password.",
    genericError: "Something went wrong. Please try again.",
  },

  ideasHome: {
    heading: "Ideas",
    empty: "No ideas yet. Be the first to share one!",
    supportedByLeaders: "Supported by leaders",
  },

  idea: {
    upvote: "Upvote",
    upvotes: "upvotes",
    support: "Support",
    supported: "Supported",
    supportedBy: "Supported by {name}",
    delete: "Delete",
    deleteConfirm: "Are you sure you want to delete this idea?",
    deleteConfirmDetail: "This can't be undone.",
    deleteError: "Couldn't delete this idea. Please try again.",
    edit: "Edit",
    author: "by {name}",
    statusPending: "Pending review",
    statusApproved: "Approved",
    statusChangesRequested: "Changes requested",
    statusRejected: "Rejected",
    statusLabel: "Status",
  },

  modal: {
    overviewTab: "Overview",
    timelineTab: "Timeline",
    close: "Close",
    noTimeline: "No timeline updates yet.",
  },

  timeline: {
    postPlaceholder: "Share an update on this idea…",
    postButton: "Post update",
    postLabel: "Timeline update",
    empty: "No updates yet — be the first to share progress.",
    byLeader: "{name} · leader",
  },

  fab: {
    add: "Add an idea",
    title: "Add your idea",
    titleLabel: "Title",
    descriptionLabel: "Description",
    submit: "Submit for moderation",
    cancel: "Cancel",
    success: "Thanks! Your idea is in for review.",
  },

  moderation: {
    heading: "Moderation",
    empty: "Nothing to review right now.",
    approve: "Approve",
    requestChanges: "Request changes",
    reject: "Reject",
    feedbackLabel: "Message (shown to the author)",
    feedbackPlaceholder: "Tell the author what to change…",
    requestChangesConfirm: "Send changes request",
    rejectConfirm: "Reject idea",
    submittedBy: "Submitted by {name}",
    close: "Close",
  },

  me: {
    heading: "Me",
    myIdeas: "My ideas",
    myIdeasEmpty: "You haven't shared any ideas yet.",
    supported: "Supported ideas",
    supportedEmpty: "You haven't supported any ideas yet.",
    timelineHeading: "Timeline updates",
  },

  admin: {
    heading: "Admin",
    addLeader: "Add leader",
    removeLeader: "Remove",
    emailLabel: "Leader email",
    emailPlaceholder: "name@school.edu",
    add: "Add",
    noLeaders: "No leaders yet.",
    userNotFound: "No account found with that email.",
    alreadyLeader: "That user is already a leader.",
    removed: "Leader removed.",
    added: "Leader added.",
  },

  errors: {
    permission: "You don't have permission to do that.",
    notFound: "Not found.",
    generic: "Something went wrong.",
  },

  common: {
    loading: "Loading…",
    cancel: "Cancel",
    save: "Save",
    confirm: "Confirm",
    logout: "Sign out",
    close: "Close",
  },
} as const;

export type Strings = typeof strings;

/** Helper to interpolate `{key}` placeholders, e.g. `t("Supported by {name}", { name: "Ms. Kim" })`. */
export function t(template: string, vars: Record<string, string | number> = {}): string {
  return template.replace(/\{(\w+)\}/g, (_, key: string) =>
    key in vars ? String(vars[key]) : `{${key}}`,
  );
}