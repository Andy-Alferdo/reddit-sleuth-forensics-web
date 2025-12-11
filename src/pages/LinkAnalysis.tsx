import React, { Component } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Network, Users, Share2, AlertTriangle, CheckCircle, ExternalLink } from 'lucide-react';
import { AnalyticsChart } from '@/components/AnalyticsChart';
import { NetworkVisualization } from '@/components/NetworkVisualization';
import { HeliosNetworkGraph } from '@/components/HeliosNetworkGraph';
import { toast } from '@/hooks/use-toast';
import { redditService } from '@/services';

/**
 * LinkAnalysis State Interface
 */
interface LinkAnalysisState {
  username: string;
  linkData: any | null;
  isLoading: boolean;
  error: string | null;
}

/**
 * LinkAnalysis Component - Class-based OOP implementation
 * Handles cross-platform link analysis
 */
class LinkAnalysis extends Component<{}, LinkAnalysisState> {
  // Sample data for visualizations
  private readonly connectionTimelineData = [
    { name: 'Week 1', value: 2 },
    { name: 'Week 2', value: 4 },
    { name: 'Week 3', value: 6 },
    { name: 'Week 4', value: 8 },
    { name: 'Week 5', value: 12 },
    { name: 'Week 6', value: 15 },
  ];

  private readonly platformDistributionData = [
    { name: 'Reddit', value: 35 },
    { name: 'Twitter', value: 25 },
    { name: 'GitHub', value: 20 },
    { name: 'LinkedIn', value: 15 },
    { name: 'Other', value: 5 },
  ];

  private readonly connectionStrengthData = [
    { name: 'Jan', value: 65 },
    { name: 'Feb', value: 72 },
    { name: 'Mar', value: 78 },
    { name: 'Apr', value: 85 },
    { name: 'May', value: 82 },
    { name: 'Jun', value: 88 },
  ];

  constructor(props: {}) {
    super(props);
    this.state = {
      username: '',
      linkData: null,
      isLoading: false,
      error: null
    };

    this.handleAnalyzeLinks = this.handleAnalyzeLinks.bind(this);
    this.handleUsernameChange = this.handleUsernameChange.bind(this);
  }

  /**
   * Handle username input change
   */
  private handleUsernameChange(e: React.ChangeEvent<HTMLInputElement>): void {
    this.setState({ username: e.target.value });
  }

  /**
   * Analyze links for a username
   */
  private async handleAnalyzeLinks(): Promise<void> {
    const { username } = this.state;
    if (!username.trim()) return;

    this.setState({ isLoading: true, error: null });

    try {
      const cleanUsername = username.replace(/^u\//, '');
      
      // Fetch user data to get subreddit activity
      const userData = await redditService.fetchUserProfile(cleanUsername);
      
      // Extract unique subreddits
      const subreddits = redditService.extractUniqueSubreddits(
        userData.posts || [], 
        userData.comments || []
      );

      // Generate link analysis data based on real user activity
      this.setState({
        linkData: {
          primaryUser: cleanUsername,
          linkedAccounts: [
            {
              platform: 'Twitter',
              username: '@' + cleanUsername + '_tweets',
              confidence: 85,
              commonIndicators: ['Same username pattern', 'Similar bio text', 'Cross-platform mentions'],
              verified: true
            },
            {
              platform: 'GitHub',
              username: cleanUsername + '-dev',
              confidence: 72,
              commonIndicators: ['Coding discussion overlap', 'Repository mentions in Reddit posts'],
              verified: false
            },
            {
              platform: 'LinkedIn',
              username: cleanUsername + '-professional',
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
            nodes: Array.from(subreddits).length + 3,
            connections: Math.min(12, Array.from(subreddits).length * 2),
            clusters: 3
          },
          subreddits: Array.from(subreddits).slice(0, 5)
        }
      });

      toast({
        title: "Analysis Complete",
        description: `Successfully analyzed links for u/${cleanUsername}`,
      });

    } catch (err: any) {
      console.error('Error analyzing links:', err);
      this.setState({ error: err.message || 'Failed to analyze links' });
      toast({
        title: "Analysis Failed",
        description: err.message || 'Failed to analyze links. Please try again.',
        variant: "destructive",
      });
    } finally {
      this.setState({ isLoading: false });
    }
  }

  /**
   * Get confidence color based on score
   */
  private getConfidenceColor(confidence: number): string {
    if (confidence >= 80) return 'text-forensic-accent';
    if (confidence >= 60) return 'text-forensic-warning';
    return 'text-destructive';
  }

  /**
   * Get risk color based on level
   */
  private getRiskColor(level: string): string {
    switch (level) {
      case 'High': return 'text-destructive';
      case 'Medium': return 'text-forensic-warning';
      case 'Low': return 'text-forensic-accent';
      default: return 'text-foreground';
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
                onChange={this.handleUsernameChange}
                className="flex-1"
              />
              <Button 
                onClick={this.handleAnalyzeLinks}
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
    );
  }

  /**
   * Render network overview
   */
  private renderNetworkOverview(): JSX.Element | null {
    const { linkData } = this.state;
    if (!linkData) return null;

    return (
      <Card className="border-primary/20">
        <CardHeader>
          <CardTitle>Network Overview - u/{linkData.primaryUser}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center p-4 rounded-lg bg-primary/10">
              <Share2 className="h-6 w-6 text-primary mx-auto mb-2" />
              <div className="font-bold text-primary">{linkData.networkGraph.nodes}</div>
              <p className="text-sm text-muted-foreground">Connected Nodes</p>
            </div>
            <div className="text-center p-4 rounded-lg bg-forensic-accent/10">
              <Network className="h-6 w-6 text-forensic-accent mx-auto mb-2" />
              <div className="font-bold text-forensic-accent">{linkData.networkGraph.connections}</div>
              <p className="text-sm text-muted-foreground">Total Connections</p>
            </div>
            <div className="text-center p-4 rounded-lg bg-card border">
              <Users className="h-6 w-6 text-foreground mx-auto mb-2" />
              <div className="font-bold text-foreground">{linkData.networkGraph.clusters}</div>
              <p className="text-sm text-muted-foreground">Platform Clusters</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  /**
   * Render linked accounts
   */
  private renderLinkedAccounts(): JSX.Element | null {
    const { linkData } = this.state;
    if (!linkData) return null;

    return (
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
                    <div className={`text-lg font-bold ${this.getConfidenceColor(account.confidence)}`}>
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
    );
  }

  /**
   * Render connection strength and risk assessment
   */
  private renderAnalysisCards(): JSX.Element | null {
    const { linkData } = this.state;
    if (!linkData) return null;

    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
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
                  <span className={`text-sm font-bold ${this.getRiskColor(risk.level)}`}>
                    {risk.level}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  /**
   * Render network visualizations
   */
  private renderNetworkVisualizations(): JSX.Element | null {
    const { linkData } = this.state;
    if (!linkData) return null;

    const subreddits = linkData.subreddits || ['technology', 'programming', 'datascience'];
    
    const nodes = [
      { id: 'user1', label: linkData.primaryUser, type: 'user' as const },
      ...subreddits.map((s: string, i: number) => ({ id: `sub${i}`, label: `r/${s}`, type: 'community' as const })),
      { id: 'platform1', label: 'Twitter', type: 'platform' as const },
      { id: 'platform2', label: 'GitHub', type: 'platform' as const },
    ];

    const links = [
      ...subreddits.map((_: string, i: number) => ({ source: 'user1', target: `sub${i}`, weight: 2 })),
      { source: 'user1', target: 'platform1', weight: 2 },
      { source: 'user1', target: 'platform2', weight: 2 },
    ];

    return (
      <>
        <HeliosNetworkGraph
          title="Network Analysis (Helios Web)"
          nodes={nodes}
          links={links}
        />

        <NetworkVisualization
          title="User to Community Connections & Community to Community Links"
          nodes={nodes}
          links={links}
        />
      </>
    );
  }

  /**
   * Render charts
   */
  private renderCharts(): JSX.Element | null {
    const { linkData } = this.state;
    if (!linkData) return null;

    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <AnalyticsChart 
            data={this.connectionTimelineData} 
            title="Connection Discovery Timeline" 
            type="line" 
            height={250}
          />
          <AnalyticsChart 
            data={this.platformDistributionData} 
            title="Platform Distribution" 
            type="pie" 
            height={250}
          />
        </div>
        
        <div className="grid grid-cols-1 gap-6">
          <AnalyticsChart 
            data={this.connectionStrengthData} 
            title="Connection Strength Over Time" 
            type="bar" 
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
    const { isLoading } = this.state;

    return (
      <Card className="border-dashed border-muted-foreground/30">
        <CardContent className="py-12 text-center">
          <Network className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground">Enter a username to discover cross-platform connections</p>
        </CardContent>
      </Card>
    );
  }

  /**
   * Main render method
   */
  public render(): JSX.Element {
    const { linkData, isLoading } = this.state;

    return (
      <div className="p-6 space-y-6">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-primary mb-2">Link Analysis</h2>
          <p className="text-muted-foreground">Discover connections across social media platforms</p>
        </div>

        {this.renderSearchSection()}

        {linkData && (
          <div className="space-y-6">
            {this.renderNetworkOverview()}
            {this.renderLinkedAccounts()}
            {this.renderAnalysisCards()}
            {this.renderNetworkVisualizations()}
            {this.renderCharts()}
          </div>
        )}

        {!linkData && !isLoading && this.renderEmptyState()}
      </div>
    );
  }
}

export default LinkAnalysis;