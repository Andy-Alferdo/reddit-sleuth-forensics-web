/**
 * Services Index - Export all OOP service classes
 */
export { BaseService } from './BaseService';
export { RedditService, redditService } from './RedditService';
export { AuthService, authService } from './AuthService';
export { AnalysisService, analysisService } from './AnalysisService';
export { CaseService, caseService } from './CaseService';

// Export types
export type { RedditUser, RedditPost, RedditComment, UserProfileResult, CommunityResult } from './RedditService';
export type { AuthUser } from './AuthService';
export type { SentimentResult, AnalysisResult, ActivityPattern } from './AnalysisService';
export type { Case, CaseFormData } from './CaseService';
