-- =====================================================================
-- 06_rls_analysis_results.sql
-- =====================================================================
\echo '=== TEST: RLS analysis_results ==='
BEGIN;
SELECT public._test_logout();
INSERT INTO public.analysis_results (id, case_id, target, analysis_type)
VALUES
  ('ffffffff-ffff-ffff-ffff-ffffffffff01'::uuid,
   'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'::uuid, 'kw1', 'keyword'),
  ('ffffffff-ffff-ffff-ffff-ffffffffff02'::uuid,
   'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'::uuid, 'kw2', 'keyword');

SELECT public._test_login('22222222-2222-2222-2222-222222222222'::uuid);

SELECT public._test_assert(
  (SELECT count(*) FROM public.analysis_results
   WHERE id = 'ffffffff-ffff-ffff-ffff-ffffffffff01'::uuid) = 1,
  'analysis_results: alice sees own case');

SELECT public._test_assert(
  (SELECT count(*) FROM public.analysis_results
   WHERE id = 'ffffffff-ffff-ffff-ffff-ffffffffff02'::uuid) = 0,
  'analysis_results: alice cannot see bob''s');

-- DELETE allowed in own case
DELETE FROM public.analysis_results
 WHERE id = 'ffffffff-ffff-ffff-ffff-ffffffffff01'::uuid;
SELECT public._test_assert(
  (SELECT count(*) FROM public.analysis_results
   WHERE id = 'ffffffff-ffff-ffff-ffff-ffffffffff01'::uuid) = 0,
  'analysis_results: alice can delete in her own case');

ROLLBACK;
\echo '=== TEST: analysis_results PASSED ==='
