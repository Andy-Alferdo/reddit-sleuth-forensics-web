import { useState, useMemo } from "react";
import { Search, Users, Calendar, Shield, MessageSquare, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { WordCloud } from '@/components/WordCloud';
import { AnalyticsChart } from '@/components/AnalyticsChart';
import { format, subDays } from "date-fns";

const CommunityAnalysis = () => {
  const [subreddit, setSubreddit] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  // Sample data for visualizations
  const communityWordCloud = [
    { word: "technology", frequency: 95, category: "high" as const },
    { word: "innovation", frequency: 78, category: "high" as const },
    { word: "artificial intelligence", frequency: 67, category: "medium" as const },
    { word: "startup", frequency: 58, category: "medium" as const },
    { word: "programming", frequency: 45, category: "medium" as const },
    { word: "cybersecurity", frequency: 42, category: "low" as const },
    { word: "blockchain", frequency: 38, category: "low" as const },
    { word: "software", frequency: 71, category: "high" as const },
  ];

  const memberGrowthData = [
    { name: 'Jan', value: 12500 },
    { name: 'Feb', value: 13200 },
    { name: 'Mar', value: 13800 },
    { name: 'Apr', value: 14100 },
    { name: 'May', value: 14200 },
    { name: 'Jun', value: 14200 },
  ];

  const activityData = [
    { name: 'Posts', value: 1247 },
    { name: 'Comments', value: 8934 },
    { name: 'Upvotes', value: 23456 },
    { name: 'Awards', value: 456 },
  ];

  // Generate post frequency data with actual dates
  const postFrequencyData = useMemo(() => {
    const today = new Date();
    const dayValues = [45, 52, 48, 61, 55, 38, 42];
    
    return Array.from({ length: 7 }, (_, i) => {
      const date = subDays(today, 6 - i);
      const dayName = format(date, 'EEE');
      const dateStr = format(date, 'dd-MM-yyyy');
      return {
        name: `${dayName}, ${dateStr}`,
        value: dayValues[i],
      };
    });
  }, []);

  const handleSearch = async () => {
    if (!subreddit.trim()) return;
    
    setIsSearching(true);
    // Simulate API call
    setTimeout(() => {
      setIsSearching(false);
      setHasSearched(true);
    }, 1500);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSearch();
    }
  };

  // Mock data for display
  const communityData = {
    name: "r/technology",
    created: "January 25, 2008",
    members: "14.2M",
    description: "Subreddit dedicated to the news and discussions about the creation and use of technology and its surrounding issues.",
    moderators: [
      "AutoModerator",
      "qgyh2", 
      "kn0thing",
      "spez",
      "maxwellhill"
    ],
    recentPosts: [
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
    ]
  };

  return (
    <div className="min-h-screen bg-background p-6 relative">
      {isSearching && (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-background/80 backdrop-blur-sm">
          <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
          <p className="text-lg font-medium text-foreground">Analyzing community...</p>
          <p className="text-sm text-muted-foreground mt-1">This may take a moment</p>
        </div>
      )}
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold text-primary">Community Analysis</h1>
          <p className="text-muted-foreground">
            Analyze Reddit communities for forensic investigation
          </p>
        </div>

        {/* Search Section */}
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
                  onChange={(e) => setSubreddit(e.target.value)}
                  onKeyPress={handleKeyPress}
                  className="pl-8"
                />
              </div>
              <Button 
                onClick={handleSearch} 
                disabled={isSearching || !subreddit.trim()}
                className="px-6"
              >
                <Search className="h-4 w-4 mr-2" />
                {isSearching ? "Analyzing..." : "Analyze"}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Results Section */}
        {hasSearched && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Community Information */}
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

                  <Separator />

                  <div>
                    <h4 className="font-medium mb-2">Moderators</h4>
                    <div className="flex flex-wrap gap-1">
                      {communityData.moderators.map((mod) => (
                        <Badge key={mod} variant="outline" className="text-xs">
                          u/{mod}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Recent Posts */}
              <Card className="border-primary/20">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <MessageSquare className="h-5 w-5 text-primary" />
                    Recent Posts
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {communityData.recentPosts.map((post, index) => (
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
                <WordCloud words={communityWordCloud} title="Popular Topics" />
                <AnalyticsChart 
                  data={memberGrowthData} 
                  title="Member Growth Over Time" 
                  type="line" 
                  height={250}
                />
              </div>
              
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <AnalyticsChart 
                  data={activityData} 
                  title="Community Activity Breakdown" 
                  type="bar" 
                  height={250}
                />
                <AnalyticsChart 
                  data={postFrequencyData} 
                  title="Post Frequency by Day" 
                  type="line" 
                  height={250}
                />
              </div>
            </div>
          </div>
        )}

        {!hasSearched && (
          <Card className="border-primary/20">
            <CardContent className="py-12 text-center">
              <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">
                Enter a subreddit name above to begin community analysis
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default CommunityAnalysis;