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

See [assignment.md](assignment.md) for the brief and [decisions.md](decisions.md) for the design notes.
