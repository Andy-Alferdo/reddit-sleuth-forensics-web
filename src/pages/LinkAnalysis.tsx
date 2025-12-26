import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import { Network, Share2, Users } from "lucide-react";
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
    await new Promise((resolve) => setTimeout(resolve, 1200));

    const cleanUsername = username.replace(/^u\//, "").trim();

    // Deterministic-ish mock numbers so UI is stable
    const seed = cleanUsername
      .split("")
      .reduce((acc, ch) => acc + ch.charCodeAt(0), 0);

    const totalPosts = 10 + (seed % 25);
    const totalComments = 20 + (seed % 60);
    const totalCommunities = 3 + (seed % 10);

    const communities = Array.from({ length: Math.min(5, totalCommunities) }).map((_, i) => {
      const posts = Math.max(
        1,
        Math.round((totalPosts / Math.min(5, totalCommunities)) * (0.7 + i * 0.08))
      );
      const comments = Math.max(
        1,
        Math.round((totalComments / Math.min(5, totalCommunities)) * (0.75 + i * 0.06))
      );
      const engagement = Math.round((posts * 12 + comments * 4) * (0.9 + i * 0.12));
      const totalActivity = posts + comments;

      return {
        community: `r/${["osint", "cybersecurity", "privacy", "technology", "datascience"][i] || `community${i + 1}`}`,
        posts,
        comments,
        totalActivity,
        engagement,
        activity: Math.min(100, Math.round((totalActivity / Math.max(1, totalPosts + totalComments)) * 100 * 3)),
      };
    });

    const communityDistribution = communities.map((c) => ({ name: c.community, value: c.totalActivity || 0 }));

    const communityCrossover = communities.slice(0, 4).flatMap((c, i) => {
      const next = communities[i + 1];
      if (!next) return [];
      const strength = Math.max(20, 85 - i * 12);
      return [{ from: c.community, to: next.community, strength, relationType: "user-activity" }];
    });

    const analysisResult: LinkAnalysisPayload = {
      primaryUser: cleanUsername,
      totalKarma: 1000 + (seed % 25000),
      userToCommunities: communities,
      communityCrossover,
      communityDistribution,
      networkMetrics: {
        totalCommunities,
        avgActivityScore: Math.round((seed % 900) / 10),
        crossCommunityLinks: communityCrossover.length,
        totalPosts,
        totalComments,
      },
      analyzedAt: new Date().toISOString(),
    };

    setLinkData(analysisResult);
    setIsLoading(false);
  };

  return (
    <div className="p-6 space-y-6">
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
                    <div className="font-bold text-forensic-accent">{linkData.networkMetrics?.crossCommunityLinks ?? 0}</div>
                    <p className="text-sm text-muted-foreground">Cross-Links</p>
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

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card className="border-primary/20">
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Users className="h-5 w-5 text-primary" />
                    <span>Community Activity</span>
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

              <Card className="border-primary/20">
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Share2 className="h-5 w-5 text-primary" />
                    <span>Community Crossover</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {(linkData.communityCrossover || []).length > 0 ? (
                      (linkData.communityCrossover || []).map((item: any, index: number) => (
                        <div key={index} className="p-3 rounded-lg border border-border">
                          <div className="flex justify-between items-center">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-medium">{item.from}</span>
                              <span className="text-muted-foreground">→</span>
                              <span className="text-sm">{item.to}</span>
                            </div>
                            <span className="text-sm font-bold text-forensic-accent">{item.strength}%</span>
                          </div>
                          {item.relationType && (
                            <p className="text-xs text-muted-foreground mt-1">Type: {item.relationType}</p>
                          )}
                        </div>
                      ))
                    ) : (
                      <p className="text-muted-foreground text-sm">No crossover patterns detected.</p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>

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
              nodes={(() => {
                // Build nodes: user + their communities + related communities
                const userNode = { id: 'user1', label: `u/${linkData.primaryUser}`, type: 'user' as const };
                
                const communityNodes = (linkData.userToCommunities || []).slice(0, 6).map((item: any, index: number) => ({
                  id: `community-${index}`,
                  label: item.community,
                  type: 'community' as const
                }));
                
                // Add related communities from crossover data
                const relatedCommunities = new Set<string>();
                (linkData.communityCrossover || []).forEach((item: any) => {
                  // Only add if it's a real related subreddit (not already in user's communities)
                  const existsInUser = (linkData.userToCommunities || []).some((c: any) => c.community === item.to);
                  if (!existsInUser) {
                    relatedCommunities.add(item.to);
                  }
                });
                
                const relatedNodes = Array.from(relatedCommunities).slice(0, 5).map((name: string, index: number) => ({
                  id: `related-${index}`,
                  label: name,
                  type: 'interest' as const
                }));
                
                return [userNode, ...communityNodes, ...relatedNodes];
              })()}
              links={(() => {
                // User to their communities
                const userLinks = (linkData.userToCommunities || []).slice(0, 6).map((item: any, index: number) => ({
                  source: 'user1',
                  target: `community-${index}`,
                  weight: Math.min(4, Math.ceil((item.totalActivity || 1) / 10))
                }));
                
                // Community to related community links
                const crossoverLinks: { source: string; target: string; weight: number }[] = [];
                const relatedCommunityList = Array.from(new Set(
                  (linkData.communityCrossover || [])
                    .filter((item: any) => !(linkData.userToCommunities || []).some((c: any) => c.community === item.to))
                    .map((item: any) => item.to)
                )).slice(0, 5);
                
                (linkData.communityCrossover || []).forEach((item: any) => {
                  const fromIdx = (linkData.userToCommunities || []).findIndex((c: any) => c.community === item.from);
                  const toIdx = relatedCommunityList.indexOf(item.to);
                  
                  if (fromIdx !== -1 && toIdx !== -1) {
                    crossoverLinks.push({
                      source: `community-${fromIdx}`,
                      target: `related-${toIdx}`,
                      weight: Math.ceil((item.strength || 30) / 30)
                    });
                  }
                });
                
                return [...userLinks, ...crossoverLinks];
              })()}
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
