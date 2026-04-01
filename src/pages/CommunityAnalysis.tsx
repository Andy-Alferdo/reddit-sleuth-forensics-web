import { useState, useMemo, useCallback } from "react";
import { Search, Users, Calendar, Shield, MessageSquare, Loader2, TrendingUp, UserCheck, Activity, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { WordCloud } from '@/components/WordCloud';
import { AnalyticsChart } from '@/components/AnalyticsChart';
import { RelatedSubredditsGraph } from '@/components/RelatedSubredditsGraph';
import { format, subDays } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface SubredditData {
  display_name: string;
  title: string;
  public_description: string;
  subscribers: number;
  accounts_active: number;
  created_utc: number;
  over18: boolean;
  banner_img?: string;
  icon_img?: string;
  community_icon?: string;
}

interface RedditPost {
  title: string;
  selftext: string;
  author: string;
  created_utc: number;
  score: number;
  num_comments: number;
  permalink: string;
  subreddit: string;
}

interface RelatedSub {
  name: string;
  subscribers?: number;
  description?: string;
}

const CommunityAnalysis = () => {
  const [subreddit, setSubreddit] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [subredditData, setSubredditData] = useState<SubredditData | null>(null);
  const [posts, setPosts] = useState<RedditPost[]>([]);
  const [relatedSubreddits, setRelatedSubreddits] = useState<RelatedSub[]>([]);
  const [activeUsers, setActiveUsers] = useState(0);
  const [weeklyContributions, setWeeklyContributions] = useState(0);

  // Word cloud from post titles
  const communityWordCloud = useMemo(() => {
    if (posts.length === 0) return [];
    const freq: Record<string, number> = {};
    const stopWords = new Set(['the', 'a', 'an', 'is', 'are', 'was', 'were', 'in', 'on', 'at', 'to', 'for', 'of', 'and', 'or', 'but', 'not', 'with', 'by', 'from', 'it', 'this', 'that', 'i', 'you', 'we', 'they', 'my', 'your', 'just', 'has', 'have', 'had', 'do', 'does', 'did', 'will', 'would', 'can', 'could', 'about', 'been', 'so', 'if', 'be', 'as', 'what', 'how', 'why', 'who', 'when', 'where', 'no', 'all', 'its', 'get', 'got', 'me', 'like', 'up', 'out', 'more', 'one', 'new', 'also', 'than', 'now', 'am', 'some', 'any', 'over', 'after', 'into', 'our', 'their', 'there', 'here']);
    posts.forEach(p => {
      const words = (p.title + ' ' + (p.selftext || '')).toLowerCase().replace(/[^a-z0-9\s]/g, '').split(/\s+/);
      words.forEach(w => {
        if (w.length > 2 && !stopWords.has(w)) {
          freq[w] = (freq[w] || 0) + 1;
        }
      });
    });
    return Object.entries(freq)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 20)
      .map(([word, frequency]) => ({
        word,
        frequency,
        category: (frequency > 10 ? 'high' : frequency > 5 ? 'medium' : 'low') as 'high' | 'medium' | 'low',
      }));
  }, [posts]);

  // Post frequency by day
  const postFrequencyData = useMemo(() => {
    if (posts.length === 0) return [];
    const today = new Date();
    const counts: Record<string, number> = {};
    for (let i = 6; i >= 0; i--) {
      const d = subDays(today, i);
      counts[format(d, 'yyyy-MM-dd')] = 0;
    }
    posts.forEach(p => {
      const d = format(new Date(p.created_utc * 1000), 'yyyy-MM-dd');
      if (d in counts) counts[d]++;
    });
    return Object.entries(counts).map(([date, value]) => {
      const d = new Date(date);
      return { name: `${format(d, 'EEE')}, ${format(d, 'dd-MM-yyyy')}`, value };
    });
  }, [posts]);

  // Top contributors
  const topContributors = useMemo(() => {
    const authorMap: Record<string, { posts: number; totalScore: number }> = {};
    posts.forEach(p => {
      if (!p.author || p.author === '[deleted]') return;
      if (!authorMap[p.author]) authorMap[p.author] = { posts: 0, totalScore: 0 };
      authorMap[p.author].posts++;
      authorMap[p.author].totalScore += p.score;
    });
    return Object.entries(authorMap)
      .sort((a, b) => b[1].posts - a[1].posts)
      .slice(0, 10)
      .map(([author, data]) => ({ author, ...data }));
  }, [posts]);

  // Recent posts sorted by time
  const recentPosts = useMemo(() => {
    return [...posts].sort((a, b) => b.created_utc - a.created_utc).slice(0, 5);
  }, [posts]);

  // Top posts by score
  const topPosts = useMemo(() => {
    return [...posts].sort((a, b) => b.score - a.score).slice(0, 5);
  }, [posts]);

  const handleSearch = useCallback(async (searchTerm?: string) => {
    const term = (searchTerm || subreddit).trim().replace(/^r\//, '');
    if (!term) return;

    setSubreddit(term);
    setIsSearching(true);
    setHasSearched(false);

    try {
      const { data, error } = await supabase.functions.invoke('reddit-scraper', {
        body: { type: 'community', subreddit: term },
      });

      if (error) throw error;
      if (data?.error) {
        toast.error(data.message || 'Failed to fetch subreddit data');
        setIsSearching(false);
        return;
      }

      setSubredditData(data.subreddit);
      setPosts(data.posts || []);
      setRelatedSubreddits(data.relatedSubreddits || []);
      setActiveUsers(data.activeUsers || data.weeklyVisitors || 0);
      setWeeklyContributions(data.weeklyContributions || 0);
      setHasSearched(true);
    } catch (err: any) {
      console.error('Community analysis error:', err);
      toast.error('Failed to analyze community. Please try again.');
    } finally {
      setIsSearching(false);
    }
  }, [subreddit]);

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") handleSearch();
  };

  const handleSubredditClick = (name: string) => {
    handleSearch(name);
  };

  const formatNumber = (n: number) => {
    if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M';
    if (n >= 1_000) return (n / 1_000).toFixed(1) + 'K';
    return n.toString();
  };

  const formatTimestamp = (utc: number) => {
    const diff = Date.now() / 1000 - utc;
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return `${Math.floor(diff / 86400)}d ago`;
  };

  return (
    <div className="min-h-screen bg-background p-6 relative">
      {isSearching && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/60">
          <div className="flex flex-col items-center gap-3 bg-card border border-border rounded-xl shadow-2xl px-8 py-6">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-sm font-medium text-foreground">Analyzing community...</p>
          </div>
        </div>
      )}
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold text-primary">Community Analysis</h1>
          <p className="text-muted-foreground">
            Analyze Reddit communities for forensic investigation
          </p>
        </div>

        {/* Search */}
        <Card className="border-primary/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" />
              Community Search
            </CardTitle>
            <CardDescription>
              Enter a subreddit name to analyze (e.g., "technology", "AskReddit")
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">r/</span>
                <Input
                  placeholder="subreddit name"
                  value={subreddit}
                  onChange={(e) => setSubreddit(e.target.value)}
                  onKeyPress={handleKeyPress}
                  className="pl-8"
                />
              </div>
              <Button onClick={() => handleSearch()} disabled={isSearching || !subreddit.trim()} className="px-6">
                <Search className="h-4 w-4 mr-2" />
                {isSearching ? "Analyzing..." : "Analyze"}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Results */}
        {hasSearched && subredditData && (
          <div className="space-y-6">
            {/* KPI Row */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Card className="border-primary/20">
                <CardContent className="p-4 flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-primary/10">
                    <Users className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Members</p>
                    <p className="text-xl font-bold">{formatNumber(subredditData.subscribers)}</p>
                  </div>
                </CardContent>
              </Card>
              <Card className="border-primary/20">
                <CardContent className="p-4 flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-green-500/10">
                    <Activity className="h-5 w-5 text-green-500" />
                  </div>
                  <div>
                     <p className="text-xs text-muted-foreground">Weekly Contributions</p>
                     <p className="text-xl font-bold">{weeklyContributors}</p>
                  </div>
                </CardContent>
              </Card>
              <Card className="border-primary/20">
                <CardContent className="p-4 flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-violet-500/10">
                    <UserCheck className="h-5 w-5 text-violet-500" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Weekly Contributors</p>
                    <p className="text-xl font-bold">{weeklyContributors}</p>
                  </div>
                </CardContent>
              </Card>
              <Card className="border-primary/20">
                <CardContent className="p-4 flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-amber-500/10">
                    <TrendingUp className="h-5 w-5 text-amber-500" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Posts Collected</p>
                    <p className="text-xl font-bold">{posts.length}</p>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Community Info + Recent Posts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card className="border-primary/20">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Shield className="h-5 w-5 text-primary" />
                    Community Information
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <h3 className="font-semibold text-lg">r/{subredditData.display_name}</h3>
                    {subredditData.title && (
                      <p className="text-sm text-muted-foreground">{subredditData.title}</p>
                    )}
                    <div className="flex items-center gap-2 mt-2">
                      <Badge variant="secondary">{formatNumber(subredditData.subscribers)} members</Badge>
                      {subredditData.over18 && <Badge variant="destructive">NSFW</Badge>}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Calendar className="h-4 w-4" />
                    Created: {format(new Date(subredditData.created_utc * 1000), 'MMMM d, yyyy')}
                  </div>
                  <Separator />
                  <div>
                    <h4 className="font-medium mb-2">Description</h4>
                    <p className="text-sm text-muted-foreground">
                      {subredditData.public_description || 'No description available.'}
                    </p>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-primary/20">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <MessageSquare className="h-5 w-5 text-primary" />
                    Recent Posts
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {recentPosts.map((post, i) => (
                    <a
                      key={i}
                      href={`https://www.reddit.com${post.permalink}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block border border-border/50 rounded-lg p-3 space-y-2 hover:bg-accent/50 transition-colors"
                    >
                      <h4 className="font-medium text-sm leading-tight line-clamp-2">{post.title}</h4>
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span>by u/{post.author}</span>
                        <span>{formatTimestamp(post.created_utc)}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary" className="text-xs">▲ {post.score}</Badge>
                        <Badge variant="outline" className="text-xs">{post.num_comments} comments</Badge>
                      </div>
                    </a>
                  ))}
                </CardContent>
              </Card>
            </div>

            {/* Related Subreddits Graph */}
            {relatedSubreddits.length > 0 && (
              <RelatedSubredditsGraph
                centerSubreddit={subredditData.display_name}
                relatedSubreddits={relatedSubreddits}
                onSubredditClick={handleSubredditClick}
              />
            )}

            {/* Top Posts + Top Contributors */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card className="border-primary/20">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5 text-primary" />
                    Top Posts by Score
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {topPosts.map((post, i) => (
                    <a
                      key={i}
                      href={`https://www.reddit.com${post.permalink}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-start gap-3 border border-border/50 rounded-lg p-3 hover:bg-accent/50 transition-colors"
                    >
                      <span className="text-lg font-bold text-primary min-w-[28px]">#{i + 1}</span>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium text-sm leading-tight line-clamp-2">{post.title}</h4>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant="secondary" className="text-xs">▲ {post.score}</Badge>
                          <span className="text-xs text-muted-foreground">u/{post.author}</span>
                        </div>
                      </div>
                    </a>
                  ))}
                </CardContent>
              </Card>

              <Card className="border-primary/20">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <UserCheck className="h-5 w-5 text-primary" />
                    Top Contributors
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {topContributors.map((c, i) => (
                      <div key={i} className="flex items-center justify-between border border-border/50 rounded-lg p-3">
                        <div className="flex items-center gap-3">
                          <span className="text-sm font-bold text-muted-foreground min-w-[24px]">#{i + 1}</span>
                          <div>
                            <p className="font-medium text-sm">u/{c.author}</p>
                            <p className="text-xs text-muted-foreground">{c.posts} posts</p>
                          </div>
                        </div>
                        <Badge variant="secondary" className="text-xs">▲ {c.totalScore}</Badge>
                      </div>
                    ))}
                    {topContributors.length === 0 && (
                      <p className="text-sm text-muted-foreground text-center py-4">No contributor data available</p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Analytics */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {communityWordCloud.length > 0 && (
                <WordCloud words={communityWordCloud} title="Popular Topics" />
              )}
              {postFrequencyData.length > 0 && (
                <AnalyticsChart
                  data={postFrequencyData}
                  title="Post Frequency (Last 7 Days)"
                  type="line"
                  height={250}
                />
              )}
            </div>
          </div>
        )}

        {!hasSearched && !isSearching && (
          <Card className="border-primary/20">
            <CardContent className="py-12 text-center">
              <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">
                Enter a subreddit name above to begin community analysis
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default CommunityAnalysis;
