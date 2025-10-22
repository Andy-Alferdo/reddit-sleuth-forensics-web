import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { User, MapPin, Clock, MessageCircle, ThumbsUp, Calendar, Activity, Info, AlertCircle } from 'lucide-react';
import { WordCloud } from '@/components/WordCloud';
import { AnalyticsChart } from '@/components/AnalyticsChart';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { toZonedTime } from 'date-fns-tz';

const UserProfiling = () => {
  const [username, setUsername] = useState('');
  const [profileData, setProfileData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

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
        .slice(0, 15)
        .map(([word, freq]) => ({
          word,
          frequency: freq,
          category: freq > 30 ? 'high' as const : freq > 15 ? 'medium' as const : 'low' as const
        }));

      setProfileData({
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
        locationIndicators: analysisData?.locations || ['No specific locations detected'],
        behaviorPatterns: analysisData?.patterns?.topicInterests || ['Analyzing...'],
        wordCloud: wordCloudData,
        stats: analysisData?.stats || {},
        emotions: analysisData?.emotions || {}
      });

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
    <div className="p-6 space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-primary mb-2">User Profiling</h2>
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
            <div className="flex space-x-2">
              <Input
                id="username"
                placeholder="Enter username (e.g., u/username or username)"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="flex-1"
              />
              <Button 
                onClick={handleAnalyzeUser}
                disabled={isLoading || !username.trim()}
                variant="forensic"
                className="px-6"
              >
                {isLoading ? 'Analyzing...' : 'Analyze User'}
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
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {profileData.sentimentAnalysis && (
              <AnalyticsChart 
                data={[
                  { name: 'Positive', value: Math.round(profileData.sentimentAnalysis.positive * 100) },
                  { name: 'Neutral', value: Math.round(profileData.sentimentAnalysis.neutral * 100) },
                  { name: 'Negative', value: Math.round(profileData.sentimentAnalysis.negative * 100) },
                ]}
                title="Sentiment Analysis (AI-Powered)" 
                type="pie" 
                height={250}
              />
            )}
          </div>
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
        <Card className="border-dashed border-muted-foreground/30">
          <CardContent className="py-12 text-center">
            <User className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">Enter a username to perform detailed profile analysis</p>
            <p className="text-xs text-muted-foreground mt-2">Real-time data fetched from Reddit API</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default UserProfiling;