# Reporting screen decisions

## Run locally

Run `docker compose up --build` and open [localhost:3001](http://localhost:3001). For Vite on port 5173 and NestJS in watch mode on port 3000, follow the [README](README.md). That setup can use Compose PostgreSQL at `127.0.0.1:5433`. The deployed Docker service serves React and the NestJS API from one Render URL, with PostgreSQL on Supabase. [Hosted demo](https://rdpr-interview.onrender.com/)

## Editing and saving

- Drag a study thumbnail into the key-image list or use **Add key image** for the selected view. The button also works with a keyboard or touch. Reorder entries by dragging or by tabbing to an entry and pressing **Shift+Left** or **Shift+Right**. Keyboard moves retain focus and announce the new position.
- The study and report sit side by side on desktop. At 900 px or less, they stack with the study first so both panels have room. At 550 px or less, padding and thumbnail labels shrink.
- Drafts restore from browser storage at `/`. **Save report** asks for confirmation, then clears the draft on success and opens the saved report at its UUID link. Anyone with the link can view it. The creating browser can use **Edit report** to update the same link. Cancelling discards those edits.
- The server issues a random UUID in the HttpOnly, SameSite=Strict `radpair-client-id` cookie and stores it as the report owner. HTTPS deployments use Secure cookies. A NestJS guard checks ownership on edits, and React uses the API's `canEdit` flag. This is a lightweight ownership check for a demo without login. Edit access follows possession of the cookie and is lost if it is cleared or expires. Reports saved before ownership was introduced are read-only.
- A failed save keeps the draft and shows a toast with the error message. **Error details** includes the HTTP status and request ID when available. The request ID lets developers find the corresponding error in PostgreSQL.
- The editor and API require at least 10 characters of trimmed report text, at least one key image, and a nonblank, single-line caption of up to 160 characters for each entry. The disabled save control explains validation errors on hover or focus.
- The editor caps the list at 15 entries to keep reports scannable. It shows the count and blocks additions at the limit while allowing edits and removals. The same image can support several findings. Each addition starts with a blank caption, and the add button's tooltip lists existing positions. On save, entries with the same image checksum and exact caption collapse to the first occurrence. The API enforces the cap after merging.

## API and persistence

- `GET /api/study` loads the five mock views. `POST /api/study/report` creates a report from `report.message` and an ordered list of image references and captions. `GET /api/study/report/:id` loads it with edit permission or returns `404`. `PUT` on that URL takes the same payload and returns `403` if ownership fails. Invalid inputs return `422`.
- PostgreSQL stores the report UUID and text in `reports`. Each row in `report_key_images` stores the entry UUID, caption, and position and references its report and the seeded `study_images` catalog. Explicit, unique positions per report preserve the final order on reload. NestJS saves the report and its entries in one transaction.

## Scope and AI use

Run `npm test` in each app and `npm run test:e2e` in `backend`. The frontend tests cover drafts, reordering, and the edit controls. The HTTP tests cover validation, ownership, and the positions written during an edit.

The demo uses one mock study and omits login and uploads. With another day, I would add touch reordering and test the keyboard flow with users.

I used AI to compare deployment options and draft the API and data model. I rejected its suggestion to disallow repeated image IDs because one view can support distinct findings with different captions.
