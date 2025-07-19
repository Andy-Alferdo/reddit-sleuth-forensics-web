import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { BarChart3, MapPin, Calendar, TrendingUp, Users, MessageCircle } from 'lucide-react';

const Analysis = () => {
  const [keyword, setKeyword] = useState('');
  const [analysisData, setAnalysisData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleAnalysis = async () => {
    if (!keyword.trim()) return;
    
    setIsLoading(true);
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    setAnalysisData({
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

  return (
    <div className="p-6 space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-primary mb-2">Keyword Analysis</h2>
        <p className="text-muted-foreground">Perform in-depth analysis of keywords and trends</p>
      </div>

      <Card className="border-primary/20">
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
                onClick={handleAnalysis}
                disabled={isLoading || !keyword.trim()}
                variant="forensic"
                className="px-6"
              >
                {isLoading ? 'Analyzing...' : 'Analyze'}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {analysisData && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="border-primary/20">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <TrendingUp className="h-5 w-5 text-primary" />
                <span>Overview</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center p-4 rounded-lg bg-primary/10">
                    <div className="text-2xl font-bold text-primary">{analysisData.totalMentions}</div>
                    <p className="text-sm text-muted-foreground">Total Mentions</p>
                  </div>
                  <div className="text-center p-4 rounded-lg bg-forensic-accent/10">
                    <div className="text-2xl font-bold text-forensic-accent">{analysisData.sentiment}</div>
                    <p className="text-sm text-muted-foreground">Sentiment</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-primary/20">
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

          <Card className="border-primary/20">
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

          <Card className="border-primary/20">
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
      )}

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
};

export default Analysis;