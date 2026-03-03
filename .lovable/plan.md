

## Local Version of `analyze-content` Edge Function

### What Changes
Convert the deployed `analyze-content/index.ts` from using Lovable AI to using your local Python model server at `http://host.docker.internal:5000/predict`, while keeping all the helper functions (`calcBreakdown`, `extractBehaviorPatterns`, `SUBREDDIT_CATEGORIES`, `categorizeSubreddit`) exactly as they are.

### Specific Modifications

**Keep unchanged:**
- All imports, CORS headers, interfaces
- `SUBREDDIT_CATEGORIES` mapping
- `categorizeSubreddit()` function
- `extractBehaviorPatterns()` function
- `calcBreakdown()` function
- Activity stats calculation (topSubreddits, stats)
- Error handling structure
- Response shape

**Replace the AI call section (lines 128-265) with local Python server call:**
- Remove `LOVABLE_API_KEY` check
- Remove Lovable AI `fetch` call and response parsing
- Replace with a `fetch` to `http://host.docker.internal:5000/predict` sending `{ posts, comments }`
- Add connection error handling with a helpful message about running the Python server
- Parse the JSON response directly (no markdown extraction needed)

**Response remains identical** -- using `calcBreakdown()` on the Python server's `postSentiments`/`commentSentiments` arrays and `extractBehaviorPatterns()` for behavior patterns, so charts and patterns work correctly.

### Final Local Code Structure
```text
1. Imports, CORS, interfaces (unchanged)
2. SUBREDDIT_CATEGORIES (unchanged)
3. categorizeSubreddit() (unchanged)
4. extractBehaviorPatterns() (unchanged)
5. calcBreakdown() (unchanged)
6. serve() handler:
   a. CORS preflight (unchanged)
   b. Parse request (unchanged)
   c. NEW: fetch('http://host.docker.internal:5000/predict', { posts, comments })
   d. NEW: Simple JSON parse (no markdown extraction)
   e. Calculate topSubreddits (unchanged)
   f. Return response with calcBreakdown + extractBehaviorPatterns (unchanged)
```
