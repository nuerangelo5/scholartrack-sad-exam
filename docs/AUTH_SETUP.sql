-- Link Supabase Auth users → profiles (run AFTER creating users in Authentication)
-- Test accounts:
--   Angelo  | ana.reyes@student.edu | Scholar123! | scholar
--   Staff   | staff@scholartrack.edu | Staff123!  | staff

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

-- Link scholar record (B01 / student 2026-0001) to Angelo's auth user
update public.scholars sc
set user_id = p.user_id,
    full_name = 'Angelo'
from public.profiles p
where p.email = 'ana.reyes@student.edu'
  and sc.student_id = '2026-0001';
