# Firestore Schema

Data model for the Ideas portal. All collections live under the default
database. Timestamps are Firestore `Timestamp`s written with
`serverTimestamp()`.

## users / {uid}

| field        | type     | notes                                             |
| ------------ | -------- | ------------------------------------------------- |
| uid          | string   | Firebase Auth UID                                 |
| email        | string   | used by admin "add leader by email"               |
| displayName  | string   |                                                   |
| role         | string   | `student` (default) \| `leader` \| `admin`        |
| createdAt    | timestamp|                                                   |

Created lazily on first sign-in (see `src/lib/auth.ts`).

## ideas / {ideaId}

| field               | type     | notes                                                   |
| ------------------- | -------- | ------------------------------------------------------- |
| title               | string   |                                                         |
| description         | string   | full text, shown in the modal                           |
| status              | string   | `pending` \| `changes_requested` \| `approved` \| `rejected` |
| authorId            | string   | uid of the submitter                                    |
| authorName          | string   | denormalised for the feed                               |
| upvoteUserIds       | string[] | uid list; toggle via `arrayUnion`/`arrayRemove`         |
| upvoteCount         | number   | server-side `increment` kept in sync with the array     |
| topicId             | string?  | set when the idea responds to a topic (question mode)   |
| topicQuestion       | string?  | denormalised topic text; survives topic deletion        |
| moderationFeedback  | object?  | `{ message, by, at }` set when requesting changes/rejecting |
| timeline            | array    | embedded leader updates (see below)                     |
| createdAt           | timestamp|                                                         |
| updatedAt           | timestamp|                                                         |

### timeline entries (embedded in the idea doc)

`timeline: [{ id, leaderId, leaderName, message, createdAt }]`

Stored on the idea document (not a separate collection) so the modal's
Timeline tab reads everything in one fetch. New entries are appended with
`arrayUnion`; the UI sorts newest-first.

## supports / {ideaId}_{leaderId}

A leader's public endorsement of an idea.

| field       | type     | notes                             |
| ----------- | -------- | --------------------------------- |
| ideaId      | string   |                                   |
| leaderId    | string   | uid of the supporting leader      |
| leaderName  | string   | denormalised for badges           |
| createdAt   | timestamp|                                   |

The document ID encodes the pair, so supporting again is an idempotent
`setDoc` and un-supporting is a `deleteDoc`. Used for the "Supported by
leaders" badge and the leader's supported list.

## topics / {topicId}

A topic (question) set by a leader for question mode — e.g. "What do you
think of the timetable changes?". Students respond with regular `ideas`
docs that carry `topicId` + `topicQuestion`. Topics are moderated like
ideas, but never by their own author; admins may delete them (responses
keep their denormalised `topicQuestion`, so nothing is orphaned).

| field        | type     | notes                                                  |
| ------------ | -------- | ------------------------------------------------------ |
| question     | string   | the prompt shown in the topic box (≤ 200 chars)         |
| status       | string   | `pending` \| `approved` \| `rejected`                   |
| authorId     | string   | uid of the leader who set it                            |
| authorName   | string   | denormalised for the "Set by" line                      |
| moderatedBy  | string?  | uid of the moderator who approved/rejected it           |
| createdAt    | timestamp|                                                         |
| updatedAt    | timestamp|                                                         |

The ideas page shows one card per approved topic, each with a preview row of
its approved responses and a link to the topic's own page (`/topics/{id}`)
listing all of them. Topic responses are excluded from the main ideas feed
client-side (NOT with a `topicId == null` query — composite indexes skip
docs missing the field, so pre-question-mode ideas would vanish).

## invitedLeaders / {email}

Pre-signup leader invitations. An admin can add a leader by email before
they've created an account. When the user signs up, `ensureUserDoc`
auto-promotes them to leader and deletes this record.

| field       | type     | notes                                      |
| ----------- | -------- | ------------------------------------------ |
| email       | string   | normalised to lowercase                    |
| displayName | string?  | optional display name for the admin UI     |
| title       | string?  | optional leader title (e.g. "Head Girl")   |
| invitedBy   | string   | uid of the admin who created the invite    |
| createdAt   | timestamp|                                            |

Document ID = normalised email (case-insensitive dedup).

## Role rules (enforced in firestore.rules)

| action                     | student | leader | admin |
| -------------------------- | ------- | ------ | ----- |
| Read any doc               | ✔       | ✔      | ✔     |
| Upvote any idea            | ✔       | ✔      | ✔     |
| Create idea (pending)      | ✔       | ✔      | ✔     |
| Update own pending idea    | ✔       | ✔      | ✔     |
| Delete own idea            | ✔       | ✔      | ✔     |
| Moderate (status change)   | –       | ✔ (never own submission) | ✔ (never own submission) |
| Support / un-support       | –       | ✔      | ✔     |
| Create topic (pending)     | –       | ✔      | ✔     |
| Delete topic               | –       | –      | ✔     |
| Delete any idea            | –       | –      | ✔     |
| Change user roles          | –       | –      | ✔     |
| Manage invited leaders     | –       | –      | ✔     |

## Composite indexes (firestore.indexes.json)

- `ideas`: `status ASC, createdAt ASC` — moderation queue
- `ideas`: `authorId ASC, createdAt DESC` — "my ideas"
- `ideas`: `status ASC, createdAt DESC` — main feed by newest
- `ideas`: `status ASC, upvoteCount DESC` — main feed by upvotes
- `ideas`: `topicId ASC, status ASC, createdAt DESC` — a topic's responses
- `supports`: `leaderId ASC, createdAt DESC` — a leader's supported ideas
- `topics`: `status ASC, createdAt DESC` — live topics
- `topics`: `status ASC, createdAt ASC` — topic moderation queue
- `topics`: `authorId ASC, createdAt DESC` — "my topics"

## Queries used by the UI

| page        | query                                            |
| ----------- | ------------------------------------------------ |
| `/ideas`    | `ideas` where `status == approved` order `createdAt desc` (or `upvoteCount desc`), topic responses filtered out client-side; one batched `supports` read per ≤30 ideas (`ideaId in […]`) for the badge; `topics` where `status == approved` order `createdAt desc`; per topic a capped `ideas` where `topicId == t` and `status == approved` order `createdAt desc` limit 4 preview |
| `/topics/[id]` | `topics/{id}`; `ideas` where `topicId == id` and `status == approved` order `createdAt desc`; batched `supports` for the badges |
| `/moderation` | `ideas` where `status == pending` order `createdAt asc` (own submissions hidden); `topics` where `status == pending` order `createdAt asc` (own topics hidden) |
| `/me`       | `ideas` where `authorId == me`; `supports` where `leaderId == me` → `getIdea` each; `topics` where `authorId == me` (leaders) |
| `/admin`    | `users` where `role in [leader, admin]`; `getUserByEmail` for promoting; `topics` order `createdAt desc` for topic deletion |
