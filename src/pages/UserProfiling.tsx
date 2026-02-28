import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { User, MapPin, Clock, MessageCircle, ThumbsUp, Calendar, Activity, Info, AlertCircle, Search, X, Loader2, ExternalLink, ChevronDown } from 'lucide-react';
import { WordCloud } from '@/components/WordCloud';
import { AnalyticsChart } from '@/components/AnalyticsChart';
import { SavedAnalysisCard } from '@/components/SavedAnalysisCard';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { toZonedTime } from 'date-fns-tz';
import { useInvestigation } from '@/contexts/InvestigationContext';
import { useCallback } from 'react';

const INITIAL_VISIBLE = 10;

const UserProfiling = () => {
  const location = useLocation();
  const [username, setUsername] = useState('');
  const [profileData, setProfileData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [visiblePosts, setVisiblePosts] = useState(INITIAL_VISIBLE);
  const [visibleComments, setVisibleComments] = useState(INITIAL_VISIBLE);
  const { toast } = useToast();
  const { addUserProfile, saveUserProfileToDb, currentCase } = useInvestigation();
  const [savedProfiles, setSavedProfiles] = useState<any[]>([]);

  // Fetch saved profiles for current case
  const fetchSavedProfiles = useCallback(async () => {
    if (!currentCase?.id) { setSavedProfiles([]); return; }
    try {
      const { data } = await supabase
        .from('user_profiles_analyzed')
        .select('id, username, total_karma, account_age, analyzed_at')
        .eq('case_id', currentCase.id)
        .order('analyzed_at', { ascending: false });
      setSavedProfiles(data || []);
    } catch { /* ignore */ }
  }, [currentCase?.id]);

  useEffect(() => { fetchSavedProfiles(); }, [fetchSavedProfiles]);

  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail?.caseId === currentCase?.id && detail?.kind === 'userProfiles') fetchSavedProfiles();
    };
    window.addEventListener('case-data-updated', handler);
    return () => window.removeEventListener('case-data-updated', handler);
  }, [currentCase?.id, fetchSavedProfiles]);

  const loadSavedProfile = async (profileId: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const { data, error: err } = await supabase
        .from('user_profiles_analyzed')
        .select('*')
        .eq('id', profileId)
        .maybeSingle();
      if (err) throw err;
      if (!data) throw new Error('Profile not found');
      setUsername(data.username || '');
      setProfileData({
        username: data.username,
        accountAge: data.account_age,
        totalKarma: data.total_karma,
        postKarma: data.post_karma,
        commentKarma: data.comment_karma,
        activeSubreddits: data.active_subreddits || [],
        activityPattern: data.activity_pattern || {},
        sentimentAnalysis: data.sentiment_analysis || {},
        postSentiments: data.post_sentiments || [],
        commentSentiments: data.comment_sentiments || [],
        locationIndicators: data.location_indicators || [],
        behaviorPatterns: data.behavior_patterns || [],
        wordCloud: data.word_cloud || [],
      });
    } catch (e: any) {
      setError(e?.message || 'Failed to load profile');
    } finally {
      setIsLoading(false);
    }
  };

  const deleteSavedProfile = async (profileId: string) => {
    try {
      const { error: err } = await supabase
        .from('user_profiles_analyzed')
        .delete()
        .eq('id', profileId);
      if (err) throw err;
      setSavedProfiles(prev => prev.filter(p => p.id !== profileId));
      toast({ title: 'Profile removed', description: 'Saved profile has been deleted' });
    } catch (e: any) {
      toast({ title: 'Delete failed', description: e?.message || 'Could not delete profile', variant: 'destructive' });
    }
  };

  useEffect(() => {
    const prefillUsername = (location.state as any)?.prefillUsername as string | undefined;
    if (prefillUsername) {
      setUsername(prefillUsername);
      // Auto-trigger analysis
      setTimeout(() => {
        const searchBtn = document.querySelector<HTMLButtonElement>('[data-profiling-search]');
        searchBtn?.click();
      }, 100);
    }
  }, [location.state]);

  // Load saved profile when navigating from Dashboard
  useEffect(() => {
    const loadProfileId = (location.state as any)?.loadProfileId as string | undefined;
    if (!loadProfileId) return;

    let cancelled = false;

    (async () => {
      setIsLoading(true);
      try {
        const { data, error } = await supabase
          .from('user_profiles_analyzed')
          .select('*')
          .eq('id', loadProfileId)
          .maybeSingle();

        if (error) throw error;
        if (!data) throw new Error('Profile not found');

        if (cancelled) return;

        setUsername(data.username || '');
        setProfileData({
          username: data.username,
          accountAge: data.account_age,
          totalKarma: data.total_karma,
          postKarma: data.post_karma,
          commentKarma: data.comment_karma,
          activeSubreddits: data.active_subreddits || [],
          activityPattern: data.activity_pattern || {},
          sentimentAnalysis: data.sentiment_analysis || {},
          postSentiments: data.post_sentiments || [],
          commentSentiments: data.comment_sentiments || [],
          locationIndicators: data.location_indicators || [],
          behaviorPatterns: data.behavior_patterns || [],
          wordCloud: data.word_cloud || [],
        });

        toast({
          title: 'Loaded saved profile',
          description: `Showing saved results for u/${data.username}`,
        });
      } catch (e: any) {
        if (!cancelled) {
          toast({
            title: 'Failed to load profile',
            description: e?.message || 'Could not load saved profile',
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

  // Sample data for visualizations
  const userWordCloud = [
    { word: "technology", frequency: 89, category: "high" as const },
    { word: "programming", frequency: 76, category: "high" as const },
    { word: "javascript", frequency: 65, category: "medium" as const },
    { word: "react", frequency: 58, category: "medium" as const },
    { word: "coding", frequency: 45, category: "medium" as const },
    { word: "developer", frequency: 42, category: "low" as const },
    { word: "python", frequency: 38, category: "low" as const },
    { word: "software", frequency: 71, category: "high" as const },
  ];

  const activityTimelineData = [
    { name: 'Mon', value: 23 },
    { name: 'Tue', value: 45 },
    { name: 'Wed', value: 38 },
    { name: 'Thu', value: 52 },
    { name: 'Fri', value: 67 },
    { name: 'Sat', value: 34 },
    { name: 'Sun', value: 28 },
  ];

  const sentimentChartData = [
    { name: 'Positive', value: 45 },
    { name: 'Neutral', value: 35 },
    { name: 'Negative', value: 20 },
  ];

  const subredditActivityData = [
    { name: 'r/technology', value: 156 },
    { name: 'r/programming', value: 89 },
    { name: 'r/science', value: 67 },
    { name: 'r/worldnews', value: 45 },
  ];

  const handleAnalyzeUser = async () => {
    if (!username.trim()) return;
    
    setIsLoading(true);
    setError(null);
    setProfileData(null);
    setVisiblePosts(INITIAL_VISIBLE);
    setVisibleComments(INITIAL_VISIBLE);

    try {
      console.log('Fetching Reddit data for user:', username);
      
      // Clean username (remove u/ prefix if present)
      const cleanUsername = username.replace(/^u\//, '');

      // Fetch user data from Reddit
      const { data: redditData, error: redditError } = await supabase.functions.invoke('reddit-scraper', {
        body: { 
          username: cleanUsername,
          type: 'user'
        }
      });

      if (redditError) throw redditError;

      if (redditData?.error === 'not_found') {
        setError(redditData.message);
        toast({
          title: "User Not Found",
          description: redditData.message,
          variant: "destructive",
        });
        setIsLoading(false);
        return;
      }

      console.log('Reddit data fetched successfully');

      // Analyze content for sentiment and locations
      const { data: analysisData, error: analysisError } = await supabase.functions.invoke('analyze-content', {
        body: {
          posts: redditData.posts || [],
          comments: redditData.comments || []
        }
      });

      if (analysisError) {
        console.error('Analysis error:', analysisError);
        // Continue even if analysis fails
      }

      console.log('Analysis completed');

      // Calculate account age
      const accountCreated = new Date(redditData.user.created_utc * 1000);
      const now = new Date();
      const ageInYears = (now.getTime() - accountCreated.getTime()) / (1000 * 60 * 60 * 24 * 365);
      const years = Math.floor(ageInYears);
      const months = Math.floor((ageInYears - years) * 12);
      const accountAge = `${years} years, ${months} months`;

      // Calculate activity patterns
      const allContent = [...(redditData.posts || []), ...(redditData.comments || [])];
      const hourCounts: { [key: number]: number } = {};
      const dayCounts: { [key: string]: number } = {};
      
      allContent.forEach((item: any) => {
        const date = new Date(item.created_utc * 1000);
        const pakistanDate = toZonedTime(date, 'Asia/Karachi');
        const hour = pakistanDate.getHours();
        const day = pakistanDate.toLocaleDateString('en-US', { weekday: 'long', timeZone: 'Asia/Karachi' });
        
        hourCounts[hour] = (hourCounts[hour] || 0) + 1;
        dayCounts[day] = (dayCounts[day] || 0) + 1;
      });

      const mostActiveHour = Object.entries(hourCounts).sort(([,a], [,b]) => b - a)[0];
      const mostActiveDay = Object.entries(dayCounts).sort(([,a], [,b]) => b - a)[0];

      // Generate word cloud from content
      const textContent = [
        ...(redditData.posts || []).map((p: any) => `${p.title} ${p.selftext}`),
        ...(redditData.comments || []).map((c: any) => c.body)
      ].join(' ');

      const words = textContent.toLowerCase().match(/\b[a-z]{4,}\b/g) || [];
      const wordFreq: { [key: string]: number } = {};
      words.forEach(word => {
        if (!['that', 'this', 'with', 'from', 'have', 'been', 'will', 'your', 'their', 'what', 'when', 'where'].includes(word)) {
          wordFreq[word] = (wordFreq[word] || 0) + 1;
        }
      });

      const wordCloudData = Object.entries(wordFreq)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 40)
        .map(([word, freq]) => ({
          word,
          frequency: freq,
          category: freq > 20 ? 'high' as const : freq > 8 ? 'medium' as const : 'low' as const
        }));

      const profileResult = {
        username: cleanUsername,
        accountAge,
        totalKarma: redditData.user.link_karma + redditData.user.comment_karma,
        postKarma: redditData.user.link_karma,
        commentKarma: redditData.user.comment_karma,
        activeSubreddits: analysisData?.topSubreddits || [],
        activityPattern: {
          mostActiveHour: mostActiveHour ? `${mostActiveHour[0]}:00-${parseInt(mostActiveHour[0])+1}:00 PKT` : 'N/A',
          mostActiveDay: mostActiveDay?.[0] || 'N/A',
          timezone: 'PKT (Pakistan Standard Time)',
        },
        sentimentAnalysis: analysisData?.sentiment?.breakdown || { positive: 33, neutral: 34, negative: 33 },
        postSentiments: (analysisData?.postSentiments || []).map((s: any, i: number) => ({
          ...s,
          permalink: redditData.posts?.[i]?.permalink || null,
        })),
        commentSentiments: (analysisData?.commentSentiments || []).map((s: any, i: number) => ({
          ...s,
          permalink: redditData.comments?.[i]?.permalink || null,
        })),
        postSentimentBreakdown: analysisData?.sentiment?.postBreakdown || null,
        commentSentimentBreakdown: analysisData?.sentiment?.commentBreakdown || null,
        locationIndicators: analysisData?.locations || ['No specific locations detected'],
        behaviorPatterns: analysisData?.patterns?.topicInterests || ['Analyzing...'],
        wordCloud: wordCloudData,
        stats: analysisData?.stats || {},
        emotions: analysisData?.emotions || {}
      };

      setProfileData(profileResult);
      
      // Save to investigation context for report generation
      const profileToSave = {
        username: cleanUsername,
        accountAge,
        totalKarma: profileResult.totalKarma,
        postKarma: profileResult.postKarma,
        commentKarma: profileResult.commentKarma,
        activeSubreddits: profileResult.activeSubreddits,
        activityPattern: profileResult.activityPattern,
        sentimentAnalysis: profileResult.sentimentAnalysis,
        postSentiments: profileResult.postSentiments,
        commentSentiments: profileResult.commentSentiments,
        locationIndicators: profileResult.locationIndicators,
        behaviorPatterns: profileResult.behaviorPatterns,
        wordCloud: profileResult.wordCloud,
      };
      
      addUserProfile(profileToSave);
      
      // Also save to database if there's an active case
      if (currentCase?.id) {
        try {
          await saveUserProfileToDb(profileToSave);
        } catch (dbErr) {
          console.error('Failed to save profile to database:', dbErr);
        }
      }

      toast({
        title: "Analysis Complete",
        description: `Successfully analyzed profile for u/${cleanUsername}`,
      });

    } catch (err: any) {
      console.error('Error analyzing user:', err);
      setError(err.message || 'Failed to analyze user profile');
      toast({
        title: "Analysis Failed",
        description: err.message || 'Failed to analyze user profile. Please try again.',
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="p-6 space-y-6 relative">
      {isLoading && (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-background/80 backdrop-blur-sm">
          <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
          <p className="text-lg font-medium text-foreground">Analyzing user profile...</p>
          <p className="text-sm text-muted-foreground mt-1">This may take a moment</p>
        </div>
      )}
      <div className="text-center">
        <h2 className="text-2xl font-bold text-foreground mb-2">User Profiling</h2>
        <p className="text-muted-foreground">Deep analysis of Reddit user profiles and behavior patterns</p>
      </div>

      <Card className="border-primary/20">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <User className="h-5 w-5 text-primary" />
            <span>Analyze User Profile</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="username">Reddit Username</Label>
            <div className="relative">
              <Input
                id="username"
                placeholder="Enter username (e.g., u/username or username)"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleAnalyzeUser()}
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
                onClick={handleAnalyzeUser}
                disabled={isLoading || !username.trim()}
                data-profiling-search
              >
                <Search className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {profileData && (
        <div className="space-y-6">
          {/* Basic Profile Info */}
          <Card className="border-primary/20">
            <CardHeader>
              <CardTitle>Profile Overview - u/{profileData.username}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center p-4 rounded-lg bg-primary/10">
                  <Calendar className="h-6 w-6 text-primary mx-auto mb-2" />
                  <div className="font-bold text-primary">{profileData.accountAge}</div>
                  <p className="text-sm text-muted-foreground">Account Age</p>
                </div>
                <div className="text-center p-4 rounded-lg bg-forensic-accent/10">
                  <ThumbsUp className="h-6 w-6 text-forensic-accent mx-auto mb-2" />
                  <div className="font-bold text-forensic-accent">{profileData.totalKarma.toLocaleString()}</div>
                  <p className="text-sm text-muted-foreground">Total Karma</p>
                </div>
                <div className="text-center p-4 rounded-lg bg-card border">
                  <div className="font-bold text-foreground">{profileData.postKarma.toLocaleString()}</div>
                  <p className="text-sm text-muted-foreground">Post Karma</p>
                </div>
                <div className="text-center p-4 rounded-lg bg-card border">
                  <div className="font-bold text-foreground">{profileData.commentKarma.toLocaleString()}</div>
                  <p className="text-sm text-muted-foreground">Comment Karma</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Activity Pattern */}
            <Card className="border-primary/20">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Activity className="h-5 w-5 text-primary" />
                  <span>Activity Patterns</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex justify-between items-center p-3 rounded-lg bg-card border">
                    <span className="text-muted-foreground">Most Active Hour</span>
                    <span className="font-medium">{profileData.activityPattern.mostActiveHour}</span>
                  </div>
                  <div className="flex justify-between items-center p-3 rounded-lg bg-card border">
                    <span className="text-muted-foreground">Most Active Day</span>
                    <span className="font-medium">{profileData.activityPattern.mostActiveDay}</span>
                  </div>
                  <div className="flex justify-between items-center p-3 rounded-lg bg-card border">
                    <span className="text-muted-foreground">Estimated Timezone</span>
                    <span className="font-medium">{profileData.activityPattern.timezone}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Location Indicators */}
            <Card className="border-primary/20">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <MapPin className="h-5 w-5 text-primary" />
                  <span>Location Indicators</span>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                      </TooltipTrigger>
                      <TooltipContent>
                        <p className="max-w-xs">Location indicators are extracted through AI analysis of user comments and posts, identifying mentions of places, regions, and location-specific references.</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {profileData.locationIndicators.map((indicator: string, index: number) => (
                    <div key={index} className="p-3 rounded-lg bg-card border">
                      <p className="text-sm">{indicator}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Active Subreddits */}
            <Card className="border-primary/20">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <MessageCircle className="h-5 w-5 text-primary" />
                  <span>Active Subreddits</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {profileData.activeSubreddits.map((subreddit: any, index: number) => (
                    <div key={index} className="flex justify-between items-center p-3 rounded-lg bg-card border">
                      <span className="font-medium">{subreddit.name}</span>
                      <span className="text-primary font-semibold">{subreddit.activity} posts</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Behavior Patterns */}
            <Card className="border-primary/20">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Clock className="h-5 w-5 text-primary" />
                  <span>Behavior Patterns</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {profileData.behaviorPatterns.map((pattern: string, index: number) => (
                    <div key={index} className="p-3 rounded-lg bg-card border">
                      <p className="text-sm">{pattern}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Analytics Visualizations */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {profileData.wordCloud && profileData.wordCloud.length > 0 && (
              <WordCloud words={profileData.wordCloud} title="Most Used Words" />
            )}
            {profileData.activeSubreddits && profileData.activeSubreddits.length > 0 && (
              <AnalyticsChart 
                data={profileData.activeSubreddits.map((s: any) => ({ name: s.name, value: s.count }))} 
                title="Subreddit Activity Distribution" 
                type="bar" 
                height={250}
              />
            )}
          </div>
          
          {/* Sentiment Analysis - Posts */}
          {profileData.postSentiments && profileData.postSentiments.length > 0 ? (
            <Card className="border-primary/20">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <MessageCircle className="h-5 w-5 text-primary" />
                  <span>Post Sentiment Analysis (AI-Powered)</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
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
                      {profileData.postSentiments.slice(0, visiblePosts).map((item: any, index: number) => (
                        <tr 
                          key={index} 
                          className="border-b hover:bg-muted/50 cursor-pointer group"
                          onClick={() => {
                            if (item.permalink) {
                              window.open(`https://www.reddit.com${item.permalink}`, '_blank');
                            }
                          }}
                        >
                          <td className="p-3 text-sm">
                            <span className="group-hover:text-primary transition-colors">{item.text}</span>
                            {item.permalink && <ExternalLink className="h-3 w-3 inline ml-1 opacity-0 group-hover:opacity-100 text-primary transition-opacity" />}
                          </td>
                          <td className="p-3">
                            <span className={`px-2 py-1 rounded text-xs font-medium ${
                              item.sentiment === 'positive' ? 'bg-green-500/20 text-green-700 dark:text-green-400' :
                              item.sentiment === 'negative' ? 'bg-red-500/20 text-red-700 dark:text-red-400' :
                              'bg-gray-500/20 text-gray-700 dark:text-gray-400'
                            }`}>
                              {item.sentiment}
                            </span>
                          </td>
                          <td className="p-3 text-sm text-muted-foreground">{item.explanation}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {profileData.postSentiments.length > visiblePosts && (
                    <div className="text-center mt-4">
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => setVisiblePosts(prev => prev + 10)}
                        className="gap-1"
                      >
                        <ChevronDown className="h-4 w-4" />
                        See More ({profileData.postSentiments.length - visiblePosts} remaining)
                      </Button>
                    </div>
                  )}
                </div>
                {profileData.postSentimentBreakdown && (
                  <AnalyticsChart 
                    data={[
                      { name: 'Positive', value: Math.round(profileData.postSentimentBreakdown.positive * 100) },
                      { name: 'Neutral', value: Math.round(profileData.postSentimentBreakdown.neutral * 100) },
                      { name: 'Negative', value: Math.round(profileData.postSentimentBreakdown.negative * 100) },
                    ]}
                    title="Post Sentiment Distribution" 
                    type="pie" 
                    height={250}
                  />
                )}
              </CardContent>
            </Card>
          ) : profileData && (
            <Card className="border-primary/20">
              <CardContent className="py-12 text-center">
                <MessageCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">No posts available for sentiment analysis</p>
              </CardContent>
            </Card>
          )}

          {/* Sentiment Analysis - Comments */}
          {profileData.commentSentiments && profileData.commentSentiments.length > 0 ? (
            <Card className="border-primary/20">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <MessageCircle className="h-5 w-5 text-primary" />
                  <span>Comment Sentiment Analysis (AI-Powered)</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left p-3 font-semibold">Comment</th>
                        <th className="text-left p-3 font-semibold w-32">Sentiment</th>
                        <th className="text-left p-3 font-semibold">Explanation (XAI)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {profileData.commentSentiments.slice(0, visibleComments).map((item: any, index: number) => (
                        <tr 
                          key={index} 
                          className="border-b hover:bg-muted/50 cursor-pointer group"
                          onClick={() => {
                            if (item.permalink) {
                              window.open(`https://www.reddit.com${item.permalink}`, '_blank');
                            }
                          }}
                        >
                          <td className="p-3 text-sm">
                            <span className="group-hover:text-primary transition-colors">{item.text}</span>
                            {item.permalink && <ExternalLink className="h-3 w-3 inline ml-1 opacity-0 group-hover:opacity-100 text-primary transition-opacity" />}
                          </td>
                          <td className="p-3">
                            <span className={`px-2 py-1 rounded text-xs font-medium ${
                              item.sentiment === 'positive' ? 'bg-green-500/20 text-green-700 dark:text-green-400' :
                              item.sentiment === 'negative' ? 'bg-red-500/20 text-red-700 dark:text-red-400' :
                              'bg-gray-500/20 text-gray-700 dark:text-gray-400'
                            }`}>
                              {item.sentiment}
                            </span>
                          </td>
                          <td className="p-3 text-sm text-muted-foreground">{item.explanation}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {profileData.commentSentiments.length > visibleComments && (
                    <div className="text-center mt-4">
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => setVisibleComments(prev => prev + 10)}
                        className="gap-1"
                      >
                        <ChevronDown className="h-4 w-4" />
                        See More ({profileData.commentSentiments.length - visibleComments} remaining)
                      </Button>
                    </div>
                  )}
                </div>
                {profileData.commentSentimentBreakdown && (
                  <AnalyticsChart 
                    data={[
                      { name: 'Positive', value: Math.round(profileData.commentSentimentBreakdown.positive * 100) },
                      { name: 'Neutral', value: Math.round(profileData.commentSentimentBreakdown.neutral * 100) },
                      { name: 'Negative', value: Math.round(profileData.commentSentimentBreakdown.negative * 100) },
                    ]}
                    title="Comment Sentiment Distribution" 
                    type="pie" 
                    height={250}
                  />
                )}
              </CardContent>
            </Card>
          ) : profileData && (
            <Card className="border-primary/20">
              <CardContent className="py-12 text-center">
                <MessageCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">No comments available for sentiment analysis</p>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {error && !profileData && (
        <Card className="border-destructive/50 bg-destructive/10">
          <CardContent className="py-12 text-center">
            <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
            <p className="text-destructive font-medium mb-2">Analysis Failed</p>
            <p className="text-sm text-muted-foreground">{error}</p>
          </CardContent>
        </Card>
      )}

      {!profileData && !isLoading && !error && (
        <div className="space-y-4">
          {savedProfiles.length > 0 && (
            <>
              <h3 className="text-sm font-medium text-muted-foreground">Previously Analyzed Profiles</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {savedProfiles.map((p) => (
                  <SavedAnalysisCard
                    key={p.id}
                    title={`u/${p.username}`}
                    subtitle={`${(p.total_karma ?? 0).toLocaleString()} karma · ${p.account_age || 'Unknown age'}`}
                    analyzedAt={p.analyzed_at}
                    icon={User}
                    onClick={() => loadSavedProfile(p.id)}
                    onDelete={() => deleteSavedProfile(p.id)}
                  />
                ))}
              </div>
            </>
          )}
          <Card className="border-dashed border-muted-foreground/30">
            <CardContent className="py-12 text-center">
              <User className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">Enter a username to perform detailed profile analysis</p>
              <p className="text-xs text-muted-foreground mt-2">Real-time data fetched from Reddit API</p>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};

export default UserProfiling;