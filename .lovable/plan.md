

## Fix: Separate Post and Comment Sentiment Breakdowns in Local Edge Function

### Problem
The local `analyze-content` edge function passes `analysisResult.sentiment` directly from the Python server, which returns identical values for `postBreakdown` and `commentBreakdown`. The deployed Lovable version calculates these independently, which is why the charts differ online vs locally.

### Solution
Add a helper function in the edge function to compute breakdowns from the individual `postSentiments` and `commentSentiments` arrays, instead of relying on the Python server's combined output.

### Changes to `supabase/functions/analyze-content/index.ts`

1. Add a `calcBreakdown` helper function that counts positive/negative/neutral from an array of sentiment items and returns ratios.

2. Replace the direct pass-through of `analysisResult.sentiment` with computed breakdowns:

```typescript
function calcBreakdown(items: Array<{ sentiment: string }>) {
  if (!items || items.length === 0) {
    return { positive: 0.33, negative: 0.33, neutral: 0.34 };
  }
  const counts = { positive: 0, negative: 0, neutral: 0 };
  items.forEach(item => {
    const s = (item.sentiment || '').toLowerCase();
    if (s in counts) counts[s as keyof typeof counts]++;
    else counts.neutral++;
  });
  const total = items.length;
  return {
    positive: +(counts.positive / total).toFixed(2),
    negative: +(counts.negative / total).toFixed(2),
    neutral: +(counts.neutral / total).toFixed(2),
  };
}
```

3. In the response section (step 6), change:
```typescript
// BEFORE (broken - identical charts):
sentiment: analysisResult.sentiment || { ... }

// AFTER (correct - independent charts):
sentiment: {
  postBreakdown: calcBreakdown(analysisResult.postSentiments || []),
  commentBreakdown: calcBreakdown(analysisResult.commentSentiments || []),
}
```

### Why This Works
- The Python model server already returns individual `postSentiments` and `commentSentiments` arrays with per-item sentiment labels
- By counting these independently, posts and comments will naturally have different distributions
- This matches the behavior of the deployed Lovable version which uses the AI response's individual items to derive breakdowns

### No Other Files Change
This is a single-file fix to the local edge function only.

