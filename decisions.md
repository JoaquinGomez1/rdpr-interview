# Reporting screen decisions

## Stack and local setup

React, TypeScript, and Vite on the front end. NestJS and PostgreSQL on the back end. Docker Compose runs both locally. The production Dockerfile builds React and serves it from NestJS alongside `/api`. The hosted demo link is pending.

Compose publishes the app on port 3001 so local NestJS can use port 3000 at the same time. Local NestJS reaches Compose PostgreSQL through the loopback port 5433. The container reaches PostgreSQL at `db:5432` on the Compose network.

## Editing and saving

- Drag a study thumbnail into the key-image list to add it. To reorder, drag an entry or Tab to it and press Shift+Left or Shift+Right. Keep focus on the moved entry and announce its new position. Show a hint beside the list: “Tab to a key image, then use Shift + ← or → to move it.” Dragging is easy to discover, and the shortcut makes repeated edits faster for frequent users. Start with two desktop panels and decide the narrow-window layout after trying the first build.
- Keep an unfinished draft under a fixed study key in `localStorage` and restore it on reload at `/`. **Save report** opens a confirmation that the saved report will be read-only. After a successful save, clear the draft and open `/<report UUID>`. **New report** returns to `/`.
- Saved reports are read-only because the demo has no login or ownership checks. Anyone with the UUID link can view the report, and nobody can modify it after creation.
- If saving fails, preserve the draft. Use shadcn/ui Sonner for frontend failures so every error toast shows the message immediately. Put the HTTP status and `X-Request-Id` behind **Error details**, with unavailable values labeled for failures that lack response metadata.
- Require at least 10 characters of trimmed report text and at least one key image, with a nonblank caption for every entry. React Hook Form disables saving and explains the missing inputs on hover or keyboard focus. The API applies the same requirements before merging duplicate key images.

## Images and persistence

**Questions I raised:** How does a reviewer find the study when they open the shared link? Does the URL need a study ID or a study list? Should reviewers see the report I worked on or start with a fresh one? Without a login, how can the app remember their work when they return?

- Everyone uses the same static study images and the app has no image uploads. Remove the browser identity cookie because browser-local storage already keeps drafts per browser. Migrate existing drafts to the fixed study key. Each saved report gets its own UUID for sharing.
- Use the five bundled mock PNGs for the fixed study. NestJS computes their SHA-256 checksums at startup and seeds the image catalog in PostgreSQL.
- Cap the report at 15 key images to keep it easy to scan. Show the count, explain the limit when reached, and let users edit or remove existing entries. PostgreSQL stores image references, so the cap controls report length.
- Allow the same study image to appear more than once so it can support different findings. Each addition opens a new entry with a blank caption. The Add key image tooltip lists the positions where the current image already appears.
- For images with the same checksum and exactly matching nonblank captions, keep the first entry in report order. Enforce the limit on the resulting list and assign contiguous positions.
- `GET /api/study` gives the draft editor its images. `POST /api/study/report` creates a report and its ordered key images in one transaction. `GET /api/study/report/:id` serves the shareable report and returns `404` for an unknown UUID. Invalid report text, captions and key images return `422`.

## Tests

Use Vitest and React Testing Library for frontend component and hook unit tests. They cover study image selection, image load errors, adding key images, keyboard and drag reordering, and restoring the ordered draft from browser storage. Run `npm test` from `frontend` or use `npm run test:watch` while editing.

Run `npm test` from `backend` for unit tests and `npm run test:e2e` for HTTP integration tests. The assignment requires at least one API test, so Supertest posts directly to the NestJS report endpoint and checks for `422` responses when report text, key images, or a caption are missing. The database is stubbed because validation rejects these requests before saving.

## Scope and AI use

The demo opens directly to a single mock study. With another day, refine touch reordering and test the keyboard flow with users.

I used AI to compare deployment options and draft the API and data model. I rejected its initial suggestion to disallow duplicate image IDs because the same image can support distinct findings with different captions.

## API report payload

Send key image references and captions without image data. Represent report text as `report.message` so the report object can gain additional fields later.
Use class-validator DTOs for request payload rules. Register Nest's validation pipe once so controllers only need a typed `@Body()` parameter and invalid payloads return a readable `422` error. Check study membership and enforce the key-image cap after merging against the study catalog.
Check successful API response shapes before updating the screen or clearing a draft. Restore legacy draft entries with unique UUIDs so their captions and order can carry over into a saved report.
Run the local API in watch mode so validation changes stay in sync with Vite during development.

## Backend structure and error logging

Keep the app module focused on wiring. In `products`, the controller handles HTTP, the service handles report rules, and the repository owns database access and invokes the separate study seed. Generate a new `X-Request-Id` for every request and return it to the client so a reported failure can be matched to its PostgreSQL log entry. Store the error message, path, timestamp, HTTP method, and status.

The demo targets one user and one mock study. Keep setup and maintenance simple, and use the PostgreSQL error log to investigate failed HTTP requests by request ID.
