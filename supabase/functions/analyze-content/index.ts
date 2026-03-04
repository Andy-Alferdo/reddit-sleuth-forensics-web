import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface AnalysisRequest {
  posts: Array<{ title: string; selftext: string; subreddit?: string }>;
  comments: Array<{ body: string; subreddit?: string }>;
}

const SUBREDDIT_CATEGORIES: Record<string, string[]> = {
  'Technology': ['programming', 'webdev', 'javascript', 'python', 'coding', 'learnprogramming', 'computerscience', 'tech', 'software', 'linux', 'android', 'apple', 'ios', 'devops', 'machinelearning', 'artificial', 'datascience', 'cybersecurity', 'netsec', 'sysadmin', 'typescript', 'reactjs', 'node', 'rust', 'golang', 'cpp', 'java', 'csharp', 'php', 'ruby', 'swift', 'kotlin'],
  'Gaming': ['gaming', 'games', 'pcgaming', 'ps5', 'xbox', 'nintendo', 'steam', 'valorant', 'leagueoflegends', 'minecraft', 'fortnite', 'genshinimpact', 'destinythegame', 'overwatch', 'apexlegends', 'csgo'],
  'News & Politics': ['news', 'worldnews', 'politics', 'geopolitics', 'economics', 'neutralpolitics', 'politicaldiscussion', 'conservative', 'liberal'],
  'Entertainment': ['movies', 'television', 'netflix', 'music', 'hiphopheads', 'popheads', 'anime', 'manga', 'books', 'comics', 'marvelstudios', 'starwars'],
  'Science & Education': ['science', 'askscience', 'space', 'physics', 'biology', 'chemistry', 'math', 'engineering', 'eli5', 'todayilearned', 'education'],
  'Sports': ['sports', 'nba', 'nfl', 'soccer', 'football', 'baseball', 'hockey', 'mma', 'boxing', 'tennis', 'formula1', 'cricket'],
  'Finance': ['finance', 'personalfinance', 'investing', 'stocks', 'wallstreetbets', 'cryptocurrency', 'bitcoin', 'ethereum', 'economics', 'financialindependence'],
  'Lifestyle': ['fitness', 'health', 'nutrition', 'cooking', 'food', 'travel', 'photography', 'fashion', 'diy', 'gardening', 'homeimprovement', 'cars', 'autos'],
  'Social & Discussion': ['askreddit', 'casualconversation', 'unpopularopinion', 'changemyview', 'showerthoughts', 'tifu', 'amitheasshole', 'relationship_advice', 'advice', 'nostupidquestions'],
  'Humor & Memes': ['funny', 'memes', 'dankmemes', 'jokes', 'comedyheaven', 'me_irl', 'wholesomememes'],
};

function categorizeSubreddit(sub: string): string | null {
  const lower = sub.toLowerCase();
  for (const [category, keywords] of Object.entries(SUBREDDIT_CATEGORIES)) {
    if (keywords.some(k => lower.includes(k) || k.includes(lower))) {
      return category;
    }
  }
  return null;
}

function extractBehaviorPatterns(
  posts: Array<{ title: string; selftext: string; subreddit?: string }>,
  comments: Array<{ body: string; subreddit?: string }>
): string[] {
  const patterns: string[] = [];

  // 1. Count subreddit frequency
  const subCounts: Record<string, number> = {};
  [...posts, ...comments].forEach((item: any) => {
    const sub = item.subreddit;
    if (sub) subCounts[sub] = (subCounts[sub] || 0) + 1;
  });

  const sortedSubs = Object.entries(subCounts)
    .sort(([, a], [, b]) => b - a);

  // 2. Top subreddits
  if (sortedSubs.length > 0) {
    const top = sortedSubs.slice(0, 5).map(([name]) => `r/${name}`);
    patterns.push(`Most active in: ${top.join(', ')}`);
  }

  // 3. Category grouping
  const categoryCounts: Record<string, number> = {};
  for (const [sub, count] of sortedSubs) {
    const cat = categorizeSubreddit(sub);
    if (cat) categoryCounts[cat] = (categoryCounts[cat] || 0) + count;
  }
  const topCategories = Object.entries(categoryCounts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 3)
    .map(([name]) => name);

  if (topCategories.length > 0) {
    patterns.push(`Primary interest areas: ${topCategories.join(', ')}`);
  } else if (sortedSubs.length > 0) {
    patterns.push('Interests span diverse topic areas');
  }

  // 4. Engagement style
  const postCount = posts.length;
  const commentCount = comments.length;
  patterns.push(`Posting frequency: ${postCount} posts, ${commentCount} comments`);

  if (commentCount > postCount * 3) {
    patterns.push('Engagement style: Primarily a commenter');
  } else if (postCount > commentCount * 2) {
    patterns.push('Engagement style: Primarily a content creator');
  } else {
    patterns.push('Engagement style: Balanced between posting and commenting');
  }

  // 5. Subreddit diversity
  const uniqueSubs = sortedSubs.length;
  if (uniqueSubs > 10) {
    patterns.push(`Active across ${uniqueSubs} different communities`);
  } else if (uniqueSubs > 3) {
    patterns.push(`Engages in ${uniqueSubs} communities`);
  } else if (uniqueSubs >= 1) {
    patterns.push('Focused activity in a small number of communities');
  }

  return patterns.length > 0 ? patterns : ['General Reddit Activity'];
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

    // Use Lovable AI for sentiment analysis
    let analysisResult: any = { postSentiments: [], commentSentiments: [], locations: [] };
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    
    if (!LOVABLE_API_KEY) {
      console.error('No LOVABLE_API_KEY configured');
    } else {
      try {
        const postTexts = posts.slice(0, 20).map((p, i) => `Post ${i+1}: ${p.title}${p.selftext ? ' - ' + p.selftext.slice(0, 200) : ''}`).join('\n');
        const commentTexts = comments.slice(0, 20).map((c, i) => `Comment ${i+1}: ${c.body.slice(0, 200)}`).join('\n');

        const prompt = `Analyze the sentiment of these Reddit posts and comments. For each item, classify as "positive", "negative", or "neutral" and provide a brief explanation.

Posts:
${postTexts || 'None'}

Comments:
${commentTexts || 'None'}

Respond in this exact JSON format:
{
  "postSentiments": [{"text": "post title/text snippet", "sentiment": "positive|negative|neutral", "explanation": "brief reason"}],
  "commentSentiments": [{"text": "comment text snippet", "sentiment": "positive|negative|neutral", "explanation": "brief reason"}],
  "locations": ["any location mentions found"]
}`;

        const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${LOVABLE_API_KEY}`,
          },
          body: JSON.stringify({
            model: 'google/gemini-2.5-flash',
            messages: [{ role: 'user', content: prompt }],
            temperature: 0.3,
          }),
        });

        if (aiResponse.ok) {
          const aiData = await aiResponse.json();
          const content = aiData.choices?.[0]?.message?.content || '';
          const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/) || [null, content];
          const jsonStr = (jsonMatch[1] || content).trim();
          
          try {
            analysisResult = JSON.parse(jsonStr);
            if (!analysisResult.postSentiments) analysisResult.postSentiments = [];
            if (!analysisResult.commentSentiments) analysisResult.commentSentiments = [];
            if (!analysisResult.locations) analysisResult.locations = [];
            console.log(`Lovable AI: ${analysisResult.postSentiments.length} post sentiments, ${analysisResult.commentSentiments.length} comment sentiments`);
          } catch (parseErr) {
            console.error('Failed to parse AI response:', parseErr);
          }
        } else {
          const errText = await aiResponse.text();
          console.error(`Lovable AI error [${aiResponse.status}]:`, errText);
        }
      } catch (aiError) {
        console.error('Lovable AI error:', aiError);
      }
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
      patterns: {
        topicInterests: extractBehaviorPatterns(posts, comments),
      },
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
