import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Network, Users, Share2, AlertTriangle, CheckCircle, ExternalLink } from 'lucide-react';
import { AnalyticsChart } from '@/components/AnalyticsChart';
import { UserCommunityNetworkGraph } from '@/components/UserCommunityNetworkGraph';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

const LinkAnalysis = () => {
  const location = useLocation();
  const { toast } = useToast();
  const [username, setUsername] = useState('');
  const [linkData, setLinkData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Load saved link analysis when navigating from Dashboard
  useEffect(() => {
    const loadAnalysisId = (location.state as any)?.loadAnalysisId as string | undefined;
    if (!loadAnalysisId) return;

    let cancelled = false;

    (async () => {
      setIsLoading(true);
      try {
        const { data, error } = await supabase
          .from('analysis_results')
          .select('*')
          .eq('id', loadAnalysisId)
          .maybeSingle();

        if (error) throw error;
        if (!data) throw new Error('Analysis not found');

        if (cancelled) return;

        const resultData = data.result_data as any;
        setUsername(data.target || '');
        setLinkData(resultData);

        toast({
          title: 'Loaded saved analysis',
          description: `Showing saved link analysis for "${data.target}"`,
        });
      } catch (e: any) {
        if (!cancelled) {
          toast({
            title: 'Failed to load analysis',
            description: e?.message || 'Could not load saved analysis',
            variant: 'destructive',
          });
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [location.state, toast]);

  // Sample data for visualizations
  const connectionTimelineData = [
    { name: 'Week 1', value: 2 },
    { name: 'Week 2', value: 4 },
    { name: 'Week 3', value: 6 },
    { name: 'Week 4', value: 8 },
    { name: 'Week 5', value: 12 },
    { name: 'Week 6', value: 15 },
  ];

  const platformDistributionData = [
    { name: 'Reddit', value: 35 },
    { name: 'Twitter', value: 25 },
    { name: 'GitHub', value: 20 },
    { name: 'LinkedIn', value: 15 },
    { name: 'Other', value: 5 },
  ];

  const connectionStrengthData = [
    { name: 'Jan', value: 65 },
    { name: 'Feb', value: 72 },
    { name: 'Mar', value: 78 },
    { name: 'Apr', value: 85 },
    { name: 'May', value: 82 },
    { name: 'Jun', value: 88 },
  ];

  const handleAnalyzeLinks = async () => {
    if (!username.trim()) return;
    
    setIsLoading(true);
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 2500));
    
    setLinkData({
      primaryUser: username.replace('u/', ''),
      linkedAccounts: [
        {
          platform: 'Twitter',
          username: '@' + username.replace('u/', '') + '_tweets',
          confidence: 85,
          commonIndicators: ['Same username pattern', 'Similar bio text', 'Cross-platform mentions'],
          verified: true
        },
        {
          platform: 'GitHub',
          username: username.replace('u/', '') + '-dev',
          confidence: 72,
          commonIndicators: ['Coding discussion overlap', 'Repository mentions in Reddit posts'],
          verified: false
        },
        {
          platform: 'LinkedIn',
          username: username.replace('u/', '') + '-professional',
          confidence: 68,
          commonIndicators: ['Professional interest alignment', 'Similar location indicators'],
          verified: false
        }
      ],
      connectionStrength: [
        { type: 'Username Similarity', score: 90 },
        { type: 'Content Overlap', score: 75 },
        { type: 'Temporal Patterns', score: 82 },
        { type: 'Language Patterns', score: 78 }
      ],
      riskFactors: [
        { risk: 'High cross-platform correlation', level: 'Medium' },
        { risk: 'Consistent digital footprint', level: 'High' },
        { risk: 'Potential OSINT vulnerability', level: 'Medium' }
      ],
      networkGraph: {
        nodes: 8,
        connections: 12,
        clusters: 3
      }
    });
    
    setIsLoading(false);
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 80) return 'text-forensic-accent';
    if (confidence >= 60) return 'text-forensic-warning';
    return 'text-destructive';
  };

  const getRiskColor = (level: string) => {
    switch (level) {
      case 'High': return 'text-destructive';
      case 'Medium': return 'text-forensic-warning';
      case 'Low': return 'text-forensic-accent';
      default: return 'text-foreground';
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-primary mb-2">Link Analysis</h2>
        <p className="text-muted-foreground">Discover connections across social media platforms</p>
      </div>

      <Card className="border-primary/20">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Network className="h-5 w-5 text-primary" />
            <span>Cross-Platform Analysis</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="username">Reddit Username</Label>
            <div className="flex space-x-2">
              <Input
                id="username"
                placeholder="Enter username to find linked accounts..."
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="flex-1"
              />
              <Button 
                onClick={handleAnalyzeLinks}
                disabled={isLoading || !username.trim()}
                variant="forensic"
                className="px-6"
              >
                {isLoading ? 'Analyzing...' : 'Find Links'}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {linkData && (
        <div className="space-y-6">
          {/* Network Overview - supports both saved and live data formats */}
          <Card className="border-primary/20">
            <CardHeader>
              <CardTitle>Network Overview - u/{linkData.primaryUser}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-4">
                <div className="text-center p-4 rounded-lg bg-primary/10">
                  <Share2 className="h-6 w-6 text-primary mx-auto mb-2" />
                  <div className="font-bold text-primary">
                    {linkData.networkGraph?.nodes ?? linkData.networkMetrics?.totalCommunities ?? 0}
                  </div>
                  <p className="text-sm text-muted-foreground">Connected Nodes</p>
                </div>
                <div className="text-center p-4 rounded-lg bg-forensic-accent/10">
                  <Network className="h-6 w-6 text-forensic-accent mx-auto mb-2" />
                  <div className="font-bold text-forensic-accent">
                    {linkData.networkGraph?.connections ?? linkData.networkMetrics?.crossCommunityLinks ?? 0}
                  </div>
                  <p className="text-sm text-muted-foreground">Total Connections</p>
                </div>
                <div className="text-center p-4 rounded-lg bg-card border">
                  <Users className="h-6 w-6 text-foreground mx-auto mb-2" />
                  <div className="font-bold text-foreground">
                    {linkData.networkGraph?.clusters ?? linkData.networkMetrics?.totalPosts ?? 0}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {linkData.networkGraph ? 'Platform Clusters' : 'Total Posts'}
                  </p>
                </div>
              </div>
              {/* Show additional metrics if from saved analysis */}
              {linkData.totalKarma && (
                <div className="mt-4 pt-4 border-t grid grid-cols-2 gap-4">
                  <div className="text-center p-3 rounded-lg bg-muted">
                    <div className="font-bold text-lg text-primary">{linkData.totalKarma.toLocaleString()}</div>
                    <p className="text-sm text-muted-foreground">Total Karma</p>
                  </div>
                  <div className="text-center p-3 rounded-lg bg-muted">
                    <div className="font-bold text-lg text-foreground">
                      {linkData.networkMetrics?.totalComments ?? 0}
                    </div>
                    <p className="text-sm text-muted-foreground">Total Comments</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* User to Communities - for saved analysis data */}
          {linkData.userToCommunities && linkData.userToCommunities.length > 0 && (
            <Card className="border-primary/20">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Users className="h-5 w-5 text-primary" />
                  <span>Community Activity</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {linkData.userToCommunities.map((comm: any, index: number) => (
                    <div key={index} className="p-4 rounded-lg bg-card border border-border">
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <h3 className="font-semibold text-lg">{comm.community}</h3>
                          <p className="text-muted-foreground text-sm">
                            {comm.posts} posts • {comm.comments} comments
                          </p>
                        </div>
                        <div className="text-right">
                          <div className="text-lg font-bold text-primary">
                            {comm.engagement?.toLocaleString() || comm.activity}
                          </div>
                          <p className="text-xs text-muted-foreground">Engagement</p>
                        </div>
                      </div>
                      <div className="w-full bg-muted rounded-full h-2">
                        <div 
                          className="bg-primary h-2 rounded-full transition-all duration-300"
                          style={{ width: `${Math.min(100, comm.activity || 0)}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Community Crossover - for saved analysis data */}
          {linkData.communityCrossover && linkData.communityCrossover.length > 0 && (
            <Card className="border-primary/20">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Share2 className="h-5 w-5 text-primary" />
                  <span>Community Crossover</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {linkData.communityCrossover.slice(0, 8).map((cross: any, index: number) => (
                    <div key={index} className="flex items-center justify-between p-3 rounded-lg bg-card border">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">{cross.from}</span>
                        <span className="text-muted-foreground">→</span>
                        <span className="text-sm">{cross.to}</span>
                      </div>
                      <span className={`text-sm font-bold ${
                        cross.strength >= 80 ? 'text-forensic-accent' : 
                        cross.strength >= 50 ? 'text-forensic-warning' : 'text-muted-foreground'
                      }`}>
                        {cross.strength}%
                      </span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Linked Accounts - for live analysis data */}
          {linkData.linkedAccounts && linkData.linkedAccounts.length > 0 && (
            <Card className="border-primary/20">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <ExternalLink className="h-5 w-5 text-primary" />
                  <span>Potential Linked Accounts</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {linkData.linkedAccounts.map((account: any, index: number) => (
                    <div key={index} className="p-4 rounded-lg bg-card border border-border">
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <div className="flex items-center space-x-2">
                            <h3 className="font-semibold text-lg">{account.platform}</h3>
                            {account.verified && <CheckCircle className="h-4 w-4 text-forensic-accent" />}
                          </div>
                          <p className="text-muted-foreground">{account.username}</p>
                        </div>
                        <div className="text-right">
                          <div className={`text-lg font-bold ${getConfidenceColor(account.confidence)}`}>
                            {account.confidence}%
                          </div>
                          <p className="text-xs text-muted-foreground">Confidence</p>
                        </div>
                      </div>
                      
                      <div className="space-y-2">
                        <p className="text-sm font-medium text-muted-foreground">Common Indicators:</p>
                        <div className="flex flex-wrap gap-2">
                          {account.commonIndicators.map((indicator: string, idx: number) => (
                            <span 
                              key={idx} 
                              className="px-2 py-1 bg-primary/10 text-primary text-xs rounded-md"
                            >
                              {indicator}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Connection Strength - for live analysis */}
            {linkData.connectionStrength && linkData.connectionStrength.length > 0 && (
              <Card className="border-primary/20">
                <CardHeader>
                  <CardTitle>Connection Strength Analysis</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {linkData.connectionStrength.map((connection: any, index: number) => (
                      <div key={index} className="space-y-2">
                        <div className="flex justify-between items-center">
                          <span className="text-sm font-medium">{connection.type}</span>
                          <span className="text-sm font-bold text-primary">{connection.score}%</span>
                        </div>
                        <div className="w-full bg-muted rounded-full h-2">
                          <div 
                            className="bg-primary h-2 rounded-full transition-all duration-300"
                            style={{ width: `${connection.score}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Risk Assessment - for live analysis */}
            {linkData.riskFactors && linkData.riskFactors.length > 0 && (
              <Card className="border-primary/20">
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <AlertTriangle className="h-5 w-5 text-forensic-warning" />
                    <span>Risk Assessment</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {linkData.riskFactors.map((risk: any, index: number) => (
                      <div key={index} className="flex justify-between items-center p-3 rounded-lg bg-card border">
                        <span className="text-sm">{risk.risk}</span>
                        <span className={`text-sm font-bold ${getRiskColor(risk.level)}`}>
                          {risk.level}
                        </span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Community Distribution - for saved analysis */}
            {linkData.communityDistribution && linkData.communityDistribution.length > 0 && (
              <Card className="border-primary/20">
                <CardHeader>
                  <CardTitle>Community Distribution</CardTitle>
                </CardHeader>
                <CardContent>
                  <AnalyticsChart 
                    data={linkData.communityDistribution} 
                    title="" 
                    type="pie" 
                    height={250}
                  />
                </CardContent>
              </Card>
            )}
          </div>

          {/* Beautiful User-Community Network Graph */}
          <UserCommunityNetworkGraph
            title="User to Community Network Connections"
            primaryUserId="user1"
            nodes={[
              { id: 'user1', label: linkData.primaryUser, type: 'user' },
              ...(linkData.userToCommunities || []).slice(0, 6).map((c: any, i: number) => ({
                id: `comm${i}`,
                label: c.community || `Community ${i + 1}`,
                type: 'community' as const,
              })),
              ...(linkData.linkedAccounts || []).map((a: any, i: number) => ({
                id: `platform${i}`,
                label: a.platform,
                type: 'platform' as const,
              })),
            ]}
            links={[
              ...(linkData.userToCommunities || []).slice(0, 6).map((_: any, i: number) => ({
                source: 'user1',
                target: `comm${i}`,
                weight: 3,
              })),
              ...(linkData.linkedAccounts || []).map((_: any, i: number) => ({
                source: 'user1',
                target: `platform${i}`,
                weight: 2,
              })),
            ]}
          />

          {/* Link Analysis Visualizations - only for live analysis */}
          {linkData.networkGraph && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <AnalyticsChart 
                  data={connectionTimelineData} 
                  title="Connection Discovery Timeline" 
                  type="line" 
                  height={250}
                />
                <AnalyticsChart 
                  data={platformDistributionData} 
                  title="Platform Distribution" 
                  type="pie" 
                  height={250}
                />
              </div>
              
              <div className="grid grid-cols-1 gap-6">
                <AnalyticsChart 
                  data={connectionStrengthData} 
                  title="Connection Strength Over Time" 
                  type="bar" 
                  height={250}
                />
              </div>
            </div>
          )}
        </div>
      )}

      {!linkData && !isLoading && (
        <Card className="border-dashed border-muted-foreground/30">
          <CardContent className="py-12 text-center">
            <Network className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">Enter a username to discover cross-platform connections</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default LinkAnalysis;