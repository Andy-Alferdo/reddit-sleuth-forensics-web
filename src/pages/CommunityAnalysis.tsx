import React, { Component } from 'react';
import { Search, Users, Calendar, Shield, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { WordCloud } from '@/components/WordCloud';
import { AnalyticsChart } from '@/components/AnalyticsChart';
import { toast } from '@/hooks/use-toast';
import { redditService } from '@/services';

/**
 * CommunityAnalysis State Interface
 */
interface CommunityAnalysisState {
  subreddit: string;
  isSearching: boolean;
  hasSearched: boolean;
  communityData: any | null;
  error: string | null;
}

/**
 * CommunityAnalysis Component - Class-based OOP implementation
 * Handles Reddit community/subreddit analysis
 */
class CommunityAnalysis extends Component<{}, CommunityAnalysisState> {
  constructor(props: {}) {
    super(props);
    this.state = {
      subreddit: '',
      isSearching: false,
      hasSearched: false,
      communityData: null,
      error: null
    };

    this.handleSearch = this.handleSearch.bind(this);
    this.handleKeyPress = this.handleKeyPress.bind(this);
    this.handleInputChange = this.handleInputChange.bind(this);
  }

  /**
   * Handle subreddit input change
   */
  private handleInputChange(e: React.ChangeEvent<HTMLInputElement>): void {
    this.setState({ subreddit: e.target.value });
  }

  /**
   * Handle Enter key press
   */
  private handleKeyPress(e: React.KeyboardEvent): void {
    if (e.key === "Enter") {
      this.handleSearch();
    }
  }

  /**
   * Search and analyze community
   */
  private async handleSearch(): Promise<void> {
    const { subreddit } = this.state;
    if (!subreddit.trim()) return;

    this.setState({ isSearching: true, error: null });

    try {
      const cleanSubreddit = subreddit.replace(/^r\//, '');
      
      // Fetch community data using RedditService
      const data = await redditService.fetchCommunity(cleanSubreddit);

      // Generate word cloud from posts
      const wordCloud = redditService.generateWordCloud(data.posts || [], []);

      // Calculate activity metrics
      const activityData = this.calculateActivityData(data.posts || []);
      const postFrequencyData = this.calculatePostFrequency(data.posts || []);
      const memberGrowthData = this.generateMemberGrowthData();

      this.setState({
        communityData: {
          name: `r/${cleanSubreddit}`,
          created: data.subreddit?.created_utc 
            ? new Date(data.subreddit.created_utc * 1000).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
            : 'Unknown',
          members: data.subreddit?.subscribers 
            ? this.formatNumber(data.subreddit.subscribers)
            : 'Unknown',
          description: data.subreddit?.public_description || data.subreddit?.description || 'No description available',
          moderators: data.subreddit?.moderators || [],
          recentPosts: (data.posts || []).slice(0, 5).map((post: any) => ({
            title: post.title,
            author: post.author,
            timestamp: this.getRelativeTime(post.created_utc),
            upvotes: post.score
          })),
          wordCloud,
          activityData,
          postFrequencyData,
          memberGrowthData,
          weeklyVisitors: data.weeklyVisitors || 0,
          activeUsers: data.activeUsers || 0
        },
        hasSearched: true
      });

      toast({
        title: "Analysis Complete",
        description: `Successfully analyzed r/${cleanSubreddit}`,
      });

    } catch (err: any) {
      console.error('Error analyzing community:', err);
      this.setState({ error: err.message || 'Failed to analyze community' });
      toast({
        title: "Analysis Failed",
        description: err.message || 'Failed to analyze community. Please try again.',
        variant: "destructive",
      });
    } finally {
      this.setState({ isSearching: false });
    }
  }

  /**
   * Format large numbers
   */
  private formatNumber(num: number): string {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return num.toString();
  }

  /**
   * Get relative time string
   */
  private getRelativeTime(utc: number): string {
    const now = Date.now() / 1000;
    const diff = now - utc;
    
    if (diff < 3600) return `${Math.floor(diff / 60)} minutes ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)} hours ago`;
    return `${Math.floor(diff / 86400)} days ago`;
  }

  /**
   * Calculate activity data from posts
   */
  private calculateActivityData(posts: any[]): Array<{ name: string; value: number }> {
    const totalPosts = posts.length;
    const totalComments = posts.reduce((sum, p) => sum + (p.num_comments || 0), 0);
    const totalUpvotes = posts.reduce((sum, p) => sum + (p.score || 0), 0);
    
    return [
      { name: 'Posts', value: totalPosts },
      { name: 'Comments', value: totalComments },
      { name: 'Upvotes', value: totalUpvotes }
    ];
  }

  /**
   * Calculate post frequency by day
   */
  private calculatePostFrequency(posts: any[]): Array<{ name: string; value: number }> {
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const frequency: { [key: string]: number } = {};
    days.forEach(d => frequency[d] = 0);

    posts.forEach(post => {
      const date = new Date(post.created_utc * 1000);
      const day = days[date.getDay()];
      frequency[day]++;
    });

    return days.map(day => ({ name: day, value: frequency[day] }));
  }

  /**
   * Generate mock member growth data
   */
  private generateMemberGrowthData(): Array<{ name: string; value: number }> {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'];
    return months.map((name, i) => ({
      name,
      value: 10000 + i * 1000 + Math.floor(Math.random() * 500)
    }));
  }

  /**
   * Render search section
   */
  private renderSearchSection(): JSX.Element {
    const { subreddit, isSearching } = this.state;

    return (
      <Card className="border-primary/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" />
            Community Search
          </CardTitle>
          <CardDescription>
            Enter a subreddit name to analyze (e.g., "technology", "AskReddit")
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                r/
              </span>
              <Input
                placeholder="subreddit name"
                value={subreddit}
                onChange={this.handleInputChange}
                onKeyPress={this.handleKeyPress}
                className="pl-8"
              />
            </div>
            <Button 
              onClick={this.handleSearch} 
              disabled={isSearching || !subreddit.trim()}
              className="px-6"
            >
              <Search className="h-4 w-4 mr-2" />
              {isSearching ? "Analyzing..." : "Analyze"}
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  /**
   * Render community information
   */
  private renderCommunityInfo(): JSX.Element | null {
    const { communityData } = this.state;
    if (!communityData) return null;

    return (
      <Card className="border-primary/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            Community Information
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h3 className="font-semibold text-lg">{communityData.name}</h3>
            <Badge variant="secondary" className="mt-1">
              {communityData.members} members
            </Badge>
          </div>
          
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Calendar className="h-4 w-4" />
            Created: {communityData.created}
          </div>

          <Separator />

          <div>
            <h4 className="font-medium mb-2">Description</h4>
            <p className="text-sm text-muted-foreground">
              {communityData.description}
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  /**
   * Render recent posts
   */
  private renderRecentPosts(): JSX.Element | null {
    const { communityData } = this.state;
    if (!communityData || !communityData.recentPosts?.length) return null;

    return (
      <Card className="border-primary/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-primary" />
            Recent Posts
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {communityData.recentPosts.map((post: any, index: number) => (
            <div key={index} className="border border-border/50 rounded-lg p-3 space-y-2">
              <h4 className="font-medium text-sm leading-tight">
                {post.title}
              </h4>
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>by u/{post.author}</span>
                <span>{post.timestamp}</span>
              </div>
              <div className="flex items-center gap-1">
                <Badge variant="secondary" className="text-xs">
                  ▲ {post.upvotes}
                </Badge>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    );
  }

  /**
   * Render analytics visualizations
   */
  private renderAnalytics(): JSX.Element | null {
    const { communityData } = this.state;
    if (!communityData) return null;

    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {communityData.wordCloud && communityData.wordCloud.length > 0 && (
            <WordCloud words={communityData.wordCloud} title="Popular Topics" />
          )}
          <AnalyticsChart 
            data={communityData.memberGrowthData} 
            title="Member Growth Over Time" 
            type="line" 
            height={250}
          />
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <AnalyticsChart 
            data={communityData.activityData} 
            title="Community Activity Breakdown" 
            type="bar" 
            height={250}
          />
          <AnalyticsChart 
            data={communityData.postFrequencyData} 
            title="Post Frequency by Day" 
            type="line" 
            height={250}
          />
        </div>
      </div>
    );
  }

  /**
   * Render empty state
   */
  private renderEmptyState(): JSX.Element {
    return (
      <Card className="border-primary/20">
        <CardContent className="py-12 text-center">
          <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground">
            Enter a subreddit name above to begin community analysis
          </p>
        </CardContent>
      </Card>
    );
  }

  /**
   * Main render method
   */
  public render(): JSX.Element {
    const { hasSearched, communityData } = this.state;

    return (
      <div className="min-h-screen bg-background p-6">
        <div className="mx-auto max-w-6xl space-y-6">
          <div className="text-center space-y-2">
            <h1 className="text-3xl font-bold text-primary">Community Analysis</h1>
            <p className="text-muted-foreground">
              Analyze Reddit communities for forensic investigation
            </p>
          </div>

          {this.renderSearchSection()}

          {hasSearched && communityData && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {this.renderCommunityInfo()}
                {this.renderRecentPosts()}
              </div>
              {this.renderAnalytics()}
            </div>
          )}

          {!hasSearched && this.renderEmptyState()}
        </div>
      </div>
    );
  }
}

export default CommunityAnalysis;