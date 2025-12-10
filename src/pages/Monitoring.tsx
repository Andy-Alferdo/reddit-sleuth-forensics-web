import React, { Component } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, SelectLabel, SelectGroup, SelectSeparator } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Search, User, MessageSquare, Calendar, X, FileText, Activity, Users, Share2, TrendingUp, ExternalLink, StopCircle } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { WordCloud } from '@/components/WordCloud';
import { AnalyticsChart } from '@/components/AnalyticsChart';
import { MiniSparkline } from '@/components/MiniSparkline';
import { CompactBarChart } from '@/components/CompactBarChart';
import { redditService } from '@/services';
import { formatCurrentTimePakistan, formatActivityTime } from '@/lib/dateUtils';

/**
 * Reddit Activity Interface
 */
interface RedditActivity {
  id: string;
  type: 'post' | 'comment';
  title: string;
  subreddit: string;
  timestamp: string;
  url: string;
}

/**
 * Profile Data Interface
 */
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

/**
 * Monitoring State Interface
 */
interface MonitoringState {
  searchQuery: string;
  searchType: 'user' | 'community' | '';
  profileData: ProfileData | null;
  isLoading: boolean;
  isMonitoring: boolean;
  investigatorEmail: string;
  activities: RedditActivity[];
  wordCloudData: any[];
  isFetching: boolean;
  lastFetchTime: string;
  newActivityCount: number;
}

/**
 * Monitoring Component - Class-based OOP implementation
 */
class Monitoring extends Component<{}, MonitoringState> {
  private monitoringIntervalRef: number | null = null;

  constructor(props: {}) {
    super(props);
    this.state = {
      searchQuery: '',
      searchType: '',
      profileData: null,
      isLoading: false,
      isMonitoring: false,
      investigatorEmail: '',
      activities: [],
      wordCloudData: [],
      isFetching: false,
      lastFetchTime: '',
      newActivityCount: 0
    };

    this.handleSearch = this.handleSearch.bind(this);
    this.handleStartMonitoring = this.handleStartMonitoring.bind(this);
    this.handleStopMonitoring = this.handleStopMonitoring.bind(this);
    this.handleClearSearch = this.handleClearSearch.bind(this);
  }

  componentWillUnmount(): void {
    if (this.monitoringIntervalRef) {
      clearInterval(this.monitoringIntervalRef);
    }
  }

  /**
   * Handle search type change
   */
  private handleSearchTypeChange = (value: string): void => {
    if (value === 'reset') {
      this.setState({ searchType: '' });
    } else {
      this.setState({ searchType: value as 'user' | 'community' });
    }
    this.handleClearSearch();
  };

  /**
   * Handle clear search
   */
  private handleClearSearch(): void {
    this.setState({
      searchQuery: '',
      profileData: null,
      isMonitoring: false,
      activities: []
    });
    if (this.monitoringIntervalRef) {
      clearInterval(this.monitoringIntervalRef);
      this.monitoringIntervalRef = null;
    }
  }

  /**
   * Handle stop monitoring
   */
  private handleStopMonitoring(): void {
    const { newActivityCount } = this.state;
    this.setState({ isMonitoring: false, isFetching: false });
    if (this.monitoringIntervalRef) {
      clearInterval(this.monitoringIntervalRef);
      this.monitoringIntervalRef = null;
    }
    toast({
      title: "Monitoring Stopped",
      description: newActivityCount > 0 
        ? `Real-time monitoring paused. Detected ${newActivityCount} new items during this session.`
        : "Real-time monitoring paused.",
    });
  }

  /**
   * Handle search
   */
  private async handleSearch(): Promise<void> {
    const { searchQuery, searchType } = this.state;
    if (!searchQuery.trim() || !searchType) return;

    this.setState({ isLoading: true, isMonitoring: false, activities: [] });
    
    if (this.monitoringIntervalRef) {
      clearInterval(this.monitoringIntervalRef);
      this.monitoringIntervalRef = null;
    }

    try {
      const cleanQuery = searchType === 'user' 
        ? searchQuery.replace(/^u\//, '')
        : searchQuery.replace(/^r\//, '');

      if (searchType === 'user') {
        const redditData = await redditService.fetchUserProfile(cleanQuery);
        const accountAge = redditService.calculateAccountAge(redditData.user.created_utc);
        const subreddits = redditService.extractUniqueSubreddits(
          redditData.posts || [],
          redditData.comments || []
        );

        this.setState({
          profileData: {
            username: `u/${cleanQuery}`,
            accountAge,
            totalKarma: redditData.user.link_karma + redditData.user.comment_karma,
            activeSubreddits: subreddits.size,
          }
        });
      } else {
        const redditData = await redditService.fetchCommunity(cleanQuery);
        const createdDate = new Date(redditData.subreddit.created_utc * 1000).toLocaleDateString('en-US', { 
          month: 'short', day: 'numeric', year: 'numeric' 
        });

        this.setState({
          profileData: {
            communityName: `r/${cleanQuery}`,
            memberCount: (redditData.subreddit.subscribers / 1000000 >= 1) 
              ? `${(redditData.subreddit.subscribers / 1000000).toFixed(1)}M`
              : `${(redditData.subreddit.subscribers / 1000).toFixed(1)}K`,
            description: redditData.subreddit.public_description || 'No description available',
            createdDate,
            weeklyVisitors: redditData.weeklyVisitors || 0,
            weeklyContributors: 0,
          }
        });
      }

      toast({
        title: "Search Complete",
        description: `${searchType === 'user' ? 'User' : 'Community'} found. Click "Start Monitoring" to begin tracking.`,
      });

    } catch (error: any) {
      toast({
        title: "Search Failed",
        description: error.message || 'Failed to search. Please try again.',
        variant: "destructive",
      });
      this.setState({ profileData: null });
    } finally {
      this.setState({ isLoading: false });
    }
  }

  /**
   * Handle start monitoring
   */
  private async handleStartMonitoring(): Promise<void> {
    this.setState({ isMonitoring: true, newActivityCount: 0 });
    
    toast({
      title: "Monitoring Started",
      description: "Real-time tracking active. Checking for new activity every 15 seconds.",
    });

    await this.fetchRedditData(true);

    this.monitoringIntervalRef = window.setInterval(async () => {
      await this.fetchRedditData(false);
    }, 15000);
  }

  /**
   * Fetch Reddit data for monitoring
   */
  private async fetchRedditData(isInitial: boolean): Promise<void> {
    const { profileData, searchType, searchQuery, isFetching, activities, isMonitoring } = this.state;
    if (!profileData || !searchType || !searchQuery) return;
    if (isFetching && !isInitial) return;

    this.setState({ isFetching: true });

    try {
      const cleanQuery = searchType === 'user' 
        ? searchQuery.replace(/^u\//, '')
        : searchQuery.replace(/^r\//, '');

      let redditData;
      if (searchType === 'user') {
        redditData = await redditService.fetchUserProfile(cleanQuery);
      } else {
        redditData = await redditService.fetchCommunity(cleanQuery);
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
            url: `https://reddit.com${post.permalink}`
          });
        });
      }

      if (redditData.comments) {
        redditData.comments.forEach((comment: any) => {
          newActivities.push({
            id: comment.id || Math.random().toString(),
            type: 'comment',
            title: comment.body?.substring(0, 100) + (comment.body?.length > 100 ? '...' : ''),
            subreddit: `r/${comment.subreddit}`,
            timestamp: formatActivityTime(comment.created_utc),
            url: `https://reddit.com${comment.permalink}`
          });
        });
      }

      newActivities.sort((a, b) => b.timestamp.localeCompare(a.timestamp));
      
      if (!isInitial && activities.length > 0) {
        const existingIds = new Set(activities.map(a => a.id));
        const newItems = newActivities.filter(a => !existingIds.has(a.id));
        
        if (newItems.length > 0) {
          this.setState(prev => ({ newActivityCount: prev.newActivityCount + newItems.length }));
          toast({
            title: "New Activity Detected",
            description: `${newItems.length} new ${newItems.length === 1 ? 'item' : 'items'} found!`,
          });
        }
      }

      // Generate word cloud
      const wordCloud = redditService.generateWordCloud(
        redditData.posts || [],
        redditData.comments || []
      );

      this.setState({
        activities: newActivities,
        lastFetchTime: formatCurrentTimePakistan(),
        wordCloudData: wordCloud
      });

    } catch (error) {
      if (isMonitoring) {
        toast({
          title: "Connection Issue",
          description: "Temporary error fetching data. Will retry...",
          variant: "destructive",
        });
      }
    } finally {
      this.setState({ isFetching: false });
    }
  }

  /**
   * Render search panel
   */
  private renderSearchPanel(): JSX.Element {
    const { searchQuery, searchType, isLoading } = this.state;

    return (
      <Card className="border-2">
        <CardContent className="pt-6">
          <div className="flex gap-2">
            <Select
              value={searchType || 'reset'}
              onValueChange={this.handleSearchTypeChange}
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
                    <span className="flex items-center gap-2">
                      <User className="h-4 w-4" /> User
                    </span>
                  </SelectItem>
                  <SelectItem value="community">
                    <span className="flex items-center gap-2">
                      <Users className="h-4 w-4" /> Community
                    </span>
                  </SelectItem>
                </SelectGroup>
              </SelectContent>
            </Select>

            <div className="flex-1 relative">
              <Input
                placeholder={searchType === 'user' ? "Enter Reddit username..." : searchType === 'community' ? "Enter subreddit name..." : "Select a type first..."}
                value={searchQuery}
                onChange={(e) => this.setState({ searchQuery: e.target.value })}
                onKeyPress={(e) => e.key === 'Enter' && this.handleSearch()}
                disabled={!searchType}
                className="pr-10"
              />
              {searchQuery && (
                <button
                  onClick={this.handleClearSearch}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>

            <Button 
              onClick={this.handleSearch} 
              disabled={isLoading || !searchQuery.trim() || !searchType}
              variant="forensic"
            >
              <Search className="h-4 w-4 mr-2" />
              {isLoading ? "Searching..." : "Search"}
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  /**
   * Render profile card
   */
  private renderProfileCard(): JSX.Element | null {
    const { profileData, searchType, isMonitoring, isFetching, lastFetchTime, newActivityCount } = this.state;
    if (!profileData) return null;

    return (
      <Card className="border-primary/20">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              {searchType === 'user' ? <User className="h-5 w-5" /> : <Users className="h-5 w-5" />}
              {profileData.username || profileData.communityName}
            </CardTitle>
            {isMonitoring ? (
              <Button variant="destructive" size="sm" onClick={this.handleStopMonitoring}>
                <StopCircle className="h-4 w-4 mr-2" />
                Stop Monitoring
              </Button>
            ) : (
              <Button variant="forensic" size="sm" onClick={this.handleStartMonitoring}>
                <Activity className="h-4 w-4 mr-2" />
                Start Monitoring
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {searchType === 'user' ? (
              <>
                <div className="text-center p-3 bg-muted rounded-lg">
                  <div className="text-lg font-bold">{profileData.accountAge}</div>
                  <div className="text-xs text-muted-foreground">Account Age</div>
                </div>
                <div className="text-center p-3 bg-muted rounded-lg">
                  <div className="text-lg font-bold">{profileData.totalKarma?.toLocaleString()}</div>
                  <div className="text-xs text-muted-foreground">Total Karma</div>
                </div>
                <div className="text-center p-3 bg-muted rounded-lg">
                  <div className="text-lg font-bold">{profileData.activeSubreddits}</div>
                  <div className="text-xs text-muted-foreground">Active Subreddits</div>
                </div>
              </>
            ) : (
              <>
                <div className="text-center p-3 bg-muted rounded-lg">
                  <div className="text-lg font-bold">{profileData.memberCount}</div>
                  <div className="text-xs text-muted-foreground">Members</div>
                </div>
                <div className="text-center p-3 bg-muted rounded-lg">
                  <div className="text-lg font-bold">{profileData.createdDate}</div>
                  <div className="text-xs text-muted-foreground">Created</div>
                </div>
              </>
            )}
            {isMonitoring && (
              <div className="text-center p-3 bg-primary/10 rounded-lg">
                <div className="text-lg font-bold text-primary">
                  {isFetching ? '...' : newActivityCount}
                </div>
                <div className="text-xs text-muted-foreground">New Items</div>
              </div>
            )}
          </div>
          {lastFetchTime && (
            <div className="text-xs text-muted-foreground mt-3 text-center">
              Last updated: {lastFetchTime}
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  /**
   * Render activity feed
   */
  private renderActivityFeed(): JSX.Element | null {
    const { activities, isMonitoring } = this.state;
    if (!isMonitoring || activities.length === 0) return null;

    return (
      <Card className="border-primary/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Activity Feed
            <Badge variant="secondary">{activities.length} items</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[400px]">
            <div className="space-y-3">
              {activities.map((activity) => (
                <div key={activity.id} className="p-3 border rounded-lg hover:bg-muted/50 transition-colors">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge variant={activity.type === 'post' ? 'default' : 'secondary'}>
                          {activity.type}
                        </Badge>
                        <span className="text-xs text-muted-foreground">{activity.subreddit}</span>
                      </div>
                      <p className="text-sm line-clamp-2">{activity.title}</p>
                      <p className="text-xs text-muted-foreground mt-1">{activity.timestamp}</p>
                    </div>
                    <a href={activity.url} target="_blank" rel="noopener noreferrer" className="text-primary hover:text-primary/80">
                      <ExternalLink className="h-4 w-4" />
                    </a>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    );
  }

  /**
   * Render word cloud
   */
  private renderWordCloud(): JSX.Element | null {
    const { wordCloudData, isMonitoring } = this.state;
    if (!isMonitoring || wordCloudData.length === 0) return null;

    return <WordCloud words={wordCloudData} title="Trending Words" />;
  }

  /**
   * Main render method
   */
  public render(): JSX.Element {
    const { profileData, isMonitoring } = this.state;

    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto p-6 space-y-6">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Reddit Monitoring</h1>
            <p className="text-muted-foreground mt-1">
              Start monitoring any Reddit user or community for activity and trends
            </p>
          </div>

          {this.renderSearchPanel()}
          {this.renderProfileCard()}
          
          {isMonitoring && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {this.renderActivityFeed()}
              {this.renderWordCloud()}
            </div>
          )}
        </div>
      </div>
    );
  }
}

export default Monitoring;
