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

      // Fetch related subreddits from sidebar widgets
      let relatedSubreddits: { name: string; subscribers?: number; description?: string }[] = [];
      try {
        const widgetsResponse = await fetch(`https://oauth.reddit.com/r/${subreddit}/api/widgets`, {
          headers: {
            'Authorization': `Bearer ${tokenData.access_token}`,
            'User-Agent': 'IntelReddit/1.0',
          },
        });
        if (widgetsResponse.ok) {
          const widgetsData = await widgetsResponse.json();
          if (widgetsData.items) {
            for (const key of Object.keys(widgetsData.items)) {
              const widget = widgetsData.items[key];
              if (widget.kind === 'community-list' && widget.data) {
                widget.data.forEach((item: any) => {
                  const name = (item.name || '').replace(/^r\//, '');
                  if (name && name.toLowerCase() !== subreddit.toLowerCase()) {
                    relatedSubreddits.push({
                      name,
                      subscribers: item.subscribers,
                      description: item.communityIcon ? undefined : undefined,
                    });
                  }
                });
              }
            }
          }
        }
        console.log(`Found ${relatedSubreddits.length} related subreddits for r/${subreddit}`);
      } catch (e) {
        console.log(`Could not fetch widgets for r/${subreddit}:`, e);
      }

      // Fallback: if no related subs found, try fetching similar subreddits via search
      if (relatedSubreddits.length === 0) {
        try {
          const searchResponse = await fetch(`https://oauth.reddit.com/subreddits/search?q=${encodeURIComponent(subreddit)}&limit=10`, {
            headers: {
              'Authorization': `Bearer ${tokenData.access_token}`,
              'User-Agent': 'IntelReddit/1.0',
            },
          });
          if (searchResponse.ok) {
            const searchData = await searchResponse.json();
            const subs = searchData.data?.children || [];
            relatedSubreddits = subs
              .map((child: any) => child.data)
              .filter((s: any) => s.display_name.toLowerCase() !== subreddit.toLowerCase())
              .slice(0, 8)
              .map((s: any) => ({
                name: s.display_name,
                subscribers: s.subscribers,
                description: s.public_description?.substring(0, 100),
              }));
            console.log(`Fallback search found ${relatedSubreddits.length} similar subreddits`);
          }
        } catch (e) {
          console.log('Fallback subreddit search failed:', e);
        }
      }

      // Scrape weekly contributions from Reddit's webpage
      let weeklyContributions = 0;
      try {
        // Try fetching the subreddit page JSON which may contain contribution stats
        const pageResponse = await fetch(`https://www.reddit.com/r/${subreddit}.json?limit=1`, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (compatible; IntelReddit/1.0)',
            'Accept': 'application/json',
          },
        });
        console.log(`Reddit page fetch status: ${pageResponse.status}`);
        
        if (!pageResponse.ok) {
          // Fallback: try scraping old.reddit.com
          const oldRedditResponse = await fetch(`https://old.reddit.com/r/${subreddit}/`, {
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
              'Accept': 'text/html',
            },
          });
          console.log(`Old Reddit fetch status: ${oldRedditResponse.status}`);
          if (oldRedditResponse.ok) {
            const html = await oldRedditResponse.text();
            const contribMatch = html.match(/([\d,]+(?:\.\d+)?[KkMm]?)\s*contributions?\s*(?:in the past week|this week|per week)/i);
            if (contribMatch) {
              let raw = contribMatch[1].replace(/,/g, '');
              if (raw.toLowerCase().endsWith('k')) {
                weeklyContributions = Math.round(parseFloat(raw) * 1000);
              } else if (raw.toLowerCase().endsWith('m')) {
                weeklyContributions = Math.round(parseFloat(raw) * 1000000);
              } else {
                weeklyContributions = parseInt(raw, 10) || 0;
              }
              console.log(`Scraped weekly contributions from old Reddit: ${weeklyContributions}`);
            }
          }
        }
      } catch (e) {
        console.log(`Failed to scrape weekly contributions for r/${subreddit}:`, e);
      }
      
      // Fallback: calculate from fetched posts if scraping failed
      if (weeklyContributions === 0) {
        const sevenDaysAgo = Date.now() / 1000 - 7 * 24 * 60 * 60;
        let count = 0;
        posts.forEach((p: any) => {
          if (p.created_utc >= sevenDaysAgo) count++;
        });
        // Estimate: each post likely has ~10x more comments, so multiply
        weeklyContributions = count > 0 ? count * 10 : 0;
        if (weeklyContributions > 0) {
          console.log(`Estimated weekly contributions from posts: ${weeklyContributions}`);
        }
      }

      responseData = {
        subreddit: subredditData.data,
        posts,
        relatedSubreddits,
        weeklyContributions,
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
