import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardTitle, CardDescription } from '@/components/ui/card';
import { FolderOpen, Loader2, Search, Shield, Activity, Archive, Clock } from 'lucide-react';
import folderSearchIcon from '@/assets/folder-search-icon.png';
import mascotLogo from '@/assets/reddit-sleuth-mascot.png';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import MovingBackground from '@/components/MovingBackground';

interface CaseItem {
  id: string;
  case_name: string;
  case_number: string;
  status: string;
  created_at: string;
  description: string;
}

const useCountUp = (end: number, duration = 1200, start = 0) => {
  const [value, setValue] = useState(start);
  const ref = useRef<number>();

  useEffect(() => {
    if (end === start) { setValue(start); return; }
    const startTime = performance.now();
    const animate = (now: number) => {
      const progress = Math.min((now - startTime) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(Math.round(start + (end - start) * eased));
      if (progress < 1) ref.current = requestAnimationFrame(animate);
    };
    ref.current = requestAnimationFrame(animate);
    return () => { if (ref.current) cancelAnimationFrame(ref.current); };
  }, [end, duration, start]);

  return value;
};

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

  const totalCount = useCountUp(isLoading ? 0 : cases.length);
  const activeCount = useCountUp(isLoading ? 0 : cases.filter(c => c.status?.toLowerCase() === 'active').length);
  const closedCount = useCountUp(isLoading ? 0 : cases.filter(c => c.status?.toLowerCase() === 'closed').length);

  const recentCases = cases.slice(0, 3);

  return (
    <div className="relative min-h-[90vh] flex flex-col">
      {/* Animated Background */}
      <MovingBackground />
      <div className="absolute inset-0 bg-gradient-to-b from-background/80 via-background/90 to-background pointer-events-none" />

      {/* Content */}
      <div className="relative z-10 flex-1 flex flex-col items-center justify-center p-6">
        <div className="w-full max-w-3xl space-y-10">

          {/* Hero Section */}
          <div className="flex flex-col items-center text-center space-y-4 animate-fade-in-up">
            <div className="relative">
              <img
                src={mascotLogo}
                alt="Intel Reddit"
                className="h-20 w-20 drop-shadow-[0_0_20px_hsl(var(--primary)/0.4)]"
              />
            </div>
            <div>
              <h1 className="text-3xl font-bold tracking-tight text-foreground">Intel Reddit</h1>
              <p className="text-sm text-muted-foreground mt-1">Open-Source Intelligence Platform</p>
            </div>
            <div className="w-32 h-0.5 rounded-full bg-gradient-to-r from-primary to-forensic-cyan opacity-60" />
          </div>

          {/* Action Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-fade-in-up" style={{ animationDelay: '0.1s' }}>
            {/* Create New Case */}
            <Card
              className="relative overflow-hidden rounded-2xl border-border/50 backdrop-blur-sm bg-card/80 hover:shadow-lg hover:shadow-primary/10 hover:scale-[1.02] transition-all duration-300 cursor-pointer group"
              onClick={() => navigate('/new-case')}
            >
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-primary to-primary/40 opacity-60 group-hover:opacity-100 transition-opacity" />
              <CardContent className="pt-10 pb-10 flex flex-col items-center text-center space-y-4">
                <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 group-hover:scale-110 transition-all duration-300">
                  <img src={folderSearchIcon} alt="New Investigation" className="h-8 w-8" />
                </div>
                <div>
                  <CardTitle className="text-lg mb-1">Create New Case</CardTitle>
                  <CardDescription>Start a new investigation</CardDescription>
                </div>
              </CardContent>
            </Card>

            {/* Open Existing Case */}
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Card className="relative overflow-hidden rounded-2xl border-border/50 backdrop-blur-sm bg-card/80 hover:shadow-lg hover:shadow-forensic-cyan/10 hover:scale-[1.02] transition-all duration-300 cursor-pointer group">
                  <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-forensic-cyan to-forensic-cyan/40 opacity-60 group-hover:opacity-100 transition-opacity" />
                  <CardContent className="pt-10 pb-10 flex flex-col items-center text-center space-y-4">
                    <div className="h-16 w-16 rounded-full bg-forensic-cyan/10 flex items-center justify-center group-hover:bg-forensic-cyan/20 group-hover:scale-110 transition-all duration-300">
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

          {/* Stats Bar */}
          <div className="animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
            <Card className="rounded-2xl border-border/50 backdrop-blur-sm bg-card/80">
              <CardContent className="p-0">
                <div className="grid grid-cols-3 divide-x divide-border">
                  <div className="flex items-center gap-3 p-5">
                    <div className="h-10 w-1 rounded-full bg-primary" />
                    <Shield className="h-5 w-5 text-primary" />
                    <div>
                      <div className="text-xl font-bold text-foreground">{isLoading ? '–' : totalCount}</div>
                      <p className="text-xs text-muted-foreground">Total Cases</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-5">
                    <div className="h-10 w-1 rounded-full bg-forensic-success" />
                    <Activity className="h-5 w-5 text-forensic-success" />
                    <div>
                      <div className="text-xl font-bold text-foreground">{isLoading ? '–' : activeCount}</div>
                      <p className="text-xs text-muted-foreground">Active</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-5">
                    <div className="h-10 w-1 rounded-full bg-muted-foreground" />
                    <Archive className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <div className="text-xl font-bold text-foreground">{isLoading ? '–' : closedCount}</div>
                      <p className="text-xs text-muted-foreground">Closed</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Recent Cases */}
          {!isLoading && recentCases.length > 0 && (
            <div className="space-y-3 animate-fade-in-up" style={{ animationDelay: '0.3s' }}>
              <h2 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Clock className="h-4 w-4" /> Recent Cases
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {recentCases.map((c) => (
                  <Card
                    key={c.id}
                    className="rounded-2xl border-border/50 backdrop-blur-sm bg-card/80 hover:bg-muted/40 hover:scale-[1.02] transition-all duration-200 cursor-pointer"
                    onClick={() => handleSelectCase(c)}
                  >
                    <CardContent className="p-4 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-semibold text-foreground truncate">{c.case_number}</span>
                        <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${getStatusColor(c.status)}`}>
                          {c.status}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground truncate">{c.case_name}</p>
                      <p className="text-[10px] text-muted-foreground/70">{new Date(c.created_at).toLocaleDateString()}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* Footer Tagline */}
          <p className="text-center text-xs text-muted-foreground/50 animate-fade-in-up" style={{ animationDelay: '0.4s' }}>
            Powered by Open-Source Intelligence
          </p>
        </div>
      </div>
    </div>
  );
};

export default Home;
