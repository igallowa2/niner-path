# Niner Path

Niner Path is an academic and career planning app for UNC Charlotte students. It brings degree progress, course planning, job tracking, and campus involvement into one place.

This repository holds our ITSC 3155 Sprint 1 work. The feature built in Sprint 1 is the **Job Tracker**: students can add job applications, see them in a list, update their status, and find them again after a refresh.

## Tech stack

- React 19 + TypeScript
- Vite (dev server and build)
- Vitest + React Testing Library (tests)
- Browser localStorage (saves data for Sprint 1)
- Express API server in `server/` (keeps Adzuna and O*NET keys off the browser)

## Install dependencies

You need [Node.js](https://nodejs.org) 22 or newer.

```bash
npm install
```

## Set up `.env`, the database, and API keys

1. Copy the example file: `cp .env.example .env`
2. Create your local database and load sample data:
   ```bash
   npm run db:migrate
   npm run db:seed
   ```
3. For Find Jobs and Explore Careers, get free keys:
   - Adzuna: https://developer.adzuna.com/signup (gives an **App ID** and an **App Key**)
   - O*NET Web Services: https://services.onetcenter.org/developer/signup (gives an **API key**)
4. Open `.env` and replace the `your-...` placeholders. Save the file.

`.env` is in `.gitignore`: **never commit it**. Keys are only read by the server. They do not start with `VITE_`, so they are never sent to the browser. Without keys the app still runs; the search pages show "isn't set up yet."

## Run the app locally

```bash
npm run dev
```

This starts both the React app (http://localhost:5173) and the API server (http://localhost:3001). Open the React link. Vite forwards `/api/...` requests to the server.

- `npm run server` (or `npm run dev:server`) starts only the API server; `npm run dev:web` starts only the React app.
- Check the server: open http://localhost:3001/api/health (shows whether each service has a key, never the keys).

## Find Jobs and Explore Careers (Sprint 2)

- **Find Jobs** (sidebar): search real listings from Adzuna by keyword and location. **Save to tracker** adds a job to the Job Tracker as "Saved" with its posting link.
- **Explore Careers** (sidebar): enter a major, interest, or keyword to see matching careers from O*NET. Click a career to search jobs with that title.
- **Errors** show friendly messages: no results, bad key, free limit reached, service not responding, server not running.
- **Caching**: the server remembers job searches for 10 minutes and career searches for 24 hours, so repeat searches don't use up free API calls.
- **Attribution**: "Jobs by Adzuna" and the O*NET Web Services credit are shown as their terms require.

API routes (our server):

| Route | What it does |
|-------|--------------|
| `GET /api/applications` | All tracked applications (from the database) |
| `POST /api/applications` | Add an application |
| `PATCH /api/applications/:id/status` | Change an application's status |
| `DELETE /api/applications/:id` | Delete an application |
| `GET /api/jobs?what=&where=&page=` | Adzuna job search, simplified |
| `GET /api/careers?keyword=` | O*NET career search, simplified |
| `GET /api/health` | Which services are configured |

**AI assistant: paused.** The Claude-based assistant is turned off to avoid API costs. Any future AI UI must check `features.aiAssistant` in `src/config/features.ts`, controlled by `VITE_ENABLE_AI_ASSISTANT` (default `false`).

## The implemented feature: Job Tracker

Linked issues: #1 Add a job application, #2 View my applications as a list, #3 Update an application's status, #4 Save my applications between visits.

What it does:

- **Add an application.** Click **+ Add application**, fill in the form, and click **Save application**.
  - Company and Role title are required. Leaving them blank shows an error and nothing is saved.
  - The posting link must be a full web address (starting with `http://` or `https://`) if you enter one.
  - New applications start as **Saved** unless you pick another status.
  - **Cancel** closes the form without saving.
- **See your applications.** Each card shows company, role, location, job type, industry, deadline, and a colored status badge. If there are none, an empty message appears.
- **Change status.** Use the dropdown on any card (Saved, Applied, Interviewing, Offer, Rejected). The badge and the "last change" date update right away.
- **Saved between visits.** Applications are stored in the browser, so they are still there after a refresh. The first visit shows three sample applications.

Design reference: [Figma prototype](https://www.figma.com/make/mP7NjRr3GMpWn9unnK4zFH/Onboarding-User-Flow) (Job Tracker page).

## Test the feature

### Automated tests

```bash
npm test
```

There are 40 tests in five files. None of them call the real Adzuna or O*NET APIs or need keys (they use fake replies).

| Test file | What it checks |
|-----------|----------------|
| `src/lib/validation.test.ts` | Required fields, link format, blank link allowed |
| `src/components/JobTracker.test.tsx` | Empty state, form opens, errors block saving, valid save adds a card with status "Saved", Cancel doesn't save, status change updates the badge, data survives a reload |
| `server/app.test.ts` | Adzuna/O*NET requests are built correctly, replies are simplified, keys never leak, caching and cache expiry, empty/too-long searches rejected, bad key / rate limit / network errors |
| `src/lib/jobs.test.ts` | Career title → job keyword, job type guess, salary format, listing → tracker application |
| `src/components/JobSearch.test.tsx` | Find Jobs results, Save to tracker, empty search, no results, friendly error messages, clicking a career searches jobs |

Other checks: `npm run typecheck` (TypeScript) and `npm run lint`.

### Manual test checklist

| Acceptance criterion | How to test | Result |
|----------------------|-------------|--------|
| "+ Add application" opens a form | Click the button | |
| Blank Company/Role shows errors, doesn't save | Click Save with the form empty | |
| Bad link shows an error | Type `truist jobs` in Posting link, then Save | |
| Valid entry is added right away and the form closes | Fill in Company + Role, then Save | |
| Default status is Saved | Save without changing Status | |
| Cancel doesn't save | Type something, then Cancel | |
| Status change updates the badge | Change a card's dropdown | |
| Data is still there after a refresh | Add one, then refresh the page | |

## Project structure

```
src/
  types.ts                         Application data shape and status list
  lib/validation.ts                Form checks (required fields, link format)
  lib/storage.ts                   Save/load from localStorage
  lib/sampleData.ts                Sample applications for first load
  components/JobTracker.tsx        Page: list, add, status change
  components/AddApplicationForm.tsx
  components/ApplicationCard.tsx
  components/JobSearch.tsx         Find Jobs page (Adzuna, via our server)
  components/CareerExplorer.tsx    Explore Careers page (O*NET, via our server)
  lib/api.ts                       Calls our /api routes; friendly error messages
  lib/jobs.ts                      Helpers: career → keyword, listing → application
  config/features.ts               Feature flags (AI assistant off)
server/
  index.ts                         Starts the API server, loads .env
  app.ts                           Routes, input checks, caching, error replies
  adzuna.ts                        Adzuna job search
  onet.ts                          O*NET career search
  cache.ts                         Small in-memory cache
  errors.ts                        Error codes and timeouts
shared/
  api.ts                           TypeScript types shared by server and app
```

## AI usage disclosure


- **GitHub Copilot (VS Code)** with the **Figma MCP Server** to read our Figma Job Tracker frame and suggest components, layout, and an implementation plan.
- **Claude** to help draft GitHub Issues from our user stories and to suggest starter code and tests for the Job Tracker.

What our team did ourselves: 



## Team

- Ivory Galloway
- Elaman Amangali
- Olivia Parker-George
- Alina Dyadchenko
- Ulyana Bakhurevich
