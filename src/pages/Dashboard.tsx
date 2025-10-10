import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, FolderOpen, Eye, TrendingUp, Users } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { AnalyticsChart } from '@/components/AnalyticsChart';

const Dashboard = () => {
  const navigate = useNavigate();
  
  // Check if a case is selected
  const selectedCase = localStorage.getItem('selectedCase');
  const hasSelectedCase = selectedCase !== null;
  const caseData = hasSelectedCase ? JSON.parse(selectedCase) : null;

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Active': return 'text-forensic-success';
      case 'Closed': return 'text-muted-foreground';
      case 'Pending': return 'text-forensic-warning';
      default: return 'text-foreground';
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-primary mb-2">
          {hasSelectedCase ? `Case Dashboard - ${caseData.name}` : 'Dashboard Overview'}
        </h2>
        <p className="text-muted-foreground">
          {hasSelectedCase 
            ? `${caseData.description} - Status: ${caseData.status}` 
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
                    <p className={`text-xl font-bold ${getStatusColor(caseData.status)}`}>
                      {caseData.status}
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
                    <p className="text-xl font-bold text-foreground">{caseData.date}</p>
                  </div>
                  <Eye className="h-8 w-8 text-forensic-cyan" />
                </div>
              </CardContent>
            </Card>
            
            <Card className="border-primary/20">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Evidence Items</p>
                    <p className="text-xl font-bold text-forensic-warning">24</p>
                  </div>
                  <TrendingUp className="h-8 w-8 text-forensic-warning" />
                </div>
              </CardContent>
            </Card>
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

      {/* Trends and Analytics Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="border-primary/20 border-forensic-accent/30 shadow-[0_0_20px_rgba(0,255,198,0.15)]">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <TrendingUp className="h-5 w-5 text-forensic-accent" />
              <span>Trending Topics</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <AnalyticsChart 
              data={[
                { name: '#cybersecurity', value: 145 },
                { name: '#digitalforensics', value: 89 },
                { name: '#privacy', value: 67 },
                { name: '#OSINT', value: 54 },
                { name: '#infosec', value: 42 },
              ]} 
              title="" 
              type="bar" 
              height={250}
            />
          </CardContent>
        </Card>

        <Card className="border-primary/20 border-forensic-accent/30 shadow-[0_0_20px_rgba(0,255,198,0.15)]">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Users className="h-5 w-5 text-forensic-accent" />
              <span>Top Communities</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <AnalyticsChart 
              data={[
                { name: 'r/cybersecurity', value: 2100000 },
                { name: 'r/privacy', value: 1800000 },
                { name: 'r/netsec', value: 850000 },
                { name: 'r/hacking', value: 720000 },
                { name: 'r/OSINT', value: 450000 },
              ]} 
              title="" 
              type="bar" 
              height={250}
            />
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="text-center">
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-primary">12</div>
            <p className="text-sm text-muted-foreground">Total Cases</p>
          </CardContent>
        </Card>
        
        <Card className="text-center">
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-forensic-accent">8</div>
            <p className="text-sm text-muted-foreground">Active Investigations</p>
          </CardContent>
        </Card>
        
        <Card className="text-center">
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-forensic-warning">156</div>
            <p className="text-sm text-muted-foreground">Evidence Items</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Dashboard;