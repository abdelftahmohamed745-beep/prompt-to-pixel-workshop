# ForgeFE roadmap

## Pass 1 — frontend shell (done, verifying)
- [x] Design system, i18n (ar RTL default / en LTR), auth screens, dashboard, new project, workspace, settings

## Pass 2 — real backend (in progress)
- [ ] Schema + RLS: profiles, projects, project_files, messages, ai_runs, file_revisions, usage_events
- [ ] Real email/password auth (sign up, sign in, sign out, reset, session), replace local session guard
- [ ] Persist all project CRUD to database; explicit import of local demo projects
- [ ] Gemini server adapter (GEMINI_API_KEY server secret), health check, streaming, stop, errors/retries
- [ ] AI edit flow: structured file-edit schema (zod), path allowlist, size limits, apply + revisions + revert
- [ ] AI initial project generation
- [ ] Honest service status (Connected / Setup required / Error) replacing demo badges
- [ ] Provider settings shows server-derived status/model; no key input
- [ ] Download source, project history
- [ ] Tests: path validation, edit validation, revert, adapter errors
- [ ] AGENTS.md/README update
- [ ] Browser verification ar/en mobile/desktop
