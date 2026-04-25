# Save All Posts & Comments to Database (Monitoring, User Profiling, All Analyses)

## Why posts & comments are 0 today

The `data-store` edge function already has `savePosts` and `saveComments` operations, **but no module in the app actually calls them**. On top of that, those operations use `onConflict: 'post_id'` / `'comment_id'` even though no UNIQUE constraint exists on those columns — so even if they were called, every insert would fail silently. That's why `reddit_posts` and `reddit_comments` always show 0.

## What gets saved (for every module)

For each module that fetches Reddit data, we extract every post and comment and persist them into `reddit_posts` / `reddit_comments`, tagged with `case_id` and a `metadata.source` field so we can tell which module brought the data in:

| Module | Source tag | What's saved |
|---|---|---|
| User Profiling | `user_profile` | All posts + comments fetched for the searched user |
| Monitoring | `monitoring` | All activities scraped per cycle for each watched target |
| Keyword Analysis | `keyword_analysis` | All posts/comments returned for the keyword |
| Community Analysis | `community_analysis` | All posts/comments fetched from the subreddit |
| Link Analysis | `link_analysis` | All posts/comments collected for the analyzed user |

Sentiment label + explanation, when available, are also stored on the row.

## Fix steps

### 1. Database migration — add unique constraints
Without these, upserts can never succeed. Composite keys so the same Reddit item can exist across different cases:

```sql
ALTER TABLE public.reddit_posts
  ADD CONSTRAINT reddit_posts_case_post_unique UNIQUE (case_id, post_id);

ALTER TABLE public.reddit_comments
  ADD CONSTRAINT reddit_comments_case_comment_unique UNIQUE (case_id, comment_id);
```

(Both tables are currently empty — no cleanup needed.)

### 2. Fix `supabase/functions/data-store/index.ts`
- Change the upsert conflict targets to `'case_id,post_id'` and `'case_id,comment_id'`.
- Drop `ignoreDuplicates: true` so `.select()` returns the inserted/updated rows for accurate counts.
- Filter out items missing an `id` before inserting.
- Accept an optional `source` field that gets merged into `metadata.source`.
- Return `{ inserted, errors }` so callers can detect failures.

### 3. Add a single shared saver in `InvestigationContext.tsx`
Add `saveRedditContentToDb(posts, comments, source)` that:
- No-ops if no current case.
- Calls `savePosts` + `saveComments` via `callDataStore` in parallel.
- Logs the real inserted counts and any errors returned by the edge function.

Expose it via the context so all modules can call it.

### 4. Wire it into each module

- **`src/pages/UserProfiling.tsx`** — right after Reddit fetch + analysis succeeds (where it currently logs "Saved posts and comments to database"), call `saveRedditContentToDb(redditData.posts, redditData.comments, 'user_profile')` and log the actual response.

- **`src/pages/Monitoring.tsx`** — after each scrape cycle that produces new activities for a target, split activities into posts vs comments and call the saver with source `'monitoring'`.

- **`src/pages/KeywordAnalysis.tsx`** — after results return, save with source `'keyword_analysis'`.

- **`src/pages/CommunityAnalysis.tsx`** — after results return, save with source `'community_analysis'`.

- **`src/pages/LinkAnalysis.tsx`** — after the user's posts/comments are aggregated for the graph, save with source `'link_analysis'`.

In each case, the call is fire-and-forget with proper error logging — it must not block UI rendering.

### 5. Better error visibility
Replace the existing optimistic `console.log("Saved posts and comments to database")` lines with logs that reflect the actual `inserted` count and surface any error from the edge function, so silent failures like the current one can't recur.

## Verification

1. Open any existing case, run a User Profiling search → check `reddit_posts` and `reddit_comments` row counts grow.
2. Start a Monitoring target and let one scrape cycle complete → rows grow with `metadata.source = 'monitoring'`.
3. Run Keyword / Community / Link analyses → rows grow with the matching source tags.
4. Re-running the same search does **not** duplicate rows (composite upsert dedupes by `case_id + post_id` / `comment_id`).

## Files Changed
- New SQL migration: two UNIQUE constraints
- `supabase/functions/data-store/index.ts` — fix savePosts/saveComments
- `src/contexts/InvestigationContext.tsx` — add `saveRedditContentToDb`
- `src/pages/UserProfiling.tsx`
- `src/pages/Monitoring.tsx`
- `src/pages/KeywordAnalysis.tsx`
- `src/pages/CommunityAnalysis.tsx`
- `src/pages/LinkAnalysis.tsx`
