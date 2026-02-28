import { useState, useEffect, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { BarChart3, MapPin, Calendar, Users, Network, Share2, AlertTriangle, TrendingUp, Search, Shield, MessageSquare, Clock, X, Loader2, ExternalLink, Eye, UserPlus, MoreVertical, ArrowLeft } from 'lucide-react';
import { WordCloud } from '@/components/WordCloud';
import { AnalyticsChart } from '@/components/AnalyticsChart';
import { UserCommunityNetworkGraph } from '@/components/UserCommunityNetworkGraph';
import { SavedAnalysisCard } from '@/components/SavedAnalysisCard';
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
  const navigate = useNavigate();
  const [keyword, setKeyword] = useState('');
  const [username, setUsername] = useState('');
  const [subreddit, setSubreddit] = useState('');
  const [keywordData, setKeywordData] = useState<any>(null);
  const [communityData, setCommunityData] = useState<any>(null);
  const [linkData, setLinkData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('keyword');
  const [visibleCommunities, setVisibleCommunities] = useState(5);
  const { toast } = useToast();
  const { addKeywordAnalysis, addCommunityAnalysis, addLinkAnalysis, saveKeywordAnalysisToDb, saveCommunityAnalysisToDb, saveLinkAnalysisToDb, currentCase } = useInvestigation();

  const [savedKeyword, setSavedKeyword] = useState<any[]>([]);
  const [savedCommunity, setSavedCommunity] = useState<any[]>([]);
  const [savedLink, setSavedLink] = useState<any[]>([]);
  const [previewPost, setPreviewPost] = useState<any>(null);

  const fetchSavedAnalyses = useCallback(async () => {
    if (!currentCase?.id) { setSavedKeyword([]); setSavedCommunity([]); setSavedLink([]); return; }
    try {
      const { data } = await supabase
        .from('analysis_results')
        .select('id, analysis_type, target, result_data, analyzed_at')
        .eq('case_id', currentCase.id)
        .order('analyzed_at', { ascending: false });
      if (data) {
        setSavedKeyword(data.filter(d => d.analysis_type === 'keyword'));
        setSavedCommunity(data.filter(d => d.analysis_type === 'community'));
        setSavedLink(data.filter(d => d.analysis_type === 'link'));
      }
    } catch { /* ignore */ }
  }, [currentCase?.id]);

  useEffect(() => { fetchSavedAnalyses(); }, [fetchSavedAnalyses]);

  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail?.caseId === currentCase?.id && ['keywordAnalyses', 'communityAnalyses', 'linkAnalyses'].includes(detail?.kind)) {
        fetchSavedAnalyses();
      }
    };
    window.addEventListener('case-data-updated', handler);
    return () => window.removeEventListener('case-data-updated', handler);
  }, [currentCase?.id, fetchSavedAnalyses]);

  const loadSavedAnalysis = async (item: any) => {
    setIsLoading(true);
    try {
      const rd = item.result_data as any;
      if (item.analysis_type === 'keyword') {
        setActiveTab('keyword');
        setKeyword(item.target);
        setKeywordData(rd);
      } else if (item.analysis_type === 'community') {
        setActiveTab('community');
        setSubreddit(item.target);
        setCommunityData(rd);
      } else if (item.analysis_type === 'link') {
        setActiveTab('link');
        setUsername(item.target);
        setLinkData(rd);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const deleteSavedAnalysis = async (id: string, type: string) => {
    try {
      const { error: err } = await supabase
        .from('analysis_results')
        .delete()
        .eq('id', id);
      if (err) throw err;
      if (type === 'keyword') setSavedKeyword(prev => prev.filter(i => i.id !== id));
      else if (type === 'community') setSavedCommunity(prev => prev.filter(i => i.id !== id));
      else if (type === 'link') setSavedLink(prev => prev.filter(i => i.id !== id));
      toast({ title: 'Analysis removed', description: 'Saved analysis has been deleted' });
    } catch (e: any) {
      toast({ title: 'Delete failed', description: e?.message || 'Could not delete analysis', variant: 'destructive' });
    }
  };

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
        .slice(0, 60)
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
        .slice(0, 60)
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

      // Calculate activity by day of week with dates
      const now = new Date();
      const dayActivityMap: { [key: string]: { count: number; label: string } } = {};
      
      // Initialize last 7 days with dates
      for (let i = 6; i >= 0; i--) {
        const date = new Date(now);
        date.setDate(date.getDate() - i);
        const dayKey = date.toISOString().split('T')[0]; // YYYY-MM-DD
        const dayName = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][date.getDay()];
        const formattedDate = `${dayName}, ${date.getDate().toString().padStart(2, '0')}-${(date.getMonth() + 1).toString().padStart(2, '0')}-${date.getFullYear()}`;
        dayActivityMap[dayKey] = { count: 0, label: formattedDate };
      }
      
      posts.forEach((post: any) => {
        const postDate = new Date(post.created_utc * 1000);
        const dayKey = postDate.toISOString().split('T')[0];
        if (dayActivityMap[dayKey]) {
          dayActivityMap[dayKey].count++;
        }
      });

      const activityData = Object.values(dayActivityMap).map(({ label, count }) => ({ name: label, value: count }));

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
        iconImg: subredditInfo.icon_img || subredditInfo.community_icon?.split('?')[0] || '',
        bannerImg: subredditInfo.banner_background_image?.split('?')[0] || subredditInfo.banner_img || '',
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
    setVisibleCommunities(5);

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

      // Community distribution for chart
      const communityDistribution = sortedSubreddits.slice(0, 10).map(s => ({
        name: s.community,
        value: s.totalActivity
      }));

      // Calculate relative activity percentage
      const maxAct = sortedSubreddits[0]?.totalActivity || 1;
      sortedSubreddits.forEach(s => {
        s.activity = Math.round((s.totalActivity / maxAct) * 100);
      });

      const analysisResult = {
        primaryUser: cleanUsername,
        totalKarma: (redditData.user?.link_karma || 0) + (redditData.user?.comment_karma || 0),
        userToCommunities: sortedSubreddits,
        communityDistribution,
        networkMetrics: {
          totalCommunities: Object.keys(subredditActivity).length,
          avgActivityScore: allContent.length > 0 
            ? Math.round(allContent.reduce((sum, item) => sum + (item.score || 0), 0) / allContent.length)
            : 0,
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
    <div className="p-6 space-y-6 relative">
      {isLoading && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/60">
          <div className="flex flex-col items-center gap-3 bg-card border border-border rounded-xl shadow-2xl px-8 py-6">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-sm font-medium text-foreground">Analyzing data...</p>
          </div>
        </div>
      )}
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
              <Button variant="ghost" size="sm" className="gap-2" onClick={() => setKeywordData(null)}>
                <ArrowLeft className="h-4 w-4" />
                Back to Keyword Analysis Overview
              </Button>
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
                          <a
                            key={index}
                            href={`https://www.reddit.com/${sub.name}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex justify-between items-center p-3 rounded-lg bg-card border border-border hover:border-primary/50 hover:bg-muted/30 transition-all cursor-pointer group"
                          >
                            <span className="font-medium group-hover:text-primary transition-colors flex items-center gap-1.5">
                              {sub.name}
                              <ExternalLink className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                            </span>
                            <Badge variant="secondary">{sub.mentions} mentions</Badge>
                          </a>
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
                      <div
                        key={index}
                        className="border border-border/50 rounded-lg p-3 space-y-2 hover:border-primary/50 hover:bg-muted/30 transition-all cursor-pointer group"
                        onClick={() => setPreviewPost({
                          title: post.title,
                          body: post.selftext || post.body || post.content || '',
                          subreddit: `r/${post.subreddit}`,
                          author: post.author,
                          timestamp: formatActivityTime(post.created_utc),
                          score: post.score,
                          url: post.permalink ? `https://www.reddit.com${post.permalink}` : `https://www.reddit.com/r/${post.subreddit}`,
                          type: 'post',
                        })}
                      >
                        <h4 className="font-medium text-sm leading-tight group-hover:text-primary transition-colors flex items-center gap-1.5">
                          {post.title}
                          <ExternalLink className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                        </h4>
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
            <div className="space-y-4">
              {savedKeyword.length > 0 && (
                <>
                  <h3 className="text-sm font-medium text-muted-foreground">Previously Analyzed Keywords</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {savedKeyword.map((item) => (
                      <SavedAnalysisCard
                        key={item.id}
                        title={item.target}
                        subtitle={`${((item.result_data as any)?.totalMentions ?? 0).toLocaleString()} mentions`}
                        analyzedAt={item.analyzed_at}
                        icon={BarChart3}
                        onClick={() => loadSavedAnalysis(item)}
                        onDelete={() => deleteSavedAnalysis(item.id, 'keyword')}
                      />
                    ))}
                  </div>
                </>
              )}
              <Card className="border-dashed border-muted-foreground/30">
                <CardContent className="py-12 text-center">
                  <BarChart3 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">Enter a keyword to perform detailed analysis</p>
                </CardContent>
              </Card>
            </div>
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
              <Button variant="ghost" size="sm" className="gap-2" onClick={() => setCommunityData(null)}>
                <ArrowLeft className="h-4 w-4" />
                Back to Community Analysis Overview
              </Button>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Community Information */}
                <Card className="border-primary/20 border-forensic-accent/30 shadow-[0_0_20px_rgba(0,255,198,0.15)] overflow-hidden">
                  {communityData.bannerImg && (
                    <div className="relative h-24 w-full bg-muted">
                      <img 
                        src={communityData.bannerImg} 
                        alt={`${communityData.name} banner`}
                        className="w-full h-full object-cover"
                        onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                      />
                    </div>
                  )}
                  <CardHeader className="relative">
                    <div className={`flex items-start gap-4 ${communityData.bannerImg ? '' : ''}`}>
                      {/* Community Avatar */}
                      <div className={`shrink-0 ${communityData.bannerImg ? '-mt-10' : ''}`}>
                        <div className="w-16 h-16 rounded-full border-4 border-card bg-card shadow-lg overflow-hidden">
                          {communityData.iconImg ? (
                            <img 
                              src={communityData.iconImg} 
                              alt={`${communityData.name} icon`}
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                (e.target as HTMLImageElement).parentElement!.innerHTML = `<div class="w-full h-full bg-primary/20 flex items-center justify-center"><span class="text-primary font-bold text-xl">r/</span></div>`;
                              }}
                            />
                          ) : (
                            <div className="w-full h-full bg-primary/20 flex items-center justify-center">
                              <Users className="h-6 w-6 text-primary" />
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="min-w-0 flex-1 pt-1">
                        <CardTitle className="flex items-center gap-2">
                          <a
                            href={`https://www.reddit.com/${communityData.name}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="hover:text-primary transition-colors flex items-center gap-1.5 group"
                          >
                            {communityData.name}
                            <ExternalLink className="h-3.5 w-3.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                          </a>
                        </CardTitle>
                        <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                          <Badge variant="secondary">
                            {communityData.subscribers.toLocaleString()} members
                          </Badge>
                          {communityData.activeUsers > 0 && (
                            <Badge variant="outline">
                              {communityData.activeUsers.toLocaleString()} online
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
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
                      communityData.topAuthors.map((author: any, index: number) => {
                        const cleanUsername = author.username.replace(/^u\//, '');
                        return (
                          <div key={index} className="flex justify-between items-center p-3 rounded-lg bg-card border border-border group">
                            <a
                              href={`https://www.reddit.com/user/${cleanUsername}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="font-medium hover:text-primary transition-colors flex items-center gap-1.5 cursor-pointer"
                            >
                              {author.username}
                              <ExternalLink className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                            </a>
                            <div className="flex items-center gap-2">
                              <Badge variant="secondary">{author.posts} posts</Badge>
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="icon" className="h-7 w-7">
                                    <MoreVertical className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem onClick={() => navigate('/monitoring', { state: { prefillUser: cleanUsername } })}>
                                    <Eye className="h-4 w-4 mr-2" />
                                    Add to Monitoring
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => navigate('/user-profiling', { state: { prefillUsername: cleanUsername } })}>
                                    <UserPlus className="h-4 w-4 mr-2" />
                                    Add to User Profiling
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </div>
                          </div>
                        );
                      })
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
                    <a
                      key={index}
                      href={post.permalink ? `https://www.reddit.com${post.permalink}` : `https://www.reddit.com/r/${subreddit.replace(/^r\//, '')}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block border border-border/50 rounded-lg p-3 space-y-2 hover:border-primary/50 hover:bg-muted/30 transition-all cursor-pointer group"
                    >
                      <h4 className="font-medium text-sm leading-tight group-hover:text-primary transition-colors flex items-center gap-1.5">
                        {post.title}
                        <ExternalLink className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                      </h4>
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span>by u/{post.author}</span>
                        <div className="flex gap-2">
                          <Badge variant="secondary" className="text-xs">▲ {post.score}</Badge>
                          <Badge variant="outline" className="text-xs">{post.num_comments} comments</Badge>
                        </div>
                      </div>
                    </a>
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
            <div className="space-y-4">
              {savedCommunity.length > 0 && (
                <>
                  <h3 className="text-sm font-medium text-muted-foreground">Previously Analyzed Communities</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {savedCommunity.map((item) => {
                      const rd = item.result_data as any;
                      const displayName = item.target?.startsWith('r/') ? item.target : `r/${item.target}`;
                      const subscribers = rd?.subscribers ?? 0;
                      const iconImg = rd?.iconImg || '';
                      return (
                        <Card key={item.id} className="overflow-hidden hover:scale-[1.02] hover:-translate-y-1 transition-all duration-300 cursor-pointer group border-border">
                          <div className="relative bg-gradient-to-br from-blue-500 via-indigo-500 to-purple-600 px-4 pt-4 pb-10">
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-white font-bold text-sm truncate">{displayName}</span>
                              <span className="flex items-center gap-1 text-white/90 text-[11px] font-semibold bg-white/20 rounded-full px-2 py-0.5 backdrop-blur-sm">
                                <Users className="h-3 w-3" />
                                {subscribers.toLocaleString()}
                              </span>
                            </div>
                            <p className="text-white/60 text-[10px]">{item.analyzed_at ? new Date(item.analyzed_at).toLocaleString() : ''}</p>
                          </div>
                          <div className="flex justify-center -mt-8 relative z-10">
                            <div className="w-16 h-16 rounded-full border-4 border-card bg-card shadow-lg overflow-hidden">
                              {iconImg ? (
                                <img src={iconImg} alt={displayName} className="w-full h-full object-cover" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; (e.target as HTMLImageElement).nextElementSibling && ((e.target as HTMLImageElement).nextElementSibling as HTMLElement).classList.remove('hidden'); }} />
                              ) : null}
                              <div className={`w-full h-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center ${iconImg ? 'hidden' : ''}`}>
                                <Users className="h-7 w-7 text-white" />
                              </div>
                            </div>
                          </div>
                          <CardContent className="pt-3 pb-3 text-center space-y-2">
                            <a href={`https://www.reddit.com/${displayName}`} target="_blank" rel="noopener noreferrer" className="font-semibold text-sm hover:text-primary transition-colors flex items-center justify-center gap-1" onClick={(e) => e.stopPropagation()}>
                              {displayName}
                              <ExternalLink className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                            </a>
                            <p className="text-xs text-muted-foreground">{subscribers.toLocaleString()} subscribers</p>
                            <div className="flex gap-2 pt-1">
                              <Button variant="outline" size="sm" className="flex-1 text-xs h-8" onClick={() => loadSavedAnalysis(item)}>
                                <Eye className="h-3 w-3 mr-1" /> View
                              </Button>
                              <Button variant="outline" size="sm" className="h-8 text-xs text-destructive hover:text-destructive" onClick={(e) => { e.stopPropagation(); deleteSavedAnalysis(item.id, 'community'); }}>
                                <X className="h-3 w-3" />
                              </Button>
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                </>
              )}
              <Card className="border-dashed border-muted-foreground/30">
                <CardContent className="py-12 text-center">
                  <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">Enter a subreddit name above to begin community analysis</p>
                </CardContent>
              </Card>
            </div>
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
              <Button variant="ghost" size="sm" className="gap-2" onClick={() => setLinkData(null)}>
                <ArrowLeft className="h-4 w-4" />
                Back to Link Analysis Overview
              </Button>
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
                      <div className="font-bold text-forensic-accent">{linkData.networkMetrics.avgActivityScore ?? 0}</div>
                      <p className="text-sm text-muted-foreground">Avg Score</p>
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

              <Card className="border-primary/20 shadow-glow">
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Share2 className="h-5 w-5 text-primary" />
                    <span>Community Activity ({(linkData.userToCommunities || []).length} communities)</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {linkData.userToCommunities.slice(0, visibleCommunities).map((item: any, index: number) => (
                      <div key={index} className="p-3 rounded-lg border border-border">
                        <div className="flex justify-between items-center mb-2">
                          <div>
                            <p className="font-medium">{item.community}</p>
                            <p className="text-xs text-muted-foreground">
                              {item.posts} posts • {item.comments} comments
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="font-bold text-primary">{item.totalActivity}</p>
                            <p className="text-xs text-muted-foreground">Activity</p>
                          </div>
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
                  {visibleCommunities < (linkData.userToCommunities || []).length && (
                    <div className="mt-4 text-center">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setVisibleCommunities(prev => prev + 10)}
                      >
                        See More ({(linkData.userToCommunities || []).length - visibleCommunities} remaining)
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>

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
                nodes={[
                  { id: 'user1', label: `u/${linkData.primaryUser}`, type: 'user' as const },
                  ...(linkData.userToCommunities || []).slice(0, 10).map((item: any, index: number) => ({
                    id: `community-${index}`,
                    label: item.community,
                    type: 'community' as const,
                  })),
                ]}
                links={(linkData.userToCommunities || []).slice(0, 10).map((item: any, index: number) => ({
                  source: 'user1',
                  target: `community-${index}`,
                  weight: Math.min(4, Math.ceil((item.totalActivity || 1) / 10)),
                }))}
              />
            </div>
          )}

          {!linkData && !isLoading && (
            <div className="space-y-4">
              {savedLink.length > 0 && (
                <>
                  <h3 className="text-sm font-medium text-muted-foreground">Previously Analyzed Links</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {savedLink.map((item) => {
                      const rd = item.result_data as any;
                      const displayName = item.target?.startsWith('u/') ? item.target : `u/${item.target}`;
                      const totalKarma = rd?.totalKarma ?? 0;
                      return (
                        <Card key={item.id} className="overflow-hidden hover:scale-[1.02] hover:-translate-y-1 transition-all duration-300 cursor-pointer group border-border">
                          <div className="relative bg-gradient-to-br from-orange-500 via-red-500 to-rose-600 px-4 pt-4 pb-10">
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-white font-bold text-sm truncate">{displayName}</span>
                              <span className="flex items-center gap-1 text-white/90 text-[11px] font-semibold bg-white/20 rounded-full px-2 py-0.5 backdrop-blur-sm">
                                <Network className="h-3 w-3" />
                                {totalKarma.toLocaleString()}
                              </span>
                            </div>
                            <p className="text-white/60 text-[10px]">{item.analyzed_at ? new Date(item.analyzed_at).toLocaleString() : ''}</p>
                          </div>
                          <div className="flex justify-center -mt-8 relative z-10">
                            <div className="w-16 h-16 rounded-full border-4 border-card bg-card shadow-lg flex items-center justify-center bg-gradient-to-br from-orange-500 via-red-500 to-rose-600">
                              <Network className="h-7 w-7 text-white" />
                            </div>
                          </div>
                          <CardContent className="pt-3 pb-3 text-center space-y-2">
                            <a href={`https://www.reddit.com/user/${item.target?.replace(/^u\//, '')}`} target="_blank" rel="noopener noreferrer" className="font-semibold text-sm hover:text-primary transition-colors flex items-center justify-center gap-1" onClick={(e) => e.stopPropagation()}>
                              {displayName}
                              <ExternalLink className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                            </a>
                            <p className="text-xs text-muted-foreground">{totalKarma.toLocaleString()} karma</p>
                            <div className="flex gap-2 pt-1">
                              <Button variant="outline" size="sm" className="flex-1 text-xs h-8" onClick={() => loadSavedAnalysis(item)}>
                                <Eye className="h-3 w-3 mr-1" /> View
                              </Button>
                              <Button variant="outline" size="sm" className="h-8 text-xs text-destructive hover:text-destructive" onClick={(e) => { e.stopPropagation(); deleteSavedAnalysis(item.id, 'link'); }}>
                                <X className="h-3 w-3" />
                              </Button>
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                </>
              )}
              <Card className="border-dashed border-muted-foreground/30">
                <CardContent className="py-12 text-center">
                  <Network className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">Enter a username to analyze their community connections</p>
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Post Preview Dialog - like Monitoring */}
      <Dialog open={!!previewPost} onOpenChange={(open) => !open && setPreviewPost(null)}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="text-base leading-snug">
              📄 Post Preview
            </DialogTitle>
            <DialogDescription className="flex items-center gap-2 pt-1">
              <Badge variant="outline" className="text-xs">{previewPost?.subreddit}</Badge>
              <span className="text-xs">{previewPost?.timestamp}</span>
            </DialogDescription>
          </DialogHeader>
          <ScrollArea className="flex-1 max-h-[50vh]">
            <div className="space-y-3 pr-4">
              <h3 className="font-semibold text-sm">{previewPost?.title}</h3>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span>by u/{previewPost?.author}</span>
                <Badge variant="secondary" className="text-xs">▲ {previewPost?.score}</Badge>
              </div>
              {previewPost?.body ? (
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">{previewPost.body}</p>
              ) : (
                <p className="text-sm text-muted-foreground italic">No additional content available.</p>
              )}
            </div>
          </ScrollArea>
          <div className="pt-3 border-t">
            <a href={previewPost?.url} target="_blank" rel="noopener noreferrer" className="w-full">
              <Button className="w-full gap-2">
                <ExternalLink className="h-4 w-4" />
                View on Reddit
              </Button>
            </a>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Analysis;
