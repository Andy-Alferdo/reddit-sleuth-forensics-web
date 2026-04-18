import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { User, Users, Calendar, TrendingUp, FileText, MessageSquare, ExternalLink, StopCircle, ArrowLeft } from 'lucide-react';
import { WordCloud } from '@/components/WordCloud';
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

// ── Small UI helpers ──────────────────────────────────────────────
const SectionLabel = ({ children, className = '' }: { children: React.ReactNode; className?: string }) => (
  <span className={`text-[10px] uppercase tracking-widest font-mono-plex font-semibold text-slate-400 ${className}`}>
    {children}
  </span>
);

const StatBlock = ({
  icon: Icon, label, value, withDivider,
}: { icon: any; label: string; value: React.ReactNode; withDivider?: boolean }) => (
  <div className={`text-center flex-1 ${withDivider ? 'border-r border-slate-200' : ''}`}>
    <Icon className="text-blue-600 w-5 h-5 mx-auto mb-1" />
    <p className="text-[10px] uppercase tracking-widest text-slate-400 font-mono-plex">{label}</p>
    <p className="text-2xl font-bold text-slate-900 font-mono-plex leading-tight mt-0.5">{value}</p>
  </div>
);

// Activity item used by Posts/Comments columns
const ActivityItem = ({
  activity, accent, onClick,
}: { activity: RedditActivity; accent: 'blue' | 'orange'; onClick: () => void }) => {
  const borderClass = accent === 'blue' ? 'border-l-blue-500' : 'border-l-orange-400';
  return (
    <div
      onClick={onClick}
      className={`group cursor-pointer bg-white rounded-md border border-slate-200 border-l-[3px] ${borderClass} px-3 py-2.5 hover:bg-slate-50 transition-colors duration-150`}
    >
      <p className="text-[13px] font-medium text-slate-800 line-clamp-2 leading-snug">{activity.title}</p>
      {activity.body && (
        <p className="text-[12px] text-slate-500 mt-1 line-clamp-2 leading-snug">{activity.body}</p>
      )}
      <div className="flex items-center justify-between mt-2 gap-2">
        <span className="text-[12px] text-cyan-600 font-medium truncate">{activity.subreddit}</span>
        <span className="text-[11px] font-mono-plex text-slate-400 whitespace-nowrap">{activity.timestamp}</span>
      </div>
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

  return (
    <div className="space-y-5 animate-fade-in bg-[#F8FAFC] -m-6 p-6 rounded-xl">
      {/* Back button + Status */}
      <div className="flex items-center justify-between">
        <button
          onClick={onBack}
          className="text-blue-600 text-sm font-medium hover:text-blue-800 flex items-center gap-1 mb-0"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Overview
        </button>
        {isMonitoring && lastFetchTime && (
          <span className="text-[11px] font-mono-plex text-slate-400">Last sync: {lastFetchTime}</span>
        )}
      </div>

      {/* ── Profile Header Card ─────────────────────────── */}
      <Card className="bg-white rounded-xl shadow-sm border border-slate-200 border-t-4 border-t-blue-600 overflow-hidden">
        {profileData.communityName && profileData.bannerImg && (
          <div className="relative h-24 w-full bg-slate-100">
            <img
              src={profileData.bannerImg}
              alt={`${profileData.communityName} banner`}
              className="w-full h-full object-cover"
              onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
            />
          </div>
        )}
        <CardContent className="p-5">
          <div className="flex items-start gap-4">
            {/* Avatar */}
            <div className="ring-2 ring-blue-600 ring-offset-2 rounded-full overflow-hidden bg-white shrink-0" style={{ width: 72, height: 72 }}>
              {profileData.iconImg ? (
                <img
                  src={profileData.iconImg}
                  alt="avatar"
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    const fallback = profileData.username ? 'u/' : 'r/';
                    (e.target as HTMLImageElement).parentElement!.innerHTML =
                      `<div class="w-full h-full bg-blue-50 flex items-center justify-center"><span class="text-blue-600 font-bold text-xl font-mono-plex">${fallback}</span></div>`;
                  }}
                />
              ) : (
                <div className="w-full h-full bg-blue-50 flex items-center justify-center">
                  {profileData.username ? <User className="h-8 w-8 text-blue-600" /> : <Users className="h-8 w-8 text-blue-600" />}
                </div>
              )}
            </div>

            {/* Identity */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <a
                  href={profileLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-mono-plex font-bold text-slate-900 text-xl hover:text-blue-700 transition-colors flex items-center gap-1.5 group"
                >
                  {profileData.username || profileData.communityName}
                  <ExternalLink className="h-3.5 w-3.5 opacity-0 group-hover:opacity-100 transition-opacity" />
                </a>
                <span className="bg-blue-50 text-blue-700 text-[10px] uppercase tracking-wider font-semibold px-2 py-0.5 rounded-full">
                  {profileData.username ? 'User' : 'Community'}
                </span>
                {isMonitoring && (
                  <span className="inline-flex items-center gap-1.5 bg-emerald-50 text-emerald-700 font-semibold text-xs rounded-full px-3 py-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 monitoring-pulse-dot" />
                    Monitoring Active
                  </span>
                )}
              </div>
              {profileData.communityName && profileData.description && (
                <p className="text-[13px] text-slate-500 mt-1.5 line-clamp-2">{profileData.description}</p>
              )}
            </div>

            {/* Stop button */}
            {isMonitoring && (
              <button
                onClick={onStop}
                className="border-2 border-red-500 text-red-500 bg-white hover:bg-red-50 rounded-lg px-4 py-1.5 text-sm font-medium inline-flex items-center gap-1.5 transition-colors shrink-0"
              >
                <StopCircle className="h-4 w-4" />
                Stop Monitoring
              </button>
            )}
          </div>

          {/* Stats row */}
          <div className="border-t border-slate-100 pt-4 mt-4 flex items-stretch">
            {profileData.username ? (
              <>
                <StatBlock
                  icon={TrendingUp}
                  label="Karma"
                  value={(profileData.totalKarma || 0).toLocaleString()}
                  withDivider
                />
                <StatBlock
                  icon={Calendar}
                  label="Age"
                  value={profileData.accountAge || '—'}
                  withDivider
                />
                <StatBlock
                  icon={FileText}
                  label="Posts"
                  value={posts.length}
                  withDivider
                />
                <StatBlock
                  icon={MessageSquare}
                  label="Comments"
                  value={comments.length}
                />
              </>
            ) : (
              <>
                <StatBlock
                  icon={Users}
                  label="Members"
                  value={profileData.memberCount || '—'}
                  withDivider
                />
                <StatBlock
                  icon={Calendar}
                  label="Created"
                  value={profileData.createdDate || '—'}
                  withDivider
                />
                <StatBlock
                  icon={FileText}
                  label="Posts"
                  value={posts.length}
                  withDivider
                />
                <StatBlock
                  icon={MessageSquare}
                  label="Comments"
                  value={comments.length}
                />
              </>
            )}
          </div>

          {newActivityCount > 0 && isMonitoring && (
            <div className="mt-4 inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-50 text-blue-700 text-xs font-mono-plex font-semibold">
              ✨ {newActivityCount} new {newActivityCount === 1 ? 'item' : 'items'} detected
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Live Activity Feed ──────────────────────────── */}
      <Card className="bg-white rounded-xl shadow-sm border border-slate-200 border-l-4 border-l-blue-600">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center text-[15px] font-semibold text-slate-900">
              <span className="w-1 h-5 bg-blue-600 rounded-full mr-2 inline-block" />
              Live Activity Feed
              {isFetching && <span className="ml-2 h-1.5 w-1.5 rounded-full bg-blue-600 monitoring-pulse-dot" />}
            </CardTitle>
            {newActivityCount > 0 && (
              <span className="bg-blue-50 text-blue-700 font-mono-plex text-[10px] font-semibold rounded-full px-2 py-0.5">
                {newActivityCount} NEW
              </span>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Posts column */}
            <div>
              <div className="border-b-2 border-blue-600 pb-1 mb-3 flex items-center justify-between">
                <span className="text-[11px] uppercase tracking-widest font-mono-plex text-slate-500 font-semibold">Posts</span>
                <span className="text-[11px] font-mono-plex text-slate-400">{posts.length}</span>
              </div>
              <ScrollArea className="max-h-[480px] h-[480px] scrollbar-thin pr-2">
                <div className="space-y-2">
                  {posts.length === 0 && (
                    <p className="text-xs text-slate-400 italic text-center py-8">No posts yet</p>
                  )}
                  {posts.map(activity => (
                    <ActivityItem
                      key={activity.id}
                      activity={activity}
                      accent="blue"
                      onClick={() => setPreviewActivity(activity)}
                    />
                  ))}
                </div>
              </ScrollArea>
            </div>

            {/* Comments column (or community link for community monitoring) */}
            <div>
              {profileData.communityName ? (
                <>
                  <div className="border-b-2 border-orange-400 pb-1 mb-3 flex items-center justify-between">
                    <span className="text-[11px] uppercase tracking-widest font-mono-plex text-slate-500 font-semibold">Community</span>
                  </div>
                  <a
                    href={`https://reddit.com/${profileData.communityName}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-3 p-4 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 transition-colors"
                  >
                    <Users className="h-5 w-5 text-blue-600" />
                    <div className="flex-1 min-w-0">
                      <p className="font-mono-plex font-semibold text-slate-900 truncate">{profileData.communityName}</p>
                      <p className="text-[11px] font-mono-plex text-slate-400">Visit on Reddit</p>
                    </div>
                    <ExternalLink className="h-4 w-4 text-slate-400" />
                  </a>
                </>
              ) : (
                <>
                  <div className="border-b-2 border-orange-400 pb-1 mb-3 flex items-center justify-between">
                    <span className="text-[11px] uppercase tracking-widest font-mono-plex text-slate-500 font-semibold">Comments</span>
                    <span className="text-[11px] font-mono-plex text-slate-400">{comments.length}</span>
                  </div>
                  <ScrollArea className="max-h-[480px] h-[480px] scrollbar-thin pr-2">
                    <div className="space-y-2">
                      {comments.length === 0 && (
                        <p className="text-xs text-slate-400 italic text-center py-8">No comments yet</p>
                      )}
                      {comments.map(activity => (
                        <ActivityItem
                          key={activity.id}
                          activity={activity}
                          accent="orange"
                          onClick={() => setPreviewActivity(activity)}
                        />
                      ))}
                    </div>
                  </ScrollArea>
                </>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ── Keyword Intelligence + Activity Distribution ─ */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <Card className="bg-white rounded-xl shadow-sm border border-slate-200 border-t-4 border-t-blue-600">
          <CardHeader className="pb-3 border-b border-slate-100">
            <CardTitle className="text-[14px] font-semibold text-slate-900">Keyword Intelligence</CardTitle>
            <p className="text-[11px] text-slate-400 font-mono-plex mt-0.5">Frequency-weighted topic signals</p>
          </CardHeader>
          <CardContent className="pt-3">
            <div className="bg-blue-50 rounded-lg p-3">
              <WordCloud
                words={wordCloudData.length > 0 ? wordCloudData : realTimeWordCloud}
                title=""
                bluePalette
              />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white rounded-xl shadow-sm border border-slate-200 border-t-4 border-t-blue-600">
          <CardHeader className="pb-3 border-b border-slate-100">
            <CardTitle className="text-[14px] font-semibold text-slate-900">Activity Distribution</CardTitle>
            <p className="text-[11px] text-slate-400 font-mono-plex mt-0.5">
              {profileData.communityName ? 'Daily post distribution' : 'Posts vs Comments by community'}
            </p>
          </CardHeader>
          <CardContent className="pt-3">
            <div style={{ width: '100%', height: 260 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={activityBreakdownData} margin={{ top: 8, right: 12, left: -8, bottom: 24 }}>
                  <CartesianGrid stroke="#F1F5F9" strokeDasharray="3 3" vertical={false} />
                  <XAxis
                    dataKey="name"
                    tick={{ fill: '#94A3B8', fontSize: 11, fontFamily: 'IBM Plex Mono, monospace' }}
                    axisLine={{ stroke: '#E2E8F0' }}
                    tickLine={false}
                    interval={0}
                    angle={activityBreakdownData.length > 3 ? -25 : 0}
                    textAnchor={activityBreakdownData.length > 3 ? 'end' : 'middle'}
                    height={48}
                  />
                  <YAxis
                    tick={{ fill: '#94A3B8', fontSize: 11, fontFamily: 'IBM Plex Mono, monospace' }}
                    axisLine={{ stroke: '#E2E8F0' }}
                    tickLine={false}
                    allowDecimals={false}
                  />
                  <ReTooltip
                    cursor={{ fill: 'rgba(59,130,246,0.06)' }}
                    contentStyle={{
                      backgroundColor: 'white',
                      border: '1px solid #E2E8F0',
                      borderRadius: '8px',
                      boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
                      fontFamily: 'IBM Plex Mono, monospace',
                      fontSize: '12px',
                    }}
                  />
                  <Bar dataKey="value" radius={[6, 6, 0, 0]} maxBarSize={56}>
                    {activityBreakdownData.map((_, i) => (
                      <Cell key={i} fill="#3B82F6" />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
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
