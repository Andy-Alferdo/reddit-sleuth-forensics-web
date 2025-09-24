import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, FolderOpen, Eye, TrendingUp, Users } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const Dashboard = () => {
  const navigate = useNavigate();
  const [hoveredCase, setHoveredCase] = useState<number | null>(null);

  const savedCases = [
    { id: 1, name: "Case #2023-001", description: "Reddit harassment investigation", date: "2023-10-15", status: "Active" },
    { id: 2, name: "Case #2023-002", description: "Fraud detection analysis", date: "2023-10-12", status: "Closed" },
    { id: 3, name: "Case #2023-003", description: "Missing person social media trace", date: "2023-10-08", status: "Pending" },
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Active': return 'text-forensic-accent';
      case 'Closed': return 'text-muted-foreground';
      case 'Pending': return 'text-forensic-warning';
      default: return 'text-foreground';
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-primary mb-2">Case Management</h2>
        <p className="text-muted-foreground">Manage and track your forensic investigations</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="border-primary/20">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Plus className="h-5 w-5 text-primary" />
              <span>Create New Case</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center space-y-4">
              <div className="bg-primary/10 rounded-full w-16 h-16 flex items-center justify-center mx-auto">
                <Plus className="h-8 w-8 text-primary" />
              </div>
              <p className="text-muted-foreground">
                Start a new forensic investigation case
              </p>
              <Button 
                variant="forensic" 
                className="w-full"
                onClick={() => navigate('/new-case')}
              >
                Create New Case
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="border-primary/20">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <FolderOpen className="h-5 w-5 text-primary" />
              <span>Active Cases</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {savedCases.map((case_) => (
                <div
                  key={case_.id}
                  className="relative p-3 rounded-lg bg-card border border-border hover:border-primary/50 transition-all duration-200 cursor-pointer"
                  onMouseEnter={() => setHoveredCase(case_.id)}
                  onMouseLeave={() => setHoveredCase(null)}
                  onClick={() => {
                    // Set selected case and navigate to monitoring
                    localStorage.setItem('selectedCase', JSON.stringify(case_));
                    navigate('/monitoring');
                  }}
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-semibold text-foreground">{case_.name}</h3>
                      <p className="text-sm text-muted-foreground">{case_.description}</p>
                      <p className="text-xs text-muted-foreground mt-1">{case_.date}</p>
                    </div>
                    <span className={`text-sm font-medium ${getStatusColor(case_.status)}`}>
                      {case_.status}
                    </span>
                  </div>
                  
                  {hoveredCase === case_.id && (
                    <div className="absolute top-2 right-2 flex space-x-1">
                      <Button size="sm" variant="ghost" className="h-6 w-6 p-0">
                        <Eye className="h-3 w-3" />
                      </Button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Trends and Analytics Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="border-primary/20">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <TrendingUp className="h-5 w-5 text-primary" />
              <span>Trending Topics</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                <span className="font-medium">#cybersecurity</span>
                <span className="text-sm text-forensic-accent">+145%</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                <span className="font-medium">#digitalforensics</span>
                <span className="text-sm text-forensic-accent">+89%</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                <span className="font-medium">#privacy</span>
                <span className="text-sm text-forensic-warning">+67%</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-primary/20">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Users className="h-5 w-5 text-primary" />
              <span>Top Communities</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                <span className="font-medium">r/cybersecurity</span>
                <span className="text-sm text-muted-foreground">2.1M members</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                <span className="font-medium">r/privacy</span>
                <span className="text-sm text-muted-foreground">1.8M members</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                <span className="font-medium">r/netsec</span>
                <span className="text-sm text-muted-foreground">850K members</span>
              </div>
            </div>
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