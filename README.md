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

## Phase 2.1: activity plans and private study hub

Apply the researcher repository migration `202610280002_study_operations_activities.sql` before deploying either frontend. The researcher repository's `docs/phase2-activities-release.md` describes the coordinated release and verification.

Multi-activity studies support baseline, follow-up, diary, and open-response activities with required steps and relative opening/due days. Participants separately accept research consent and activity linking, then use a private return link to access `/my-studies`, saved drafts, activity progress, consent receipts, study contacts, and coordinator-recorded handoff status. Return links grant access to that enrollment; their security notice is shown before joining and beside link controls. Remembering the link across browser restarts requires an explicit choice.

Drafts save to the database and retain a tab-local backup. Revision checks prevent stale tabs from overwriting newer work, and participants can download a conflicting local copy. Enrollments retain their published study version. Optional activities do not increase the required completion count, and due dates allow late submissions.

The multi-activity pilot uses anonymous study codes. Canvas studies continue through the existing single-activity flow. Compensation and credit statuses are manual coordinator records. Repeating diary schedules, account recovery, and reminders are later increments.

## One question at a time

Participant study links open a welcome slide, followed by explicit consent and
Canvas sharing when required. Each question appears on its own slide with an
answer progress bar and Back/Next controls. Ctrl/Command + Enter advances a
question; Enter in the answer field always adds a new line. Empty or whitespace-only
answers cannot advance. A final review lets participants edit individual answers
before submitting. Keyboard shortcuts never submit the review automatically.

The same question slides serve single studies and hub activities. Existing draft
recovery, background saves, conflict downloads, private links, consent records,
and retry IDs remain in place. Saves retain entered content and use shared
skeleton indicators. Long questions and consent stay scrollable, with reduced
motion support and focus moving to each new question heading.

After building this app, run `SCENARIO=participant npm run test:browser` from the
researcher repository's `frontend` directory for the participant browser
walkthroughs. These use synthetic studies and intercepted services.
