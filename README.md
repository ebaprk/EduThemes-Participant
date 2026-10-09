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
