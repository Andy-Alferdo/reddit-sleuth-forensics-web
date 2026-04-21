-- =====================================================================
-- 04_rls_reddit_comments.sql
-- =====================================================================
\echo '=== TEST: RLS reddit_comments ==='
BEGIN;
SELECT public._test_logout();
INSERT INTO public.reddit_comments (id, case_id, author, body)
VALUES
  ('dddddddd-dddd-dddd-dddd-dddddddddd01'::uuid,
   'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'::uuid, 'u/cmt_a', 'alice cmt'),
  ('dddddddd-dddd-dddd-dddd-dddddddddd02'::uuid,
   'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'::uuid, 'u/cmt_b', 'bob cmt');

SELECT public._test_login('22222222-2222-2222-2222-222222222222'::uuid);

SELECT public._test_assert(
  (SELECT count(*) FROM public.reddit_comments
   WHERE id = 'dddddddd-dddd-dddd-dddd-dddddddddd01'::uuid) = 1,
  'comments: alice sees her case comment');

SELECT public._test_assert(
  (SELECT count(*) FROM public.reddit_comments
   WHERE id = 'dddddddd-dddd-dddd-dddd-dddddddddd02'::uuid) = 0,
  'comments: alice cannot see bob''s comment');

INSERT INTO public.reddit_comments (case_id, author, body)
VALUES ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'::uuid, 'u/x', 'ok');
SELECT public._test_assert(true, 'comments: alice can insert into her case');

DO $$
BEGIN
  BEGIN
    INSERT INTO public.reddit_comments (case_id, author, body)
    VALUES ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'::uuid, 'u/y', 'no');
    PERFORM public._test_assert(false, 'should have been blocked');
  EXCEPTION WHEN insufficient_privilege OR check_violation THEN
    PERFORM public._test_assert(true,
      'comments: alice cannot insert into bob''s case');
  END;
END $$;

ROLLBACK;
\echo '=== TEST: reddit_comments PASSED ==='
