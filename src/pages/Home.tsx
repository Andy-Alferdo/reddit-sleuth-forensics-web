import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FolderOpen, Loader2, Search } from 'lucide-react';
import folderSearchIcon from '@/assets/folder-search-icon.png';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';

interface CaseItem {
  id: string;
  case_name: string;
  case_number: string;
  status: string;
  created_at: string;
  description: string;
}

const Home = () => {
  const navigate = useNavigate();
  const [cases, setCases] = useState<CaseItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    const fetchCases = async () => {
      try {
        const { data, error } = await supabase
          .from('investigation_cases')
          .select('id, case_name, case_number, status, created_at, description')
          .order('created_at', { ascending: false });

        if (error) throw error;
        setCases(data || []);
      } catch (error) {
        console.error('Error fetching cases:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchCases();
  }, []);

  const handleSelectCase = (caseItem: CaseItem) => {
    const selectedCase = {
      id: caseItem.id,
      name: caseItem.case_number,
      description: caseItem.case_name,
      status: caseItem.status,
      date: new Date(caseItem.created_at).toLocaleDateString()
    };
    localStorage.setItem('selectedCase', JSON.stringify(selectedCase));
    window.dispatchEvent(new Event('storage'));
    setIsDialogOpen(false);
    navigate('/dashboard');
  };

  const filteredCases = cases.filter(c => 
    c.case_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.case_number.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'active': return 'bg-forensic-success/20 text-forensic-success border-forensic-success/30';
      case 'closed': return 'bg-muted text-muted-foreground border-muted-foreground/30';
      default: return 'bg-forensic-warning/20 text-forensic-warning border-forensic-warning/30';
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center p-6">
      <div className="w-full max-w-2xl space-y-8">

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Create New Case */}
          <Card 
            className="border-primary/30 hover:border-primary/60 transition-colors cursor-pointer group"
            onClick={() => navigate('/new-case')}
          >
            <CardContent className="pt-8 pb-8 flex flex-col items-center text-center space-y-4">
              <img src={folderSearchIcon} alt="New Investigation" className="h-16 w-16" />
              <div>
                <CardTitle className="text-lg mb-1">Create New Case</CardTitle>
                <CardDescription>Start a new investigation</CardDescription>
              </div>
            </CardContent>
          </Card>

          {/* Open Existing Case */}
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Card className="border-forensic-cyan/30 hover:border-forensic-cyan/60 transition-colors cursor-pointer group">
                <CardContent className="pt-8 pb-8 flex flex-col items-center text-center space-y-4">
                  <div className="h-16 w-16 rounded-full bg-forensic-cyan/10 flex items-center justify-center group-hover:bg-forensic-cyan/20 transition-colors">
                    <FolderOpen className="h-8 w-8 text-forensic-cyan" />
                  </div>
                  <div>
                    <CardTitle className="text-lg mb-1">Open Existing Case</CardTitle>
                    <CardDescription>
                      {isLoading ? 'Loading...' : `${cases.length} cases available`}
                    </CardDescription>
                  </div>
                </CardContent>
              </Card>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>Select a Case</DialogTitle>
              </DialogHeader>
              
              <div className="relative mb-4">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search cases..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>

              <ScrollArea className="h-[400px] pr-4">
                {isLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-primary" />
                  </div>
                ) : filteredCases.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    {cases.length === 0 ? 'No cases found. Create a new case to get started.' : 'No matching cases found.'}
                  </div>
                ) : (
                  <div className="space-y-2">
                    {filteredCases.map((caseItem) => (
                      <Card 
                        key={caseItem.id}
                        className="cursor-pointer hover:bg-muted/50 transition-colors"
                        onClick={() => handleSelectCase(caseItem)}
                      >
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between">
                            <div className="space-y-1">
                              <div className="font-medium">{caseItem.case_number}</div>
                              <div className="text-sm text-muted-foreground">{caseItem.case_name}</div>
                              <div className="text-xs text-muted-foreground">
                                Created: {new Date(caseItem.created_at).toLocaleDateString()}
                              </div>
                            </div>
                            <Badge variant="outline" className={getStatusColor(caseItem.status)}>
                              {caseItem.status}
                            </Badge>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </DialogContent>
          </Dialog>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-3 gap-4">
          <Card className="text-center">
            <CardContent className="pt-4 pb-4">
              {isLoading ? (
                <Loader2 className="h-5 w-5 animate-spin mx-auto text-primary" />
              ) : (
                <div className="text-xl font-bold text-primary">{cases.length}</div>
              )}
              <p className="text-xs text-muted-foreground">Total Cases</p>
            </CardContent>
          </Card>
          <Card className="text-center">
            <CardContent className="pt-4 pb-4">
              {isLoading ? (
                <Loader2 className="h-5 w-5 animate-spin mx-auto text-forensic-success" />
              ) : (
                <div className="text-xl font-bold text-forensic-success">
                  {cases.filter(c => c.status?.toLowerCase() === 'active').length}
                </div>
              )}
              <p className="text-xs text-muted-foreground">Active</p>
            </CardContent>
          </Card>
          <Card className="text-center">
            <CardContent className="pt-4 pb-4">
              {isLoading ? (
                <Loader2 className="h-5 w-5 animate-spin mx-auto text-muted-foreground" />
              ) : (
                <div className="text-xl font-bold text-muted-foreground">
                  {cases.filter(c => c.status?.toLowerCase() === 'closed').length}
                </div>
              )}
              <p className="text-xs text-muted-foreground">Closed</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Home;