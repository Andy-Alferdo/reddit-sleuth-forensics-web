import React, { Component } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { BarChart3, MapPin, Calendar, Users, Network, TrendingUp, Search, Shield, MessageSquare } from 'lucide-react';
import { WordCloud } from '@/components/WordCloud';
import { AnalyticsChart } from '@/components/AnalyticsChart';

/**
 * Analysis State Interface
 */
interface AnalysisState {
  keyword: string;
  username: string;
  community: string;
  subreddit: string;
  analysisData: any | null;
  isLoading: boolean;
  hasSearched: boolean;
  activeTab: string;
}

/**
 * Analysis Component - Class-based OOP implementation
 */
class Analysis extends Component<{}, AnalysisState> {
  // Sample data as class properties
  private readonly wordCloudData = [
    { word: "cybersecurity", frequency: 95, category: "high" as const },
    { word: "malware", frequency: 78, category: "high" as const },
    { word: "phishing", frequency: 67, category: "medium" as const },
    { word: "encryption", frequency: 89, category: "high" as const },
    { word: "vulnerability", frequency: 56, category: "medium" as const },
    { word: "firewall", frequency: 45, category: "medium" as const },
    { word: "authentication", frequency: 34, category: "low" as const },
    { word: "breach", frequency: 87, category: "high" as const },
    { word: "privacy", frequency: 76, category: "high" as const },
    { word: "hack", frequency: 54, category: "medium" as const },
    { word: "trojan", frequency: 32, category: "low" as const },
    { word: "ransomware", frequency: 71, category: "high" as const },
  ];

  private readonly trendChartData = [
    { name: 'Jan', value: 400 },
    { name: 'Feb', value: 300 },
    { name: 'Mar', value: 600 },
    { name: 'Apr', value: 800 },
    { name: 'May', value: 500 },
    { name: 'Jun', value: 900 },
  ];

  private readonly communityChartData = [
    { name: 'r/cybersecurity', value: 2100 },
    { name: 'r/privacy', value: 1800 },
    { name: 'r/netsec', value: 850 },
    { name: 'r/hacking', value: 650 },
  ];

  private readonly sentimentChartData = [
    { name: 'Positive', value: 45 },
    { name: 'Neutral', value: 35 },
    { name: 'Negative', value: 20 },
  ];

  constructor(props: {}) {
    super(props);
    this.state = {
      keyword: '',
      username: '',
      community: '',
      subreddit: '',
      analysisData: null,
      isLoading: false,
      hasSearched: false,
      activeTab: 'keyword'
    };

    this.handleKeywordAnalysis = this.handleKeywordAnalysis.bind(this);
    this.handleCommunityAnalysis = this.handleCommunityAnalysis.bind(this);
    this.handleLinkAnalysis = this.handleLinkAnalysis.bind(this);
    this.handleTabChange = this.handleTabChange.bind(this);
  }

  /**
   * Handle tab change
   */
  private handleTabChange(value: string): void {
    this.setState({ activeTab: value, analysisData: null, hasSearched: false });
  }

  /**
   * Handle keyword analysis
   */
  private async handleKeywordAnalysis(): Promise<void> {
    const { keyword } = this.state;
    if (!keyword.trim()) return;

    this.setState({ isLoading: true });
    await new Promise(resolve => setTimeout(resolve, 2000));

    this.setState({
      analysisData: {
        type: 'keyword',
        keyword,
        totalMentions: 847,
        sentiment: 'Neutral',
        geographicData: [
          { location: 'United States', mentions: 312 },
          { location: 'United Kingdom', mentions: 156 },
          { location: 'Canada', mentions: 89 },
          { location: 'Australia', mentions: 67 },
        ],
        timeline: [
          { date: '2023-10-01', mentions: 45 },
          { date: '2023-10-08', mentions: 67 },
          { date: '2023-10-15', mentions: 123 },
        ],
        topSubreddits: [
          { name: 'r/technology', mentions: 234 },
          { name: 'r/science', mentions: 178 },
          { name: 'r/news', mentions: 145 },
        ]
      },
      isLoading: false
    });
  }

  /**
   * Handle community analysis
   */
  private async handleCommunityAnalysis(): Promise<void> {
    const { subreddit } = this.state;
    if (!subreddit.trim()) return;

    this.setState({ isLoading: true });
    await new Promise(resolve => setTimeout(resolve, 1500));

    this.setState({
      isLoading: false,
      hasSearched: true
    });
  }

  /**
   * Handle link analysis
   */
  private async handleLinkAnalysis(): Promise<void> {
    const { username } = this.state;
    if (!username.trim()) return;

    this.setState({ isLoading: true });
    await new Promise(resolve => setTimeout(resolve, 2500));

    this.setState({
      analysisData: {
        type: 'link',
        primaryUser: username,
        userToCommunities: [
          { community: 'r/cybersecurity', activity: 85, posts: 234 },
          { community: 'r/privacy', activity: 72, posts: 156 },
          { community: 'r/netsec', activity: 68, posts: 98 },
        ],
        communityCrossover: [
          { from: 'r/cybersecurity', to: 'r/privacy', strength: 75 },
          { from: 'r/privacy', to: 'r/netsec', strength: 62 },
          { from: 'r/cybersecurity', to: 'r/netsec', strength: 58 },
        ],
        networkMetrics: {
          totalCommunities: 8,
          avgActivityScore: 78,
          crossCommunityLinks: 12
        }
      },
      isLoading: false
    });
  }

  /**
   * Render keyword analysis tab
   */
  private renderKeywordTab(): JSX.Element {
    const { keyword, analysisData, isLoading } = this.state;

    return (
      <div className="space-y-6">
        <Card className="border-primary/20 shadow-glow">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <BarChart3 className="h-5 w-5 text-primary" />
              <span>Analyze Keyword</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="keyword">Keyword to Analyze</Label>
              <div className="flex space-x-2">
                <Input
                  id="keyword"
                  placeholder="Enter keyword for analysis..."
                  value={keyword}
                  onChange={(e) => this.setState({ keyword: e.target.value })}
                  className="flex-1"
                />
                <Button 
                  onClick={this.handleKeywordAnalysis}
                  disabled={isLoading || !keyword.trim()}
                  className="px-6 bg-primary hover:bg-primary/90 text-primary-foreground"
                >
                  {isLoading ? 'Analyzing...' : 'Analyze'}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {analysisData?.type === 'keyword' && this.renderKeywordResults()}

        {!analysisData && !isLoading && (
          <Card className="border-dashed border-muted-foreground/30">
            <CardContent className="py-12 text-center">
              <BarChart3 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">Enter a keyword to perform detailed analysis</p>
            </CardContent>
          </Card>
        )}
      </div>
    );
  }

  /**
   * Render keyword analysis results
   */
  private renderKeywordResults(): JSX.Element {
    const { analysisData } = this.state;

    return (
      <>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="border-primary/20 shadow-glow">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <BarChart3 className="h-5 w-5 text-primary" />
                <span>Overview</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center p-4 rounded-lg bg-primary/10 border border-primary/30">
                  <div className="text-2xl font-bold text-primary">{analysisData.totalMentions}</div>
                  <p className="text-sm text-muted-foreground">Total Mentions</p>
                </div>
                <div className="text-center p-4 rounded-lg bg-accent/10 border border-accent/30">
                  <div className="text-2xl font-bold text-accent">{analysisData.sentiment}</div>
                  <p className="text-sm text-muted-foreground">Sentiment</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-primary/20 shadow-glow">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <MapPin className="h-5 w-5 text-primary" />
                <span>Geographic Distribution</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {analysisData.geographicData.map((location: any, index: number) => (
                  <div key={index} className="flex justify-between items-center p-3 rounded-lg bg-card border">
                    <span className="font-medium">{location.location}</span>
                    <span className="text-primary font-semibold">{location.mentions}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card className="border-primary/20 shadow-glow">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Calendar className="h-5 w-5 text-primary" />
                <span>Timeline Analysis</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {analysisData.timeline.map((point: any, index: number) => (
                  <div key={index} className="flex justify-between items-center p-3 rounded-lg bg-card border">
                    <span className="font-medium">{point.date}</span>
                    <span className="text-primary font-semibold">{point.mentions} mentions</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card className="border-primary/20 shadow-glow">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Users className="h-5 w-5 text-primary" />
                <span>Top Subreddits</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {analysisData.topSubreddits.map((subreddit: any, index: number) => (
                  <div key={index} className="flex justify-between items-center p-3 rounded-lg bg-card border">
                    <span className="font-medium">{subreddit.name}</span>
                    <span className="text-primary font-semibold">{subreddit.mentions} mentions</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <WordCloud words={this.wordCloudData} title="Top Keywords Analysis" />
          <AnalyticsChart data={this.trendChartData} title="Activity Trends Over Time" type="line" height={250} />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <AnalyticsChart data={this.communityChartData} title="Top Communities by Activity" type="bar" height={250} />
          <AnalyticsChart data={this.sentimentChartData} title="Sentiment Analysis" type="pie" height={250} />
        </div>
      </>
    );
  }

  /**
   * Render community analysis tab
   */
  private renderCommunityTab(): JSX.Element {
    const { subreddit, isLoading, hasSearched } = this.state;

    return (
      <div className="space-y-6">
        <Card className="border-primary/20 border-forensic-accent/30 shadow-[0_0_20px_rgba(0,255,198,0.15)]">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5 text-forensic-accent" />
              Community Search
            </CardTitle>
            <CardDescription>
              Enter a subreddit name to analyze (e.g., "technology", "AskReddit")
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">r/</span>
                <Input
                  placeholder="subreddit name"
                  value={subreddit}
                  onChange={(e) => this.setState({ subreddit: e.target.value })}
                  onKeyPress={(e) => e.key === 'Enter' && this.handleCommunityAnalysis()}
                  className="pl-8"
                />
              </div>
              <Button 
                onClick={this.handleCommunityAnalysis}
                disabled={isLoading || !subreddit.trim()}
                variant="forensic"
                className="px-6"
              >
                <Search className="h-4 w-4 mr-2" />
                {isLoading ? "Analyzing..." : "Analyze"}
              </Button>
            </div>
          </CardContent>
        </Card>

        {hasSearched && this.renderCommunityResults()}

        {!hasSearched && !isLoading && (
          <Card className="border-dashed border-muted-foreground/30">
            <CardContent className="py-12 text-center">
              <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">Enter a subreddit to analyze community activity</p>
            </CardContent>
          </Card>
        )}
      </div>
    );
  }

  /**
   * Render community results
   */
  private renderCommunityResults(): JSX.Element {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="border-primary/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-forensic-accent" />
              Community Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h3 className="font-semibold text-lg">r/technology</h3>
              <Badge variant="secondary" className="mt-1">14.2M members</Badge>
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Calendar className="h-4 w-4" />
              Created: January 25, 2008
            </div>
            <Separator />
            <div>
              <h4 className="font-medium mb-2">Description</h4>
              <p className="text-sm text-muted-foreground">
                Subreddit dedicated to the news and discussions about technology.
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-primary/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5 text-forensic-accent" />
              Recent Posts
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {['AI breakthrough announced', 'New privacy concerns', 'Tech layoffs update'].map((title, i) => (
                <div key={i} className="p-3 bg-muted rounded-lg">
                  <p className="font-medium text-sm">{title}</p>
                  <p className="text-xs text-muted-foreground mt-1">{Math.floor(Math.random() * 1000)} upvotes</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  /**
   * Render link analysis tab
   */
  private renderLinkTab(): JSX.Element {
    const { username, analysisData, isLoading } = this.state;

    return (
      <div className="space-y-6">
        <Card className="border-primary/20 shadow-glow">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Network className="h-5 w-5 text-primary" />
              <span>Analyze User Links</span>
            </CardTitle>
            <CardDescription>
              Identify connections between subreddits and shared users
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="username">Reddit Username</Label>
              <div className="flex space-x-2">
                <Input
                  id="username"
                  placeholder="Enter username to analyze connections..."
                  value={username}
                  onChange={(e) => this.setState({ username: e.target.value })}
                  className="flex-1"
                />
                <Button 
                  onClick={this.handleLinkAnalysis}
                  disabled={isLoading || !username.trim()}
                  variant="forensic"
                  className="px-6"
                >
                  {isLoading ? 'Analyzing...' : 'Analyze Links'}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {analysisData?.type === 'link' && this.renderLinkResults()}

        {!analysisData && !isLoading && (
          <Card className="border-dashed border-muted-foreground/30">
            <CardContent className="py-12 text-center">
              <Network className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">Enter a username to analyze cross-community connections</p>
            </CardContent>
          </Card>
        )}
      </div>
    );
  }

  /**
   * Render link analysis results
   */
  private renderLinkResults(): JSX.Element {
    const { analysisData } = this.state;

    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="border-primary/20">
          <CardHeader>
            <CardTitle>User to Communities</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {analysisData.userToCommunities.map((item: any, index: number) => (
                <div key={index} className="flex justify-between items-center p-3 rounded-lg bg-card border">
                  <span className="font-medium">{item.community}</span>
                  <Badge>{item.activity}% activity</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="border-primary/20">
          <CardHeader>
            <CardTitle>Community Crossover</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {analysisData.communityCrossover.map((item: any, index: number) => (
                <div key={index} className="flex justify-between items-center p-3 rounded-lg bg-card border">
                  <span className="text-sm">{item.from} → {item.to}</span>
                  <Badge variant="secondary">{item.strength}% strength</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="border-primary/20 lg:col-span-2">
          <CardHeader>
            <CardTitle>Network Metrics</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center p-4 rounded-lg bg-primary/10">
                <div className="text-2xl font-bold text-primary">{analysisData.networkMetrics.totalCommunities}</div>
                <p className="text-sm text-muted-foreground">Total Communities</p>
              </div>
              <div className="text-center p-4 rounded-lg bg-accent/10">
                <div className="text-2xl font-bold text-accent">{analysisData.networkMetrics.avgActivityScore}</div>
                <p className="text-sm text-muted-foreground">Avg Activity Score</p>
              </div>
              <div className="text-center p-4 rounded-lg bg-muted">
                <div className="text-2xl font-bold">{analysisData.networkMetrics.crossCommunityLinks}</div>
                <p className="text-sm text-muted-foreground">Cross-Community Links</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  /**
   * Main render method
   */
  public render(): JSX.Element {
    return (
      <div className="p-6 space-y-6">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-primary mb-2">Analysis Tools</h2>
          <p className="text-muted-foreground">Comprehensive analysis across different dimensions</p>
        </div>

        <Tabs defaultValue="keyword" className="w-full" onValueChange={this.handleTabChange}>
          <TabsList className="grid w-full grid-cols-3 mb-6">
            <TabsTrigger value="keyword" className="data-[state=active]:bg-forensic-accent/20 data-[state=active]:text-forensic-accent">
              <TrendingUp className="h-4 w-4 mr-2" />
              Keyword Analysis
            </TabsTrigger>
            <TabsTrigger value="community" className="data-[state=active]:bg-forensic-accent/20 data-[state=active]:text-forensic-accent">
              <Users className="h-4 w-4 mr-2" />
              Community Analysis
            </TabsTrigger>
            <TabsTrigger value="link" className="data-[state=active]:bg-forensic-accent/20 data-[state=active]:text-forensic-accent">
              <Network className="h-4 w-4 mr-2" />
              Link Analysis
            </TabsTrigger>
          </TabsList>

          <TabsContent value="keyword">{this.renderKeywordTab()}</TabsContent>
          <TabsContent value="community">{this.renderCommunityTab()}</TabsContent>
          <TabsContent value="link">{this.renderLinkTab()}</TabsContent>
        </Tabs>
      </div>
    );
  }
}

export default Analysis;
