# MOC Candidate Portal

A recruitment portal for Magnum Opus Consultants: a Next.js front end backed by
a Django REST API. Built against Statement of Work **MOC-CP:0001** and the
accompanying Development Plan.

```
backend/    Django 6.1 + DRF — serves /api/ and /admin/
frontend/   Next.js 16 (App Router, TypeScript, Tailwind 4)
```

## Running it

Both halves run as separate processes. Start the backend first.

**Backend** — http://127.0.0.1:8000

```powershell
cd backend
.venv\Scripts\python.exe manage.py runserver
```

**Frontend** — http://localhost:3000

```powershell
cd frontend
npm run dev
```

## What is built

| Area | Routes |
| ---- | ------ |
| Public | `/` job list, `/jobs/[id]` job detail |
| Job seeker | `/portal` dashboard, applications, recommended, saved, profile, settings |
| Hiring manager | `/manager` dashboard, all jobs, job overview with applicant tabs, candidate database, candidate profile, automatic emails |

Anyone may browse every open position and read it in full without an
account, per the SOW. Applying is what needs a profile: **Apply now** routes to
profile creation rather than a sign-in wall, and the detail pane says so before
the click. Draft, private and closed postings never reach the public list.

The board deliberately has **no location search**. These are MOC's own and
offshored roles, so the town a posting is filed under is not how anyone looks
for one; work setup (remote / hybrid / in office) is what varies, and it is a
filter. Jobs still carry a `location` and the API still accepts a `location`
query param — the public board just does not use it.

**Implemented end to end:** the design system (tokens, chips, status badges,
both sidebar shells, cards, rows, progress rows), the candidate-to-job matching
engine, profile completion with the five-step strength ladder and the 80%
branded-CV gate, applicant tabs (All / Shortlisted / Favourites / Suggested),
the candidate database, and the automatic-email editor.

**Not yet built** (later days in the Development Plan): sign-in and the three
auth providers, CV upload and PDF parsing, the AI rewriting advice, the
step-by-step create-job form, and actual email sending. Buttons for these
render but do not act yet.

### Demo accounts

`manage.py seed` creates one hiring manager (Sarah Chen) and six job seekers,
all with password `portal-demo`. Until sign-in exists, the API resolves the
"current user" from these seeded accounts — see `current_job_seeker()` and
`current_hiring_manager()` in [backend/api/views.py](backend/api/views.py).
Swapping in `request.user` when authentication lands is a change in one place.

## First-time setup

```powershell
cd backend
py -m venv .venv
.venv\Scripts\python.exe -m pip install -r requirements.txt
copy .env.example .env
.venv\Scripts\python.exe manage.py migrate
.venv\Scripts\python.exe manage.py seed

cd ..\frontend
npm install
copy .env.example .env.local
```

For the Django admin: `.venv\Scripts\python.exe manage.py createsuperuser`.

Re-seed at any time with `manage.py seed` (idempotent) or
`manage.py seed --fresh` to clear the demo data first.

## API

| Method | Path | Returns |
| ------ | ---- | ------- |
| GET | `/api/jobs/` | Public job list — `search`, `work_setup`, `experience_level`, `employment_type`, `role_category`, `location`, `sort` |
| GET | `/api/jobs/categories/` | Role categories with counts |
| GET | `/api/jobs/<id>/` | One job, plus match score and saved/applied state |
| GET | `/api/candidate/dashboard/` | Everything the job seeker dashboard renders |
| GET | `/api/candidate/profile/` | Profile with the eight sections, completion and strength |
| GET | `/api/candidate/applications/` | Applications with status |
| GET | `/api/candidate/saved/` | Saved jobs |
| GET | `/api/candidate/recommended/` | Open roles ranked by match score |
| GET | `/api/candidate/recently-viewed/` | Last 10 jobs opened |
| GET | `/api/manager/dashboard/` | Stats, jobs and the last 50 activities |
| GET | `/api/manager/jobs/` | All postings including drafts — `search`, `status`, `sort` |
| GET | `/api/manager/jobs/<id>/` | A position with its four applicant tabs |
| GET | `/api/manager/candidates/` | Candidate database — `search`, filters, `sort` |
| GET | `/api/manager/candidates/<id>/` | One candidate with their applications |
| GET | `/api/manager/emails/` | Automatic email wording |
| GET | `/api/health/` | Liveness check |

## Matching

`score_match()` in [backend/api/matching.py](backend/api/matching.py) scores a
candidate against a position out of 100, weighted role category 40, skills 35,
experience 15, work setup 10. It returns the reasons alongside the number,
which is what the designs show as chips ("Skill 1 match", "Working hours
partial match"). One score drives both directions: suggested candidates on a
position and recommended jobs for a job seeker.

## Design system

Tokens live in [frontend/src/app/globals.css](frontend/src/app/globals.css) and
are Magnum Opus Consultants' own, taken from moc-pty.com rather than invented:
**#054B70** petrol blue (primary, and the logo colour), **#8BB7C4** accent,
**#F5F5F5** page grey, **Poppins** as the typeface. The real lighthouse logo is
in [frontend/public/](frontend/public/) in two cuts — colour horizontal for
light surfaces, light stacked for the deep sidebar.

Both themes are built, but the portal is **pinned to light for now**: the
document ships as `data-theme="light"` instead of following the device. Dark is
still reachable from Settings, and the one line to change back is the
`data-theme` attribute in [frontend/src/app/layout.tsx](frontend/src/app/layout.tsx).
The Development Plan has first visits following the device setting, so this is
a temporary default.

Contrast is checked rather than eyeballed: brand on white is 9.35:1, and no
text token sits below the 4.5:1 AA threshold on the surface it is used on.

Status colour is decided once in `primitives.tsx` (`JOB_STATUS_TONE`,
`APPLICATION_STATUS_TONE`, `PROFILE_STRENGTH`) so a badge, a dot and a dropdown
of the same status cannot drift apart.

## Configuration

Both sides read from git-ignored env files, each with a committed `.example`.

- `backend/.env` — secret key, debug, allowed hosts, CORS origins
- `frontend/.env.local` — `NEXT_PUBLIC_API_URL`

CORS is configured for `localhost:3000` and `127.0.0.1:3000`. Add any other
origin to `DJANGO_CORS_ALLOWED_ORIGINS` or the browser will block the request.

## Tests

```powershell
cd backend
.venv\Scripts\python.exe manage.py test
```

15 tests cover public job visibility, profile completion and the strength
ladder, the 80% CV gate, match scoring, the dashboard, the applicant tabs, and
the one-application-per-job constraint.

```powershell
cd frontend
npm run build      # also type-checks
npx eslint src
```

## Notes

- `cacheComponents` is on in
  [frontend/next.config.ts](frontend/next.config.ts), so anything that reads
  runtime data — an uncached `fetch`, `params`, or `usePathname` — must sit
  inside a `<Suspense>` boundary. Every route therefore renders a static shell
  immediately and streams its data in; the build marks them all
  `◐ Partial Prerender`. `NavLink` wraps its own boundary and falls back to the
  idle link, so navigation paints before the active state resolves.
- Before production: set `DJANGO_SECRET_KEY`, set `DJANGO_DEBUG=False`, swap
  SQLite for a real database, and point `careers.moc-pty.com` at the droplet.
