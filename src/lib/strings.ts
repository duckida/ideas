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
  },

  nav: {
    ideas: "Ideas",
    moderation: "Moderation",
    me: "Me",
    admin: "Admin",
    settings: "Settings",
    signOut: "Sign out",
  },

  settings: {
    heading: "Settings",
    themeLabel: "Theme",
    themeLight: "Light",
    themeDark: "Dark",
    themeSystem: "Auto",
    aboutApp:
      "{brand} is a place where students share ideas for school life. Leaders review and support the best ones, and every idea gets a timeline so progress is easy to follow.",
    aboutMadeBy: "A project by Nirvaan and the Leadership team, created with AI.",
    aboutSupport: "For support, contact",
    supportEmail: "n.tandon@holmegrange.org",
    buildLabel: "Open Source!",
    unknownBuild: "development build",
    feedbackButton: "Share your Feedback",
  },

  auth: {
    title: "Welcome to {brand}",
    subtitle: "Sign in with your school account to share and support ideas.",
    microsoftButton: "Sign in with Microsoft",
    emailLabel: "Email",
    passwordLabel: "Password",
    emailButton: "Email signin (admins only)",
    emailError: "Please enter a valid email and password.",
    genericError: "Something went wrong. Please try again.",
    nameSetupTitle: "What is your name?",
    nameSetupHint: "Make sure this is your real name.",
    nameLabel: "Display name",
    namePlaceholder: "e.g. Ada Lovelace",
    nameSave: "Save name",
    nameRequiredError: "Please enter a name.",
    nameTooLongError: "That name is too long.",
    nameSaveError: "Couldn't save your name. Please try again.",
  },

  ideasHome: {
    heading: "Ideas",
    empty: "No ideas yet. Be the first to share one!",
    sortNew: "New",
    sortUpvotes: "Upvotes",
    search: "Search",
    refresh: "Refresh",
    searchPlaceholder: "Search ideas…",
    noResults: "No ideas match your search.",
    loadError: "Couldn't load ideas.",
    supportersError: "Couldn't load supporters",
    retry: "Try again",
  },

  idea: {
    upvote: "Upvote",
    oneUpvote: "1 upvote",
    upvotes: "{count} upvotes",
    support: "Support",
    supported: "Supported",
    supportedBy: "Supported by {name}",
    oneSupporter: "Supported by 1 leader",
    supportedByCount: "Supported by {count} leaders",
    delete: "Delete",
    deleteConfirm: "Are you sure you want to delete this idea?",
    deleteConfirmDetail: "The idea will be permanently deleted",
    deleteError: "Couldn't delete this idea. Please try again.",
    edit: "Edit",
    anonymous: "Anonymous",
    /** Author name with an optional title: "{name} ({title})". */
    authorWithTitle: "{name} ({title})",
    /** Supporter/leader name with an optional title: "{name} ({title})". */
    leaderWithTitle: "{name} ({title})",
    statusPending: "Pending review",
    statusApproved: "Approved",
    statusChangesRequested: "Changes requested",
    statusRejected: "Rejected",
    statusLabel: "Status",
    moderationFeedback: "Feedback",
    titleLabel: "Title",
    descriptionLabel: "Description",
    editSubmit: "Save & re-submit",
    editCancel: "Cancel",
    editError: "Couldn't save changes. Please try again.",
  },

  modal: {
    close: "Close",
    noTimeline: "No updates yet.",
  },

  timeline: {
    heading: "Timeline",
    postPlaceholder: "Share your progress towards this idea",
    postButton: "Post update",
    postLabel: "Timeline update",
    /** Intl.DateTimeFormat options for a timeline entry's date label. */
    dateFormat: "month short, day numeric",
    /** Timeline entry layout: the {date} and {message} joined by this. */
    dateEntry: "{date}: - {message}",
  },

  fab: {
    add: "Add an idea",
    title: "Add your idea",
    titleLabel: "Title",
    descriptionLabel: "Description",
    revealName: "Reveal my name",
    revealNameHint: "Uncheck to submit anonymously — moderators can still see who you are.",
    submit: "Submit for moderation",
    cancel: "Cancel",
    submitError: "Couldn't submit your idea. Please try again.",
    success: "Yay! Your idea is in for review :D",
  },

  moderation: {
    heading: "Moderation",
    empty: "Nothing to review yet :D",
    /** Shown to moderators when the author hid their name: "{name} ({anonymous})". */
    anonymousFormat: "{name} ({anonymous})",
    approve: "Approve",
    requestChanges: "Request changes",
    feedbackLabel: "Message (shown to the creator)",
    feedbackPlaceholder: "Tell the creator what to change…",
    requestChangesConfirm: "Send changes request",
  },

  me: {
    heading: "Me",
    myIdeas: "My ideas",
    myIdeasEmpty: "You haven't shared any ideas yet.",
    supported: "Supported ideas",
    supportedEmpty: "You haven't supported any ideas yet.",
    title: "Your title",
    titlePlaceholder: "e.g. Learning Prefect, Deputy Head Girl",
    titleSaved: "Title saved",
    titleError: "Couldn't save title, please try again",
    editResubmit: "Edit & Resubmit",
  },

  admin: {
    heading: "Admin",
    removeLeader: "Remove",
    removeInvite: "Cancel invite",
    emailLabel: "Leader email",
    emailPlaceholder: "name@schoolemail.org",
    nameLabel: "Display name (optional)",
    namePlaceholder: "e.g. Nora",
    titleLabel: "Title (optional)",
    titlePlaceholder: "e.g. Digital Leader",
    add: "Add",
    noLeaders: "No leaders yet.",
    noInvited: "No pending invitations.",
    alreadyLeader: "That user is already a leader",
    removed: "Leader removed.",
    added: "Leader added.",
    invited: "Leader invited (not yet signed up)",
    invitedLabel: "Pending (not signed up yet)",
    activeLabel: "Active leaders",
  },

  leaderboard: {
    heading: "Leaderboard",
    empty: "Nothing moderated yet!",
    approved: "Approved",
    sentBack: "Sent back",
  },

  errors: {
    permission: "That area's off limits!",
    actionFailed: "That didn't save, please try again!",
    offline: "Couldn't reach the server, please check your connection and try again!",
    rulesDeploy: "The server rejected this save — the deployed Firestore security rules look out of date. Run: firebase deploy --only firestore:rules,firestore:indexes",
  },

  common: {
    loading: "Loading…",
    loadingDots: "…",
    cancel: "Cancel",
    save: "Save",
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

/** Join a list of names into a human-readable, localizable supporter string.
 * Uses the configured list separator and the "{name} ({title})" format when a
 * title is present, so the rendering stays string-free. */
export function supportersList(
  supporters: Array<{ leaderName: string; leaderTitle?: string }>,
  formatTitle = strings.idea.leaderWithTitle,
  separator = ", ",
): string {
  return supporters
    .map((s) => (s.leaderTitle ? t(formatTitle, { name: s.leaderName, title: s.leaderTitle }) : s.leaderName))
    .join(separator);
}

/** Format a Date into the timeline's date label. The format is described by
 * `strings.timeline.dateFormat` (a comma-separated list of Intl.DateTimeFormat
 * option tokens) so it stays editable in one place. */
export function formatTimelineDate(date: Date, format = strings.timeline.dateFormat): string {
  const opts: Intl.DateTimeFormatOptions = {};
  for (const token of format.split(",").map((s) => s.trim())) {
    const [key, value] = token.split(" ");
    if (key && value) opts[key as keyof Intl.DateTimeFormatOptions] = value as never;
  }
  return date.toLocaleDateString("en-US", opts);
}
