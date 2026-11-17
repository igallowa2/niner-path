# Niner Path - Database Setup and Verification

## 1. Overview

Niner Path uses SQLite as its development database and Prisma as its ORM (Object-Relational Mapping) tool.

Each team member maintains a separate local database file. Team members use the same committed Prisma schema, migrations, and seed scripts to maintain consistent database structures and sample data.

The local database file is `prisma/dev.db` and is not committed to GitHub.

## 2. Prerequisites

Before setting up the project, make sure you have:

- Node.js 20 or newer.
- npm installed (included with Node.js).
- Git installed.
- The Niner Path repository cloned onto your computer.

## 3. Get the Project

Clone the repository:

```bash
git clone https://github.com/igallowa2/niner-path.git
cd niner-path
```

If you already have the repository:

```bash
git pull origin main
```

## 4. Install Dependencies

Run the following command from the project root directory:

```bash
npm install
```

This installs the dependencies required to run the application.

## 5. Configure Environment Variables

Create a local environment file by copying the example file:

**Mac/Linux:**
```bash
cp .env.example .env
```

Each team member should use their own authorized local configuration.

Do not commit the local `.env` file or include passwords, tokens, or private credentials in GitHub.

## 6. Set Up the Database

Run the Prisma migration command:

```bash
npm run db:migrate
```

This applies the committed database migrations and generates the Prisma Client. The project's migration command also runs the seed script.

The database schema is defined in:

```text
prisma/schema.prisma
```

Migration files are stored in:

```text
prisma/migrations/
```

## 7. Seed the Database

To run the seed script separately when needed:

```bash
npm run db:seed
```

The seed script inserts sample application records into the local database.

## 8. Run Tests

Verify the project setup by running:

```bash
npm test
```

The expected test result for the current project is 21 passing tests across 3 test files.

## 9. Start the Application

Start the backend server:

```bash
npm run server
```

The API can be tested in a browser at:

```text
http://localhost:3001/api/applications
```

The endpoint should return the sample application records stored in the database.

## 10. Team Database Verification

Since Niner Path uses SQLite, each team member must verify their own local database setup.

| Team Member | Connection Test / Database Operation | Result |
|---|---|---|
| Olivia | Ran migrations, seeded database, and retrieved 3 applications through the API | Passed |
| Ivory | Ran migrations and seed, retrieved 3 records, tested POST, GET, and PATCH operations, confirmed the update and timeline saved, deleted the test record, and verified the seeded records remained after restarting the server. | Passed |
| Elaman | Completed the database setup and retrieved the 3 sample applications through the API. | Passed |
| Alina | Completed the database setup and retrieved the 3 sample applications through the API. | Passed |
| Ulyana | Completed the database setup and retrieved the 3 sample applications through the API. | Passed |


## 11. Security Notes

- Never commit the local `.env` file.
- Keep real database credentials private.
- Use `.env.example` for placeholder configuration values only.
- Do not share passwords or private credentials through GitHub.
- Each team member should maintain their own local SQLite database.

## 12. Troubleshooting

**Problem: npm command not found**

Install Node.js, which includes npm, and restart the VS Code terminal.

**Problem: Database migration fails**

Check that the environment file exists and that the database configuration is correct.

**Problem: API endpoint does not load**

Make sure the backend server is running using `npm run server`.

**Problem: Tests fail**

Check the error output and verify that dependencies and database setup are complete.


>>>>>>> fc4443c (Add Sprint 2 project documentation)
