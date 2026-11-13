# Reporting screen decisions

## Stack and local setup

React, TypeScript, Vite, shadcn/ui, and TanStack Query on the front end. NestJS and PostgreSQL on the back end. The planned local setup uses Docker Compose for PostgreSQL. The production Dockerfile builds React and serves it from NestJS alongside `/api`. Deploy one Render service with Supabase Postgres and Storage. Local commands and the demo link are pending implementation.

## Editing and saving

- Drag a study thumbnail into the key-image list to add it. To reorder, drag an entry or Tab to it and press Shift+Left or Shift+Right. Keep focus on the moved entry and announce its new position. Show a hint beside the list: “Tab to a key image, then use Shift + ← or → to move it.” Dragging is easy to discover, and the shortcut makes repeated edits faster for frequent users. Start with two desktop panels and decide the narrow-window layout after trying the first build.
- Keep an unfinished draft in `localStorage`, keyed by a separate draft identifier returned by the API for this browser and study. Restore that draft on reload. **Submit** saves the full report to PostgreSQL. Clear the local draft only after a successful response, then display the saved version returned by the API.
- If submission fails, preserve the draft and show an error beside **Submit**. Use a keyboard-accessible expandable tooltip to show a copyable request UUID. NestJS generates one for every request and includes it in the response header and server logs. A network failure can occur before the browser receives a request ID.

## Images and persistence

**Questions I raised:** How does a reviewer find the study when they open the shared link? Does the URL need a study ID or a study list? Should reviewers see the report I worked on or start with a fresh one? Without a login, how can the app remember their work when they return?

- The shared link opens a study preloaded with mock images. NestJS issues a persistent UUID in an `HttpOnly`, `SameSite=Lax` cookie (`Secure` in production). Each browser starts with a blank report and the same mock images. Returning with the same cookie restores that browser's report. The root URL needs no study ID.
- The seed process accepts JPEG and PNG files up to 10 MB, verifies the decoded format, and generates preview and thumbnail variants. Locally, image files live on disk and report data lives in PostgreSQL.
- Cap the report at 15 key images to keep it easy to scan. Show the count, explain the limit when reached, and let users edit or remove existing entries. PostgreSQL stores image references, so the cap controls report length.
- Allow the same study image to appear more than once so it can support different findings. Each addition opens a new entry with a blank caption. The Add key image tooltip lists the positions where the current image already appears.
- Exact-text merging is planned for the API on submission. Use the SHA-256 checksum computed during image ingestion to identify matching images. When the captions match exactly and contain text, keep the first entry in report order. Enforce the limit on the resulting list and return its canonical order.
- `GET /api/study` returns the preloaded images and the browser's saved report. `PUT /api/study/report` saves the validated draft in one transaction. PostgreSQL stores one shared study, image checksums and file keys, one report per study and browser UUID, and key-image entries with an image reference, caption, and position. Derive contiguous positions after merging. Return `422` for an invalid caption, an image outside the study, or too many key images.

## Scope and AI use

The demo opens directly to a single mock study. With another day, refine touch reordering and test the keyboard flow with users.

I used AI to compare deployment options and draft the API and data model. I rejected its initial suggestion to disallow duplicate image IDs because the same image can support distinct findings with different captions.
