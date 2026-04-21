-- =====================================================================
-- 03_rls_reddit_posts.sql
-- =====================================================================
\echo '=== TEST: RLS reddit_posts ==='
BEGIN;

-- Seed (as service role / postgres)
SELECT public._test_logout();
INSERT INTO public.reddit_posts (id, case_id, author, title)
VALUES
  ('cccccccc-cccc-cccc-cccc-cccccccccc01'::uuid,
   'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'::uuid, 'u/post_alice', 'Alice post'),
  ('cccccccc-cccc-cccc-cccc-cccccccccc02'::uuid,
   'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'::uuid, 'u/post_bob',   'Bob post');

-- Alice
SELECT public._test_login('22222222-2222-2222-2222-222222222222'::uuid);

SELECT public._test_assert(
  (SELECT count(*) FROM public.reddit_posts
   WHERE id = 'cccccccc-cccc-cccc-cccc-cccccccccc01'::uuid) = 1,
  'posts: alice sees post in her case');

SELECT public._test_assert(
  (SELECT count(*) FROM public.reddit_posts
   WHERE id = 'cccccccc-cccc-cccc-cccc-cccccccccc02'::uuid) = 0,
  'posts: alice cannot see post in bob''s case');

-- Insert into own case OK
INSERT INTO public.reddit_posts (case_id, author, title)
VALUES ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'::uuid, 'u/x', 'new');
SELECT public._test_assert(true, 'posts: alice can insert into her case');

-- Insert into bob's case rejected
DO $$
BEGIN
  BEGIN
    INSERT INTO public.reddit_posts (case_id, author, title)
    VALUES ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'::uuid, 'u/y', 'evil');
    PERFORM public._test_assert(false, 'posts: insert into other case should fail');
  EXCEPTION WHEN insufficient_privilege OR check_violation THEN
    PERFORM public._test_assert(true,
      'posts: alice cannot insert into bob''s case');
  END;
END $$;

-- Admin sees all
SELECT public._test_login('11111111-1111-1111-1111-111111111111'::uuid);
SELECT public._test_assert(
  (SELECT count(*) FROM public.reddit_posts
   WHERE id IN ('cccccccc-cccc-cccc-cccc-cccccccccc01'::uuid,
                'cccccccc-cccc-cccc-cccc-cccccccccc02'::uuid)) = 2,
  'posts: admin sees all posts');

ROLLBACK;
\echo '=== TEST: reddit_posts PASSED ==='
