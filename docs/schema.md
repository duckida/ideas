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
| Create idea (pending)      | ✔       | ✔      | ✔     |
| Update own pending idea    | ✔       | ✔      | ✔     |
| Delete own idea            | ✔       | ✔      | ✔     |
| Moderate (status change)   | –       | ✔      | ✔     |
| Support / un-support       | –       | ✔      | ✔     |
| Change user roles          | –       | –      | ✔     |
| Manage invited leaders     | –       | –      | ✔     |

## Composite indexes (firestore.indexes.json)

- `ideas`: `status ASC, createdAt ASC` — moderation queue
- `ideas`: `authorId ASC, createdAt DESC` — "my ideas"
- `supports`: `leaderId ASC, createdAt DESC` — a leader's supported ideas

## Queries used by the UI

| page        | query                                            |
| ----------- | ------------------------------------------------ |
| `/ideas`    | `ideas` where `status == approved` order `createdAt desc`; plus `supports` per idea for the badge |
| `/moderation` | `ideas` where `status == pending` order `createdAt asc` |
| `/me`       | `ideas` where `authorId == me`; `supports` where `leaderId == me` → `getIdea` each |
| `/admin`    | `users` where `role in [leader, admin]`; `getUserByEmail` for promoting |
