import React, { createContext, useContext, useState, ReactNode, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

// Types for the investigation data
interface SentimentItem {
  text: string;
  sentiment: 'positive' | 'negative' | 'neutral';
  explanation: string;
}

interface UserProfileData {
  username: string;
  accountAge: string;
  totalKarma: number;
  postKarma: number;
  commentKarma: number;
  activeSubreddits: any[];
  activityPattern: {
    mostActiveHour: string;
    mostActiveDay: string;
    timezone: string;
  };
  sentimentAnalysis: { positive: number; neutral: number; negative: number };
  postSentiments: SentimentItem[];
  commentSentiments: SentimentItem[];
  locationIndicators: string[];
  behaviorPatterns: string[];
  wordCloud: any[];
  analyzedAt?: string;
}

interface MonitoringData {
  searchType: 'user' | 'community';
  targetName: string;
  profileData: any;
  activities: any[];
  wordCloudData: any[];
  startedAt: string;
  newActivityCount: number;
}

interface KeywordAnalysisData {
  keyword: string;
  totalMentions: number;
  topSubreddits: any[];
  wordCloud: any[];
  trendData: any[];
  recentPosts: any[];
  sentimentChartData: any[];
  postSentiments: SentimentItem[];
  analyzedAt: string;
}

interface CommunityAnalysisData {
  name: string;
  subscribers: number;
  activeUsers: number;
  description: string;
  created: string;
  wordCloud: any[];
  topAuthors: any[];
  activityData: any[];
  recentPosts: any[];
  sentimentChartData: any[];
  postSentiments: SentimentItem[];
  stats: any;
  analyzedAt: string;
}

interface LinkAnalysisData {
  primaryUser: string;
  totalKarma: number;
  userToCommunities: any[];
  communityCrossover: any[];
  communityDistribution: any[];
  networkMetrics: any;
  analyzedAt: string;
}

interface CaseData {
  id: string;
  case_number: string;
  case_name: string;
  description?: string;
  lead_investigator?: string;
  department?: string;
  priority: string;
  status: string;
  created_at: string;
  updated_at: string;
}

interface InvestigationContextType {
  // Case management
  currentCase: CaseData | null;
  setCurrentCase: (caseData: CaseData | null) => void;
  cases: CaseData[];
  loadCases: () => Promise<void>;
  createCase: (caseData: any) => Promise<CaseData | null>;
  isLoadingCases: boolean;
  
  // Investigation metadata (backward compatibility)
  caseNumber: string;
  setCaseNumber: (num: string) => void;
  investigator: string;
  setInvestigator: (name: string) => void;
  
  // User profiling data
  userProfiles: UserProfileData[];
  addUserProfile: (profile: UserProfileData) => void;
  saveUserProfileToDb: (profile: UserProfileData) => Promise<void>;
  clearUserProfiles: () => void;
  
  // Monitoring data
  monitoringSessions: MonitoringData[];
  addMonitoringSession: (session: MonitoringData) => void;
  saveMonitoringSessionToDb: (session: MonitoringData) => Promise<void>;
  clearMonitoringSessions: () => void;
  
  // Keyword analysis data
  keywordAnalyses: KeywordAnalysisData[];
  addKeywordAnalysis: (analysis: KeywordAnalysisData) => void;
  saveKeywordAnalysisToDb: (analysis: KeywordAnalysisData) => Promise<void>;
  clearKeywordAnalyses: () => void;
  
  // Community analysis data
  communityAnalyses: CommunityAnalysisData[];
  addCommunityAnalysis: (analysis: CommunityAnalysisData) => void;
  saveCommunityAnalysisToDb: (analysis: CommunityAnalysisData) => Promise<void>;
  clearCommunityAnalyses: () => void;
  
  // Link analysis data
  linkAnalyses: LinkAnalysisData[];
  addLinkAnalysis: (analysis: LinkAnalysisData) => void;
  saveLinkAnalysisToDb: (analysis: LinkAnalysisData) => Promise<void>;
  clearLinkAnalyses: () => void;
  
  // Summary stats
  getTotalUsersAnalyzed: () => number;
  getTotalPostsReviewed: () => number;
  getTotalCommunitiesAnalyzed: () => number;
  
  // Load case data from DB
  loadCaseData: (caseId: string) => Promise<void>;
  
  // Clear all data
  clearAllData: () => void;
}

const InvestigationContext = createContext<InvestigationContextType | undefined>(undefined);

export const InvestigationProvider = ({ children }: { children: ReactNode }) => {
  const [currentCase, setCurrentCase] = useState<CaseData | null>(null);
  const [cases, setCases] = useState<CaseData[]>([]);
  const [isLoadingCases, setIsLoadingCases] = useState(false);
  
  const [caseNumber, setCaseNumber] = useState(`CASE-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 1000)).padStart(3, '0')}`);
  const [investigator, setInvestigator] = useState('');
  const [userProfiles, setUserProfiles] = useState<UserProfileData[]>([]);
  const [monitoringSessions, setMonitoringSessions] = useState<MonitoringData[]>([]);
  const [keywordAnalyses, setKeywordAnalyses] = useState<KeywordAnalysisData[]>([]);
  const [communityAnalyses, setCommunityAnalyses] = useState<CommunityAnalysisData[]>([]);
  const [linkAnalyses, setLinkAnalyses] = useState<LinkAnalysisData[]>([]);

  // Helper to call data-store backend function
  const callDataStore = useCallback(async (operation: string, data?: any, caseId?: string) => {
    const { data: session } = await supabase.auth.getSession();
    const headers: Record<string, string> = {};
    if (session?.session?.access_token) {
      headers['Authorization'] = `Bearer ${session.session.access_token}`;
    }

    const { data: result, error } = await supabase.functions.invoke('data-store', {
      body: { operation, data, caseId },
      headers,
    });

    if (error) throw error;
    if (!result.success) throw new Error(result.error);
    return result.data;
  }, []);

  const emitCaseDataUpdated = useCallback((caseId: string, kind: string) => {
    window.dispatchEvent(
      new CustomEvent('case-data-updated', {
        detail: { caseId, kind, ts: Date.now() },
      })
    );
  }, []);

  // Keep current case in sync with localStorage selection (single-tab safe)
  useEffect(() => {
    const syncFromStorage = () => {
      const raw = localStorage.getItem('selectedCase');
      if (!raw) {
        setCurrentCase(null);
        return;
      }
      try {
        const parsed = JSON.parse(raw);
        if (parsed?.id) setCurrentCase(parsed);
      } catch {
        // ignore
      }
    };

    syncFromStorage();
    window.addEventListener('storage', syncFromStorage);
    return () => window.removeEventListener('storage', syncFromStorage);
  }, []);

  // Load all cases for current user
  const loadCases = useCallback(async () => {
    setIsLoadingCases(true);
    try {
      const casesData = await callDataStore('getCases');
      setCases(casesData || []);
    } catch (err) {
      console.error('Failed to load cases:', err);
    } finally {
      setIsLoadingCases(false);
    }
  }, [callDataStore]);

  // Create a new case
  const createCase = useCallback(async (caseData: any): Promise<CaseData | null> => {
    try {
      const newCase = await callDataStore('createCase', caseData);
      setCases(prev => [newCase, ...prev]);
      setCurrentCase(newCase);
      setCaseNumber(newCase.case_number);
      setInvestigator(newCase.lead_investigator || '');
      return newCase;
    } catch (err) {
      console.error('Failed to create case:', err);
      return null;
    }
  }, [callDataStore]);

  // Load full case data from DB
  const loadCaseData = useCallback(async (caseId: string) => {
    try {
      const fullData = await callDataStore('getCaseFullData', undefined, caseId);
      
      if (fullData.case) {
        setCurrentCase(fullData.case);
        setCaseNumber(fullData.case.case_number);
        setInvestigator(fullData.case.lead_investigator || '');
      }
      
      // Transform DB data back to local state format
      if (fullData.profiles) {
        setUserProfiles(fullData.profiles.map((p: any) => ({
          username: p.username,
          accountAge: p.account_age,
          totalKarma: p.total_karma,
          postKarma: p.post_karma,
          commentKarma: p.comment_karma,
          activeSubreddits: p.active_subreddits || [],
          activityPattern: p.activity_pattern || {},
          sentimentAnalysis: p.sentiment_analysis || {},
          postSentiments: p.post_sentiments || [],
          commentSentiments: p.comment_sentiments || [],
          locationIndicators: p.location_indicators || [],
          behaviorPatterns: p.behavior_patterns || [],
          wordCloud: p.word_cloud || [],
          analyzedAt: p.analyzed_at,
        })));
      }
      
      if (fullData.sessions) {
        setMonitoringSessions(fullData.sessions.map((s: any) => ({
          searchType: s.search_type,
          targetName: s.target_name,
          profileData: s.profile_data,
          activities: s.activities || [],
          wordCloudData: s.word_cloud_data || [],
          startedAt: s.started_at,
          newActivityCount: s.new_activity_count,
        })));
      }
      
      if (fullData.analyses) {
        const keyword = fullData.analyses.filter((a: any) => a.analysis_type === 'keyword');
        const community = fullData.analyses.filter((a: any) => a.analysis_type === 'community');
        const link = fullData.analyses.filter((a: any) => a.analysis_type === 'link');
        
        setKeywordAnalyses(keyword.map((k: any) => ({
          ...k.result_data,
          analyzedAt: k.analyzed_at,
        })));
        
        setCommunityAnalyses(community.map((c: any) => ({
          ...c.result_data,
          analyzedAt: c.analyzed_at,
        })));
        
        setLinkAnalyses(link.map((l: any) => ({
          ...l.result_data,
          analyzedAt: l.analyzed_at,
        })));
      }
    } catch (err) {
      console.error('Failed to load case data:', err);
    }
  }, [callDataStore]);

  // Local state management (for in-memory tracking)
  const addUserProfile = (profile: UserProfileData) => {
    setUserProfiles(prev => {
      const existing = prev.findIndex(p => p.username === profile.username);
      if (existing >= 0) {
        const updated = [...prev];
        updated[existing] = { ...profile, analyzedAt: new Date().toISOString() };
        return updated;
      }
      return [...prev, { ...profile, analyzedAt: new Date().toISOString() }];
    });
  };

  // Save to database
  const saveUserProfileToDb = useCallback(async (profile: UserProfileData) => {
    if (!currentCase?.id) return;
    await callDataStore('saveUserProfile', profile, currentCase.id);
    emitCaseDataUpdated(currentCase.id, 'userProfiles');
  }, [currentCase, callDataStore, emitCaseDataUpdated]);

  const addMonitoringSession = (session: MonitoringData) => {
    setMonitoringSessions(prev => [...prev, session]);
  };

  const saveMonitoringSessionToDb = useCallback(async (session: MonitoringData) => {
    if (!currentCase?.id) return;
    await callDataStore('saveMonitoringSession', session, currentCase.id);
    emitCaseDataUpdated(currentCase.id, 'monitoringSessions');
  }, [currentCase, callDataStore, emitCaseDataUpdated]);

  const addKeywordAnalysis = (analysis: KeywordAnalysisData) => {
    setKeywordAnalyses(prev => {
      const existing = prev.findIndex(a => a.keyword === analysis.keyword);
      if (existing >= 0) {
        const updated = [...prev];
        updated[existing] = { ...analysis, analyzedAt: new Date().toISOString() };
        return updated;
      }
      return [...prev, { ...analysis, analyzedAt: new Date().toISOString() }];
    });
  };

  const saveKeywordAnalysisToDb = useCallback(async (analysis: KeywordAnalysisData) => {
    if (!currentCase?.id) return;
    await callDataStore('saveAnalysis', {
      analysisType: 'keyword',
      target: analysis.keyword,
      resultData: analysis,
      sentimentData: analysis.sentimentChartData,
    }, currentCase.id);
    emitCaseDataUpdated(currentCase.id, 'keywordAnalyses');
  }, [currentCase, callDataStore, emitCaseDataUpdated]);

  const addCommunityAnalysis = (analysis: CommunityAnalysisData) => {
    setCommunityAnalyses(prev => {
      const existing = prev.findIndex(a => a.name === analysis.name);
      if (existing >= 0) {
        const updated = [...prev];
        updated[existing] = { ...analysis, analyzedAt: new Date().toISOString() };
        return updated;
      }
      return [...prev, { ...analysis, analyzedAt: new Date().toISOString() }];
    });
  };

  const saveCommunityAnalysisToDb = useCallback(async (analysis: CommunityAnalysisData) => {
    if (!currentCase?.id) return;
    await callDataStore('saveAnalysis', {
      analysisType: 'community',
      target: analysis.name,
      resultData: analysis,
      sentimentData: analysis.sentimentChartData,
    }, currentCase.id);
    emitCaseDataUpdated(currentCase.id, 'communityAnalyses');
  }, [currentCase, callDataStore, emitCaseDataUpdated]);

  const addLinkAnalysis = (analysis: LinkAnalysisData) => {
    setLinkAnalyses(prev => {
      const existing = prev.findIndex(a => a.primaryUser === analysis.primaryUser);
      if (existing >= 0) {
        const updated = [...prev];
        updated[existing] = { ...analysis, analyzedAt: new Date().toISOString() };
        return updated;
      }
      return [...prev, { ...analysis, analyzedAt: new Date().toISOString() }];
    });
  };

  const saveLinkAnalysisToDb = useCallback(async (analysis: LinkAnalysisData) => {
    if (!currentCase?.id) return;
    await callDataStore('saveAnalysis', {
      analysisType: 'link',
      target: analysis.primaryUser,
      resultData: analysis,
    }, currentCase.id);
    emitCaseDataUpdated(currentCase.id, 'linkAnalyses');
  }, [currentCase, callDataStore, emitCaseDataUpdated]);

  const clearUserProfiles = () => setUserProfiles([]);
  const clearMonitoringSessions = () => setMonitoringSessions([]);
  const clearKeywordAnalyses = () => setKeywordAnalyses([]);
  const clearCommunityAnalyses = () => setCommunityAnalyses([]);
  const clearLinkAnalyses = () => setLinkAnalyses([]);

  const getTotalUsersAnalyzed = () => {
    const users = new Set([
      ...userProfiles.map(p => p.username),
      ...linkAnalyses.map(l => l.primaryUser),
      ...monitoringSessions.filter(m => m.searchType === 'user').map(m => m.targetName)
    ]);
    return users.size;
  };

  const getTotalPostsReviewed = () => {
    let count = 0;
    keywordAnalyses.forEach(k => count += k.recentPosts?.length || 0);
    communityAnalyses.forEach(c => count += c.recentPosts?.length || 0);
    monitoringSessions.forEach(m => count += m.activities?.filter(a => a.type === 'post').length || 0);
    return count;
  };

  const getTotalCommunitiesAnalyzed = () => {
    const communities = new Set([
      ...communityAnalyses.map(c => c.name),
      ...monitoringSessions.filter(m => m.searchType === 'community').map(m => m.targetName)
    ]);
    return communities.size;
  };

  const clearAllData = () => {
    setCurrentCase(null);
    setUserProfiles([]);
    setMonitoringSessions([]);
    setKeywordAnalyses([]);
    setCommunityAnalyses([]);
    setLinkAnalyses([]);
  };

  return (
    <InvestigationContext.Provider value={{
      currentCase,
      setCurrentCase,
      cases,
      loadCases,
      createCase,
      isLoadingCases,
      caseNumber,
      setCaseNumber,
      investigator,
      setInvestigator,
      userProfiles,
      addUserProfile,
      saveUserProfileToDb,
      clearUserProfiles,
      monitoringSessions,
      addMonitoringSession,
      saveMonitoringSessionToDb,
      clearMonitoringSessions,
      keywordAnalyses,
      addKeywordAnalysis,
      saveKeywordAnalysisToDb,
      clearKeywordAnalyses,
      communityAnalyses,
      addCommunityAnalysis,
      saveCommunityAnalysisToDb,
      clearCommunityAnalyses,
      linkAnalyses,
      addLinkAnalysis,
      saveLinkAnalysisToDb,
      clearLinkAnalyses,
      getTotalUsersAnalyzed,
      getTotalPostsReviewed,
      getTotalCommunitiesAnalyzed,
      loadCaseData,
      clearAllData,
    }}>
      {children}
    </InvestigationContext.Provider>
  );
};

export const useInvestigation = () => {
  const context = useContext(InvestigationContext);
  if (!context) {
    throw new Error('useInvestigation must be used within an InvestigationProvider');
  }
  return context;
};
