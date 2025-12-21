import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface RedditToken {
  access_token: string;
  expires_in: number;
}

interface RedditPost {
  title: string;
  selftext: string;
  subreddit: string;
  created_utc: number;
  score: number;
  num_comments: number;
  url: string;
  permalink: string;
  author: string;
}

interface RedditComment {
  body: string;
  subreddit: string;
  created_utc: number;
  score: number;
  link_title: string;
  permalink: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { username, type, subreddit, keyword } = await req.json();
    console.log(`Reddit scraper called for: ${username || subreddit || keyword}, type: ${type}`);

    const REDDIT_CLIENT_ID = Deno.env.get('REDDIT_CLIENT_ID');
    const REDDIT_CLIENT_SECRET = Deno.env.get('REDDIT_CLIENT_SECRET');

    if (!REDDIT_CLIENT_ID || !REDDIT_CLIENT_SECRET) {
      throw new Error('Reddit API credentials not configured');
    }

    // Get Reddit OAuth token
    const tokenResponse = await fetch('https://www.reddit.com/api/v1/access_token', {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${btoa(`${REDDIT_CLIENT_ID}:${REDDIT_CLIENT_SECRET}`)}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: 'grant_type=client_credentials',
    });

    if (!tokenResponse.ok) {
      const error = await tokenResponse.text();
      console.error('Reddit token error:', error);
      throw new Error('Failed to authenticate with Reddit API');
    }

    const tokenData: RedditToken = await tokenResponse.json();
    console.log('Reddit token obtained successfully');

    let responseData: any = {};

    if (type === 'search') {
      // Search for keyword across Reddit
      const searchResponse = await fetch(`https://oauth.reddit.com/search?q=${encodeURIComponent(keyword)}&limit=100&sort=relevance&t=week`, {
        headers: {
          'Authorization': `Bearer ${tokenData.access_token}`,
          'User-Agent': 'IntelReddit/1.0',
        },
      });

      if (!searchResponse.ok) {
        throw new Error('Failed to search Reddit');
      }

      const searchData = await searchResponse.json();
      const posts: RedditPost[] = searchData.data?.children?.map((child: any) => child.data) || [];
      console.log(`Search found ${posts.length} posts for keyword: ${keyword}`);

      responseData = {
        posts,
        keyword,
      };

    } else if (type === 'user') {
      // Fetch user data
      const userResponse = await fetch(`https://oauth.reddit.com/user/${username}/about`, {
        headers: {
          'Authorization': `Bearer ${tokenData.access_token}`,
          'User-Agent': 'IntelReddit/1.0',
        },
      });

      if (userResponse.status === 404) {
        return new Response(JSON.stringify({ 
          error: 'not_found',
          message: `User "${username}" not found on Reddit. Please check the username and try again.`
        }), {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      if (!userResponse.ok) {
        throw new Error('Failed to fetch user data');
      }

      const userData = await userResponse.json();
      console.log('User data fetched:', userData.data.name);

      // Fetch user posts
      const postsResponse = await fetch(`https://oauth.reddit.com/user/${username}/submitted?limit=100`, {
        headers: {
          'Authorization': `Bearer ${tokenData.access_token}`,
          'User-Agent': 'IntelReddit/1.0',
        },
      });

      const postsData = await postsResponse.json();
      const posts: RedditPost[] = postsData.data?.children?.map((child: any) => child.data) || [];
      console.log(`Fetched ${posts.length} posts`);

      // Fetch user comments
      const commentsResponse = await fetch(`https://oauth.reddit.com/user/${username}/comments?limit=100`, {
        headers: {
          'Authorization': `Bearer ${tokenData.access_token}`,
          'User-Agent': 'IntelReddit/1.0',
        },
      });

      const commentsData = await commentsResponse.json();
      const comments: RedditComment[] = commentsData.data?.children?.map((child: any) => child.data) || [];
      console.log(`Fetched ${comments.length} comments`);

      // Get unique subreddits the user is active in
      const activeSubreddits = new Set<string>();
      posts.forEach((p: any) => activeSubreddits.add(p.subreddit));
      comments.forEach((c: any) => activeSubreddits.add(c.subreddit));
      
      // Fetch related communities for top subreddits
      const topSubreddits = Array.from(activeSubreddits).slice(0, 5);
      const communityRelations: { subreddit: string; relatedTo: string[] }[] = [];
      
      for (const sub of topSubreddits) {
        try {
          // Fetch subreddit sidebar/widgets which may contain related subreddits
          const widgetsResponse = await fetch(`https://oauth.reddit.com/r/${sub}/api/widgets`, {
            headers: {
              'Authorization': `Bearer ${tokenData.access_token}`,
              'User-Agent': 'IntelReddit/1.0',
            },
          });
          
          if (widgetsResponse.ok) {
            const widgetsData = await widgetsResponse.json();
            const relatedSubs: string[] = [];
            
            // Parse widgets to find community list widgets (related subreddits)
            if (widgetsData.items) {
              for (const key of Object.keys(widgetsData.items)) {
                const widget = widgetsData.items[key];
                // Community list widget contains related subreddits
                if (widget.kind === 'community-list' && widget.data) {
                  widget.data.forEach((item: any) => {
                    if (item.name && item.name !== sub) {
                      relatedSubs.push(item.name.replace(/^r\//, ''));
                    }
                  });
                }
              }
            }
            
            if (relatedSubs.length > 0) {
              communityRelations.push({
                subreddit: sub,
                relatedTo: relatedSubs.slice(0, 5)
              });
            }
            console.log(`Found ${relatedSubs.length} related subs for r/${sub}`);
          }
        } catch (e) {
          console.log(`Could not fetch widgets for r/${sub}:`, e);
        }
      }

      responseData = {
        user: userData.data,
        posts,
        comments,
        communityRelations,
      };

    } else if (type === 'community') {
      // Fetch subreddit data
      const subredditResponse = await fetch(`https://oauth.reddit.com/r/${subreddit}/about`, {
        headers: {
          'Authorization': `Bearer ${tokenData.access_token}`,
          'User-Agent': 'IntelReddit/1.0',
        },
      });

      if (subredditResponse.status === 404) {
        return new Response(JSON.stringify({ 
          error: 'not_found',
          message: `Subreddit "r/${subreddit}" not found. Please check the name and try again.`
        }), {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      if (!subredditResponse.ok) {
        throw new Error('Failed to fetch subreddit data');
      }

      const subredditData = await subredditResponse.json();
      console.log('Subreddit data fetched:', subredditData.data.display_name);

      // Fetch recent posts from subreddit
      const postsResponse = await fetch(`https://oauth.reddit.com/r/${subreddit}/new?limit=100`, {
        headers: {
          'Authorization': `Bearer ${tokenData.access_token}`,
          'User-Agent': 'IntelReddit/1.0',
        },
      });

      const postsData = await postsResponse.json();
      const posts: RedditPost[] = postsData.data?.children?.map((child: any) => child.data) || [];
      console.log(`Fetched ${posts.length} posts from subreddit`);

      responseData = {
        subreddit: subredditData.data,
        posts,
        weeklyVisitors: subredditData.data.accounts_active || 0,
        activeUsers: subredditData.data.active_user_count || 0,
      };
    }

    return new Response(JSON.stringify(responseData), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in reddit-scraper:', error);
    return new Response(JSON.stringify({ 
      error: 'internal_error',
      message: error instanceof Error ? error.message : 'Unknown error occurred' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
