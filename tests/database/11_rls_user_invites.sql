-- =====================================================================
-- 11_rls_user_invites.sql
-- =====================================================================
\echo '=== TEST: RLS user_invites ==='
BEGIN;

SELECT public._test_logout();
INSERT INTO public.user_invites (id, email, invite_token, expires_at, role)
VALUES
  ('55555555-5555-5555-5555-555555555501'::uuid, 'valid@x.com',
   'tok_valid_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
   now() + interval '1 day', 'user'),
  ('55555555-5555-5555-5555-555555555502'::uuid, 'expired@x.com',
   'tok_expired_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
   now() - interval '1 day', 'user');

-- Alice (non-admin) can read VALID invite
SELECT public._test_login('22222222-2222-2222-2222-222222222222'::uuid);
SELECT public._test_assert(
  (SELECT count(*) FROM public.user_invites
   WHERE id = '55555555-5555-5555-5555-555555555501'::uuid) = 1,
  'invites: anyone can read a valid invite');

SELECT public._test_assert(
  (SELECT count(*) FROM public.user_invites
   WHERE id = '55555555-5555-5555-5555-555555555502'::uuid) = 0,
  'invites: expired invite is hidden');

-- Alice cannot INSERT
DO $$
BEGIN
  BEGIN
    INSERT INTO public.user_invites (email, invite_token, expires_at, role)
    VALUES ('hack@x.com', 'tok_hack', now() + interval '1 day', 'admin');
    PERFORM public._test_assert(false, 'should have been blocked');
  EXCEPTION WHEN insufficient_privilege OR check_violation THEN
    PERFORM public._test_assert(true,
      'invites: non-admin cannot create invites');
  END;
END $$;

-- Admin manages everything
SELECT public._test_login('11111111-1111-1111-1111-111111111111'::uuid);
SELECT public._test_assert(
  (SELECT count(*) FROM public.user_invites
   WHERE id IN ('55555555-5555-5555-5555-555555555501'::uuid,
                '55555555-5555-5555-5555-555555555502'::uuid)) = 2,
  'invites: admin sees all invites including expired');

INSERT INTO public.user_invites (email, invite_token, expires_at, role)
VALUES ('admin_made@x.com',
        'tok_admin_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
        now() + interval '1 day', 'user');
SELECT public._test_assert(true, 'invites: admin can insert');

ROLLBACK;
\echo '=== TEST: user_invites PASSED ==='
