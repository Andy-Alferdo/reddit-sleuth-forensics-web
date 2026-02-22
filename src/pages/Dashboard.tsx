import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FolderOpen, Eye, Loader2, Lock, Unlock, User, TrendingUp, Users, Link2, Activity } from 'lucide-react';
import { useNavigate, Navigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';

interface CaseInvestigationStats {
  userProfiles: number;
  keywordAnalyses: number;
  communityAnalyses: number;
  linkAnalyses: number;
  monitoringSessions: number;
}

interface PastResult {
  id: string;
  target: string;
  date: string;
  type: string;
  data?: any;
}

const Dashboard = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [caseStats, setCaseStats] = useState<CaseInvestigationStats>({
    userProfiles: 0,
    keywordAnalyses: 0,
    communityAnalyses: 0,
    linkAnalyses: 0,
    monitoringSessions: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [selectedCase, setSelectedCase] = useState<any>(() => {
    const stored = localStorage.getItem('selectedCase');
    return stored ? JSON.parse(stored) : null;
  });
  
  // Dialog state for viewing past results
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogTitle, setDialogTitle] = useState('');
  const [pastResults, setPastResults] = useState<PastResult[]>([]);
  const [loadingResults, setLoadingResults] = useState(false);
  const [selectedResultType, setSelectedResultType] = useState<string>('');

  useEffect(() => {
    const storedCase = localStorage.getItem('selectedCase');
    if (storedCase) {
      setSelectedCase(JSON.parse(storedCase));
    }

    const handleStorageChange = () => {
      const updatedCase = localStorage.getItem('selectedCase');
      if (updatedCase) {
        setSelectedCase(JSON.parse(updatedCase));
      } else {
        setSelectedCase(null);
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  // Fetch case-specific investigation stats
  const fetchCaseStats = async () => {
    if (!selectedCase?.id) {
      setIsLoading(false);
      return;
    }

    try {
      // Fetch counts for each type of investigation data
      const [userProfilesRes, analysesRes, monitoringRes] = await Promise.all([
        supabase
          .from('user_profiles_analyzed')
          .select('id', { count: 'exact', head: true })
          .eq('case_id', selectedCase.id),
        supabase
          .from('analysis_results')
          .select('id, analysis_type')
          .eq('case_id', selectedCase.id),
        supabase
          .from('monitoring_sessions')
          .select('id', { count: 'exact', head: true })
          .eq('case_id', selectedCase.id),
      ]);

      const analyses = analysesRes.data || [];
      const keywordCount = analyses.filter(a => a.analysis_type === 'keyword').length;
      const communityCount = analyses.filter(a => a.analysis_type === 'community').length;
      const linkCount = analyses.filter(a => a.analysis_type === 'link').length;

      setCaseStats({
        userProfiles: userProfilesRes.count || 0,
        keywordAnalyses: keywordCount,
        communityAnalyses: communityCount,
        linkAnalyses: linkCount,
        monitoringSessions: monitoringRes.count || 0,
      });
    } catch (error) {
      console.error('Error fetching case stats:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    setIsLoading(true);
    fetchCaseStats();
  }, [selectedCase?.id]);

  // Real-time subscription for live updates
  useEffect(() => {
    if (!selectedCase?.id) return;

    const channel = supabase
      .channel(`case-stats-${selectedCase.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'user_profiles_analyzed' }, () => fetchCaseStats())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'analysis_results' }, () => fetchCaseStats())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'monitoring_sessions' }, () => fetchCaseStats())
      .subscribe();

    const onCaseDataUpdated = (e: Event) => {
      const ce = e as CustomEvent<{ caseId: string; kind: string }>;
      if (ce.detail?.caseId === selectedCase.id) {
        fetchCaseStats();
        // If dialog is open for the same category, refresh it too
        if (dialogOpen && selectedResultType === ce.detail.kind) {
          handleViewPastResults(selectedResultType);
        }
      }
    };

    window.addEventListener('case-data-updated', onCaseDataUpdated);

    return () => {
      window.removeEventListener('case-data-updated', onCaseDataUpdated);
      supabase.removeChannel(channel);
    };
  }, [selectedCase?.id, dialogOpen, selectedResultType]);

  const hasSelectedCase = selectedCase !== null;

  const handleToggleCaseStatus = async () => {
    if (!selectedCase?.id) return;
    
    setIsUpdatingStatus(true);
    const newStatus = selectedCase.status?.toLowerCase() === 'closed' ? 'active' : 'closed';
    
    try {
      const { error } = await supabase
        .from('investigation_cases')
        .update({ status: newStatus })
        .eq('id', selectedCase.id);

      if (error) throw error;

      const updatedCase = { ...selectedCase, status: newStatus };
      setSelectedCase(updatedCase);
      localStorage.setItem('selectedCase', JSON.stringify(updatedCase));
      window.dispatchEvent(new Event('storage'));

      toast({
        title: newStatus === 'closed' ? 'Case Closed' : 'Case Reopened',
        description: newStatus === 'closed' 
          ? 'The case has been closed. You can reopen it anytime.'
          : 'The case has been reopened and is now active.',
      });
    } catch (error) {
      console.error('Error updating case status:', error);
      toast({
        title: 'Error',
        description: 'Failed to update case status. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const getStatusColor = (status: string) => {
    return 'text-foreground';
  };

  const handleViewPastResults = async (type: string) => {
    if (!selectedCase?.id) return;

    setLoadingResults(true);
    setSelectedResultType(type);
    setDialogOpen(true);
    
    let title = '';
    let results: PastResult[] = [];

    try {
      switch (type) {
        case 'userProfiles':
          title = 'User Profiles';
          const { data: profiles } = await supabase
            .from('user_profiles_analyzed')
            .select('id, username, analyzed_at, total_karma, active_subreddits')
            .eq('case_id', selectedCase.id)
            .order('analyzed_at', { ascending: false });
          
          results = (profiles || []).map(p => ({
            id: p.id,
            target: p.username,
            date: p.analyzed_at ? format(new Date(p.analyzed_at), 'MMM d, yyyy HH:mm') : 'N/A',
            type: 'user_profile',
            data: { karma: p.total_karma, subreddits: p.active_subreddits },
          }));
          break;

        case 'keywordAnalyses':
          title = 'Keyword Analyses';
          const { data: keywords } = await supabase
            .from('analysis_results')
            .select('id, target, analyzed_at, result_data')
            .eq('case_id', selectedCase.id)
            .eq('analysis_type', 'keyword')
            .order('analyzed_at', { ascending: false });
          
          results = (keywords || []).map(k => ({
            id: k.id,
            target: k.target,
            date: k.analyzed_at ? format(new Date(k.analyzed_at), 'MMM d, yyyy HH:mm') : 'N/A',
            type: 'keyword',
            data: k.result_data,
          }));
          break;

        case 'communityAnalyses':
          title = 'Community Analyses';
          const { data: communities } = await supabase
            .from('analysis_results')
            .select('id, target, analyzed_at, result_data')
            .eq('case_id', selectedCase.id)
            .eq('analysis_type', 'community')
            .order('analyzed_at', { ascending: false });
          
          results = (communities || []).map(c => ({
            id: c.id,
            target: c.target,
            date: c.analyzed_at ? format(new Date(c.analyzed_at), 'MMM d, yyyy HH:mm') : 'N/A',
            type: 'community',
            data: c.result_data,
          }));
          break;

        case 'linkAnalyses':
          title = 'Link Analyses';
          const { data: links } = await supabase
            .from('analysis_results')
            .select('id, target, analyzed_at, result_data')
            .eq('case_id', selectedCase.id)
            .eq('analysis_type', 'link')
            .order('analyzed_at', { ascending: false });
          
          results = (links || []).map(l => ({
            id: l.id,
            target: l.target,
            date: l.analyzed_at ? format(new Date(l.analyzed_at), 'MMM d, yyyy HH:mm') : 'N/A',
            type: 'link',
            data: l.result_data,
          }));
          break;

        case 'monitoringSessions':
          title = 'Monitoring Sessions';
          const { data: sessions } = await supabase
            .from('monitoring_sessions')
            .select('id, target_name, search_type, started_at, ended_at, activities')
            .eq('case_id', selectedCase.id)
            .order('started_at', { ascending: false });
          
           results = (sessions || []).map(s => {
             const activitiesArray = Array.isArray(s.activities) ? s.activities : [];
             return {
               id: s.id,
               target: s.target_name,
               date: s.started_at ? format(new Date(s.started_at), 'MMM d, yyyy HH:mm') : 'N/A',
               type: s.search_type,
               data: {
                 activities: activitiesArray,
                 activityCount: activitiesArray.length,
                 endedAt: s.ended_at,
               },
             };
           });
          break;
      }

      setDialogTitle(title);
      setPastResults(results);
    } catch (error) {
      console.error('Error fetching past results:', error);
      toast({
        title: 'Error',
        description: 'Failed to load past results.',
        variant: 'destructive',
      });
    } finally {
      setLoadingResults(false);
    }
  };

  const handleResultClick = (result: PastResult) => {
    // Navigate to the appropriate page with full result data
    switch (selectedResultType) {
      case 'userProfiles':
        navigate('/user-profiling', { state: { loadProfileId: result.id } });
        break;
      case 'keywordAnalyses':
        navigate('/analysis', { state: { loadAnalysisId: result.id, analysisType: 'keyword' } });
        break;
      case 'communityAnalyses':
        navigate('/analysis', { state: { loadAnalysisId: result.id, analysisType: 'community' } });
        break;
      case 'linkAnalyses':
        navigate('/link-analysis', { state: { loadAnalysisId: result.id } });
        break;
      case 'monitoringSessions':
        navigate('/monitoring', { state: { loadSession: result.id } });
        break;
    }
    setDialogOpen(false);
  };

  const investigationCards = [
    {
      key: 'userProfiles',
      label: 'User Profiles',
      count: caseStats.userProfiles,
      icon: User,
      color: 'text-foreground',
      bgColor: 'bg-muted',
    },
    {
      key: 'keywordAnalyses',
      label: 'Keyword Analyses',
      count: caseStats.keywordAnalyses,
      icon: TrendingUp,
      color: 'text-foreground',
      bgColor: 'bg-muted',
    },
    {
      key: 'communityAnalyses',
      label: 'Communities',
      count: caseStats.communityAnalyses,
      icon: Users,
      color: 'text-foreground',
      bgColor: 'bg-muted',
    },
    {
      key: 'linkAnalyses',
      label: 'Link Analyses',
      count: caseStats.linkAnalyses,
      icon: Link2,
      color: 'text-foreground',
      bgColor: 'bg-muted',
    },
    {
      key: 'monitoringSessions',
      label: 'Monitoring Sessions',
      count: caseStats.monitoringSessions,
      icon: Activity,
      color: 'text-foreground',
      bgColor: 'bg-muted',
    },
  ];

  return (
    <div className="p-6 space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-foreground mb-2">
          {hasSelectedCase ? `Case Dashboard - ${selectedCase.name}` : 'Dashboard Overview'}
        </h2>
        <p className="text-muted-foreground">
          {hasSelectedCase 
            ? `${selectedCase.description || 'No description'} - Status: ${selectedCase.status}` 
            : 'Select a case from the sidebar to begin investigation'}
        </p>
      </div>

      {hasSelectedCase ? (
        <>
          {/* Case Overview Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="border-border">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Status</p>
                    <p className={`text-xl font-bold ${getStatusColor(selectedCase.status)}`}>
                      {selectedCase.status}
                    </p>
                  </div>
                  <FolderOpen className="h-8 w-8 text-foreground" />
                </div>
              </CardContent>
            </Card>
            
            <Card className="border-border">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Created</p>
                    <p className="text-xl font-bold text-foreground">{selectedCase.date}</p>
                  </div>
                  <Eye className="h-8 w-8 text-foreground" />
                </div>
              </CardContent>
            </Card>
            
            <Card className="border-border">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Case Number</p>
                    <p className="text-xl font-bold text-foreground">{selectedCase.name}</p>
                  </div>
                  <FolderOpen className="h-8 w-8 text-foreground" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Case Actions */}
          <div className="flex justify-center">
            <Button
              variant={selectedCase.status?.toLowerCase() === 'closed' ? 'default' : 'destructive'}
              onClick={handleToggleCaseStatus}
              disabled={isUpdatingStatus}
              className="min-w-[200px]"
            >
              {isUpdatingStatus ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : selectedCase.status?.toLowerCase() === 'closed' ? (
                <Unlock className="h-4 w-4 mr-2" />
              ) : (
                <Lock className="h-4 w-4 mr-2" />
              )}
              {selectedCase.status?.toLowerCase() === 'closed' ? 'Reopen Case' : 'Close Case'}
            </Button>
          </div>

          {/* Collected Investigation Data */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Activity className="h-5 w-5 text-foreground" />
              <h3 className="text-lg font-semibold text-foreground">Collected Investigation Data</h3>
            </div>
            
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              {investigationCards.map((card) => {
                const IconComponent = card.icon;
                return (
                  <Card
                    key={card.key}
                    className={`cursor-pointer transition-all hover:scale-105 hover:shadow-lg border-2 ${
                      card.count > 0 ? 'border-primary/30 hover:border-primary' : 'border-muted'
                    }`}
                    onClick={() => card.count > 0 && handleViewPastResults(card.key)}
                  >
                    <CardContent className="pt-6 text-center">
                      <div className={`mx-auto mb-3 p-3 rounded-full w-fit ${card.bgColor}`}>
                        <IconComponent className={`h-6 w-6 ${card.color}`} />
                      </div>
                      {isLoading ? (
                        <Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
                      ) : (
                        <div className={`text-2xl font-bold ${card.color}`}>{card.count}</div>
                      )}
                      <p className="text-xs text-muted-foreground mt-1">{card.label}</p>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        </>
      ) : (
        <Navigate to="/" replace />
      )}

      {/* Past Results Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5 text-primary" />
              {dialogTitle} ({pastResults.length})
            </DialogTitle>
          </DialogHeader>
          
          <ScrollArea className="max-h-[400px]">
            {loadingResults ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : pastResults.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No results found.
              </div>
            ) : (
              <div className="space-y-2">
                {pastResults.map((result) => (
                  <Card
                    key={result.id}
                    className="cursor-pointer hover:bg-accent/50 transition-colors"
                    onClick={() => handleResultClick(result)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <p className="font-medium text-foreground">{result.target}</p>
                          <p className="text-sm text-muted-foreground">{result.date}</p>
                        </div>
                        <Badge variant="secondary" className="ml-2">
                          {result.type}
                        </Badge>
                      </div>
                      {result.data && (
                        <div className="mt-2 text-xs text-muted-foreground space-y-2">
                          {selectedResultType === 'userProfiles' && result.data.karma && (
                            <span>Karma: {result.data.karma?.toLocaleString()}</span>
                          )}

                          {selectedResultType === 'monitoringSessions' && (
                            <div className="space-y-1">
                              <div>Activities: {result.data.activityCount || 0}</div>
                              {Array.isArray(result.data.activities) && result.data.activities.length > 0 && (
                                <div className="rounded-md border bg-card p-2">
                                  <div className="font-medium text-foreground mb-1">Latest activity</div>
                                  <ul className="space-y-1">
                                    {result.data.activities.slice(0, 3).map((a: any, idx: number) => (
                                      <li key={idx} className="flex items-start justify-between gap-2">
                                        <div className="min-w-0">
                                          <div className="truncate">{a.title || a.body || 'Activity'}</div>
                                          <div className="text-[11px] text-muted-foreground truncate">
                                            {(a.subreddit ? `r/${a.subreddit}` : a.subreddit || '')}{a.timestamp ? ` • ${a.timestamp}` : ''}
                                          </div>
                                        </div>
                                        {a.url && (
                                          <a
                                            className="text-primary underline shrink-0"
                                            href={a.url}
                                            target="_blank"
                                            rel="noreferrer"
                                            onClick={(e) => e.stopPropagation()}
                                          >
                                            Open
                                          </a>
                                        )}
                                      </li>
                                    ))}
                                  </ul>
                                  {result.data.activities.length > 3 && (
                                    <div className="mt-1 text-[11px] text-muted-foreground">
                                      +{result.data.activities.length - 3} more (click card to open full session)
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Dashboard;
