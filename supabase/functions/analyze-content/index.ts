import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface AnalysisRequest {
  posts: Array<{ title: string; selftext: string; subreddit?: string }>;
  comments: Array<{ body: string; subreddit?: string }>;
}

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

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { posts, comments }: AnalysisRequest = await req.json();
    console.log(`Analyzing ${posts.length} posts and ${comments.length} comments`);

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    // Format posts - include title AND body for accurate sentiment analysis
    const postsToAnalyze = posts.slice(0, 40);
    const formattedPosts = postsToAnalyze.map((p, idx) => {
      const title = (p.title || '').replace(/[^\x20-\x7E]/g, ' ').slice(0, 200);
      const body = (p.selftext || '').replace(/[^\x20-\x7E]/g, ' ').slice(0, 500);
      // Always include both title and body sections so the AI sees the full content
      return `POST${idx + 1}: TITLE: ${title} | BODY: ${body || '(no body text)'}`;
    });
    const formattedComments = comments.slice(0, 15).map((c, idx) => 
      `COMMENT${idx + 1}: ${(c.body || '').replace(/[^\x20-\x7E]/g, ' ').slice(0, 200)}`
    );

    const postsWithBody = postsToAnalyze.filter(p => p.selftext && p.selftext.trim().length > 0).length;
    console.log(`Sending ${formattedPosts.length} posts for analysis (${postsWithBody} have body text)`);

    // Analyze sentiment using Lovable AI
    const analysisResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          {
            role: 'system',
            content: `You are a sentiment analyzer. Return ONLY raw valid JSON. NO markdown, NO code blocks, NO backticks.

CRITICAL RULES:
1. Analyze EVERY post individually in the EXACT ORDER given (POST1, POST2, ...).
2. Base your sentiment on the FULL CONTENT of each post (both title and body text), not just the title.
3. The postSentiments array MUST have exactly the same count as posts provided, in the same order.
4. Use ONLY ASCII characters in your response. No emojis, no special unicode.
5. Keep explanations short (under 30 words) but reference the actual content.

Required JSON format:
{
  "postSentiments": [{"index": 1, "sentiment": "positive|negative|neutral", "explanation": "short reason based on full content"}],
  "commentSentiments": [{"index": 1, "sentiment": "positive|negative|neutral", "explanation": "short reason"}],
  "locations": ["location1"],
  "patterns": {"topicInterests": ["topic1"]}
}`
          },
          {
            role: 'user',
            content: `Analyze these ${formattedPosts.length} posts:\n${formattedPosts.join('\n')}\n\n${formattedComments.length > 0 ? `And these comments:\n${formattedComments.join('\n')}` : ''}`
          }
        ],
        temperature: 0.1,
      }),
    });

    if (!analysisResponse.ok) {
      const errorText = await analysisResponse.text();
      console.error('Lovable AI error:', errorText);
      
      if (analysisResponse.status === 429) {
        return new Response(JSON.stringify({ 
          error: 'rate_limit',
          message: 'Rate limit exceeded. Please try again later.'
        }), {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      
      if (analysisResponse.status === 402) {
        return new Response(JSON.stringify({ 
          error: 'payment_required',
          message: 'AI credits exhausted. Please add credits to continue.'
        }), {
          status: 402,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      
      throw new Error('Failed to analyze content');
    }

    const aiResponse = await analysisResponse.json();
    console.log('AI analysis completed');

    // Parse the AI response
    const aiContent = aiResponse.choices[0].message.content;
    console.log('AI response length:', aiContent.length);
    
    let analysisResult;
    try {
      // Strip markdown code blocks if present
      let jsonStr = aiContent.trim();
      const jsonMatch = jsonStr.match(/```(?:json)?\s*\n?([\s\S]*?)\n?\s*```/);
      if (jsonMatch) jsonStr = jsonMatch[1].trim();
      
      // Remove any non-ASCII chars that could break JSON
      jsonStr = jsonStr.replace(/[^\x20-\x7E\n\r\t]/g, ' ');
      
      analysisResult = JSON.parse(jsonStr);
      
      if (!analysisResult.postSentiments) analysisResult.postSentiments = [];
      if (!analysisResult.commentSentiments) analysisResult.commentSentiments = [];
      if (!analysisResult.locations) analysisResult.locations = [];
      if (!analysisResult.patterns) analysisResult.patterns = { topicInterests: [] };
      
      // Map index-based sentiments back to include post titles
      analysisResult.postSentiments = analysisResult.postSentiments.map((s: any, idx: number) => ({
        index: s.index || idx + 1,
        sentiment: s.sentiment || 'neutral',
        explanation: s.explanation || '',
        text: postsToAnalyze[s.index ? s.index - 1 : idx]?.title || s.text || '',
      }));
      
      console.log(`Parsed ${analysisResult.postSentiments.length} post sentiments`);
    } catch (parseError) {
      console.error('Failed to parse AI response:', parseError);
      console.error('Raw AI content (first 1000):', aiContent.slice(0, 1000));
      analysisResult = {
        postSentiments: [],
        commentSentiments: [],
        locations: [],
        patterns: { topicInterests: [] }
      };
    }

    // Calculate additional statistics
    const subredditActivity = [...posts, ...comments].reduce((acc: any, item: any) => {
      const sub = item.subreddit;
      if (sub) {
        acc[sub] = (acc[sub] || 0) + 1;
      }
      return acc;
    }, {});

    const topSubreddits = Object.entries(subredditActivity)
      .sort(([, a]: any, [, b]: any) => b - a)
      .slice(0, 5)
      .map(([name, count]) => ({ name, count }));

    return new Response(JSON.stringify({
      postSentiments: analysisResult.postSentiments || [],
      commentSentiments: analysisResult.commentSentiments || [],
      sentiment: {
        postBreakdown: calcBreakdown(analysisResult.postSentiments || []),
        commentBreakdown: calcBreakdown(analysisResult.commentSentiments || []),
      },
      emotions: analysisResult.emotions,
      locations: analysisResult.locations,
      patterns: analysisResult.patterns,
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
    console.error('Error in analyze-content:', error);
    return new Response(JSON.stringify({ 
      error: 'internal_error',
      message: error instanceof Error ? error.message : 'Unknown error occurred' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
