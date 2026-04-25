ALTER TABLE public.reddit_posts
  ADD CONSTRAINT reddit_posts_case_post_unique UNIQUE (case_id, post_id);

ALTER TABLE public.reddit_comments
  ADD CONSTRAINT reddit_comments_case_comment_unique UNIQUE (case_id, comment_id);