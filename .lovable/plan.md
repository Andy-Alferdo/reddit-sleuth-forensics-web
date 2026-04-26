# Old Reddit Fallback for Hidden Profiles

## The real problem

What you're seeing on the screen ("likes to keep their posts hidden") is **not** a private account — Reddit doesn't have truly private profiles. It's a profile preference where the user has disabled "show this profile in search/listings". When that's on:

- `oauth.reddit.com/user/{name}/about` still returns the profile (so we don't get a 404)
- `oauth.reddit.com/user/{name}/submitted` and `/comments` return **empty arrays** (zero posts, zero comments)

That's why your scrape "succeeds" but yields 0 posts. Meanwhile `old.reddit.com/user/{name}.json` and `www.reddit.com/user/{name}/submitted/.json` (the public unauthenticated endpoints) often still return the data, because they bypass the newer profile-hiding flag.

## Fix: automatic fallback in the reddit-scraper edge function

Only one file changes: `supabase/functions/reddit-scraper/index.ts`, inside the `type === 'user'` branch.

### Step 1 — Detect the "hidden" case

After fetching posts and comments via OAuth, check:

```
if (posts.length === 0 && comments.length === 0)
```

If both are empty *and* the `about` call succeeded (so the user actually exists), trigger the fallback. We don't fall back when the user genuinely just has no activity, because the fallback will also return empty in that case — so it's safe to always try.

### Step 2 — Fallback fetch from old.reddit / www.reddit (no auth)

Call the public JSON endpoints with a browser-like User-Agent (Reddit blocks default UAs):

```
https://old.reddit.com/user/{username}/submitted.json?limit=100&raw_json=1
https://old.reddit.com/user/{username}/comments.json?limit=100&raw_json=1
```

Headers:
```
User-Agent: Mozilla/5.0 (compatible; IntelReddit/1.0)
Accept: application/json
```

If `old.reddit.com` returns 429 / 403 / empty, retry once against `www.reddit.com/user/{username}/submitted/.json` (same shape). Both return the same `{ data: { children: [{ data: {...} }] } }` structure as the OAuth endpoints, so the existing `.map((child) => child.data)` parsing works unchanged.

### Step 3 — Tag the source so we can tell where data came from

Annotate each post/comment from the fallback with `_source: 'old_reddit'` (and `'oauth'` for the primary path). The frontend can ignore this, or later display a small "data via public Reddit" badge — your call.

### Step 4 — Logging & response shape

- Log: `OAuth returned 0 items for {user}, falling back to old.reddit`
- Log: `old.reddit fallback returned {n} posts, {m} comments`
- Add a top-level `dataSource: 'oauth' | 'old_reddit' | 'mixed'` field to the response so the UI can know.
- Response shape and the `RedditPost` / `RedditComment` types stay identical — all downstream code (UserProfiling, Monitoring, Analysis, persistence to `reddit_posts` / `reddit_comments`) keeps working without changes.

### Step 5 — Apply same fallback to monitoring

`MonitoringContext` calls the same edge function with `type: 'user'`, so it inherits the fallback automatically — nothing to wire up there.

## What does NOT change

- No frontend changes required.
- No database changes required.
- No new secrets — old.reddit public JSON endpoints are unauthenticated.
- Subreddit / keyword search paths are untouched (they don't have this hidden-profile problem).

## Caveats to be aware of

- Reddit rate-limits unauthenticated requests fairly aggressively (~10/min per IP). For monitoring loops scraping many users every 15s this could hit limits. We mitigate by **only** falling back when OAuth returns empty, not on every call.
- If a user truly has zero activity, the fallback also returns empty — that's fine and indistinguishable from the truly-hidden case, but harmless.
- If both OAuth and old.reddit return empty, we return the same empty result we do today (no behavior change for that edge case).

## Files Changed

- `supabase/functions/reddit-scraper/index.ts` — add fallback logic in the `type === 'user'` branch
