import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

interface AnalysisRequest {
  posts: Array<{ title: string; selftext: string; subreddit?: string }>;
  comments: Array<{ body: string; subreddit?: string }>;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { posts, comments }: AnalysisRequest = await req.json();
    console.log(`Analyzing ${posts.length} posts and ${comments.length} comments`);

    // Try multiple addresses to reach the host machine from Docker
    const urls = [
      'http://host.docker.internal:5000/predict',
      'http://localhost:5000/predict',
      'http://127.0.0.1:5000/predict',
    ];

    let localResponse: Response | null = null;
    let lastError: string = '';

    for (const url of urls) {
      try {
        console.log(`Trying ${url}...`);
        localResponse = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ posts, comments }),
        });
        if (localResponse.ok) {
          console.log(`Connected successfully via ${url}`);
          break;
        }
        lastError = `${url} returned ${localResponse.status}`;
        localResponse = null;
      } catch (e) {
        lastError = `${url}: ${e instanceof Error ? e.message : String(e)}`;
        localResponse = null;
      }
    }

    if (!localResponse) {
      console.error('Could not connect to local Python model server:', lastError);
      return new Response(JSON.stringify({
        error: 'local_model_error',
        message: `Could not connect to local Python model server on port 5000. Is it running? Last error: ${lastError}`
      }), {
        status: 503,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const localResult = await localResponse.json();
    console.log(`Parsed ${localResult.postSentiments?.length || 0} post sentiments and ${localResult.commentSentiments?.length || 0} comment sentiments`);

    // Calculate top subreddits
    const subredditActivity = [...posts, ...comments].reduce((acc: any, item: any) => {
      const sub = item.subreddit;
      if (sub) acc[sub] = (acc[sub] || 0) + 1;
      return acc;
    }, {});

    const topSubreddits = Object.entries(subredditActivity)
      .sort(([, a]: any, [, b]: any) => b - a)
      .slice(0, 5)
      .map(([name, count]) => ({ name, count }));

    return new Response(JSON.stringify({
      postSentiments: localResult.postSentiments || [],
      commentSentiments: localResult.commentSentiments || [],
      sentiment: localResult.sentiment || {
        postBreakdown: { positive: 0.33, negative: 0.33, neutral: 0.34 },
        commentBreakdown: { positive: 0.33, negative: 0.33, neutral: 0.34 },
      },
      locations: localResult.locations || [],
      patterns: localResult.patterns || { topicInterests: [] },
      topSubreddits,
      stats: {
        totalPosts: posts.length,
        totalComments: comments.length,
        totalActivity: posts.length + comments.length,
      }
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in analyze-offline:', error);
    return new Response(JSON.stringify({
      error: 'internal_error',
      message: error instanceof Error ? error.message : 'Unknown error occurred'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
