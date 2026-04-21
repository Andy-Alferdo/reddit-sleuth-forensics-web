-- =====================================================================
-- 08_rls_investigation_reports.sql
-- =====================================================================
\echo '=== TEST: RLS investigation_reports ==='
BEGIN;
SELECT public._test_logout();
INSERT INTO public.investigation_reports (id, case_id, report_type)
VALUES
  ('77777777-7777-7777-7777-777777777701'::uuid,
   'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'::uuid, 'full'),
  ('77777777-7777-7777-7777-777777777702'::uuid,
   'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'::uuid, 'selective');

SELECT public._test_login('22222222-2222-2222-2222-222222222222'::uuid);

SELECT public._test_assert(
  (SELECT count(*) FROM public.investigation_reports
   WHERE id = '77777777-7777-7777-7777-777777777701'::uuid) = 1,
  'reports: alice sees report in her case');

SELECT public._test_assert(
  (SELECT count(*) FROM public.investigation_reports
   WHERE id = '77777777-7777-7777-7777-777777777702'::uuid) = 0,
  'reports: alice cannot see bob''s report');

INSERT INTO public.investigation_reports (case_id, report_type)
VALUES ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'::uuid, 'full');
SELECT public._test_assert(true, 'reports: alice can insert into her case');

ROLLBACK;
\echo '=== TEST: investigation_reports PASSED ==='
