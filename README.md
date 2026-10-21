# ScholarTrack

**Student Scholarship Monitoring and Academic Compliance System**  
Systems Analysis and Design · Comprehensive Laboratory Examination · **Section B**

| Field | Detail |
|-------|--------|
| **Student** | Angelo Nuer |
| **Program / Section** | BSIT-3B |
| **Stack** | HTML · CSS · JavaScript · Supabase · GitHub Pages |
| **UI** | Liquid Glass |
| **Live URL** | https://nuerangelo5.github.io/scholartrack-sad-exam/ |
| **Repository** | https://github.com/nuerangelo5/scholartrack-sad-exam |
| **Supabase project** | `cvrdjaxyevgkguofypkm` |

---

## 1. Project overview

ScholarTrack is a browser-based MVP for the Scholarship Office. It replaces fragmented spreadsheets and email with a single flow:

1. Staff register scholars and assign **Excellence Scholar** or **Access Scholar**
2. Scholars submit semester academic summaries + grade-document reference
3. Staff verify evidence, evaluate policy compliance, and record renewal decisions

Official grades and payments stay outside this system (Registrar remains source of truth).

---

## 2. Live demo

**URL:** https://nuerangelo5.github.io/scholartrack-sad-exam/

### Test accounts (Supabase Auth)

| Name | Email | Password | Role |
|------|-------|----------|------|
| Angelo | ana.reyes@student.edu | Scholar123! | scholar |
| Staff | staff@scholartrack.edu | Staff123! | staff |

**Demo Staff / Demo Scholar** buttons work offline without credentials (exam fallback).

---

## 3. Features (Part II)

| Feature | Status |
|---------|--------|
| Role-based access (Staff / Scholar) | Done |
| Scholar registration + program assignment | Done |
| Grade submission, validation, duplicate prevention | Done |
| Verify / Return / Resubmit | Done |
| Program-based compliance + deficiency reasons | Done |
| Renewal decision (Approved / Held) | Done |
| Dashboard counts, search, filters | Done |
| Audit history | Done |
| Seed records B01–B06 (demo) | Done |

### Policy rules (examination)

| Rule | Excellence Scholar | Access Scholar |
|------|--------------------|----------------|
| Max GWA | 2.00 | 2.50 |
| Min units | 18 | 15 |
| Failed / Incomplete | 0 / 0 | 0 / 0 |
| Dropped | 0 | 1 |
| Deadline | 2026-11-06 17:00 Asia/Manila | same |

---

## 4. Analysis artifacts (Part I)

| Artifact | Location / name |
|----------|-----------------|
| Requirements analysis (A1–A6) | `docs/Part_I_Analysis_and_Design.docx` |
| **UML Use Case Diagram** | *ScholarTrack Use Case Diagram* (actors: Scholarship Staff, Scholar; system boundary ScholarTrack) |
| **Entity-Relationship Diagram** | Supabase Schema Visualizer · public schema (profiles, programs, scholars, submissions, evaluations, renewal_decisions, audit_log) |
| Traceability matrix | Inside Part I document |
| Test results template | `docs/Test_Results_TC01-TC10.md` |

### Use case list

- UC01 Authenticate  
- UC02 Register Scholar and Assign Program  
- UC03 Submit Semester Grades  
- UC04 Verify Evidence  
- UC05 Correct and Resubmit Grades  
- UC06 Evaluate Compliance  
- UC07 Record Renewal Decision  
- UC08 View Dashboard and Search  
- UC09 View Own Submission Status  
- UC10 View Audit History  

**Include:** UC06 includes UC04; UC07 includes UC06  
**Extend:** UC05 extends UC03  

---

## 5. Setup

```bash
npm start
# or serve the repo root on GitHub Pages (already configured)
```

### Supabase

1. Run `supabase/schema.sql` in SQL Editor  
2. Create Auth users (table above)  
3. Run `docs/AUTH_SETUP.sql` (or profile insert SQL)  
4. Optional: `docs/SEED_B01_B06.sql`  
5. Auth → URL config → add `https://nuerangelo5.github.io/scholartrack-sad-exam/`

Config: `src/supabase-config.js` (`USE_SUPABASE = true`).

---

## 6. Project structure

```
scholartrack-sad-exam/
├── index.html
├── package.json
├── README.md
├── docs/
│   ├── Part_I_Analysis_and_Design.docx
│   ├── AUTH_SETUP.sql
│   ├── SEED_B01_B06.sql
│   ├── SUPABASE_SETUP.md
│   └── Test_Results_TC01-TC10.md
├── src/
│   ├── main.js
│   ├── style.css
│   ├── data.js
│   └── supabase-config.js
└── supabase/
    └── schema.sql
```

---

## 7. Out of scope (per exam)

Live Registrar API, payment release, SMS, machine learning, full appeal workflow.

---

*Angelo Nuer · BSIT-3B · SAD Laboratory Examination Section B*
