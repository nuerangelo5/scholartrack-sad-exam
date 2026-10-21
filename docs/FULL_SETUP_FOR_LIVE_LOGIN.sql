-- ============================================================
-- ScholarTrack – FULL SETUP for Live Supabase Sign-in
-- Run this entire script in Supabase → SQL Editor → New query
-- ============================================================
-- ORDER:
--   1. Create the two users in Authentication → Users (see bottom)
--   2. Run this whole script
--   3. In the app set USE_SUPABASE = true and hard-refresh
-- ============================================================

-- 1) Tables (safe if already exist)
create extension if not exists "pgcrypto";

create table if not exists public.profiles (
  user_id    uuid primary key references auth.users(id) on delete cascade,
  full_name  text not null,
  role       text not null check (role in ('staff', 'scholar')),
  email      text,
  created_at timestamptz not null default now()
);

create table if not exists public.scholarship_programs (
  program_id      uuid primary key default gen_random_uuid(),
  name            text not null unique,
  max_gwa         numeric(3,2) not null,
  min_units       integer not null,
  max_failed      integer not null default 0,
  max_incomplete  integer not null default 0,
  max_dropped     integer not null default 0,
  deadline        timestamptz,
  created_at      timestamptz not null default now()
);

create table if not exists public.scholars (
  scholar_id  uuid primary key default gen_random_uuid(),
  student_id  text not null unique,
  full_name   text not null,
  program_id  uuid not null references public.scholarship_programs(program_id),
  user_id     uuid references public.profiles(user_id),
  created_at  timestamptz not null default now()
);

create table if not exists public.submissions (
  submission_id       uuid primary key default gen_random_uuid(),
  scholar_id          uuid not null references public.scholars(scholar_id) on delete cascade,
  academic_year       text not null,
  semester            text not null,
  gwa                 numeric(3,2) not null check (gwa >= 1.00 and gwa <= 5.00),
  units               integer not null check (units >= 0),
  failed              integer not null check (failed >= 0),
  incomplete          integer not null check (incomplete >= 0),
  dropped             integer not null check (dropped >= 0),
  evidence_ref        text not null,
  submitted_at        timestamptz not null default now(),
  verification_status text not null default 'pending'
                        check (verification_status in ('pending', 'verified', 'returned')),
  verification_reason text,
  verified_by         uuid references public.profiles(user_id),
  verified_at         timestamptz,
  created_at          timestamptz not null default now(),
  unique (scholar_id, academic_year, semester)
);

create table if not exists public.evaluations (
  evaluation_id     uuid primary key default gen_random_uuid(),
  submission_id     uuid not null unique references public.submissions(submission_id) on delete cascade,
  compliance_result text not null check (compliance_result in ('compliant', 'with_deficiency')),
  reasons           text[] not null default '{}',
  evaluated_by      uuid not null references public.profiles(user_id),
  evaluated_at      timestamptz not null default now()
);

create table if not exists public.renewal_decisions (
  decision_id   uuid primary key default gen_random_uuid(),
  submission_id uuid not null unique references public.submissions(submission_id) on delete cascade,
  decision      text not null check (decision in ('approved', 'held')),
  notes         text,
  decided_by    uuid not null references public.profiles(user_id),
  decided_at    timestamptz not null default now()
);

create table if not exists public.audit_log (
  log_id      uuid primary key default gen_random_uuid(),
  entity_type text not null,
  entity_id   uuid,
  action      text not null,
  actor_id    uuid references public.profiles(user_id),
  details     jsonb,
  created_at  timestamptz not null default now()
);

-- 2) Programs
insert into public.scholarship_programs (name, max_gwa, min_units, max_failed, max_incomplete, max_dropped, deadline)
values
  ('Excellence Scholar', 2.00, 18, 0, 0, 0, '2026-11-06 17:00:00+08'),
  ('Access Scholar',     2.50, 15, 0, 0, 1, '2026-11-06 17:00:00+08')
on conflict (name) do update set
  max_gwa = excluded.max_gwa,
  min_units = excluded.min_units,
  max_failed = excluded.max_failed,
  max_incomplete = excluded.max_incomplete,
  max_dropped = excluded.max_dropped,
  deadline = excluded.deadline;

-- 3) Scholars (B01–B06)
insert into public.scholars (student_id, full_name, program_id)
select v.student_id, v.full_name, p.program_id
from (values
  ('2026-0001', 'Angelo',       'Excellence Scholar'),
  ('2026-0002', 'Ben Santos',   'Excellence Scholar'),
  ('2026-0003', 'Carla Lim',    'Access Scholar'),
  ('2026-0004', 'Diego Cruz',   'Access Scholar'),
  ('2026-0005', 'Elena Garcia', 'Excellence Scholar'),
  ('2026-0006', 'Felix Ong',    'Access Scholar')
) as v(student_id, full_name, program_name)
join public.scholarship_programs p on p.name = v.program_name
on conflict (student_id) do update
  set full_name = excluded.full_name,
      program_id = excluded.program_id;

-- 4) Link Auth users → profiles (only works AFTER you create the users in Authentication)
insert into public.profiles (user_id, full_name, role, email)
select id, 'Scholarship Staff', 'staff', email
from auth.users
where email = 'staff@scholartrack.edu'
on conflict (user_id) do update
  set full_name = excluded.full_name, role = excluded.role, email = excluded.email;

insert into public.profiles (user_id, full_name, role, email)
select id, 'Angelo', 'scholar', email
from auth.users
where email = 'ana.reyes@student.edu'
on conflict (user_id) do update
  set full_name = excluded.full_name, role = excluded.role, email = excluded.email;

-- 5) Link Angelo (B01) to his Auth user
update public.scholars sc
set user_id = p.user_id,
    full_name = 'Angelo'
from public.profiles p
where p.email = 'ana.reyes@student.edu'
  and sc.student_id = '2026-0001';

-- 6) Quick check (run and look at the result)
select
  u.email,
  p.role,
  p.full_name as profile_name,
  s.student_id,
  s.full_name as scholar_name,
  pr.name as program
from auth.users u
left join public.profiles p on p.user_id = u.id
left join public.scholars s on s.user_id = u.id
left join public.scholarship_programs pr on pr.program_id = s.program_id
where u.email in ('staff@scholartrack.edu', 'ana.reyes@student.edu');

-- ============================================================
-- MANUAL STEP (do this in the Supabase Dashboard UI first):
--
-- Authentication → Users → Add user
--
--   1) Email: staff@scholartrack.edu
--      Password: Staff123!
--      Auto Confirm: ON
--
--   2) Email: ana.reyes@student.edu
--      Password: Scholar123!
--      Auto Confirm: ON
--
-- Then re-run the INSERT INTO profiles + UPDATE scholars parts above
-- (or just re-run this whole script).
-- ============================================================
