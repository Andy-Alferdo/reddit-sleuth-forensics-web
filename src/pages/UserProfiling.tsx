import React, { Component } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { User, MapPin, Clock, MessageCircle, ThumbsUp, Calendar, Activity, Info, AlertCircle } from 'lucide-react';
import { WordCloud } from '@/components/WordCloud';
import { AnalyticsChart } from '@/components/AnalyticsChart';
import { toast } from '@/hooks/use-toast';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { redditService, analysisService } from '@/services';

/**
 * UserProfiling State Interface
 */
interface UserProfilingState {
  username: string;
  profileData: any | null;
  isLoading: boolean;
  error: string | null;
}

/**
 * UserProfiling Component - Class-based OOP implementation
 * Handles Reddit user profile analysis
 */
class UserProfiling extends Component<{}, UserProfilingState> {
  constructor(props: {}) {
    super(props);
    this.state = {
      username: '',
      profileData: null,
      isLoading: false,
      error: null
    };

    this.handleAnalyzeUser = this.handleAnalyzeUser.bind(this);
    this.handleUsernameChange = this.handleUsernameChange.bind(this);
  }

  /**
   * Handle username input change
   */
  private handleUsernameChange(e: React.ChangeEvent<HTMLInputElement>): void {
    this.setState({ username: e.target.value });
  }

  /**
   * Analyze Reddit user profile
   */
  private async handleAnalyzeUser(): Promise<void> {
    const { username } = this.state;
    if (!username.trim()) return;

    this.setState({ isLoading: true, error: null, profileData: null });

    try {
      const cleanUsername = username.replace(/^u\//, '');
      
      // Fetch user data using RedditService
      const redditData = await redditService.fetchUserProfile(cleanUsername);
      
      // Analyze content using AnalysisService
      const analysisData = await analysisService.analyzeContent(
        redditData.posts || [],
        redditData.comments || []
      );

      // Calculate metrics
      const accountAge = redditService.calculateAccountAge(redditData.user.created_utc);
      const activityPattern = analysisService.calculateActivityPatterns(
        redditData.posts || [],
        redditData.comments || []
      );
      const wordCloud = redditService.generateWordCloud(
        redditData.posts || [],
        redditData.comments || []
      );

      this.setState({
        profileData: {
          username: cleanUsername,
          accountAge,
          totalKarma: redditData.user.link_karma + redditData.user.comment_karma,
          postKarma: redditData.user.link_karma,
          commentKarma: redditData.user.comment_karma,
          activeSubreddits: analysisData?.topSubreddits || [],
          activityPattern,
          sentimentAnalysis: analysisData?.sentiment?.breakdown || { positive: 33, neutral: 34, negative: 33 },
          postSentiments: analysisData?.postSentiments || [],
          commentSentiments: analysisData?.commentSentiments || [],
          locationIndicators: analysisData?.locations || ['No specific locations detected'],
          behaviorPatterns: analysisData?.patterns?.topicInterests || ['Analyzing...'],
          wordCloud,
        }
      });

      toast({
        title: "Analysis Complete",
        description: `Successfully analyzed profile for u/${cleanUsername}`,
      });

    } catch (err: any) {
      console.error('Error analyzing user:', err);
      this.setState({ error: err.message || 'Failed to analyze user profile' });
      toast({
        title: "Analysis Failed",
        description: err.message || 'Failed to analyze user profile. Please try again.',
        variant: "destructive",
      });
    } finally {
      this.setState({ isLoading: false });
    }
  }

  /**
   * Render search section
   */
  private renderSearchSection(): JSX.Element {
    const { username, isLoading } = this.state;

    return (
      <Card className="border-primary/20">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <User className="h-5 w-5 text-primary" />
            <span>Analyze User Profile</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="username">Reddit Username</Label>
            <div className="flex space-x-2">
              <Input
                id="username"
                placeholder="Enter username (e.g., u/username or username)"
                value={username}
                onChange={this.handleUsernameChange}
                className="flex-1"
              />
              <Button 
                onClick={this.handleAnalyzeUser}
                disabled={isLoading || !username.trim()}
                variant="forensic"
                className="px-6"
              >
                {isLoading ? 'Analyzing...' : 'Analyze User'}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  /**
   * Render profile overview
   */
  private renderProfileOverview(): JSX.Element | null {
    const { profileData } = this.state;
    if (!profileData) return null;

    return (
      <Card className="border-primary/20">
        <CardHeader>
          <CardTitle>Profile Overview - u/{profileData.username}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-4 rounded-lg bg-primary/10">
              <Calendar className="h-6 w-6 text-primary mx-auto mb-2" />
              <div className="font-bold text-primary">{profileData.accountAge}</div>
              <p className="text-sm text-muted-foreground">Account Age</p>
            </div>
            <div className="text-center p-4 rounded-lg bg-forensic-accent/10">
              <ThumbsUp className="h-6 w-6 text-forensic-accent mx-auto mb-2" />
              <div className="font-bold text-forensic-accent">{profileData.totalKarma.toLocaleString()}</div>
              <p className="text-sm text-muted-foreground">Total Karma</p>
            </div>
            <div className="text-center p-4 rounded-lg bg-card border">
              <div className="font-bold text-foreground">{profileData.postKarma.toLocaleString()}</div>
              <p className="text-sm text-muted-foreground">Post Karma</p>
            </div>
            <div className="text-center p-4 rounded-lg bg-card border">
              <div className="font-bold text-foreground">{profileData.commentKarma.toLocaleString()}</div>
              <p className="text-sm text-muted-foreground">Comment Karma</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  /**
   * Render activity patterns
   */
  private renderActivityPatterns(): JSX.Element | null {
    const { profileData } = this.state;
    if (!profileData) return null;

    return (
      <Card className="border-primary/20">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Activity className="h-5 w-5 text-primary" />
            <span>Activity Patterns</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex justify-between items-center p-3 rounded-lg bg-card border">
              <span className="text-muted-foreground">Most Active Hour</span>
              <span className="font-medium">{profileData.activityPattern.mostActiveHour}</span>
            </div>
            <div className="flex justify-between items-center p-3 rounded-lg bg-card border">
              <span className="text-muted-foreground">Most Active Day</span>
              <span className="font-medium">{profileData.activityPattern.mostActiveDay}</span>
            </div>
            <div className="flex justify-between items-center p-3 rounded-lg bg-card border">
              <span className="text-muted-foreground">Estimated Timezone</span>
              <span className="font-medium">{profileData.activityPattern.timezone}</span>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  /**
   * Render location indicators
   */
  private renderLocationIndicators(): JSX.Element | null {
    const { profileData } = this.state;
    if (!profileData) return null;

    return (
      <Card className="border-primary/20">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <MapPin className="h-5 w-5 text-primary" />
            <span>Location Indicators</span>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                </TooltipTrigger>
                <TooltipContent>
                  <p className="max-w-xs">Location indicators are extracted through AI analysis.</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {profileData.locationIndicators.map((indicator: string, index: number) => (
              <div key={index} className="p-3 rounded-lg bg-card border">
                <p className="text-sm">{indicator}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  /**
   * Render active subreddits
   */
  private renderActiveSubreddits(): JSX.Element | null {
    const { profileData } = this.state;
    if (!profileData || !profileData.activeSubreddits?.length) return null;

    return (
      <Card className="border-primary/20">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <MessageCircle className="h-5 w-5 text-primary" />
            <span>Active Subreddits</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {profileData.activeSubreddits.map((subreddit: any, index: number) => (
              <div key={index} className="flex justify-between items-center p-3 rounded-lg bg-card border">
                <span className="font-medium">{subreddit.name}</span>
                <span className="text-primary font-semibold">{subreddit.activity} posts</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  /**
   * Render behavior patterns
   */
  private renderBehaviorPatterns(): JSX.Element | null {
    const { profileData } = this.state;
    if (!profileData) return null;

    return (
      <Card className="border-primary/20">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Clock className="h-5 w-5 text-primary" />
            <span>Behavior Patterns</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {profileData.behaviorPatterns.map((pattern: string, index: number) => (
              <div key={index} className="p-3 rounded-lg bg-card border">
                <p className="text-sm">{pattern}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  /**
   * Render visualizations
   */
  private renderVisualizations(): JSX.Element | null {
    const { profileData } = this.state;
    if (!profileData) return null;

    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {profileData.wordCloud && profileData.wordCloud.length > 0 && (
          <WordCloud words={profileData.wordCloud} title="Most Used Words" />
        )}
        {profileData.activeSubreddits && profileData.activeSubreddits.length > 0 && (
          <AnalyticsChart 
            data={profileData.activeSubreddits.map((s: any) => ({ name: s.name, value: s.count }))} 
            title="Subreddit Activity Distribution" 
            type="bar" 
            height={250}
          />
        )}
      </div>
    );
  }

  /**
   * Main render method
   */
  public render(): JSX.Element {
    const { profileData } = this.state;

    return (
      <div className="p-6 space-y-6">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-primary mb-2">User Profiling</h2>
          <p className="text-muted-foreground">Deep analysis of Reddit user profiles and behavior patterns</p>
        </div>

        {this.renderSearchSection()}

        {profileData && (
          <div className="space-y-6">
            {this.renderProfileOverview()}
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {this.renderActivityPatterns()}
              {this.renderLocationIndicators()}
              {this.renderActiveSubreddits()}
              {this.renderBehaviorPatterns()}
            </div>

            {this.renderVisualizations()}
          </div>
        )}
      </div>
    );
  }
}

export default UserProfiling;
