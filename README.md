# EduThemes Participant

The standalone student and participant app for joining EduThemes studies and submitting open-text responses. Researchers create studies in the [EduThemes researcher app](https://eduthemes-abepark.web.app/). Both apps use the same Supabase project, but are separate code projects and Firebase Hosting sites.

## Run locally

```bash
npm ci
npm run dev
```

Open http://localhost:3001. Copy `.env.example` to `.env.local` if you need to connect a different Supabase project. The committed `.env.production` contains only the public Supabase project URL and publishable browser key; never add a secret or service-role key.

Open `EduThemes-Participant.code-workspace` in VS Code to work on this project by itself.

## Deploy

```bash
npm run build
firebase deploy --only hosting:participant
```

The Firebase target maps to `eduthemes-participant-abepark.web.app`. The researcher app and its Firebase target live in the separate `EduThemes` repository.

## Canvas LTI 1.3

Participants launch EduThemes from their UF Canvas course, review the fields supplied by Canvas, then enter a study code. Each Canvas-backed submission includes a server-verified snapshot of those fields after the participant confirms sharing them. Missing fields, including academic year, are never guessed. Participants can disconnect for studies that allow anonymous participation; Canvas-identified studies require a verified connection.

Set `VITE_API_URL` to the EduThemes backend (locally, `http://localhost:1500`). The backend must allow this participant origin in `CORS_ORIGINS` and use the same origin for `LTI_PARTICIPANT_URL`. The `/canvas` route exchanges a single-use launch code, removes it from the address bar, and keeps the resulting opaque token in tab session storage. React Strict Mode cannot exchange the launch twice. Expired sessions or connection failures do not silently submit anonymously.

The researcher repository contains the LTI backend, SQL migration, UF setup guide at `docs/canvas-lti.md`, and administrator configuration endpoint `/lti/config`. Apply the migration and configure the backend before deploying this app. UF must approve and register the integration before real Canvas launches can work.

Run `npm test` and `npm run build` to verify the participant app.

## Phase 1: consent and study versions

Apply the researcher repository migration `202610280001_teams_versions_consent.sql` and deploy its updated backend before deploying this app. Coordinate both apps because the researcher database write contract changes. See `EduThemes/docs/phase1-release.md` for the complete release sequence.

Participants review version-specific consent before seeing questions. Anonymous studies never attach Canvas details. Identified studies require Canvas and a separate sharing confirmation. Submissions carry a displayed version ID, explicit consent confirmation, and an idempotent request ID; stale versions and missing consent are rejected by the database. Historical studies preserve their original unrecorded-consent status.

Draft answers are saved in tab session storage, separated by study version and participant context. Consent is confirmed again after reload. If browser storage is unavailable, the participant can still submit and retries retain an in-memory request ID for the page. A successful submission offers a receipt containing the version and server-recorded consent time. This is not a cross-device participant account.
