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

    // Combine all text content for analysis
    const allText = [
      ...posts.map(p => `${p.title} ${p.selftext}`),
      ...comments.map(c => c.body)
    ].join('\n\n');

    // Prepare content for analysis (limit to avoid token limits)
    const contentSample = allText.slice(0, 15000);

    console.log('Calling Lovable AI for sentiment and location analysis...');

    // Analyze sentiment and extract locations using Lovable AI
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
            content: `You are an expert at analyzing Reddit user behavior. Analyze the provided posts and comments to determine:
1. Per-item sentiment analysis with explanations for each post and comment
2. Overall sentiment breakdown
3. Primary emotions detected (joy, anger, sadness, fear, surprise)
4. Location indicators (cities, countries, regions mentioned in content)
5. Behavioral patterns (posting frequency, interaction style, topics of interest)

Respond ONLY with a valid JSON object in this exact format:
{
  "postSentiments": [
    {
      "text": "truncated post text (first 100 chars)",
      "sentiment": "positive|negative|neutral",
      "explanation": "brief reason why it has this sentiment"
    }
  ],
  "commentSentiments": [
    {
      "text": "truncated comment text (first 100 chars)",
      "sentiment": "positive|negative|neutral",
      "explanation": "brief reason why it has this sentiment"
    }
  ],
  "sentiment": {
    "overall": "positive|negative|neutral",
    "score": 0.0-1.0,
    "breakdown": {
      "positive": 0.0-1.0,
      "negative": 0.0-1.0,
      "neutral": 0.0-1.0
    },
    "postBreakdown": {
      "positive": 0.0-1.0,
      "negative": 0.0-1.0,
      "neutral": 0.0-1.0
    },
    "commentBreakdown": {
      "positive": 0.0-1.0,
      "negative": 0.0-1.0,
      "neutral": 0.0-1.0
    }
  },
  "emotions": {
    "primary": "joy|anger|sadness|fear|surprise|neutral",
    "scores": {
      "joy": 0.0-1.0,
      "anger": 0.0-1.0,
      "sadness": 0.0-1.0
    }
  },
  "locations": ["city/country1", "city/country2"],
  "patterns": {
    "topicInterests": ["topic1", "topic2", "topic3"],
    "communicationStyle": "brief description",
    "activityLevel": "high|medium|low"
  }
}`
          },
          {
            role: 'user',
            content: `Analyze this Reddit user's content (${posts.length} posts, ${comments.length} comments):\n\n${contentSample}`
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
    
    // Extract JSON from markdown code blocks if present
    let analysisResult;
    try {
      const jsonMatch = aiContent.match(/```json\n([\s\S]*?)\n```/) || aiContent.match(/```\n([\s\S]*?)\n```/);
      const jsonStr = jsonMatch ? jsonMatch[1] : aiContent;
      analysisResult = JSON.parse(jsonStr);
    } catch (parseError) {
      console.error('Failed to parse AI response:', parseError);
      // Fallback to basic analysis
      analysisResult = {
        postSentiments: [],
        commentSentiments: [],
        sentiment: {
          overall: 'neutral',
          score: 0.5,
          breakdown: { positive: 0.33, negative: 0.33, neutral: 0.34 },
          postBreakdown: { positive: 0.33, negative: 0.33, neutral: 0.34 },
          commentBreakdown: { positive: 0.33, negative: 0.33, neutral: 0.34 }
        },
        emotions: {
          primary: 'neutral',
          scores: { joy: 0.33, anger: 0.33, sadness: 0.34 }
        },
        locations: [],
        patterns: {
          topicInterests: [],
          communicationStyle: 'Analysis unavailable',
          activityLevel: 'medium'
        }
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
