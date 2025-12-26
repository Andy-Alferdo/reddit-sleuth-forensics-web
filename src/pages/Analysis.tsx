import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { BarChart3, MapPin, Calendar, Users, Network, Share2, AlertTriangle, TrendingUp, Search, Shield, MessageSquare, Clock, X } from 'lucide-react';
import { WordCloud } from '@/components/WordCloud';
import { AnalyticsChart } from '@/components/AnalyticsChart';
import { UserCommunityNetworkGraph } from '@/components/UserCommunityNetworkGraph';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { formatActivityTime } from '@/lib/dateUtils';
import { useInvestigation } from '@/contexts/InvestigationContext';

interface SentimentItem {
  text: string;
  sentiment: 'positive' | 'negative' | 'neutral';
  explanation: string;
}

const Analysis = () => {
  const location = useLocation();
  const [keyword, setKeyword] = useState('');
  const [username, setUsername] = useState('');
  const [subreddit, setSubreddit] = useState('');
  const [keywordData, setKeywordData] = useState<any>(null);
  const [communityData, setCommunityData] = useState<any>(null);
  const [linkData, setLinkData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('keyword');
  const { toast } = useToast();
  const { addKeywordAnalysis, addCommunityAnalysis, addLinkAnalysis, saveKeywordAnalysisToDb, saveCommunityAnalysisToDb, saveLinkAnalysisToDb, currentCase } = useInvestigation();

  // Load saved analysis when navigating from Dashboard
  useEffect(() => {
    const loadAnalysisId = (location.state as any)?.loadAnalysisId as string | undefined;
    const analysisType = (location.state as any)?.analysisType as string | undefined;
    if (!loadAnalysisId) return;

    let cancelled = false;

    (async () => {
      setIsLoading(true);
      try {
        const { data, error } = await supabase
          .from('analysis_results')
          .select('*')
          .eq('id', loadAnalysisId)
          .maybeSingle();

        if (error) throw error;
        if (!data) throw new Error('Analysis not found');

        if (cancelled) return;

        const resultData = data.result_data as any;

        if (analysisType === 'keyword' || data.analysis_type === 'keyword') {
          setActiveTab('keyword');
          setKeyword(data.target || '');
          setKeywordData(resultData);
        } else if (analysisType === 'community' || data.analysis_type === 'community') {
          setActiveTab('community');
          setSubreddit(data.target || '');
          setCommunityData(resultData);
        }

        toast({
          title: 'Loaded saved analysis',
          description: `Showing saved ${data.analysis_type} analysis for "${data.target}"`,
        });
      } catch (e: any) {
        if (!cancelled) {
          toast({
            title: 'Failed to load analysis',
            description: e?.message || 'Could not load saved analysis',
            variant: 'destructive',
          });
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [location.state, toast]);

  const getSentimentBadge = (sentiment: string) => {
    switch (sentiment?.toLowerCase()) {
      case 'positive':
        return <Badge className="bg-green-500/20 text-green-400 border-green-500/30">Positive</Badge>;
      case 'negative':
        return <Badge className="bg-red-500/20 text-red-400 border-red-500/30">Negative</Badge>;
      default:
        return <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30">Neutral</Badge>;
    }
  };

  const handleKeywordAnalysis = async () => {
    if (!keyword.trim()) return;
    
    setIsLoading(true);
    setKeywordData(null);

    try {
      // Search for keyword across Reddit using search API
      const { data: redditData, error } = await supabase.functions.invoke('reddit-scraper', {
        body: { 
          keyword: keyword.trim(),
          type: 'search'
        }
      });

      if (error) throw error;

      const posts = redditData.posts || [];
      const matchingPosts = posts;

      // Count subreddit mentions
      const subredditCounts: { [key: string]: number } = {};
      posts.forEach((post: any) => {
        subredditCounts[post.subreddit] = (subredditCounts[post.subreddit] || 0) + 1;
      });

      const topSubreddits = Object.entries(subredditCounts)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 5)
        .map(([name, mentions]) => ({ name: `r/${name}`, mentions }));

      // Generate word cloud from matching posts
      const textContent = matchingPosts.map((p: any) => `${p.title} ${p.selftext || ''}`).join(' ');
      const words = textContent.toLowerCase().match(/\b[a-z]{4,}\b/g) || [];
      const wordFreq: { [key: string]: number } = {};
      const stopWords = ['that', 'this', 'with', 'from', 'have', 'been', 'will', 'your', 'their', 'what', 'when', 'where', 'just', 'like', 'more', 'would', 'could', 'should', 'about', 'there', 'which', 'them', 'these', 'than', 'then', 'also', 'only'];
      const keywordLower = keyword.toLowerCase();
      words.forEach(word => {
        if (!stopWords.includes(word) && word !== keywordLower) {
          wordFreq[word] = (wordFreq[word] || 0) + 1;
        }
      });

      const wordCloudData = Object.entries(wordFreq)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 12)
        .map(([word, freq]) => ({
          word,
          frequency: freq,
          category: freq > 10 ? 'high' as const : freq > 5 ? 'medium' as const : 'low' as const
        }));

      // Calculate activity by day for past 7 days
      const now = new Date();
      const past7Days: { [key: string]: number } = {};
      
      for (let i = 6; i >= 0; i--) {
        const date = new Date(now);
        date.setDate(date.getDate() - i);
        const dayKey = date.toLocaleDateString('en-US', { weekday: 'short', day: 'numeric' });
        past7Days[dayKey] = 0;
      }

      matchingPosts.forEach((post: any) => {
        const postDate = new Date(post.created_utc * 1000);
        const daysDiff = Math.floor((now.getTime() - postDate.getTime()) / (1000 * 60 * 60 * 24));
        
        if (daysDiff < 7) {
          const dayKey = postDate.toLocaleDateString('en-US', { weekday: 'short', day: 'numeric' });
          if (past7Days[dayKey] !== undefined) {
            past7Days[dayKey]++;
          }
        }
      });

      const trendData = Object.entries(past7Days).map(([name, value]) => ({ name, value }));

      // Analyze sentiment for keyword results
      let keywordSentimentData = null;
      let postSentiments: SentimentItem[] = [];
      
      try {
        const { data: analysisData, error: analysisError } = await supabase.functions.invoke('analyze-content', {
          body: {
            posts: matchingPosts.slice(0, 20),
            comments: []
          }
        });

        if (!analysisError && analysisData) {
          if (analysisData.sentiment?.postBreakdown) {
            const breakdown = analysisData.sentiment.postBreakdown;
            keywordSentimentData = [
              { name: 'Positive', value: Math.round((breakdown.positive || 0) * 100) },
              { name: 'Neutral', value: Math.round((breakdown.neutral || 0) * 100) },
              { name: 'Negative', value: Math.round((breakdown.negative || 0) * 100) }
            ];
          }
          postSentiments = analysisData.postSentiments || [];
        }
      } catch (sentimentErr) {
        console.error('Keyword sentiment analysis error:', sentimentErr);
      }

      const analysisResult = {
        keyword,
        totalMentions: matchingPosts.length,
        topSubreddits,
        wordCloud: wordCloudData,
        trendData: trendData.length > 0 ? trendData : [{ name: 'Recent', value: matchingPosts.length }],
        recentPosts: matchingPosts.slice(0, 10),
        sentimentChartData: keywordSentimentData,
        postSentiments
      };

      setKeywordData(analysisResult);
      
      // Save to investigation context
      const analysisToSave = { ...analysisResult, analyzedAt: new Date().toISOString() };
      addKeywordAnalysis(analysisToSave);
      
      // Save to database if active case
      if (currentCase?.id) {
        try { await saveKeywordAnalysisToDb(analysisToSave); } catch (e) { console.error(e); }
      }

      toast({
        title: "Keyword Analysis Complete",
        description: `Found ${matchingPosts.length} mentions of "${keyword}"`,
      });

    } catch (err: any) {
      console.error('Error in keyword analysis:', err);
      toast({
        title: "Analysis Failed",
        description: err.message || 'Failed to analyze keyword',
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCommunityAnalysis = async () => {
    if (!subreddit.trim()) return;
    
    setIsLoading(true);
    setCommunityData(null);

    try {
      const cleanSubreddit = subreddit.replace(/^r\//, '');

      const { data: redditData, error } = await supabase.functions.invoke('reddit-scraper', {
        body: { 
          subreddit: cleanSubreddit,
          type: 'community'
        }
      });

      if (error) throw error;

      if (redditData?.error === 'not_found') {
        toast({
          title: "Subreddit Not Found",
          description: redditData.message,
          variant: "destructive",
        });
        setIsLoading(false);
        return;
      }

      const subredditInfo = redditData.subreddit;
      const posts = redditData.posts || [];

      // Analyze content for sentiment
      let sentimentData = null;
      let postSentiments: SentimentItem[] = [];
      
      try {
        const { data: analysisData, error: analysisError } = await supabase.functions.invoke('analyze-content', {
          body: {
            posts: posts.slice(0, 20),
            comments: []
          }
        });

        if (!analysisError && analysisData) {
          if (analysisData.sentiment?.postBreakdown) {
            const breakdown = analysisData.sentiment.postBreakdown;
            sentimentData = {
              positive: Math.round((breakdown.positive || 0) * 100),
              neutral: Math.round((breakdown.neutral || 0) * 100),
              negative: Math.round((breakdown.negative || 0) * 100)
            };
          }
          postSentiments = analysisData.postSentiments || [];
        }
      } catch (sentimentErr) {
        console.error('Sentiment analysis error:', sentimentErr);
      }

      // Generate word cloud from posts
      const textContent = posts.map((p: any) => `${p.title} ${p.selftext || ''}`).join(' ');
      const words = textContent.toLowerCase().match(/\b[a-z]{4,}\b/g) || [];
      const wordFreq: { [key: string]: number } = {};
      const stopWords = ['that', 'this', 'with', 'from', 'have', 'been', 'will', 'your', 'their', 'what', 'when', 'where', 'just', 'like', 'more', 'would', 'could', 'should', 'about', 'there', 'which', 'them', 'these', 'than', 'then', 'also', 'only'];
      words.forEach(word => {
        if (!stopWords.includes(word)) {
          wordFreq[word] = (wordFreq[word] || 0) + 1;
        }
      });

      const wordCloudData = Object.entries(wordFreq)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 12)
        .map(([word, freq]) => ({
          word,
          frequency: freq,
          category: freq > 20 ? 'high' as const : freq > 10 ? 'medium' as const : 'low' as const
        }));

      // Calculate top authors
      const authorCounts: { [key: string]: number } = {};
      posts.forEach((post: any) => {
        if (post.author && post.author !== '[deleted]') {
          authorCounts[post.author] = (authorCounts[post.author] || 0) + 1;
        }
      });

      const topAuthors = Object.entries(authorCounts)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 5)
        .map(([username, posts]) => ({ username: `u/${username}`, posts }));

      // Calculate activity by day of week
      const dayActivity: { [key: string]: number } = { Mon: 0, Tue: 0, Wed: 0, Thu: 0, Fri: 0, Sat: 0, Sun: 0 };
      posts.forEach((post: any) => {
        const date = new Date(post.created_utc * 1000);
        const day = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][date.getDay()];
        dayActivity[day] = (dayActivity[day] || 0) + 1;
      });

      const activityData = Object.entries(dayActivity).map(([name, value]) => ({ name, value }));

      // Calculate engagement metrics
      const totalUpvotes = posts.reduce((sum: number, p: any) => sum + (p.score || 0), 0);
      const totalComments = posts.reduce((sum: number, p: any) => sum + (p.num_comments || 0), 0);

      // Prepare sentiment chart data
      const sentimentChartData = sentimentData ? [
        { name: 'Positive', value: sentimentData.positive || 0 },
        { name: 'Neutral', value: sentimentData.neutral || 0 },
        { name: 'Negative', value: sentimentData.negative || 0 }
      ] : null;

      const analysisResult = {
        name: subredditInfo.display_name_prefixed || `r/${cleanSubreddit}`,
        subscribers: subredditInfo.subscribers || 0,
        activeUsers: subredditInfo.accounts_active || 0,
        description: subredditInfo.public_description || subredditInfo.description || 'No description available',
        created: new Date(subredditInfo.created_utc * 1000).toLocaleDateString('en-US', { 
          year: 'numeric', 
          month: 'long', 
          day: 'numeric' 
        }),
        wordCloud: wordCloudData,
        topAuthors,
        activityData,
        recentPosts: posts.slice(0, 10),
        sentimentChartData,
        postSentiments,
        stats: {
          totalPosts: posts.length,
          totalUpvotes,
          totalComments,
          avgUpvotes: posts.length > 0 ? Math.round(totalUpvotes / posts.length) : 0
        }
      };

      setCommunityData(analysisResult);
      
      // Save to investigation context
      const analysisToSave = { ...analysisResult, analyzedAt: new Date().toISOString() };
      addCommunityAnalysis(analysisToSave);
      
      // Save to database if active case
      if (currentCase?.id) {
        try { await saveCommunityAnalysisToDb(analysisToSave); } catch (e) { console.error(e); }
      }

      toast({
        title: "Community Analysis Complete",
        description: `Successfully analyzed r/${cleanSubreddit}`,
      });

    } catch (err: any) {
      console.error('Error in community analysis:', err);
      toast({
        title: "Analysis Failed",
        description: err.message || 'Failed to analyze community',
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleLinkAnalysis = async () => {
    if (!username.trim()) return;
    
    setIsLoading(true);
    setLinkData(null);

    try {
      const cleanUsername = username.replace(/^u\//, '');

      const { data: redditData, error } = await supabase.functions.invoke('reddit-scraper', {
        body: { 
          username: cleanUsername,
          type: 'user'
        }
      });

      if (error) throw error;

      if (redditData?.error === 'not_found') {
        toast({
          title: "User Not Found",
          description: redditData.message,
          variant: "destructive",
        });
        setIsLoading(false);
        return;
      }

      const posts = redditData.posts || [];
      const comments = redditData.comments || [];
      const allContent = [...posts, ...comments];

      // Calculate subreddit activity
      const subredditActivity: { [key: string]: { posts: number; comments: number; totalScore: number } } = {};
      
      posts.forEach((post: any) => {
        if (!subredditActivity[post.subreddit]) {
          subredditActivity[post.subreddit] = { posts: 0, comments: 0, totalScore: 0 };
        }
        subredditActivity[post.subreddit].posts++;
        subredditActivity[post.subreddit].totalScore += post.score || 0;
      });

      comments.forEach((comment: any) => {
        if (!subredditActivity[comment.subreddit]) {
          subredditActivity[comment.subreddit] = { posts: 0, comments: 0, totalScore: 0 };
        }
        subredditActivity[comment.subreddit].comments++;
        subredditActivity[comment.subreddit].totalScore += comment.score || 0;
      });

      // Sort by total activity
      const sortedSubreddits = Object.entries(subredditActivity)
        .map(([name, data]) => ({
          community: `r/${name}`,
          posts: data.posts,
          comments: data.comments,
          totalActivity: data.posts + data.comments,
          engagement: data.totalScore,
          activity: Math.min(100, Math.round((data.posts + data.comments) / allContent.length * 100 * 3))
        }))
        .sort((a, b) => b.totalActivity - a.totalActivity);

      // Build community crossover from actual Reddit related communities data
      const communityCrossover: { from: string; to: string; strength: number; relationType: string }[] = [];
      const communityRelations = redditData.communityRelations || [];
      
      // Use real community relations from Reddit API (sidebar related subreddits)
      communityRelations.forEach((relation: { subreddit: string; relatedTo: string[] }) => {
        relation.relatedTo.forEach((relatedSub: string, index: number) => {
          // Calculate strength based on position (higher position = stronger connection)
          const strength = Math.max(20, 100 - (index * 15));
          communityCrossover.push({
            from: `r/${relation.subreddit}`,
            to: `r/${relatedSub}`,
            strength,
            relationType: 'sidebar'
          });
        });
      });

      // If no sidebar relations found, calculate based on user's co-activity patterns
      if (communityCrossover.length === 0) {
        const topCommunities = sortedSubreddits.slice(0, 5);
        for (let i = 0; i < Math.min(3, topCommunities.length); i++) {
          for (let j = i + 1; j < Math.min(4, topCommunities.length); j++) {
            const strength = Math.round(
              ((topCommunities[i].totalActivity + topCommunities[j].totalActivity) / 
              (allContent.length || 1)) * 100
            );
            communityCrossover.push({
              from: topCommunities[i].community,
              to: topCommunities[j].community,
              strength: Math.min(100, strength),
              relationType: 'user-activity'
            });
          }
        }
      }

      // Community distribution for chart
      const communityDistribution = sortedSubreddits.slice(0, 6).map(s => ({
        name: s.community,
        value: s.totalActivity
      }));

      const analysisResult = {
        primaryUser: cleanUsername,
        totalKarma: (redditData.user?.link_karma || 0) + (redditData.user?.comment_karma || 0),
        userToCommunities: sortedSubreddits.slice(0, 5),
        communityCrossover: communityCrossover.slice(0, 8),
        communityDistribution,
        communityRelations,
        networkMetrics: {
          totalCommunities: Object.keys(subredditActivity).length,
          avgActivityScore: allContent.length > 0 
            ? Math.round(allContent.reduce((sum, item) => sum + (item.score || 0), 0) / allContent.length)
            : 0,
          crossCommunityLinks: communityCrossover.length,
          totalPosts: posts.length,
          totalComments: comments.length
        }
      };

      setLinkData(analysisResult);
      
      // Save to investigation context
      const analysisToSave = { ...analysisResult, analyzedAt: new Date().toISOString() };
      addLinkAnalysis(analysisToSave);
      
      // Save to database if active case
      if (currentCase?.id) {
        try { await saveLinkAnalysisToDb(analysisToSave); } catch (e) { console.error(e); }
      }

      toast({
        title: "Link Analysis Complete",
        description: `Analyzed ${Object.keys(subredditActivity).length} community connections for u/${cleanUsername}`,
      });

    } catch (err: any) {
      console.error('Error in link analysis:', err);
      toast({
        title: "Analysis Failed",
        description: err.message || 'Failed to analyze user links',
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-foreground mb-2">Analysis Tools</h2>
        <p className="text-muted-foreground">Comprehensive analysis across different dimensions</p>
      </div>

      <Tabs value={activeTab} onValueChange={(v) => { setActiveTab(v); setKeywordData(null); setCommunityData(null); setLinkData(null); }} className="w-full">
        <TabsList className="grid w-full grid-cols-3 mb-6">
          <TabsTrigger value="keyword" className="data-[state=active]:bg-forensic-accent/20 data-[state=active]:text-forensic-accent">
            <TrendingUp className="h-4 w-4 mr-2" />
            Keyword Analysis
          </TabsTrigger>
          <TabsTrigger value="community" className="data-[state=active]:bg-forensic-accent/20 data-[state=active]:text-forensic-accent">
            <Users className="h-4 w-4 mr-2" />
            Community Analysis
          </TabsTrigger>
          <TabsTrigger value="link" className="data-[state=active]:bg-forensic-accent/20 data-[state=active]:text-forensic-accent">
            <Network className="h-4 w-4 mr-2" />
            Link Analysis
          </TabsTrigger>
        </TabsList>

        {/* Keyword Analysis Tab */}
        <TabsContent value="keyword" className="space-y-6">
          <Card className="border-primary/20 shadow-glow">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <BarChart3 className="h-5 w-5 text-primary" />
                <span>Analyze Keyword</span>
              </CardTitle>
              <CardDescription>Search for keywords across Reddit's front page posts</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="keyword">Keyword to Analyze</Label>
                <div className="relative">
                  <Input
                    id="keyword"
                    placeholder="Enter keyword (e.g., AI, crypto, gaming)"
                    value={keyword}
                    onChange={(e) => setKeyword(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleKeywordAnalysis()}
                    className="pr-20"
                  />
                  {keyword && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="absolute right-10 top-1/2 -translate-y-1/2 h-7 w-7"
                      onClick={() => setKeyword('')}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute right-2 top-1/2 -translate-y-1/2 h-7 w-7"
                    onClick={handleKeywordAnalysis}
                    disabled={isLoading || !keyword.trim()}
                  >
                    <Search className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {keywordData && (
            <>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card className="border-primary/20 shadow-glow">
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <BarChart3 className="h-5 w-5 text-primary" />
                      <span>Keyword Overview: "{keywordData.keyword}"</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-center p-6 rounded-lg bg-primary/10 border border-primary/30">
                      <div className="text-4xl font-bold text-primary">{keywordData.totalMentions}</div>
                      <p className="text-muted-foreground">Mentions Found</p>
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-primary/20 shadow-glow">
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <Users className="h-5 w-5 text-primary" />
                      <span>Top Subreddits</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {keywordData.topSubreddits.length > 0 ? (
                        keywordData.topSubreddits.map((sub: any, index: number) => (
                          <div key={index} className="flex justify-between items-center p-3 rounded-lg bg-card border border-border">
                            <span className="font-medium">{sub.name}</span>
                            <Badge variant="secondary">{sub.mentions} mentions</Badge>
                          </div>
                        ))
                      ) : (
                        <p className="text-muted-foreground text-center py-4">No subreddit data available</p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Recent Posts */}
              {keywordData.recentPosts && keywordData.recentPosts.length > 0 && (
                <Card className="border-primary/20 shadow-glow">
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <MessageSquare className="h-5 w-5 text-primary" />
                      <span>Recent Posts Mentioning "{keywordData.keyword}"</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {keywordData.recentPosts.map((post: any, index: number) => (
                      <div key={index} className="border border-border/50 rounded-lg p-3 space-y-2">
                        <h4 className="font-medium text-sm leading-tight">{post.title}</h4>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <Clock className="h-3 w-3" />
                          <span>{formatActivityTime(post.created_utc)}</span>
                        </div>
                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                          <span>r/{post.subreddit} • by u/{post.author}</span>
                          <Badge variant="secondary" className="text-xs">▲ {post.score}</Badge>
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              )}

              {/* Sentiment Analysis Table for Keywords */}
              {keywordData.postSentiments && keywordData.postSentiments.length > 0 && (
                <Card className="border-primary/20 shadow-glow">
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <MessageSquare className="h-5 w-5 text-primary" />
                      <span>Post Sentiment Analysis (AI-Powered)</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="overflow-x-auto">
                      <table className="w-full border-collapse">
                        <thead>
                          <tr className="border-b">
                            <th className="text-left p-3 font-semibold">Post</th>
                            <th className="text-left p-3 font-semibold w-32">Sentiment</th>
                            <th className="text-left p-3 font-semibold">Explanation (XAI)</th>
                          </tr>
                        </thead>
                        <tbody>
                          {keywordData.postSentiments.map((item: SentimentItem, index: number) => (
                            <tr key={index} className="border-b hover:bg-muted/50">
                              <td className="p-3 text-sm">{item.text}</td>
                              <td className="p-3">{getSentimentBadge(item.sentiment)}</td>
                              <td className="p-3 text-sm text-muted-foreground">{item.explanation}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </CardContent>
                </Card>
              )}

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {keywordData.wordCloud && keywordData.wordCloud.length > 0 && (
                  <WordCloud words={keywordData.wordCloud} title="Related Keywords" />
                )}
                {keywordData.trendData && keywordData.trendData.length > 0 && (
                  <AnalyticsChart 
                    data={keywordData.trendData} 
                    title="Mention Trends" 
                    type="bar" 
                    height={250}
                  />
                )}
                {keywordData.sentimentChartData && (
                  <AnalyticsChart 
                    data={keywordData.sentimentChartData} 
                    title="Keyword Sentiment Analysis" 
                    type="pie" 
                    height={250}
                  />
                )}
              </div>
            </>
          )}

          {!keywordData && !isLoading && (
            <Card className="border-dashed border-muted-foreground/30">
              <CardContent className="py-12 text-center">
                <BarChart3 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">Enter a keyword to perform detailed analysis</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Community Analysis Tab */}
        <TabsContent value="community" className="space-y-6">
          <Card className="border-primary/20 border-forensic-accent/30 shadow-[0_0_20px_rgba(0,255,198,0.15)]">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5 text-forensic-accent" />
                Community Search
              </CardTitle>
              <CardDescription>
                Enter a subreddit name to analyze (e.g., "technology", "AskReddit")
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">r/</span>
                <Input
                  placeholder="subreddit name"
                  value={subreddit}
                  onChange={(e) => setSubreddit(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleCommunityAnalysis()}
                  className="pl-8 pr-20"
                />
                {subreddit && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute right-10 top-1/2 -translate-y-1/2 h-7 w-7"
                    onClick={() => setSubreddit('')}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute right-2 top-1/2 -translate-y-1/2 h-7 w-7"
                  onClick={handleCommunityAnalysis}
                  disabled={isLoading || !subreddit.trim()}
                >
                  <Search className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>

          {communityData && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Community Information */}
                <Card className="border-primary/20 border-forensic-accent/30 shadow-[0_0_20px_rgba(0,255,198,0.15)]">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Shield className="h-5 w-5 text-forensic-accent" />
                      Community Information
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <h3 className="font-semibold text-lg">{communityData.name}</h3>
                      <Badge variant="secondary" className="mt-1">
                        {communityData.subscribers.toLocaleString()} members
                      </Badge>
                      {communityData.activeUsers > 0 && (
                        <Badge variant="outline" className="ml-2 mt-1">
                          {communityData.activeUsers.toLocaleString()} online
                        </Badge>
                      )}
                    </div>
                    
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Calendar className="h-4 w-4" />
                      Created: {communityData.created}
                    </div>

                    <Separator />

                    <div>
                      <h4 className="font-medium mb-2">Description</h4>
                      <p className="text-sm text-muted-foreground line-clamp-3">
                        {communityData.description}
                      </p>
                    </div>

                    <Separator />

                    <div className="grid grid-cols-2 gap-3">
                      <div className="text-center p-3 rounded-lg bg-primary/10 border border-primary/30">
                        <div className="font-bold text-primary">{communityData.stats.totalPosts}</div>
                        <p className="text-xs text-muted-foreground">Recent Posts</p>
                      </div>
                      <div className="text-center p-3 rounded-lg bg-forensic-accent/10 border border-forensic-accent/30">
                        <div className="font-bold text-forensic-accent">{communityData.stats.avgUpvotes}</div>
                        <p className="text-xs text-muted-foreground">Avg Upvotes</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Top Authors */}
                <Card className="border-primary/20 border-forensic-accent/30 shadow-[0_0_20px_rgba(0,255,198,0.15)]">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Users className="h-5 w-5 text-forensic-accent" />
                      Top Contributors
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {communityData.topAuthors.length > 0 ? (
                      communityData.topAuthors.map((author: any, index: number) => (
                        <div key={index} className="flex justify-between items-center p-3 rounded-lg bg-card border border-border">
                          <span className="font-medium">{author.username}</span>
                          <Badge variant="secondary">{author.posts} posts</Badge>
                        </div>
                      ))
                    ) : (
                      <p className="text-muted-foreground text-center py-4">No author data available</p>
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* Recent Posts */}
              <Card className="border-primary/20 border-forensic-accent/30 shadow-[0_0_20px_rgba(0,255,198,0.15)]">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <MessageSquare className="h-5 w-5 text-forensic-accent" />
                    Recent Posts
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {communityData.recentPosts.map((post: any, index: number) => (
                    <div key={index} className="border border-border/50 rounded-lg p-3 space-y-2">
                      <h4 className="font-medium text-sm leading-tight">{post.title}</h4>
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span>by u/{post.author}</span>
                        <div className="flex gap-2">
                          <Badge variant="secondary" className="text-xs">▲ {post.score}</Badge>
                          <Badge variant="outline" className="text-xs">{post.num_comments} comments</Badge>
                        </div>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>

              {/* Sentiment Analysis Table for Community */}
              {communityData.postSentiments && communityData.postSentiments.length > 0 && (
                <Card className="border-primary/20 border-forensic-accent/30 shadow-[0_0_20px_rgba(0,255,198,0.15)]">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <MessageSquare className="h-5 w-5 text-forensic-accent" />
                      Post Sentiment Analysis (AI-Powered)
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="overflow-x-auto">
                      <table className="w-full border-collapse">
                        <thead>
                          <tr className="border-b">
                            <th className="text-left p-3 font-semibold">Post</th>
                            <th className="text-left p-3 font-semibold w-32">Sentiment</th>
                            <th className="text-left p-3 font-semibold">Explanation (XAI)</th>
                          </tr>
                        </thead>
                        <tbody>
                          {communityData.postSentiments.map((item: SentimentItem, index: number) => (
                            <tr key={index} className="border-b hover:bg-muted/50">
                              <td className="p-3 text-sm">{item.text}</td>
                              <td className="p-3">{getSentimentBadge(item.sentiment)}</td>
                              <td className="p-3 text-sm text-muted-foreground">{item.explanation}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Community Analytics */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {communityData.wordCloud && communityData.wordCloud.length > 0 && (
                  <WordCloud words={communityData.wordCloud} title="Popular Topics" />
                )}
                {communityData.activityData && (
                  <AnalyticsChart 
                    data={communityData.activityData} 
                    title="Post Frequency by Day" 
                    type="bar" 
                    height={250}
                  />
                )}
                {communityData.sentimentChartData && (
                  <AnalyticsChart 
                    data={communityData.sentimentChartData} 
                    title="Community Sentiment Analysis" 
                    type="pie" 
                    height={250}
                  />
                )}
              </div>
            </div>
          )}

          {!communityData && !isLoading && (
            <Card className="border-dashed border-muted-foreground/30">
              <CardContent className="py-12 text-center">
                <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">Enter a subreddit name above to begin community analysis</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Link Analysis Tab */}
        <TabsContent value="link" className="space-y-6">
          <Card className="border-primary/20 shadow-glow">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Network className="h-5 w-5 text-primary" />
                <span>User to Community Link Analysis</span>
              </CardTitle>
              <CardDescription>Discover a user's community connections and cross-community activity</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="link-username">Reddit Username</Label>
                <div className="relative">
                  <Input
                    id="link-username"
                    placeholder="Enter username (e.g., spez)"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleLinkAnalysis()}
                    className="pr-20"
                  />
                  {username && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="absolute right-10 top-1/2 -translate-y-1/2 h-7 w-7"
                      onClick={() => setUsername('')}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute right-2 top-1/2 -translate-y-1/2 h-7 w-7"
                    onClick={handleLinkAnalysis}
                    disabled={isLoading || !username.trim()}
                  >
                    <Search className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {linkData && (
            <div className="space-y-6">
              <Card className="border-primary/20 shadow-glow">
                <CardHeader>
                  <CardTitle>Network Overview - u/{linkData.primaryUser}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                    <div className="text-center p-4 rounded-lg bg-primary/10 border border-primary/30">
                      <Share2 className="h-6 w-6 text-primary mx-auto mb-2" />
                      <div className="font-bold text-primary">{linkData.networkMetrics.totalCommunities}</div>
                      <p className="text-sm text-muted-foreground">Communities</p>
                    </div>
                    <div className="text-center p-4 rounded-lg bg-forensic-accent/10 border border-forensic-accent/30">
                      <Network className="h-6 w-6 text-forensic-accent mx-auto mb-2" />
                      <div className="font-bold text-forensic-accent">{linkData.networkMetrics.crossCommunityLinks}</div>
                      <p className="text-sm text-muted-foreground">Cross-Links</p>
                    </div>
                    <div className="text-center p-4 rounded-lg bg-card border border-border">
                      <div className="font-bold text-foreground">{linkData.networkMetrics.totalPosts}</div>
                      <p className="text-sm text-muted-foreground">Total Posts</p>
                    </div>
                    <div className="text-center p-4 rounded-lg bg-card border border-border">
                      <div className="font-bold text-foreground">{linkData.networkMetrics.totalComments}</div>
                      <p className="text-sm text-muted-foreground">Total Comments</p>
                    </div>
                    <div className="text-center p-4 rounded-lg bg-card border border-border">
                      <div className="font-bold text-foreground">{linkData.totalKarma.toLocaleString()}</div>
                      <p className="text-sm text-muted-foreground">Total Karma</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* User to Communities */}
                <Card className="border-primary/20 shadow-glow">
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <Share2 className="h-5 w-5 text-primary" />
                      <span>Community Connections</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {linkData.userToCommunities.map((item: any, index: number) => (
                        <div key={index} className="p-3 rounded-lg border border-border">
                          <div className="flex justify-between items-center mb-2">
                            <span className="font-medium">{item.community}</span>
                            <Badge variant="secondary">{item.totalActivity} activities</Badge>
                          </div>
                          <div className="flex gap-2 text-xs text-muted-foreground">
                            <span>{item.posts} posts</span>
                            <span>•</span>
                            <span>{item.comments} comments</span>
                            <span>•</span>
                            <span>▲ {item.engagement}</span>
                          </div>
                          <div className="mt-2 h-2 bg-muted rounded-full overflow-hidden">
                            <div 
                              className="h-full bg-primary rounded-full transition-all"
                              style={{ width: `${item.activity}%` }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                {/* Community Crossover */}
                <Card className="border-primary/20 shadow-glow">
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <Network className="h-5 w-5 text-primary" />
                      <span>Community Crossover</span>
                    </CardTitle>
                    <CardDescription>Communities connected to other communities (from subreddit sidebars)</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {linkData.communityCrossover.length > 0 ? (
                        linkData.communityCrossover.map((item: any, index: number) => (
                          <div key={index} className="p-3 rounded-lg border border-border">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <Badge variant="outline" className="bg-primary/10">{item.from}</Badge>
                                <span className="text-muted-foreground">→</span>
                                <Badge variant="outline" className="bg-forensic-accent/10">{item.to}</Badge>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="text-xs text-muted-foreground">
                                  {item.relationType === 'sidebar' ? 'Related' : 'Co-activity'}
                                </span>
                                <span className="text-sm font-medium">{item.strength}%</span>
                              </div>
                            </div>
                            <div className="mt-2 h-2 bg-muted rounded-full overflow-hidden">
                              <div 
                                className="h-full bg-forensic-accent rounded-full transition-all"
                                style={{ width: `${item.strength}%` }}
                              />
                            </div>
                          </div>
                        ))
                      ) : (
                        <p className="text-muted-foreground text-center py-4">No related communities found in subreddit sidebars</p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Community Distribution Pie Chart */}
              {linkData.communityDistribution && linkData.communityDistribution.length > 0 && (
                <AnalyticsChart 
                  data={linkData.communityDistribution} 
                  title="Community Distribution" 
                  type="pie" 
                  height={300}
                />
              )}

              {/* Beautiful Network Graph Visualization */}
              <UserCommunityNetworkGraph
                title="User to Community Network Graph"
                primaryUserId="user1"
                nodes={(() => {
                  // Build nodes: user + their communities + interests (from crossover destinations)
                  const userNode = { id: 'user1', label: `u/${linkData.primaryUser}`, type: 'user' as const };
                  
                  const communityNodes = linkData.userToCommunities.slice(0, 6).map((item: any, index: number) => ({
                    id: `community-${index}`,
                    label: item.community,
                    type: 'community' as const
                  }));
                  
                  // Build interests from both communityRelations and communityCrossover
                  const userCommunityNames = linkData.userToCommunities.map((c: any) => c.community);
                  const interestSet = new Set<string>();
                  
                  // Use communityRelations if available (live data from Reddit sidebar)
                  if (linkData.communityRelations && linkData.communityRelations.length > 0) {
                    linkData.communityRelations.forEach((rel: { subreddit: string; relatedTo: string[] }) => {
                      (rel.relatedTo || []).forEach((related: string) => {
                        const formattedRelated = related.startsWith('r/') ? related : `r/${related}`;
                        if (!userCommunityNames.includes(formattedRelated) && !userCommunityNames.includes(related)) {
                          interestSet.add(formattedRelated);
                        }
                      });
                    });
                  }
                  
                  // Also use communityCrossover destinations as interests
                  linkData.communityCrossover.forEach((item: any) => {
                    const toFormatted = item.to.startsWith('r/') ? item.to : `r/${item.to}`;
                    if (!userCommunityNames.includes(toFormatted) && !userCommunityNames.includes(item.to)) {
                      interestSet.add(toFormatted);
                    }
                  });
                  
                  const interestNodes = Array.from(interestSet).slice(0, 8).map((name: string, index: number) => ({
                    id: `interest-${index}`,
                    label: name,
                    type: 'interest' as const
                  }));
                  
                  return [userNode, ...communityNodes, ...interestNodes];
                })()}
                links={(() => {
                  // User to their communities
                  const userLinks = linkData.userToCommunities.slice(0, 6).map((item: any, index: number) => ({
                    source: 'user1',
                    target: `community-${index}`,
                    weight: Math.min(4, Math.ceil(item.totalActivity / 10))
                  }));
                  
                  // Build the interest list the same way as nodes
                  const userCommunityNames = linkData.userToCommunities.map((c: any) => c.community);
                  const interestSet = new Set<string>();
                  
                  if (linkData.communityRelations && linkData.communityRelations.length > 0) {
                    linkData.communityRelations.forEach((rel: { subreddit: string; relatedTo: string[] }) => {
                      (rel.relatedTo || []).forEach((related: string) => {
                        const formattedRelated = related.startsWith('r/') ? related : `r/${related}`;
                        if (!userCommunityNames.includes(formattedRelated) && !userCommunityNames.includes(related)) {
                          interestSet.add(formattedRelated);
                        }
                      });
                    });
                  }
                  
                  linkData.communityCrossover.forEach((item: any) => {
                    const toFormatted = item.to.startsWith('r/') ? item.to : `r/${item.to}`;
                    if (!userCommunityNames.includes(toFormatted) && !userCommunityNames.includes(item.to)) {
                      interestSet.add(toFormatted);
                    }
                  });
                  
                  const interestList = Array.from(interestSet).slice(0, 8);
                  
                  // Community to interest links from communityRelations (live)
                  const crossoverLinks: { source: string; target: string; weight: number }[] = [];
                  
                  if (linkData.communityRelations && linkData.communityRelations.length > 0) {
                    linkData.communityRelations.forEach((rel: { subreddit: string; relatedTo: string[] }) => {
                      const fromCommunity = rel.subreddit.startsWith('r/') ? rel.subreddit : `r/${rel.subreddit}`;
                      const fromIdx = linkData.userToCommunities.findIndex((c: any) => c.community === fromCommunity);
                      
                      if (fromIdx !== -1) {
                        (rel.relatedTo || []).forEach((related: string, relIdx: number) => {
                          const formattedRelated = related.startsWith('r/') ? related : `r/${related}`;
                          const toIdx = interestList.indexOf(formattedRelated);
                          
                          if (toIdx !== -1) {
                            crossoverLinks.push({
                              source: `community-${fromIdx}`,
                              target: `interest-${toIdx}`,
                              weight: Math.max(1, 3 - relIdx)
                            });
                          }
                        });
                      }
                    });
                  }
                  
                  // Community to interest links from communityCrossover
                  linkData.communityCrossover.forEach((item: any) => {
                    const fromCommunity = item.from.startsWith('r/') ? item.from : `r/${item.from}`;
                    const toCommunity = item.to.startsWith('r/') ? item.to : `r/${item.to}`;
                    
                    const fromIdx = linkData.userToCommunities.findIndex((c: any) => 
                      c.community === fromCommunity || c.community === item.from
                    );
                    const toIdx = interestList.indexOf(toCommunity);
                    
                    // Only add if this link doesn't already exist
                    if (fromIdx !== -1 && toIdx !== -1) {
                      const exists = crossoverLinks.some(l => 
                        l.source === `community-${fromIdx}` && l.target === `interest-${toIdx}`
                      );
                      if (!exists) {
                        crossoverLinks.push({
                          source: `community-${fromIdx}`,
                          target: `interest-${toIdx}`,
                          weight: Math.ceil(item.strength / 30)
                        });
                      }
                    }
                  });
                  
                  return [...userLinks, ...crossoverLinks];
                })()}
              />
            </div>
          )}

          {!linkData && !isLoading && (
            <Card className="border-dashed border-muted-foreground/30">
              <CardContent className="py-12 text-center">
                <Network className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">Enter a username to analyze their community connections</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Analysis;
