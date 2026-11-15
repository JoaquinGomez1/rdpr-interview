# Radpair reporting challenge

## Run NestJS and Vite locally

Install Node.js LTS and npm. From the repository root, run `docker compose up -d --wait db` to start PostgreSQL and copy `backend/.env.example` to `backend/.env`. If you already have a local PostgreSQL instance, set `DATABASE_URL` in `backend/.env` to its connection URL instead. The example connects to Compose PostgreSQL at `127.0.0.1:5433`. Update any existing `DATABASE_URL` that uses the Compose hostname `db`.

Run the backend and frontend in separate terminals from the repository root:

```sh
npm --prefix backend install
npm --prefix backend run start:dev
```

```sh
npm --prefix frontend install
npm --prefix frontend run dev
```

Open [http://localhost:5173](http://localhost:5173), or use the URL Vite prints if the port is occupied. Vite proxies API calls to port 3000 by default. The app includes five mock images, stores drafts in browser storage, and saves confirmed reports to PostgreSQL.

If saving returns “Provide report text up to 16,000 characters and a list of key images,” Vite is reaching an older API that expects a string in `report`. Stop that backend and start the current checkout with `npm --prefix backend run start:dev`. If you're running the API through Docker Compose, use `docker compose up --build` to rebuild the app from the current checkout.

## Run with Docker Compose

Install and start Docker Desktop, or use Docker Engine with the Compose plugin. From the repository root, run:

```sh
docker compose up --build
```

When NestJS finishes starting, open [http://localhost:3001](http://localhost:3001) for the React app. Compose builds both apps and starts PostgreSQL. The Compose app uses `db:5432` on its internal network. Local NestJS can run alongside it on port 3000.

Press `Ctrl+C` to stop the services. Run `docker compose down` to remove the containers while keeping the local data volumes.

## Deploy with Supabase and Render

Supabase hosts PostgreSQL. A Render Docker web service builds the root `Dockerfile` and serves React, the bundled study images, and the NestJS API at one public HTTPS URL.

1. In a dedicated Supabase project for this demo, switch off **Enable Data API** in the **Data API** integration settings. NestJS connects directly to PostgreSQL and provides the application's API.
2. In the Supabase dashboard, open **Connect**, click the **Direct** tab labeled **Connection string**, and choose **Session pooler** as the connection method. Copy the URI (port `5432`). Replace `[YOUR-PASSWORD]` with the database password, percent-encoding reserved URL characters, and append `?sslmode=verify-full` to the supplied URL if it has no query string. Keep the completed URL in your hosting service's secret environment settings.
3. Push the branch you intend to deploy to a Git repository. In the separate [Render dashboard](https://dashboard.render.com/), select **New → Web Service → Git Provider** and connect the repository. Select the branch, choose **Docker**, and use `./Dockerfile` with the repository root as the build context. Set `DATABASE_URL` to the completed session pooler URL. You can set the health check path to `/api/study`.
4. Deploy and open the service URL. NestJS creates its tables and seeds the mock image catalog at startup. Open the study, save a mock report with captioned key images, then open its report URL in a private window and confirm the saved text, captions, and order.

To change the database password, open **Database → Settings** in Supabase and choose **Reset database password**. Update `DATABASE_URL` in Render with the new password and redeploy the service.

If Render logs `connect ENETUNREACH` with an IPv6 address on port `5432`, copy the **Session pooler** URI again and update `DATABASE_URL`. The session pooler uses an IPv4 `*.pooler.supabase.com` host and a `postgres.<project-ref>` username.

See [assignment.md](assignment.md) for the brief and [decisions.md](decisions.md) for the design notes.
