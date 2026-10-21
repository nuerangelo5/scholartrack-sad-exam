# Supabase Setup for ScholarTrack

**Project URL:** https://cvrdjaxyevgkguofypkm.supabase.co  
**Project ref:** cvrdjaxyevgkguofypkm

## 1. Apply the schema

1. Open [Supabase Dashboard](https://supabase.com/dashboard) → project `cvrdjaxyevgkguofypkm`
2. Go to **SQL Editor** → New query
3. Copy the full contents of `../supabase/schema.sql`
4. Run the query

This creates:
- `profiles`, `scholarship_programs`, `scholars`, `submissions`, `evaluations`, `renewal_decisions`, `audit_log`
- RLS policies
- Seed rows for Excellence Scholar and Access Scholar programs
- `evaluate_submission()` function

## 2. Keys already configured

In `src/supabase-config.js`:

- `SUPABASE_URL` → your project URL
- `SUPABASE_ANON_KEY` → the JWT anon key you provided
- `USE_SUPABASE` → set to `true` only after the schema is applied

**Do not** put the database password or service_role key in any frontend file.

## 3. Create test users (optional for live auth)

In Authentication → Users, create:

| Email                    | Password (example) | Role to assign in profiles |
|--------------------------|--------------------|----------------------------|
| staff@scholartrack.edu   | (your choice)      | staff                      |
| ana.reyes@student.edu    | (your choice)      | scholar                    |

Then in SQL Editor:

```sql
-- After the users exist in auth.users, link them:
insert into public.profiles (user_id, full_name, role, email)
select id, 'Scholarship Staff', 'staff', 'staff@scholartrack.edu'
from auth.users where email = 'staff@scholartrack.edu'
on conflict do nothing;

insert into public.profiles (user_id, full_name, role, email)
select id, 'Ana Reyes', 'scholar', 'ana.reyes@student.edu'
from auth.users where email = 'ana.reyes@student.edu'
on conflict do nothing;
```

## 4. Switch the app to live mode

Edit `src/supabase-config.js`:

```js
export const USE_SUPABASE = true;
```

Reload the browser. If connection fails, the app stays on demo mode.

## Security reminder

- Anon key = public, OK in browser
- Service role key = secret, never in source or screenshots
- Database password = secret, only for CLI / server tools
