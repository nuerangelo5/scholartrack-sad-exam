-- ScholarTrack SAD Exam – Schema + RLS + Seed
-- Project: scholartrack-sad-exam

-- Extensions
create extension if not exists "pgcrypto";

-- ─────────────────────────────────────────────
-- Tables
-- ─────────────────────────────────────────────

create table if not exists public.profiles (
  user_id     uuid primary key references auth.users(id) on delete cascade,
  full_name   text not null,
  role        text not null check (role in ('scholar', 'staff')),
  email       text not null,
  created_at  timestamptz not null default now()
);

create table if not exists public.scholarship_programs (
  program_id      uuid primary key default gen_random_uuid(),
  name            text not null unique,
  max_gwa         numeric(3,2) not null,
  min_units       integer not null,
  max_failed      integer not null default 0,
  max_incomplete  integer not null default 0,
  max_dropped     integer not null default 0,
  deadline        timestamptz not null,
  created_at      timestamptz not null default now()
);

create table if not exists public.scholars (
  scholar_id   uuid primary key default gen_random_uuid(),
  student_id   text not null unique,
  full_name    text not null,
  program_id   uuid not null references public.scholarship_programs(program_id),
  user_id      uuid references public.profiles(user_id),
  created_at   timestamptz not null default now()
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
  entity_id   uuid not null,
  action      text not null,
  actor_id    uuid references public.profiles(user_id),
  details     jsonb,
  created_at  timestamptz not null default now()
);

-- ─────────────────────────────────────────────
-- Seed programs (exam policies)
-- ─────────────────────────────────────────────
insert into public.scholarship_programs (name, max_gwa, min_units, max_failed, max_incomplete, max_dropped, deadline)
values
  ('Excellence Scholar', 2.00, 18, 0, 0, 0, '2026-11-06 17:00:00+08'),
  ('Access Scholar',     2.50, 15, 0, 0, 1, '2026-11-06 17:00:00+08')
on conflict (name) do nothing;

-- ─────────────────────────────────────────────
-- Helper: current user role
-- ─────────────────────────────────────────────
create or replace function public.current_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select role from public.profiles where user_id = auth.uid();
$$;

-- ─────────────────────────────────────────────
-- RLS
-- ─────────────────────────────────────────────
alter table public.profiles enable row level security;
alter table public.scholarship_programs enable row level security;
alter table public.scholars enable row level security;
alter table public.submissions enable row level security;
alter table public.evaluations enable row level security;
alter table public.renewal_decisions enable row level security;
alter table public.audit_log enable row level security;

-- Profiles
create policy "Users read own profile"
  on public.profiles for select
  using (user_id = auth.uid() or public.current_role() = 'staff');

create policy "Staff read all profiles"
  on public.profiles for select
  using (public.current_role() = 'staff');

-- Programs – readable by authenticated
create policy "Authenticated read programs"
  on public.scholarship_programs for select
  to authenticated
  using (true);

-- Scholars
create policy "Staff full access scholars"
  on public.scholars for all
  using (public.current_role() = 'staff')
  with check (public.current_role() = 'staff');

create policy "Scholar read own record"
  on public.scholars for select
  using (user_id = auth.uid());

-- Submissions
create policy "Staff full access submissions"
  on public.submissions for all
  using (public.current_role() = 'staff')
  with check (public.current_role() = 'staff');

create policy "Scholar read own submissions"
  on public.submissions for select
  using (
    scholar_id in (select scholar_id from public.scholars where user_id = auth.uid())
  );

create policy "Scholar insert own submissions"
  on public.submissions for insert
  with check (
    scholar_id in (select scholar_id from public.scholars where user_id = auth.uid())
  );

create policy "Scholar update own returned submissions"
  on public.submissions for update
  using (
    scholar_id in (select scholar_id from public.scholars where user_id = auth.uid())
    and verification_status = 'returned'
  );

-- Evaluations & decisions – staff only write, both can read appropriately
create policy "Staff manage evaluations"
  on public.evaluations for all
  using (public.current_role() = 'staff')
  with check (public.current_role() = 'staff');

create policy "Scholar read own evaluations"
  on public.evaluations for select
  using (
    submission_id in (
      select s.submission_id from public.submissions s
      join public.scholars sc on sc.scholar_id = s.scholar_id
      where sc.user_id = auth.uid()
    )
  );

create policy "Staff manage renewals"
  on public.renewal_decisions for all
  using (public.current_role() = 'staff')
  with check (public.current_role() = 'staff');

create policy "Scholar read own renewals"
  on public.renewal_decisions for select
  using (
    submission_id in (
      select s.submission_id from public.submissions s
      join public.scholars sc on sc.scholar_id = s.scholar_id
      where sc.user_id = auth.uid()
    )
  );

create policy "Staff read audit"
  on public.audit_log for select
  using (public.current_role() = 'staff');

create policy "Anyone insert audit via function"
  on public.audit_log for insert
  with check (true);

-- ─────────────────────────────────────────────
-- Compliance evaluation function (server-side)
-- ─────────────────────────────────────────────
create or replace function public.evaluate_submission(p_submission_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_role text;
  v_sub  record;
  v_prog record;
  v_reasons text[] := '{}';
  v_result text;
  v_deadline timestamptz;
begin
  v_role := public.current_role();
  if v_role is distinct from 'staff' then
    raise exception 'Only staff may evaluate submissions';
  end if;

  select s.*, sc.program_id
    into v_sub
    from public.submissions s
    join public.scholars sc on sc.scholar_id = s.scholar_id
   where s.submission_id = p_submission_id;

  if not found then
    raise exception 'Submission not found';
  end if;

  if v_sub.verification_status <> 'verified' then
    raise exception 'Submission must be verified before evaluation';
  end if;

  select * into v_prog
    from public.scholarship_programs
   where program_id = v_sub.program_id;

  -- Policy checks
  if v_sub.gwa > v_prog.max_gwa then
    v_reasons := array_append(v_reasons, format('GWA %.2f exceeds maximum %.2f', v_sub.gwa, v_prog.max_gwa));
  end if;
  if v_sub.units < v_prog.min_units then
    v_reasons := array_append(v_reasons, format('Units %s below minimum %s', v_sub.units, v_prog.min_units));
  end if;
  if v_sub.failed > v_prog.max_failed then
    v_reasons := array_append(v_reasons, format('Failed subjects %s exceeds allowed %s', v_sub.failed, v_prog.max_failed));
  end if;
  if v_sub.incomplete > v_prog.max_incomplete then
    v_reasons := array_append(v_reasons, format('Incomplete grades %s exceeds allowed %s', v_sub.incomplete, v_prog.max_incomplete));
  end if;
  if v_sub.dropped > v_prog.max_dropped then
    v_reasons := array_append(v_reasons, format('Dropped subjects %s exceeds allowed %s', v_sub.dropped, v_prog.max_dropped));
  end if;
  if v_sub.submitted_at > v_prog.deadline then
    v_reasons := array_append(v_reasons, format('Late submission (after %s)', v_prog.deadline));
  end if;

  if array_length(v_reasons, 1) is null then
    v_result := 'compliant';
  else
    v_result := 'with_deficiency';
  end if;

  insert into public.evaluations (submission_id, compliance_result, reasons, evaluated_by)
  values (p_submission_id, v_result, v_reasons, auth.uid())
  on conflict (submission_id) do update
    set compliance_result = excluded.compliance_result,
        reasons = excluded.reasons,
        evaluated_by = excluded.evaluated_by,
        evaluated_at = now();

  insert into public.audit_log (entity_type, entity_id, action, actor_id, details)
  values ('submission', p_submission_id, 'evaluate', auth.uid(),
          jsonb_build_object('result', v_result, 'reasons', v_reasons));

  return jsonb_build_object('result', v_result, 'reasons', v_reasons);
end;
$$;

-- ─────────────────────────────────────────────
-- Indexes
-- ─────────────────────────────────────────────
create index if not exists idx_scholars_student_id on public.scholars(student_id);
create index if not exists idx_submissions_scholar on public.submissions(scholar_id);
create index if not exists idx_submissions_status on public.submissions(verification_status);
create index if not exists idx_audit_entity on public.audit_log(entity_type, entity_id);
