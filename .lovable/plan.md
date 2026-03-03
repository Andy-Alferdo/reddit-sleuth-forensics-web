

## Fix: Behavior Patterns Empty in Local User Profiling

### Problem
The deployed (Lovable) version uses Gemini AI which analyzes posts/comments and returns `patterns.topicInterests` -- a list of topics the user is interested in based on their content. Your local Python model server only handles sentiment analysis and location extraction. It does **not** return any `patterns` data, so the edge function falls back to a near-empty default like `["General Reddit Activity"]`.

### Solution
Extract topic interests directly in the local `analyze-content` edge function by analyzing the subreddit names and post titles from the input data. This doesn't require any AI -- we can derive meaningful behavior patterns from:
1. **Top subreddits** the user is active in (these ARE their interests)
2. **Recurring keywords** from post titles

### Changes to `supabase/functions/analyze-content/index.ts` (local version)

Add a `extractBehaviorPatterns` helper function that:
- Groups activity by subreddit and identifies the top ones
- Extracts common themes from post titles
- Returns an array of human-readable pattern strings like:
  - "Active in technology communities (r/programming, r/webdev)"
  - "Frequently discusses gaming topics"
  - "Posts primarily in discussion-based subreddits"

Then in the response, replace the pass-through of `analysisResult.patterns` with:
```typescript
patterns: {
  topicInterests: extractBehaviorPatterns(posts, comments)
}
```

### Helper Function Logic
```text
1. Count subreddit frequency from posts + comments
2. Group subreddits into categories (tech, gaming, news, etc.) using simple keyword matching
3. Generate descriptive strings like:
   - "Most active in: r/sub1, r/sub2, r/sub3"
   - "Primary interest areas: Technology, Gaming"
   - "Posting frequency: X posts, Y comments"
   - "Engagement style: [commenter/poster/balanced]"
4. Return array of 3-6 pattern strings
```

### No Python Server Changes Needed
This is purely a TypeScript-side computation using the input data that's already available in the edge function.
