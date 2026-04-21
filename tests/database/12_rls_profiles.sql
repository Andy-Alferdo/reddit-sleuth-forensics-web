-- =====================================================================
-- 12_rls_profiles.sql
-- =====================================================================
\echo '=== TEST: RLS profiles ==='
BEGIN;

SELECT public._test_login('22222222-2222-2222-2222-222222222222'::uuid);

SELECT public._test_assert(
  (SELECT count(*) FROM public.profiles
   WHERE id = '22222222-2222-2222-2222-222222222222'::uuid) = 1,
  'profiles: alice sees her own profile');

SELECT public._test_assert(
  (SELECT count(*) FROM public.profiles
   WHERE id = '33333333-3333-3333-3333-333333333333'::uuid) = 0,
  'profiles: alice cannot see bob''s profile');

-- UPDATE own
UPDATE public.profiles SET full_name = 'Alice Updated'
 WHERE id = '22222222-2222-2222-2222-222222222222'::uuid;
SELECT public._test_assert(
  (SELECT full_name FROM public.profiles
   WHERE id = '22222222-2222-2222-2222-222222222222'::uuid) = 'Alice Updated',
  'profiles: alice can update her own profile');

-- UPDATE other → silent no-op
UPDATE public.profiles SET full_name = 'Hacked'
 WHERE id = '33333333-3333-3333-3333-333333333333'::uuid;
SELECT public._test_login('11111111-1111-1111-1111-111111111111'::uuid);
SELECT public._test_assert(
  COALESCE((SELECT full_name FROM public.profiles
            WHERE id = '33333333-3333-3333-3333-333333333333'::uuid), '') <> 'Hacked',
  'profiles: alice cannot update bob''s profile');

-- Admin sees everyone
SELECT public._test_assert(
  (SELECT count(*) FROM public.profiles
   WHERE id IN ('11111111-1111-1111-1111-111111111111'::uuid,
                '22222222-2222-2222-2222-222222222222'::uuid,
                '33333333-3333-3333-3333-333333333333'::uuid)) = 3,
  'profiles: admin sees all profiles');

ROLLBACK;
\echo '=== TEST: profiles PASSED ==='
