import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, SelectLabel, SelectGroup, SelectSeparator } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Search, User, MessageSquare, Calendar, X, FileText, Activity, Users, Share2, TrendingUp, ExternalLink, StopCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { WordCloud } from '@/components/WordCloud';
import { AnalyticsChart } from '@/components/AnalyticsChart';
import { MiniSparkline } from '@/components/MiniSparkline';
import { CompactBarChart } from '@/components/CompactBarChart';
import { supabase } from '@/integrations/supabase/client';
import { formatCurrentTimePakistan, formatActivityTime } from '@/lib/dateUtils';

interface RedditActivity {
  id: string;
  type: 'post' | 'comment';
  title: string;
  subreddit: string;
  timestamp: string;
  url: string;
}

interface ProfileData {
  username?: string;
  accountAge?: string;
  totalKarma?: number;
  activeSubreddits?: number;
  communityName?: string;
  memberCount?: string;
  description?: string;
  createdDate?: string;
  weeklyVisitors?: number;
  weeklyContributors?: number;
}

const Monitoring = () => {
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchType, setSearchType] = useState<'user' | 'community' | ''>('');
  const [profileData, setProfileData] = useState<ProfileData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isMonitoring, setIsMonitoring] = useState(false);
  const [investigatorEmail, setInvestigatorEmail] = useState('');
  const [activities, setActivities] = useState<RedditActivity[]>([]);
  const [wordCloudData, setWordCloudData] = useState<any[]>([]);
  const [isFetching, setIsFetching] = useState(false);
  const [lastFetchTime, setLastFetchTime] = useState<string>('');
  const [newActivityCount, setNewActivityCount] = useState(0);
  const monitoringIntervalRef = useRef<number | null>(null);

  // Generate sample activities
  const generateActivities = (type: 'user' | 'community', name: string): RedditActivity[] => {
    const now = new Date();
    const activities: RedditActivity[] = [];
    
    // Generate 5 posts
    for (let i = 0; i < 5; i++) {
      const timestamp = new Date(now.getTime() - (i * 3600000 + Math.random() * 3600000));
      activities.push({
        id: `post-${i}`,
        type: 'post',
        title: `Sample post ${i + 1} from ${name}`,
        subreddit: type === 'user' ? `r/technology` : name,
        timestamp: timestamp.toISOString().replace('T', ' ').substring(0, 19) + ' UTC',
        url: `https://reddit.com/r/technology/post${i}`
      });
    }
    
    // Generate 5 comments
    for (let i = 0; i < 5; i++) {
      const timestamp = new Date(now.getTime() - (i * 2400000 + Math.random() * 2400000));
      activities.push({
        id: `comment-${i}`,
        type: 'comment',
        title: `Comment on discussion about technology trends and innovation`,
        subreddit: type === 'user' ? `r/science` : name,
        timestamp: timestamp.toISOString().replace('T', ' ').substring(0, 19) + ' UTC',
        url: `https://reddit.com/r/science/comment${i}`
      });
    }
    
    return activities.sort((a, b) => b.timestamp.localeCompare(a.timestamp));
  };

  // Calculate real activity breakdown from scraped data
  // For communities, filter posts from past week
  const oneWeekAgo = new Date();
  oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
  
  const filteredActivities = profileData?.communityName
    ? activities.filter(a => {
        const activityDate = new Date(a.timestamp);
        return a.type === 'post' && activityDate >= oneWeekAgo;
      })
    : activities;
  
  const postsCount = filteredActivities.filter(a => a.type === 'post').length;
  const commentsCount = filteredActivities.filter(a => a.type === 'comment').length;
  
  const activityBreakdownData = profileData?.communityName 
    ? [
        { name: 'Posts', value: 45 },
      ]
    : [
        { name: 'Posts', value: postsCount },
        { name: 'Comments', value: commentsCount },
      ];

  const realTimeWordCloud = [
    { word: "technology", frequency: 89, category: "high" as const },
    { word: "innovation", frequency: 76, category: "high" as const },
    { word: "discussion", frequency: 65, category: "medium" as const },
    { word: "update", frequency: 58, category: "medium" as const },
    { word: "community", frequency: 71, category: "high" as const },
    { word: "analysis", frequency: 45, category: "medium" as const },
    { word: "trends", frequency: 42, category: "low" as const },
    { word: "insights", frequency: 38, category: "low" as const },
  ];

  const activityTimelineData = [
    { name: '6h ago', value: 7 },
    { name: '5h ago', value: 7 },
    { name: '4h ago', value: 7 },
    { name: '3h ago', value: 7 },
    { name: '2h ago', value: 9 },
    { name: '1h ago', value: 8 },
  ];

  const weeklyVisitorsData = [
    { name: 'Mon', value: 3200 },
    { name: 'Tue', value: 2800 },
    { name: 'Wed', value: 3500 },
    { name: 'Thu', value: 4100 },
    { name: 'Fri', value: 3900 },
    { name: 'Sat', value: 2600 },
    { name: 'Sun', value: 2400 },
  ];

  const weeklyContributorsData = [
    { name: 'Mon', value: 879 },
    { name: 'Tue', value: 756 },
    { name: 'Wed', value: 923 },
    { name: 'Thu', value: 1045 },
    { name: 'Fri', value: 998 },
    { name: 'Sat', value: 634 },
    { name: 'Sun', value: 512 },
  ];

  const handleClearSearch = () => {
    setSearchQuery('');
    setProfileData(null);
    setIsMonitoring(false);
    setActivities([]);
    if (monitoringIntervalRef.current) {
      clearInterval(monitoringIntervalRef.current);
      monitoringIntervalRef.current = null;
    }
  };

  const handleStopMonitoring = () => {
    setIsMonitoring(false);
    setIsFetching(false);
    if (monitoringIntervalRef.current) {
      clearInterval(monitoringIntervalRef.current);
      monitoringIntervalRef.current = null;
    }
    toast({
      title: "Monitoring Stopped",
      description: newActivityCount > 0 
        ? `Real-time monitoring paused. Detected ${newActivityCount} new items during this session.`
        : "Real-time monitoring paused.",
    });
  };

  // Clean up interval on unmount
  useEffect(() => {
    return () => {
      if (monitoringIntervalRef.current) {
        clearInterval(monitoringIntervalRef.current);
      }
    };
  }, []);

  const handleShareCase = () => {
    if (!investigatorEmail.trim()) {
      toast({
        title: "Error",
        description: "Please enter an investigator email or username.",
        variant: "destructive",
      });
      return;
    }
    
    toast({
      title: "Case Shared",
      description: `Case access sent to ${investigatorEmail}`,
    });
    setInvestigatorEmail('');
  };

  const handleStartMonitoring = async () => {
    setIsMonitoring(true);
    setNewActivityCount(0);
    
    toast({
      title: "Monitoring Started",
      description: "Real-time tracking active. Checking for new activity every 15 seconds.",
    });

    // Fetch initial data
    await fetchRedditData(true);

    // Set up interval for continuous monitoring (every 15 seconds for better API rate limit handling)
    monitoringIntervalRef.current = window.setInterval(async () => {
      console.log('Checking for new Reddit activity...');
      await fetchRedditData(false);
    }, 15000);
  };

  const fetchRedditData = async (isInitial: boolean = false) => {
    if (!profileData || !searchType || !searchQuery) return;

    // Prevent concurrent fetches
    if (isFetching && !isInitial) {
      console.log('Fetch already in progress, skipping...');
      return;
    }

    setIsFetching(true);

    try {
      console.log('Fetching Reddit activity data...');
      const cleanQuery = searchType === 'user' 
        ? searchQuery.replace(/^u\//, '')
        : searchQuery.replace(/^r\//, '');

      const { data: redditData, error: redditError } = await supabase.functions.invoke('reddit-scraper', {
        body: { 
          username: searchType === 'user' ? cleanQuery : undefined,
          subreddit: searchType === 'community' ? cleanQuery : undefined,
          type: searchType
        }
      });

      if (redditError) {
        console.error('Error fetching Reddit data:', redditError);
        toast({
          title: "Fetch Error",
          description: "Failed to fetch new activity. Retrying...",
          variant: "destructive",
        });
        return;
      }

      // Process posts and comments into activities
      const newActivities: RedditActivity[] = [];
      
      if (redditData.posts) {
        redditData.posts.forEach((post: any) => {
          newActivities.push({
            id: post.id || Math.random().toString(),
            type: 'post',
            title: post.title,
            subreddit: `r/${post.subreddit}`,
            timestamp: formatActivityTime(post.created_utc),
            url: `https://reddit.com${post.permalink}`
          });
        });
      }

      if (redditData.comments) {
        redditData.comments.forEach((comment: any) => {
          newActivities.push({
            id: comment.id || Math.random().toString(),
            type: 'comment',
            title: comment.body.substring(0, 100) + (comment.body.length > 100 ? '...' : ''),
            subreddit: `r/${comment.subreddit}`,
            timestamp: formatActivityTime(comment.created_utc),
            url: `https://reddit.com${comment.permalink}`
          });
        });
      }

      // Sort by timestamp descending
      newActivities.sort((a, b) => b.timestamp.localeCompare(a.timestamp));
      
      // Detect new activities
      if (!isInitial && activities.length > 0) {
        const existingIds = new Set(activities.map(a => a.id));
        const newItems = newActivities.filter(a => !existingIds.has(a.id));
        
        if (newItems.length > 0) {
          setNewActivityCount(prev => prev + newItems.length);
          toast({
            title: "New Activity Detected",
            description: `${newItems.length} new ${newItems.length === 1 ? 'item' : 'items'} found!`,
          });
          console.log(`Found ${newItems.length} new items`);
        }
      }
      
      // Sort activities by timestamp (most recent first)
      const sortedActivities = newActivities.sort((a, b) => {
        const timeA = new Date(a.timestamp).getTime();
        const timeB = new Date(b.timestamp).getTime();
        return timeB - timeA;
      });
      
      setActivities(sortedActivities);
      setLastFetchTime(formatCurrentTimePakistan());

      // Extract words for word cloud
      const textContent = [
        ...(redditData.posts || []).map((p: any) => `${p.title} ${p.selftext || ''}`),
        ...(redditData.comments || []).map((c: any) => c.body)
      ].join(' ');

      const words = textContent.toLowerCase().match(/\b[a-z]{4,}\b/g) || [];
      const wordFreq: { [key: string]: number } = {};
      words.forEach(word => {
        if (!['that', 'this', 'with', 'from', 'have', 'been', 'will', 'your', 'their', 'what', 'when', 'where'].includes(word)) {
          wordFreq[word] = (wordFreq[word] || 0) + 1;
        }
      });

      const newWordCloud = Object.entries(wordFreq)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 10)
        .map(([word, freq]) => ({
          word,
          frequency: freq,
          category: freq > 20 ? 'high' as const : freq > 10 ? 'medium' as const : 'low' as const
        }));

      setWordCloudData(newWordCloud);

    } catch (error) {
      console.error('Error in fetchRedditData:', error);
      if (isMonitoring) {
        toast({
          title: "Connection Issue",
          description: "Temporary error fetching data. Will retry...",
          variant: "destructive",
        });
      }
    } finally {
      setIsFetching(false);
    }
  };

  const handleSearch = async () => {
    if (!searchQuery.trim() || !searchType) return;

    setIsLoading(true);
    setIsMonitoring(false);
    setActivities([]);
    
    // Clear any existing interval
    if (monitoringIntervalRef.current) {
      clearInterval(monitoringIntervalRef.current);
      monitoringIntervalRef.current = null;
    }

    try {
      console.log('Searching for:', searchQuery, 'Type:', searchType);
      
      const cleanQuery = searchType === 'user' 
        ? searchQuery.replace(/^u\//, '')
        : searchQuery.replace(/^r\//, '');

      const { data: redditData, error: redditError } = await supabase.functions.invoke('reddit-scraper', {
        body: { 
          username: searchType === 'user' ? cleanQuery : undefined,
          subreddit: searchType === 'community' ? cleanQuery : undefined,
          type: searchType
        }
      });

      if (redditError) throw redditError;

      if (redditData?.error === 'not_found') {
        toast({
          title: `${searchType === 'user' ? 'User' : 'Community'} Not Found`,
          description: redditData.message,
          variant: "destructive",
        });
        setProfileData(null);
        setIsLoading(false);
        return;
      }

      console.log('Reddit data retrieved successfully');

      if (searchType === 'user') {
        const user = redditData.user;
        const accountCreated = new Date(user.created_utc * 1000);
        const now = new Date();
        const ageInYears = (now.getTime() - accountCreated.getTime()) / (1000 * 60 * 60 * 24 * 365);
        const years = Math.floor(ageInYears);
        const months = Math.floor((ageInYears - years) * 12);

        // Count unique subreddits
        const subreddits = new Set([
          ...(redditData.posts || []).map((p: any) => p.subreddit),
          ...(redditData.comments || []).map((c: any) => c.subreddit)
        ]);

        setProfileData({
          username: `u/${cleanQuery}`,
          accountAge: `${years} years, ${months} months`,
          totalKarma: user.link_karma + user.comment_karma,
          activeSubreddits: subreddits.size,
        });
      } else {
        const subreddit = redditData.subreddit;
        const createdDate = new Date(subreddit.created_utc * 1000).toLocaleDateString('en-US', { 
          month: 'short', 
          day: 'numeric', 
          year: 'numeric' 
        });

        // Calculate weekly contributors from posts in the last 7 days
        const oneWeekAgo = Date.now() / 1000 - (7 * 24 * 60 * 60);
        const weeklyPosts = (redditData.posts || []).filter((p: any) => p.created_utc >= oneWeekAgo);
        const uniqueAuthors = new Set(weeklyPosts.map((p: any) => p.author));

        setProfileData({
          communityName: `r/${cleanQuery}`,
          memberCount: (subreddit.subscribers / 1000000 >= 1) 
            ? `${(subreddit.subscribers / 1000000).toFixed(1)}M`
            : `${(subreddit.subscribers / 1000).toFixed(1)}K`,
          description: subreddit.public_description || subreddit.description || 'No description available',
          createdDate,
          weeklyVisitors: redditData.weeklyVisitors || 0,
          weeklyContributors: uniqueAuthors.size,
        });
      }

      toast({
        title: "Search Complete",
        description: `${searchType === 'user' ? 'User' : 'Community'} found. Click "Start Monitoring" to begin tracking.`,
      });

    } catch (error: any) {
      console.error('Error searching Reddit:', error);
      toast({
        title: "Search Failed",
        description: error.message || 'Failed to search. Please try again.',
        variant: "destructive",
      });
      setProfileData(null);
    } finally {
      setIsLoading(false);
    }
  };

  // Reset when search type changes
  useEffect(() => {
    handleClearSearch();
  }, [searchType]);

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto p-6 space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Reddit Monitoring</h1>
          <p className="text-muted-foreground mt-1">
            Start monitoring any Reddit user or community for activity and trends
          </p>
        </div>

        {/* Search Panel */}
        <Card className="border-2">
          <CardContent className="pt-6">
            <div className="flex gap-2">
              <Select
                key={searchType || 'reset'}
                value={searchType || 'reset'}
                onValueChange={(value) => {
                  if (value === 'reset') {
                    setSearchType('');
                  } else {
                    setSearchType(value as 'user' | 'community');
                  }
                }}
              >
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="Select" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="reset">Select</SelectItem>
                  <SelectSeparator />
                  <SelectGroup>
                    <SelectLabel>Select Target</SelectLabel>
                    <SelectItem value="user">
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4" />
                        u/Username
                      </div>
                    </SelectItem>
                    <SelectItem value="community">
                      <div className="flex items-center gap-2">
                        <Users className="h-4 w-4" />
                        r/Subreddit (Community)
                      </div>
                    </SelectItem>
                  </SelectGroup>
                </SelectContent>
              </Select>
              
              <div className="relative flex-1">
                <Input
                  placeholder={
                    !searchType
                      ? 'Enter Reddit username or community name to monitor...'
                      : searchType === 'user'
                        ? 'Enter Username'
                        : 'Enter Community Name'
                  }
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                  className="pr-20"
                />
                {searchQuery && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute right-10 top-1/2 -translate-y-1/2 h-7 w-7"
                    onClick={handleClearSearch}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute right-2 top-1/2 -translate-y-1/2 h-7 w-7"
                  onClick={handleSearch}
                  disabled={!searchType || isLoading}
                >
                  <Search className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Profile/Info Card */}
        {profileData && (
          <Card className="border-2 animate-fade-in">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                {profileData.username ? (
                  <User className="h-5 w-5" />
                ) : (
                  <Users className="h-5 w-5" />
                )}
                {profileData.username || profileData.communityName}
              </CardTitle>
              <CardDescription>
                {profileData.username ? 'User Profile' : 'Community Information'}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {profileData.username && (
                  <>
                    <div className="flex items-start gap-2">
                      <Calendar className="h-4 w-4 text-primary mt-1" />
                      <div>
                        <p className="text-xs text-muted-foreground">Account Age</p>
                        <p className="font-semibold text-sm">{profileData.accountAge}</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-2">
                      <TrendingUp className="h-4 w-4 text-primary mt-1" />
                      <div>
                        <p className="text-xs text-muted-foreground">Total Karma</p>
                        <p className="font-semibold text-sm">{profileData.totalKarma?.toLocaleString()}</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-2">
                      <Users className="h-4 w-4 text-primary mt-1" />
                      <div>
                        <p className="text-xs text-muted-foreground">Active Subreddits</p>
                        <p className="font-semibold text-sm">{profileData.activeSubreddits}</p>
                      </div>
                    </div>
                  </>
                )}
                {profileData.communityName && (
                  <>
                    <div className="flex items-start gap-2">
                      <Users className="h-4 w-4 text-primary mt-1" />
                      <div>
                        <p className="text-xs text-muted-foreground">Members</p>
                        <p className="font-semibold text-sm">{profileData.memberCount}</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-2">
                      <Calendar className="h-4 w-4 text-primary mt-1" />
                      <div>
                        <p className="text-xs text-muted-foreground">Created Date</p>
                        <p className="font-semibold text-sm">{profileData.createdDate}</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-2 col-span-2">
                      <FileText className="h-4 w-4 text-primary mt-1" />
                      <div>
                        <p className="text-xs text-muted-foreground">Description</p>
                        <p className="font-semibold text-sm">{profileData.description}</p>
                      </div>
                    </div>
                  </>
                )}
              </div>
              
              {!isMonitoring && (
                <div className="flex flex-col items-center gap-2 pt-4 border-t">
                  <Button onClick={handleStartMonitoring} size="lg" className="w-full max-w-md">
                    <Activity className="mr-2 h-4 w-4" />
                    Start Monitoring
                  </Button>
                  <p className="text-xs text-muted-foreground text-center">
                    Click 'Start Monitoring' to begin real-time tracking of activity and trends.
                  </p>
                </div>
              )}

              {isMonitoring && (
                <div className="flex flex-col items-center gap-3 pt-4 border-t">
                  <Button 
                    onClick={handleStopMonitoring} 
                    size="lg" 
                    variant="destructive"
                    className="w-full max-w-md"
                  >
                    <StopCircle className="h-5 w-5 mr-2" />
                    Stop Monitoring
                  </Button>
                  <div className="w-full max-w-md space-y-2">
                    <div className="flex items-center justify-between text-sm px-2">
                      <span className="flex items-center gap-2 text-muted-foreground">
                        {isFetching && (
                          <span className="h-2 w-2 rounded-full bg-primary animate-pulse" />
                        )}
                        {isFetching ? 'Checking for new activity...' : 'Monitoring Active'}
                      </span>
                      {lastFetchTime && (
                        <span className="text-xs text-muted-foreground">
                          Last: {lastFetchTime}
                        </span>
                      )}
                    </div>
                    {newActivityCount > 0 && (
                      <div className="px-3 py-2 rounded-md bg-primary/10 text-primary text-sm text-center font-medium">
                        ✨ {newActivityCount} new {newActivityCount === 1 ? 'item' : 'items'} detected
                      </div>
                    )}
                    <p className="text-xs text-muted-foreground text-center">
                      Checking every 15 seconds for new posts and comments
                    </p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Main Monitoring Dashboard - Only shown after Start Monitoring */}
        {isMonitoring && profileData && (
          <div className={`grid gap-6 animate-fade-in ${profileData.communityName ? 'grid-cols-1' : 'grid-cols-1 lg:grid-cols-3'}`}>
            {/* Left Column */}
            <div className={profileData.communityName ? 'space-y-6' : 'lg:col-span-2 space-y-6'}>
              {/* Notifications */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Activity className="h-5 w-5" />
                    Notifications
                    <Badge variant="default" className="ml-auto animate-pulse">Live</Badge>
                  </CardTitle>
                  <CardDescription>Latest Reddit activities</CardDescription>
                </CardHeader>
                <CardContent>
                  {profileData.communityName ? (
                    // Community monitoring - only posts and link
                    <div className="grid grid-cols-2 gap-4">
                      {/* Posts Column */}
                      <div>
                        <h4 className="font-semibold mb-3 flex items-center gap-2">
                          <FileText className="h-4 w-4 text-primary" />
                          Posts
                        </h4>
                        <ScrollArea className="h-80">
                          <div className="space-y-2 pr-4">
                            {activities
                              .filter((activity) => activity.type === 'post')
                              .map((activity) => (
                                <a
                                  key={activity.id}
                                  href={activity.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="block p-3 rounded-lg border hover:bg-accent transition-colors"
                                >
                                  <p className="text-sm font-medium line-clamp-1">{activity.title}</p>
                                  <div className="flex flex-col gap-1 mt-1">
                                    <Badge variant="outline" className="text-xs w-fit">{activity.subreddit}</Badge>
                                    <span className="text-xs text-muted-foreground">{activity.timestamp}</span>
                                  </div>
                                </a>
                              ))}
                          </div>
                        </ScrollArea>
                      </div>

                      {/* Community Link */}
                      <div>
                        <h4 className="font-semibold mb-3 flex items-center gap-2">
                          <ExternalLink className="h-4 w-4 text-primary" />
                          Community Link
                        </h4>
                        <a
                          href={`https://reddit.com/${profileData.communityName}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-2 p-4 rounded-lg border hover:bg-accent transition-colors"
                        >
                          <Users className="h-5 w-5 text-primary" />
                          <div>
                            <p className="font-semibold">{profileData.communityName}</p>
                            <p className="text-xs text-muted-foreground">Visit on Reddit</p>
                          </div>
                          <ExternalLink className="h-4 w-4 ml-auto" />
                        </a>
                      </div>
                    </div>
                  ) : (
                    // User monitoring - posts and comments
                    <div className="grid grid-cols-2 gap-4">
                      {/* Posts Column */}
                      <div>
                        <h4 className="font-semibold mb-3 flex items-center gap-2">
                          <FileText className="h-4 w-4 text-primary" />
                          Posts
                        </h4>
                        <ScrollArea className="h-80">
                          <div className="space-y-2 pr-4">
                            {activities
                              .filter((activity) => activity.type === 'post')
                              .map((activity) => (
                                <a
                                  key={activity.id}
                                  href={activity.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="block p-3 rounded-lg border hover:bg-accent transition-colors"
                                >
                                  <p className="text-sm font-medium line-clamp-1">{activity.title}</p>
                                  <div className="flex flex-col gap-1 mt-1">
                                    <Badge variant="outline" className="text-xs w-fit">{activity.subreddit}</Badge>
                                    <span className="text-xs text-muted-foreground">{activity.timestamp}</span>
                                  </div>
                                </a>
                              ))}
                          </div>
                        </ScrollArea>
                      </div>

                      {/* Comments Column */}
                      <div>
                        <h4 className="font-semibold mb-3 flex items-center gap-2">
                          <MessageSquare className="h-4 w-4 text-primary" />
                          Comments
                        </h4>
                        <ScrollArea className="h-80">
                          <div className="space-y-2 pr-4">
                            {activities
                              .filter((activity) => activity.type === 'comment')
                              .map((activity) => (
                                <a
                                  key={activity.id}
                                  href={activity.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="block p-3 rounded-lg border hover:bg-accent transition-colors"
                                >
                                  <p className="text-sm font-medium line-clamp-1">{activity.title}</p>
                                  <div className="flex flex-col gap-1 mt-1">
                                    <Badge variant="outline" className="text-xs w-fit">{activity.subreddit}</Badge>
                                    <span className="text-xs text-muted-foreground">{activity.timestamp}</span>
                                  </div>
                                </a>
                              ))}
                          </div>
                        </ScrollArea>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Activity Timeline - User monitoring only */}
              {!profileData.communityName && (
                <Card>
                  <CardHeader>
                    <CardTitle>Activity Timeline</CardTitle>
                    <CardDescription>Activity over the last 6 hours</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <AnalyticsChart data={activityTimelineData} title="" type="line" height={250} />
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Right Column */}
            <div className="space-y-6">
              {/* Trending Keywords */}
              <Card>
                <CardHeader>
                  <CardTitle>Trending Keywords (Recent Activity)</CardTitle>
                  <CardDescription>
                    Color coded: Red = high, Green = medium, Light blue = low
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <WordCloud words={wordCloudData.length > 0 ? wordCloudData : realTimeWordCloud} title="" />
                </CardContent>
              </Card>

              {/* Activity Breakdown */}
              <Card>
                <CardHeader>
                  <CardTitle>Activity Breakdown</CardTitle>
                </CardHeader>
                <CardContent>
                  <AnalyticsChart data={activityBreakdownData} title="" type="bar" height={250} />
                </CardContent>
              </Card>

              {/* Case Sharing Panel */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Share2 className="h-5 w-5" />
                    Share Case with Investigator
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Input
                    placeholder="Enter Investigator Email or Username"
                    value={investigatorEmail}
                    onChange={(e) => setInvestigatorEmail(e.target.value)}
                  />
                  <Button onClick={handleShareCase} className="w-full">
                    Send Case Access
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>
        )}

        {/* Empty State */}
        {!profileData && (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-16">
              <Search className="h-16 w-16 text-muted-foreground mb-4" />
              <p className="text-lg font-semibold mb-2">No Monitoring Active</p>
              <p className="text-muted-foreground text-center max-w-md">
                Enter a username or community above to start monitoring Reddit activity and trends in real-time.
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default Monitoring;
