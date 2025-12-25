import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, FolderOpen, Eye, Loader2, Lock, Unlock, User, TrendingUp, Users, Link2, Activity } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
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
  const [selectedCase, setSelectedCase] = useState<any>(null);
  
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
  useEffect(() => {
    const fetchCaseStats = async () => {
      if (!selectedCase?.id) {
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
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

    fetchCaseStats();
  }, [selectedCase?.id]);

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
    switch (status?.toLowerCase()) {
      case 'active': return 'text-forensic-success';
      case 'closed': return 'text-muted-foreground';
      case 'pending': return 'text-forensic-warning';
      default: return 'text-foreground';
    }
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
            .select('id, target_name, search_type, started_at, ended_at, new_activity_count')
            .eq('case_id', selectedCase.id)
            .order('started_at', { ascending: false });
          
          results = (sessions || []).map(s => ({
            id: s.id,
            target: s.target_name,
            date: s.started_at ? format(new Date(s.started_at), 'MMM d, yyyy HH:mm') : 'N/A',
            type: s.search_type,
            data: { activityCount: s.new_activity_count, endedAt: s.ended_at },
          }));
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
    // Navigate to the appropriate page based on result type
    switch (selectedResultType) {
      case 'userProfiles':
        navigate('/user-profiling', { state: { loadProfile: result.target } });
        break;
      case 'keywordAnalyses':
        navigate('/analysis', { state: { loadKeyword: result.target } });
        break;
      case 'communityAnalyses':
        navigate('/community-analysis', { state: { loadCommunity: result.target } });
        break;
      case 'linkAnalyses':
        navigate('/link-analysis', { state: { loadLink: result.target } });
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
      color: 'text-primary',
      bgColor: 'bg-primary/10',
    },
    {
      key: 'keywordAnalyses',
      label: 'Keyword Analyses',
      count: caseStats.keywordAnalyses,
      icon: TrendingUp,
      color: 'text-forensic-cyan',
      bgColor: 'bg-forensic-cyan/10',
    },
    {
      key: 'communityAnalyses',
      label: 'Communities',
      count: caseStats.communityAnalyses,
      icon: Users,
      color: 'text-forensic-accent',
      bgColor: 'bg-forensic-accent/10',
    },
    {
      key: 'linkAnalyses',
      label: 'Link Analyses',
      count: caseStats.linkAnalyses,
      icon: Link2,
      color: 'text-forensic-warning',
      bgColor: 'bg-forensic-warning/10',
    },
    {
      key: 'monitoringSessions',
      label: 'Monitoring Sessions',
      count: caseStats.monitoringSessions,
      icon: Activity,
      color: 'text-forensic-success',
      bgColor: 'bg-forensic-success/10',
    },
  ];

  return (
    <div className="p-6 space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-primary mb-2">
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
            <Card className="border-primary/20">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Status</p>
                    <p className={`text-xl font-bold ${getStatusColor(selectedCase.status)}`}>
                      {selectedCase.status}
                    </p>
                  </div>
                  <FolderOpen className="h-8 w-8 text-primary" />
                </div>
              </CardContent>
            </Card>
            
            <Card className="border-primary/20">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Created</p>
                    <p className="text-xl font-bold text-foreground">{selectedCase.date}</p>
                  </div>
                  <Eye className="h-8 w-8 text-forensic-cyan" />
                </div>
              </CardContent>
            </Card>
            
            <Card className="border-primary/20">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Case Number</p>
                    <p className="text-xl font-bold text-forensic-warning">{selectedCase.name}</p>
                  </div>
                  <FolderOpen className="h-8 w-8 text-forensic-warning" />
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
              <Activity className="h-5 w-5 text-primary" />
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
        <Card className="border-dashed border-muted-foreground/30">
          <CardContent className="py-12 text-center">
            <FolderOpen className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground mb-4">No case selected. Please select a case from the sidebar or create a new one.</p>
            <Button 
              variant="default" 
              onClick={() => navigate('/new-case')}
            >
              <Plus className="h-4 w-4 mr-2" />
              Create New Case
            </Button>
          </CardContent>
        </Card>
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
                        <div className="mt-2 text-xs text-muted-foreground">
                          {selectedResultType === 'userProfiles' && result.data.karma && (
                            <span>Karma: {result.data.karma?.toLocaleString()}</span>
                          )}
                          {selectedResultType === 'monitoringSessions' && (
                            <span>Activities: {result.data.activityCount || 0}</span>
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
