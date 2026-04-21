-- =====================================================================
-- 09_rls_audit_logs.sql
-- =====================================================================
\echo '=== TEST: RLS audit_logs ==='
BEGIN;

-- Seed two logs (one per user)
SELECT public._test_logout();
INSERT INTO public.audit_logs (id, user_id, action_type, resource_type)
VALUES
  ('66666666-6666-6666-6666-666666666601'::uuid,
   '22222222-2222-2222-2222-222222222222'::uuid, 'LOGIN', 'auth'),
  ('66666666-6666-6666-6666-666666666602'::uuid,
   '33333333-3333-3333-3333-333333333333'::uuid, 'LOGIN', 'auth');

-- Alice sees only own
SELECT public._test_login('22222222-2222-2222-2222-222222222222'::uuid);
SELECT public._test_assert(
  (SELECT count(*) FROM public.audit_logs
   WHERE id = '66666666-6666-6666-6666-666666666601'::uuid) = 1,
  'audit_logs: alice sees own log');
SELECT public._test_assert(
  (SELECT count(*) FROM public.audit_logs
   WHERE id = '66666666-6666-6666-6666-666666666602'::uuid) = 0,
  'audit_logs: alice cannot see bob''s log');

-- Anyone can INSERT (System policy = true)
INSERT INTO public.audit_logs (user_id, action_type, resource_type)
VALUES ('22222222-2222-2222-2222-222222222222'::uuid, 'TEST', 'x');
SELECT public._test_assert(true, 'audit_logs: insert allowed');

-- UPDATE forbidden (no policy exists)
DO $$
BEGIN
  BEGIN
    UPDATE public.audit_logs SET action_type = 'TAMPER'
     WHERE id = '66666666-6666-6666-6666-666666666601'::uuid;
    -- silent no-op or error; verify nothing changed
    PERFORM public._test_assert(
      (SELECT action_type FROM public.audit_logs
       WHERE id = '66666666-6666-6666-6666-666666666601'::uuid) = 'LOGIN',
      'audit_logs: UPDATE blocked (row unchanged)');
  EXCEPTION WHEN insufficient_privilege THEN
    PERFORM public._test_assert(true, 'audit_logs: UPDATE rejected');
  END;
END $$;

-- DELETE forbidden
DO $$
BEGIN
  BEGIN
    DELETE FROM public.audit_logs
     WHERE id = '66666666-6666-6666-6666-666666666601'::uuid;
    PERFORM public._test_assert(
      (SELECT count(*) FROM public.audit_logs
       WHERE id = '66666666-6666-6666-6666-666666666601'::uuid) = 1,
      'audit_logs: DELETE blocked (row still present)');
  EXCEPTION WHEN insufficient_privilege THEN
    PERFORM public._test_assert(true, 'audit_logs: DELETE rejected');
  END;
END $$;

-- Admin sees all
SELECT public._test_login('11111111-1111-1111-1111-111111111111'::uuid);
SELECT public._test_assert(
  (SELECT count(*) FROM public.audit_logs
   WHERE id IN ('66666666-6666-6666-6666-666666666601'::uuid,
                '66666666-6666-6666-6666-666666666602'::uuid)) = 2,
  'audit_logs: admin sees all logs');

ROLLBACK;
\echo '=== TEST: audit_logs PASSED ==='
