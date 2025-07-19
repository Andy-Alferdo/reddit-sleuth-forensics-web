import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { User, MapPin, Clock, MessageCircle, ThumbsUp, Calendar, Activity } from 'lucide-react';

const UserProfiling = () => {
  const [username, setUsername] = useState('');
  const [profileData, setProfileData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleAnalyzeUser = async () => {
    if (!username.trim()) return;
    
    setIsLoading(true);
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    setProfileData({
      username: username.replace('u/', ''),
      accountAge: '3 years, 7 months',
      totalKarma: 15247,
      postKarma: 8932,
      commentKarma: 6315,
      activeSubreddits: [
        { name: 'r/technology', activity: 156 },
        { name: 'r/programming', activity: 89 },
        { name: 'r/science', activity: 67 },
        { name: 'r/worldnews', activity: 45 },
      ],
      activityPattern: {
        mostActiveHour: '14:00-15:00 UTC',
        mostActiveDay: 'Tuesday',
        timezone: 'EST (estimated)',
      },
      sentimentAnalysis: {
        positive: 45,
        neutral: 35,
        negative: 20,
      },
      locationIndicators: [
        'References to EST timezone',
        'Mentions of US politics',
        'Baseball team references (Yankees)',
        'Weather patterns consistent with Northeast US'
      ],
      behaviorPatterns: [
        'Active during business hours',
        'Responds quickly to technical discussions',
        'Long-form posts on weekends',
        'Uses formal language structure'
      ]
    });
    
    setIsLoading(false);
  };

  return (
    <div className="p-6 space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-primary mb-2">User Profiling</h2>
        <p className="text-muted-foreground">Deep analysis of Reddit user profiles and behavior patterns</p>
      </div>

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
                onChange={(e) => setUsername(e.target.value)}
                className="flex-1"
              />
              <Button 
                onClick={handleAnalyzeUser}
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

      {profileData && (
        <div className="space-y-6">
          {/* Basic Profile Info */}
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

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Activity Pattern */}
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

            {/* Location Indicators */}
            <Card className="border-primary/20">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <MapPin className="h-5 w-5 text-primary" />
                  <span>Location Indicators</span>
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

            {/* Active Subreddits */}
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

            {/* Behavior Patterns */}
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
          </div>

          {/* Sentiment Analysis */}
          <Card className="border-primary/20">
            <CardHeader>
              <CardTitle>Sentiment Analysis</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-4">
                <div className="text-center p-4 rounded-lg bg-forensic-accent/10">
                  <div className="text-2xl font-bold text-forensic-accent">{profileData.sentimentAnalysis.positive}%</div>
                  <p className="text-sm text-muted-foreground">Positive</p>
                </div>
                <div className="text-center p-4 rounded-lg bg-blue-500/10">
                  <div className="text-2xl font-bold text-blue-500">{profileData.sentimentAnalysis.neutral}%</div>
                  <p className="text-sm text-muted-foreground">Neutral</p>
                </div>
                <div className="text-center p-4 rounded-lg bg-red-500/10">
                  <div className="text-2xl font-bold text-red-500">{profileData.sentimentAnalysis.negative}%</div>
                  <p className="text-sm text-muted-foreground">Negative</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {!profileData && !isLoading && (
        <Card className="border-dashed border-muted-foreground/30">
          <CardContent className="py-12 text-center">
            <User className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">Enter a username to perform detailed profile analysis</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default UserProfiling;