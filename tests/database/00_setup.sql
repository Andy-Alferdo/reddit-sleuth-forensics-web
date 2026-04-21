-- =====================================================================
-- 00_setup.sql — Fixtures shared by every test file
-- Run FIRST. Creates 3 users (admin, alice, bob) and 2 sample cases.
-- =====================================================================

\echo '=== SETUP: creating fixtures ==='

BEGIN;

-- ---------- assert helper ------------------------------------------------
CREATE OR REPLACE FUNCTION public._test_assert(cond boolean, label text)
RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  IF cond THEN
    RAISE NOTICE 'PASS: %', label;
  ELSE
    RAISE EXCEPTION 'FAIL: %', label;
  END IF;
END;
$$;

-- ---------- helper to "log in" as a user inside a transaction ------------
CREATE OR REPLACE FUNCTION public._test_login(p_uid uuid)
RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  PERFORM set_config('role', 'authenticated', true);
  PERFORM set_config(
    'request.jwt.claims',
    json_build_object('sub', p_uid::text, 'role', 'authenticated')::text,
    true
  );
END;
$$;

CREATE OR REPLACE FUNCTION public._test_logout()
RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  PERFORM set_config('role', 'postgres', true);
  PERFORM set_config('request.jwt.claims', '', true);
END;
$$;

COMMIT;

-- ---------- fixed UUIDs (idempotent) -------------------------------------
-- admin  : 11111111-1111-1111-1111-111111111111
-- alice  : 22222222-2222-2222-2222-222222222222
-- bob    : 33333333-3333-3333-3333-333333333333

-- Insert auth.users directly (local Supabase only — never do this in prod)
INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password,
                        email_confirmed_at, created_at, updated_at,
                        raw_app_meta_data, raw_user_meta_data, is_super_admin, confirmation_token)
VALUES
  ('11111111-1111-1111-1111-111111111111'::uuid, '00000000-0000-0000-0000-000000000000',
   'authenticated', 'authenticated', 'admin@test.local',
   crypt('password123', gen_salt('bf')), now(), now(), now(),
   '{"provider":"email","providers":["email"]}'::jsonb,
   '{"full_name":"Admin User"}'::jsonb, false, ''),
  ('22222222-2222-2222-2222-222222222222'::uuid, '00000000-0000-0000-0000-000000000000',
   'authenticated', 'authenticated', 'alice@test.local',
   crypt('password123', gen_salt('bf')), now(), now(), now(),
   '{"provider":"email","providers":["email"]}'::jsonb,
   '{"full_name":"Alice"}'::jsonb, false, ''),
  ('33333333-3333-3333-3333-333333333333'::uuid, '00000000-0000-0000-0000-000000000000',
   'authenticated', 'authenticated', 'bob@test.local',
   crypt('password123', gen_salt('bf')), now(), now(), now(),
   '{"provider":"email","providers":["email"]}'::jsonb,
   '{"full_name":"Bob"}'::jsonb, false, '')
ON CONFLICT (id) DO NOTHING;

-- handle_new_user trigger should have created profile + 'user' role rows.
-- Promote admin manually.
INSERT INTO public.user_roles (user_id, role)
VALUES ('11111111-1111-1111-1111-111111111111'::uuid, 'admin')
ON CONFLICT DO NOTHING;

-- Sample cases
INSERT INTO public.investigation_cases (id, case_number, case_name, created_by, status)
VALUES
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'::uuid, 'CASE-2025-001',
   'Alice Case A', '22222222-2222-2222-2222-222222222222'::uuid, 'active'),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'::uuid, 'CASE-2025-002',
   'Bob Case B',   '33333333-3333-3333-3333-333333333333'::uuid, 'active')
ON CONFLICT (id) DO NOTHING;

\echo '=== SETUP complete ==='
