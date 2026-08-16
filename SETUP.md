# Ideas Portal — Setup Guide

A Next.js + Firebase portal where students submit ideas, leaders moderate and
support them, and admins manage leaders. Kakao-styled, all copy in
`src/lib/strings.ts`.

## Prerequisites

- Node 20+
- A [Firebase](https://console.firebase.google.com) project
- npm

## 1. Install

```bash
npm install
```

## 2. Create your Firebase project

1. Go to the [Firebase console](https://console.firebase.google.com) → **Add project**.
2. **Authentication** → **Sign-in method**:
   - Enable **Microsoft** (requires a Microsoft Entra ID app registration —
     see step 3).
   - Enable **Email/Password** (useful for local testing and for promoting
     your first admin).
3. **Firestore Database** → **Create database** (production mode).

## 3. Microsoft sign-in (school accounts)

Firebase's Microsoft provider needs an Entra ID (Azure AD) app:

1. Register an app at [Entra admin center](https://entra.microsoft.com) →
   **App registrations** → **New registration**.
   - Redirect URI (type `Web`):
     `https://<your-project>.firebaseapp.com/__/auth/handler`
2. Note the **Application (client) ID** and (optionally) a client secret.
3. In Firebase **Authentication → Sign-in method → Microsoft**, paste the
   client ID (+ secret) and save.
4. In **Firebase → Project settings → Your apps → Add web app** to get the
   Web config values (they begin with `NEXT_PUBLIC_`).

## 4. Configure environment

```bash
cp .env.local.example .env.local
```

Fill in the values from your Firebase Web app config (see step 3.4).

## 5. Deploy Firestore rules + indexes

Install the Firebase CLI and sign in:

```bash
npm install -g firebase-tools
firebase login
firebase use <project-id>
```

Deploy rules and composite indexes (both files are in the repo root):

```bash
firebase deploy --only firestore:rules,firestore:indexes
```

> The rules enforce roles: students read approved ideas, upvote, submit
> (their own pending ideas), and delete their own; leaders additionally
> moderate, support, and post timeline updates; only admins change roles.

## 6. Make yourself admin

1. Run the app (`npm run dev`), sign in with your email.
2. A `users/{uid}` document is created for you with `role: "student"`.
3. In the Firestore console, edit your `users/{uid}` doc and set
   `role: "admin"`. The Admin tab then lets you promote others to leader by
   email.

Seed a bit of data so the home screen isn't empty: create an `ideas` doc with
`status: "approved"`, `authorName`, `upvoteUserIds: []`, `upvoteCount: 0`,
`timeline: []`.

## 7. Run the app

```bash
npm run dev          # local dev
npm run build        # production build (webpack)
npm run start        # serve the production build
npm run test         # vitest suite
npm run lint         # eslint
```

## 8. Editing text & branding

Every user-facing string lives in `src/lib/strings.ts` — brand name, nav,
buttons, messages. Change wording/branding in one file, nothing is hardcoded.
The Kakao Big Sans font is bundled in `src/app/fonts/` (OFL-licensed, see
`OFL.txt`).

## Project structure

```
src/
  app/            routes: /ideas /moderation /me /admin /login
  components/     Navbar, IdeaCard, IdeaModal, ModerationItem, FabAdd, SubmitDialog
  context/        AuthContext (auth state + role)
  lib/            api.ts (data layer), auth.ts, firebase.ts, strings.ts, types.ts
  test/           test setup + auth mock
  components/__tests__/  component tests
firestore.rules   role-based security rules
firestore.indexes.json  composite indexes for queries
```