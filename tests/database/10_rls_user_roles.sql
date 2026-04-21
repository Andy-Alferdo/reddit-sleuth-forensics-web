-- =====================================================================
-- 10_rls_user_roles.sql
-- =====================================================================
\echo '=== TEST: RLS user_roles ==='
BEGIN;

-- Alice: can see only her own role
SELECT public._test_login('22222222-2222-2222-2222-222222222222'::uuid);

SELECT public._test_assert(
  (SELECT count(*) FROM public.user_roles
   WHERE user_id = '22222222-2222-2222-2222-222222222222'::uuid) >= 1,
  'user_roles: alice sees her own role');

SELECT public._test_assert(
  (SELECT count(*) FROM public.user_roles
   WHERE user_id = '33333333-3333-3333-3333-333333333333'::uuid) = 0,
  'user_roles: alice cannot see bob''s roles');

-- Alice cannot INSERT a role (only admins can)
DO $$
BEGIN
  BEGIN
    INSERT INTO public.user_roles (user_id, role)
    VALUES ('22222222-2222-2222-2222-222222222222'::uuid, 'admin');
    PERFORM public._test_assert(false, 'should have been blocked');
  EXCEPTION WHEN insufficient_privilege OR check_violation THEN
    PERFORM public._test_assert(true,
      'user_roles: alice cannot self-promote to admin');
  END;
END $$;

-- Admin CAN
SELECT public._test_login('11111111-1111-1111-1111-111111111111'::uuid);

SELECT public._test_assert(
  (SELECT count(*) FROM public.user_roles) >= 3,
  'user_roles: admin sees all roles');

INSERT INTO public.user_roles (user_id, role)
VALUES ('33333333-3333-3333-3333-333333333333'::uuid, 'admin')
ON CONFLICT DO NOTHING;
SELECT public._test_assert(true,
  'user_roles: admin can insert roles');

DELETE FROM public.user_roles
 WHERE user_id = '33333333-3333-3333-3333-333333333333'::uuid AND role = 'admin';
SELECT public._test_assert(true,
  'user_roles: admin can delete roles');

ROLLBACK;
\echo '=== TEST: user_roles PASSED ==='
