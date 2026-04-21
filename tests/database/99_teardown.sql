-- =====================================================================
-- 99_teardown.sql — remove all fixtures
-- =====================================================================
\echo '=== TEARDOWN ==='

-- Cascade-friendly cleanup
DELETE FROM public.investigation_cases
 WHERE id IN ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'::uuid,
              'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'::uuid);

DELETE FROM public.user_roles
 WHERE user_id IN ('11111111-1111-1111-1111-111111111111'::uuid,
                   '22222222-2222-2222-2222-222222222222'::uuid,
                   '33333333-3333-3333-3333-333333333333'::uuid);

DELETE FROM public.profiles
 WHERE id IN ('11111111-1111-1111-1111-111111111111'::uuid,
              '22222222-2222-2222-2222-222222222222'::uuid,
              '33333333-3333-3333-3333-333333333333'::uuid);

DELETE FROM auth.users
 WHERE id IN ('11111111-1111-1111-1111-111111111111'::uuid,
              '22222222-2222-2222-2222-222222222222'::uuid,
              '33333333-3333-3333-3333-333333333333'::uuid);

DROP FUNCTION IF EXISTS public._test_assert(boolean, text);
DROP FUNCTION IF EXISTS public._test_login(uuid);
DROP FUNCTION IF EXISTS public._test_logout();

\echo '=== TEARDOWN complete ==='
