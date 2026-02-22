import { useState, useEffect, useRef, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, SelectLabel, SelectGroup, SelectSeparator } from '@/components/ui/select';
import { Search, User, Users, X, Loader2, Plus } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { formatCurrentTimePakistan, formatActivityTime } from '@/lib/dateUtils';
import { useInvestigation } from '@/contexts/InvestigationContext';
import { MonitoringTargetCard } from '@/components/monitoring/MonitoringTargetCard';
import { MonitoringDetailView } from '@/components/monitoring/MonitoringDetailView';

interface RedditActivity {
  id: string;
  type: 'post' | 'comment';
  title: string;
  subreddit: string;
  timestamp: string;
  created_utc: number;
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

interface MonitoringTarget {
  id: string;
  name: string;
  type: 'user' | 'community';
  profileData: ProfileData;
  activities: RedditActivity[];
  wordCloudData: any[];
  isMonitoring: boolean;
  isFetching: boolean;
  lastFetchTime: string;
  newActivityCount: number;
  startedAt: string;
}

const MAX_TARGETS = 5;

const generateWordCloudWithCategories = (words: { word: string; frequency: number }[]) => {
  if (words.length === 0) return [];
  const sorted = [...words].sort((a, b) => b.frequency - a.frequency);
  const total = sorted.length;
  const highThreshold = Math.ceil(total / 3);
  const mediumThreshold = Math.ceil((total * 2) / 3);
  return sorted.map((w, index) => {
    let category: 'high' | 'medium' | 'low';
    if (index < highThreshold) category = 'high';
    else if (index < mediumThreshold) category = 'medium';
    else category = 'low';
    return { ...w, category };
  });
};

const Monitoring = () => {
  const { toast } = useToast();
  const location = useLocation();
  const { addMonitoringSession, saveMonitoringSessionToDb, currentCase } = useInvestigation();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchType, setSearchType] = useState<'user' | 'community' | ''>('');
  const [isSearching, setIsSearching] = useState(false);

  // Multi-target state
  const [targets, setTargets] = useState<MonitoringTarget[]>([]);
  const [selectedTargetId, setSelectedTargetId] = useState<string | null>(null);
  const intervalsRef = useRef<Map<string, number>>(new Map());

  // Get selected target
  const selectedTarget = targets.find(t => t.id === selectedTargetId) || null;

  // Update a specific target
  const updateTarget = useCallback((id: string, updates: Partial<MonitoringTarget>) => {
    setTargets(prev => prev.map(t => t.id === id ? { ...t, ...updates } : t));
  }, []);

  // Fetch Reddit data for a target
  const fetchRedditDataForTarget = useCallback(async (targetId: string, isInitial: boolean = false) => {
    const target = targets.find(t => t.id === targetId);
    if (!target) return;

    // Prevent concurrent fetches
    if (target.isFetching && !isInitial) return;

    setTargets(prev => prev.map(t => t.id === targetId ? { ...t, isFetching: true } : t));

    try {
      const cleanQuery = target.type === 'user'
        ? target.name.replace(/^u\//, '')
        : target.name.replace(/^r\//, '');

      const { data: redditData, error: redditError } = await supabase.functions.invoke('reddit-scraper', {
        body: {
          username: target.type === 'user' ? cleanQuery : undefined,
          subreddit: target.type === 'community' ? cleanQuery : undefined,
          type: target.type
        }
      });

      if (redditError) {
        console.error('Error fetching Reddit data:', redditError);
        return;
      }

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

      newActivities.sort((a, b) => b.created_utc - a.created_utc);

      // Detect new activities
      setTargets(prev => {
        return prev.map(t => {
          if (t.id !== targetId) return t;

          let addedNew = 0;
          if (!isInitial && t.activities.length > 0) {
            const existingIds = new Set(t.activities.map(a => a.id));
            addedNew = newActivities.filter(a => !existingIds.has(a.id)).length;
          }

          // Word cloud
          const textContent = [
            ...(redditData.posts || []).map((p: any) => `${p.title} ${p.selftext || ''}`),
            ...(redditData.comments || []).map((c: any) => c.body)
          ].join(' ');

          const words = textContent.toLowerCase().match(/\b[a-z]{4,}\b/g) || [];
          const wordFreq: { [key: string]: number } = {};
          const stopWords = ['that', 'this', 'with', 'from', 'have', 'been', 'will', 'your', 'their', 'what', 'when', 'where'];
          words.forEach(word => {
            if (!stopWords.includes(word)) wordFreq[word] = (wordFreq[word] || 0) + 1;
          });

          const sortedWords = Object.entries(wordFreq)
            .sort(([, a], [, b]) => b - a)
            .slice(0, 15)
            .map(([word, freq]) => ({ word, frequency: freq }));

          return {
            ...t,
            activities: newActivities,
            wordCloudData: generateWordCloudWithCategories(sortedWords),
            newActivityCount: t.newActivityCount + addedNew,
            lastFetchTime: formatCurrentTimePakistan(),
            isFetching: false,
          };
        });
      });

      if (!isInitial) {
        // Check for new items notification
        const currentTarget = targets.find(t => t.id === targetId);
        if (currentTarget && currentTarget.activities.length > 0) {
          const existingIds = new Set(currentTarget.activities.map(a => a.id));
          const newItems = newActivities.filter(a => !existingIds.has(a.id));
          if (newItems.length > 0) {
            toast({
              title: `New Activity - ${currentTarget.name}`,
              description: `${newItems.length} new ${newItems.length === 1 ? 'item' : 'items'} found!`,
            });
          }
        }
      }

    } catch (error) {
      console.error('Error in fetchRedditData:', error);
      setTargets(prev => prev.map(t => t.id === targetId ? { ...t, isFetching: false } : t));
    }
  }, [targets, toast]);

  // Start monitoring interval for a target
  const startMonitoringInterval = useCallback((targetId: string) => {
    // Clear existing interval if any
    const existing = intervalsRef.current.get(targetId);
    if (existing) clearInterval(existing);

    const intervalId = window.setInterval(() => {
      fetchRedditDataForTarget(targetId, false);
    }, 15000);

    intervalsRef.current.set(targetId, intervalId);
  }, [fetchRedditDataForTarget]);

  // Handle search - add new monitoring target
  const handleSearch = async () => {
    if (!searchQuery.trim() || !searchType) return;

    if (targets.length >= MAX_TARGETS) {
      toast({
        title: "Maximum Targets Reached",
        description: `You can monitor up to ${MAX_TARGETS} targets simultaneously. Stop one to add another.`,
        variant: "destructive",
      });
      return;
    }

    // Check for duplicates
    const cleanQuery = searchType === 'user'
      ? searchQuery.replace(/^u\//, '')
      : searchQuery.replace(/^r\//, '');
    const displayName = searchType === 'user' ? `u/${cleanQuery}` : `r/${cleanQuery}`;

    if (targets.some(t => t.name.toLowerCase() === displayName.toLowerCase())) {
      toast({
        title: "Already Monitoring",
        description: `${displayName} is already being monitored.`,
        variant: "destructive",
      });
      return;
    }

    setIsSearching(true);

    try {
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
        setIsSearching(false);
        return;
      }

      let profileData: ProfileData;

      if (searchType === 'user') {
        const user = redditData.user;
        const accountCreated = new Date(user.created_utc * 1000);
        const now = new Date();
        const ageInYears = (now.getTime() - accountCreated.getTime()) / (1000 * 60 * 60 * 24 * 365);
        const years = Math.floor(ageInYears);
        const months = Math.floor((ageInYears - years) * 12);

        const subreddits = new Set([
          ...(redditData.posts || []).map((p: any) => p.subreddit),
          ...(redditData.comments || []).map((c: any) => c.subreddit)
        ]);

        profileData = {
          username: displayName,
          accountAge: `${years} years, ${months} months`,
          totalKarma: user.link_karma + user.comment_karma,
          activeSubreddits: subreddits.size,
        };
      } else {
        const subreddit = redditData.subreddit;
        const createdDate = new Date(subreddit.created_utc * 1000).toLocaleDateString('en-US', {
          month: 'short', day: 'numeric', year: 'numeric'
        });
        const oneWeekAgo = Date.now() / 1000 - (7 * 24 * 60 * 60);
        const weeklyPosts = (redditData.posts || []).filter((p: any) => p.created_utc >= oneWeekAgo);
        const uniqueAuthors = new Set(weeklyPosts.map((p: any) => p.author));

        profileData = {
          communityName: displayName,
          memberCount: (subreddit.subscribers / 1000000 >= 1)
            ? `${(subreddit.subscribers / 1000000).toFixed(1)}M`
            : `${(subreddit.subscribers / 1000).toFixed(1)}K`,
          description: subreddit.public_description || subreddit.description || 'No description available',
          createdDate,
          weeklyVisitors: redditData.weeklyVisitors || 0,
          weeklyContributors: uniqueAuthors.size,
          bannerImg: subreddit.banner_img || subreddit.banner_background_image?.split('?')[0] || '',
          iconImg: subreddit.icon_img || subreddit.community_icon?.split('?')[0] || '',
        };
      }

      // Process initial activities
      const initialActivities: RedditActivity[] = [];
      if (redditData.posts) {
        redditData.posts.forEach((post: any) => {
          initialActivities.push({
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
          initialActivities.push({
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
      initialActivities.sort((a, b) => b.created_utc - a.created_utc);

      // Word cloud
      const textContent = [
        ...(redditData.posts || []).map((p: any) => `${p.title} ${p.selftext || ''}`),
        ...(redditData.comments || []).map((c: any) => c.body)
      ].join(' ');
      const wordMatches = textContent.toLowerCase().match(/\b[a-z]{4,}\b/g) || [];
      const wordFreq: { [key: string]: number } = {};
      const stopWords = ['that', 'this', 'with', 'from', 'have', 'been', 'will', 'your', 'their', 'what', 'when', 'where'];
      wordMatches.forEach(word => {
        if (!stopWords.includes(word)) wordFreq[word] = (wordFreq[word] || 0) + 1;
      });
      const sortedWords = Object.entries(wordFreq)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 15)
        .map(([word, freq]) => ({ word, frequency: freq }));

      const targetId = crypto.randomUUID();
      const newTarget: MonitoringTarget = {
        id: targetId,
        name: displayName,
        type: searchType,
        profileData,
        activities: initialActivities,
        wordCloudData: generateWordCloudWithCategories(sortedWords),
        isMonitoring: true,
        isFetching: false,
        lastFetchTime: formatCurrentTimePakistan(),
        newActivityCount: 0,
        startedAt: new Date().toISOString(),
      };

      setTargets(prev => [...prev, newTarget]);
      setSelectedTargetId(targetId);
      setSearchQuery('');

      // Start monitoring interval
      const intervalId = window.setInterval(() => {
        // We need to use the ref-based approach since fetchRedditDataForTarget captures stale state
        // Instead, we'll handle fetching inside the interval directly
      }, 15000);

      // Actually set up the interval properly
      intervalsRef.current.set(targetId, window.setInterval(async () => {
        try {
          const cq = searchType === 'user' ? cleanQuery : cleanQuery;
          const { data: rd, error: re } = await supabase.functions.invoke('reddit-scraper', {
            body: {
              username: searchType === 'user' ? cq : undefined,
              subreddit: searchType === 'community' ? cq : undefined,
              type: searchType
            }
          });
          if (re || !rd) return;

          const acts: RedditActivity[] = [];
          if (rd.posts) {
            rd.posts.forEach((post: any) => {
              acts.push({
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
          if (rd.comments) {
            rd.comments.forEach((comment: any) => {
              acts.push({
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
          acts.sort((a, b) => b.created_utc - a.created_utc);

          const tc = [
            ...(rd.posts || []).map((p: any) => `${p.title} ${p.selftext || ''}`),
            ...(rd.comments || []).map((c: any) => c.body)
          ].join(' ');
          const wm = tc.toLowerCase().match(/\b[a-z]{4,}\b/g) || [];
          const wf: { [key: string]: number } = {};
          wm.forEach(w => { if (!stopWords.includes(w)) wf[w] = (wf[w] || 0) + 1; });
          const sw = Object.entries(wf).sort(([, a], [, b]) => b - a).slice(0, 15).map(([word, freq]) => ({ word, frequency: freq }));

          setTargets(prev => prev.map(t => {
            if (t.id !== targetId) return t;
            const existingIds = new Set(t.activities.map(a => a.id));
            const newItems = acts.filter(a => !existingIds.has(a.id));
            return {
              ...t,
              activities: acts,
              wordCloudData: generateWordCloudWithCategories(sw),
              newActivityCount: t.newActivityCount + newItems.length,
              lastFetchTime: formatCurrentTimePakistan(),
              isFetching: false,
            };
          }));
        } catch (err) {
          console.error('Interval fetch error:', err);
        }
      }, 15000));

      clearInterval(intervalId); // Clear the empty one

      toast({
        title: "Monitoring Started",
        description: `Now monitoring ${displayName}. Live scraping every 15 seconds.`,
      });

    } catch (error: any) {
      console.error('Error searching Reddit:', error);
      toast({
        title: "Search Failed",
        description: error.message || 'Failed to search. Please try again.',
        variant: "destructive",
      });
    } finally {
      setIsSearching(false);
    }
  };

  // Stop monitoring a target
  const handleStopTarget = async (targetId: string) => {
    const target = targets.find(t => t.id === targetId);
    if (!target) return;

    // Save session
    if (target.profileData && target.type) {
      const sessionData = {
        searchType: target.type,
        targetName: target.profileData.username || target.profileData.communityName || target.name,
        profileData: target.profileData,
        activities: target.activities,
        wordCloudData: target.wordCloudData,
        startedAt: target.startedAt,
        newActivityCount: target.newActivityCount,
      };
      addMonitoringSession(sessionData);
      if (currentCase?.id) {
        try {
          await saveMonitoringSessionToDb(sessionData);
        } catch (dbErr) {
          console.error('Failed to save session to database:', dbErr);
        }
      }
    }

    // Clear interval
    const intervalId = intervalsRef.current.get(targetId);
    if (intervalId) {
      clearInterval(intervalId);
      intervalsRef.current.delete(targetId);
    }

    // Remove target
    setTargets(prev => prev.filter(t => t.id !== targetId));
    if (selectedTargetId === targetId) setSelectedTargetId(null);

    toast({
      title: "Monitoring Stopped & Saved",
      description: `${target.name} monitoring stopped. Session saved.`,
    });
  };

  // Clean up all intervals on unmount
  useEffect(() => {
    return () => {
      intervalsRef.current.forEach((intervalId) => clearInterval(intervalId));
      intervalsRef.current.clear();
    };
  }, []);

  // Load saved session from navigation state
  useEffect(() => {
    const loadSessionId = (location.state as any)?.loadSession as string | undefined;
    if (!loadSessionId) return;

    (async () => {
      setIsSearching(true);
      try {
        const { data, error } = await supabase
          .from('monitoring_sessions')
          .select('*')
          .eq('id', loadSessionId)
          .maybeSingle();

        if (error) throw error;
        if (!data) throw new Error('Session not found');

        const loadedProfile = data.profile_data as ProfileData | null;
        const parsedProfile: ProfileData | null = loadedProfile
          ? { ...loadedProfile, username: loadedProfile.username || data.target_name }
          : data.search_type === 'user'
            ? { username: data.target_name, accountAge: 'N/A', totalKarma: 0, activeSubreddits: 0 }
            : { communityName: data.target_name, memberCount: 'N/A', description: '', createdDate: 'N/A' };

        if (!parsedProfile) return;

        const targetId = crypto.randomUUID();
        const newTarget: MonitoringTarget = {
          id: targetId,
          name: data.target_name || '',
          type: (data.search_type as 'user' | 'community') || 'user',
          profileData: parsedProfile,
          activities: Array.isArray(data.activities) ? (data.activities as unknown as RedditActivity[]) : [],
          wordCloudData: Array.isArray(data.word_cloud_data) ? (data.word_cloud_data as any) : [],
          isMonitoring: false,
          isFetching: false,
          lastFetchTime: '',
          newActivityCount: data.new_activity_count || 0,
          startedAt: data.started_at || '',
        };

        setTargets(prev => [...prev, newTarget]);
        setSelectedTargetId(targetId);

        toast({ title: 'Loaded past session', description: `Showing saved results for ${data.target_name}` });
      } catch (e: any) {
        toast({ title: 'Failed to load session', description: e?.message || 'Could not load saved session', variant: 'destructive' });
      } finally {
        setIsSearching(false);
      }
    })();
  }, [location.state, toast]);

  return (
    <div className="min-h-screen bg-background relative">
      {isSearching && (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-background/80 backdrop-blur-sm">
          <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
          <p className="text-lg font-medium text-foreground">Loading monitoring data...</p>
          <p className="text-sm text-muted-foreground mt-1">This may take a moment</p>
        </div>
      )}
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
                value={searchType || 'reset'}
                onValueChange={(value) => setSearchType(value === 'reset' ? '' : value as 'user' | 'community')}
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
                    onClick={() => setSearchQuery('')}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute right-2 top-1/2 -translate-y-1/2 h-7 w-7"
                  onClick={handleSearch}
                  disabled={!searchType || isSearching}
                >
                  <Search className="h-4 w-4" />
                </Button>
              </div>
            </div>
            {targets.length > 0 && (
              <p className="text-xs text-muted-foreground mt-2 text-center">
                {targets.length}/{MAX_TARGETS} monitoring slots used
              </p>
            )}
          </CardContent>
        </Card>

        {/* Detail View - when a target is selected */}
        {selectedTarget && (
          <MonitoringDetailView
            profileData={selectedTarget.profileData}
            activities={selectedTarget.activities}
            wordCloudData={selectedTarget.wordCloudData}
            isMonitoring={selectedTarget.isMonitoring}
            isFetching={selectedTarget.isFetching}
            lastFetchTime={selectedTarget.lastFetchTime}
            newActivityCount={selectedTarget.newActivityCount}
            onStop={() => handleStopTarget(selectedTarget.id)}
            onBack={() => setSelectedTargetId(null)}
          />
        )}

        {/* Monitoring Cards Grid - when no target is selected */}
        {!selectedTargetId && (
          <>
            {targets.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
                {targets.map(target => (
                  <MonitoringTargetCard
                    key={target.id}
                    id={target.id}
                    name={target.name}
                    type={target.type}
                    isMonitoring={target.isMonitoring}
                    isFetching={target.isFetching}
                    lastFetchTime={target.lastFetchTime}
                    newActivityCount={target.newActivityCount}
                    totalActivities={target.activities.length}
                    onSelect={setSelectedTargetId}
                    onStop={handleStopTarget}
                  />
                ))}
                {targets.length < MAX_TARGETS && (
                  <Card className="border-dashed border-2 flex items-center justify-center min-h-[180px] cursor-pointer hover:border-primary/50 transition-colors"
                    onClick={() => document.querySelector<HTMLInputElement>('input[placeholder]')?.focus()}>
                    <div className="text-center text-muted-foreground p-4">
                      <Plus className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      <p className="text-sm font-medium">Add Target</p>
                      <p className="text-xs">Search above to add</p>
                    </div>
                  </Card>
                )}
              </div>
            ) : (
              <Card className="border-dashed">
                <CardContent className="flex flex-col items-center justify-center py-16">
                  <Search className="h-16 w-16 text-muted-foreground mb-4" />
                  <p className="text-lg font-semibold mb-2">No Monitoring Active</p>
                  <p className="text-muted-foreground text-center max-w-md">
                    Enter a username or community above to start monitoring Reddit activity and trends in real-time. You can monitor up to {MAX_TARGETS} targets simultaneously.
                  </p>
                </CardContent>
              </Card>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default Monitoring;
