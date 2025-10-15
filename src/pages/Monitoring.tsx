import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Search, User, MessageSquare, Calendar, X, FileText, Activity, Bell, Mail, Play, Square, Users } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { WordCloud } from '@/components/WordCloud';
import { AnalyticsChart } from '@/components/AnalyticsChart';

interface Alert {
  id: string;
  message: string;
  timestamp: string;
  type: 'keyword' | 'activity' | 'mention';
}

const Monitoring = () => {
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchType, setSearchType] = useState<'user' | 'community'>('user');
  const [results, setResults] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isMonitoring, setIsMonitoring] = useState(false);
  const [emailAlertsEnabled, setEmailAlertsEnabled] = useState(false);
  const [alerts, setAlerts] = useState<Alert[]>([
    { id: '1', message: "Spike in keyword: 'breaking news'", timestamp: '2 mins ago', type: 'keyword' },
    { id: '2', message: 'High activity detected in r/technology', timestamp: '5 mins ago', type: 'activity' },
    { id: '3', message: 'New mention detected', timestamp: '10 mins ago', type: 'mention' },
  ]);

  // Sample data for visualizations
  const keywordTrendData = [
    { name: '6h ago', value: 15 },
    { name: '5h ago', value: 23 },
    { name: '4h ago', value: 18 },
    { name: '3h ago', value: 32 },
    { name: '2h ago', value: 28 },
    { name: '1h ago', value: 45 },
    { name: 'Now', value: 38 },
  ];

  const activitySpikeData = [
    { name: 'Posts', value: 156 },
    { name: 'Comments', value: 284 },
    { name: 'Shares', value: 97 },
    { name: 'Mentions', value: 67 },
  ];

  const realTimeWordCloud = [
    { word: searchQuery || "trending", frequency: 89, category: "high" as const },
    { word: "discussion", frequency: 76, category: "high" as const },
    { word: "breaking", frequency: 65, category: "medium" as const },
    { word: "update", frequency: 58, category: "medium" as const },
    { word: "news", frequency: 71, category: "high" as const },
    { word: "analysis", frequency: 45, category: "medium" as const },
    { word: "community", frequency: 42, category: "low" as const },
    { word: "response", frequency: 38, category: "low" as const },
  ];

  const handleClearSearch = () => {
    setSearchQuery('');
    setResults(null);
    setIsMonitoring(false);
  };

  const handleSendEmail = () => {
    toast({
      title: "Email Sent",
      description: "Notification email has been sent successfully.",
    });
  };

  useEffect(() => {
    if (isMonitoring) {
      const interval = setInterval(() => {
        const newAlert: Alert = {
          id: Date.now().toString(),
          message: `Activity update at ${new Date().toLocaleTimeString()}`,
          timestamp: 'Just now',
          type: 'activity'
        };
        setAlerts(prev => [newAlert, ...prev.slice(0, 9)]);
      }, 30000);
      
      return () => clearInterval(interval);
    }
  }, [isMonitoring]);

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;

    setIsLoading(true);
    
    await new Promise(resolve => setTimeout(resolve, 1500));

    if (searchType === 'user') {
      const username = searchQuery.replace('u/', '');
      
      if (username === 'nonexistentuser') {
        toast({
          title: "User Not Found",
          description: "User not found",
          variant: "destructive",
        });
        setResults(null);
        setIsLoading(false);
        return;
      }

      setResults({
        type: 'user',
        name: `u/${username}`,
        data: {
          accountAge: '3 years, 7 months',
          karma: 1247,
          posts: 89,
          comments: 342,
        }
      });
    } else {
      const subreddit = searchQuery.replace('r/', '');
      setResults({
        type: 'community',
        name: `r/${subreddit}`,
        data: {
          created: '2015-06-20',
          members: '2.5M',
          posts: [
            { title: 'Top discussion in ' + subreddit, score: 156, comments: 45 },
            { title: 'Popular post in ' + subreddit, score: 89, comments: 23 },
          ]
        }
      });
    }

    setIsLoading(false);
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto p-6 space-y-6">
        {/* Header with Monitoring Control */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Reddit Monitoring</h1>
            <p className="text-muted-foreground mt-1">
              Start monitoring any Reddit user or community for activity and trends
            </p>
          </div>
          {results && (
            <Button
              onClick={() => setIsMonitoring(!isMonitoring)}
              variant={isMonitoring ? "destructive" : "default"}
              size="lg"
              className="gap-2"
            >
              {isMonitoring ? (
                <>
                  <Square className="h-4 w-4" />
                  Stop Monitoring
                </>
              ) : (
                <>
                  <Play className="h-4 w-4" />
                  Start Monitoring
                </>
              )}
            </Button>
          )}
        </div>

        {/* Search Panel */}
        <Card className="border-2">
          <CardContent className="pt-6">
            <div className="flex gap-2">
              <Select value={searchType} onValueChange={(value: 'user' | 'community') => setSearchType(value)}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="user">
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4" />
                      u/username
                    </div>
                  </SelectItem>
                  <SelectItem value="community">
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4" />
                      r/community
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
              
              <div className="relative flex-1">
                <Input
                  placeholder={`Enter ${searchType === 'user' ? 'username' : 'community name'}...`}
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
                  disabled={isLoading}
                >
                  <Search className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Main Content Area */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left/Main Column */}
          <div className="lg:col-span-2 space-y-6">
            {/* User/Community Info Section */}
            {results && (
              <Card className="border-2">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    {results.type === 'user' ? (
                      <User className="h-5 w-5" />
                    ) : (
                      <Users className="h-5 w-5" />
                    )}
                    {results.name}
                  </CardTitle>
                  <CardDescription>
                    {results.type === 'user' ? 'User Profile Details' : 'Community Information'}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="flex items-start gap-3">
                      <Calendar className="h-5 w-5 text-primary mt-0.5" />
                      <div>
                        <p className="text-xs text-muted-foreground">Join Date</p>
                        <p className="font-semibold">
                          {results.type === 'user' ? results.data.accountAge : results.data.created}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <FileText className="h-5 w-5 text-primary mt-0.5" />
                      <div>
                        <p className="text-xs text-muted-foreground">Posts</p>
                        <p className="font-semibold">{results.data.posts?.length || results.data.posts || 89}</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <MessageSquare className="h-5 w-5 text-primary mt-0.5" />
                      <div>
                        <p className="text-xs text-muted-foreground">Comments</p>
                        <p className="font-semibold">{results.data.comments || 342}</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <Activity className="h-5 w-5 text-primary mt-0.5" />
                      <div>
                        <p className="text-xs text-muted-foreground">Activity Level</p>
                        <Badge variant={isMonitoring ? "default" : "secondary"}>
                          {isMonitoring ? 'High' : 'Medium'}
                        </Badge>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Monitoring Overview */}
            {results && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h2 className="text-2xl font-bold">Real-Time Monitoring Overview</h2>
                  {isMonitoring && (
                    <Badge variant="default" className="animate-pulse">
                      <Activity className="h-3 w-3 mr-1" />
                      Live
                    </Badge>
                  )}
                </div>

                {/* Trending Keywords Cloud */}
                <Card>
                  <CardHeader>
                    <CardTitle>Trending Keywords Cloud</CardTitle>
                    <CardDescription>
                      Color coded by frequency: red = high, yellow = medium, green = low
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <WordCloud words={realTimeWordCloud} title="" />
                  </CardContent>
                </Card>

                {/* Activity Timeline */}
                <Card>
                  <CardHeader>
                    <CardTitle>Activity Timeline</CardTitle>
                    <CardDescription>Activity for the last 6 hours</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <AnalyticsChart data={keywordTrendData} title="" type="line" height={250} />
                  </CardContent>
                </Card>

                {/* Activity Breakdown */}
                <Card>
                  <CardHeader>
                    <CardTitle>Activity Breakdown</CardTitle>
                    <CardDescription>Distribution across different activity types</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="h-64">
                      <AnalyticsChart data={activitySpikeData} title="" type="bar" height={250} />
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {!results && (
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

          {/* Right Column - Notifications & Email Panel */}
          <div className="lg:col-span-1">
            <Card className="sticky top-6">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Bell className="h-5 w-5" />
                  Alerts & Notifications
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Alerts List */}
                <div>
                  <Label className="text-sm font-semibold mb-2 block">Latest Alerts</Label>
                  <ScrollArea className="h-64 rounded-md border p-4">
                    <div className="space-y-3">
                      {alerts.map((alert) => (
                        <div key={alert.id} className="flex items-start gap-2 pb-3 border-b last:border-0">
                          <Bell className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium leading-tight">{alert.message}</p>
                            <p className="text-xs text-muted-foreground mt-1">{alert.timestamp}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </div>

                {/* Email Controls */}
                <div className="space-y-3 pt-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="email-alerts" className="text-sm font-semibold">
                      Enable Email Alerts
                    </Label>
                    <Switch
                      id="email-alerts"
                      checked={emailAlertsEnabled}
                      onCheckedChange={setEmailAlertsEnabled}
                    />
                  </div>
                  
                  <Button
                    onClick={handleSendEmail}
                    className="w-full gap-2"
                    variant="outline"
                    disabled={!emailAlertsEnabled}
                  >
                    <Mail className="h-4 w-4" />
                    Send Email Notification
                  </Button>
                </div>

                {/* Status Info */}
                {results && (
                  <div className="pt-2 border-t space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Monitoring Status:</span>
                      <Badge variant={isMonitoring ? "default" : "secondary"}>
                        {isMonitoring ? 'Active' : 'Inactive'}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Email Alerts:</span>
                      <Badge variant={emailAlertsEnabled ? "default" : "secondary"}>
                        {emailAlertsEnabled ? 'Enabled' : 'Disabled'}
                      </Badge>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Monitoring;
