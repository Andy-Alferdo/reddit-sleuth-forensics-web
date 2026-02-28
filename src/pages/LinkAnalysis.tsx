import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import { Network, Share2, Users, Loader2 } from "lucide-react";
import { AnalyticsChart } from "@/components/AnalyticsChart";
import { UserCommunityNetworkGraph } from "@/components/UserCommunityNetworkGraph";

type LinkAnalysisPayload = {
  primaryUser: string;
  totalKarma?: number;
  userToCommunities?: Array<{
    community: string;
    posts: number;
    comments: number;
    totalActivity?: number;
    engagement?: number;
    activity?: number;
  }>;
  communityCrossover?: Array<{
    from: string;
    to: string;
    strength: number;
    relationType?: string;
  }>;
  communityDistribution?: Array<{ name: string; value: number }>;
  communityRelations?: Array<{ subreddit: string; relatedTo: string[] }>;
  networkMetrics?: {
    totalCommunities: number;
    avgActivityScore?: number;
    crossCommunityLinks: number;
    totalPosts: number;
    totalComments: number;
  };
  analyzedAt?: string;
};

const LinkAnalysis = () => {
  const location = useLocation();
  const { toast } = useToast();

  const [username, setUsername] = useState("");
  const [linkData, setLinkData] = useState<LinkAnalysisPayload | null>(null);
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
          .from("analysis_results")
          .select("*")
          .eq("id", loadAnalysisId)
          .maybeSingle();

        if (error) throw error;
        if (!data) throw new Error("Analysis not found");
        if (cancelled) return;

        const resultData = (data.result_data || {}) as LinkAnalysisPayload;

        setUsername(data.target || "");
        setLinkData(resultData);

        toast({
          title: "Loaded saved analysis",
          description: `Showing saved link analysis for "${data.target}"`,
        });
      } catch (e: any) {
        if (!cancelled) {
          toast({
            title: "Failed to load analysis",
            description: e?.message || "Could not load saved analysis",
            variant: "destructive",
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

  const handleAnalyzeLinks = async () => {
    if (!username.trim()) return;

    setIsLoading(true);
    const cleanUsername = username.replace(/^u\//, "").trim();

    try {
      const { data: redditData, error } = await supabase.functions.invoke('reddit-scraper', {
        body: { username: cleanUsername, type: 'user' },
      });

      if (error || redditData?.error) {
        toast({
          title: "Analysis failed",
          description: redditData?.message || error?.message || "Could not fetch Reddit data",
          variant: "destructive",
        });
        setIsLoading(false);
        return;
      }

      const posts = redditData.posts || [];
      const comments = redditData.comments || [];
      const user = redditData.user || {};

      // Build real community activity from posts and comments
      const communityMap = new Map<string, { posts: number; comments: number }>();
      posts.forEach((p: any) => {
        const sub = p.subreddit;
        const entry = communityMap.get(sub) || { posts: 0, comments: 0 };
        entry.posts++;
        communityMap.set(sub, entry);
      });
      comments.forEach((c: any) => {
        const sub = c.subreddit;
        const entry = communityMap.get(sub) || { posts: 0, comments: 0 };
        entry.comments++;
        communityMap.set(sub, entry);
      });

      const communities = Array.from(communityMap.entries())
        .map(([name, data]) => {
          const totalActivity = data.posts + data.comments;
          return {
            community: `r/${name}`,
            posts: data.posts,
            comments: data.comments,
            totalActivity,
            activity: 0,
          };
        })
        .sort((a, b) => b.totalActivity - a.totalActivity);

      // Calculate relative activity percentage
      const maxActivity = communities[0]?.totalActivity || 1;
      communities.forEach(c => {
        c.activity = Math.round((c.totalActivity / maxActivity) * 100);
      });

      const communityDistribution = communities.slice(0, 10).map(c => ({
        name: c.community,
        value: c.totalActivity,
      }));

      const analysisResult: LinkAnalysisPayload = {
        primaryUser: cleanUsername,
        totalKarma: (user.link_karma || 0) + (user.comment_karma || 0),
        userToCommunities: communities,
        communityDistribution,
        communityRelations: redditData.communityRelations || [],
        networkMetrics: {
          totalCommunities: communities.length,
          avgActivityScore: communities.length > 0 ? Math.round(communities.reduce((s, c) => s + c.totalActivity, 0) / communities.length) : 0,
          crossCommunityLinks: 0,
          totalPosts: posts.length,
          totalComments: comments.length,
        },
        analyzedAt: new Date().toISOString(),
      };

      setLinkData(analysisResult);
    } catch (err: any) {
      toast({
        title: "Analysis failed",
        description: err?.message || "An unexpected error occurred",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="p-6 space-y-6 relative">
      {isLoading && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/60">
          <div className="flex flex-col items-center gap-3 bg-card border border-border rounded-xl shadow-2xl px-8 py-6">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-sm font-medium text-foreground">Analyzing links...</p>
          </div>
        </div>
      )}
      <header className="text-center">
        <h1 className="text-2xl font-bold text-primary mb-2">Link Analysis</h1>
        <p className="text-muted-foreground">Community connections and crossover from Reddit activity</p>
      </header>

      <main className="space-y-6">
        <Card className="border-primary/20">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Network className="h-5 w-5 text-primary" />
              <span>Analyze User Links</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="username">Reddit Username</Label>
              <div className="flex space-x-2">
                <Input
                  id="username"
                  placeholder="Enter username (e.g., u/spez)"
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
                  {isLoading ? "Analyzing..." : "Analyze"}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {linkData && (
          <section className="space-y-6" aria-label="Link analysis results">
            <Card className="border-primary/20">
              <CardHeader>
                <CardTitle>Network Overview - u/{linkData.primaryUser}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center p-4 rounded-lg bg-primary/10 border border-primary/30">
                    <Share2 className="h-6 w-6 text-primary mx-auto mb-2" />
                    <div className="font-bold text-primary">{linkData.networkMetrics?.totalCommunities ?? 0}</div>
                    <p className="text-sm text-muted-foreground">Communities</p>
                  </div>
                  <div className="text-center p-4 rounded-lg bg-forensic-accent/10 border border-forensic-accent/30">
                    <Network className="h-6 w-6 text-forensic-accent mx-auto mb-2" />
                    <div className="font-bold text-forensic-accent">{linkData.networkMetrics?.avgActivityScore ?? 0}</div>
                    <p className="text-sm text-muted-foreground">Avg Activity</p>
                  </div>
                  <div className="text-center p-4 rounded-lg bg-card border border-border">
                    <div className="font-bold text-foreground">{linkData.networkMetrics?.totalPosts ?? 0}</div>
                    <p className="text-sm text-muted-foreground">Total Posts</p>
                  </div>
                  <div className="text-center p-4 rounded-lg bg-card border border-border">
                    <div className="font-bold text-foreground">{linkData.networkMetrics?.totalComments ?? 0}</div>
                    <p className="text-sm text-muted-foreground">Total Comments</p>
                  </div>
                </div>

                <div className="mt-4 pt-4 border-t">
                  <div className="text-center p-3 rounded-lg bg-muted">
                    <div className="font-bold text-lg text-primary">{Number(linkData.totalKarma || 0).toLocaleString()}</div>
                    <p className="text-sm text-muted-foreground">Total Karma</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-primary/20">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Users className="h-5 w-5 text-primary" />
                  <span>Community Activity ({(linkData.userToCommunities || []).length} communities)</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {(linkData.userToCommunities || []).map((item: any, index: number) => (
                    <div key={index} className="p-3 rounded-lg border border-border">
                      <div className="flex justify-between items-center mb-2">
                        <div>
                          <p className="font-medium">{item.community}</p>
                          <p className="text-xs text-muted-foreground">
                            {item.posts} posts • {item.comments} comments
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-primary">{Number(item.totalActivity || (item.posts || 0) + (item.comments || 0)).toLocaleString()}</p>
                          <p className="text-xs text-muted-foreground">Activity</p>
                        </div>
                      </div>
                      <div className="w-full bg-muted rounded-full h-2">
                        <div
                          className="bg-primary h-2 rounded-full transition-all duration-300"
                          style={{ width: `${Math.min(100, Number(item.activity || 0))}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {(linkData.communityDistribution || []).length > 0 && (
              <Card className="border-primary/20">
                <CardHeader>
                  <CardTitle>Community Distribution</CardTitle>
                </CardHeader>
                <CardContent>
                  <AnalyticsChart data={linkData.communityDistribution} title="" type="pie" height={250} />
                </CardContent>
              </Card>
            )}

            {/* Beautiful Network Graph Visualization - Same as Live */}
            <UserCommunityNetworkGraph
              title="User to Community Network Graph"
              primaryUserId="user1"
              nodes={[
                { id: 'user1', label: `u/${linkData.primaryUser}`, type: 'user' as const },
                ...(linkData.userToCommunities || []).slice(0, 10).map((item: any, index: number) => ({
                  id: `community-${index}`,
                  label: item.community,
                  type: 'community' as const,
                })),
              ]}
              links={(linkData.userToCommunities || []).slice(0, 10).map((item: any, index: number) => ({
                source: 'user1',
                target: `community-${index}`,
                weight: Math.min(4, Math.ceil((item.totalActivity || 1) / 10)),
              }))}
            />
          </section>
        )}

        {!linkData && !isLoading && (
          <Card className="border-dashed border-muted-foreground/30">
            <CardContent className="py-12 text-center">
              <Network className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">Enter a username to run link analysis</p>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
};

export default LinkAnalysis;
