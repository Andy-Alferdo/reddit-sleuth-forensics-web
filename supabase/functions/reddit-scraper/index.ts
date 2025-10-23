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
    const { username, type, subreddit } = await req.json();
    console.log(`Reddit scraper called for: ${username || subreddit}, type: ${type}`);

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

    if (type === 'user') {
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

      responseData = {
        user: userData.data,
        posts,
        comments,
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
