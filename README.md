# Illustration Todo

A Vite + React todo app with a Hono API server and Drizzle schema.

## Setup

```bash
npm install
npm run dev
```

The Vite client runs on `http://localhost:5173` and the API server runs on `http://localhost:8787`.

## Build

```bash
npm run build
npm start
```

The production server serves the Vite build and the `/api` endpoints from the same port.
Set `TURSO_DATABASE_URL` and `TURSO_AUTH_TOKEN` before running `npm run db:push` or `npm start`.

For Vercel, add `TURSO_DATABASE_URL` and `TURSO_AUTH_TOKEN` to the Project Settings
for the Production environment, then redeploy. `.env.local` is not deployed to Vercel.
