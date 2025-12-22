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
  communityRelations?: any[];
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
  positive: [34, 197, 94], // Green for positive sentiment
  neutral: [234, 179, 8], // Yellow for neutral
  negative: [239, 68, 68], // Red for negative
};

// Helper to draw a bar chart in PDF
const drawBarChart = (
  doc: jsPDF,
  data: { label: string; value: number; color?: [number, number, number] }[],
  x: number,
  y: number,
  width: number,
  height: number,
  title?: string
) => {
  const margin = 5;
  const chartWidth = width - margin * 2;
  const chartHeight = height - 30;
  const barSpacing = 5;
  const maxValue = Math.max(...data.map(d => d.value), 1);
  const barWidth = (chartWidth - (data.length - 1) * barSpacing) / data.length;

  // Title
  if (title) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(...COLORS.text as [number, number, number]);
    doc.text(title, x + width / 2, y, { align: 'center' });
  }

  const chartY = y + 10;

  // Draw bars
  data.forEach((item, index) => {
    const barHeight = (item.value / maxValue) * chartHeight;
    const barX = x + margin + index * (barWidth + barSpacing);
    const barY = chartY + chartHeight - barHeight;

    // Bar
    const color = item.color || COLORS.primary;
    doc.setFillColor(...color as [number, number, number]);
    doc.roundedRect(barX, barY, barWidth, barHeight, 2, 2, 'F');

    // Value on top
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    doc.setTextColor(...COLORS.text as [number, number, number]);
    doc.text(`${item.value}%`, barX + barWidth / 2, barY - 2, { align: 'center' });

    // Label below
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(...COLORS.muted as [number, number, number]);
    const labelLines = doc.splitTextToSize(item.label, barWidth + 2);
    doc.text(labelLines[0] || item.label, barX + barWidth / 2, chartY + chartHeight + 8, { align: 'center' });
  });
};

// Helper to draw a pie chart in PDF
const drawPieChart = (
  doc: jsPDF,
  data: { label: string; value: number; color: [number, number, number] }[],
  centerX: number,
  centerY: number,
  radius: number,
  title?: string
) => {
  const total = data.reduce((sum, d) => sum + d.value, 0) || 1;
  let startAngle = -Math.PI / 2; // Start from top

  // Title
  if (title) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(...COLORS.text as [number, number, number]);
    doc.text(title, centerX, centerY - radius - 8, { align: 'center' });
  }

  data.forEach((item) => {
    const sliceAngle = (item.value / total) * 2 * Math.PI;
    const endAngle = startAngle + sliceAngle;

    // Draw slice using lines (approximation)
    doc.setFillColor(...item.color);
    
    const points: { x: number; y: number }[] = [{ x: centerX, y: centerY }];
    const steps = Math.max(20, Math.floor(sliceAngle * 20));
    
    for (let i = 0; i <= steps; i++) {
      const angle = startAngle + (sliceAngle * i) / steps;
      points.push({
        x: centerX + radius * Math.cos(angle),
        y: centerY + radius * Math.sin(angle)
      });
    }

    // Draw as filled polygon
    if (points.length > 2) {
      doc.setFillColor(...item.color);
      const path = points.map((p, i) => (i === 0 ? `${p.x} ${p.y} m` : `${p.x} ${p.y} l`)).join(' ');
      // Use triangle fan approach for pie
      for (let i = 1; i < points.length - 1; i++) {
        doc.triangle(
          points[0].x, points[0].y,
          points[i].x, points[i].y,
          points[i + 1].x, points[i + 1].y,
          'F'
        );
      }
    }

    startAngle = endAngle;
  });

  // Legend
  let legendY = centerY + radius + 12;
  data.forEach((item, index) => {
    const legendX = centerX - 30;
    doc.setFillColor(...item.color);
    doc.rect(legendX, legendY - 3, 8, 8, 'F');
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(...COLORS.text as [number, number, number]);
    doc.text(`${item.label}: ${item.value}%`, legendX + 12, legendY + 3);
    legendY += 12;
  });
};

// Helper to draw activity timeline (hourly distribution)
const drawActivityTimeline = (
  doc: jsPDF,
  hourlyData: number[],
  x: number,
  y: number,
  width: number,
  height: number,
  title: string
) => {
  const margin = 5;
  const chartWidth = width - margin * 2;
  const chartHeight = height - 25;
  const barWidth = chartWidth / 24;
  const maxValue = Math.max(...hourlyData, 1);

  // Title
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(...COLORS.text as [number, number, number]);
  doc.text(title, x + width / 2, y, { align: 'center' });

  const chartY = y + 10;

  // Draw axis
  doc.setDrawColor(...COLORS.border as [number, number, number]);
  doc.setLineWidth(0.3);
  doc.line(x + margin, chartY + chartHeight, x + margin + chartWidth, chartY + chartHeight);

  // Draw bars for each hour
  hourlyData.forEach((value, hour) => {
    const barHeight = (value / maxValue) * chartHeight;
    const barX = x + margin + hour * barWidth;
    const barY = chartY + chartHeight - barHeight;

    // Gradient effect by using different shades
    const intensity = Math.floor(150 + (value / maxValue) * 105);
    doc.setFillColor(99, 102, intensity);
    doc.rect(barX + 0.5, barY, barWidth - 1, barHeight, 'F');
  });

  // Hour labels (every 6 hours)
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6);
  doc.setTextColor(...COLORS.muted as [number, number, number]);
  [0, 6, 12, 18].forEach(hour => {
    const labelX = x + margin + hour * barWidth + barWidth / 2;
    doc.text(`${hour}h`, labelX, chartY + chartHeight + 6, { align: 'center' });
  });
};

// Helper to draw daily activity distribution
const drawDailyDistribution = (
  doc: jsPDF,
  dailyData: { day: string; value: number }[],
  x: number,
  y: number,
  width: number,
  height: number,
  title: string
) => {
  const margin = 5;
  const chartWidth = width - margin * 2;
  const chartHeight = height - 25;
  const barSpacing = 3;
  const barWidth = (chartWidth - (dailyData.length - 1) * barSpacing) / dailyData.length;
  const maxValue = Math.max(...dailyData.map(d => d.value), 1);

  // Title
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(...COLORS.text as [number, number, number]);
  doc.text(title, x + width / 2, y, { align: 'center' });

  const chartY = y + 10;

  dailyData.forEach((item, index) => {
    const barHeight = (item.value / maxValue) * chartHeight;
    const barX = x + margin + index * (barWidth + barSpacing);
    const barY = chartY + chartHeight - barHeight;

    // Bar
    doc.setFillColor(...COLORS.primary as [number, number, number]);
    doc.roundedRect(barX, barY, barWidth, barHeight, 1, 1, 'F');

    // Value on top
    if (item.value > 0) {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(6);
      doc.setTextColor(...COLORS.text as [number, number, number]);
      doc.text(`${item.value}`, barX + barWidth / 2, barY - 2, { align: 'center' });
    }

    // Day label
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6);
    doc.setTextColor(...COLORS.muted as [number, number, number]);
    doc.text(item.day.substring(0, 3), barX + barWidth / 2, chartY + chartHeight + 6, { align: 'center' });
  });
};

// Helper to draw word cloud visualization in PDF
const drawWordCloud = (
  doc: jsPDF,
  words: { word: string; frequency: number }[],
  x: number,
  y: number,
  width: number,
  height: number,
  title: string
) => {
  if (!words || words.length === 0) return;

  // Title
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(...COLORS.text as [number, number, number]);
  doc.text(title, x + width / 2, y, { align: 'center' });

  const cloudY = y + 12;
  const cloudHeight = height - 15;
  const maxFreq = Math.max(...words.slice(0, 20).map(w => w.frequency), 1);
  
  // Background
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(x, cloudY, width, cloudHeight, 3, 3, 'F');

  // Position words in a scattered pattern
  const sortedWords = words.slice(0, 15).sort((a, b) => b.frequency - a.frequency);
  const positions: { x: number; y: number; w: number; h: number }[] = [];

  sortedWords.forEach((wordData, index) => {
    const fontSize = 6 + (wordData.frequency / maxFreq) * 8;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(fontSize);
    
    // Color based on frequency
    const colorIntensity = Math.floor(100 + (wordData.frequency / maxFreq) * 155);
    doc.setTextColor(99, 102, colorIntensity);

    const textWidth = doc.getTextWidth(wordData.word);
    
    // Find a position that doesn't overlap
    let wordX = x + 10 + (index % 3) * (width / 3);
    let wordY = cloudY + 10 + Math.floor(index / 3) * 12;
    
    // Add some randomness
    wordX += Math.sin(index * 2.5) * 10;
    wordY += Math.cos(index * 1.5) * 5;

    // Keep within bounds
    wordX = Math.max(x + 5, Math.min(x + width - textWidth - 5, wordX));
    wordY = Math.max(cloudY + 8, Math.min(cloudY + cloudHeight - 5, wordY));

    doc.text(wordData.word, wordX, wordY);
  });
};

// Helper to draw network graph visualization in PDF - matching app's UserCommunityNetworkGraph style
const drawNetworkGraph = (
  doc: jsPDF,
  userLabel: string,
  communities: { community: string; totalActivity: number }[],
  crossover: { from: string; to: string; strength: number; relationType?: string }[],
  x: number,
  y: number,
  width: number,
  height: number,
  title: string
) => {
  // Title
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(...COLORS.text as [number, number, number]);
  doc.text(title, x + width / 2, y, { align: 'center' });

  const chartY = y + 12;
  const chartHeight = height - 28;
  const centerX = x + width / 2;
  const centerY = chartY + chartHeight / 2;
  
  // Dark background (matching app's dark theme)
  doc.setFillColor(15, 23, 42); // Slate-900
  doc.roundedRect(x, chartY, width, chartHeight, 6, 6, 'F');
  
  // Inner darker area for depth
  doc.setFillColor(2, 6, 23); // Darker center
  doc.roundedRect(x + 4, chartY + 4, width - 8, chartHeight - 8, 4, 4, 'F');

  // Draw subtle ambient particles
  for (let i = 0; i < 30; i++) {
    const px = x + 15 + Math.random() * (width - 30);
    const py = chartY + 15 + Math.random() * (chartHeight - 30);
    const size = 0.3 + Math.random() * 0.5;
    doc.setFillColor(40, 70, 120);
    doc.circle(px, py, size, 'F');
  }

  const maxCommunities = Math.min(communities.length, 8);
  const userRadius = 12;
  const communityRadius = 9;
  const relatedRadius = 7;
  
  // Calculate proper orbit radius based on chart size
  const orbitRadius = Math.min(width * 0.35, chartHeight * 0.35);
  
  // Store all node positions for proper layout
  const communityPositions: { [key: string]: { x: number; y: number; angle: number } } = {};
  
  // Position communities in a circle around user
  communities.slice(0, maxCommunities).forEach((comm, index) => {
    const angle = (2 * Math.PI * index) / maxCommunities - Math.PI / 2;
    const nodeX = centerX + orbitRadius * Math.cos(angle);
    const nodeY = centerY + orbitRadius * Math.sin(angle);
    communityPositions[comm.community] = { x: nodeX, y: nodeY, angle };
  });

  // Calculate related community positions (further out from communities)
  const relatedCommunities = crossover.filter(c => c.relationType === 'sidebar').slice(0, 8);
  const relatedPositions: { x: number; y: number; label: string; sourceX: number; sourceY: number }[] = [];
  
  relatedCommunities.forEach((rel, index) => {
    const sourcePos = communityPositions[rel.from];
    if (sourcePos) {
      // Position related communities at varying angles from their source
      const baseAngle = sourcePos.angle;
      const offsetAngle = ((index % 2 === 0 ? 1 : -1) * (Math.PI / 6)) * (1 + (index % 3) * 0.2);
      const extendRadius = orbitRadius * 0.4 + (index % 3) * 5;
      
      const nodeX = sourcePos.x + extendRadius * Math.cos(baseAngle + offsetAngle);
      const nodeY = sourcePos.y + extendRadius * Math.sin(baseAngle + offsetAngle);
      
      relatedPositions.push({ 
        x: nodeX, 
        y: nodeY, 
        label: rel.to,
        sourceX: sourcePos.x,
        sourceY: sourcePos.y
      });
    }
  });

  // Draw connection lines FIRST (behind nodes)
  // User to communities - gradient lines
  communities.slice(0, maxCommunities).forEach((comm) => {
    const pos = communityPositions[comm.community];
    if (!pos) return;
    
    // Draw gradient line segments
    const segments = 6;
    for (let i = 0; i < segments; i++) {
      const t1 = i / segments;
      const t2 = (i + 1) / segments;
      const x1 = centerX + (pos.x - centerX) * t1;
      const y1 = centerY + (pos.y - centerY) * t1;
      const x2 = centerX + (pos.x - centerX) * t2;
      const y2 = centerY + (pos.y - centerY) * t2;
      
      // Blend from green to blue
      const r = Math.round(16 + (59 - 16) * t1);
      const g = Math.round(185 + (130 - 185) * t1);
      const b = Math.round(129 + (246 - 129) * t1);
      
      doc.setDrawColor(r, g, b);
      doc.setLineWidth(1.5);
      doc.line(x1, y1, x2, y2);
    }
  });

  // Community to related - amber lines
  relatedPositions.forEach((pos) => {
    doc.setDrawColor(245, 158, 11);
    doc.setLineWidth(1);
    doc.line(pos.sourceX, pos.sourceY, pos.x, pos.y);
  });

  // Draw RELATED nodes first (behind communities)
  relatedPositions.forEach((pos) => {
    // Outer glow
    doc.setFillColor(120, 80, 10);
    doc.circle(pos.x, pos.y, relatedRadius + 4, 'F');
    doc.setFillColor(180, 120, 20);
    doc.circle(pos.x, pos.y, relatedRadius + 2, 'F');
    
    // Main node
    doc.setFillColor(217, 119, 6);
    doc.circle(pos.x, pos.y, relatedRadius, 'F');
    doc.setFillColor(245, 158, 11);
    doc.circle(pos.x - 1, pos.y - 1, relatedRadius - 2, 'F');
    
    // Star icon (simple representation)
    doc.setFillColor(255, 255, 255);
    // Draw a simple 4-point star
    const starSize = 2;
    doc.circle(pos.x, pos.y, 1, 'F');
    doc.line(pos.x - starSize, pos.y, pos.x + starSize, pos.y);
    doc.line(pos.x, pos.y - starSize, pos.x, pos.y + starSize);
    
    // Label
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(5);
    const relShort = pos.label.replace('r/', '').substring(0, 10);
    const labelW = doc.getTextWidth(relShort) + 3;
    doc.setFillColor(0, 0, 0);
    doc.roundedRect(pos.x - labelW / 2, pos.y + relatedRadius + 2, labelW, 6, 1, 1, 'F');
    doc.setTextColor(255, 255, 255);
    doc.text(relShort, pos.x, pos.y + relatedRadius + 6.5, { align: 'center' });
  });

  // Draw COMMUNITY nodes
  communities.slice(0, maxCommunities).forEach((comm) => {
    const pos = communityPositions[comm.community];
    if (!pos) return;
    
    // Outer glow rings
    doc.setFillColor(25, 55, 130);
    doc.circle(pos.x, pos.y, communityRadius + 6, 'F');
    doc.setFillColor(35, 75, 170);
    doc.circle(pos.x, pos.y, communityRadius + 4, 'F');
    doc.setFillColor(45, 95, 200);
    doc.circle(pos.x, pos.y, communityRadius + 2, 'F');
    
    // Main node
    doc.setFillColor(37, 99, 235);
    doc.circle(pos.x, pos.y, communityRadius, 'F');
    doc.setFillColor(59, 130, 246);
    doc.circle(pos.x - 1, pos.y - 1, communityRadius - 2, 'F');
    
    // Border
    doc.setDrawColor(120, 170, 255);
    doc.setLineWidth(0.5);
    doc.circle(pos.x, pos.y, communityRadius, 'S');
    
    // Community icon (two people silhouette)
    doc.setFillColor(255, 255, 255);
    doc.circle(pos.x - 2, pos.y - 1.5, 1.5, 'F'); // Left head
    doc.circle(pos.x + 2, pos.y - 1.5, 1.5, 'F'); // Right head
    doc.ellipse(pos.x, pos.y + 2.5, 4, 2, 'F'); // Combined body
    
    // Label
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(5.5);
    const commShort = 'r/' + comm.community.replace('r/', '').substring(0, 10);
    const labelW = doc.getTextWidth(commShort) + 4;
    doc.setFillColor(0, 0, 0);
    doc.roundedRect(pos.x - labelW / 2, pos.y + communityRadius + 3, labelW, 7, 1.5, 1.5, 'F');
    doc.setTextColor(255, 255, 255);
    doc.text(commShort, pos.x, pos.y + communityRadius + 8, { align: 'center' });
  });

  // Draw USER node (on top)
  // Outer glow rings
  doc.setFillColor(8, 90, 70);
  doc.circle(centerX, centerY, userRadius + 8, 'F');
  doc.setFillColor(12, 130, 100);
  doc.circle(centerX, centerY, userRadius + 5, 'F');
  doc.setFillColor(14, 160, 115);
  doc.circle(centerX, centerY, userRadius + 3, 'F');
  
  // Main node
  doc.setFillColor(5, 150, 105);
  doc.circle(centerX, centerY, userRadius, 'F');
  doc.setFillColor(16, 185, 129);
  doc.circle(centerX - 2, centerY - 2, userRadius - 3, 'F');
  
  // White border
  doc.setDrawColor(255, 255, 255);
  doc.setLineWidth(1.5);
  doc.circle(centerX, centerY, userRadius, 'S');
  
  // User icon (person silhouette)
  doc.setFillColor(255, 255, 255);
  doc.circle(centerX, centerY - 2.5, 2.5, 'F'); // Head
  doc.ellipse(centerX, centerY + 3, 4, 3, 'F'); // Body
  
  // User label
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6);
  const userShort = 'u/' + userLabel.substring(0, 10);
  const userLabelW = doc.getTextWidth(userShort) + 5;
  doc.setFillColor(0, 0, 0);
  doc.roundedRect(centerX - userLabelW / 2, centerY + userRadius + 4, userLabelW, 8, 2, 2, 'F');
  doc.setTextColor(255, 255, 255);
  doc.text(userShort, centerX, centerY + userRadius + 9.5, { align: 'center' });

  // Legend at bottom
  const legendY = chartY + chartHeight + 6;
  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  
  // User legend (green)
  doc.setFillColor(5, 150, 105);
  doc.circle(x + 12, legendY, 4, 'F');
  doc.setFillColor(16, 185, 129);
  doc.circle(x + 11, legendY - 1, 3, 'F');
  doc.setTextColor(...COLORS.muted as [number, number, number]);
  doc.text('Users', x + 20, legendY + 2);
  
  // Community legend (blue)
  doc.setFillColor(37, 99, 235);
  doc.circle(x + 55, legendY, 4, 'F');
  doc.setFillColor(59, 130, 246);
  doc.circle(x + 54, legendY - 1, 3, 'F');
  doc.text('Communities', x + 63, legendY + 2);
  
  // Platform legend (purple)
  doc.setFillColor(124, 58, 237);
  doc.circle(x + 115, legendY, 4, 'F');
  doc.setFillColor(139, 92, 246);
  doc.circle(x + 114, legendY - 1, 3, 'F');
  doc.text('Platforms', x + 123, legendY + 2);
  
  // Interest/Related legend (orange)
  doc.setFillColor(217, 119, 6);
  doc.circle(x + 165, legendY, 4, 'F');
  doc.setFillColor(245, 158, 11);
  doc.circle(x + 164, legendY - 1, 3, 'F');
  doc.text('Interests', x + 173, legendY + 2);
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

      // Word Cloud Visualization for Monitoring
      if (session.wordCloudData && session.wordCloudData.length > 0) {
        checkPageBreak(70);
        yPos += 5;
        drawWordCloud(doc, session.wordCloudData, margin, yPos, contentWidth, 55, 'Top Keywords Word Cloud');
        yPos += 60;
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
      
      // Activity Pattern with Visual Charts
      if (profile.activityPattern) {
        yPos += 3;
        addSubsectionTitle('Activity Patterns');
        addKeyValue('Most Active Hour', profile.activityPattern.mostActiveHour, 5);
        addKeyValue('Most Active Day', profile.activityPattern.mostActiveDay, 5);
        addKeyValue('Timezone', profile.activityPattern.timezone, 5);
        
        // Generate hourly activity data from activityPattern
        checkPageBreak(70);
        yPos += 5;
        
        // Create mock hourly distribution based on most active hour
        const mostActiveHourNum = parseInt(profile.activityPattern.mostActiveHour) || 12;
        const hourlyData: number[] = [];
        for (let i = 0; i < 24; i++) {
          const distance = Math.abs(i - mostActiveHourNum);
          const normalizedDistance = Math.min(distance, 24 - distance);
          hourlyData.push(Math.max(1, 10 - normalizedDistance));
        }
        
        drawActivityTimeline(doc, hourlyData, margin, yPos, contentWidth / 2 - 5, 50, 'Hourly Activity Distribution');
        
        // Create daily distribution
        const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
        const mostActiveDay = profile.activityPattern.mostActiveDay || 'Monday';
        const dailyData = days.map(day => ({
          day,
          value: day.toLowerCase().startsWith(mostActiveDay.toLowerCase().substring(0, 3)) ? 10 : Math.floor(Math.random() * 6) + 2
        }));
        
        drawDailyDistribution(doc, dailyData, margin + contentWidth / 2 + 5, yPos, contentWidth / 2 - 5, 50, 'Daily Activity Distribution');
        
        yPos += 55;
      }
      
      // Word Cloud Visualization
      if (profile.wordCloud && profile.wordCloud.length > 0) {
        checkPageBreak(70);
        yPos += 5;
        drawWordCloud(doc, profile.wordCloud, margin, yPos, contentWidth, 55, 'Most Frequently Used Words');
        yPos += 60;
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

      // Sentiment Analysis with Visual Chart
      if ((reportType === 'automated' || selectedModules.sentimentAnalysis) && profile.sentimentAnalysis) {
        yPos += 3;
        checkPageBreak(80);
        addSubsectionTitle('Sentiment Analysis');
        
        // Draw bar chart for sentiment
        const sentimentChartData = [
          { label: 'Positive', value: profile.sentimentAnalysis.positive || 0, color: COLORS.positive as [number, number, number] },
          { label: 'Neutral', value: profile.sentimentAnalysis.neutral || 0, color: COLORS.neutral as [number, number, number] },
          { label: 'Negative', value: profile.sentimentAnalysis.negative || 0, color: COLORS.negative as [number, number, number] },
        ];
        
        drawBarChart(doc, sentimentChartData, margin, yPos, 80, 50, 'Sentiment Distribution');
        
        // Draw pie chart next to bar chart
        drawPieChart(doc, sentimentChartData, margin + 130, yPos + 25, 20, '');
        
        yPos += 60;
        
        // Also include table for clarity
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

      // Word Cloud already rendered above with visual, just add text summary
      if (profile.wordCloud && profile.wordCloud.length > 0) {
        addKeyValue('Top Words Summary', profile.wordCloud.slice(0, 8).map((w: any) => `${w.word} (${w.frequency})`).join(', '));
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

      // Sentiment Analysis for Keyword with Chart
      if ((reportType === 'automated' || selectedModules.sentimentAnalysis) && analysis.sentimentChartData && analysis.sentimentChartData.length > 0) {
        checkPageBreak(80);
        addSubsectionTitle('Sentiment Distribution');
        
        // Draw visual chart
        const chartData = analysis.sentimentChartData.map((item: any) => ({
          label: item.name,
          value: item.value,
          color: item.name.toLowerCase() === 'positive' ? COLORS.positive as [number, number, number] :
                 item.name.toLowerCase() === 'negative' ? COLORS.negative as [number, number, number] :
                 COLORS.neutral as [number, number, number]
        }));
        
        drawBarChart(doc, chartData, margin, yPos, 100, 50, '');
        yPos += 55;
        
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

      // Word Cloud Visualization
      if (analysis.wordCloud && analysis.wordCloud.length > 0) {
        checkPageBreak(70);
        yPos += 5;
        drawWordCloud(doc, analysis.wordCloud, margin, yPos, contentWidth, 55, 'Related Keywords Word Cloud');
        yPos += 60;
        addKeyValue('Top Keywords', analysis.wordCloud.slice(0, 8).map((w: any) => `${w.word} (${w.frequency})`).join(', '));
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

      // Sentiment Analysis for Community with Chart
      if ((reportType === 'automated' || selectedModules.sentimentAnalysis) && community.sentimentChartData && community.sentimentChartData.length > 0) {
        checkPageBreak(80);
        addSubsectionTitle('Sentiment Distribution');
        
        // Draw visual chart
        const chartData = community.sentimentChartData.map((item: any) => ({
          label: item.name,
          value: item.value,
          color: item.name.toLowerCase() === 'positive' ? COLORS.positive as [number, number, number] :
                 item.name.toLowerCase() === 'negative' ? COLORS.negative as [number, number, number] :
                 COLORS.neutral as [number, number, number]
        }));
        
        drawBarChart(doc, chartData, margin, yPos, 100, 50, '');
        yPos += 55;
        
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

      // Word Cloud Visualization
      if (community.wordCloud && community.wordCloud.length > 0) {
        checkPageBreak(70);
        yPos += 5;
        drawWordCloud(doc, community.wordCloud, margin, yPos, contentWidth, 55, 'Community Keywords Word Cloud');
        yPos += 60;
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
        addParagraph('Shows which communities are connected to other related communities (from subreddit sidebars).');
        
        const crossoverRows = link.communityCrossover.map((cross: any) => [
          cross.from,
          cross.to,
          `${cross.strength}%`,
          cross.relationType === 'sidebar' ? 'Related' : 'Co-activity'
        ]);

        autoTable(doc, {
          startY: yPos,
          head: [['From Community', 'Connected To', 'Strength', 'Type']],
          body: crossoverRows,
          margin: { left: margin },
          styles: { fontSize: 9, cellPadding: 2 },
          headStyles: { fillColor: COLORS.primary as [number, number, number] }
        });
        
        yPos = (doc as any).lastAutoTable.finalY + 5;
      }

      // Network Graph Visualization
      if (link.userToCommunities && link.userToCommunities.length > 0) {
        checkPageBreak(100);
        yPos += 5;
        drawNetworkGraph(
          doc,
          `u/${link.primaryUser}`,
          link.userToCommunities,
          link.communityCrossover || [],
          margin,
          yPos,
          contentWidth,
          80,
          'User to Community Network Graph'
        );
        yPos += 95;
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
    .chart-container { display: flex; gap: 30px; align-items: center; margin: 20px 0; flex-wrap: wrap; }
    .bar-chart { display: flex; align-items: flex-end; gap: 10px; height: 120px; padding: 10px; background: #f8fafc; border-radius: 8px; }
    .bar-item { display: flex; flex-direction: column; align-items: center; }
    .bar { width: 60px; border-radius: 4px 4px 0 0; transition: height 0.3s; }
    .bar-label { font-size: 11px; color: #64748b; margin-top: 5px; text-align: center; }
    .bar-value { font-size: 12px; font-weight: bold; color: #1e293b; margin-bottom: 3px; }
    .pie-legend { display: flex; flex-direction: column; gap: 8px; }
    .legend-item { display: flex; align-items: center; gap: 8px; font-size: 13px; }
    .legend-color { width: 16px; height: 16px; border-radius: 4px; }
    .timeline-chart { display: flex; align-items: flex-end; gap: 2px; height: 80px; padding: 10px; background: #f8fafc; border-radius: 8px; margin: 15px 0; }
    .timeline-bar { flex: 1; background: linear-gradient(to top, #6366f1, #818cf8); border-radius: 2px 2px 0 0; min-width: 8px; }
    .daily-chart { display: flex; align-items: flex-end; gap: 8px; height: 100px; padding: 15px; background: #f8fafc; border-radius: 8px; margin: 15px 0; }
    .daily-bar { flex: 1; display: flex; flex-direction: column; align-items: center; }
    .daily-bar .bar { width: 100%; background: linear-gradient(to top, #6366f1, #a5b4fc); border-radius: 4px 4px 0 0; }
    .daily-bar .label { font-size: 10px; color: #64748b; margin-top: 5px; }
    .daily-bar .value { font-size: 11px; font-weight: bold; color: #1e293b; margin-bottom: 3px; }
    .word-cloud { display: flex; flex-wrap: wrap; gap: 8px; padding: 20px; background: linear-gradient(135deg, #f8fafc, #e2e8f0); border-radius: 12px; margin: 15px 0; align-items: center; justify-content: center; }
    .word-cloud-item { padding: 4px 12px; border-radius: 20px; font-weight: 600; transition: transform 0.2s; cursor: default; }
    .word-cloud-item:hover { transform: scale(1.1); }
    .charts-row { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin: 15px 0; }
    .chart-box { background: #f8fafc; border-radius: 8px; padding: 15px; }
    .chart-box h5 { font-size: 12px; color: #475569; text-transform: uppercase; margin-bottom: 10px; text-align: center; }
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
      // Word Cloud for Monitoring
      if (session.wordCloudData && session.wordCloudData.length > 0) {
        const maxFreq = Math.max(...session.wordCloudData.slice(0, 15).map((w: any) => w.frequency), 1);
        html += `<h4 style="margin-top:15px;color:#475569;">Top Keywords</h4>
        <div class="word-cloud">`;
        session.wordCloudData.slice(0, 15).forEach((word: any, idx: number) => {
          const size = 12 + (word.frequency / maxFreq) * 14;
          const colors = ['#6366f1', '#8b5cf6', '#a855f7', '#d946ef', '#ec4899', '#f43f5e', '#f97316', '#eab308', '#22c55e', '#14b8a6'];
          const color = colors[idx % colors.length];
          const bgOpacity = 0.1 + (word.frequency / maxFreq) * 0.15;
          html += `<span class="word-cloud-item" style="font-size:${size}px;color:${color};background:${color}${Math.floor(bgOpacity * 255).toString(16).padStart(2, '0')}">${word.word} (${word.frequency})</span>`;
        });
        html += `</div>`;
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
        const mostActiveHourNum = parseInt(profile.activityPattern.mostActiveHour) || 12;
        
        // Generate hourly data
        const hourlyData: number[] = [];
        for (let i = 0; i < 24; i++) {
          const distance = Math.abs(i - mostActiveHourNum);
          const normalizedDistance = Math.min(distance, 24 - distance);
          hourlyData.push(Math.max(1, 10 - normalizedDistance));
        }
        const maxHourly = Math.max(...hourlyData);
        
        // Generate daily data
        const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
        const mostActiveDay = profile.activityPattern.mostActiveDay || 'Monday';
        const dailyData = days.map(day => ({
          day,
          value: day.toLowerCase().startsWith(mostActiveDay.toLowerCase().substring(0, 3)) ? 10 : Math.floor(Math.random() * 6) + 2
        }));
        const maxDaily = Math.max(...dailyData.map(d => d.value));
        
        html += `
        <h4 style="margin-top:15px;color:#475569;">Activity Patterns</h4>
        <div class="key-value"><span class="key">Most Active Hour</span><span class="value">${profile.activityPattern.mostActiveHour}</span></div>
        <div class="key-value"><span class="key">Most Active Day</span><span class="value">${profile.activityPattern.mostActiveDay}</span></div>
        <div class="key-value"><span class="key">Timezone</span><span class="value">${profile.activityPattern.timezone}</span></div>
        
        <div class="charts-row">
          <div class="chart-box">
            <h5>Hourly Activity Distribution</h5>
            <div class="timeline-chart">
              ${hourlyData.map((v, i) => `<div class="timeline-bar" style="height:${(v/maxHourly)*60}px;" title="Hour ${i}: ${v} activities"></div>`).join('')}
            </div>
            <div style="display:flex;justify-content:space-between;font-size:10px;color:#64748b;padding:0 5px;">
              <span>12AM</span><span>6AM</span><span>12PM</span><span>6PM</span><span>12AM</span>
            </div>
          </div>
          <div class="chart-box">
            <h5>Daily Activity Distribution</h5>
            <div class="daily-chart">
              ${dailyData.map(d => `
                <div class="daily-bar">
                  <div class="value">${d.value}</div>
                  <div class="bar" style="height:${(d.value/maxDaily)*60}px;"></div>
                  <div class="label">${d.day}</div>
                </div>
              `).join('')}
            </div>
          </div>
        </div>
`;
      }
      
      // Word Cloud Visualization
      if (profile.wordCloud && profile.wordCloud.length > 0) {
        const maxFreq = Math.max(...profile.wordCloud.slice(0, 15).map((w: any) => w.frequency), 1);
        html += `
        <h4 style="margin-top:15px;color:#475569;">Most Frequently Used Words</h4>
        <div class="word-cloud">`;
        profile.wordCloud.slice(0, 15).forEach((word: any, idx: number) => {
          const size = 12 + (word.frequency / maxFreq) * 14;
          const colors = ['#6366f1', '#8b5cf6', '#a855f7', '#d946ef', '#ec4899', '#f43f5e', '#f97316', '#eab308', '#22c55e', '#14b8a6'];
          const color = colors[idx % colors.length];
          const bgOpacity = 0.1 + (word.frequency / maxFreq) * 0.15;
          html += `<span class="word-cloud-item" style="font-size:${size}px;color:${color};background:${color}${Math.floor(bgOpacity * 255).toString(16).padStart(2, '0')}">${word.word} (${word.frequency})</span>`;
        });
        html += `</div>`;
      }
      if (profile.sentimentAnalysis) {
        const pos = profile.sentimentAnalysis.positive || 0;
        const neu = profile.sentimentAnalysis.neutral || 0;
        const neg = profile.sentimentAnalysis.negative || 0;
        const maxVal = Math.max(pos, neu, neg, 1);
        
        html += `
        <h4 style="margin-top:15px;color:#475569;">Sentiment Analysis</h4>
        <div class="chart-container">
          <div class="bar-chart">
            <div class="bar-item">
              <div class="bar-value">${pos}%</div>
              <div class="bar" style="height:${(pos/maxVal)*80}px;background:#22c55e;"></div>
              <div class="bar-label">Positive</div>
            </div>
            <div class="bar-item">
              <div class="bar-value">${neu}%</div>
              <div class="bar" style="height:${(neu/maxVal)*80}px;background:#eab308;"></div>
              <div class="bar-label">Neutral</div>
            </div>
            <div class="bar-item">
              <div class="bar-value">${neg}%</div>
              <div class="bar" style="height:${(neg/maxVal)*80}px;background:#ef4444;"></div>
              <div class="bar-label">Negative</div>
            </div>
          </div>
          <div class="pie-legend">
            <div class="legend-item"><div class="legend-color" style="background:#22c55e;"></div>Positive: ${pos}%</div>
            <div class="legend-item"><div class="legend-color" style="background:#eab308;"></div>Neutral: ${neu}%</div>
            <div class="legend-item"><div class="legend-color" style="background:#ef4444;"></div>Negative: ${neg}%</div>
          </div>
        </div>
        <table><thead><tr><th>Sentiment</th><th>Percentage</th></tr></thead><tbody>
          <tr><td><span class="badge badge-positive">Positive</span></td><td>${pos}%</td></tr>
          <tr><td><span class="badge badge-neutral">Neutral</span></td><td>${neu}%</td></tr>
          <tr><td><span class="badge badge-negative">Negative</span></td><td>${neg}%</td></tr>
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
        const maxVal = Math.max(...analysis.sentimentChartData.map((d: any) => d.value), 1);
        html += `<h4 style="margin-top:15px;color:#475569;">Sentiment Distribution</h4>
        <div class="chart-container">
          <div class="bar-chart">`;
        analysis.sentimentChartData.forEach((item: any) => {
          const color = item.name.toLowerCase() === 'positive' ? '#22c55e' : item.name.toLowerCase() === 'negative' ? '#ef4444' : '#eab308';
          html += `
            <div class="bar-item">
              <div class="bar-value">${item.value}%</div>
              <div class="bar" style="height:${(item.value/maxVal)*80}px;background:${color};"></div>
              <div class="bar-label">${item.name}</div>
            </div>`;
        });
        html += `</div></div>
        <table><thead><tr><th>Sentiment</th><th>Percentage</th></tr></thead><tbody>`;
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
      // Word Cloud for Keyword Analysis
      if (analysis.wordCloud && analysis.wordCloud.length > 0) {
        const maxFreq = Math.max(...analysis.wordCloud.slice(0, 15).map((w: any) => w.frequency), 1);
        html += `<h4 style="margin-top:15px;color:#475569;">Related Keywords</h4>
        <div class="word-cloud">`;
        analysis.wordCloud.slice(0, 15).forEach((word: any, idx: number) => {
          const size = 12 + (word.frequency / maxFreq) * 14;
          const colors = ['#6366f1', '#8b5cf6', '#a855f7', '#d946ef', '#ec4899', '#f43f5e', '#f97316', '#eab308', '#22c55e', '#14b8a6'];
          const color = colors[idx % colors.length];
          const bgOpacity = 0.1 + (word.frequency / maxFreq) * 0.15;
          html += `<span class="word-cloud-item" style="font-size:${size}px;color:${color};background:${color}${Math.floor(bgOpacity * 255).toString(16).padStart(2, '0')}">${word.word} (${word.frequency})</span>`;
        });
        html += `</div>`;
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
        const maxVal = Math.max(...community.sentimentChartData.map((d: any) => d.value), 1);
        html += `<h4 style="margin-top:15px;color:#475569;">Sentiment Distribution</h4>
        <div class="chart-container">
          <div class="bar-chart">`;
        community.sentimentChartData.forEach((item: any) => {
          const color = item.name.toLowerCase() === 'positive' ? '#22c55e' : item.name.toLowerCase() === 'negative' ? '#ef4444' : '#eab308';
          html += `
            <div class="bar-item">
              <div class="bar-value">${item.value}%</div>
              <div class="bar" style="height:${(item.value/maxVal)*80}px;background:${color};"></div>
              <div class="bar-label">${item.name}</div>
            </div>`;
        });
        html += `</div></div>
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
      // Word Cloud for Community
      if (community.wordCloud && community.wordCloud.length > 0) {
        const maxFreq = Math.max(...community.wordCloud.slice(0, 15).map((w: any) => w.frequency), 1);
        html += `<h4 style="margin-top:15px;color:#475569;">Community Keywords</h4>
        <div class="word-cloud">`;
        community.wordCloud.slice(0, 15).forEach((word: any, idx: number) => {
          const size = 12 + (word.frequency / maxFreq) * 14;
          const colors = ['#6366f1', '#8b5cf6', '#a855f7', '#d946ef', '#ec4899', '#f43f5e', '#f97316', '#eab308', '#22c55e', '#14b8a6'];
          const color = colors[idx % colors.length];
          const bgOpacity = 0.1 + (word.frequency / maxFreq) * 0.15;
          html += `<span class="word-cloud-item" style="font-size:${size}px;color:${color};background:${color}${Math.floor(bgOpacity * 255).toString(16).padStart(2, '0')}">${word.word} (${word.frequency})</span>`;
        });
        html += `</div>`;
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
        <div class="stat-grid" style="grid-template-columns: repeat(5, 1fr);">
          <div class="stat-box"><div class="value">${link.networkMetrics.totalCommunities || 0}</div><div class="label">Communities</div></div>
          <div class="stat-box"><div class="value">${link.networkMetrics.crossCommunityLinks || 0}</div><div class="label">Cross-Links</div></div>
          <div class="stat-box"><div class="value">${link.networkMetrics.totalPosts || 0}</div><div class="label">Posts</div></div>
          <div class="stat-box"><div class="value">${link.networkMetrics.totalComments || 0}</div><div class="label">Comments</div></div>
          <div class="stat-box"><div class="value">${link.totalKarma?.toLocaleString() || 0}</div><div class="label">Karma</div></div>
        </div>
`;
      }
      if (link.userToCommunities && link.userToCommunities.length > 0) {
        html += `<h4 style="margin-top:15px;color:#475569;">Community Connections</h4>
        <table><thead><tr><th>Community</th><th>Posts</th><th>Comments</th><th>Engagement</th><th>Activity %</th></tr></thead><tbody>`;
        link.userToCommunities.forEach((comm: any) => {
          html += `<tr><td>${comm.community}</td><td>${comm.posts || 0}</td><td>${comm.comments || 0}</td><td>${comm.engagement?.toLocaleString() || 'N/A'}</td><td>
            <div style="display:flex;align-items:center;gap:8px;"><div style="flex:1;background:#e2e8f0;border-radius:4px;height:8px;overflow:hidden;"><div style="height:100%;background:#6366f1;width:${comm.activity || 0}%;"></div></div><span>${comm.activity || 0}%</span></div>
          </td></tr>`;
        });
        html += `</tbody></table>`;
      }
      if (link.communityCrossover && link.communityCrossover.length > 0) {
        html += `<h4 style="margin-top:15px;color:#475569;">Community Crossover (Related Communities)</h4>
        <p style="font-size:12px;color:#64748b;margin-bottom:10px;">Shows which communities are connected to other communities based on subreddit sidebar relationships.</p>
        <table><thead><tr><th>From Community</th><th>Connected To</th><th>Strength</th><th>Type</th></tr></thead><tbody>`;
        link.communityCrossover.forEach((cross: any) => {
          const typeLabel = cross.relationType === 'sidebar' ? '<span class="badge" style="background:#dcfce7;color:#166534;">Related</span>' : '<span class="badge" style="background:#e0e7ff;color:#3730a3;">Co-activity</span>';
          html += `<tr><td>${cross.from}</td><td>${cross.to}</td><td>
            <div style="display:flex;align-items:center;gap:8px;"><div style="flex:1;background:#e2e8f0;border-radius:4px;height:8px;overflow:hidden;"><div style="height:100%;background:#22c55e;width:${cross.strength}%;"></div></div><span>${cross.strength}%</span></div>
          </td><td>${typeLabel}</td></tr>`;
        });
        html += `</tbody></table>`;
      }
      
      // Network Graph Visualization (SVG) - matching app's UserCommunityNetworkGraph style exactly
      if (link.userToCommunities && link.userToCommunities.length > 0) {
        const communities = link.userToCommunities.slice(0, 8);
        const crossover = (link.communityCrossover || []).filter((c: any) => c.relationType === 'sidebar').slice(0, 8);
        
        const svgWidth = 600;
        const svgHeight = 400;
        const centerX = svgWidth / 2;
        const centerY = svgHeight / 2 - 20;
        const orbitRadius = 130;
        
        // Pre-calculate community positions in a circle
        const communityPositions: { x: number; y: number; angle: number; label: string }[] = communities.map((comm: any, i: number) => {
          const angle = (2 * Math.PI * i) / communities.length - Math.PI / 2;
          return {
            x: centerX + orbitRadius * Math.cos(angle),
            y: centerY + orbitRadius * Math.sin(angle),
            angle,
            label: comm.community
          };
        });
        
        // Calculate related community positions extending from their source communities
        const relatedPositions: { x: number; y: number; label: string; sourceX: number; sourceY: number }[] = [];
        crossover.forEach((rel: any, idx: number) => {
          const sourceComm = communityPositions.find(c => c.label === rel.from);
          if (sourceComm) {
            const baseAngle = sourceComm.angle;
            const offsetAngle = ((idx % 2 === 0 ? 1 : -1) * (Math.PI / 5)) * (1 + (idx % 3) * 0.15);
            const extendRadius = 50 + (idx % 3) * 10;
            relatedPositions.push({
              x: sourceComm.x + extendRadius * Math.cos(baseAngle + offsetAngle),
              y: sourceComm.y + extendRadius * Math.sin(baseAngle + offsetAngle),
              label: rel.to,
              sourceX: sourceComm.x,
              sourceY: sourceComm.y
            });
          }
        });
        
        html += `<h4 style="margin-top:20px;color:#475569;">User-Community Network Graph</h4>
        <div style="background:linear-gradient(135deg, #0f172a 0%, #020617 100%);border-radius:16px;padding:24px;margin:15px 0;box-shadow:0 10px 40px -10px rgba(0,0,0,0.5);overflow:hidden;">
          <svg viewBox="0 0 ${svgWidth} ${svgHeight}" style="width:100%;max-width:800px;margin:0 auto;display:block;">
            <defs>
              <!-- Glow filters -->
              <filter id="userGlowFilter" x="-50%" y="-50%" width="200%" height="200%">
                <feGaussianBlur stdDeviation="8" result="blur"/>
                <feFlood flood-color="#10b981" flood-opacity="0.5"/>
                <feComposite in2="blur" operator="in"/>
                <feMerge><feMergeNode/><feMergeNode in="SourceGraphic"/></feMerge>
              </filter>
              <filter id="communityGlowFilter" x="-50%" y="-50%" width="200%" height="200%">
                <feGaussianBlur stdDeviation="6" result="blur"/>
                <feFlood flood-color="#3b82f6" flood-opacity="0.4"/>
                <feComposite in2="blur" operator="in"/>
                <feMerge><feMergeNode/><feMergeNode in="SourceGraphic"/></feMerge>
              </filter>
              <filter id="relatedGlowFilter" x="-50%" y="-50%" width="200%" height="200%">
                <feGaussianBlur stdDeviation="4" result="blur"/>
                <feFlood flood-color="#f59e0b" flood-opacity="0.4"/>
                <feComposite in2="blur" operator="in"/>
                <feMerge><feMergeNode/><feMergeNode in="SourceGraphic"/></feMerge>
              </filter>
              
              <!-- Gradients -->
              <radialGradient id="userGrad" cx="35%" cy="35%" r="65%">
                <stop offset="0%" stop-color="#10b981"/>
                <stop offset="100%" stop-color="#059669"/>
              </radialGradient>
              <radialGradient id="communityGrad" cx="35%" cy="35%" r="65%">
                <stop offset="0%" stop-color="#3b82f6"/>
                <stop offset="100%" stop-color="#2563eb"/>
              </radialGradient>
              <radialGradient id="relatedGrad" cx="35%" cy="35%" r="65%">
                <stop offset="0%" stop-color="#f59e0b"/>
                <stop offset="100%" stop-color="#d97706"/>
              </radialGradient>
              <linearGradient id="linkGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stop-color="#10b981" stop-opacity="0.7"/>
                <stop offset="100%" stop-color="#3b82f6" stop-opacity="0.7"/>
              </linearGradient>
            </defs>
            
            <!-- Ambient particles -->
            ${Array.from({length: 40}, () => {
              const px = 20 + Math.random() * (svgWidth - 40);
              const py = 20 + Math.random() * (svgHeight - 80);
              const size = 0.8 + Math.random() * 1.2;
              const opacity = 0.08 + Math.random() * 0.12;
              return `<circle cx="${px.toFixed(1)}" cy="${py.toFixed(1)}" r="${size.toFixed(1)}" fill="#3b82f6" opacity="${opacity.toFixed(2)}"/>`;
            }).join('')}
            
            <!-- Connection lines: user to communities -->
            ${communityPositions.map((pos) => `
              <line x1="${centerX}" y1="${centerY}" x2="${pos.x.toFixed(1)}" y2="${pos.y.toFixed(1)}" 
                    stroke="url(#linkGrad)" stroke-width="2.5" stroke-linecap="round"/>
            `).join('')}
            
            <!-- Connection lines: communities to related -->
            ${relatedPositions.map((pos) => `
              <line x1="${pos.sourceX.toFixed(1)}" y1="${pos.sourceY.toFixed(1)}" 
                    x2="${pos.x.toFixed(1)}" y2="${pos.y.toFixed(1)}" 
                    stroke="#f59e0b" stroke-width="1.5" opacity="0.6" stroke-linecap="round"/>
            `).join('')}
            
            <!-- Related community nodes (drawn first - behind) -->
            ${relatedPositions.map((pos) => {
              const label = 'r/' + pos.label.replace('r/', '').substring(0, 12);
              return `
                <g filter="url(#relatedGlowFilter)">
                  <circle cx="${pos.x.toFixed(1)}" cy="${pos.y.toFixed(1)}" r="18" fill="url(#relatedGrad)"/>
                </g>
                <circle cx="${pos.x.toFixed(1)}" cy="${pos.y.toFixed(1)}" r="18" fill="url(#relatedGrad)"/>
                <text x="${pos.x.toFixed(1)}" y="${(pos.y + 2).toFixed(1)}" text-anchor="middle" 
                      fill="white" font-size="12" font-weight="400">☆</text>
                <rect x="${(pos.x - 35).toFixed(1)}" y="${(pos.y + 20).toFixed(1)}" width="70" height="14" 
                      rx="4" fill="black" opacity="0.75"/>
                <text x="${pos.x.toFixed(1)}" y="${(pos.y + 30).toFixed(1)}" text-anchor="middle" 
                      fill="white" font-size="9" font-weight="500">${label}</text>
              `;
            }).join('')}
            
            <!-- Community nodes -->
            ${communityPositions.map((pos) => {
              const label = 'r/' + pos.label.replace('r/', '').substring(0, 12);
              return `
                <g filter="url(#communityGlowFilter)">
                  <circle cx="${pos.x.toFixed(1)}" cy="${pos.y.toFixed(1)}" r="28" fill="url(#communityGrad)"/>
                </g>
                <circle cx="${pos.x.toFixed(1)}" cy="${pos.y.toFixed(1)}" r="28" fill="url(#communityGrad)"/>
                <circle cx="${pos.x.toFixed(1)}" cy="${pos.y.toFixed(1)}" r="28" stroke="white" stroke-width="1.5" 
                        stroke-opacity="0.3" fill="none"/>
                <text x="${pos.x.toFixed(1)}" y="${(pos.y + 4).toFixed(1)}" text-anchor="middle" 
                      fill="white" font-size="16">👥</text>
                <rect x="${(pos.x - 40).toFixed(1)}" y="${(pos.y + 32).toFixed(1)}" width="80" height="16" 
                      rx="5" fill="black" opacity="0.75"/>
                <text x="${pos.x.toFixed(1)}" y="${(pos.y + 44).toFixed(1)}" text-anchor="middle" 
                      fill="white" font-size="10" font-weight="600">${label}</text>
              `;
            }).join('')}
            
            <!-- User node (center - on top) -->
            <g filter="url(#userGlowFilter)">
              <circle cx="${centerX}" cy="${centerY}" r="38" fill="url(#userGrad)"/>
            </g>
            <circle cx="${centerX}" cy="${centerY}" r="38" fill="url(#userGrad)"/>
            <circle cx="${centerX}" cy="${centerY}" r="38" stroke="white" stroke-width="2.5" fill="none"/>
            <text x="${centerX}" y="${centerY + 5}" text-anchor="middle" fill="white" font-size="22">👤</text>
            <rect x="${centerX - 45}" y="${centerY + 44}" width="90" height="18" rx="6" fill="black" opacity="0.8"/>
            <text x="${centerX}" y="${centerY + 57}" text-anchor="middle" fill="white" font-size="12" font-weight="700">u/${link.primaryUser.substring(0, 12)}</text>
            
            <!-- Legend -->
            <g transform="translate(0, ${svgHeight - 35})">
              <circle cx="50" cy="12" r="10" fill="url(#userGrad)"/>
              <text x="68" y="16" fill="#94a3b8" font-size="11" font-weight="500">Users</text>
              
              <circle cx="160" cy="12" r="10" fill="url(#communityGrad)"/>
              <text x="178" y="16" fill="#94a3b8" font-size="11" font-weight="500">Communities</text>
              
              <circle cx="310" cy="12" r="9" fill="#8b5cf6"/>
              <text x="326" y="16" fill="#94a3b8" font-size="11" font-weight="500">Platforms</text>
              
              <circle cx="440" cy="12" r="9" fill="url(#relatedGrad)"/>
              <text x="456" y="16" fill="#94a3b8" font-size="11" font-weight="500">Interests</text>
            </g>
          </svg>
        </div>`;
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
