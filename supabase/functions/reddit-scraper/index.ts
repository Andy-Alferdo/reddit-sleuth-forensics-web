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
      let posts: RedditPost[] = postsData.data?.children?.map((child: any) => ({ ...child.data, _source: 'oauth' })) || [];
      console.log(`Fetched ${posts.length} posts via OAuth`);

      // Fetch user comments
      const commentsResponse = await fetch(`https://oauth.reddit.com/user/${username}/comments?limit=100`, {
        headers: {
          'Authorization': `Bearer ${tokenData.access_token}`,
          'User-Agent': 'IntelReddit/1.0',
        },
      });

      const commentsData = await commentsResponse.json();
      let comments: RedditComment[] = commentsData.data?.children?.map((child: any) => ({ ...child.data, _source: 'oauth' })) || [];
      console.log(`Fetched ${comments.length} comments via OAuth`);

      // ===== Fallback: hidden / "keep posts hidden" profiles =====
      // Reddit OAuth returns empty arrays when a user has disabled "show profile in listings",
      // even though the user exists and the about endpoint returns 200. Old.reddit and the
      // unauthenticated www.reddit JSON endpoints often still expose this content.
      let dataSource: 'oauth' | 'old_reddit' | 'author_search' | 'www_comment_search' | 'mixed' = 'oauth';
      if (posts.length === 0 && comments.length === 0) {
        console.log(`OAuth returned 0 items for u/${username}, falling back to old.reddit / www.reddit`);

        const fallbackHeaders = {
          'User-Agent': 'Mozilla/5.0 (compatible; IntelReddit/1.0)',
          'Accept': 'application/json',
        };

        const tryFetchJson = async (url: string) => {
          try {
            const r = await fetch(url, { headers: fallbackHeaders });
            if (!r.ok) {
              console.log(`Fallback ${url} -> HTTP ${r.status}`);
              return null;
            }
            return await r.json();
          } catch (e) {
            console.log(`Fallback ${url} threw:`, e instanceof Error ? e.message : String(e));
            return null;
          }
        };

        // Try old.reddit first, then www.reddit as a second chance.
        const fallbackPostsJson =
          (await tryFetchJson(`https://old.reddit.com/user/${username}/submitted.json?limit=100&raw_json=1`)) ||
          (await tryFetchJson(`https://www.reddit.com/user/${username}/submitted/.json?limit=100&raw_json=1`));

        const fallbackCommentsJson =
          (await tryFetchJson(`https://old.reddit.com/user/${username}/comments.json?limit=100&raw_json=1`)) ||
          (await tryFetchJson(`https://www.reddit.com/user/${username}/comments/.json?limit=100&raw_json=1`));

        const fbPosts: RedditPost[] = fallbackPostsJson?.data?.children
          ?.map((child: any) => ({ ...child.data, _source: 'old_reddit' })) || [];
        const fbComments: RedditComment[] = fallbackCommentsJson?.data?.children
          ?.map((child: any) => ({ ...child.data, _source: 'old_reddit' })) || [];

        console.log(`old.reddit fallback returned ${fbPosts.length} posts, ${fbComments.length} comments`);

        if (fbPosts.length > 0 || fbComments.length > 0) {
          posts = fbPosts;
          comments = fbComments;
          dataSource = 'old_reddit';
        }

        // ===== Tier 3 fallback: author:{username} search =====
        // Some hidden profiles also block /user/{name}/submitted on old.reddit, but
        // their posts still appear in Reddit search via "author:username".
        // NOTE: Reddit's OAuth /search endpoint silently ignores `type=comment` and
        // returns posts ("t3_") regardless. There is no reliable public API to
        // recover comments authored by a hidden user, so we ONLY recover posts here
        // and intentionally leave `comments` empty rather than duplicating posts.
        if (posts.length === 0 && comments.length === 0) {
          console.log(`old.reddit also empty for u/${username}, trying author:${username} search fallback (posts only)`);

          const searchHeaders = {
            'Authorization': `Bearer ${tokenData.access_token}`,
            'User-Agent': 'IntelReddit/1.0',
          };

          const authorPostsRes = await fetch(
            `https://oauth.reddit.com/search?q=${encodeURIComponent(`author:${username}`)}&limit=100&sort=new&type=link&restrict_sr=false&include_over_18=on`,
            { headers: searchHeaders }
          );
          let authorPosts: RedditPost[] = [];
          if (authorPostsRes.ok) {
            const j = await authorPostsRes.json();
            authorPosts = (j.data?.children || [])
              .map((c: any) => ({ ...c.data, _source: 'author_search' }))
              .filter((p: any) => (p.author || '').toLowerCase() === username.toLowerCase());
          } else {
            console.log(`author search posts -> HTTP ${authorPostsRes.status}`);
          }

          console.log(`author:${username} search returned ${authorPosts.length} posts (comments not recoverable for hidden profiles)`);

          if (authorPosts.length > 0) {
            posts = authorPosts;
            dataSource = 'author_search';
          }
        }

        // ===== Tier 4 fallback: public www.reddit search for COMMENTS =====
        // Unlike OAuth /search (which silently ignores type=comment), the public
        // www.reddit.com/search.json?type=comment endpoint DOES return comments.
        // We use a plain username query (not "author:") because Reddit's search
        // matches the comment author field for usernames, and then strictly
        // filter by exact author match.
        if (comments.length === 0) {
          console.log(`Trying www.reddit search.json type=comment for u/${username}`);
          const wwwHeaders = {
            'User-Agent': 'Mozilla/5.0 (compatible; IntelReddit/1.0)',
            'Accept': 'application/json',
          };

          const tryCommentSearch = async (url: string) => {
            try {
              const r = await fetch(url, { headers: wwwHeaders });
              if (!r.ok) {
                console.log(`Comment search ${url} -> HTTP ${r.status}`);
                return null;
              }
              return await r.json();
            } catch (e) {
              console.log(`Comment search ${url} threw:`, e instanceof Error ? e.message : String(e));
              return null;
            }
          };

          // Try both query forms: plain username, and author:username
          const searchJson =
            (await tryCommentSearch(`https://www.reddit.com/search.json?q=${encodeURIComponent(username)}&type=comment&sort=new&limit=100&raw_json=1`)) ||
            (await tryCommentSearch(`https://old.reddit.com/search.json?q=${encodeURIComponent(username)}&type=comment&sort=new&limit=100&raw_json=1`)) ||
            (await tryCommentSearch(`https://www.reddit.com/search.json?q=${encodeURIComponent(`author:${username}`)}&type=comment&sort=new&limit=100&raw_json=1`));

          const searchedComments: RedditComment[] = (searchJson?.data?.children || [])
            .map((c: any) => ({ ...c.data, _source: 'www_comment_search' }))
            .filter((c: any) => (c.author || '').toLowerCase() === username.toLowerCase());

          console.log(`www.reddit comment search returned ${searchedComments.length} comments for u/${username}`);

          if (searchedComments.length > 0) {
            comments = searchedComments;
            dataSource = dataSource === 'oauth' ? 'www_comment_search' as any : 'mixed';
          }
        }
      }

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
        dataSource,
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

      responseData = {
        subreddit: subredditData.data,
        posts,
        relatedSubreddits,
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
