# Niner Path

Niner Path is an academic and career planning app for UNC Charlotte students. It brings degree progress, course planning, job tracking, and campus involvement into one place.

This repository holds our ITSC 3155 Sprint 1 work. The feature built in Sprint 1 is the **Job Tracker**: students can add job applications, see them in a list, update their status, and find them again after a refresh.

## Tech stack

- React 19 + TypeScript
- Vite (dev server and build)
- Vitest + React Testing Library (tests)
- Browser localStorage (saves data for Sprint 1)

## Install dependencies

You need [Node.js](https://nodejs.org) 20 or newer.

```bash
npm install
```

## Run the app locally

```bash
npm run dev
```

Then open the link it prints (usually http://localhost:5173).

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

There are 14 tests in two files:

| Test file | What it checks |
|-----------|----------------|
| `src/lib/validation.test.ts` | Required fields, link format, blank link allowed |
| `src/components/JobTracker.test.tsx` | Empty state, form opens, errors block saving, valid save adds a card with status "Saved", Cancel doesn't save, status change updates the badge, data survives a reload |

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
```

## AI usage disclosure

We used AI tools during this sprint:
Claude
Co-pilot


- **GitHub Copilot (VS Code)** with the **Figma MCP Server** to read our Figma Job Tracker frame and suggest components, layout, and an implementation plan.
- **Claude** to help draft GitHub Issues from our user stories and to suggest starter code and tests for the Job Tracker.

What our team did ourselves: reviewed every suggestion before using it, changed the code to fit our design and acceptance criteria, ran the tests and the manual checklist, and fixed problems we found (for example, a form layout overflow on narrow screens). Every team member can explain how the feature works.

_Team: edit this section so it matches exactly what each tool did and what you changed._

## Team

- Ivory Galloway
- Elaman Amangali
- Olivia Parker-George
- Alina Dyadchenko
- Ulyana Bakhurevich
