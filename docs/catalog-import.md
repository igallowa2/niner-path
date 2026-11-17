# Niner Path - Course Catalog Data

Niner Path stores degree requirements from the official
[UNC Charlotte Undergraduate Catalog](https://catalog.charlotte.edu) (2026-2027) in the same SQLite
database as the job tracker.

## What's in the database

| Table | What it holds | Example |
|---|---|---|
| `College` | A college, using the codes from the Catalog Widget sheet | `CCI`, College of Computing and Informatics |
| `Program` | A major, minor, certificate, honors program, or early entry program | Economics, Business Concentration, B.S. |
| `RequirementGroup` | A block of requirements in a program. Blocks can be nested. | Core Courses (29 credit hours) |
| `RequirementCourse` | A course listed in a block. Courses with the same `slot` are "or" choices. | ITSC 1600 **or** ITSC 2600 |
| `Course` | One course, shared by every program that lists it | ITSC 3155 - Software Engineering (3) |

Each requirement block has a `rule`:

- **ALL**: take every course listed (pick one course per slot).
- **CHOOSE**: take `chooseCount` courses, or `chooseCredits` credit hours, from the list ("Select one of the following").
- **OPEN**: no course list. The `notes` say what counts ("Select two courses from the 3000- or 4000-levels...").

Every program has a `catalogUrl` that links to its official page. The app should show that link and remind
students to confirm their plan in DegreeWorks or with an advisor.

## Load the data into your database

`prisma/catalog.json` holds the catalog data and is committed to GitHub, so you don't need to download anything.

```bash
npm run db:migrate   # creates the new catalog tables (first time only)
npm run db:seed      # loads the sample applications and the catalog
```

Currently included: all Computer Science concentrations, Data Science (B.S. and minor), Economics
(both B.S. concentrations and the minor), and the four Finance concentrations. Course descriptions and
prerequisites are not filled in yet.

## API

| Request | Returns |
|---|---|
| `GET /api/colleges` | All colleges, with how many programs each has |
| `GET /api/programs?college=CCI&type=Major&search=computer` | Programs (all filters optional) |
| `GET /api/programs/:id` | One program with its requirement blocks as a tree |
| `GET /api/courses?prefix=ECON` | All courses, or one subject's (prefix optional) |
| `GET /api/courses/ITSC%203155` | One course |

## Adding more programs

The catalog site has bot protection. Requesting many pages quickly gets your computer blocked for a
while, so **import a few programs at a time**:

```bash
npm run catalog:import -- --only "Accounting"
npm run catalog:import -- --only "Accounting" --with-course-details   # also descriptions and prerequisites
npm run db:seed
```

- `--only` imports programs whose name starts with that text. Programs already in `catalog.json` are kept.
- The catalog's robots.txt asks for **120 seconds between requests**, so the script waits that long between
  pages (even across separate runs) and saves every page in `scripts/catalog/.cache/` (not committed), so nothing is
  downloaded twice. A program is a few pages, so plan on a few minutes per program, plus 2 minutes per course with
  `--with-course-details`. Let it run in the background.
- If the site starts blocking, the script stops right away. Don't try to work around it. Wait and try later.
- For the full catalog, the better long-term option is asking the Registrar for Acalog API access.

## Each new school year

Open the new catalog at catalog.charlotte.edu and update `CATALOG` at the top of
`scripts/catalog/importCatalog.ts`:

- `catalogId`: the `catoid` number in the catalog's web address
- `catalogYear`: for example `"2027-2028"`
- `programsNavId` and `collegesNavId`: the `navoid` numbers of the "Academic Programs" and "COLLEGES/UNITS" pages

Then delete `scripts/catalog/.cache/`, re-import, and run `npm run db:seed`.

## Tests

`scripts/catalog/parse.test.ts` checks the page reader against copies of real catalog page layouts.
It runs with the rest of the tests (`npm test`) and doesn't need the internet.
