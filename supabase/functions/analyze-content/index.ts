import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
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

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    // Format posts and comments for analysis
    const formattedPosts = posts.slice(0, 10).map((p, idx) => 
      `POST${idx + 1}: ${p.title} ${p.selftext}`.slice(0, 500)
    );
    const formattedComments = comments.slice(0, 15).map((c, idx) => 
      `COMMENT${idx + 1}: ${c.body}`.slice(0, 300)
    );

    console.log('Calling Lovable AI for sentiment analysis...');

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
            content: `Analyze sentiment for each post and comment. Return ONLY valid JSON with NO markdown formatting.

CRITICAL: You must analyze EVERY post and comment individually and include them ALL in the arrays.

LOCATION EXTRACTION: Carefully scan ALL text for ANY location mentions including:
- Cities, states, countries, regions (e.g., "New York", "California", "UK", "Europe")
- Neighborhoods, districts, landmarks (e.g., "Brooklyn", "Silicon Valley", "Times Square")
- Location-related phrases (e.g., "I live in...", "from...", "moved to...", "visiting...", "here in...")
- Subreddit location references (e.g., if posting in r/nyc, r/london, r/australia)
- Timezone references (e.g., "EST", "PST", "GMT")
- Weather/climate references that indicate location
- Local events, sports teams, or businesses that indicate location
If no locations found, return ["No specific locations detected"]

Required format:
{
  "postSentiments": [{"text": "first 100 chars", "sentiment": "positive/negative/neutral", "explanation": "XAI reason"}],
  "commentSentiments": [{"text": "first 100 chars", "sentiment": "positive/negative/neutral", "explanation": "XAI reason"}],
  "sentiment": {
    "postBreakdown": {"positive": 0.0-1.0, "negative": 0.0-1.0, "neutral": 0.0-1.0},
    "commentBreakdown": {"positive": 0.0-1.0, "negative": 0.0-1.0, "neutral": 0.0-1.0}
  },
  "locations": ["City, Country", "Region", "etc"],
  "patterns": {"topicInterests": ["topic1", "topic2"]}
}`
          },
          {
            role: 'user',
            content: `POSTS:\n${formattedPosts.join('\n\n')}\n\nCOMMENTS:\n${formattedComments.join('\n\n')}`
          }
        ],
        temperature: 0.3,
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
    console.log('AI response preview:', aiContent.slice(0, 500));
    
    // Extract JSON from markdown code blocks if present
    let analysisResult;
    try {
      const jsonMatch = aiContent.match(/```json\n([\s\S]*?)\n```/) || aiContent.match(/```\n([\s\S]*?)\n```/);
      const jsonStr = jsonMatch ? jsonMatch[1] : aiContent.trim();
      analysisResult = JSON.parse(jsonStr);
      
      // Ensure all required fields exist
      if (!analysisResult.postSentiments) analysisResult.postSentiments = [];
      if (!analysisResult.commentSentiments) analysisResult.commentSentiments = [];
      if (!analysisResult.sentiment) {
        analysisResult.sentiment = {
          postBreakdown: { positive: 0.33, negative: 0.33, neutral: 0.34 },
          commentBreakdown: { positive: 0.33, negative: 0.33, neutral: 0.34 }
        };
      }
      if (!analysisResult.sentiment.postBreakdown) {
        analysisResult.sentiment.postBreakdown = { positive: 0.33, negative: 0.33, neutral: 0.34 };
      }
      if (!analysisResult.sentiment.commentBreakdown) {
        analysisResult.sentiment.commentBreakdown = { positive: 0.33, negative: 0.33, neutral: 0.34 };
      }
      if (!analysisResult.locations) analysisResult.locations = [];
      if (!analysisResult.patterns) {
        analysisResult.patterns = { topicInterests: ['Unable to analyze'] };
      }
      
      console.log(`Parsed ${analysisResult.postSentiments.length} post sentiments and ${analysisResult.commentSentiments.length} comment sentiments`);
    } catch (parseError) {
      console.error('Failed to parse AI response:', parseError);
      console.error('Raw AI content:', aiContent);
      analysisResult = {
        postSentiments: [],
        commentSentiments: [],
        sentiment: {
          postBreakdown: { positive: 0.33, negative: 0.33, neutral: 0.34 },
          commentBreakdown: { positive: 0.33, negative: 0.33, neutral: 0.34 }
        },
        locations: ['Unable to extract locations'],
        patterns: { topicInterests: ['Unable to analyze patterns'] }
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
      sentiment: analysisResult.sentiment,
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
