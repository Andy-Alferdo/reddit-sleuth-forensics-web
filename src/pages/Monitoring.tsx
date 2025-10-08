import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Search, User, MessageSquare, Calendar, AlertCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { WordCloud } from '@/components/WordCloud';
import { AnalyticsChart } from '@/components/AnalyticsChart';

const Monitoring = () => {
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchType, setSearchType] = useState<'username' | 'subreddit'>('username');
  const [results, setResults] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);

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

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;

    setIsLoading(true);
    
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1500));

    if (searchType === 'username') {
      const username = searchQuery.replace('u/', '');
      
      // Simulate user not found
      if (username === 'nonexistentuser') {
        toast({
          title: "User Not Found",
          description: "Ops User not found",
          variant: "destructive",
        });
        setResults([]);
        setIsLoading(false);
        return;
      }

      // Simulate user found
      setResults([
        {
          type: 'user',
          username: username,
          joinDate: '2020-03-15',
          karma: 1247,
          posts: 89,
          comments: 342,
          lastActive: '2023-10-15'
        }
      ]);
    } else {
      // Simulate subreddit/community search results
      const subreddit = searchQuery.replace('r/', '');
      setResults([
        {
          type: 'post',
          title: 'Top discussion in ' + subreddit,
          author: 'user123',
          subreddit: searchQuery.startsWith('r/') ? searchQuery : 'r/' + subreddit,
          score: 156,
          comments: 45,
          created: '2023-10-14',
          url: 'https://reddit.com/' + (searchQuery.startsWith('r/') ? searchQuery : 'r/' + subreddit) + '/post1'
        },
        {
          type: 'post',
          title: 'Popular post in ' + subreddit,
          author: 'analyst456',
          subreddit: searchQuery.startsWith('r/') ? searchQuery : 'r/' + subreddit,
          score: 89,
          comments: 23,
          created: '2023-10-13',
          url: 'https://reddit.com/' + (searchQuery.startsWith('r/') ? searchQuery : 'r/' + subreddit) + '/post2'
        },
        {
          type: 'comment',
          content: 'Active discussion in ' + subreddit + ' community...',
          author: 'commentor789',
          subreddit: searchQuery.startsWith('r/') ? searchQuery : 'r/' + subreddit,
          score: 12,
          created: '2023-10-12',
          url: 'https://reddit.com/' + (searchQuery.startsWith('r/') ? searchQuery : 'r/' + subreddit) + '/comment1'
        }
      ]);
    }

    setIsLoading(false);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchQuery(value);
    
    // Auto-detect if it's a username or subreddit
    if (value.startsWith('u/')) {
      setSearchType('username');
    } else if (value.startsWith('r/')) {
      setSearchType('subreddit');
    } else {
      // Default to username if no prefix
      setSearchType('username');
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-primary mb-2">Reddit Monitoring</h2>
        <p className="text-muted-foreground">Search for users, communities, and monitor Reddit activity</p>
      </div>

      <Card className="border-primary/20">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Search className="h-5 w-5 text-primary" />
            <span>Search Reddit</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="search">Search Query</Label>
            <div className="flex space-x-2">
              <Input
                id="search"
                placeholder="Enter u/username or r/community to search..."
                value={searchQuery}
                onChange={handleInputChange}
                className="flex-1"
              />
              <Button 
                onClick={handleSearch}
                disabled={isLoading || !searchQuery.trim()}
                variant="forensic"
                className="px-6"
              >
                {isLoading ? 'Searching...' : 'Search'}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              {searchType === 'username' 
                ? 'Searching for user profile' 
                : 'Searching for community activity'
              }
            </p>
          </div>
        </CardContent>
      </Card>

      {results.length > 0 && (
        <Card className="border-primary/20">
          <CardHeader>
            <CardTitle>Search Results</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {results.map((result, index) => (
                <div key={index} className="p-4 rounded-lg bg-card border border-border">
                  {result.type === 'user' ? (
                    <div className="space-y-3">
                      <div className="flex items-center space-x-2">
                        <User className="h-5 w-5 text-primary" />
                        <h3 className="font-semibold text-lg">u/{result.username}</h3>
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div>
                          <p className="text-muted-foreground">Joined</p>
                          <p className="font-medium">{result.joinDate}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Karma</p>
                          <p className="font-medium">{result.karma.toLocaleString()}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Posts</p>
                          <p className="font-medium">{result.posts}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Comments</p>
                          <p className="font-medium">{result.comments}</p>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h3 className="font-medium text-foreground">
                            {result.title || result.content}
                          </h3>
                          <div className="flex items-center space-x-4 text-sm text-muted-foreground mt-1">
                            <span>u/{result.author}</span>
                            <span>{result.subreddit}</span>
                            <span className="flex items-center space-x-1">
                              <Calendar className="h-3 w-3" />
                              <span>{result.created}</span>
                            </span>
                          </div>
                        </div>
                        <div className="text-right text-sm">
                          <p className="font-medium">{result.score} upvotes</p>
                          {result.comments && (
                            <p className="text-muted-foreground flex items-center space-x-1">
                              <MessageSquare className="h-3 w-3" />
                              <span>{result.comments} comments</span>
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Real-time Analytics */}
      {results.length > 0 && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <WordCloud words={realTimeWordCloud} title="Real-time Trending Words" />
            <AnalyticsChart 
              data={keywordTrendData} 
              title="Activity Timeline (Last 6 Hours)" 
              type="line" 
              height={250}
            />
          </div>
          
          <div className="grid grid-cols-1 gap-6">
            <AnalyticsChart 
              data={activitySpikeData} 
              title="Current Activity Breakdown" 
              type="bar" 
              height={250}
            />
          </div>
        </div>
      )}

      {results.length === 0 && !isLoading && (
        <Card className="border-dashed border-muted-foreground/30">
          <CardContent className="py-12 text-center">
            <Search className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">Enter a username (u/username) or community (r/community) to monitor Reddit activity</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default Monitoring;