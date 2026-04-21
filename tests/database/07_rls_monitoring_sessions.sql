-- =====================================================================
-- 07_rls_monitoring_sessions.sql
-- =====================================================================
\echo '=== TEST: RLS monitoring_sessions ==='
BEGIN;
SELECT public._test_logout();
INSERT INTO public.monitoring_sessions (id, case_id, target_name, search_type)
VALUES
  ('99999999-9999-9999-9999-999999999901'::uuid,
   'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'::uuid, 'targetA', 'user'),
  ('99999999-9999-9999-9999-999999999902'::uuid,
   'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'::uuid, 'targetB', 'user');

SELECT public._test_login('22222222-2222-2222-2222-222222222222'::uuid);

SELECT public._test_assert(
  (SELECT count(*) FROM public.monitoring_sessions
   WHERE id = '99999999-9999-9999-9999-999999999901'::uuid) = 1,
  'monitoring: alice sees session in her case');

SELECT public._test_assert(
  (SELECT count(*) FROM public.monitoring_sessions
   WHERE id = '99999999-9999-9999-9999-999999999902'::uuid) = 0,
  'monitoring: alice cannot see bob''s session');

INSERT INTO public.monitoring_sessions (case_id, target_name, search_type)
VALUES ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'::uuid, 'newTarget', 'community');
SELECT public._test_assert(true, 'monitoring: alice can insert into her case');

DO $$
BEGIN
  BEGIN
    INSERT INTO public.monitoring_sessions (case_id, target_name, search_type)
    VALUES ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'::uuid, 'x', 'user');
    PERFORM public._test_assert(false, 'expected block');
  EXCEPTION WHEN insufficient_privilege OR check_violation THEN
    PERFORM public._test_assert(true,
      'monitoring: alice cannot insert into bob''s case');
  END;
END $$;

ROLLBACK;
\echo '=== TEST: monitoring_sessions PASSED ==='
