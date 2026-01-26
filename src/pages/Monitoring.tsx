import { useState, useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, SelectLabel, SelectGroup, SelectSeparator } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Search, User, MessageSquare, Calendar, X, FileText, Activity, Users, TrendingUp, ExternalLink, StopCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { WordCloud } from '@/components/WordCloud';
import { AnalyticsChart } from '@/components/AnalyticsChart';
import { MiniSparkline } from '@/components/MiniSparkline';
import { CompactBarChart } from '@/components/CompactBarChart';
import { supabase } from '@/integrations/supabase/client';
import { scrapeReddit } from '@/lib/api/redditScraper';
import { formatCurrentTimePakistan, formatActivityTime } from '@/lib/dateUtils';
import { useInvestigation } from '@/contexts/InvestigationContext';

interface RedditActivity {
  id: string;
  type: 'post' | 'comment';
  title: string;
  subreddit: string;
  timestamp: string;
  created_utc: number; // Raw Unix timestamp for proper sorting
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
  bannerImg?: string;
  iconImg?: string;
}

const Monitoring = () => {
  const { toast } = useToast();
  const location = useLocation();
  const { addMonitoringSession, saveMonitoringSessionToDb, currentCase } = useInvestigation();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchType, setSearchType] = useState<'user' | 'community' | ''>('');
  const [profileData, setProfileData] = useState<ProfileData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isMonitoring, setIsMonitoring] = useState(false);
  const [isViewingSavedSession, setIsViewingSavedSession] = useState(false);

  const [activities, setActivities] = useState<RedditActivity[]>([]);
  const [wordCloudData, setWordCloudData] = useState<any[]>([]);
  const [isFetching, setIsFetching] = useState(false);
  const [lastFetchTime, setLastFetchTime] = useState<string>('');
  const [newActivityCount, setNewActivityCount] = useState(0);
  const monitoringIntervalRef = useRef<number | null>(null);
  const monitoringStartTimeRef = useRef<string>('');
  const suppressResetOnSearchTypeChangeRef = useRef(false);

  // Load a past session when navigating from Case Dashboard
  useEffect(() => {
    const loadSessionId = (location.state as any)?.loadSession as string | undefined;
    if (!loadSessionId) return;

    let cancelled = false;

     (async () => {
       setIsLoading(true);
       try {
         const { data, error } = await supabase
           .from('monitoring_sessions')
           .select('id, case_id, target_name, search_type, started_at, ended_at, profile_data, activities, word_cloud_data, new_activity_count')
           .eq('id', loadSessionId)
           .maybeSingle();

         if (error) throw error;
         if (!data) throw new Error('Session not found');
         if (currentCase?.id && data.case_id && data.case_id !== currentCase.id) {
           // Do nothing special; still allow viewing, but avoid confusing edits to current case
         }

         if (cancelled) return;

         // Prevent the searchType-change effect from wiping loaded saved data.
         suppressResetOnSearchTypeChangeRef.current = true;

         // Parse profile_data properly
         const loadedProfile = data.profile_data as ProfileData | null;

         const parsedProfile: ProfileData | null = loadedProfile
           ? {
               ...loadedProfile,
               username: loadedProfile.username || data.target_name,
             }
           : data.search_type === 'user'
             ? {
                 username: data.target_name,
                 accountAge: 'N/A',
                 totalKarma: 0,
                 activeSubreddits: 0,
               }
             : data.search_type === 'community'
               ? {
                   communityName: data.target_name,
                   memberCount: 'N/A',
                   description: '',
                   createdDate: 'N/A',
                 }
               : null;

         setSearchType((data.search_type as 'user' | 'community') || '');
         setSearchQuery(data.target_name || '');
         setProfileData(parsedProfile);
         setActivities(Array.isArray(data.activities) ? (data.activities as unknown as RedditActivity[]) : []);
         setWordCloudData(Array.isArray(data.word_cloud_data) ? (data.word_cloud_data as any) : []);
         setNewActivityCount(data.new_activity_count || 0);
         monitoringStartTimeRef.current = data.started_at || '';
         setIsViewingSavedSession(true);
         setIsMonitoring(false);

        // Note: do not reset the suppress flag here; the searchType effect will consume it once

        toast({
          title: 'Loaded past session',
          description: `Showing saved results for ${data.target_name}`,
        });
       } catch (e: any) {
         if (!cancelled) {
           toast({
             title: 'Failed to load session',
             description: e?.message || 'Could not load saved session',
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
  }, [location.state, currentCase?.id, toast]);

  // Generate sample activities
  const generateActivities = (type: 'user' | 'community', name: string): RedditActivity[] => {
    const now = new Date();
    const activities: RedditActivity[] = [];
    
    // Generate 5 posts
    for (let i = 0; i < 5; i++) {
      const timestamp = new Date(now.getTime() - (i * 3600000 + Math.random() * 3600000));
      const created_utc = Math.floor(timestamp.getTime() / 1000);
      activities.push({
        id: `post-${i}`,
        type: 'post',
        title: `Sample post ${i + 1} from ${name}`,
        subreddit: type === 'user' ? `r/technology` : name,
        timestamp: timestamp.toISOString().replace('T', ' ').substring(0, 19) + ' UTC',
        created_utc,
        url: `https://reddit.com/r/technology/post${i}`
      });
    }
    
    // Generate 5 comments
    for (let i = 0; i < 5; i++) {
      const timestamp = new Date(now.getTime() - (i * 2400000 + Math.random() * 2400000));
      const created_utc = Math.floor(timestamp.getTime() / 1000);
      activities.push({
        id: `comment-${i}`,
        type: 'comment',
        title: `Comment on discussion about technology trends and innovation`,
        subreddit: type === 'user' ? `r/science` : name,
        timestamp: timestamp.toISOString().replace('T', ' ').substring(0, 19) + ' UTC',
        created_utc,
        url: `https://reddit.com/r/science/comment${i}`
      });
    }
    
    return activities.sort((a, b) => b.created_utc - a.created_utc);
  };

  // Calculate real activity breakdown from scraped data
  // For communities, calculate posts per day for the last 3 days
  const getActivityBreakdownData = () => {
    if (profileData?.communityName) {
      // Get day names for last 3 days with full date
      const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const today = new Date();
      const dailyData: { name: string; value: number }[] = [];
      
      // Initialize daily data for last 3 days
      for (let i = 2; i >= 0; i--) {
        const date = new Date(today);
        date.setDate(date.getDate() - i);
        const dayName = days[date.getDay()];
        const dateStr = `${dayName}, ${date.getDate()} ${months[date.getMonth()]} ${date.getFullYear()}`;
        dailyData.push({ name: dateStr, value: 0 });
      }
      
      // Count posts for each day using created_utc
      const posts = activities.filter(a => a.type === 'post');
      
      posts.forEach(activity => {
        // Use created_utc directly (Unix timestamp in seconds)
        const activityDate = new Date(activity.created_utc * 1000);
        
        // Find which day index this post belongs to (last 3 days)
        for (let i = 2; i >= 0; i--) {
          const targetDate = new Date(today);
          targetDate.setDate(targetDate.getDate() - (2 - i));
          
          if (activityDate.toDateString() === targetDate.toDateString()) {
            dailyData[i].value++;
            break;
          }
        }
      });
      
      return dailyData;
    } else {
      // User monitoring - posts vs comments
      const postsCount = activities.filter(a => a.type === 'post').length;
      const commentsCount = activities.filter(a => a.type === 'comment').length;
      return [
        { name: 'Posts', value: postsCount },
        { name: 'Comments', value: commentsCount },
      ];
    }
  };
  
  const activityBreakdownData = getActivityBreakdownData();

  // Generate word cloud with proper category distribution - always ensures all 3 colors
  const generateWordCloudWithCategories = (words: { word: string; frequency: number }[]) => {
    if (words.length === 0) return [];
    
    // Sort by frequency descending
    const sorted = [...words].sort((a, b) => b.frequency - a.frequency);
    const total = sorted.length;
    
    // Divide into thirds to ensure all 3 colors are always present
    const highThreshold = Math.ceil(total / 3);
    const mediumThreshold = Math.ceil((total * 2) / 3);
    
    return sorted.map((w, index) => {
      let category: 'high' | 'medium' | 'low';
      if (index < highThreshold) {
        category = 'high'; // Red - top third
      } else if (index < mediumThreshold) {
        category = 'medium'; // Green - middle third
      } else {
        category = 'low'; // Blue - bottom third
      }
      return { ...w, category };
    });
  };

  const realTimeWordCloud = [
    { word: "technology", frequency: 89, category: "high" as const },
    { word: "innovation", frequency: 76, category: "high" as const },
    { word: "discussion", frequency: 55, category: "medium" as const },
    { word: "update", frequency: 48, category: "medium" as const },
    { word: "community", frequency: 42, category: "medium" as const },
    { word: "analysis", frequency: 35, category: "low" as const },
    { word: "trends", frequency: 28, category: "low" as const },
    { word: "insights", frequency: 22, category: "low" as const },
  ];

  // Calculate real activity timeline from actual activities
  const getActivityTimelineData = () => {
    if (activities.length === 0) {
      return [
        { name: '6h ago', value: 0 },
        { name: '5h ago', value: 0 },
        { name: '4h ago', value: 0 },
        { name: '3h ago', value: 0 },
        { name: '2h ago', value: 0 },
        { name: '1h ago', value: 0 },
      ];
    }

    const now = Date.now();
    const hourBuckets: { [key: number]: number } = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 };
    
    activities.forEach(activity => {
      // Use created_utc directly (Unix timestamp in seconds)
      const activityTime = activity.created_utc * 1000;
      const hoursAgo = Math.floor((now - activityTime) / (1000 * 60 * 60));
      
      if (hoursAgo >= 0 && hoursAgo < 6) {
        hourBuckets[hoursAgo + 1]++;
      } else if (hoursAgo >= 6) {
        hourBuckets[6]++;
      }
    });
    
    return [
      { name: '6h ago', value: hourBuckets[6] },
      { name: '5h ago', value: hourBuckets[5] },
      { name: '4h ago', value: hourBuckets[4] },
      { name: '3h ago', value: hourBuckets[3] },
      { name: '2h ago', value: hourBuckets[2] },
      { name: '1h ago', value: hourBuckets[1] },
    ];
  };

  const activityTimelineData = getActivityTimelineData();

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

  const handleStopMonitoring = async () => {
    // Save monitoring session to investigation context before stopping
    if (profileData && searchType) {
      const sessionData = {
        searchType: searchType,
        targetName: profileData.username || profileData.communityName || searchQuery,
        profileData: profileData,
        activities: activities,
        wordCloudData: wordCloudData,
        startedAt: monitoringStartTimeRef.current,
        newActivityCount: newActivityCount,
      };
      
      addMonitoringSession(sessionData);
      
      // Also save to database if there's an active case
      if (currentCase?.id) {
        try {
          await saveMonitoringSessionToDb(sessionData);
        } catch (dbErr) {
          console.error('Failed to save session to database:', dbErr);
        }
      }
    }
    
    setIsMonitoring(false);
    setIsFetching(false);
    if (monitoringIntervalRef.current) {
      clearInterval(monitoringIntervalRef.current);
      monitoringIntervalRef.current = null;
    }
    toast({
      title: "Monitoring Stopped & Saved",
      description: newActivityCount > 0 
        ? `Session saved. Detected ${newActivityCount} new items during this session.`
        : "Session saved. Real-time monitoring paused.",
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


  const handleStartMonitoring = async () => {
    setIsViewingSavedSession(false);
    setIsMonitoring(true);
    setNewActivityCount(0);
    monitoringStartTimeRef.current = new Date().toISOString();

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

      // Use local scraper if available, falls back to Edge Function
      let redditData;
      try {
        redditData = await scrapeReddit({
          type: searchType,
          username: searchType === 'user' ? cleanQuery : undefined,
          subreddit: searchType === 'community' ? cleanQuery : undefined,
        });
      } catch (redditError) {
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
            created_utc: post.created_utc,
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
            created_utc: comment.created_utc,
            url: `https://reddit.com${comment.permalink}`
          });
        });
      }

      // Sort by created_utc (Unix timestamp) descending - most recent first
      newActivities.sort((a, b) => b.created_utc - a.created_utc);
      
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
      
      // Activities are already sorted by created_utc, just use them
      setActivities(newActivities);
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

      const sortedWords = Object.entries(wordFreq)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 15)
        .map(([word, freq]) => ({ word, frequency: freq }));
      
      const newWordCloud = generateWordCloudWithCategories(sortedWords);
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

      const redditData = await scrapeReddit({
        type: searchType,
        username: searchType === 'user' ? cleanQuery : undefined,
        subreddit: searchType === 'community' ? cleanQuery : undefined,
      });

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
          description: subreddit.public_description || 'No description available',
          createdDate,
          weeklyVisitors: redditData.weeklyVisitors || 0,
          weeklyContributors: uniqueAuthors.size,
          bannerImg: '',
          iconImg: '',
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

  // Reset when search type changes (but never wipe a saved-session load)
  useEffect(() => {
    if (suppressResetOnSearchTypeChangeRef.current) {
      suppressResetOnSearchTypeChangeRef.current = false;
      return;
    }
    handleClearSearch();
  }, [searchType]);

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="text-center">
          <h2 className="text-2xl font-bold text-foreground mb-2">Reddit Monitoring</h2>
          <p className="text-muted-foreground">
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
          <Card className="border-2 animate-fade-in overflow-hidden">
            {/* Banner Image for Communities */}
            {profileData.communityName && profileData.bannerImg && (
              <div className="relative h-32 w-full bg-muted">
                <img 
                  src={profileData.bannerImg} 
                  alt={`${profileData.communityName} banner`}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = 'none';
                  }}
                />
              </div>
            )}
            <CardHeader className={profileData.communityName && profileData.iconImg ? 'relative' : ''}>
              {/* Community Icon */}
              {profileData.communityName && profileData.iconImg && (
                <div className={`absolute ${profileData.bannerImg ? '-top-8' : 'top-4'} left-6`}>
                  <div className="w-16 h-16 rounded-full border-4 border-background bg-background overflow-hidden shadow-lg">
                    <img 
                      src={profileData.iconImg} 
                      alt={`${profileData.communityName} icon`}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        (e.target as HTMLImageElement).parentElement!.innerHTML = '<div class="w-full h-full bg-primary/20 flex items-center justify-center"><span class="text-primary font-bold text-xl">r/</span></div>';
                      }}
                    />
                  </div>
                </div>
              )}
              <CardTitle className={`flex items-center gap-2 ${profileData.communityName && profileData.iconImg ? 'ml-20' : ''}`}>
                {profileData.username ? (
                  <User className="h-5 w-5" />
                ) : !profileData.iconImg ? (
                  <Users className="h-5 w-5" />
                ) : null}
                {profileData.username || profileData.communityName}
              </CardTitle>
              <CardDescription className={profileData.communityName && profileData.iconImg ? 'ml-20' : ''}>
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
              
              {!isMonitoring && !isViewingSavedSession && (
                <div className="flex flex-col items-center gap-2 pt-4 border-t">
                  <Button
                    onClick={() => {
                      setIsViewingSavedSession(false);
                      handleStartMonitoring();
                    }}
                    size="lg"
                    className="w-full max-w-md"
                  >
                    <Activity className="mr-2 h-4 w-4" />
                    Start Monitoring
                  </Button>
                  <p className="text-xs text-muted-foreground text-center">
                    Click 'Start Monitoring' to begin real-time tracking of activity and trends.
                  </p>
                </div>
              )}

              {isViewingSavedSession && !isMonitoring && (
                <div className="flex flex-col items-center gap-2 pt-4 border-t">
                  <div className="text-xs text-muted-foreground text-center">
                    You are viewing a saved session (no re-scrape / no API usage).
                  </div>
                  <Button
                    onClick={() => {
                      setIsViewingSavedSession(false);
                      handleStartMonitoring();
                    }}
                    size="lg"
                    variant="default"
                    className="w-full max-w-md"
                  >
                    <Activity className="mr-2 h-4 w-4" />
                    Resume Live Monitoring
                  </Button>
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

        {/* Main Monitoring Dashboard - shown for live monitoring OR saved session viewing */}
        {(isMonitoring || isViewingSavedSession) && profileData && (
          <div className="space-y-6 animate-fade-in">
            {/* For User monitoring - Full width Notifications, then Word Cloud + Activity Breakdown side by side */}
            {!profileData.communityName && (
              <>
                {/* Notifications - Full Width */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Activity className="h-5 w-5" />
                      Notifications
                      <Badge
                        variant="default"
                        className={`ml-auto ${isViewingSavedSession ? '' : 'animate-pulse'}`}
                      >
                        {isViewingSavedSession ? 'Saved' : 'Live'}
                      </Badge>
                    </CardTitle>
                    <CardDescription>
                      {isViewingSavedSession ? 'Saved activities from this session' : 'Latest Reddit activities'}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
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
                  </CardContent>
                </Card>

                {/* Word Cloud + Activity Breakdown - Side by Side */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <Card>
                    <CardHeader>
                      <CardTitle>Trending Keywords (Recent Activity)</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <WordCloud words={wordCloudData.length > 0 ? wordCloudData : realTimeWordCloud} title="" />
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle>Activity Breakdown</CardTitle>
                      <CardDescription>Posts vs Comments distribution</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <AnalyticsChart data={activityBreakdownData} title="" type="bar" height={250} />
                    </CardContent>
                  </Card>
                </div>
              </>
            )}

            {/* For Community monitoring - Original layout */}
            {profileData.communityName && (
              <div className="space-y-6">
                {/* Notifications */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Activity className="h-5 w-5" />
                      Notifications
                      <Badge
                        variant="default"
                        className={`ml-auto ${isViewingSavedSession ? '' : 'animate-pulse'}`}
                      >
                        {isViewingSavedSession ? 'Saved' : 'Live'}
                      </Badge>
                    </CardTitle>
                    <CardDescription>
                      {isViewingSavedSession ? 'Saved activities from this session' : 'Latest Reddit activities'}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
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
                  </CardContent>
                </Card>

                {/* Word Cloud and Weekly Contributors - Community monitoring (side by side) */}
                <div className="grid grid-cols-2 gap-4">
                  {/* Trending Keywords - Half width */}
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base">Trending Keywords</CardTitle>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <WordCloud words={wordCloudData.length > 0 ? wordCloudData : realTimeWordCloud} title="" />
                    </CardContent>
                  </Card>

                  {/* Weekly Contributors Card */}
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base flex items-center gap-2">
                        <Users className="h-4 w-4" />
                        Weekly Contributions
                      </CardTitle>
                      <CardDescription className="text-xs">
                        From Reddit community stats
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="flex items-center justify-center min-h-[220px]">
                      <div className="text-center text-muted-foreground">
                        <Users className="h-12 w-12 mx-auto mb-3 opacity-30" />
                        <p className="text-sm font-medium">Weekly contributions not available</p>
                        <p className="text-xs mt-1 max-w-[200px]">Reddit's API doesn't expose this metric. Visit Reddit directly to see this data.</p>
                        <a 
                          href={`https://reddit.com/${profileData.communityName}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-xs text-primary hover:underline mt-3"
                        >
                          <ExternalLink className="h-3 w-3" />
                          View on Reddit
                        </a>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Activity Breakdown - Community monitoring */}
                <Card>
                  <CardHeader>
                    <CardTitle>Posts (Last 3 Days)</CardTitle>
                    <CardDescription>Daily post distribution</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <AnalyticsChart data={activityBreakdownData} title="" type="bar" height={250} />
                  </CardContent>
                </Card>
              </div>
            )}
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
