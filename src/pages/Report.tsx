import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { FileText, Download, Save, Calendar, User, Gavel, Shield } from 'lucide-react';

const Report = () => {
  const [reportData, setReportData] = useState({
    caseNumber: 'CASE-2023-001',
    investigator: 'Det. Sarah Johnson',
    department: 'Cybercrime Unit',
    dateGenerated: new Date().toISOString().split('T')[0],
    subject: 'Reddit User Investigation',
    executiveSummary: '',
    findings: '',
    methodology: '',
    conclusions: '',
    recommendations: ''
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setReportData({
      ...reportData,
      [e.target.name]: e.target.value
    });
  };

  const generatePDFReport = () => {
    // Simulate PDF generation
    console.log('Generating PDF report...', reportData);
    alert('PDF report generated successfully!');
  };

  const saveReportDraft = () => {
    // Simulate saving draft
    console.log('Saving report draft...', reportData);
    alert('Report draft saved successfully!');
  };

  return (
    <div className="p-6 space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-primary mb-2">Forensic Report Generator</h2>
        <p className="text-muted-foreground">Generate court-ready forensic investigation reports</p>
      </div>

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
              <Input
                id="caseNumber"
                name="caseNumber"
                value={reportData.caseNumber}
                onChange={handleInputChange}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="investigator">Lead Investigator</Label>
              <Input
                id="investigator"
                name="investigator"
                value={reportData.investigator}
                onChange={handleInputChange}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="department">Department</Label>
              <Input
                id="department"
                name="department"
                value={reportData.department}
                onChange={handleInputChange}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="dateGenerated">Date Generated</Label>
              <Input
                id="dateGenerated"
                name="dateGenerated"
                type="date"
                value={reportData.dateGenerated}
                onChange={handleInputChange}
              />
            </div>
          </div>
          
          <div className="mt-6 space-y-2">
            <Label htmlFor="subject">Report Subject</Label>
            <Input
              id="subject"
              name="subject"
              placeholder="e.g., Reddit User Investigation - Harassment Case"
              value={reportData.subject}
              onChange={handleInputChange}
            />
          </div>
        </CardContent>
      </Card>

      {/* Report Sections */}
      <div className="grid grid-cols-1 gap-6">
        <Card className="border-primary/20">
          <CardHeader>
            <CardTitle>Executive Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <Textarea
              name="executiveSummary"
              placeholder="Provide a concise overview of the investigation, key findings, and conclusions..."
              value={reportData.executiveSummary}
              onChange={handleInputChange}
              className="min-h-[100px]"
            />
          </CardContent>
        </Card>

        <Card className="border-primary/20">
          <CardHeader>
            <CardTitle>Investigation Methodology</CardTitle>
          </CardHeader>
          <CardContent>
            <Textarea
              name="methodology"
              placeholder="Detail the methods, tools, and procedures used during the investigation..."
              value={reportData.methodology}
              onChange={handleInputChange}
              className="min-h-[120px]"
            />
          </CardContent>
        </Card>

        <Card className="border-primary/20">
          <CardHeader>
            <CardTitle>Key Findings</CardTitle>
          </CardHeader>
          <CardContent>
            <Textarea
              name="findings"
              placeholder="Document all significant discoveries, evidence collected, and analysis results..."
              value={reportData.findings}
              onChange={handleInputChange}
              className="min-h-[150px]"
            />
          </CardContent>
        </Card>

        <Card className="border-primary/20">
          <CardHeader>
            <CardTitle>Conclusions</CardTitle>
          </CardHeader>
          <CardContent>
            <Textarea
              name="conclusions"
              placeholder="State the final conclusions based on the evidence and analysis performed..."
              value={reportData.conclusions}
              onChange={handleInputChange}
              className="min-h-[100px]"
            />
          </CardContent>
        </Card>

        <Card className="border-primary/20">
          <CardHeader>
            <CardTitle>Recommendations</CardTitle>
          </CardHeader>
          <CardContent>
            <Textarea
              name="recommendations"
              placeholder="Provide recommendations for further action, legal proceedings, or additional investigation..."
              value={reportData.recommendations}
              onChange={handleInputChange}
              className="min-h-[100px]"
            />
          </CardContent>
        </Card>
      </div>

      {/* Report Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="text-center">
          <CardContent className="pt-6">
            <User className="h-6 w-6 text-primary mx-auto mb-2" />
            <div className="text-lg font-bold text-primary">5</div>
            <p className="text-sm text-muted-foreground">Users Analyzed</p>
          </CardContent>
        </Card>
        
        <Card className="text-center">
          <CardContent className="pt-6">
            <FileText className="h-6 w-6 text-forensic-accent mx-auto mb-2" />
            <div className="text-lg font-bold text-forensic-accent">247</div>
            <p className="text-sm text-muted-foreground">Posts Reviewed</p>
          </CardContent>
        </Card>
        
        <Card className="text-center">
          <CardContent className="pt-6">
            <Calendar className="h-6 w-6 text-forensic-warning mx-auto mb-2" />
            <div className="text-lg font-bold text-forensic-warning">15</div>
            <p className="text-sm text-muted-foreground">Days Investigated</p>
          </CardContent>
        </Card>
        
        <Card className="text-center">
          <CardContent className="pt-6">
            <Shield className="h-6 w-6 text-primary mx-auto mb-2" />
            <div className="text-lg font-bold text-primary">Valid</div>
            <p className="text-sm text-muted-foreground">Chain of Custody</p>
          </CardContent>
        </Card>
      </div>

      {/* Action Buttons */}
      <Card className="border-primary/20">
        <CardContent className="pt-6">
          <div className="flex justify-end space-x-4">
            <Button variant="outline" onClick={saveReportDraft}>
              <Save className="h-4 w-4 mr-2" />
              Save Draft
            </Button>
            <Button variant="forensic" onClick={generatePDFReport}>
              <Download className="h-4 w-4 mr-2" />
              Generate PDF Report
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
              <p className="text-sm text-muted-foreground">
                This report contains sensitive investigation data and is intended for authorized personnel only. 
                Ensure proper chain of custody protocols are followed and all evidence handling procedures comply 
                with applicable legal standards and regulations.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Report;