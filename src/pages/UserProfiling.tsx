import { useState, useEffect, useCallback, useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  ChevronDown, MessageSquare, Search, User, Zap, Loader2, X, ArrowLeft,
  Calendar, ThumbsUp, Activity, MapPin, Info, MessageCircle, ExternalLink,
  Clock, AlertCircle, Trash2, Bell, Shield, TrendingUp, Hash, BarChart3,
  Brain, Target, Globe
} from 'lucide-react';
import {
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RTooltip,
  LineChart, Line, XAxis, YAxis, CartesianGrid, BarChart, Bar
} from 'recharts';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { toZonedTime } from 'date-fns-tz';
import { useInvestigation } from '@/contexts/InvestigationContext';

const INITIAL_VISIBLE = 10;

// Helpers
const formatRelativeTime = (utc?: number) => {
  if (!utc) return '';
  const diff = (Date.now() / 1000) - utc;
  if (diff < 60) return `${Math.floor(diff)}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 2592000) return `${Math.floor(diff / 86400)}d ago`;
  return `${Math.floor(diff / 2592000)}mo ago`;
};

const sentimentTone = (s?: string) => {
  if (s === 'positive') return 'bg-emerald-50 text-emerald-700 border-emerald-200';
  if (s === 'negative') return 'bg-rose-50 text-rose-700 border-rose-200';
  return 'bg-slate-50 text-slate-700 border-slate-200';
};

const SENT_COLORS = { positive: '#10b981', neutral: '#94a3b8', negative: '#ef4444' };

const UserProfiling = () => {
  const location = useLocation();
  const [username, setUsername] = useState('');
  const [profileData, setProfileData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [visiblePosts, setVisiblePosts] = useState(INITIAL_VISIBLE);
  const [visibleComments, setVisibleComments] = useState(INITIAL_VISIBLE);
  const [postsSort, setPostsSort] = useState<'recent' | 'top' | 'controversial'>('recent');
  const [commentsSort, setCommentsSort] = useState<'recent' | 'top'>('recent');
  const { toast } = useToast();
  const { addUserProfile, saveUserProfileToDb, saveRedditContentToDb, currentCase } = useInvestigation();
  const [savedProfiles, setSavedProfiles] = useState<any[]>([]);

  const [deepAnalysisStates, setDeepAnalysisStates] = useState<Map<string, { isAnalyzing: boolean; result: any; showDeep: boolean; analysisType?: 'lime' | 'shap' }>>(new Map());

  const handleDeepAnalysis = async (text: string, itemKey: string) => {
    setDeepAnalysisStates(prev => new Map(prev.set(itemKey, { isAnalyzing: true, result: null, showDeep: false, analysisType: 'lime' })));
    try {
      const response = await fetch('http://localhost:5000/deep-analysis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      });
      if (!response.ok) throw new Error(`Deep analysis failed: ${response.statusText}`);
      const result = await response.json();
      setDeepAnalysisStates(prev => new Map(prev.set(itemKey, { isAnalyzing: false, result, showDeep: true, analysisType: 'lime' })));
      toast({ title: "Deep Analysis Complete", description: "Advanced XAI analysis performed." });
    } catch (error) {
      console.error('Deep analysis error:', error);
      setDeepAnalysisStates(prev => { const m = new Map(prev); m.delete(itemKey); return m; });
      toast({ title: "Deep Analysis Failed", description: "Could not perform deep analysis.", variant: "destructive" });
    }
  };

  const toggleDeepAnalysis = (itemKey: string) => {
    setDeepAnalysisStates(prev => {
      const current = prev.get(itemKey);
      if (current) return new Map(prev.set(itemKey, { ...current, showDeep: !current.showDeep }));
      return prev;
    });
  };

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
    setVisiblePosts(INITIAL_VISIBLE);
    setVisibleComments(INITIAL_VISIBLE);
    try {
      const { data, error: err } = await supabase
        .from('user_profiles_analyzed').select('*').eq('id', profileId).maybeSingle();
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
      const { error: err } = await supabase.from('user_profiles_analyzed').delete().eq('id', profileId);
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
      setTimeout(() => {
        const searchBtn = document.querySelector<HTMLButtonElement>('[data-profiling-search]');
        searchBtn?.click();
      }, 100);
    }
  }, [location.state]);

  useEffect(() => {
    const loadProfileId = (location.state as any)?.loadProfileId as string | undefined;
    if (!loadProfileId) return;
    let cancelled = false;
    (async () => {
      setIsLoading(true);
      setVisiblePosts(INITIAL_VISIBLE);
      setVisibleComments(INITIAL_VISIBLE);
      try {
        const { data, error } = await supabase
          .from('user_profiles_analyzed').select('*').eq('id', loadProfileId).maybeSingle();
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
        toast({ title: 'Loaded saved profile', description: `Showing saved results for u/${data.username}` });
      } catch (e: any) {
        if (!cancelled) toast({ title: 'Failed to load profile', description: e?.message || 'Could not load saved profile', variant: 'destructive' });
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [location.state, toast]);

  const handleAnalyzeUser = async () => {
    if (!username.trim()) return;
    setIsLoading(true);
    setError(null);
    setProfileData(null);
    setVisiblePosts(INITIAL_VISIBLE);
    setVisibleComments(INITIAL_VISIBLE);

    try {
      const cleanUsername = username.replace(/^u\//, '');
      const { data: redditData, error: redditError } = await supabase.functions.invoke('reddit-scraper', {
        body: { username: cleanUsername, type: 'user' }
      });
      if (redditError) throw redditError;
      if (redditData?.error === 'not_found') {
        setError(redditData.message);
        toast({ title: "User Not Found", description: redditData.message, variant: "destructive" });
        setIsLoading(false);
        return;
      }
      const { data: analysisData, error: analysisError } = await supabase.functions.invoke('analyze-content', {
        body: { posts: redditData.posts || [], comments: redditData.comments || [] }
      });
      if (analysisError) console.error('Analysis error:', analysisError);

      const accountCreated = new Date(redditData.user.created_utc * 1000);
      const now = new Date();
      const ageInYears = (now.getTime() - accountCreated.getTime()) / (1000 * 60 * 60 * 24 * 365);
      const years = Math.floor(ageInYears);
      const months = Math.floor((ageInYears - years) * 12);
      const accountAge = `${years} years, ${months} months`;

      const allContent = [...(redditData.posts || []), ...(redditData.comments || [])];
      const hourCounts: { [k: number]: number } = {};
      const dayCounts: { [k: string]: number } = {};
      const monthCounts: { [k: string]: number } = {};
      allContent.forEach((item: any) => {
        const date = new Date(item.created_utc * 1000);
        const pakistanDate = toZonedTime(date, 'Asia/Karachi');
        const hour = pakistanDate.getHours();
        const day = pakistanDate.toLocaleDateString('en-US', { weekday: 'long', timeZone: 'Asia/Karachi' });
        const month = pakistanDate.toLocaleDateString('en-US', { month: 'short', year: '2-digit', timeZone: 'Asia/Karachi' });
        hourCounts[hour] = (hourCounts[hour] || 0) + 1;
        dayCounts[day] = (dayCounts[day] || 0) + 1;
        monthCounts[month] = (monthCounts[month] || 0) + 1;
      });
      const mostActiveHour = Object.entries(hourCounts).sort(([,a], [,b]) => b - a)[0];
      const mostActiveDay = Object.entries(dayCounts).sort(([,a], [,b]) => b - a)[0];

      const textContent = [
        ...(redditData.posts || []).map((p: any) => `${p.title} ${p.selftext}`),
        ...(redditData.comments || []).map((c: any) => c.body)
      ].join(' ');
      const words = textContent.toLowerCase().match(/\b[a-z]{4,}\b/g) || [];
      const wordFreq: { [k: string]: number } = {};
      const stop = new Set(['that','this','with','from','have','been','will','your','their','what','when','where','they','them','were','would','about','there','which','could','should']);
      words.forEach(word => { if (!stop.has(word)) wordFreq[word] = (wordFreq[word] || 0) + 1; });
      const wordCloudData = Object.entries(wordFreq).sort(([,a], [,b]) => b - a).slice(0, 40).map(([word, freq]) => ({
        word, frequency: freq, category: freq > 20 ? 'high' as const : freq > 8 ? 'medium' as const : 'low' as const
      }));

      const profileResult: any = {
        username: cleanUsername,
        avatar: redditData.user?.icon_img || redditData.user?.snoovatar_img || null,
        accountCreatedUtc: redditData.user.created_utc,
        accountAge,
        totalKarma: redditData.user.link_karma + redditData.user.comment_karma,
        postKarma: redditData.user.link_karma,
        commentKarma: redditData.user.comment_karma,
        postsCount: (redditData.posts || []).length,
        commentsCount: (redditData.comments || []).length,
        activeSubreddits: analysisData?.topSubreddits || [],
        activityPattern: {
          mostActiveHour: mostActiveHour ? `${mostActiveHour[0]}:00-${parseInt(mostActiveHour[0])+1}:00 PKT` : 'N/A',
          mostActiveDay: mostActiveDay?.[0] || 'N/A',
          timezone: 'PKT (UTC+5)',
        },
        monthlyActivity: Object.entries(monthCounts).map(([m, v]) => ({ name: m, value: v })),
        sentimentAnalysis: analysisData?.sentiment?.breakdown || { positive: 33, neutral: 34, negative: 33 },
        postSentiments: (analysisData?.postSentiments || []).map((s: any, i: number) => ({
          ...s,
          body: s.body || redditData.posts?.[i]?.selftext || '',
          permalink: redditData.posts?.[i]?.permalink || null,
          created_utc: redditData.posts?.[i]?.created_utc,
          subreddit: redditData.posts?.[i]?.subreddit,
        })),
        commentSentiments: (analysisData?.commentSentiments || []).map((s: any, i: number) => ({
          ...s,
          permalink: redditData.comments?.[i]?.permalink || null,
          created_utc: redditData.comments?.[i]?.created_utc,
          subreddit: redditData.comments?.[i]?.subreddit,
        })),
        postSentimentBreakdown: analysisData?.sentiment?.postBreakdown || null,
        commentSentimentBreakdown: analysisData?.sentiment?.commentBreakdown || null,
        locationIndicators: analysisData?.locations || ['No specific locations detected'],
        behaviorPatterns: analysisData?.patterns?.topicInterests || [],
        wordCloud: wordCloudData,
        stats: analysisData?.stats || {},
        emotions: analysisData?.emotions || {}
      };

      setProfileData(profileResult);
      const profileToSave = {
        username: cleanUsername, accountAge,
        totalKarma: profileResult.totalKarma, postKarma: profileResult.postKarma, commentKarma: profileResult.commentKarma,
        activeSubreddits: profileResult.activeSubreddits, activityPattern: profileResult.activityPattern,
        sentimentAnalysis: profileResult.sentimentAnalysis,
        postSentiments: profileResult.postSentiments, commentSentiments: profileResult.commentSentiments,
        locationIndicators: profileResult.locationIndicators, behaviorPatterns: profileResult.behaviorPatterns,
        wordCloud: profileResult.wordCloud,
      };
      addUserProfile(profileToSave);
      if (currentCase?.id) {
        try { await saveUserProfileToDb(profileToSave); } catch (dbErr) { console.error('Failed to save profile:', dbErr); }
        try {
          await saveRedditContentToDb(redditData.posts || [], redditData.comments || [], 'user_profile');
        } catch (dbErr) {
          console.error('Failed to save Reddit posts/comments:', dbErr);
        }
      }
      toast({ title: "Analysis Complete", description: `Successfully analyzed u/${cleanUsername}` });
    } catch (err: any) {
      console.error('Error analyzing user:', err);
      setError(err.message || 'Failed to analyze user profile');
      toast({ title: "Analysis Failed", description: err.message || 'Failed to analyze user profile.', variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  // Derived intelligence metrics
  const intel = useMemo(() => {
    if (!profileData) return null;
    const sa = profileData.sentimentAnalysis || {};
    const negPct = sa.negative ?? 0;
    const posPct = sa.positive ?? 0;
    // Risk: based on negative sentiment %
    let risk: 'Low' | 'Medium' | 'High' = 'Low';
    if (negPct > 40) risk = 'High'; else if (negPct > 20) risk = 'Medium';
    // Influence: karma + activity (clamped)
    const k = profileData.totalKarma || 0;
    const act = (profileData.postsCount || 0) + (profileData.commentsCount || 0);
    const influence = Math.min(100, Math.round(Math.log10(Math.max(k, 1)) * 18 + Math.min(act, 100) * 0.4));
    return { risk, influence, negPct, posPct };
  }, [profileData]);

  // Sorted feeds
  const sortedPosts = useMemo(() => {
    const arr = [...(profileData?.postSentiments || [])];
    if (postsSort === 'top') {
      arr.sort((a, b) => (b.score ?? 0) - (a.score ?? 0));
    } else if (postsSort === 'controversial') {
      arr.sort((a, b) => {
        const sa = (a.score ?? 0) + (a.num_comments ?? 0) * 2 + (a.sentiment === 'negative' ? 50 : 0);
        const sb = (b.score ?? 0) + (b.num_comments ?? 0) * 2 + (b.sentiment === 'negative' ? 50 : 0);
        return sb - sa;
      });
    } else {
      arr.sort((a, b) => (b.created_utc ?? 0) - (a.created_utc ?? 0));
    }
    return arr;
  }, [profileData?.postSentiments, postsSort]);

  const sortedComments = useMemo(() => {
    const arr = [...(profileData?.commentSentiments || [])];
    if (commentsSort === 'top') {
      arr.sort((a, b) => (b.score ?? 0) - (a.score ?? 0));
    } else {
      arr.sort((a, b) => (b.created_utc ?? 0) - (a.created_utc ?? 0));
    }
    return arr;
  }, [profileData?.commentSentiments, commentsSort]);

  const renderSentimentRow = (item: any, itemKey: string, isPost: boolean) => {
    const deepState = deepAnalysisStates.get(itemKey);
    const explanationText = deepState?.showDeep && deepState.result
      ? (deepState.analysisType === 'shap' ? deepState.result.shap_explanation?.reasoning : deepState.result.deep_explanation?.reasoning)
      : (typeof item.explanation === 'string' ? item.explanation : item.explanation?.reasoning);

    return (
      <div
        key={itemKey}
        className="group relative rounded-lg border border-slate-200 bg-white p-3 hover:border-blue-300 hover:shadow-sm transition-all cursor-pointer"
        onClick={() => item.permalink && window.open(`https://www.reddit.com${item.permalink}`, '_blank')}
      >
        <div className="flex items-start gap-2.5">
          <div className="flex-shrink-0 w-7 h-7 rounded-full bg-orange-50 border border-orange-200 flex items-center justify-center mt-0.5">
            {isPost ? <MessageSquare className="h-3.5 w-3.5 text-orange-600" /> : <MessageCircle className="h-3.5 w-3.5 text-orange-600" />}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2 mb-1">
              <div className="flex items-center gap-1.5 text-xs text-slate-600 min-w-0">
                <span className="font-medium text-slate-900 truncate">u/{profileData.username}</span>
                {item.subreddit && <span className="text-slate-400">in r/{item.subreddit}</span>}
                <span className="text-slate-400">•</span>
                <span className="text-slate-500 whitespace-nowrap">{formatRelativeTime(item.created_utc)}</span>
              </div>
              <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${sentimentTone(item.sentiment)}`}>
                {item.sentiment}
              </Badge>
            </div>

            <p className="text-sm text-slate-800 line-clamp-2 mb-1.5 group-hover:text-blue-700 transition-colors">
              {item.text}
            </p>
            {isPost && item.body && (
              <p className="text-xs text-slate-500 line-clamp-2 mb-1.5">{item.body}</p>
            )}

            {explanationText && (
              <div className="flex items-start gap-1.5 text-[11px] text-slate-600 bg-slate-50 border border-slate-100 rounded px-2 py-1 mb-1.5">
                <Brain className="h-3 w-3 text-blue-500 mt-0.5 flex-shrink-0" />
                <span className="line-clamp-2"><span className="font-medium text-slate-700">XAI:</span> {explanationText}</span>
              </div>
            )}

            {deepState?.showDeep && deepState.result && (() => {
              const contribs = (deepState.analysisType === 'shap'
                ? deepState.result.shap_explanation?.word_contributions
                : deepState.result.deep_explanation?.word_contributions) || [];
              if (contribs.length === 0) return null;
              return (
                <div className="flex flex-wrap gap-1 mb-1.5">
                  {contribs.slice(0, 5).map((c: any, i: number) => (
                    <span key={i} className={`text-[10px] px-1.5 py-0.5 rounded border ${
                      c.sentiment_impact === 'positive' || c.sentiment === 'positive' ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                      : c.sentiment_impact === 'negative' || c.sentiment === 'negative' ? 'bg-rose-50 text-rose-700 border-rose-200'
                      : 'bg-slate-50 text-slate-600 border-slate-200'
                    }`}>{c.word}</span>
                  ))}
                </div>
              );
            })()}

            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                className="h-6 px-2 text-[11px] border-blue-200 text-blue-700 hover:bg-blue-50"
                disabled={deepState?.isAnalyzing}
                onClick={(e) => {
                  e.stopPropagation();
                  if (deepState?.showDeep && deepState.analysisType === 'lime') toggleDeepAnalysis(itemKey);
                  else handleDeepAnalysis(item.text, itemKey);
                }}
              >
                {deepState?.isAnalyzing ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <Zap className="h-3 w-3 mr-1" />}
                {deepState?.isAnalyzing ? 'Analyzing' : deepState?.showDeep ? 'Show Original' : 'Deep Analyze'}
              </Button>
              {item.permalink && (
                <span className="text-[10px] text-slate-400 inline-flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <ExternalLink className="h-2.5 w-2.5" /> Open
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  const sentimentPieData = (b: any) => b ? [
    { name: 'Positive', value: Math.round(b.positive * 100), color: SENT_COLORS.positive },
    { name: 'Neutral', value: Math.round(b.neutral * 100), color: SENT_COLORS.neutral },
    { name: 'Negative', value: Math.round(b.negative * 100), color: SENT_COLORS.negative },
  ] : [];

  return (
    <TooltipProvider>
    <div className="p-6 space-y-5 relative bg-slate-50/50 min-h-screen">
      {isLoading && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/60">
          <div className="flex flex-col items-center gap-3 bg-card border border-border rounded-xl shadow-2xl px-8 py-6">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-sm font-medium text-foreground">Analyzing user profile...</p>
          </div>
        </div>
      )}

      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">User Profiling</h2>
          <p className="text-sm text-slate-500">OSINT analyst workstation — deep Reddit user intelligence</p>
        </div>
      </div>

      {/* Search Bar */}
      <Card className="border-slate-200 shadow-sm">
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <div className="relative flex-1">
              <Input
                id="username"
                placeholder="Enter Reddit username (e.g. spez or u/spez)"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleAnalyzeUser()}
                className="pr-10 h-10 border-slate-200"
              />
              {username && (
                <Button variant="ghost" size="icon" className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7" onClick={() => setUsername('')}>
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
            <Button
              onClick={handleAnalyzeUser}
              disabled={isLoading || !username.trim()}
              data-profiling-search
              className="h-10 px-5 bg-blue-600 hover:bg-blue-700 text-white"
            >
              <Search className="h-4 w-4 mr-1.5" /> Analyze
            </Button>
          </div>
        </CardContent>
      </Card>

      {profileData && intel && (
        <>
          <Button variant="ghost" size="sm" className="gap-2 text-slate-600" onClick={() => { setProfileData(null); setError(null); }}>
            <ArrowLeft className="h-4 w-4" /> Back to Overview
          </Button>

          {/* === PREMIUM PROFILE HEADER === */}
          <Card className="border-slate-200 shadow-sm overflow-hidden">
            <CardContent className="p-5">
              <div className="flex items-stretch gap-5 min-h-[110px]">
                {/* LEFT: Avatar + name */}
                <div className="flex items-center gap-4 min-w-[240px]">
                  <Avatar className="h-16 w-16 border-2 border-blue-100 shadow-sm">
                    {profileData.avatar && <AvatarImage src={profileData.avatar} alt={profileData.username} />}
                    <AvatarFallback className="bg-gradient-to-br from-orange-500 to-rose-600 text-white">
                      <User className="h-7 w-7" />
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <a
                      href={`https://www.reddit.com/user/${profileData.username}`}
                      target="_blank" rel="noopener noreferrer"
                      className="text-lg font-bold text-slate-900 hover:text-blue-600 inline-flex items-center gap-1"
                    >
                      u/{profileData.username}
                      <ExternalLink className="h-3.5 w-3.5 opacity-60" />
                    </a>
                    <div className="flex items-center gap-1.5 mt-1">
                      <Badge className="bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-50 text-[10px] px-1.5 py-0">USER</Badge>
                      <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-slate-200 text-slate-600">REDDIT</Badge>
                    </div>
                  </div>
                </div>

                <Separator orientation="vertical" className="h-auto self-stretch" />

                {/* CENTER: Metrics columns - vertically centered */}
                <div className="flex-1 grid grid-cols-3 lg:grid-cols-6 gap-4 self-center">
                  <div className="flex flex-col items-start justify-center">
                    <div className="flex items-center gap-1 text-[10px] uppercase tracking-wide text-slate-500 font-semibold">
                      <Shield className="h-3 w-3" /> Risk
                    </div>
                    <div className={`text-lg font-bold mt-0.5 ${
                      intel.risk === 'High' ? 'text-rose-600' : intel.risk === 'Medium' ? 'text-amber-600' : 'text-emerald-600'
                    }`}>{intel.risk}</div>
                  </div>
                  <div className="flex flex-col items-start justify-center">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div className="flex items-center gap-1 cursor-help">
                          <TrendingUp className="h-3.5 w-3.5 text-blue-500" />
                          <div className="text-lg font-bold text-blue-600">{intel.influence}<span className="text-xs text-slate-400">/100</span></div>
                        </div>
                      </TooltipTrigger>
                      <TooltipContent><p className="text-xs">Influence Score</p></TooltipContent>
                    </Tooltip>
                  </div>
                  <div className="flex flex-col items-start justify-center">
                    <div className="flex items-center gap-1 text-[10px] uppercase tracking-wide text-slate-500 font-semibold">
                      <ThumbsUp className="h-3 w-3" /> Karma
                    </div>
                    <div className="text-lg font-bold text-slate-900 mt-0.5">{(profileData.totalKarma || 0).toLocaleString()}</div>
                  </div>
                  <div className="flex flex-col items-start justify-center">
                    <div className="flex items-center gap-1 text-[10px] uppercase tracking-wide text-slate-500 font-semibold">
                      <Calendar className="h-3 w-3" /> Account Age
                    </div>
                    <div className="text-sm font-bold text-slate-900 mt-1">{profileData.accountAge}</div>
                  </div>
                  <div className="flex flex-col items-start justify-center">
                    <div className="flex items-center gap-1 text-[10px] uppercase tracking-wide text-slate-500 font-semibold">
                      <MessageSquare className="h-3 w-3" /> Posts
                    </div>
                    <div className="text-lg font-bold text-slate-900 mt-0.5">{profileData.postsCount || 0}</div>
                  </div>
                  <div className="flex flex-col items-start justify-center">
                    <div className="flex items-center gap-1 text-[10px] uppercase tracking-wide text-slate-500 font-semibold">
                      <MessageCircle className="h-3 w-3" /> Comments
                    </div>
                    <div className="text-lg font-bold text-slate-900 mt-0.5">{profileData.commentsCount || 0}</div>
                  </div>
                </div>

                <Separator orientation="vertical" className="h-auto self-stretch" />

                {/* RIGHT: Track icon-only button */}
                <div className="flex items-center">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button size="icon" className="h-10 w-10 bg-blue-600 hover:bg-blue-700 text-white shadow-sm rounded-md">
                        <Bell className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent><p className="text-xs">Start Monitoring</p></TooltipContent>
                  </Tooltip>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* === MAIN GRID: 70/30 === */}
          <div className="grid grid-cols-1 lg:grid-cols-10 gap-5">
            {/* === LEFT: UNIFIED INTELLIGENCE FEED (70%) === */}
            <div className="lg:col-span-7">
              <Card className="border-slate-200 shadow-sm h-full">
                <CardHeader className="pb-3 border-b border-slate-100">
                  <div className="flex items-center justify-between gap-3 flex-wrap">
                    <CardTitle className="flex items-center gap-2 text-base">
                      <Target className="h-4 w-4 text-blue-600" />
                      Unified Intelligence Feed
                    </CardTitle>
                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Posts</span>
                        <Select value={postsSort} onValueChange={(v) => setPostsSort(v as any)}>
                          <SelectTrigger className="h-8 w-[130px] text-xs border-slate-200">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="recent" className="text-xs">Recent</SelectItem>
                            <SelectItem value="top" className="text-xs">Top</SelectItem>
                            <SelectItem value="controversial" className="text-xs">Controversial</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Comments</span>
                        <Select value={commentsSort} onValueChange={(v) => setCommentsSort(v as any)}>
                          <SelectTrigger className="h-8 w-[110px] text-xs border-slate-200">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="recent" className="text-xs">Recent</SelectItem>
                            <SelectItem value="top" className="text-xs">Top</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Posts */}
                    <div>
                      <div className="flex items-center justify-between mb-2.5 px-1">
                        <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wide">
                          {postsSort === 'top' ? 'Top Posts' : postsSort === 'controversial' ? 'Controversial Posts' : 'Recent Posts'}
                        </h4>
                        <Badge variant="outline" className="text-[10px] border-slate-200 text-slate-500 px-1.5 py-0">
                          {sortedPosts.length}
                        </Badge>
                      </div>
                      <div className="space-y-2 max-h-[700px] overflow-y-auto pr-1">
                        {sortedPosts.length > 0 ? (
                          <>
                            {sortedPosts.slice(0, visiblePosts).map((item: any, i: number) => renderSentimentRow(item, `post-${postsSort}-${i}`, true))}
                            {sortedPosts.length > visiblePosts && (
                              <Button variant="outline" size="sm" className="w-full text-xs" onClick={() => setVisiblePosts(p => p + 10)}>
                                <ChevronDown className="h-3 w-3 mr-1" /> See {sortedPosts.length - visiblePosts} more
                              </Button>
                            )}
                          </>
                        ) : (
                          <div className="text-center text-xs text-slate-400 py-8 border border-dashed border-slate-200 rounded">
                            No posts available
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Comments */}
                    <div>
                      <div className="flex items-center justify-between mb-2.5 px-1">
                        <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wide">
                          {commentsSort === 'top' ? 'Top Comments' : 'Recent Comments'}
                        </h4>
                        <Badge variant="outline" className="text-[10px] border-slate-200 text-slate-500 px-1.5 py-0">
                          {sortedComments.length}
                        </Badge>
                      </div>
                      <div className="space-y-2 max-h-[700px] overflow-y-auto pr-1">
                        {sortedComments.length > 0 ? (
                          <>
                            {sortedComments.slice(0, visibleComments).map((item: any, i: number) => renderSentimentRow(item, `comment-${commentsSort}-${i}`, false))}
                            {sortedComments.length > visibleComments && (
                              <Button variant="outline" size="sm" className="w-full text-xs" onClick={() => setVisibleComments(p => p + 10)}>
                                <ChevronDown className="h-3 w-3 mr-1" /> See {sortedComments.length - visibleComments} more
                              </Button>
                            )}
                          </>
                        ) : (
                          <div className="text-center text-xs text-slate-400 py-8 border border-dashed border-slate-200 rounded">
                            No comments available
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* === RIGHT SIDEBAR (30%) === */}
            <div className="lg:col-span-3 space-y-5">
              {/* Behavioral Intelligence */}
              <Card className="border-slate-200 shadow-sm">
                <CardHeader className="pb-2.5 border-b border-slate-100">
                  <CardTitle className="flex items-center gap-2 text-sm">
                    <Activity className="h-4 w-4 text-blue-600" /> Behavioral Intelligence
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-4 space-y-2.5 text-xs">
                  {[
                    { label: 'Most Active Hour', value: profileData.activityPattern.mostActiveHour, icon: Clock },
                    { label: 'Most Active Day', value: profileData.activityPattern.mostActiveDay, icon: Calendar },
                    { label: 'Posting Frequency', value: `${(((profileData.postsCount || 0) + (profileData.commentsCount || 0)) / Math.max(1, (profileData.monthlyActivity?.length || 1))).toFixed(1)} / month`, icon: TrendingUp },
                    { label: 'Avg Engagement', value: `${Math.round((profileData.totalKarma || 0) / Math.max(1, (profileData.postsCount || 0) + (profileData.commentsCount || 0)))} karma/item`, icon: ThumbsUp },
                    { label: 'Estimated Timezone', value: profileData.activityPattern.timezone, icon: Globe },
                  ].map((row, i) => (
                    <div key={i} className="flex items-center justify-between gap-2 py-1.5 border-b border-slate-100 last:border-0">
                      <div className="flex items-center gap-1.5 text-slate-500">
                        <row.icon className="h-3 w-3" />
                        <span>{row.label}</span>
                      </div>
                      <span className="font-semibold text-slate-900 text-right truncate max-w-[55%]">{row.value}</span>
                    </div>
                  ))}
                </CardContent>
              </Card>

              {/* Location Indicators */}
              <Card className="border-slate-200 shadow-sm">
                <CardHeader className="pb-2.5 border-b border-slate-100">
                  <CardTitle className="flex items-center gap-2 text-sm">
                    <MapPin className="h-4 w-4 text-blue-600" /> Location Indicators
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Info className="h-3 w-3 text-slate-400 cursor-help" />
                      </TooltipTrigger>
                      <TooltipContent>
                        <p className="max-w-xs text-xs">AI-detected location signals from posts, comments, and language patterns.</p>
                      </TooltipContent>
                    </Tooltip>
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-4 space-y-1.5">
                  {(profileData.locationIndicators || []).slice(0, 6).map((loc: string, i: number) => (
                    <div key={i} className="flex items-center gap-2 text-xs py-1.5 px-2 rounded bg-slate-50 border border-slate-100">
                      <MapPin className="h-3 w-3 text-blue-500 flex-shrink-0" />
                      <span className="text-slate-700 truncate">{loc}</span>
                    </div>
                  ))}
                </CardContent>
              </Card>

              {/* Dual Sentiment Charts */}
              <Card className="border-slate-200 shadow-sm">
                <CardHeader className="pb-2.5 border-b border-slate-100">
                  <CardTitle className="flex items-center gap-2 text-sm">
                    <BarChart3 className="h-4 w-4 text-blue-600" /> Sentiment Distribution
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-3">
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { title: 'Posts', data: sentimentPieData(profileData.postSentimentBreakdown) },
                      { title: 'Comments', data: sentimentPieData(profileData.commentSentimentBreakdown) },
                    ].map((c, idx) => (
                      <div key={idx} className="text-center">
                        <div className="text-[10px] font-semibold text-slate-600 uppercase mb-1">{c.title}</div>
                        {c.data.length > 0 ? (
                          <ResponsiveContainer width="100%" height={110}>
                            <PieChart>
                              <Pie data={c.data} dataKey="value" cx="50%" cy="50%" innerRadius={26} outerRadius={45} paddingAngle={2}>
                                {c.data.map((d, i) => <Cell key={i} fill={d.color} />)}
                              </Pie>
                              <RTooltip formatter={(v: any) => `${v}%`} />
                            </PieChart>
                          </ResponsiveContainer>
                        ) : (
                          <div className="h-[110px] flex items-center justify-center text-[10px] text-slate-400">No data</div>
                        )}
                      </div>
                    ))}
                  </div>
                  <div className="flex items-center justify-center gap-3 mt-2 text-[10px]">
                    <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full" style={{background: SENT_COLORS.positive}} />Positive</span>
                    <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full" style={{background: SENT_COLORS.neutral}} />Neutral</span>
                    <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full" style={{background: SENT_COLORS.negative}} />Negative</span>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* === BOTTOM ANALYTICS ROW === */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            {/* Top Communities */}
            <Card className="border-slate-200 shadow-sm">
              <CardHeader className="pb-2.5 border-b border-slate-100">
                <CardTitle className="flex items-center gap-2 text-sm">
                  <Hash className="h-4 w-4 text-blue-600" /> Top Communities
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4">
                {(profileData.activeSubreddits || []).length > 0 ? (
                  <div className="space-y-2">
                    {profileData.activeSubreddits.slice(0, 6).map((s: any, i: number) => {
                      const max = Math.max(...profileData.activeSubreddits.map((x: any) => x.count || 0));
                      const pct = max > 0 ? ((s.count || 0) / max) * 100 : 0;
                      return (
                        <a key={i} href={`https://www.reddit.com/r/${s.name}`} target="_blank" rel="noopener noreferrer" className="block group">
                          <div className="flex items-center justify-between text-xs mb-1">
                            <span className="font-medium text-slate-700 group-hover:text-blue-600 truncate">r/{s.name}</span>
                            <span className="text-slate-500 font-mono">{s.count}</span>
                          </div>
                          <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                            <div className="h-full bg-gradient-to-r from-blue-500 to-blue-600" style={{ width: `${pct}%` }} />
                          </div>
                        </a>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-xs text-slate-400 text-center py-6">No community data</p>
                )}
              </CardContent>
            </Card>

            {/* Keyword Intelligence */}
            <Card className="border-slate-200 shadow-sm">
              <CardHeader className="pb-2.5 border-b border-slate-100">
                <CardTitle className="flex items-center gap-2 text-sm">
                  <Brain className="h-4 w-4 text-blue-600" /> Keyword Intelligence
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4">
                {(profileData.wordCloud || []).length > 0 ? (
                  <div className="space-y-2">
                    {profileData.wordCloud.slice(0, 6).map((w: any, i: number) => {
                      const max = Math.max(...profileData.wordCloud.map((x: any) => x.frequency || 0));
                      const pct = max > 0 ? (w.frequency / max) * 100 : 0;
                      return (
                        <div key={i}>
                          <div className="flex items-center justify-between text-xs mb-1">
                            <span className="font-medium text-slate-700 truncate">{w.word}</span>
                            <span className="text-slate-500 font-mono">{w.frequency}</span>
                          </div>
                          <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                            <div className="h-full bg-gradient-to-r from-emerald-500 to-teal-600" style={{ width: `${pct}%` }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-xs text-slate-400 text-center py-6">No keyword data</p>
                )}
              </CardContent>
            </Card>

            {/* Posting Activity Timeline */}
            <Card className="border-slate-200 shadow-sm">
              <CardHeader className="pb-2.5 border-b border-slate-100">
                <CardTitle className="flex items-center gap-2 text-sm">
                  <TrendingUp className="h-4 w-4 text-blue-600" /> Posting Activity Timeline
                </CardTitle>
              </CardHeader>
              <CardContent className="p-3">
                {(profileData.monthlyActivity || []).length > 0 ? (
                  <ResponsiveContainer width="100%" height={180}>
                    <LineChart data={profileData.monthlyActivity} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                      <XAxis dataKey="name" fontSize={10} stroke="#94a3b8" />
                      <YAxis fontSize={10} stroke="#94a3b8" />
                      <RTooltip contentStyle={{ fontSize: 11, borderRadius: 6, border: '1px solid #e2e8f0' }} />
                      <Line type="monotone" dataKey="value" stroke="#2563eb" strokeWidth={2} dot={{ fill: '#2563eb', r: 3 }} activeDot={{ r: 5 }} />
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <p className="text-xs text-slate-400 text-center py-12">No timeline data</p>
                )}
              </CardContent>
            </Card>
          </div>
        </>
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
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {savedProfiles.map((p) => (
                  <Card
                    key={p.id}
                    className="group relative overflow-hidden border-0 shadow-lg hover:shadow-xl transition-all duration-300 cursor-pointer hover:scale-[1.02] hover:-translate-y-1"
                    onClick={() => loadSavedProfile(p.id)}
                  >
                    <div className="relative bg-gradient-to-br from-orange-500 via-red-500 to-rose-600 px-4 pt-4 pb-10">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-white font-bold text-sm truncate">u/{p.username}</span>
                        <span className="flex items-center gap-1 text-white/90 text-[11px] font-semibold bg-white/20 rounded-full px-2 py-0.5 backdrop-blur-sm shrink-0">
                          <Zap className="h-3 w-3" />
                          {(p.total_karma ?? 0).toLocaleString()}
                        </span>
                      </div>
                      <span className="text-[10px] text-white/80 font-medium">{p.account_age || 'Unknown age'}</span>
                      <div className="absolute top-0 right-0 w-20 h-20 bg-white/5 rounded-full -translate-y-8 translate-x-8" />
                      <div className="absolute bottom-0 left-0 w-14 h-14 bg-white/5 rounded-full translate-y-6 -translate-x-4" />
                    </div>
                    <div className="flex justify-center -mt-8 relative z-10">
                      <div className="w-16 h-16 rounded-full border-4 border-card bg-card shadow-lg overflow-hidden flex items-center justify-center bg-gradient-to-br from-orange-500 via-red-500 to-rose-600">
                        <User className="h-7 w-7 text-white" />
                      </div>
                    </div>
                    <div className="px-4 pt-2 pb-3 text-center">
                      <a
                        href={`https://www.reddit.com/user/${p.username}`}
                        target="_blank" rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-sm font-bold text-foreground hover:text-primary transition-colors"
                        onClick={(e) => e.stopPropagation()}
                      >
                        u/{p.username}
                        <ExternalLink className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                      </a>
                      <p className="text-[10px] text-muted-foreground mt-1">
                        {p.analyzed_at ? new Date(p.analyzed_at).toLocaleString() : 'Unknown date'}
                      </p>
                    </div>
                    <div className="flex border-t border-border/50">
                      <Button variant="ghost" size="sm" className="flex-1 rounded-none text-xs h-9 hover:bg-muted/80"
                        onClick={(e) => { e.stopPropagation(); loadSavedProfile(p.id); }}>
                        <Search className="h-3.5 w-3.5 mr-1" /> View
                      </Button>
                      <div className="w-px bg-border/50" />
                      <Button variant="ghost" size="sm" className="rounded-none text-xs h-9 px-3 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                        onClick={(e) => { e.stopPropagation(); deleteSavedProfile(p.id); }}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </Card>
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
    </TooltipProvider>
  );
};

export default UserProfiling;
