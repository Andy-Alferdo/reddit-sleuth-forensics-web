-- =====================================================================
-- 05_rls_user_profiles_analyzed.sql
-- =====================================================================
\echo '=== TEST: RLS user_profiles_analyzed ==='
BEGIN;
SELECT public._test_logout();
INSERT INTO public.user_profiles_analyzed (id, case_id, username)
VALUES
  ('eeeeeeee-eeee-eeee-eeee-eeeeeeeeee01'::uuid,
   'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'::uuid, 'subjectA'),
  ('eeeeeeee-eeee-eeee-eeee-eeeeeeeeee02'::uuid,
   'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'::uuid, 'subjectB');

SELECT public._test_login('22222222-2222-2222-2222-222222222222'::uuid);

SELECT public._test_assert(
  (SELECT count(*) FROM public.user_profiles_analyzed
   WHERE id = 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeee01'::uuid) = 1,
  'profiles_analyzed: alice sees own case profile');

SELECT public._test_assert(
  (SELECT count(*) FROM public.user_profiles_analyzed
   WHERE id = 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeee02'::uuid) = 0,
  'profiles_analyzed: alice cannot see bob''s case profile');

-- Alice can DELETE in her own case
DELETE FROM public.user_profiles_analyzed
 WHERE id = 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeee01'::uuid;
SELECT public._test_assert(
  (SELECT count(*) FROM public.user_profiles_analyzed
   WHERE id = 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeee01'::uuid) = 0,
  'profiles_analyzed: alice can delete in her own case');

-- Alice cannot DELETE bob's row
DELETE FROM public.user_profiles_analyzed
 WHERE id = 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeee02'::uuid;
SELECT public._test_login('11111111-1111-1111-1111-111111111111'::uuid);
SELECT public._test_assert(
  (SELECT count(*) FROM public.user_profiles_analyzed
   WHERE id = 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeee02'::uuid) = 1,
  'profiles_analyzed: alice cannot delete bob''s row');

ROLLBACK;
\echo '=== TEST: user_profiles_analyzed PASSED ==='
