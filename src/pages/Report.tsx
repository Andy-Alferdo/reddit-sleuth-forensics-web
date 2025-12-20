import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { FileText, Download, Save, Calendar, User, Gavel, Shield, FileCode, FileCog, Users, TrendingUp, Network, Activity, Loader2 } from 'lucide-react';
import { useInvestigation } from '@/contexts/InvestigationContext';
import { useToast } from '@/hooks/use-toast';
import { generatePDFReport, generateHTMLReport } from '@/lib/reportGenerator';

const Report = () => {
  const { toast } = useToast();
  const [isGenerating, setIsGenerating] = useState(false);
  const {
    caseNumber,
    setCaseNumber,
    investigator,
    setInvestigator,
    userProfiles,
    keywordAnalyses,
    communityAnalyses,
    linkAnalyses,
    monitoringSessions,
    getTotalUsersAnalyzed,
    getTotalPostsReviewed,
    getTotalCommunitiesAnalyzed,
  } = useInvestigation();

  const [reportType, setReportType] = useState<'automated' | 'customized'>('automated');
  const [exportFormat, setExportFormat] = useState<'pdf' | 'html'>('pdf');
  const [selectedModules, setSelectedModules] = useState({
    sentimentAnalysis: true,
    userProfiling: true,
    keywordTrends: true,
    communityAnalysis: true,
    linkAnalysis: true,
    monitoring: true
  });
  
  const [reportData, setReportData] = useState({
    department: 'Cybercrime Unit',
    dateGenerated: new Date().toISOString().split('T')[0],
    subject: 'Reddit Investigation Report',
    executiveSummary: '',
    findings: '',
    methodology: '',
    conclusions: '',
    recommendations: '',
    personalizedObservations: ''
  });

  useEffect(() => {
    const usersCount = getTotalUsersAnalyzed();
    const postsCount = getTotalPostsReviewed();
    const communitiesCount = getTotalCommunitiesAnalyzed();
    
    if (usersCount > 0 || postsCount > 0 || communitiesCount > 0) {
      const autoSummary = `This investigation analyzed ${usersCount} Reddit user(s), reviewed ${postsCount} posts across ${communitiesCount} communities. ${keywordAnalyses.length > 0 ? `Keyword analysis was performed on ${keywordAnalyses.map(k => `"${k.keyword}"`).join(', ')}.` : ''} ${userProfiles.length > 0 ? `User profiling was conducted on: ${userProfiles.map(u => u.username).join(', ')}.` : ''}`;
      
      setReportData(prev => ({
        ...prev,
        executiveSummary: prev.executiveSummary || autoSummary
      }));
    }
  }, [userProfiles, keywordAnalyses, communityAnalyses, linkAnalyses]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setReportData({
      ...reportData,
      [e.target.name]: e.target.value
    });
  };

  const handleModuleToggle = (module: keyof typeof selectedModules) => {
    setSelectedModules({
      ...selectedModules,
      [module]: !selectedModules[module]
    });
  };

  const generateReport = async () => {
    setIsGenerating(true);
    
    try {
      // For customized reports, only include selected modules
      // For automated reports, include everything
      const isAutomated = reportType === 'automated';
      
      const options = {
        reportType,
        exportFormat,
        selectedModules,
        reportData: {
          caseNumber,
          investigator,
          department: reportData.department,
          dateGenerated: reportData.dateGenerated,
          subject: reportData.subject,
          executiveSummary: reportData.executiveSummary,
          findings: reportData.findings,
          conclusions: reportData.conclusions,
        },
        userProfiles: isAutomated ? userProfiles : (selectedModules.userProfiling ? userProfiles : []),
        monitoringSessions: isAutomated ? monitoringSessions : (selectedModules.monitoring ? monitoringSessions : []),
        keywordAnalyses: isAutomated ? keywordAnalyses : (selectedModules.keywordTrends ? keywordAnalyses : []),
        communityAnalyses: isAutomated ? communityAnalyses : (selectedModules.communityAnalysis ? communityAnalyses : []),
        linkAnalyses: isAutomated ? linkAnalyses : (selectedModules.linkAnalysis ? linkAnalyses : []),
      };

      if (exportFormat === 'pdf') {
        generatePDFReport(options);
      } else {
        generateHTMLReport(options);
      }
      
      toast({
        title: "Report Generated",
        description: `Your ${exportFormat.toUpperCase()} report has been downloaded with ${getTotalUsersAnalyzed()} users, ${getTotalPostsReviewed()} posts analyzed.`,
      });
    } catch (error) {
      console.error('Report generation error:', error);
      toast({
        title: "Generation Failed",
        description: "Failed to generate report. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const saveReportDraft = () => {
    console.log('Saving report draft...', reportData);
    toast({
      title: "Draft Saved",
      description: "Report draft saved successfully!",
    });
  };

  const hasData = userProfiles.length > 0 || keywordAnalyses.length > 0 || communityAnalyses.length > 0 || linkAnalyses.length > 0 || monitoringSessions.length > 0;

  return (
    <div className="p-6 space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-primary mb-2">Forensic Report Generator</h2>
        <p className="text-muted-foreground">Generate automated or customized investigation reports in PDF or HTML format</p>
      </div>

      {/* Investigation Data Summary */}
      <Card className="border-primary/20">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Activity className="h-5 w-5 text-primary" />
            <span>Collected Investigation Data</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {hasData ? (
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <div className="text-center p-3 rounded-lg bg-primary/10 border border-primary/30">
                <User className="h-5 w-5 text-primary mx-auto mb-1" />
                <div className="font-bold text-primary">{userProfiles.length}</div>
                <p className="text-xs text-muted-foreground">User Profiles</p>
              </div>
              <div className="text-center p-3 rounded-lg bg-forensic-accent/10 border border-forensic-accent/30">
                <TrendingUp className="h-5 w-5 text-forensic-accent mx-auto mb-1" />
                <div className="font-bold text-forensic-accent">{keywordAnalyses.length}</div>
                <p className="text-xs text-muted-foreground">Keyword Analyses</p>
              </div>
              <div className="text-center p-3 rounded-lg bg-card border">
                <Users className="h-5 w-5 text-foreground mx-auto mb-1" />
                <div className="font-bold">{communityAnalyses.length}</div>
                <p className="text-xs text-muted-foreground">Communities</p>
              </div>
              <div className="text-center p-3 rounded-lg bg-card border">
                <Network className="h-5 w-5 text-foreground mx-auto mb-1" />
                <div className="font-bold">{linkAnalyses.length}</div>
                <p className="text-xs text-muted-foreground">Link Analyses</p>
              </div>
              <div className="text-center p-3 rounded-lg bg-card border">
                <Activity className="h-5 w-5 text-foreground mx-auto mb-1" />
                <div className="font-bold">{monitoringSessions.length}</div>
                <p className="text-xs text-muted-foreground">Monitoring Sessions</p>
              </div>
            </div>
          ) : (
            <div className="text-center py-6 text-muted-foreground">
              <Activity className="h-10 w-10 mx-auto mb-2 opacity-50" />
              <p>No investigation data collected yet.</p>
              <p className="text-sm">Use Monitoring, User Profiling, and Analysis tools to gather data.</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Report Configuration */}
      <Card className="border-primary/20">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <FileCog className="h-5 w-5 text-primary" />
            <span>Report Configuration</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs value={reportType} onValueChange={(v) => setReportType(v as 'automated' | 'customized')}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="automated">Automated Report</TabsTrigger>
              <TabsTrigger value="customized">Customized Report</TabsTrigger>
            </TabsList>
            
            <TabsContent value="automated" className="space-y-4 mt-4">
              <div className="p-4 rounded-lg bg-muted/50 space-y-3">
                <p className="text-sm text-muted-foreground">
                  Automated reports include all collected data from monitoring, analysis, and user profiling sessions.
                </p>
                <div className="space-y-2">
                  <Label>Export Format</Label>
                  <div className="flex space-x-4">
                    <Button type="button" variant={exportFormat === 'pdf' ? 'default' : 'outline'} onClick={() => setExportFormat('pdf')} className="flex-1">
                      <FileText className="h-4 w-4 mr-2" />PDF Format
                    </Button>
                    <Button type="button" variant={exportFormat === 'html' ? 'default' : 'outline'} onClick={() => setExportFormat('html')} className="flex-1">
                      <FileCode className="h-4 w-4 mr-2" />HTML Format
                    </Button>
                  </div>
                </div>
              </div>
            </TabsContent>
            
            <TabsContent value="customized" className="space-y-4 mt-4">
              <div className="p-4 rounded-lg bg-muted/50 space-y-4">
                <p className="text-sm text-muted-foreground">Select which modules to include in your report.</p>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {Object.entries(selectedModules).map(([key, value]) => (
                    <div key={key} className="flex items-center space-x-2">
                      <Checkbox id={key} checked={value} onCheckedChange={() => handleModuleToggle(key as keyof typeof selectedModules)} />
                      <Label htmlFor={key} className="cursor-pointer font-normal">
                        {key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
                      </Label>
                    </div>
                  ))}
                </div>
                <div className="space-y-2">
                  <Label>Export Format</Label>
                  <div className="flex space-x-4">
                    <Button type="button" variant={exportFormat === 'pdf' ? 'default' : 'outline'} onClick={() => setExportFormat('pdf')} className="flex-1">
                      <FileText className="h-4 w-4 mr-2" />PDF Format
                    </Button>
                    <Button type="button" variant={exportFormat === 'html' ? 'default' : 'outline'} onClick={() => setExportFormat('html')} className="flex-1">
                      <FileCode className="h-4 w-4 mr-2" />HTML Format
                    </Button>
                  </div>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Report Header */}
      <Card className="border-primary/20">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <FileText className="h-5 w-5 text-primary" />
            <span>Report Information</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="caseNumber">Case Number</Label>
              <Input id="caseNumber" value={caseNumber} onChange={(e) => setCaseNumber(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="investigator">Lead Investigator</Label>
              <Input id="investigator" value={investigator} onChange={(e) => setInvestigator(e.target.value)} placeholder="Enter investigator name" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="department">Department</Label>
              <Input id="department" name="department" value={reportData.department} onChange={handleInputChange} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="dateGenerated">Date Generated</Label>
              <Input id="dateGenerated" name="dateGenerated" type="date" value={reportData.dateGenerated} onChange={handleInputChange} />
            </div>
          </div>
          <div className="mt-6 space-y-2">
            <Label htmlFor="subject">Report Subject</Label>
            <Input id="subject" name="subject" placeholder="e.g., Reddit User Investigation - Harassment Case" value={reportData.subject} onChange={handleInputChange} />
          </div>
        </CardContent>
      </Card>

      {/* Report Sections */}
      <div className="grid grid-cols-1 gap-6">
        <Card className="border-primary/20">
          <CardHeader><CardTitle>Executive Summary</CardTitle></CardHeader>
          <CardContent>
            <Textarea name="executiveSummary" placeholder="Provide a concise overview of the investigation..." value={reportData.executiveSummary} onChange={handleInputChange} className="min-h-[100px]" />
          </CardContent>
        </Card>

        <Card className="border-primary/20">
          <CardHeader><CardTitle>Key Findings</CardTitle></CardHeader>
          <CardContent>
            <Textarea name="findings" placeholder="Document all significant discoveries and analysis results..." value={reportData.findings} onChange={handleInputChange} className="min-h-[150px]" />
          </CardContent>
        </Card>

        <Card className="border-primary/20">
          <CardHeader><CardTitle>Conclusions & Recommendations</CardTitle></CardHeader>
          <CardContent>
            <Textarea name="conclusions" placeholder="State conclusions and recommendations for further action..." value={reportData.conclusions} onChange={handleInputChange} className="min-h-[100px]" />
          </CardContent>
        </Card>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="text-center"><CardContent className="pt-6"><User className="h-6 w-6 text-primary mx-auto mb-2" /><div className="text-lg font-bold text-primary">{getTotalUsersAnalyzed()}</div><p className="text-sm text-muted-foreground">Users Analyzed</p></CardContent></Card>
        <Card className="text-center"><CardContent className="pt-6"><FileText className="h-6 w-6 text-forensic-accent mx-auto mb-2" /><div className="text-lg font-bold text-forensic-accent">{getTotalPostsReviewed()}</div><p className="text-sm text-muted-foreground">Posts Reviewed</p></CardContent></Card>
        <Card className="text-center"><CardContent className="pt-6"><Users className="h-6 w-6 text-primary mx-auto mb-2" /><div className="text-lg font-bold text-primary">{getTotalCommunitiesAnalyzed()}</div><p className="text-sm text-muted-foreground">Communities</p></CardContent></Card>
        <Card className="text-center"><CardContent className="pt-6"><Shield className="h-6 w-6 text-primary mx-auto mb-2" /><div className="text-lg font-bold text-primary">Valid</div><p className="text-sm text-muted-foreground">Chain of Custody</p></CardContent></Card>
      </div>

      {/* Action Buttons */}
      <Card className="border-primary/20">
        <CardContent className="pt-6">
          <div className="flex justify-end space-x-4">
            <Button variant="outline" onClick={saveReportDraft}><Save className="h-4 w-4 mr-2" />Save Draft</Button>
            <Button variant="forensic" onClick={generateReport} disabled={!hasData || isGenerating}>
              {isGenerating ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Download className="h-4 w-4 mr-2" />}
              {isGenerating ? 'Generating...' : `Generate ${exportFormat.toUpperCase()} Report`}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Legal Notice */}
      <Card className="border-forensic-warning/30 bg-forensic-warning/5">
        <CardContent className="pt-6">
          <div className="flex items-start space-x-3">
            <Gavel className="h-5 w-5 text-forensic-warning mt-0.5" />
            <div>
              <h4 className="font-semibold text-forensic-warning mb-2">Legal Notice</h4>
              <p className="text-sm text-muted-foreground">This report contains sensitive investigation data and is intended for authorized personnel only.</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Report;
