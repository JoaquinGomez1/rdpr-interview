# Reporting screen decisions

## Stack and local setup

React, TypeScript, Vite, shadcn/ui, and TanStack Query on the front end. NestJS and PostgreSQL on the back end. The planned local setup uses Docker Compose for PostgreSQL. The production Dockerfile builds React and serves it from NestJS alongside `/api`. Deploy one Render service with Supabase Postgres and Storage. Local commands and the demo link are pending implementation.

## Editing and saving

- Drag a study thumbnail into the key-image list to add it. To reorder, drag an entry or Tab to it and press Shift+Left or Shift+Right. Keep focus on the moved entry and announce its new position. Show a hint beside the list: “Tab to a key image, then use Shift + ← or → to move it.” Dragging is easy to discover, and the shortcut makes repeated edits faster for frequent users. Start with two desktop panels and decide the narrow-window layout after trying the first build.
- Keep an unfinished draft in `localStorage`, keyed by a separate draft identifier returned by the API for this browser and study. Restore that draft on reload. **Submit** saves the full report to PostgreSQL. Clear the local draft only after a successful response, then display the saved version returned by the API.
- If submission fails, preserve the draft and show an error beside **Submit**. Use a keyboard-accessible expandable tooltip to show a copyable request UUID. NestJS generates one for every request and includes it in the response header and server logs. A network failure can occur before the browser receives a request ID.

## Images and persistence

**Questions I raised:** How does a reviewer find the study when they open the shared link? Does the URL need a study ID or a study list? Should reviewers see the report I worked on or start with a fresh one? Without a login, how can the app remember their work when they return?

- The shared link opens the browser’s own study. NestJS issues a persistent, random UUID in an `HttpOnly`, `SameSite=Lax` cookie (`Secure` in production). A new browser starts with an empty image panel and blank report. Returning with the same cookie restores that browser’s uploaded images and report. The root URL needs no study ID.
- The empty image panel prompts the reviewer to upload mock JPEG or PNG images. The API verifies the decoded format, limits each source file to 10 MB, and resizes it into preview and thumbnail variants in object storage.
- A small **Download sample images** button provides two simple PNG placeholders, one of a dog and one of a cat. Reviewers can upload them to try the full workflow. Each study starts empty, and the samples represent study images in the demo.
- Cap the report at 15 key images to keep it easy to scan. Show the count, explain the limit when reached, and let users edit or remove existing entries. PostgreSQL stores image references, so the cap controls report length.
- Compute SHA-256 from the source bytes during ingestion. Entries with the same image checksum and different captions can coexist. On submission, the server merges entries with the same checksum and caption after trimming whitespace, keeping the first occurrence. Enforce the limit on the resulting list and return its canonical order.
- `GET /api/study` returns uploaded images and the saved report. `POST /api/study/images` uploads an image. `PUT /api/study/report` saves the validated draft in one transaction. Every route resolves the study from the cookie. PostgreSQL stores one study per browser UUID, image checksums and object keys, one report per study, and key-image entries with an image reference, caption, and position. Derive contiguous positions after merging. Return `422` for an invalid caption, an image outside the study, or too many key images.

## Scope and AI use

The demo opens directly to the browser’s study and accepts mock images only. With another day, refine touch reordering and test the keyboard flow with users.

I used AI to compare deployment options and draft the API and data model. I rejected its initial suggestion to disallow duplicate image IDs because the same image can support distinct findings with different captions.
