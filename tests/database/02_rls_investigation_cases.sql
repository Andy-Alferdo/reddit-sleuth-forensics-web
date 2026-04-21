-- =====================================================================
-- 02_rls_investigation_cases.sql
-- =====================================================================
\echo '=== TEST: RLS investigation_cases ==='
BEGIN;

-- Alice sees her case, not Bob's
SELECT public._test_login('22222222-2222-2222-2222-222222222222'::uuid);

SELECT public._test_assert(
  (SELECT count(*) FROM public.investigation_cases
   WHERE id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'::uuid) = 1,
  'cases: alice sees her own case');

SELECT public._test_assert(
  (SELECT count(*) FROM public.investigation_cases
   WHERE id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'::uuid) = 0,
  'cases: alice cannot see bob''s case');

-- Alice can update her own case
UPDATE public.investigation_cases
   SET description = 'updated by alice'
 WHERE id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'::uuid;

SELECT public._test_assert(
  (SELECT description FROM public.investigation_cases
   WHERE id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'::uuid) = 'updated by alice',
  'cases: alice can update her own case');

-- Alice cannot update Bob's case (silent no-op under RLS)
UPDATE public.investigation_cases
   SET description = 'hacked'
 WHERE id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'::uuid;
-- Switch to bob to verify
SELECT public._test_login('33333333-3333-3333-3333-333333333333'::uuid);
SELECT public._test_assert(
  COALESCE((SELECT description FROM public.investigation_cases
            WHERE id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'::uuid), '') <> 'hacked',
  'cases: alice CANNOT update bob''s case');

-- Admin sees both
SELECT public._test_login('11111111-1111-1111-1111-111111111111'::uuid);
SELECT public._test_assert(
  (SELECT count(*) FROM public.investigation_cases
   WHERE id IN ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'::uuid,
                'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'::uuid)) = 2,
  'cases: admin sees all cases');

-- Insert: alice cannot create a case attributed to bob
SELECT public._test_login('22222222-2222-2222-2222-222222222222'::uuid);
DO $$
BEGIN
  BEGIN
    INSERT INTO public.investigation_cases (case_number, case_name, created_by)
    VALUES ('CASE-HACK','Spoofed','33333333-3333-3333-3333-333333333333'::uuid);
    PERFORM public._test_assert(false,
      'cases: alice cannot insert case as bob (expected RLS error)');
  EXCEPTION WHEN insufficient_privilege OR check_violation THEN
    PERFORM public._test_assert(true,
      'cases: alice cannot insert case as bob');
  END;
END $$;

SELECT public._test_logout();
ROLLBACK;
\echo '=== TEST: investigation_cases PASSED ==='
