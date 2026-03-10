

# Create `analyze-offline` Edge Function

## Problem
`analyze-content` fails locally because `LOVABLE_API_KEY` is a Cloud-only secret. Your Python model server is running at `http://127.0.0.1:5000` (also `http://192.168.0.107:5000`) with a `/predict` endpoint that already returns the correct response shape.

## Plan

### 1. Create `supabase/functions/analyze-offline/index.ts`
A copy of `analyze-content` but instead of calling the Lovable AI gateway, it calls your local Python model server at `http://host.docker.internal:5000/predict`.

Key differences from `analyze-content`:
- No `LOVABLE_API_KEY` check
- Sends `{ posts, comments }` directly to `http://host.docker.internal:5000/predict`
- The Python `/predict` endpoint already returns `{ postSentiments, commentSentiments, sentiment, locations, patterns }` — we pass it through and add `topSubreddits` + `stats`
- If `host.docker.internal` doesn't resolve (some Windows setups), we'll add a fallback to `http://localhost:5000/predict`

Note: `host.docker.internal` is used because Supabase CLI runs edge functions inside Docker. This hostname resolves to the host machine where your Flask server runs. If that fails, the function will also try `localhost`.

### 2. Add to `supabase/config.toml`
```toml
[functions.analyze-offline]
verify_jwt = false
```

### 3. Update frontend calls
Change `supabase.functions.invoke('analyze-content', ...)` to `supabase.functions.invoke('analyze-offline', ...)` in:
- `src/pages/UserProfiling.tsx` (line 254)
- `src/pages/Analysis.tsx` (lines 282, 397)

### Files changed
| File | Action |
|---|---|
| `supabase/functions/analyze-offline/index.ts` | Create new |
| `supabase/config.toml` | Add function entry |
| `src/pages/UserProfiling.tsx` | Change invoke target |
| `src/pages/Analysis.tsx` | Change invoke target |

