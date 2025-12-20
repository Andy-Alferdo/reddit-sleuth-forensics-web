import React, { createContext, useContext, useState, ReactNode } from 'react';

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

interface InvestigationContextType {
  // Investigation metadata
  caseNumber: string;
  setCaseNumber: (num: string) => void;
  investigator: string;
  setInvestigator: (name: string) => void;
  
  // User profiling data
  userProfiles: UserProfileData[];
  addUserProfile: (profile: UserProfileData) => void;
  clearUserProfiles: () => void;
  
  // Monitoring data
  monitoringSessions: MonitoringData[];
  addMonitoringSession: (session: MonitoringData) => void;
  clearMonitoringSessions: () => void;
  
  // Keyword analysis data
  keywordAnalyses: KeywordAnalysisData[];
  addKeywordAnalysis: (analysis: KeywordAnalysisData) => void;
  clearKeywordAnalyses: () => void;
  
  // Community analysis data
  communityAnalyses: CommunityAnalysisData[];
  addCommunityAnalysis: (analysis: CommunityAnalysisData) => void;
  clearCommunityAnalyses: () => void;
  
  // Link analysis data
  linkAnalyses: LinkAnalysisData[];
  addLinkAnalysis: (analysis: LinkAnalysisData) => void;
  clearLinkAnalyses: () => void;
  
  // Summary stats
  getTotalUsersAnalyzed: () => number;
  getTotalPostsReviewed: () => number;
  getTotalCommunitiesAnalyzed: () => number;
  
  // Clear all data
  clearAllData: () => void;
}

const InvestigationContext = createContext<InvestigationContextType | undefined>(undefined);

export const InvestigationProvider = ({ children }: { children: ReactNode }) => {
  const [caseNumber, setCaseNumber] = useState(`CASE-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 1000)).padStart(3, '0')}`);
  const [investigator, setInvestigator] = useState('');
  const [userProfiles, setUserProfiles] = useState<UserProfileData[]>([]);
  const [monitoringSessions, setMonitoringSessions] = useState<MonitoringData[]>([]);
  const [keywordAnalyses, setKeywordAnalyses] = useState<KeywordAnalysisData[]>([]);
  const [communityAnalyses, setCommunityAnalyses] = useState<CommunityAnalysisData[]>([]);
  const [linkAnalyses, setLinkAnalyses] = useState<LinkAnalysisData[]>([]);

  const addUserProfile = (profile: UserProfileData) => {
    setUserProfiles(prev => {
      // Replace if same user exists, otherwise add
      const existing = prev.findIndex(p => p.username === profile.username);
      if (existing >= 0) {
        const updated = [...prev];
        updated[existing] = { ...profile, analyzedAt: new Date().toISOString() };
        return updated;
      }
      return [...prev, { ...profile, analyzedAt: new Date().toISOString() }];
    });
  };

  const addMonitoringSession = (session: MonitoringData) => {
    setMonitoringSessions(prev => [...prev, session]);
  };

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
    setUserProfiles([]);
    setMonitoringSessions([]);
    setKeywordAnalyses([]);
    setCommunityAnalyses([]);
    setLinkAnalyses([]);
  };

  return (
    <InvestigationContext.Provider value={{
      caseNumber,
      setCaseNumber,
      investigator,
      setInvestigator,
      userProfiles,
      addUserProfile,
      clearUserProfiles,
      monitoringSessions,
      addMonitoringSession,
      clearMonitoringSessions,
      keywordAnalyses,
      addKeywordAnalysis,
      clearKeywordAnalyses,
      communityAnalyses,
      addCommunityAnalysis,
      clearCommunityAnalyses,
      linkAnalyses,
      addLinkAnalysis,
      clearLinkAnalyses,
      getTotalUsersAnalyzed,
      getTotalPostsReviewed,
      getTotalCommunitiesAnalyzed,
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
