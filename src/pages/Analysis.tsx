import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { BarChart3, MapPin, Calendar, Users, Network, Share2, AlertTriangle, TrendingUp, Search, Shield, MessageSquare } from 'lucide-react';
import { WordCloud } from '@/components/WordCloud';
import { AnalyticsChart } from '@/components/AnalyticsChart';

const Analysis = () => {
  const [keyword, setKeyword] = useState('');
  const [username, setUsername] = useState('');
  const [community, setCommunity] = useState('');
  const [subreddit, setSubreddit] = useState('');
  const [analysisData, setAnalysisData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  // Sample data for word cloud
  const wordCloudData = [
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

  // Sample data for charts
  const trendChartData = [
    { name: 'Jan', value: 400 },
    { name: 'Feb', value: 300 },
    { name: 'Mar', value: 600 },
    { name: 'Apr', value: 800 },
    { name: 'May', value: 500 },
    { name: 'Jun', value: 900 },
  ];

  const communityChartData = [
    { name: 'r/cybersecurity', value: 2100 },
    { name: 'r/privacy', value: 1800 },
    { name: 'r/netsec', value: 850 },
    { name: 'r/hacking', value: 650 },
  ];

  const sentimentChartData = [
    { name: 'Positive', value: 45 },
    { name: 'Neutral', value: 35 },
    { name: 'Negative', value: 20 },
  ];

  const handleKeywordAnalysis = async () => {
    if (!keyword.trim()) return;
    
    setIsLoading(true);
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    setAnalysisData({
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
    });
    
    setIsLoading(false);
  };

  const handleCommunityAnalysis = async () => {
    if (!community.trim()) return;
    
    setIsLoading(true);
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    setAnalysisData({
      type: 'community',
      community,
      memberCount: 2100000,
      activeUsers: 15000,
      topUsers: [
        { username: 'user1', posts: 234, karma: 45000 },
        { username: 'user2', posts: 189, karma: 38000 },
        { username: 'user3', posts: 156, karma: 31000 },
      ],
      topTopics: [
        { topic: 'Security Vulnerabilities', mentions: 456 },
        { topic: 'Best Practices', mentions: 389 },
        { topic: 'New Threats', mentions: 312 },
      ]
    });
    
    setIsLoading(false);
  };

  const handleLinkAnalysis = async () => {
    if (!username.trim()) return;
    
    setIsLoading(true);
    await new Promise(resolve => setTimeout(resolve, 2500));
    
    setAnalysisData({
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
    });
    
    setIsLoading(false);
  };

  return (
    <div className="p-6 space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-primary mb-2">Analysis Tools</h2>
        <p className="text-muted-foreground">Comprehensive analysis across different dimensions</p>
      </div>

      <Tabs defaultValue="keyword" className="w-full" onValueChange={() => { setAnalysisData(null); setHasSearched(false); }}>
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

        <TabsContent value="keyword" className="space-y-6">
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
                    onChange={(e) => setKeyword(e.target.value)}
                    className="flex-1"
                  />
                  <Button 
                    onClick={handleKeywordAnalysis}
                    disabled={isLoading || !keyword.trim()}
                    className="px-6 bg-primary hover:bg-primary/90 text-primary-foreground"
                  >
                    {isLoading ? 'Analyzing...' : 'Analyze'}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {analysisData?.type === 'keyword' && (
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
                    <div className="space-y-4">
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
                        <div key={index} className="flex justify-between items-center p-3 rounded-lg bg-card border border-border">
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
                        <div key={index} className="flex justify-between items-center p-3 rounded-lg bg-card border border-border">
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
                        <div key={index} className="flex justify-between items-center p-3 rounded-lg bg-card border border-border">
                          <span className="font-medium">{subreddit.name}</span>
                          <span className="text-primary font-semibold">{subreddit.mentions} mentions</span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>

              <div className="space-y-6">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <WordCloud words={wordCloudData} title="Top Keywords Analysis" />
                  <AnalyticsChart 
                    data={trendChartData} 
                    title="Activity Trends Over Time" 
                    type="line" 
                    height={250}
                  />
                </div>
                
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <AnalyticsChart 
                    data={communityChartData} 
                    title="Top Communities by Activity" 
                    type="bar" 
                    height={250}
                  />
                  <AnalyticsChart 
                    data={sentimentChartData} 
                    title="Sentiment Analysis" 
                    type="pie" 
                    height={250}
                  />
                </div>
              </div>
            </>
          )}

          {!analysisData && !isLoading && (
            <Card className="border-dashed border-muted-foreground/30">
              <CardContent className="py-12 text-center">
                <BarChart3 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">Enter a keyword to perform detailed analysis</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="community" className="space-y-6">
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
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                    r/
                  </span>
                  <Input
                    placeholder="subreddit name"
                    value={subreddit}
                    onChange={(e) => setSubreddit(e.target.value)}
                    onKeyPress={(e) => {
                      if (e.key === "Enter" && subreddit.trim()) {
                        setIsLoading(true);
                        setTimeout(() => {
                          setIsLoading(false);
                          setHasSearched(true);
                        }, 1500);
                      }
                    }}
                    className="pl-8"
                  />
                </div>
                <Button 
                  onClick={() => {
                    if (subreddit.trim()) {
                      setIsLoading(true);
                      setTimeout(() => {
                        setIsLoading(false);
                        setHasSearched(true);
                      }, 1500);
                    }
                  }} 
                  disabled={isLoading || !subreddit.trim()}
                  className="px-6"
                  variant="forensic"
                >
                  <Search className="h-4 w-4 mr-2" />
                  {isLoading ? "Analyzing..." : "Analyze"}
                </Button>
              </div>
            </CardContent>
          </Card>

          {hasSearched && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Community Information */}
                <Card className="border-primary/20 border-forensic-accent/30 shadow-[0_0_20px_rgba(0,255,198,0.15)]">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Shield className="h-5 w-5 text-forensic-accent" />
                      Community Information
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <h3 className="font-semibold text-lg">r/technology</h3>
                      <Badge variant="secondary" className="mt-1">
                        14.2M members
                      </Badge>
                    </div>
                    
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Calendar className="h-4 w-4" />
                      Created: January 25, 2008
                    </div>

                    <Separator />

                    <div>
                      <h4 className="font-medium mb-2">Description</h4>
                      <p className="text-sm text-muted-foreground">
                        Subreddit dedicated to the news and discussions about the creation and use of technology and its surrounding issues.
                      </p>
                    </div>

                    <Separator />

                    <div>
                      <h4 className="font-medium mb-2">Moderators</h4>
                      <div className="flex flex-wrap gap-1">
                        {["AutoModerator", "qgyh2", "kn0thing", "spez", "maxwellhill"].map((mod) => (
                          <Badge key={mod} variant="outline" className="text-xs">
                            u/{mod}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Recent Posts */}
                <Card className="border-primary/20 border-forensic-accent/30 shadow-[0_0_20px_rgba(0,255,198,0.15)]">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <MessageSquare className="h-5 w-5 text-forensic-accent" />
                      Recent Posts
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {[
                      {
                        title: "Major security vulnerability discovered in popular software",
                        author: "user_analyst",
                        timestamp: "2 hours ago",
                        upvotes: 1247
                      },
                      {
                        title: "New AI breakthrough announced by research team",
                        author: "tech_insider",
                        timestamp: "4 hours ago", 
                        upvotes: 892
                      },
                      {
                        title: "Tech company announces major layoffs",
                        author: "news_reporter",
                        timestamp: "6 hours ago",
                        upvotes: 734
                      }
                    ].map((post, index) => (
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
              </div>

              {/* Community Analytics */}
              <div className="space-y-6">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <WordCloud words={[
                    { word: "technology", frequency: 95, category: "high" as const },
                    { word: "innovation", frequency: 78, category: "high" as const },
                    { word: "artificial intelligence", frequency: 67, category: "medium" as const },
                    { word: "startup", frequency: 58, category: "medium" as const },
                    { word: "programming", frequency: 45, category: "medium" as const },
                    { word: "cybersecurity", frequency: 42, category: "low" as const },
                    { word: "blockchain", frequency: 38, category: "low" as const },
                    { word: "software", frequency: 71, category: "high" as const },
                  ]} title="Popular Topics" />
                  <AnalyticsChart 
                    data={[
                      { name: 'Jan', value: 12500 },
                      { name: 'Feb', value: 13200 },
                      { name: 'Mar', value: 13800 },
                      { name: 'Apr', value: 14100 },
                      { name: 'May', value: 14200 },
                      { name: 'Jun', value: 14200 },
                    ]} 
                    title="Member Growth Over Time" 
                    type="line" 
                    height={250}
                  />
                </div>
                
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <AnalyticsChart 
                    data={[
                      { name: 'Posts', value: 1247 },
                      { name: 'Comments', value: 8934 },
                      { name: 'Upvotes', value: 23456 },
                      { name: 'Awards', value: 456 },
                    ]} 
                    title="Community Activity Breakdown" 
                    type="bar" 
                    height={250}
                  />
                  <AnalyticsChart 
                    data={[
                      { name: 'Mon', value: 45 },
                      { name: 'Tue', value: 52 },
                      { name: 'Wed', value: 48 },
                      { name: 'Thu', value: 61 },
                      { name: 'Fri', value: 55 },
                      { name: 'Sat', value: 38 },
                      { name: 'Sun', value: 42 },
                    ]} 
                    title="Post Frequency by Day" 
                    type="line" 
                    height={250}
                  />
                </div>
              </div>
            </div>
          )}

          {!hasSearched && !isLoading && (
            <Card className="border-dashed border-muted-foreground/30">
              <CardContent className="py-12 text-center">
                <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">Enter a subreddit name above to begin community analysis</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="link" className="space-y-6">
          <Card className="border-primary/20 shadow-glow">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Network className="h-5 w-5 text-primary" />
                <span>User to Community Link Analysis</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="link-username">Reddit Username</Label>
                <div className="flex space-x-2">
                  <Input
                    id="link-username"
                    placeholder="Enter username to analyze community connections..."
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="flex-1"
                  />
                  <Button 
                    onClick={handleLinkAnalysis}
                    disabled={isLoading || !username.trim()}
                    className="px-6 bg-primary hover:bg-primary/90 text-primary-foreground"
                  >
                    {isLoading ? 'Analyzing...' : 'Analyze'}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {analysisData?.type === 'link' && (
            <div className="space-y-6">
              <Card className="border-primary/20 shadow-glow">
                <CardHeader>
                  <CardTitle>Network Overview - u/{analysisData.primaryUser}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="text-center p-4 rounded-lg bg-primary/10 border border-primary/30">
                      <Share2 className="h-6 w-6 text-primary mx-auto mb-2" />
                      <div className="font-bold text-primary">{analysisData.networkMetrics.totalCommunities}</div>
                      <p className="text-sm text-muted-foreground">Communities</p>
                    </div>
                    <div className="text-center p-4 rounded-lg bg-accent/10 border border-accent/30">
                      <Network className="h-6 w-6 text-accent mx-auto mb-2" />
                      <div className="font-bold text-accent">{analysisData.networkMetrics.crossCommunityLinks}</div>
                      <p className="text-sm text-muted-foreground">Cross-Links</p>
                    </div>
                    <div className="text-center p-4 rounded-lg bg-card border border-border">
                      <BarChart3 className="h-6 w-6 text-foreground mx-auto mb-2" />
                      <div className="font-bold text-foreground">{analysisData.networkMetrics.avgActivityScore}%</div>
                      <p className="text-sm text-muted-foreground">Avg Activity</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card className="border-primary/20 shadow-glow">
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <Users className="h-5 w-5 text-primary" />
                      <span>User to Community Connections</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {analysisData.userToCommunities.map((conn: any, index: number) => (
                        <div key={index} className="p-4 rounded-lg bg-card border border-border">
                          <div className="flex justify-between items-start mb-3">
                            <div>
                              <h3 className="font-semibold text-lg">{conn.community}</h3>
                              <p className="text-sm text-muted-foreground">{conn.posts} posts</p>
                            </div>
                            <div className="text-right">
                              <div className="text-lg font-bold text-primary">{conn.activity}%</div>
                              <p className="text-xs text-muted-foreground">Activity</p>
                            </div>
                          </div>
                          <div className="w-full bg-muted rounded-full h-2">
                            <div 
                              className="bg-primary h-2 rounded-full transition-all duration-300"
                              style={{ width: `${conn.activity}%` }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-primary/20 shadow-glow">
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <AlertTriangle className="h-5 w-5 text-accent" />
                      <span>Community to Community Links</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {analysisData.communityCrossover.map((link: any, index: number) => (
                        <div key={index} className="p-3 rounded-lg bg-card border border-border">
                          <div className="flex justify-between items-center mb-2">
                            <span className="text-sm font-medium">{link.from} → {link.to}</span>
                            <span className="text-sm font-bold text-accent">{link.strength}%</span>
                          </div>
                          <div className="w-full bg-muted rounded-full h-2">
                            <div 
                              className="bg-accent h-2 rounded-full transition-all duration-300"
                              style={{ width: `${link.strength}%` }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          )}

          {!analysisData && !isLoading && (
            <Card className="border-dashed border-muted-foreground/30">
              <CardContent className="py-12 text-center">
                <Network className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">Enter a username to discover community connections</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Analysis;
