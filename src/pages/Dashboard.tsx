import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, FolderOpen, Eye, TrendingUp, Users, Loader2, Lock, Unlock } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface DashboardStats {
  totalCases: number;
  activeCases: number;
  closedCases: number;
}

const Dashboard = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [stats, setStats] = useState<DashboardStats>({ totalCases: 0, activeCases: 0, closedCases: 0 });
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  
  // Check if a case is selected
  const [selectedCase, setSelectedCase] = useState<any>(null);

  useEffect(() => {
    const storedCase = localStorage.getItem('selectedCase');
    if (storedCase) {
      setSelectedCase(JSON.parse(storedCase));
    }

    // Listen for storage changes (when case is selected from sidebar)
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

  // Fetch dashboard stats
  useEffect(() => {
    const fetchStats = async () => {
      try {
        const { data: cases, error } = await supabase
          .from('investigation_cases')
          .select('id, status');

        if (error) throw error;

        const total = cases?.length || 0;
        const active = cases?.filter(c => c.status === 'active' || c.status === 'Active').length || 0;
        const closed = cases?.filter(c => c.status === 'closed' || c.status === 'Closed').length || 0;

        setStats({
          totalCases: total,
          activeCases: active,
          closedCases: closed
        });
      } catch (error) {
        console.error('Error fetching stats:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchStats();

    // Subscribe to realtime changes
    const channel = supabase
      .channel('dashboard-cases-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'investigation_cases'
        },
        () => {
          fetchStats();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

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

      // Update local state
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

  return (
    <div className="p-6 space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-primary mb-2">
          {hasSelectedCase ? `Case Dashboard - ${selectedCase.name}` : 'Dashboard Overview'}
        </h2>
        <p className="text-muted-foreground">
          {hasSelectedCase 
            ? `${selectedCase.description} - Status: ${selectedCase.status}` 
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

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="text-center">
          <CardContent className="pt-6">
            {isLoading ? (
              <Loader2 className="h-6 w-6 animate-spin mx-auto text-primary" />
            ) : (
              <div className="text-2xl font-bold text-primary">{stats.totalCases}</div>
            )}
            <p className="text-sm text-muted-foreground">Total Cases</p>
          </CardContent>
        </Card>
        
        <Card className="text-center">
          <CardContent className="pt-6">
            {isLoading ? (
              <Loader2 className="h-6 w-6 animate-spin mx-auto text-forensic-accent" />
            ) : (
              <div className="text-2xl font-bold text-forensic-accent">{stats.activeCases}</div>
            )}
            <p className="text-sm text-muted-foreground">Active Investigations</p>
          </CardContent>
        </Card>
        
        <Card className="text-center">
          <CardContent className="pt-6">
            {isLoading ? (
              <Loader2 className="h-6 w-6 animate-spin mx-auto text-forensic-warning" />
            ) : (
              <div className="text-2xl font-bold text-forensic-warning">{stats.closedCases}</div>
            )}
            <p className="text-sm text-muted-foreground">Closed Cases</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Dashboard;
