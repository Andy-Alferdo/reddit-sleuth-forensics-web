import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { ArrowLeft, Save, Loader2, Shield, Lock } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import { useInvestigation } from '@/contexts/InvestigationContext';
import { useAuditLog } from '@/hooks/useAuditLog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';

const NewCase = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { createCase } = useInvestigation();
  const { logAction } = useAuditLog();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [caseNumber, setCaseNumber] = useState('');
  const [formData, setFormData] = useState({
    caseName: '',
    description: '',
    investigator: '',
    department: '',
    startDate: new Date().toISOString().split('T')[0],
    isSensitive: false,
    casePassword: '',
    confirmPassword: '',
    cacheDurationDays: '30',
  });

  // Generate case number on mount
  useEffect(() => {
    const generateCaseNumber = async () => {
      const currentYear = new Date().getFullYear();
      const yearPrefix = `CASE-${currentYear}-`;
      
      // Fetch existing cases for this year to determine next number
      const { data: existingCases } = await supabase
        .from('investigation_cases')
        .select('case_number')
        .like('case_number', `${yearPrefix}%`)
        .order('case_number', { ascending: false })
        .limit(1);
      
      let nextNumber = 1;
      if (existingCases && existingCases.length > 0) {
        const lastCaseNumber = existingCases[0].case_number;
        const lastNumber = parseInt(lastCaseNumber.split('-').pop() || '0', 10);
        nextNumber = lastNumber + 1;
      }
      
      setCaseNumber(`${yearPrefix}${String(nextNumber).padStart(3, '0')}`);
    };
    
    generateCaseNumber();
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSwitchChange = (checked: boolean) => {
    setFormData({
      ...formData,
      isSensitive: checked,
      casePassword: checked ? formData.casePassword : '',
      confirmPassword: checked ? formData.confirmPassword : '',
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!caseNumber || !formData.caseName) {
      toast({
        title: "Validation Error",
        description: "Case number and case name are required.",
        variant: "destructive",
      });
      return;
    }

    if (formData.isSensitive) {
      if (!formData.casePassword || formData.casePassword.length < 8) {
        toast({
          title: "Validation Error",
          description: "Sensitive cases require a password (min 8 characters).",
          variant: "destructive",
        });
        return;
      }
      if (formData.casePassword !== formData.confirmPassword) {
        toast({
          title: "Validation Error",
          description: "Passwords do not match.",
          variant: "destructive",
        });
        return;
      }
    }
    
    setIsSubmitting(true);
    
    try {
      const newCase = await createCase({
        caseNumber: caseNumber,
        caseName: formData.caseName,
        description: formData.description,
        leadInvestigator: formData.investigator,
        department: formData.department,
        priority: 'medium',
        isSensitive: formData.isSensitive,
        casePassword: formData.isSensitive ? formData.casePassword : undefined,
        cacheDurationDays: parseInt(formData.cacheDurationDays),
      });
      
      if (newCase) {
        await logAction({
          actionType: 'case_create',
          resourceType: 'case',
          resourceId: newCase.id,
          details: { 
            case_number: caseNumber, 
            is_sensitive: formData.isSensitive,
          },
        });

        toast({
          title: "Case Created Successfully",
          description: `Case ${caseNumber} has been created and is ready for investigation.`,
        });
        navigate('/dashboard');
      } else {
        throw new Error('Failed to create case');
      }
    } catch (err: any) {
      console.error('Failed to create case:', err);
      toast({
        title: "Error Creating Case",
        description: err.message || "Failed to create case. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex items-center space-x-4 mb-6">
        <Button 
          variant="ghost" 
          onClick={() => navigate('/dashboard')}
          className="flex items-center space-x-2"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Back to Dashboard</span>
        </Button>
      </div>

      <Card className="border-primary/20">
        <CardHeader>
          <CardTitle className="text-2xl text-primary">Create New Investigation Case</CardTitle>
          <p className="text-muted-foreground">
            Fill in the details below to start a new forensic investigation case
          </p>
        </CardHeader>
        
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="caseNumber">Case Number *</Label>
                <Input
                  id="caseNumber"
                  name="caseNumber"
                  placeholder="e.g., CASE-2025-001"
                  value={caseNumber}
                  readOnly
                  className="bg-muted"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="caseName">Case Name *</Label>
                <Input
                  id="caseName"
                  name="caseName"
                  placeholder="e.g., Anti-Organization Propaganda Investigation"
                  value={formData.caseName}
                  onChange={handleInputChange}
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Case Description</Label>
              <Textarea
                id="description"
                name="description"
                placeholder="Provide a detailed description of the case, including initial findings and objectives..."
                value={formData.description}
                onChange={handleInputChange}
                className="min-h-[120px]"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="investigator">Investigator</Label>
                <Input
                  id="investigator"
                  name="investigator"
                  placeholder="Enter investigator name"
                  value={formData.investigator}
                  onChange={handleInputChange}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="department">Department</Label>
                <Input
                  id="department"
                  name="department"
                  placeholder="e.g., Cybercrime Unit"
                  value={formData.department}
                  onChange={handleInputChange}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="startDate">Start Date</Label>
                <Input
                  id="startDate"
                  name="startDate"
                  type="text"
                  value={formData.startDate}
                  readOnly
                  className="bg-muted"
                />
              </div>
            </div>

            {/* Security Section */}
            <div className="border border-primary/20 rounded-lg p-4 space-y-4">
              <div className="flex items-center gap-2">
                <Shield className="w-5 h-5 text-primary" />
                <h3 className="font-semibold">Case Security</h3>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="isSensitive">Mark as Sensitive Case</Label>
                  <p className="text-sm text-muted-foreground">
                    Sensitive cases require a password to reopen
                  </p>
                </div>
                <Switch
                  id="isSensitive"
                  checked={formData.isSensitive}
                  onCheckedChange={handleSwitchChange}
                />
              </div>

              {formData.isSensitive && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-primary/10">
                  <div className="space-y-2">
                    <Label htmlFor="casePassword">Case Password *</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        id="casePassword"
                        name="casePassword"
                        type="password"
                        placeholder="Min 8 characters"
                        value={formData.casePassword}
                        onChange={handleInputChange}
                        className="pl-10"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="confirmPassword">Confirm Password *</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        id="confirmPassword"
                        name="confirmPassword"
                        type="password"
                        placeholder="Confirm password"
                        value={formData.confirmPassword}
                        onChange={handleInputChange}
                        className="pl-10"
                      />
                    </div>
                  </div>
                </div>
              )}

              <div className="space-y-2 pt-4 border-t border-primary/10">
                <Label htmlFor="cacheDurationDays">Analysis Cache Duration</Label>
                <Select 
                  value={formData.cacheDurationDays} 
                  onValueChange={(value) => setFormData({ ...formData, cacheDurationDays: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="7">7 Days</SelectItem>
                    <SelectItem value="30">30 Days</SelectItem>
                    <SelectItem value="90">90 Days</SelectItem>
                    <SelectItem value="365">1 Year</SelectItem>
                    <SelectItem value="0">Never Expire</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  How long to cache sentiment and analysis results before re-running
                </p>
              </div>
            </div>

            <div className="flex justify-end space-x-4 pt-6">
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => navigate('/dashboard')}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button 
                type="submit" 
                variant="forensic" 
                className="flex items-center space-x-2"
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Creating...</span>
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4" />
                    <span>Create Case</span>
                  </>
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default NewCase;