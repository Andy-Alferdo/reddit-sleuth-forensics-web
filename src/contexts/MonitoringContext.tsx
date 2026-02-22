import React, { createContext, useContext, useState, useRef, useCallback, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { formatCurrentTimePakistan, formatActivityTime } from '@/lib/dateUtils';
import { useToast } from '@/hooks/use-toast';
import { useInvestigation } from '@/contexts/InvestigationContext';

// ── Types ──────────────────────────────────────────────────────────────────────
export interface RedditActivity {
  id: string;
  type: 'post' | 'comment';
  title: string;
  subreddit: string;
  timestamp: string;
  created_utc: number;
  url: string;
}

export interface ProfileData {
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

export interface MonitoringTarget {
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

export const MAX_TARGETS = 5;

// ── Helpers ────────────────────────────────────────────────────────────────────
const STOP_WORDS = ['that', 'this', 'with', 'from', 'have', 'been', 'will', 'your', 'their', 'what', 'when', 'where'];

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

const buildActivities = (posts: any[], comments: any[]): RedditActivity[] => {
  const acts: RedditActivity[] = [];
  (posts || []).forEach((post: any) => {
    acts.push({
      id: post.id || Math.random().toString(),
      type: 'post',
      title: post.title,
      subreddit: `r/${post.subreddit}`,
      timestamp: formatActivityTime(post.created_utc),
      created_utc: post.created_utc,
      url: `https://reddit.com${post.permalink}`,
    });
  });
  (comments || []).forEach((comment: any) => {
    acts.push({
      id: comment.id || Math.random().toString(),
      type: 'comment',
      title: comment.body.substring(0, 100) + (comment.body.length > 100 ? '...' : ''),
      subreddit: `r/${comment.subreddit}`,
      timestamp: formatActivityTime(comment.created_utc),
      created_utc: comment.created_utc,
      url: `https://reddit.com${comment.permalink}`,
    });
  });
  acts.sort((a, b) => b.created_utc - a.created_utc);
  return acts;
};

const buildWordCloud = (posts: any[], comments: any[]) => {
  const textContent = [
    ...(posts || []).map((p: any) => `${p.title} ${p.selftext || ''}`),
    ...(comments || []).map((c: any) => c.body),
  ].join(' ');
  const words = textContent.toLowerCase().match(/\b[a-z]{4,}\b/g) || [];
  const wordFreq: Record<string, number> = {};
  words.forEach((word) => {
    if (!STOP_WORDS.includes(word)) wordFreq[word] = (wordFreq[word] || 0) + 1;
  });
  const sorted = Object.entries(wordFreq)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 15)
    .map(([word, freq]) => ({ word, frequency: freq }));
  return generateWordCloudWithCategories(sorted);
};

// ── Context ────────────────────────────────────────────────────────────────────
interface MonitoringContextType {
  targets: MonitoringTarget[];
  selectedTargetId: string | null;
  setSelectedTargetId: (id: string | null) => void;
  selectedTarget: MonitoringTarget | null;
  isSearching: boolean;
  handleSearch: (query: string, type: 'user' | 'community') => Promise<void>;
  handleStopTarget: (targetId: string) => Promise<void>;
  handleRestartTarget: (targetId: string) => void;
  handleRemoveTarget: (targetId: string) => void;
  loadSavedSession: (sessionId: string) => Promise<void>;
}

const MonitoringContext = createContext<MonitoringContextType | undefined>(undefined);

export const MonitoringProvider = ({ children }: { children: ReactNode }) => {
  const { toast } = useToast();
  const { addMonitoringSession, saveMonitoringSessionToDb, currentCase } = useInvestigation();

  const [targets, setTargets] = useState<MonitoringTarget[]>([]);
  const [selectedTargetId, setSelectedTargetId] = useState<string | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const intervalsRef = useRef<Map<string, number>>(new Map());

  const selectedTarget = targets.find((t) => t.id === selectedTargetId) || null;

  const updateTarget = useCallback((id: string, updates: Partial<MonitoringTarget>) => {
    setTargets((prev) => prev.map((t) => (t.id === id ? { ...t, ...updates } : t)));
  }, []);

  // ── Start interval for a target ───────────────────────────────────────────
  const startInterval = useCallback(
    (targetId: string, cleanQuery: string, searchType: 'user' | 'community') => {
      const existing = intervalsRef.current.get(targetId);
      if (existing) clearInterval(existing);

      const intervalId = window.setInterval(async () => {
        try {
          const { data: rd, error: re } = await supabase.functions.invoke('reddit-scraper', {
            body: {
              username: searchType === 'user' ? cleanQuery : undefined,
              subreddit: searchType === 'community' ? cleanQuery : undefined,
              type: searchType,
            },
          });
          if (re || !rd) return;

          const acts = buildActivities(rd.posts, rd.comments);
          const wc = buildWordCloud(rd.posts, rd.comments);

          setTargets((prev) =>
            prev.map((t) => {
              if (t.id !== targetId) return t;
              const existingIds = new Set(t.activities.map((a) => a.id));
              const newItems = acts.filter((a) => !existingIds.has(a.id));
              return {
                ...t,
                activities: acts,
                wordCloudData: wc,
                newActivityCount: t.newActivityCount + newItems.length,
                lastFetchTime: formatCurrentTimePakistan(),
                isFetching: false,
              };
            })
          );
        } catch (err) {
          console.error('Interval fetch error:', err);
        }
      }, 15000);

      intervalsRef.current.set(targetId, intervalId);
    },
    []
  );

  // ── Search & add target ───────────────────────────────────────────────────
  const handleSearch = useCallback(
    async (query: string, searchType: 'user' | 'community') => {
      if (!query.trim()) return;

      const activeCount = targets.filter((t) => t.isMonitoring).length;
      if (activeCount >= MAX_TARGETS) {
        toast({
          title: 'Maximum Active Targets Reached',
          description: `You can have up to ${MAX_TARGETS} active monitors. Stop one to add another.`,
          variant: 'destructive',
        });
        return;
      }
      // Evict oldest stopped if all slots full
      if (targets.length >= MAX_TARGETS) {
        const oldestStopped = targets.find((t) => !t.isMonitoring);
        if (oldestStopped) {
          setTargets((prev) => prev.filter((t) => t.id !== oldestStopped.id));
        } else {
          toast({
            title: 'Maximum Targets Reached',
            description: `Stop one to add another.`,
            variant: 'destructive',
          });
          return;
        }
      }

      const cleanQuery = searchType === 'user' ? query.replace(/^u\//, '') : query.replace(/^r\//, '');
      const displayName = searchType === 'user' ? `u/${cleanQuery}` : `r/${cleanQuery}`;

      if (targets.some((t) => t.name.toLowerCase() === displayName.toLowerCase())) {
        toast({ title: 'Already Monitoring', description: `${displayName} is already being monitored.`, variant: 'destructive' });
        return;
      }

      setIsSearching(true);

      try {
        const { data: redditData, error: redditError } = await supabase.functions.invoke('reddit-scraper', {
          body: {
            username: searchType === 'user' ? cleanQuery : undefined,
            subreddit: searchType === 'community' ? cleanQuery : undefined,
            type: searchType,
          },
        });

        if (redditError) throw redditError;

        if (redditData?.error === 'not_found') {
          toast({
            title: `${searchType === 'user' ? 'User' : 'Community'} Not Found`,
            description: redditData.message,
            variant: 'destructive',
          });
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
            ...(redditData.comments || []).map((c: any) => c.subreddit),
          ]);
          profileData = {
            username: displayName,
            accountAge: `${years} years, ${months} months`,
            totalKarma: user.link_karma + user.comment_karma,
            activeSubreddits: subreddits.size,
          };
        } else {
          const sub = redditData.subreddit;
          const createdDate = new Date(sub.created_utc * 1000).toLocaleDateString('en-US', {
            month: 'short', day: 'numeric', year: 'numeric',
          });
          const oneWeekAgo = Date.now() / 1000 - 7 * 24 * 60 * 60;
          const weeklyPosts = (redditData.posts || []).filter((p: any) => p.created_utc >= oneWeekAgo);
          const uniqueAuthors = new Set(weeklyPosts.map((p: any) => p.author));
          profileData = {
            communityName: displayName,
            memberCount: sub.subscribers / 1000000 >= 1 ? `${(sub.subscribers / 1000000).toFixed(1)}M` : `${(sub.subscribers / 1000).toFixed(1)}K`,
            description: sub.public_description || sub.description || 'No description available',
            createdDate,
            weeklyVisitors: redditData.weeklyVisitors || 0,
            weeklyContributors: uniqueAuthors.size,
            bannerImg: sub.banner_img || sub.banner_background_image?.split('?')[0] || '',
            iconImg: sub.icon_img || sub.community_icon?.split('?')[0] || '',
          };
        }

        const initialActivities = buildActivities(redditData.posts, redditData.comments);
        const wordCloudData = buildWordCloud(redditData.posts, redditData.comments);

        const targetId = crypto.randomUUID();
        const newTarget: MonitoringTarget = {
          id: targetId,
          name: displayName,
          type: searchType,
          profileData,
          activities: initialActivities,
          wordCloudData,
          isMonitoring: true,
          isFetching: false,
          lastFetchTime: formatCurrentTimePakistan(),
          newActivityCount: 0,
          startedAt: new Date().toISOString(),
        };

        setTargets((prev) => [...prev, newTarget]);
        setSelectedTargetId(targetId);

        startInterval(targetId, cleanQuery, searchType);

        toast({ title: 'Monitoring Started', description: `Now monitoring ${displayName}. Live scraping every 15 seconds.` });
      } catch (error: any) {
        console.error('Error searching Reddit:', error);
        toast({ title: 'Search Failed', description: error.message || 'Failed to search.', variant: 'destructive' });
      } finally {
        setIsSearching(false);
      }
    },
    [targets, toast, startInterval]
  );

  // ── Stop target ───────────────────────────────────────────────────────────
  const handleStopTarget = useCallback(
    async (targetId: string) => {
      const target = targets.find((t) => t.id === targetId);
      if (!target) return;

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

      const intervalId = intervalsRef.current.get(targetId);
      if (intervalId) {
        clearInterval(intervalId);
        intervalsRef.current.delete(targetId);
      }

      updateTarget(targetId, { isMonitoring: false, isFetching: false });
      toast({ title: 'Monitoring Stopped & Saved', description: `${target.name} monitoring stopped. Session saved.` });
    },
    [targets, addMonitoringSession, saveMonitoringSessionToDb, currentCase, updateTarget, toast]
  );

  // ── Restart stopped target ─────────────────────────────────────────────
  const handleRestartTarget = useCallback(
    (targetId: string) => {
      const target = targets.find((t) => t.id === targetId);
      if (!target || target.isMonitoring) return;

      const activeCount = targets.filter((t) => t.isMonitoring).length;
      if (activeCount >= MAX_TARGETS) {
        toast({
          title: 'Maximum Active Targets Reached',
          description: `Stop one to restart another.`,
          variant: 'destructive',
        });
        return;
      }

      updateTarget(targetId, { isMonitoring: true, isFetching: false, newActivityCount: 0 });
      const cleanQuery = target.type === 'user' ? target.name.replace(/^u\//, '') : target.name.replace(/^r\//, '');
      startInterval(targetId, cleanQuery, target.type);
      toast({ title: 'Monitoring Restarted', description: `${target.name} is live again.` });
    },
    [targets, toast, updateTarget, startInterval]
  );

  // ── Remove (dismiss) ─────────────────────────────────────────────────────
  const handleRemoveTarget = useCallback(
    (targetId: string) => {
      setTargets((prev) => prev.filter((t) => t.id !== targetId));
      if (selectedTargetId === targetId) setSelectedTargetId(null);
    },
    [selectedTargetId]
  );

  // ── Load saved session ────────────────────────────────────────────────────
  const loadSavedSession = useCallback(
    async (sessionId: string) => {
      setIsSearching(true);
      try {
        const { data, error } = await supabase
          .from('monitoring_sessions')
          .select('*')
          .eq('id', sessionId)
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

        setTargets((prev) => [...prev, newTarget]);
        setSelectedTargetId(targetId);
        toast({ title: 'Loaded past session', description: `Showing saved results for ${data.target_name}` });
      } catch (e: any) {
        toast({ title: 'Failed to load session', description: e?.message || 'Could not load saved session', variant: 'destructive' });
      } finally {
        setIsSearching(false);
      }
    },
    [toast]
  );

  return (
    <MonitoringContext.Provider
      value={{
        targets,
        selectedTargetId,
        setSelectedTargetId,
        selectedTarget,
        isSearching,
        handleSearch,
        handleStopTarget,
        handleRestartTarget,
        handleRemoveTarget,
        loadSavedSession,
      }}
    >
      {children}
    </MonitoringContext.Provider>
  );
};

export const useMonitoring = () => {
  const context = useContext(MonitoringContext);
  if (!context) {
    throw new Error('useMonitoring must be used within a MonitoringProvider');
  }
  return context;
};
