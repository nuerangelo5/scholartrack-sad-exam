-- Seed exam scholars + submissions (B01–B06)
-- Run after schema.sql. Safe to re-run (uses fixed student_ids).

-- Ensure programs exist
insert into public.scholarship_programs (name, max_gwa, min_units, max_failed, max_incomplete, max_dropped, deadline)
values
  ('Excellence Scholar', 2.00, 18, 0, 0, 0, '2026-11-06 17:00:00+08'),
  ('Access Scholar',     2.50, 15, 0, 0, 1, '2026-11-06 17:00:00+08')
on conflict (name) do nothing;

-- Scholars
insert into public.scholars (student_id, full_name, program_id)
select v.student_id, v.full_name, p.program_id
from (values
  ('2026-0001', 'Angelo', 'Excellence Scholar'),
  ('2026-0002', 'Ben Santos', 'Excellence Scholar'),
  ('2026-0003', 'Carla Lim', 'Access Scholar'),
  ('2026-0004', 'Diego Cruz', 'Access Scholar'),
  ('2026-0005', 'Elena Garcia', 'Excellence Scholar'),
  ('2026-0006', 'Felix Ong', 'Access Scholar')
) as v(student_id, full_name, program_name)
join public.scholarship_programs p on p.name = v.program_name
on conflict (student_id) do update
  set full_name = excluded.full_name,
      program_id = excluded.program_id;

-- Submissions AY 2026-2027 Sem 1
-- Clear prior seed rows for this term then insert
delete from public.submissions s
using public.scholars sc
where s.scholar_id = sc.scholar_id
  and s.academic_year = '2026-2027'
  and s.semester = '1'
  and sc.student_id in ('2026-0001','2026-0002','2026-0003','2026-0004','2026-0005','2026-0006');

insert into public.submissions (
  scholar_id, academic_year, semester, gwa, units, failed, incomplete, dropped,
  evidence_ref, submitted_at, verification_status
)
select sc.scholar_id, '2026-2027', '1', v.gwa, v.units, v.failed, v.incomplete, v.dropped,
       v.evidence_ref, v.submitted_at::timestamptz, v.verification_status
from (values
  -- B01 Compliant boundary
  ('2026-0001', 2.00, 18, 0, 0, 0, 'DOC-B01-AY2627S1', '2026-11-06 17:00:00+08', 'verified'),
  -- B02 GWA over limit
  ('2026-0002', 2.01, 18, 0, 0, 0, 'DOC-B02-AY2627S1', '2026-11-05 16:00:00+08', 'verified'),
  -- B03 Access one drop OK
  ('2026-0003', 2.50, 15, 0, 0, 1, 'DOC-B03-AY2627S1', '2026-11-05 16:00:00+08', 'verified'),
  -- B04 units + INC
  ('2026-0004', 2.50, 14, 0, 1, 0, 'DOC-B04-AY2627S1', '2026-11-05 16:00:00+08', 'verified'),
  -- B05 failed + late
  ('2026-0005', 1.75, 18, 1, 0, 0, 'DOC-B05-AY2627S1', '2026-11-06 17:01:00+08', 'verified'),
  -- B06 pending
  ('2026-0006', 2.25, 15, 0, 0, 0, 'DOC-B06-AY2627S1', '2026-11-05 16:00:00+08', 'pending')
) as v(student_id, gwa, units, failed, incomplete, dropped, evidence_ref, submitted_at, verification_status)
join public.scholars sc on sc.student_id = v.student_id;
