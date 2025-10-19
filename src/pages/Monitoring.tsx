import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, SelectLabel, SelectGroup, SelectSeparator } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Search, User, MessageSquare, Calendar, X, FileText, Activity, Users, Share2, TrendingUp, ExternalLink } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { WordCloud } from '@/components/WordCloud';
import { AnalyticsChart } from '@/components/AnalyticsChart';
import { MiniSparkline } from '@/components/MiniSparkline';
import { CompactBarChart } from '@/components/CompactBarChart';

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

  const activityBreakdownData = profileData?.communityName 
    ? [
        { name: 'Posts', value: 42 },
        { name: 'Shares', value: 23 },
        { name: 'Mentions', value: 15 },
      ]
    : [
        { name: 'Posts', value: 42 },
        { name: 'Comments', value: 87 },
        { name: 'Shares', value: 23 },
        { name: 'Mentions', value: 15 },
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
  };

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

  const handleStartMonitoring = () => {
    setIsMonitoring(true);
    if (profileData && searchType) {
      const name = profileData.username || profileData.communityName || '';
      setActivities(generateActivities(searchType as 'user' | 'community', name));
    }
  };

  const handleSearch = async () => {
    if (!searchQuery.trim() || !searchType) return;

    setIsLoading(true);
    setIsMonitoring(false);
    setActivities([]);
    
    await new Promise(resolve => setTimeout(resolve, 1500));

    if (searchType === 'user') {
      const username = searchQuery.replace('u/', '');
      
      if (username === 'nonexistentuser') {
        toast({
          title: "User Not Found",
          description: "User not found",
          variant: "destructive",
        });
        setProfileData(null);
        setIsLoading(false);
        return;
      }

      setProfileData({
        username: `u/${username}`,
        accountAge: '3 years, 7 months',
        totalKarma: 15847,
        activeSubreddits: 12,
      });
    } else {
      const subreddit = searchQuery.replace('r/', '');
      setProfileData({
        communityName: `r/${subreddit}`,
        memberCount: '2.5M',
        description: 'Welcome to the subreddit! Whether you\'re a current member or simply interested, this community is your hub for all things related.',
        createdDate: 'Sep 1, 2020',
      });
    }

    setIsLoading(false);
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
                    Start Monitoring
                  </Button>
                  <p className="text-xs text-muted-foreground text-center">
                    Click 'Start Monitoring' to begin real-time tracking of activity and trends.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Main Monitoring Dashboard - Only shown after Start Monitoring */}
        {isMonitoring && profileData && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-fade-in">
            {/* Left Column */}
            <div className="lg:col-span-2 space-y-6">
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

              {/* Activity Timeline or Weekly Stats */}
              {profileData.communityName ? (
                // Community monitoring - Compact dual horizontal bar chart
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base">Community Activity</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <CompactBarChart 
                      visitorValue="3.2K"
                      contributorValue="1.8K"
                      visitorCount={3200}
                      contributorCount={1800}
                    />
                  </CardContent>
                </Card>
              ) : (
                // User monitoring - Activity Timeline
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
            <div className="lg:col-span-1 space-y-6">
              {/* Trending Keywords */}
              <Card>
                <CardHeader>
                  <CardTitle>Trending Keywords (Recent Activity)</CardTitle>
                  <CardDescription>
                    Color coded: Red = high, Green = medium, Light blue = low
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <WordCloud words={realTimeWordCloud} title="" />
                </CardContent>
              </Card>

              {/* Activity Breakdown */}
              <Card>
                <CardHeader>
                  <CardTitle>Activity Breakdown (Last 24 Hours)</CardTitle>
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
