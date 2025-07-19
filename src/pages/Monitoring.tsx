import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Search, User, MessageSquare, Calendar, AlertCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const Monitoring = () => {
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchType, setSearchType] = useState<'username' | 'keyword'>('keyword');
  const [results, setResults] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);

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
      // Simulate keyword search results
      setResults([
        {
          type: 'post',
          title: 'Discussion about ' + searchQuery,
          author: 'user123',
          subreddit: 'r/technology',
          score: 156,
          comments: 45,
          created: '2023-10-14',
          url: 'https://reddit.com/r/technology/post1'
        },
        {
          type: 'post',
          title: 'Analysis of ' + searchQuery + ' trends',
          author: 'analyst456',
          subreddit: 'r/datascience',
          score: 89,
          comments: 23,
          created: '2023-10-13',
          url: 'https://reddit.com/r/datascience/post2'
        },
        {
          type: 'comment',
          content: 'This relates to ' + searchQuery + ' in many ways...',
          author: 'commentor789',
          subreddit: 'r/science',
          score: 12,
          created: '2023-10-12',
          url: 'https://reddit.com/r/science/comment1'
        }
      ]);
    }

    setIsLoading(false);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchQuery(value);
    
    // Auto-detect if it's a username
    if (value.startsWith('u/')) {
      setSearchType('username');
    } else {
      setSearchType('keyword');
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-primary mb-2">Reddit Monitoring</h2>
        <p className="text-muted-foreground">Search for users, keywords, and monitor Reddit activity</p>
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
                placeholder="Enter keyword or u/username to search..."
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
                : 'Searching for keyword in posts and comments'
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

      {results.length === 0 && !isLoading && (
        <Card className="border-dashed border-muted-foreground/30">
          <CardContent className="py-12 text-center">
            <Search className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">Enter a search query to monitor Reddit activity</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default Monitoring;