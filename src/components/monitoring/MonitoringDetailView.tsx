import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { User, Users, Calendar, TrendingUp, FileText, Activity, MessageSquare, ExternalLink, StopCircle, ArrowLeft } from 'lucide-react';
import { WordCloud } from '@/components/WordCloud';
import { AnalyticsChart } from '@/components/AnalyticsChart';

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

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Back button + Status */}
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="sm" onClick={onBack} className="gap-2">
          <ArrowLeft className="h-4 w-4" />
          Back to Monitoring Overview
        </Button>
        <div className="flex items-center gap-2">
          {isMonitoring && (
            <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
              {isFetching && <span className="h-2 w-2 rounded-full bg-primary animate-pulse" />}
              {isFetching ? 'Checking...' : 'Monitoring Active'}
              {lastFetchTime && <span className="text-xs">• Last: {lastFetchTime}</span>}
            </span>
          )}
        </div>
      </div>

      {/* Profile Card */}
      <Card className="border-2 overflow-hidden">
        {profileData.communityName && profileData.bannerImg && (
          <div className="relative h-32 w-full bg-muted">
            <img 
              src={profileData.bannerImg} 
              alt={`${profileData.communityName} banner`}
              className="w-full h-full object-cover"
              onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
            />
          </div>
        )}
        <CardHeader className={profileData.iconImg ? 'relative' : ''}>
          {profileData.iconImg && (
            <div className={`absolute ${profileData.communityName && profileData.bannerImg ? '-top-8' : 'top-4'} left-6`}>
              <div className="w-16 h-16 rounded-full border-4 border-background bg-background overflow-hidden shadow-lg">
                <img 
                  src={profileData.iconImg} 
                  alt={`${profileData.username || profileData.communityName} avatar`}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    const fallback = profileData.username ? 'u/' : 'r/';
                    (e.target as HTMLImageElement).parentElement!.innerHTML = `<div class="w-full h-full bg-primary/20 flex items-center justify-center"><span class="text-primary font-bold text-xl">${fallback}</span></div>`;
                  }}
                />
              </div>
            </div>
          )}
          <CardTitle className={`flex items-center gap-2 ${profileData.iconImg ? 'ml-20' : ''}`}>
            {!profileData.iconImg && (profileData.username ? <User className="h-5 w-5" /> : <Users className="h-5 w-5" />)}
            {profileData.username || profileData.communityName}
          </CardTitle>
          <CardDescription className={profileData.iconImg ? 'ml-20' : ''}>
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

          {/* Stop button */}
          {isMonitoring && (
            <div className="flex flex-col items-center gap-3 pt-4 border-t">
              <Button onClick={onStop} size="lg" variant="destructive" className="w-full max-w-md">
                <StopCircle className="h-5 w-5 mr-2" />
                Stop Monitoring
              </Button>
              {newActivityCount > 0 && (
                <div className="px-3 py-2 rounded-md bg-primary/10 text-primary text-sm text-center font-medium">
                  ✨ {newActivityCount} new {newActivityCount === 1 ? 'item' : 'items'} detected
                </div>
              )}
              <p className="text-xs text-muted-foreground text-center">
                Checking every 15 seconds for new posts and comments
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dashboard content - User monitoring */}
      {!profileData.communityName && (
        <>
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
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h4 className="font-semibold mb-3 flex items-center gap-2">
                    <FileText className="h-4 w-4 text-primary" />
                    Posts
                  </h4>
                  <ScrollArea className="h-80">
                    <div className="space-y-2 pr-4">
                      {activities.filter(a => a.type === 'post').map(activity => (
                        <div key={activity.id} onClick={() => setPreviewActivity(activity)}
                          className="block p-3 rounded-lg border hover:bg-accent transition-colors cursor-pointer">
                          <p className="text-sm font-medium line-clamp-2">{activity.title}</p>
                          {activity.body && <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{activity.body}</p>}
                          <div className="flex flex-col gap-1 mt-1">
                            <Badge variant="outline" className="text-xs w-fit">{activity.subreddit}</Badge>
                            <span className="text-xs text-muted-foreground">{activity.timestamp}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </div>
                <div>
                  <h4 className="font-semibold mb-3 flex items-center gap-2">
                    <MessageSquare className="h-4 w-4 text-primary" />
                    Comments
                  </h4>
                  <ScrollArea className="h-80">
                    <div className="space-y-2 pr-4">
                      {activities.filter(a => a.type === 'comment').map(activity => (
                        <div key={activity.id} onClick={() => setPreviewActivity(activity)}
                          className="block p-3 rounded-lg border hover:bg-accent transition-colors cursor-pointer">
                          <p className="text-sm font-medium line-clamp-2">{activity.title}</p>
                          {activity.body && <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{activity.body}</p>}
                          <div className="flex flex-col gap-1 mt-1">
                            <Badge variant="outline" className="text-xs w-fit">{activity.subreddit}</Badge>
                            <span className="text-xs text-muted-foreground">{activity.timestamp}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader><CardTitle>Trending Keywords (Recent Activity)</CardTitle></CardHeader>
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

      {/* Dashboard content - Community monitoring */}
      {profileData.communityName && (
        <div className="space-y-6">
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
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h4 className="font-semibold mb-3 flex items-center gap-2">
                    <FileText className="h-4 w-4 text-primary" />
                    Posts
                  </h4>
                  <ScrollArea className="h-80">
                    <div className="space-y-2 pr-4">
                      {activities.filter(a => a.type === 'post').map(activity => (
                        <div key={activity.id} onClick={() => setPreviewActivity(activity)}
                          className="block p-3 rounded-lg border hover:bg-accent transition-colors cursor-pointer">
                          <p className="text-sm font-medium line-clamp-2">{activity.title}</p>
                          {activity.body && <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{activity.body}</p>}
                          <div className="flex flex-col gap-1 mt-1">
                            <Badge variant="outline" className="text-xs w-fit">{activity.subreddit}</Badge>
                            <span className="text-xs text-muted-foreground">{activity.timestamp}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </div>
                <div>
                  <h4 className="font-semibold mb-3 flex items-center gap-2">
                    <ExternalLink className="h-4 w-4 text-primary" />
                    Community Link
                  </h4>
                  <a href={`https://reddit.com/${profileData.communityName}`} target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-2 p-4 rounded-lg border hover:bg-accent transition-colors">
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

          <div className="grid grid-cols-2 gap-4">
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-base">Trending Keywords</CardTitle></CardHeader>
              <CardContent className="pt-0">
                <WordCloud words={wordCloudData.length > 0 ? wordCloudData : realTimeWordCloud} title="" />
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  Weekly Contributions
                </CardTitle>
                <CardDescription className="text-xs">From Reddit community stats</CardDescription>
              </CardHeader>
              <CardContent className="flex items-center justify-center min-h-[220px]">
                <div className="text-center text-muted-foreground">
                  <Users className="h-12 w-12 mx-auto mb-3 opacity-30" />
                  <p className="text-sm font-medium">Weekly contributions not available</p>
                  <p className="text-xs mt-1 max-w-[200px]">Reddit's API doesn't expose this metric.</p>
                  <a href={`https://reddit.com/${profileData.communityName}`} target="_blank" rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-xs text-primary hover:underline mt-3">
                    <ExternalLink className="h-3 w-3" />View on Reddit
                  </a>
                </div>
              </CardContent>
            </Card>
          </div>

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
      {/* Preview Dialog */}
      <Dialog open={!!previewActivity} onOpenChange={(open) => !open && setPreviewActivity(null)}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="text-base leading-snug">
              {previewActivity?.type === 'post' ? '📄 Post' : '💬 Comment'} Preview
            </DialogTitle>
            <DialogDescription className="flex items-center gap-2 pt-1">
              <Badge variant="outline" className="text-xs">{previewActivity?.subreddit}</Badge>
              <span className="text-xs">{previewActivity?.timestamp}</span>
            </DialogDescription>
          </DialogHeader>
          <ScrollArea className="flex-1 max-h-[50vh]">
            <div className="space-y-3 pr-4">
              <h3 className="font-semibold text-sm">{previewActivity?.title}</h3>
              {previewActivity?.body && (
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">{previewActivity.body}</p>
              )}
              {!previewActivity?.body && (
                <p className="text-sm text-muted-foreground italic">No additional content available.</p>
              )}
            </div>
          </ScrollArea>
          <div className="pt-3 border-t">
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
