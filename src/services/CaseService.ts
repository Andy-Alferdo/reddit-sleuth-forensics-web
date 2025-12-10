/**
 * CaseService - Handles case management operations
 * Implements OOP principles: Encapsulation, Single Responsibility
 */
import { BaseService } from './BaseService';

export interface Case {
  id: number;
  name: string;
  description: string;
  date: string;
  status: 'Active' | 'Closed' | 'Pending';
  caseNumber?: string;
  leadInvestigator?: string;
  department?: string;
  priority?: 'low' | 'medium' | 'high';
}

export interface CaseFormData {
  caseNumber: string;
  caseName: string;
  description: string;
  leadInvestigator: string;
  department: string;
  priority: string;
  startDate: string;
}

export class CaseService extends BaseService {
  private static instance: CaseService;
  private readonly STORAGE_KEY = 'selectedCase';
  private readonly CASES_KEY = 'savedCases';

  private constructor() {
    super('CaseService');
  }

  /**
   * Singleton pattern - ensures only one instance exists
   */
  public static getInstance(): CaseService {
    if (!CaseService.instance) {
      CaseService.instance = new CaseService();
    }
    return CaseService.instance;
  }

  /**
   * Get all saved cases
   */
  public getAllCases(): Case[] {
    try {
      const casesJson = localStorage.getItem(this.CASES_KEY);
      if (casesJson) {
        return JSON.parse(casesJson);
      }
      // Return default cases
      return this.getDefaultCases();
    } catch (error) {
      this.log('Error getting cases', { error });
      return this.getDefaultCases();
    }
  }

  /**
   * Get currently selected case
   */
  public getSelectedCase(): Case | null {
    try {
      const caseJson = localStorage.getItem(this.STORAGE_KEY);
      if (caseJson) {
        return JSON.parse(caseJson);
      }
      return null;
    } catch (error) {
      this.log('Error getting selected case', { error });
      return null;
    }
  }

  /**
   * Select a case
   */
  public selectCase(caseData: Case): void {
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(caseData));
      this.log('Case selected', { caseId: caseData.id });
    } catch (error) {
      this.handleError(error, 'selectCase');
    }
  }

  /**
   * Clear selected case
   */
  public clearSelectedCase(): void {
    localStorage.removeItem(this.STORAGE_KEY);
    this.log('Selected case cleared');
  }

  /**
   * Create a new case
   */
  public createCase(formData: CaseFormData): Case {
    try {
      const cases = this.getAllCases();
      const newCase: Case = {
        id: Date.now(),
        name: formData.caseName || `Case #${formData.caseNumber}`,
        description: formData.description,
        date: formData.startDate,
        status: 'Active',
        caseNumber: formData.caseNumber,
        leadInvestigator: formData.leadInvestigator,
        department: formData.department,
        priority: formData.priority as 'low' | 'medium' | 'high'
      };

      cases.push(newCase);
      localStorage.setItem(this.CASES_KEY, JSON.stringify(cases));
      
      this.log('Case created', { caseId: newCase.id });
      return newCase;

    } catch (error) {
      this.handleError(error, 'createCase');
    }
  }

  /**
   * Update case status
   */
  public updateCaseStatus(caseId: number, status: Case['status']): void {
    try {
      const cases = this.getAllCases();
      const caseIndex = cases.findIndex(c => c.id === caseId);
      
      if (caseIndex !== -1) {
        cases[caseIndex].status = status;
        localStorage.setItem(this.CASES_KEY, JSON.stringify(cases));
        this.log('Case status updated', { caseId, status });
      }

    } catch (error) {
      this.handleError(error, 'updateCaseStatus');
    }
  }

  /**
   * Delete a case
   */
  public deleteCase(caseId: number): void {
    try {
      const cases = this.getAllCases();
      const filteredCases = cases.filter(c => c.id !== caseId);
      localStorage.setItem(this.CASES_KEY, JSON.stringify(filteredCases));
      
      // Clear selected case if it was deleted
      const selectedCase = this.getSelectedCase();
      if (selectedCase?.id === caseId) {
        this.clearSelectedCase();
      }
      
      this.log('Case deleted', { caseId });

    } catch (error) {
      this.handleError(error, 'deleteCase');
    }
  }

  /**
   * Get status color for display
   */
  public getStatusColor(status: string): string {
    switch (status) {
      case 'Active':
        return 'text-green-500';
      case 'Closed':
        return 'text-gray-500';
      case 'Pending':
        return 'text-yellow-500';
      default:
        return 'text-gray-500';
    }
  }

  /**
   * Check if a case is selected
   */
  public hasSelectedCase(): boolean {
    return this.getSelectedCase() !== null;
  }

  /**
   * Get default cases
   */
  private getDefaultCases(): Case[] {
    return [
      { 
        id: 1, 
        name: "Case #2023-001", 
        description: "Reddit harassment investigation", 
        date: "2023-10-15", 
        status: "Active" 
      },
      { 
        id: 2, 
        name: "Case #2023-002", 
        description: "Fraud detection analysis", 
        date: "2023-10-12", 
        status: "Closed" 
      },
      { 
        id: 3, 
        name: "Case #2023-003", 
        description: "Missing person social media trace", 
        date: "2023-10-08", 
        status: "Pending" 
      },
    ];
  }
}

// Export singleton instance
export const caseService = CaseService.getInstance();
