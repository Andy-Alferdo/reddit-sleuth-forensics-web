import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface ReportData {
  caseNumber: string;
  investigator: string;
  department: string;
  dateGenerated: string;
  subject: string;
  executiveSummary: string;
  findings: string;
  conclusions: string;
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
  postSentiments: any[];
  commentSentiments: any[];
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
  postSentiments: any[];
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
  postSentiments: any[];
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

interface SelectedModules {
  sentimentAnalysis: boolean;
  userProfiling: boolean;
  keywordTrends: boolean;
  communityAnalysis: boolean;
  linkAnalysis: boolean;
  monitoring: boolean;
}

interface ReportOptions {
  reportType: 'automated' | 'customized';
  exportFormat: 'pdf' | 'html';
  selectedModules: SelectedModules;
  reportData: ReportData;
  userProfiles: UserProfileData[];
  monitoringSessions: MonitoringData[];
  keywordAnalyses: KeywordAnalysisData[];
  communityAnalyses: CommunityAnalysisData[];
  linkAnalyses: LinkAnalysisData[];
}

// Color constants matching the app theme
const COLORS = {
  primary: [99, 102, 241], // Indigo
  accent: [34, 197, 94], // Green
  warning: [234, 179, 8], // Yellow
  danger: [239, 68, 68], // Red
  text: [30, 41, 59],
  muted: [100, 116, 139],
  border: [226, 232, 240],
};

export const generatePDFReport = (options: ReportOptions): void => {
  const { reportType, selectedModules, reportData, userProfiles, monitoringSessions, keywordAnalyses, communityAnalyses, linkAnalyses } = options;

  const doc = new jsPDF();
  let yPos = 20;
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 20;
  const contentWidth = pageWidth - (margin * 2);

  // Helper functions
  const addNewPage = () => {
    doc.addPage();
    yPos = 20;
  };

  const checkPageBreak = (requiredSpace: number) => {
    if (yPos + requiredSpace > doc.internal.pageSize.getHeight() - 20) {
      addNewPage();
    }
  };

  const drawHorizontalLine = () => {
    doc.setDrawColor(...COLORS.border as [number, number, number]);
    doc.setLineWidth(0.5);
    doc.line(margin, yPos, pageWidth - margin, yPos);
    yPos += 5;
  };

  const addSectionTitle = (title: string) => {
    checkPageBreak(20);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.setTextColor(...COLORS.primary as [number, number, number]);
    doc.text(title, margin, yPos);
    yPos += 8;
    drawHorizontalLine();
  };

  const addSubsectionTitle = (title: string) => {
    checkPageBreak(15);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(...COLORS.text as [number, number, number]);
    doc.text(title, margin, yPos);
    yPos += 6;
  };

  const addParagraph = (text: string, indent: number = 0) => {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(...COLORS.text as [number, number, number]);
    const lines = doc.splitTextToSize(text, contentWidth - indent);
    lines.forEach((line: string) => {
      checkPageBreak(6);
      doc.text(line, margin + indent, yPos);
      yPos += 5;
    });
    yPos += 2;
  };

  const addKeyValue = (key: string, value: string, indent: number = 0) => {
    checkPageBreak(7);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(...COLORS.muted as [number, number, number]);
    doc.text(`${key}: `, margin + indent, yPos);
    const keyWidth = doc.getTextWidth(`${key}: `);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...COLORS.text as [number, number, number]);
    doc.text(value, margin + indent + keyWidth, yPos);
    yPos += 6;
  };

  // ====== COVER PAGE ======
  // Header with logo placeholder
  doc.setFillColor(...COLORS.primary as [number, number, number]);
  doc.rect(0, 0, pageWidth, 50, 'F');
  
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(24);
  doc.setTextColor(255, 255, 255);
  doc.text('REDDIT SLEUTH', pageWidth / 2, 25, { align: 'center' });
  
  doc.setFontSize(12);
  doc.text('FORENSIC INVESTIGATION REPORT', pageWidth / 2, 38, { align: 'center' });

  yPos = 70;
  
  // Case Information Box
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(margin, yPos, contentWidth, 60, 3, 3, 'F');
  doc.setDrawColor(...COLORS.border as [number, number, number]);
  doc.roundedRect(margin, yPos, contentWidth, 60, 3, 3, 'S');
  
  yPos += 10;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(...COLORS.text as [number, number, number]);
  doc.text('CASE INFORMATION', margin + 10, yPos);
  yPos += 10;

  addKeyValue('Case Number', reportData.caseNumber, 10);
  addKeyValue('Lead Investigator', reportData.investigator || 'Not specified', 10);
  addKeyValue('Department', reportData.department, 10);
  addKeyValue('Date Generated', reportData.dateGenerated, 10);
  addKeyValue('Report Subject', reportData.subject, 10);

  yPos += 15;

  // Classification Notice
  doc.setFillColor(254, 243, 199);
  doc.roundedRect(margin, yPos, contentWidth, 20, 3, 3, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(...COLORS.warning as [number, number, number]);
  doc.text('CONFIDENTIAL - LAW ENFORCEMENT SENSITIVE', pageWidth / 2, yPos + 12, { align: 'center' });
  
  yPos += 30;

  // Report Summary Stats
  const totalUsers = userProfiles.length;
  const totalMonitoringSessions = monitoringSessions.length;
  const totalKeywordAnalyses = keywordAnalyses.length;
  const totalCommunities = communityAnalyses.length;
  const totalLinkAnalyses = linkAnalyses.length;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(...COLORS.text as [number, number, number]);
  doc.text('REPORT SUMMARY', margin, yPos);
  yPos += 10;

  const statsBoxWidth = (contentWidth - 20) / 3;
  const statsBoxHeight = 35;
  
  const stats = [
    { label: 'Users Profiled', value: totalUsers.toString() },
    { label: 'Monitoring Sessions', value: totalMonitoringSessions.toString() },
    { label: 'Communities Analyzed', value: totalCommunities.toString() },
  ];

  stats.forEach((stat, index) => {
    const xPos = margin + (index * (statsBoxWidth + 10));
    doc.setFillColor(248, 250, 252);
    doc.roundedRect(xPos, yPos, statsBoxWidth, statsBoxHeight, 3, 3, 'F');
    
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(18);
    doc.setTextColor(...COLORS.primary as [number, number, number]);
    doc.text(stat.value, xPos + statsBoxWidth / 2, yPos + 15, { align: 'center' });
    
    doc.setFontSize(8);
    doc.setTextColor(...COLORS.muted as [number, number, number]);
    doc.text(stat.label, xPos + statsBoxWidth / 2, yPos + 27, { align: 'center' });
  });

  yPos += statsBoxHeight + 10;

  // Second row of stats
  const stats2 = [
    { label: 'Keyword Analyses', value: totalKeywordAnalyses.toString() },
    { label: 'Link Analyses', value: totalLinkAnalyses.toString() },
    { label: 'Report Type', value: reportType === 'automated' ? 'Automated' : 'Customized' },
  ];

  stats2.forEach((stat, index) => {
    const xPos = margin + (index * (statsBoxWidth + 10));
    doc.setFillColor(248, 250, 252);
    doc.roundedRect(xPos, yPos, statsBoxWidth, statsBoxHeight, 3, 3, 'F');
    
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(18);
    doc.setTextColor(...COLORS.primary as [number, number, number]);
    doc.text(stat.value, xPos + statsBoxWidth / 2, yPos + 15, { align: 'center' });
    
    doc.setFontSize(8);
    doc.setTextColor(...COLORS.muted as [number, number, number]);
    doc.text(stat.label, xPos + statsBoxWidth / 2, yPos + 27, { align: 'center' });
  });

  // ====== EXECUTIVE SUMMARY ======
  addNewPage();
  addSectionTitle('1. EXECUTIVE SUMMARY');
  
  if (reportData.executiveSummary) {
    addParagraph(reportData.executiveSummary);
  } else {
    addParagraph('No executive summary provided.');
  }

  yPos += 5;

  // Key Findings
  if (reportData.findings) {
    addSubsectionTitle('Key Findings');
    addParagraph(reportData.findings);
  }

  // Conclusions
  if (reportData.conclusions) {
    addSubsectionTitle('Conclusions & Recommendations');
    addParagraph(reportData.conclusions);
  }

  // ====== MONITORING SESSIONS ======
  if ((reportType === 'automated' || selectedModules.monitoring) && monitoringSessions.length > 0) {
    addNewPage();
    addSectionTitle('2. MONITORING SESSIONS');
    
    monitoringSessions.forEach((session, sessionIndex) => {
      checkPageBreak(60);
      addSubsectionTitle(`Session ${sessionIndex + 1}: ${session.targetName}`);
      
      addKeyValue('Search Type', session.searchType === 'user' ? 'User Monitoring' : 'Community Monitoring');
      addKeyValue('Started At', session.startedAt || 'N/A');
      addKeyValue('New Activities Detected', session.newActivityCount?.toString() || '0');
      
      // Profile Data
      if (session.profileData) {
        yPos += 3;
        doc.setFont('helvetica', 'italic');
        doc.setFontSize(9);
        doc.setTextColor(...COLORS.muted as [number, number, number]);
        doc.text('Profile Information:', margin + 5, yPos);
        yPos += 5;
        
        if (session.searchType === 'user') {
          if (session.profileData.totalKarma) addKeyValue('Total Karma', session.profileData.totalKarma.toLocaleString(), 10);
          if (session.profileData.accountAge) addKeyValue('Account Age', session.profileData.accountAge, 10);
        } else {
          if (session.profileData.memberCount) addKeyValue('Members', session.profileData.memberCount, 10);
          if (session.profileData.description) addKeyValue('Description', session.profileData.description.substring(0, 100) + '...', 10);
        }
      }

      // Activities Table
      if (session.activities && session.activities.length > 0) {
        yPos += 5;
        checkPageBreak(40);
        
        const activityRows = session.activities.slice(0, 10).map(activity => [
          activity.type === 'post' ? 'Post' : 'Comment',
          activity.title.substring(0, 50) + (activity.title.length > 50 ? '...' : ''),
          activity.subreddit,
          activity.timestamp.split(' ')[0]
        ]);

        autoTable(doc, {
          startY: yPos,
          head: [['Type', 'Content', 'Subreddit', 'Date']],
          body: activityRows,
          margin: { left: margin },
          styles: { fontSize: 8, cellPadding: 2 },
          headStyles: { fillColor: COLORS.primary as [number, number, number] },
          columnStyles: {
            0: { cellWidth: 20 },
            1: { cellWidth: 80 },
            2: { cellWidth: 40 },
            3: { cellWidth: 30 }
          }
        });
        
        yPos = (doc as any).lastAutoTable.finalY + 10;
      }

      // Word Cloud Summary
      if (session.wordCloudData && session.wordCloudData.length > 0) {
        checkPageBreak(20);
        addKeyValue('Top Keywords', session.wordCloudData.slice(0, 5).map((w: any) => `${w.word} (${w.frequency})`).join(', '));
      }

      yPos += 10;
    });
  }

  // ====== USER PROFILING ======
  if ((reportType === 'automated' || selectedModules.userProfiling) && userProfiles.length > 0) {
    addNewPage();
    addSectionTitle('3. USER PROFILING ANALYSIS');
    
    userProfiles.forEach((profile, profileIndex) => {
      checkPageBreak(80);
      addSubsectionTitle(`Profile ${profileIndex + 1}: u/${profile.username}`);
      
      // Basic Info
      addKeyValue('Account Age', profile.accountAge);
      addKeyValue('Total Karma', profile.totalKarma?.toLocaleString() || 'N/A');
      addKeyValue('Post Karma', profile.postKarma?.toLocaleString() || 'N/A');
      addKeyValue('Comment Karma', profile.commentKarma?.toLocaleString() || 'N/A');
      addKeyValue('Analyzed At', profile.analyzedAt || 'N/A');
      
      // Activity Pattern
      if (profile.activityPattern) {
        yPos += 3;
        addSubsectionTitle('Activity Patterns');
        addKeyValue('Most Active Hour', profile.activityPattern.mostActiveHour, 5);
        addKeyValue('Most Active Day', profile.activityPattern.mostActiveDay, 5);
        addKeyValue('Timezone', profile.activityPattern.timezone, 5);
      }

      // Location Indicators
      if (profile.locationIndicators && profile.locationIndicators.length > 0) {
        yPos += 3;
        addSubsectionTitle('Location Indicators');
        profile.locationIndicators.forEach(location => {
          addParagraph(`• ${location}`, 5);
        });
      }

      // Behavior Patterns
      if (profile.behaviorPatterns && profile.behaviorPatterns.length > 0) {
        yPos += 3;
        addSubsectionTitle('Behavior Patterns');
        profile.behaviorPatterns.forEach(pattern => {
          addParagraph(`• ${pattern}`, 5);
        });
      }

      // Sentiment Analysis
      if ((reportType === 'automated' || selectedModules.sentimentAnalysis) && profile.sentimentAnalysis) {
        yPos += 3;
        checkPageBreak(40);
        addSubsectionTitle('Sentiment Analysis');
        
        const sentimentData = [
          ['Sentiment', 'Percentage'],
          ['Positive', `${profile.sentimentAnalysis.positive || 0}%`],
          ['Neutral', `${profile.sentimentAnalysis.neutral || 0}%`],
          ['Negative', `${profile.sentimentAnalysis.negative || 0}%`]
        ];

        autoTable(doc, {
          startY: yPos,
          head: [sentimentData[0]],
          body: sentimentData.slice(1),
          margin: { left: margin },
          styles: { fontSize: 9, cellPadding: 3 },
          headStyles: { fillColor: COLORS.primary as [number, number, number] },
          columnStyles: { 0: { cellWidth: 50 }, 1: { cellWidth: 50 } }
        });
        
        yPos = (doc as any).lastAutoTable.finalY + 5;
      }

      // Post Sentiments Detail
      if ((reportType === 'automated' || selectedModules.sentimentAnalysis) && profile.postSentiments && profile.postSentiments.length > 0) {
        checkPageBreak(50);
        addSubsectionTitle('Post Sentiment Details');
        
        const postRows = profile.postSentiments.slice(0, 8).map((item: any) => [
          item.text.substring(0, 60) + (item.text.length > 60 ? '...' : ''),
          item.sentiment.toUpperCase(),
          item.explanation.substring(0, 40) + (item.explanation.length > 40 ? '...' : '')
        ]);

        autoTable(doc, {
          startY: yPos,
          head: [['Content', 'Sentiment', 'Analysis']],
          body: postRows,
          margin: { left: margin },
          styles: { fontSize: 8, cellPadding: 2 },
          headStyles: { fillColor: COLORS.primary as [number, number, number] },
          columnStyles: {
            0: { cellWidth: 80 },
            1: { cellWidth: 25 },
            2: { cellWidth: 55 }
          }
        });
        
        yPos = (doc as any).lastAutoTable.finalY + 5;
      }

      // Comment Sentiments Detail
      if ((reportType === 'automated' || selectedModules.sentimentAnalysis) && profile.commentSentiments && profile.commentSentiments.length > 0) {
        checkPageBreak(50);
        addSubsectionTitle('Comment Sentiment Details');
        
        const commentRows = profile.commentSentiments.slice(0, 8).map((item: any) => [
          item.text.substring(0, 60) + (item.text.length > 60 ? '...' : ''),
          item.sentiment.toUpperCase(),
          item.explanation.substring(0, 40) + (item.explanation.length > 40 ? '...' : '')
        ]);

        autoTable(doc, {
          startY: yPos,
          head: [['Content', 'Sentiment', 'Analysis']],
          body: commentRows,
          margin: { left: margin },
          styles: { fontSize: 8, cellPadding: 2 },
          headStyles: { fillColor: COLORS.primary as [number, number, number] },
          columnStyles: {
            0: { cellWidth: 80 },
            1: { cellWidth: 25 },
            2: { cellWidth: 55 }
          }
        });
        
        yPos = (doc as any).lastAutoTable.finalY + 5;
      }

      // Active Subreddits Table
      if (profile.activeSubreddits && profile.activeSubreddits.length > 0) {
        checkPageBreak(40);
        addSubsectionTitle('Active Subreddits');
        
        const subredditRows = profile.activeSubreddits.slice(0, 10).map((sub: any) => [
          sub.name || sub,
          sub.activity?.toString() || sub.count?.toString() || 'N/A'
        ]);

        autoTable(doc, {
          startY: yPos,
          head: [['Subreddit', 'Activity Count']],
          body: subredditRows,
          margin: { left: margin },
          styles: { fontSize: 9, cellPadding: 2 },
          headStyles: { fillColor: COLORS.primary as [number, number, number] },
          columnStyles: { 0: { cellWidth: 80 }, 1: { cellWidth: 40 } }
        });
        
        yPos = (doc as any).lastAutoTable.finalY + 5;
      }

      // Word Cloud
      if (profile.wordCloud && profile.wordCloud.length > 0) {
        checkPageBreak(20);
        addKeyValue('Top Words Used', profile.wordCloud.slice(0, 8).map((w: any) => `${w.word} (${w.frequency})`).join(', '));
      }

      yPos += 15;
    });
  }

  // ====== KEYWORD ANALYSIS ======
  if ((reportType === 'automated' || selectedModules.keywordTrends) && keywordAnalyses.length > 0) {
    addNewPage();
    addSectionTitle('4. KEYWORD ANALYSIS');
    
    keywordAnalyses.forEach((analysis, index) => {
      checkPageBreak(60);
      addSubsectionTitle(`Analysis ${index + 1}: "${analysis.keyword}"`);
      
      addKeyValue('Total Mentions', analysis.totalMentions?.toString() || 'N/A');
      addKeyValue('Analyzed At', analysis.analyzedAt || 'N/A');

      // Top Subreddits Table
      if (analysis.topSubreddits && analysis.topSubreddits.length > 0) {
        checkPageBreak(40);
        
        const subredditRows = analysis.topSubreddits.map((sub: any) => [
          sub.name,
          sub.mentions?.toString() || 'N/A'
        ]);

        autoTable(doc, {
          startY: yPos,
          head: [['Subreddit', 'Mentions']],
          body: subredditRows,
          margin: { left: margin },
          styles: { fontSize: 9, cellPadding: 2 },
          headStyles: { fillColor: COLORS.primary as [number, number, number] }
        });
        
        yPos = (doc as any).lastAutoTable.finalY + 5;
      }

      // Sentiment Analysis for Keyword
      if ((reportType === 'automated' || selectedModules.sentimentAnalysis) && analysis.sentimentChartData && analysis.sentimentChartData.length > 0) {
        checkPageBreak(40);
        addSubsectionTitle('Sentiment Distribution');
        
        const sentimentRows = analysis.sentimentChartData.map((item: any) => [
          item.name,
          `${item.value}%`
        ]);

        autoTable(doc, {
          startY: yPos,
          head: [['Sentiment', 'Percentage']],
          body: sentimentRows,
          margin: { left: margin },
          styles: { fontSize: 9, cellPadding: 3 },
          headStyles: { fillColor: COLORS.primary as [number, number, number] }
        });
        
        yPos = (doc as any).lastAutoTable.finalY + 5;
      }

      // Post Sentiments Detail for Keyword
      if ((reportType === 'automated' || selectedModules.sentimentAnalysis) && analysis.postSentiments && analysis.postSentiments.length > 0) {
        checkPageBreak(50);
        addSubsectionTitle('Post Sentiment Details');
        
        const postRows = analysis.postSentiments.slice(0, 8).map((item: any) => [
          item.text.substring(0, 60) + (item.text.length > 60 ? '...' : ''),
          item.sentiment.toUpperCase(),
          item.explanation.substring(0, 40) + (item.explanation.length > 40 ? '...' : '')
        ]);

        autoTable(doc, {
          startY: yPos,
          head: [['Content', 'Sentiment', 'Analysis']],
          body: postRows,
          margin: { left: margin },
          styles: { fontSize: 8, cellPadding: 2 },
          headStyles: { fillColor: COLORS.primary as [number, number, number] }
        });
        
        yPos = (doc as any).lastAutoTable.finalY + 5;
      }

      // Recent Posts Table
      if (analysis.recentPosts && analysis.recentPosts.length > 0) {
        checkPageBreak(50);
        addSubsectionTitle('Recent Related Posts');
        
        const postRows = analysis.recentPosts.slice(0, 8).map((post: any) => [
          post.title.substring(0, 50) + (post.title.length > 50 ? '...' : ''),
          `r/${post.subreddit}`,
          post.score?.toString() || 'N/A',
          new Date(post.created_utc * 1000).toLocaleDateString()
        ]);

        autoTable(doc, {
          startY: yPos,
          head: [['Title', 'Subreddit', 'Score', 'Date']],
          body: postRows,
          margin: { left: margin },
          styles: { fontSize: 8, cellPadding: 2 },
          headStyles: { fillColor: COLORS.primary as [number, number, number] }
        });
        
        yPos = (doc as any).lastAutoTable.finalY + 5;
      }

      // Word Cloud
      if (analysis.wordCloud && analysis.wordCloud.length > 0) {
        addKeyValue('Related Keywords', analysis.wordCloud.slice(0, 8).map((w: any) => `${w.word} (${w.frequency})`).join(', '));
      }

      yPos += 15;
    });
  }

  // ====== COMMUNITY ANALYSIS ======
  if ((reportType === 'automated' || selectedModules.communityAnalysis) && communityAnalyses.length > 0) {
    addNewPage();
    addSectionTitle('5. COMMUNITY ANALYSIS');
    
    communityAnalyses.forEach((community, index) => {
      checkPageBreak(70);
      addSubsectionTitle(`Community ${index + 1}: ${community.name}`);
      
      addKeyValue('Subscribers', community.subscribers?.toLocaleString() || 'N/A');
      addKeyValue('Active Users', community.activeUsers?.toLocaleString() || 'N/A');
      addKeyValue('Created', community.created || 'N/A');
      addKeyValue('Analyzed At', community.analyzedAt || 'N/A');
      
      if (community.description) {
        yPos += 3;
        addParagraph(community.description.substring(0, 200) + (community.description.length > 200 ? '...' : ''));
      }

      // Stats
      if (community.stats) {
        checkPageBreak(30);
        addSubsectionTitle('Community Statistics');
        addKeyValue('Total Posts Analyzed', community.stats.totalPosts?.toString() || 'N/A', 5);
        addKeyValue('Total Upvotes', community.stats.totalUpvotes?.toLocaleString() || 'N/A', 5);
        addKeyValue('Total Comments', community.stats.totalComments?.toLocaleString() || 'N/A', 5);
        addKeyValue('Average Upvotes', community.stats.avgUpvotes?.toString() || 'N/A', 5);
      }

      // Sentiment Analysis for Community
      if ((reportType === 'automated' || selectedModules.sentimentAnalysis) && community.sentimentChartData && community.sentimentChartData.length > 0) {
        checkPageBreak(40);
        addSubsectionTitle('Sentiment Distribution');
        
        const sentimentRows = community.sentimentChartData.map((item: any) => [
          item.name,
          `${item.value}%`
        ]);

        autoTable(doc, {
          startY: yPos,
          head: [['Sentiment', 'Percentage']],
          body: sentimentRows,
          margin: { left: margin },
          styles: { fontSize: 9, cellPadding: 3 },
          headStyles: { fillColor: COLORS.primary as [number, number, number] }
        });
        
        yPos = (doc as any).lastAutoTable.finalY + 5;
      }

      // Post Sentiments Detail for Community
      if ((reportType === 'automated' || selectedModules.sentimentAnalysis) && community.postSentiments && community.postSentiments.length > 0) {
        checkPageBreak(50);
        addSubsectionTitle('Post Sentiment Details');
        
        const postRows = community.postSentiments.slice(0, 8).map((item: any) => [
          item.text.substring(0, 60) + (item.text.length > 60 ? '...' : ''),
          item.sentiment.toUpperCase(),
          item.explanation.substring(0, 40) + (item.explanation.length > 40 ? '...' : '')
        ]);

        autoTable(doc, {
          startY: yPos,
          head: [['Content', 'Sentiment', 'Analysis']],
          body: postRows,
          margin: { left: margin },
          styles: { fontSize: 8, cellPadding: 2 },
          headStyles: { fillColor: COLORS.primary as [number, number, number] }
        });
        
        yPos = (doc as any).lastAutoTable.finalY + 5;
      }

      // Top Authors Table
      if (community.topAuthors && community.topAuthors.length > 0) {
        checkPageBreak(40);
        addSubsectionTitle('Top Contributors');
        
        const authorRows = community.topAuthors.map((author: any) => [
          author.username,
          author.posts?.toString() || 'N/A'
        ]);

        autoTable(doc, {
          startY: yPos,
          head: [['Username', 'Posts']],
          body: authorRows,
          margin: { left: margin },
          styles: { fontSize: 9, cellPadding: 2 },
          headStyles: { fillColor: COLORS.primary as [number, number, number] }
        });
        
        yPos = (doc as any).lastAutoTable.finalY + 5;
      }

      // Recent Posts Table
      if (community.recentPosts && community.recentPosts.length > 0) {
        checkPageBreak(50);
        addSubsectionTitle('Recent Posts');
        
        const postRows = community.recentPosts.slice(0, 8).map((post: any) => [
          post.title.substring(0, 50) + (post.title.length > 50 ? '...' : ''),
          post.author || 'N/A',
          post.score?.toString() || 'N/A',
          new Date(post.created_utc * 1000).toLocaleDateString()
        ]);

        autoTable(doc, {
          startY: yPos,
          head: [['Title', 'Author', 'Score', 'Date']],
          body: postRows,
          margin: { left: margin },
          styles: { fontSize: 8, cellPadding: 2 },
          headStyles: { fillColor: COLORS.primary as [number, number, number] }
        });
        
        yPos = (doc as any).lastAutoTable.finalY + 5;
      }

      // Word Cloud
      if (community.wordCloud && community.wordCloud.length > 0) {
        addKeyValue('Top Keywords', community.wordCloud.slice(0, 8).map((w: any) => `${w.word} (${w.frequency})`).join(', '));
      }

      yPos += 15;
    });
  }

  // ====== LINK ANALYSIS ======
  if ((reportType === 'automated' || selectedModules.linkAnalysis) && linkAnalyses.length > 0) {
    addNewPage();
    addSectionTitle('6. LINK ANALYSIS');
    
    linkAnalyses.forEach((link, index) => {
      checkPageBreak(70);
      addSubsectionTitle(`Analysis ${index + 1}: u/${link.primaryUser}`);
      
      addKeyValue('Total Karma', link.totalKarma?.toLocaleString() || 'N/A');
      addKeyValue('Analyzed At', link.analyzedAt || 'N/A');

      // Network Metrics
      if (link.networkMetrics) {
        checkPageBreak(30);
        addSubsectionTitle('Network Metrics');
        addKeyValue('Total Communities', link.networkMetrics.totalCommunities?.toString() || 'N/A', 5);
        addKeyValue('Total Posts', link.networkMetrics.totalPosts?.toString() || 'N/A', 5);
        addKeyValue('Total Comments', link.networkMetrics.totalComments?.toString() || 'N/A', 5);
        addKeyValue('Average Activity Score', link.networkMetrics.avgActivityScore?.toString() || 'N/A', 5);
        addKeyValue('Cross-Community Links', link.networkMetrics.crossCommunityLinks?.toString() || 'N/A', 5);
      }

      // User to Communities Table
      if (link.userToCommunities && link.userToCommunities.length > 0) {
        checkPageBreak(50);
        addSubsectionTitle('Community Connections');
        
        const communityRows = link.userToCommunities.map((comm: any) => [
          comm.community,
          comm.posts?.toString() || 'N/A',
          comm.comments?.toString() || 'N/A',
          comm.engagement?.toLocaleString() || 'N/A'
        ]);

        autoTable(doc, {
          startY: yPos,
          head: [['Community', 'Posts', 'Comments', 'Engagement']],
          body: communityRows,
          margin: { left: margin },
          styles: { fontSize: 9, cellPadding: 2 },
          headStyles: { fillColor: COLORS.primary as [number, number, number] }
        });
        
        yPos = (doc as any).lastAutoTable.finalY + 5;
      }

      // Community Crossover
      if (link.communityCrossover && link.communityCrossover.length > 0) {
        checkPageBreak(40);
        addSubsectionTitle('Community Crossover Patterns');
        
        const crossoverRows = link.communityCrossover.map((cross: any) => [
          cross.from,
          cross.to,
          `${cross.strength}%`
        ]);

        autoTable(doc, {
          startY: yPos,
          head: [['From', 'To', 'Connection Strength']],
          body: crossoverRows,
          margin: { left: margin },
          styles: { fontSize: 9, cellPadding: 2 },
          headStyles: { fillColor: COLORS.primary as [number, number, number] }
        });
        
        yPos = (doc as any).lastAutoTable.finalY + 5;
      }

      yPos += 15;
    });
  }

  // ====== LEGAL DISCLAIMER ======
  addNewPage();
  addSectionTitle('LEGAL DISCLAIMER & CHAIN OF CUSTODY');
  
  addParagraph('This report contains sensitive investigation data collected from publicly available sources on Reddit. The information presented herein is intended for authorized personnel only and should be handled in accordance with applicable laws and regulations.');
  
  yPos += 5;
  
  addParagraph('All data was collected using automated tools that access publicly available information through Reddit\'s official API. No unauthorized access or data extraction methods were employed during this investigation.');
  
  yPos += 5;
  
  addSubsectionTitle('Data Collection Methodology');
  addParagraph('• Reddit user profiles and posts were accessed via official API endpoints', 5);
  addParagraph('• Sentiment analysis was performed using AI-powered natural language processing', 5);
  addParagraph('• All timestamps are recorded in the original source timezone where applicable', 5);
  
  yPos += 5;
  
  addSubsectionTitle('Report Validity');
  addKeyValue('Generated By', reportData.investigator || 'System');
  addKeyValue('Generation Date', reportData.dateGenerated);
  addKeyValue('Case Reference', reportData.caseNumber);
  addKeyValue('Department', reportData.department);

  // Footer on each page
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(...COLORS.muted as [number, number, number]);
    doc.text(
      `Page ${i} of ${pageCount} | ${reportData.caseNumber} | CONFIDENTIAL`,
      pageWidth / 2,
      doc.internal.pageSize.getHeight() - 10,
      { align: 'center' }
    );
  }

  // Trigger save dialog
  doc.save(`Reddit_Investigation_Report_${reportData.caseNumber}_${reportData.dateGenerated}.pdf`);
};

// Generate HTML report for alternative download
export const generateHTMLReport = (options: ReportOptions): void => {
  const { reportType, selectedModules, reportData, userProfiles, monitoringSessions, keywordAnalyses, communityAnalyses, linkAnalyses } = options;

  let html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Reddit Investigation Report - ${reportData.caseNumber}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Segoe UI', system-ui, sans-serif; line-height: 1.6; color: #1e293b; background: #f8fafc; }
    .container { max-width: 900px; margin: 0 auto; background: white; box-shadow: 0 4px 20px rgba(0,0,0,0.1); }
    .header { background: linear-gradient(135deg, #6366f1, #4f46e5); color: white; padding: 40px; text-align: center; }
    .header h1 { font-size: 28px; margin-bottom: 10px; }
    .header p { opacity: 0.9; }
    .case-info { background: #f1f5f9; padding: 30px; border-bottom: 1px solid #e2e8f0; }
    .case-info h2 { color: #475569; font-size: 14px; text-transform: uppercase; margin-bottom: 15px; }
    .info-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 15px; }
    .info-item { display: flex; flex-direction: column; }
    .info-item label { font-size: 12px; color: #64748b; text-transform: uppercase; }
    .info-item span { font-weight: 600; color: #1e293b; }
    .content { padding: 40px; }
    .section { margin-bottom: 40px; }
    .section-title { color: #6366f1; font-size: 20px; border-bottom: 2px solid #e2e8f0; padding-bottom: 10px; margin-bottom: 20px; }
    .subsection-title { color: #334155; font-size: 16px; margin: 20px 0 10px; }
    .stat-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 15px; margin: 20px 0; }
    .stat-box { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 20px; text-align: center; }
    .stat-box .value { font-size: 28px; font-weight: bold; color: #6366f1; }
    .stat-box .label { font-size: 12px; color: #64748b; text-transform: uppercase; }
    table { width: 100%; border-collapse: collapse; margin: 15px 0; }
    th { background: #6366f1; color: white; padding: 12px; text-align: left; font-size: 12px; text-transform: uppercase; }
    td { padding: 10px 12px; border-bottom: 1px solid #e2e8f0; font-size: 14px; }
    tr:hover { background: #f8fafc; }
    .badge { display: inline-block; padding: 4px 10px; border-radius: 12px; font-size: 11px; font-weight: 600; text-transform: uppercase; }
    .badge-positive { background: #dcfce7; color: #166534; }
    .badge-neutral { background: #fef3c7; color: #92400e; }
    .badge-negative { background: #fee2e2; color: #dc2626; }
    .key-value { display: flex; margin: 8px 0; }
    .key-value .key { width: 180px; color: #64748b; font-size: 14px; }
    .key-value .value { flex: 1; color: #1e293b; font-weight: 500; }
    .warning-box { background: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin: 20px 0; }
    .footer { background: #1e293b; color: #94a3b8; padding: 30px; text-align: center; font-size: 12px; }
    @media print { body { background: white; } .container { box-shadow: none; } }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>REDDIT SLEUTH</h1>
      <p>Forensic Investigation Report</p>
    </div>
    
    <div class="case-info">
      <h2>Case Information</h2>
      <div class="info-grid">
        <div class="info-item"><label>Case Number</label><span>${reportData.caseNumber}</span></div>
        <div class="info-item"><label>Lead Investigator</label><span>${reportData.investigator || 'Not specified'}</span></div>
        <div class="info-item"><label>Department</label><span>${reportData.department}</span></div>
        <div class="info-item"><label>Date Generated</label><span>${reportData.dateGenerated}</span></div>
      </div>
    </div>

    <div class="content">
      <div class="warning-box">
        <strong>CONFIDENTIAL - LAW ENFORCEMENT SENSITIVE</strong><br>
        This document contains sensitive investigation data intended for authorized personnel only.
      </div>

      <div class="stat-grid">
        <div class="stat-box"><div class="value">${userProfiles.length}</div><div class="label">Users Profiled</div></div>
        <div class="stat-box"><div class="value">${monitoringSessions.length}</div><div class="label">Monitoring Sessions</div></div>
        <div class="stat-box"><div class="value">${communityAnalyses.length}</div><div class="label">Communities Analyzed</div></div>
      </div>
`;

  // Executive Summary
  html += `
      <div class="section">
        <h2 class="section-title">1. Executive Summary</h2>
        <p>${reportData.executiveSummary || 'No executive summary provided.'}</p>
        ${reportData.findings ? `<h3 class="subsection-title">Key Findings</h3><p>${reportData.findings}</p>` : ''}
        ${reportData.conclusions ? `<h3 class="subsection-title">Conclusions & Recommendations</h3><p>${reportData.conclusions}</p>` : ''}
      </div>
`;

  // Monitoring Sessions
  if ((reportType === 'automated' || selectedModules.monitoring) && monitoringSessions.length > 0) {
    html += `<div class="section"><h2 class="section-title">2. Monitoring Sessions</h2>`;
    monitoringSessions.forEach((session, idx) => {
      html += `
        <h3 class="subsection-title">Session ${idx + 1}: ${session.targetName}</h3>
        <div class="key-value"><span class="key">Search Type</span><span class="value">${session.searchType}</span></div>
        <div class="key-value"><span class="key">Started At</span><span class="value">${session.startedAt || 'N/A'}</span></div>
        <div class="key-value"><span class="key">New Activities</span><span class="value">${session.newActivityCount || 0}</span></div>
`;
      if (session.activities && session.activities.length > 0) {
        html += `<table><thead><tr><th>Type</th><th>Content</th><th>Subreddit</th><th>Time</th></tr></thead><tbody>`;
        session.activities.slice(0, 10).forEach((act: any) => {
          html += `<tr><td>${act.type}</td><td>${act.title.substring(0, 50)}...</td><td>${act.subreddit}</td><td>${act.timestamp}</td></tr>`;
        });
        html += `</tbody></table>`;
      }
    });
    html += `</div>`;
  }

  // User Profiling
  if ((reportType === 'automated' || selectedModules.userProfiling) && userProfiles.length > 0) {
    html += `<div class="section"><h2 class="section-title">3. User Profiling Analysis</h2>`;
    userProfiles.forEach((profile, idx) => {
      html += `
        <h3 class="subsection-title">Profile ${idx + 1}: u/${profile.username}</h3>
        <div class="key-value"><span class="key">Account Age</span><span class="value">${profile.accountAge}</span></div>
        <div class="key-value"><span class="key">Total Karma</span><span class="value">${profile.totalKarma?.toLocaleString()}</span></div>
        <div class="key-value"><span class="key">Post Karma</span><span class="value">${profile.postKarma?.toLocaleString()}</span></div>
        <div class="key-value"><span class="key">Comment Karma</span><span class="value">${profile.commentKarma?.toLocaleString()}</span></div>
`;
      if (profile.activityPattern) {
        html += `
        <h4 style="margin-top:15px;color:#475569;">Activity Patterns</h4>
        <div class="key-value"><span class="key">Most Active Hour</span><span class="value">${profile.activityPattern.mostActiveHour}</span></div>
        <div class="key-value"><span class="key">Most Active Day</span><span class="value">${profile.activityPattern.mostActiveDay}</span></div>
        <div class="key-value"><span class="key">Timezone</span><span class="value">${profile.activityPattern.timezone}</span></div>
`;
      }
      if (profile.sentimentAnalysis) {
        html += `
        <h4 style="margin-top:15px;color:#475569;">Sentiment Analysis</h4>
        <table><thead><tr><th>Sentiment</th><th>Percentage</th></tr></thead><tbody>
          <tr><td><span class="badge badge-positive">Positive</span></td><td>${profile.sentimentAnalysis.positive || 0}%</td></tr>
          <tr><td><span class="badge badge-neutral">Neutral</span></td><td>${profile.sentimentAnalysis.neutral || 0}%</td></tr>
          <tr><td><span class="badge badge-negative">Negative</span></td><td>${profile.sentimentAnalysis.negative || 0}%</td></tr>
        </tbody></table>
`;
      }
      if (profile.postSentiments && profile.postSentiments.length > 0) {
        html += `<h4 style="margin-top:15px;color:#475569;">Post Sentiment Details</h4>
        <table><thead><tr><th>Content</th><th>Sentiment</th><th>Analysis</th></tr></thead><tbody>`;
        profile.postSentiments.slice(0, 8).forEach((item: any) => {
          const badgeClass = item.sentiment === 'positive' ? 'badge-positive' : item.sentiment === 'negative' ? 'badge-negative' : 'badge-neutral';
          html += `<tr><td>${item.text.substring(0, 60)}...</td><td><span class="badge ${badgeClass}">${item.sentiment}</span></td><td>${item.explanation.substring(0, 40)}...</td></tr>`;
        });
        html += `</tbody></table>`;
      }
      if (profile.commentSentiments && profile.commentSentiments.length > 0) {
        html += `<h4 style="margin-top:15px;color:#475569;">Comment Sentiment Details</h4>
        <table><thead><tr><th>Content</th><th>Sentiment</th><th>Analysis</th></tr></thead><tbody>`;
        profile.commentSentiments.slice(0, 8).forEach((item: any) => {
          const badgeClass = item.sentiment === 'positive' ? 'badge-positive' : item.sentiment === 'negative' ? 'badge-negative' : 'badge-neutral';
          html += `<tr><td>${item.text.substring(0, 60)}...</td><td><span class="badge ${badgeClass}">${item.sentiment}</span></td><td>${item.explanation.substring(0, 40)}...</td></tr>`;
        });
        html += `</tbody></table>`;
      }
      if (profile.locationIndicators && profile.locationIndicators.length > 0) {
        html += `<h4 style="margin-top:15px;color:#475569;">Location Indicators</h4><ul>`;
        profile.locationIndicators.forEach(loc => { html += `<li>${loc}</li>`; });
        html += `</ul>`;
      }
      if (profile.behaviorPatterns && profile.behaviorPatterns.length > 0) {
        html += `<h4 style="margin-top:15px;color:#475569;">Behavior Patterns</h4><ul>`;
        profile.behaviorPatterns.forEach(pat => { html += `<li>${pat}</li>`; });
        html += `</ul>`;
      }
    });
    html += `</div>`;
  }

  // Keyword Analysis
  if ((reportType === 'automated' || selectedModules.keywordTrends) && keywordAnalyses.length > 0) {
    html += `<div class="section"><h2 class="section-title">4. Keyword Analysis</h2>`;
    keywordAnalyses.forEach((analysis, idx) => {
      html += `
        <h3 class="subsection-title">Analysis ${idx + 1}: "${analysis.keyword}"</h3>
        <div class="key-value"><span class="key">Total Mentions</span><span class="value">${analysis.totalMentions}</span></div>
`;
      if (analysis.sentimentChartData && analysis.sentimentChartData.length > 0) {
        html += `<table><thead><tr><th>Sentiment</th><th>Percentage</th></tr></thead><tbody>`;
        analysis.sentimentChartData.forEach((item: any) => {
          const badgeClass = item.name.toLowerCase() === 'positive' ? 'badge-positive' : item.name.toLowerCase() === 'negative' ? 'badge-negative' : 'badge-neutral';
          html += `<tr><td><span class="badge ${badgeClass}">${item.name}</span></td><td>${item.value}%</td></tr>`;
        });
        html += `</tbody></table>`;
      }
      if (analysis.postSentiments && analysis.postSentiments.length > 0) {
        html += `<h4 style="margin-top:15px;color:#475569;">Post Sentiment Details</h4>
        <table><thead><tr><th>Content</th><th>Sentiment</th><th>Analysis</th></tr></thead><tbody>`;
        analysis.postSentiments.slice(0, 8).forEach((item: any) => {
          const badgeClass = item.sentiment === 'positive' ? 'badge-positive' : item.sentiment === 'negative' ? 'badge-negative' : 'badge-neutral';
          html += `<tr><td>${item.text.substring(0, 60)}...</td><td><span class="badge ${badgeClass}">${item.sentiment}</span></td><td>${item.explanation.substring(0, 40)}...</td></tr>`;
        });
        html += `</tbody></table>`;
      }
      if (analysis.topSubreddits && analysis.topSubreddits.length > 0) {
        html += `<table><thead><tr><th>Subreddit</th><th>Mentions</th></tr></thead><tbody>`;
        analysis.topSubreddits.forEach((sub: any) => {
          html += `<tr><td>${sub.name}</td><td>${sub.mentions}</td></tr>`;
        });
        html += `</tbody></table>`;
      }
    });
    html += `</div>`;
  }

  // Community Analysis
  if ((reportType === 'automated' || selectedModules.communityAnalysis) && communityAnalyses.length > 0) {
    html += `<div class="section"><h2 class="section-title">5. Community Analysis</h2>`;
    communityAnalyses.forEach((community, idx) => {
      html += `
        <h3 class="subsection-title">Community ${idx + 1}: ${community.name}</h3>
        <div class="key-value"><span class="key">Subscribers</span><span class="value">${community.subscribers?.toLocaleString()}</span></div>
        <div class="key-value"><span class="key">Active Users</span><span class="value">${community.activeUsers?.toLocaleString()}</span></div>
        <div class="key-value"><span class="key">Created</span><span class="value">${community.created}</span></div>
        <p style="margin:10px 0;color:#475569;">${community.description?.substring(0, 200) || ''}</p>
`;
      if (community.sentimentChartData && community.sentimentChartData.length > 0) {
        html += `<h4 style="margin-top:15px;color:#475569;">Sentiment Distribution</h4>
        <table><thead><tr><th>Sentiment</th><th>Percentage</th></tr></thead><tbody>`;
        community.sentimentChartData.forEach((item: any) => {
          const badgeClass = item.name.toLowerCase() === 'positive' ? 'badge-positive' : item.name.toLowerCase() === 'negative' ? 'badge-negative' : 'badge-neutral';
          html += `<tr><td><span class="badge ${badgeClass}">${item.name}</span></td><td>${item.value}%</td></tr>`;
        });
        html += `</tbody></table>`;
      }
      if (community.postSentiments && community.postSentiments.length > 0) {
        html += `<h4 style="margin-top:15px;color:#475569;">Post Sentiment Details</h4>
        <table><thead><tr><th>Content</th><th>Sentiment</th><th>Analysis</th></tr></thead><tbody>`;
        community.postSentiments.slice(0, 8).forEach((item: any) => {
          const badgeClass = item.sentiment === 'positive' ? 'badge-positive' : item.sentiment === 'negative' ? 'badge-negative' : 'badge-neutral';
          html += `<tr><td>${item.text.substring(0, 60)}...</td><td><span class="badge ${badgeClass}">${item.sentiment}</span></td><td>${item.explanation.substring(0, 40)}...</td></tr>`;
        });
        html += `</tbody></table>`;
      }
      if (community.topAuthors && community.topAuthors.length > 0) {
        html += `<table><thead><tr><th>Contributor</th><th>Posts</th></tr></thead><tbody>`;
        community.topAuthors.forEach((auth: any) => {
          html += `<tr><td>${auth.username}</td><td>${auth.posts}</td></tr>`;
        });
        html += `</tbody></table>`;
      }
    });
    html += `</div>`;
  }

  // Link Analysis
  if ((reportType === 'automated' || selectedModules.linkAnalysis) && linkAnalyses.length > 0) {
    html += `<div class="section"><h2 class="section-title">6. Link Analysis</h2>`;
    linkAnalyses.forEach((link, idx) => {
      html += `
        <h3 class="subsection-title">Analysis ${idx + 1}: u/${link.primaryUser}</h3>
        <div class="key-value"><span class="key">Total Karma</span><span class="value">${link.totalKarma?.toLocaleString()}</span></div>
`;
      if (link.networkMetrics) {
        html += `
        <div class="key-value"><span class="key">Total Communities</span><span class="value">${link.networkMetrics.totalCommunities}</span></div>
        <div class="key-value"><span class="key">Total Posts</span><span class="value">${link.networkMetrics.totalPosts}</span></div>
        <div class="key-value"><span class="key">Total Comments</span><span class="value">${link.networkMetrics.totalComments}</span></div>
`;
      }
      if (link.userToCommunities && link.userToCommunities.length > 0) {
        html += `<table><thead><tr><th>Community</th><th>Posts</th><th>Comments</th><th>Engagement</th></tr></thead><tbody>`;
        link.userToCommunities.forEach((comm: any) => {
          html += `<tr><td>${comm.community}</td><td>${comm.posts || 0}</td><td>${comm.comments || 0}</td><td>${comm.engagement?.toLocaleString() || 'N/A'}</td></tr>`;
        });
        html += `</tbody></table>`;
      }
    });
    html += `</div>`;
  }

  // Footer
  html += `
    </div>
    <div class="footer">
      <p>Reddit Sleuth Forensic Investigation Report</p>
      <p>Case: ${reportData.caseNumber} | Generated: ${reportData.dateGenerated}</p>
      <p style="margin-top:10px;">CONFIDENTIAL - LAW ENFORCEMENT SENSITIVE</p>
    </div>
  </div>
</body>
</html>
`;

  // Trigger download
  const blob = new Blob([html], { type: 'text/html' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `Reddit_Investigation_Report_${reportData.caseNumber}_${reportData.dateGenerated}.html`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};
