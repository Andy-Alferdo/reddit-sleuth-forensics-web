import { useState, useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { User, Users, Calendar, TrendingUp, FileText, MessageSquare, ExternalLink, StopCircle, ArrowLeft } from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as ReTooltip, ResponsiveContainer, Cell,
} from 'recharts';

interface RedditActivity {
  id: string;
  type: 'post' | 'comment';
  title: string;
  body?: string;
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

interface MonitoringDetailViewProps {
  profileData: ProfileData;
  activities: RedditActivity[];
  wordCloudData: any[];
  isMonitoring: boolean;
  isFetching: boolean;
  lastFetchTime: string;
  newActivityCount: number;
  onStop: () => void;
  onBack: () => void;
}

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

// ── Short timestamp: "Nov 12, 2024 · 10:57 AM" ───────────────────
const MONTHS_SHORT = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const formatShortStamp = (createdUtc?: number): string => {
  if (!createdUtc || !isFinite(createdUtc)) return '';
  const d = new Date(createdUtc * 1000);
  if (isNaN(d.getTime())) return '';
  let h = d.getHours();
  const m = d.getMinutes();
  const ampm = h >= 12 ? 'PM' : 'AM';
  h = h % 12; if (h === 0) h = 12;
  const mm = m < 10 ? `0${m}` : `${m}`;
  return `${MONTHS_SHORT[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()} · ${h}:${mm} ${ampm}`;
};

// ── Stat block (compact) ──────────────────────────────────────────
const StatBlock = ({
  icon: Icon, label, value, withDivider,
}: { icon: any; label: string; value: React.ReactNode; withDivider?: boolean }) => (
  <div className={`text-center flex-1 px-2 ${withDivider ? 'border-r border-slate-200' : ''}`}>
    <Icon className="text-blue-600 w-4 h-4 mx-auto mb-0.5" />
    <p className="text-[9px] uppercase tracking-widest text-slate-400 font-mono-plex font-semibold">{label}</p>
    <p className="text-xl font-bold text-slate-900 font-mono-plex leading-tight mt-0.5 truncate">{value}</p>
  </div>
);

// ── Compact activity item ─────────────────────────────────────────
const ActivityItem = ({
  activity, accent, onClick,
}: { activity: RedditActivity; accent: 'blue' | 'orange'; onClick: () => void }) => {
  const borderClass = accent === 'blue' ? 'border-l-blue-500' : 'border-l-orange-400';
  const stamp = formatShortStamp(activity.created_utc);
  return (
    <div
      onClick={onClick}
      className={`group cursor-pointer border-l-2 ${borderClass} border-b border-slate-50 hover:bg-slate-50 transition-colors duration-150`}
      style={{ padding: '8px 10px' }}
    >
      <p className="text-[12px] font-medium text-slate-800 line-clamp-2 leading-snug">{activity.title}</p>
      <div className="flex items-center justify-between mt-1 gap-2">
        <span className="text-[11px] text-cyan-600 font-medium truncate">{activity.subreddit}</span>
        <span
          className="text-[10px] font-mono-plex text-slate-400 whitespace-nowrap truncate text-right"
          style={{ maxWidth: 120 }}
          title={stamp}
        >
          {stamp}
        </span>
      </div>
    </div>
  );
};

// ── Inline word cloud (overflow-safe, max 18px) ───────────────────
const InlineWordCloud = ({ words }: { words: { word: string; frequency: number }[] }) => {
  const tiers = useMemo(() => {
    if (!words.length) return [];
    const sorted = [...words].sort((a, b) => b.frequency - a.frequency).slice(0, 40);
    const max = sorted[0]?.frequency || 1;
    const min = sorted[sorted.length - 1]?.frequency || 0;
    const range = Math.max(1, max - min);
    return sorted.map(w => {
      const norm = (w.frequency - min) / range; // 0..1
      let size = 10, color = '#93C5FD', weight = 400;
      if (norm > 0.85)      { size = 18; color = '#1E3A8A'; weight = 800; }
      else if (norm > 0.65) { size = 15; color = '#1D4ED8'; weight = 700; }
      else if (norm > 0.45) { size = 13; color = '#2563EB'; weight = 600; }
      else if (norm > 0.25) { size = 11; color = '#3B82F6'; weight = 500; }
      else                  { size = 10; color = '#93C5FD'; weight = 400; }
      return { ...w, size, color, weight };
    });
  }, [words]);

  if (!tiers.length) {
    return <p className="text-xs text-slate-400 italic">No keyword data yet</p>;
  }

  return (
    <div className="flex flex-wrap items-center justify-center gap-x-2.5 gap-y-1.5 overflow-hidden w-full h-full">
      {tiers.map((t, i) => (
        <span
          key={`${t.word}-${i}`}
          style={{ fontSize: t.size, color: t.color, fontWeight: t.weight, lineHeight: 1.1 }}
          className="font-mono-plex whitespace-nowrap"
        >
          {t.word}
        </span>
      ))}
    </div>
  );
};

export const MonitoringDetailView = ({
  profileData,
  activities,
  wordCloudData,
  isMonitoring,
  isFetching,
  lastFetchTime,
  newActivityCount,
  onStop,
  onBack,
}: MonitoringDetailViewProps) => {
  const [previewActivity, setPreviewActivity] = useState<RedditActivity | null>(null);

  const getActivityBreakdownData = () => {
    if (profileData?.communityName) {
      const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const today = new Date();
      const dailyData: { name: string; value: number }[] = [];

      for (let i = 2; i >= 0; i--) {
        const date = new Date(today);
        date.setDate(date.getDate() - i);
        const dayName = days[date.getDay()];
        const dateStr = `${dayName}, ${date.getDate()} ${months[date.getMonth()]} ${date.getFullYear()}`;
        dailyData.push({ name: dateStr, value: 0 });
      }

      const posts = activities.filter(a => a.type === 'post');
      posts.forEach(activity => {
        const activityDate = new Date(activity.created_utc * 1000);
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
      const postsCount = activities.filter(a => a.type === 'post').length;
      const commentsCount = activities.filter(a => a.type === 'comment').length;
      return [
        { name: 'Posts', value: postsCount },
        { name: 'Comments', value: commentsCount },
      ];
    }
  };

  const activityBreakdownData = getActivityBreakdownData();
  const posts = activities.filter(a => a.type === 'post');
  const comments = activities.filter(a => a.type === 'comment');

  const profileLink = profileData.username
    ? `https://www.reddit.com/user/${profileData.username.replace(/^u\//, '')}`
    : `https://www.reddit.com/${profileData.communityName}`;

  const wordsForCloud = (wordCloudData && wordCloudData.length > 0 ? wordCloudData : realTimeWordCloud) as { word: string; frequency: number }[];

  return (
    <div
      className="bg-[#F8FAFC] -m-6 flex flex-col overflow-hidden"
      style={{ height: '100vh', padding: 16 }}
    >
      {/* ── ROW 1: Back link ─────────────────────────────── */}
      <div className="flex items-center justify-between shrink-0" style={{ height: 28, marginBottom: 8 }}>
        <button
          onClick={onBack}
          className="text-blue-600 text-sm font-medium hover:text-blue-800 flex items-center gap-1"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Overview
        </button>
        {isMonitoring && lastFetchTime && (
          <span className="text-[10px] font-mono-plex text-slate-400">Last sync: {lastFetchTime}</span>
        )}
      </div>

      {/* ── ROW 2: Profile Header (max 130px) ─────────────── */}
      <Card
        className="bg-white rounded-xl shadow-sm border border-slate-200 border-t-4 border-t-blue-600 shrink-0 overflow-hidden"
        style={{ maxHeight: 130, marginBottom: 12 }}
      >
        <CardContent className="p-0" style={{ padding: '12px 16px' }}>
          {/* TOP ROW */}
          <div className="flex items-center justify-between gap-3 pb-2">
            <div className="flex items-center gap-3 min-w-0 flex-1">
              {/* Avatar */}
              <div className="ring-2 ring-blue-600 ring-offset-2 rounded-full overflow-hidden bg-white shrink-0 w-12 h-12">
                {profileData.iconImg ? (
                  <img
                    src={profileData.iconImg}
                    alt="avatar"
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      const fallback = profileData.username ? 'u/' : 'r/';
                      (e.target as HTMLImageElement).parentElement!.innerHTML =
                        `<div class="w-full h-full bg-blue-50 flex items-center justify-center"><span class="text-blue-600 font-bold text-sm font-mono-plex">${fallback}</span></div>`;
                    }}
                  />
                ) : (
                  <div className="w-full h-full bg-blue-50 flex items-center justify-center">
                    {profileData.username ? <User className="h-5 w-5 text-blue-600" /> : <Users className="h-5 w-5 text-blue-600" />}
                  </div>
                )}
              </div>

              {/* Identity */}
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <a
                    href={profileLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-mono-plex font-bold text-slate-900 text-lg hover:text-blue-700 transition-colors truncate"
                  >
                    {profileData.username || profileData.communityName}
                  </a>
                  <span className="bg-blue-50 text-blue-700 text-[9px] uppercase tracking-wider font-semibold px-2 py-0.5 rounded-full shrink-0">
                    {profileData.username ? 'User' : 'Community'}
                  </span>
                </div>
                {(profileData.description || profileData.accountAge) && (
                  <p className="text-xs text-slate-400 truncate mt-0.5">
                    {profileData.description || `Member since ${profileData.accountAge}`}
                  </p>
                )}
              </div>
            </div>

            {/* Right side: status + stop */}
            <div className="flex items-center gap-2 shrink-0">
              {isMonitoring && (
                <span className="inline-flex items-center gap-1.5 bg-emerald-50 text-emerald-700 font-semibold text-[11px] rounded-full px-2.5 py-0.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 monitoring-pulse-dot" />
                  MONITORING ACTIVE
                </span>
              )}
              {isMonitoring && (
                <button
                  onClick={onStop}
                  className="border-2 border-red-500 text-red-500 bg-white hover:bg-red-50 rounded-lg px-3 text-xs font-medium inline-flex items-center gap-1 transition-colors h-8"
                >
                  <StopCircle className="h-3.5 w-3.5" />
                  Stop
                </button>
              )}
            </div>
          </div>

          {/* BOTTOM ROW: stats */}
          <div className="border-t border-slate-100 pt-2 flex items-stretch">
            {profileData.username ? (
              <>
                <StatBlock icon={TrendingUp} label="Karma" value={(profileData.totalKarma || 0).toLocaleString()} withDivider />
                <StatBlock icon={Calendar} label="Age" value={profileData.accountAge || '—'} withDivider />
                <StatBlock icon={FileText} label="Posts" value={posts.length} withDivider />
                <StatBlock icon={MessageSquare} label="Comments" value={comments.length} />
              </>
            ) : (
              <>
                <StatBlock icon={Users} label="Members" value={profileData.memberCount || '—'} withDivider />
                <StatBlock icon={Calendar} label="Created" value={profileData.createdDate || '—'} withDivider />
                <StatBlock icon={FileText} label="Posts" value={posts.length} withDivider />
                <StatBlock icon={MessageSquare} label="Comments" value={comments.length} />
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {/* ── ROW 3: MAIN CONTENT (fills remaining) ────────── */}
      <div className="flex flex-row gap-3 flex-1 min-h-0 overflow-hidden">
        {/* LEFT — Live Activity Feed (60%) */}
        <Card
          className="bg-white rounded-xl shadow-sm border border-slate-200 border-l-4 border-l-blue-600 flex flex-col overflow-hidden h-full"
          style={{ width: '60%' }}
        >
          {/* Card header (fixed) */}
          <div className="flex justify-between items-center border-b border-slate-100 shrink-0" style={{ padding: '10px 14px' }}>
            <div className="flex items-center">
              <span className="w-1 h-5 bg-blue-600 rounded-full mr-2 inline-block" />
              <span className="text-sm font-semibold text-slate-900">Live Activity Feed</span>
              {isFetching && <span className="ml-2 h-1.5 w-1.5 rounded-full bg-blue-600 monitoring-pulse-dot" />}
              {newActivityCount > 0 && (
                <span className="ml-2 bg-blue-50 text-blue-700 font-mono-plex text-[10px] font-semibold rounded-full px-2 py-0.5">
                  {newActivityCount} NEW
                </span>
              )}
            </div>
            <span className="text-[10px] font-mono-plex text-slate-400">
              {lastFetchTime || '—'}
            </span>
          </div>

          {/* Two-column feed (flex-1) */}
          <div className="grid grid-cols-2 flex-1 min-h-0 overflow-hidden">
            {/* Posts column */}
            <div className="overflow-y-auto scrollbar-thin border-r border-slate-100">
              <div className="sticky top-0 bg-white border-b-2 border-blue-600 px-3 py-2 flex items-center justify-between z-10">
                <span className="text-[10px] uppercase font-mono-plex text-slate-400 font-semibold tracking-widest">Posts</span>
                <span className="text-[10px] font-mono-plex text-slate-400">{posts.length}</span>
              </div>
              {posts.length === 0 ? (
                <p className="text-xs text-slate-400 italic text-center py-6">No posts yet</p>
              ) : (
                posts.map(activity => (
                  <ActivityItem
                    key={activity.id}
                    activity={activity}
                    accent="blue"
                    onClick={() => setPreviewActivity(activity)}
                  />
                ))
              )}
            </div>

            {/* Comments column */}
            <div className="overflow-y-auto scrollbar-thin">
              <div className="sticky top-0 bg-white border-b-2 border-orange-400 px-3 py-2 flex items-center justify-between z-10">
                <span className="text-[10px] uppercase font-mono-plex text-slate-400 font-semibold tracking-widest">
                  {profileData.communityName ? 'Community' : 'Comments'}
                </span>
                <span className="text-[10px] font-mono-plex text-slate-400">
                  {profileData.communityName ? '' : comments.length}
                </span>
              </div>
              {profileData.communityName ? (
                <a
                  href={`https://reddit.com/${profileData.communityName}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 mx-3 mt-3 p-3 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 transition-colors"
                >
                  <Users className="h-5 w-5 text-blue-600" />
                  <div className="flex-1 min-w-0">
                    <p className="font-mono-plex font-semibold text-slate-900 text-xs truncate">{profileData.communityName}</p>
                    <p className="text-[10px] font-mono-plex text-slate-400">Visit on Reddit</p>
                  </div>
                  <ExternalLink className="h-4 w-4 text-slate-400" />
                </a>
              ) : comments.length === 0 ? (
                <p className="text-xs text-slate-400 italic text-center py-6">No comments yet</p>
              ) : (
                comments.map(activity => (
                  <ActivityItem
                    key={activity.id}
                    activity={activity}
                    accent="orange"
                    onClick={() => setPreviewActivity(activity)}
                  />
                ))
              )}
            </div>
          </div>
        </Card>

        {/* RIGHT — 40% column with two stacked cards */}
        <div className="flex flex-col gap-3 h-full" style={{ width: '40%' }}>
          {/* Keyword Intelligence */}
          <Card className="bg-white rounded-xl shadow-sm border border-slate-200 border-t-4 border-t-blue-600 flex flex-col overflow-hidden flex-1 min-h-0">
            <div className="border-b border-slate-100 shrink-0" style={{ padding: '10px 14px' }}>
              <p className="text-sm font-semibold text-slate-900">Keyword Intelligence</p>
            </div>
            <div className="flex-1 min-h-0 p-2 overflow-hidden">
              <div className="bg-blue-50 rounded-lg p-2 w-full h-full overflow-hidden flex items-center justify-center">
                <InlineWordCloud words={wordsForCloud} />
              </div>
            </div>
          </Card>

          {/* Activity Distribution */}
          <Card className="bg-white rounded-xl shadow-sm border border-slate-200 border-t-4 border-t-blue-600 flex flex-col overflow-hidden flex-1 min-h-0">
            <div className="border-b border-slate-100 shrink-0" style={{ padding: '10px 14px' }}>
              <p className="text-sm font-semibold text-slate-900">Activity Distribution</p>
              <p className="text-[10px] text-slate-400 mt-0.5">
                {profileData.communityName ? 'Daily post distribution' : 'Posts vs Comments'}
              </p>
            </div>
            <div className="flex-1 min-h-0 p-2">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={activityBreakdownData} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
                  <CartesianGrid stroke="#F1F5F9" strokeDasharray="3 3" vertical={false} />
                  <XAxis
                    dataKey="name"
                    tick={{ fill: '#94A3B8', fontSize: 10, fontFamily: 'IBM Plex Mono, monospace' }}
                    axisLine={{ stroke: '#E2E8F0' }}
                    tickLine={false}
                    interval={0}
                    tickFormatter={(v: string) => (typeof v === 'string' && v.length > 10 ? v.slice(0, 10) : v)}
                  />
                  <YAxis
                    tick={{ fill: '#94A3B8', fontSize: 10, fontFamily: 'IBM Plex Mono, monospace' }}
                    axisLine={{ stroke: '#E2E8F0' }}
                    tickLine={false}
                    allowDecimals={false}
                    width={28}
                  />
                  <ReTooltip
                    cursor={{ fill: 'rgba(59,130,246,0.06)' }}
                    contentStyle={{
                      backgroundColor: 'white',
                      border: '1px solid #E2E8F0',
                      borderRadius: '8px',
                      boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
                      fontFamily: 'IBM Plex Mono, monospace',
                      fontSize: '11px',
                    }}
                  />
                  <Bar dataKey="value" radius={[6, 6, 0, 0]} maxBarSize={48}>
                    {activityBreakdownData.map((_, i) => (
                      <Cell key={i} fill="#3B82F6" />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </div>
      </div>

      {/* Preview Dialog */}
      <Dialog open={!!previewActivity} onOpenChange={(open) => !open && setPreviewActivity(null)}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="text-base leading-snug">
              {previewActivity?.type === 'post' ? '📄 Post' : '💬 Comment'} Preview
            </DialogTitle>
            <DialogDescription className="flex items-center gap-2 pt-1">
              <Badge variant="outline" className="text-xs">{previewActivity?.subreddit}</Badge>
              <span className="text-[11px] font-mono-plex text-slate-400">{previewActivity?.timestamp}</span>
            </DialogDescription>
          </DialogHeader>
          <ScrollArea className="flex-1 max-h-[50vh]">
            <div className="space-y-3 pr-4">
              <h3 className="font-semibold text-sm text-slate-900">{previewActivity?.title}</h3>
              {previewActivity?.body && (
                <p className="text-sm text-slate-600 whitespace-pre-wrap">{previewActivity.body}</p>
              )}
              {!previewActivity?.body && (
                <p className="text-sm text-slate-400 italic">No additional content available.</p>
              )}
            </div>
          </ScrollArea>
          <div className="pt-3 border-t border-slate-100">
            <a href={previewActivity?.url} target="_blank" rel="noopener noreferrer" className="w-full">
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
