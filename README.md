# ScholarTrack
**Student Scholarship Monitoring and Academic Compliance System**

Systems Analysis and Design · Laboratory Examination – Section B  
**Student:** Angelo Nuer  
**Program / Section:** BSIT-3B  
**Repository:** [scholartrack-sad-exam](https://github.com/nuerangelo5/scholartrack-sad-exam)  
**Live demo:** https://nuerangelo5.github.io/scholartrack-sad-exam/

---

## Overview

ScholarTrack is a browser-based minimum viable system for the Scholarship Office. It supports two roles:

- **Scholar** – submit semester academic summaries and a grade-document reference; view own status; correct returned submissions  
- **Scholarship Staff** – register scholars, assign programs, verify evidence, evaluate policy compliance, record renewal decisions, search/filter, and view audit history  

Policies for **Excellence Scholar** and **Access Scholar** are read from persisted program records (not hard-coded in evaluation logic).

---

## Tech stack

- Frontend: HTML, CSS (Liquid Glass), vanilla JavaScript (ES modules)
- Backend / Auth: Supabase (PostgreSQL + Auth)
- Hosting: GitHub Pages
- No build step required

---

## Quick start (local)

1. Clone or download this repository.
2. Open `index.html` in a modern browser (Chrome / Edge / Firefox), **or** serve the folder with any static server.
3. Use the **Demo Staff** / **Demo Scholar** buttons for offline exam use, or sign in with the test accounts below.

No `npm install` is required for the core UI.

---

## Live site

https://nuerangelo5.github.io/scholartrack-sad-exam/

---

## Test accounts (for instructor)

| Role   | Email                     | Password    | Notes                          |
|--------|---------------------------|-------------|--------------------------------|
| Staff  | staff@scholartrack.edu    | Staff123!   | Full dashboard & all actions   |
| Scholar| ana.reyes@student.edu     | Scholar123! | Linked to seed scholar B01 (Angelo) |

**Demo buttons** (no network required):

- **Demo Staff** – same staff capabilities using in-memory seed  
- **Demo Scholar** – same scholar capabilities (B01)

---

## Environment / configuration

| Name | Location | Purpose |
|------|----------|---------|
| `SUPABASE_URL` | `src/supabase-config.js` | Project URL |
| `SUPABASE_ANON_KEY` | `src/supabase-config.js` | Public anon key only (never service_role) |
| `USE_SUPABASE` | `src/supabase-config.js` | `true` = real Auth; demo buttons still work |

Do **not** put service-role keys or database passwords in the repo or screenshots.

---

## Database setup (optional live mode)

1. In Supabase SQL Editor, run:
   - `supabase/schema.sql`
   - `docs/SEED_B01_B06.sql` (or `docs/FULL_SETUP_FOR_LIVE_LOGIN.sql`)
2. Create Auth users (Authentication → Users) matching the test emails above; enable Auto Confirm.
3. Run the profile / scholar link statements in `docs/AUTH_SETUP.sql` or the full setup script.
4. Set `USE_SUPABASE = true` in `src/supabase-config.js` and hard-refresh the app.

---

## Seed records (B01–B06)

Academic Year **2026–2027**, Semester **1**. Policy thresholds and expected outcomes follow the examination paper (Excellence / Access rules, deadline 2026-11-06 17:00 Asia/Manila).

| ID  | Program    | Focus of test                          |
|-----|------------|----------------------------------------|
| B01 | Excellence | Compliant at GWA and deadline boundary |
| B02 | Excellence | GWA above limit → With Deficiency      |
| B03 | Access     | One dropped allowed → Compliant        |
| B04 | Access     | Units + incomplete → With Deficiency   |
| B05 | Excellence | Failed + late → With Deficiency        |
| B06 | Access     | Pending verification (gate tests)      |

---

## Features implemented

- Role-based login (Supabase Auth + offline demo)
- Scholar registration and program assignment
- Grade submission with validation and duplicate prevention
- Verification (Verified / Returned) and correction/resubmit
- Program-based compliance evaluation with deficiency reasons
- Renewal decision (Approved only if Compliant; else Held)
- Dashboard counts, search (student ID / name), filters
- Audit log (verification, evaluation, renewal)
- Persistence via seed + optional Supabase

---

## Project structure
