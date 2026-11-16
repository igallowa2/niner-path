# Database Setup and Verification

Niner Path stores job applications in a local SQLite database through Prisma.
Each team member has their own database file (`prisma/dev.db`), which is not committed.

## Setup

1. `git pull` on `main`, then `npm install`
2. Copy `.env.example` to `.env` (never commit `.env`)
3. `npm run db:migrate` creates the tables
4. `npm run db:seed` loads 3 sample applications (this clears your **local** applications only)
5. `npm test` runs all tests
6. `npm run server` starts the API at `http://localhost:3001/api/applications`

## How to verify your connection

1. With the server running, `GET /api/applications` should return the 3 seeded records.
2. `POST /api/applications` with a test record (company starting with `TEST-`), then `GET` to read it back.
3. `PATCH /api/applications/:id/status` to change its status, then `GET` to confirm the change saved.
4. Delete the test record so the database is back to the seeded data.
5. Restart the server and `GET` again: the seeded records should still be there.

## Team verification

| Member | Connection test performed | Result |
|---|---|---|
| Ivory Galloway | Pulled latest `main`, ran `npm install`, `db:migrate` (already in sync), and `db:seed` (3 records). `npm test`: 21/21 passed. `GET` returned 3 records. Created a `TEST-` application with `POST` (201), read it back with `GET`, updated its status Saved → Applied with `PATCH` (200), and confirmed the update and timeline saved. Deleted the test record (directly through Prisma, because `main` has no DELETE route yet). Restarted the server: `GET` still returned the 3 seeded records. Tested 2026-11-15. | Pass |
