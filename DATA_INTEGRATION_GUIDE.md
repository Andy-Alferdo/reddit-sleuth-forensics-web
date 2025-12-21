# Reddit Sleuth - Data Integration Guide

This guide explains how to integrate real data from Reddit into Reddit Sleuth and understand the data structures used throughout the application.

## Overview

Reddit Sleuth fetches real data from Reddit's API through edge functions and processes it using AI for analysis. This guide covers:

1. Data flow and architecture
2. API endpoints and responses
3. Data structures and schemas
4. Integration with analysis pages
5. Network graph data for link analysis

---

## Data Flow Architecture

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│   Frontend      │────▶│  Edge Functions  │────▶│   Reddit API    │
│   (React)       │     │  (Supabase)      │     │                 │
└─────────────────┘     └──────────────────┘     └─────────────────┘
        │                       │
        │                       ▼
        │               ┌──────────────────┐
        │               │  Lovable AI      │
        │               │  (Gemini 2.5)    │
        │               └──────────────────┘
        │                       │
        ▼                       ▼
┌─────────────────┐     ┌──────────────────┐
│   UI Components │◀────│   PostgreSQL     │
│   Charts/Graphs │     │   (Supabase)     │
└─────────────────┘     └──────────────────┘
```

---

## Edge Function Endpoints

### 1. Reddit Scraper (`/functions/v1/reddit-scraper`)

**Purpose**: Fetches user, community, or search data from Reddit

#### User Data Request
```typescript
const { data } = await supabase.functions.invoke('reddit-scraper', {
  body: { 
    username: 'target_user',
    type: 'user'
  }
});
```

#### User Data Response
```typescript
interface UserScraperResponse {
  user: {
    name: string;
    created_utc: number;
    link_karma: number;
    comment_karma: number;
    is_gold: boolean;
    is_mod: boolean;
    verified: boolean;
    icon_img: string;
  };
  posts: RedditPost[];
  comments: RedditComment[];
  communityRelations: CommunityRelation[];  // NEW
}

interface RedditPost {
  title: string;
  selftext: string;
  subreddit: string;
  created_utc: number;
  score: number;
  num_comments: number;
  url: string;
  permalink: string;
  author: string;
}

interface RedditComment {
  body: string;
  subreddit: string;
  created_utc: number;
  score: number;
  link_title: string;
  permalink: string;
}

interface CommunityRelation {
  subreddit: string;      // Source subreddit
  relatedTo: string[];    // Related subreddits from widgets
}
```

#### Community Data Request
```typescript
const { data } = await supabase.functions.invoke('reddit-scraper', {
  body: { 
    subreddit: 'technology',
    type: 'community'
  }
});
```

#### Community Data Response
```typescript
interface CommunityScraperResponse {
  subreddit: {
    display_name: string;
    subscribers: number;
    public_description: string;
    created_utc: number;
    accounts_active: number;
    active_user_count: number;
    over18: boolean;
    banner_img: string;
    icon_img: string;
  };
  posts: RedditPost[];
  weeklyVisitors: number;
  activeUsers: number;
}
```

#### Search Request
```typescript
const { data } = await supabase.functions.invoke('reddit-scraper', {
  body: { 
    keyword: 'search term',
    type: 'search'
  }
});
```

---

### 2. Content Analyzer (`/functions/v1/analyze-content`)

**Purpose**: AI-powered sentiment analysis, location detection, and pattern recognition

#### Request
```typescript
const { data } = await supabase.functions.invoke('analyze-content', {
  body: {
    posts: userData.posts,
    comments: userData.comments
  }
});
```

#### Response
```typescript
interface AnalysisResponse {
  // Individual sentiments with XAI explanations
  postSentiments: SentimentItem[];
  commentSentiments: SentimentItem[];
  
  // Aggregated sentiment breakdown
  sentiment: {
    postBreakdown: SentimentBreakdown;
    commentBreakdown: SentimentBreakdown;
  };
  
  // Detected locations
  locations: string[];
  
  // Behavior patterns
  patterns: {
    topicInterests: string[];
  };
  
  // Activity statistics
  topSubreddits: { name: string; count: number }[];
  stats: {
    totalPosts: number;
    totalComments: number;
    totalActivity: number;
  };
}

interface SentimentItem {
  text: string;           // First 100 chars
  sentiment: 'positive' | 'negative' | 'neutral';
  explanation: string;    // XAI reason
}

interface SentimentBreakdown {
  positive: number;  // 0.0 - 1.0
  negative: number;  // 0.0 - 1.0
  neutral: number;   // 0.0 - 1.0
}
```

---

## Link Analysis Data Structures

### Community Crossover

The link analysis feature shows how communities are connected to each other.

#### Data Structure
```typescript
interface CommunityCrossover {
  from: string;           // Source community
  to: string;             // Target community
  strength: number;       // Connection strength (0-100)
  relationType: string;   // 'sidebar' | 'co-activity' | 'related'
}

// Example
const communityCrossover: CommunityCrossover[] = [
  {
    from: 'technology',
    to: 'programming',
    strength: 85,
    relationType: 'sidebar'
  },
  {
    from: 'technology',
    to: 'gadgets',
    strength: 72,
    relationType: 'related'
  }
];
```

#### How It's Populated

```typescript
// In Analysis.tsx
useEffect(() => {
  if (analysisData?.communityRelations) {
    const crossovers: CommunityCrossover[] = [];
    
    analysisData.communityRelations.forEach(relation => {
      relation.relatedTo.forEach((relatedSub, idx) => {
        crossovers.push({
          from: relation.subreddit,
          to: relatedSub,
          strength: 90 - (idx * 10),  // Decreasing strength
          relationType: 'sidebar'
        });
      });
    });
    
    setCommunityCrossover(crossovers);
  }
}, [analysisData]);
```

---

### Network Graph Data

For the `UserCommunityNetworkGraph` component:

```typescript
interface NetworkNode {
  id: string;
  name: string;
  group: number;  // 1 = user active, 2 = related
  val: number;    // Node size
}

interface NetworkLink {
  source: string;
  target: string;
  value: number;  // Link strength
}

interface NetworkData {
  nodes: NetworkNode[];
  links: NetworkLink[];
}

// Building network data
const buildNetworkData = (
  activeSubreddits: string[],
  communityRelations: CommunityRelation[]
): NetworkData => {
  const nodes: NetworkNode[] = [];
  const links: NetworkLink[] = [];
  const addedNodes = new Set<string>();
  
  // Add active subreddits as nodes
  activeSubreddits.forEach(sub => {
    if (!addedNodes.has(sub)) {
      nodes.push({
        id: sub,
        name: `r/${sub}`,
        group: 1,  // Active community
        val: 20
      });
      addedNodes.add(sub);
    }
  });
  
  // Add related communities and links
  communityRelations.forEach(relation => {
    relation.relatedTo.forEach(relatedSub => {
      // Add related node if not exists
      if (!addedNodes.has(relatedSub)) {
        nodes.push({
          id: relatedSub,
          name: `r/${relatedSub}`,
          group: 2,  // Related community
          val: 15
        });
        addedNodes.add(relatedSub);
      }
      
      // Add link
      links.push({
        source: relation.subreddit,
        target: relatedSub,
        value: 2
      });
    });
  });
  
  return { nodes, links };
};
```

---

## Integration with Pages

### User Profiling (`/user-profiling`)

```typescript
// Fetch user data
const handleAnalyze = async (username: string) => {
  setLoading(true);
  
  // Step 1: Fetch from Reddit
  const { data: scraperData } = await supabase.functions.invoke('reddit-scraper', {
    body: { username, type: 'user' }
  });
  
  if (scraperData.error) {
    toast.error(scraperData.message);
    return;
  }
  
  // Step 2: Analyze with AI
  const { data: analysisData } = await supabase.functions.invoke('analyze-content', {
    body: {
      posts: scraperData.posts,
      comments: scraperData.comments
    }
  });
  
  // Step 3: Combine and display
  setUserData({
    username: scraperData.user.name,
    karma: scraperData.user.link_karma + scraperData.user.comment_karma,
    accountAge: formatAge(scraperData.user.created_utc),
    posts: scraperData.posts,
    comments: scraperData.comments,
    sentiment: analysisData.sentiment,
    locations: analysisData.locations,
    // ... more fields
  });
  
  setLoading(false);
};
```

### Analysis Page (`/analysis`)

The Analysis page combines all analysis types in tabs:

```typescript
// State for combined analysis
const [analysisData, setAnalysisData] = useState({
  userData: null,
  posts: [],
  comments: [],
  communityRelations: [],  // For link analysis
  sentiment: null,
  locations: [],
  patterns: null
});

// Link Analysis tab uses:
const linkData = useMemo(() => {
  const nodes: NetworkNode[] = [];
  const links: NetworkLink[] = [];
  
  // Build from active subreddits
  const subreddits = new Map<string, number>();
  [...analysisData.posts, ...analysisData.comments].forEach(item => {
    const sub = item.subreddit;
    if (sub) {
      subreddits.set(sub, (subreddits.get(sub) || 0) + 1);
    }
  });
  
  // Add nodes
  Array.from(subreddits.entries()).forEach(([name, count]) => {
    nodes.push({ id: name, name: `r/${name}`, group: 1, val: count });
  });
  
  // Add links from community relations
  analysisData.communityRelations?.forEach(relation => {
    relation.relatedTo.forEach(target => {
      if (!nodes.find(n => n.id === target)) {
        nodes.push({ id: target, name: `r/${target}`, group: 2, val: 5 });
      }
      links.push({ source: relation.subreddit, target, value: 1 });
    });
  });
  
  return { nodes, links };
}, [analysisData]);
```

---

## Word Cloud Data

```typescript
interface WordCloudWord {
  text: string;
  value: number;
}

// Generate from posts and comments
const generateWordCloud = (
  posts: RedditPost[],
  comments: RedditComment[]
): WordCloudWord[] => {
  const wordCount = new Map<string, number>();
  
  // Common words to exclude
  const stopWords = new Set(['the', 'a', 'an', 'and', 'or', 'but', ...]);
  
  // Process all text
  const allText = [
    ...posts.map(p => `${p.title} ${p.selftext}`),
    ...comments.map(c => c.body)
  ].join(' ');
  
  // Count words
  allText.split(/\s+/).forEach(word => {
    const cleaned = word.toLowerCase().replace(/[^a-z]/g, '');
    if (cleaned.length > 3 && !stopWords.has(cleaned)) {
      wordCount.set(cleaned, (wordCount.get(cleaned) || 0) + 1);
    }
  });
  
  // Convert to array and sort
  return Array.from(wordCount.entries())
    .map(([text, value]) => ({ text, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 50);
};
```

---

## Activity Pattern Data

```typescript
interface ActivityPattern {
  hourlyActivity: number[];      // 24 hours
  weeklyActivity: number[];      // 7 days
  mostActiveHour: number;
  mostActiveDay: string;
}

// Generate from posts and comments
const analyzeActivityPattern = (
  posts: RedditPost[],
  comments: RedditComment[]
): ActivityPattern => {
  const hourly = new Array(24).fill(0);
  const weekly = new Array(7).fill(0);
  
  [...posts, ...comments].forEach(item => {
    const date = new Date(item.created_utc * 1000);
    hourly[date.getUTCHours()]++;
    weekly[date.getUTCDay()]++;
  });
  
  return {
    hourlyActivity: hourly,
    weeklyActivity: weekly,
    mostActiveHour: hourly.indexOf(Math.max(...hourly)),
    mostActiveDay: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][
      weekly.indexOf(Math.max(...weekly))
    ]
  };
};
```

---

## Report Data Structure

For the `reportGenerator.ts`:

```typescript
interface ReportData {
  caseInfo: {
    caseNumber: string;
    caseName: string;
    description: string;
    status: string;
    priority: string;
    createdAt: string;
  };
  
  userProfiling?: UserProfilingData;
  communityAnalysis?: CommunityAnalysisData;
  linkAnalysis?: LinkAnalysisData;
  monitoringData?: MonitoringData;
}

interface LinkAnalysisData {
  crossPostingActivity: CrossPost[];
  sharedDomains: Domain[];
  communityConnections: Connection[];
  communityCrossover: CommunityCrossover[];  // NEW
  communityRelations: CommunityRelation[];   // NEW
  networkData?: {
    nodes: NetworkNode[];
    links: NetworkLink[];
  };
}
```

---

## Database Storage

### Saving Analysis Results

```typescript
// Save to user_profiles_analyzed
const saveAnalysis = async (
  caseId: string,
  username: string,
  userData: any,
  analysisData: any
) => {
  const { error } = await supabase
    .from('user_profiles_analyzed')
    .upsert({
      case_id: caseId,
      username,
      account_age: userData.accountAge,
      total_karma: userData.karma,
      post_karma: userData.postKarma,
      comment_karma: userData.commentKarma,
      active_subreddits: userData.activeSubreddits,
      sentiment_analysis: analysisData.sentiment,
      post_sentiments: analysisData.postSentiments,
      comment_sentiments: analysisData.commentSentiments,
      location_indicators: analysisData.locations,
      behavior_patterns: analysisData.patterns,
      word_cloud: userData.wordCloud,
      analyzed_at: new Date().toISOString()
    });
    
  if (error) throw error;
};
```

---

## Best Practices

1. **Cache API responses** - Avoid redundant Reddit API calls
2. **Batch AI requests** - Send multiple items in one request
3. **Handle rate limits** - Implement exponential backoff
4. **Validate data** - Check for null/undefined before processing
5. **Error handling** - Graceful degradation when APIs fail

---

## Resources

- [Reddit API Documentation](https://www.reddit.com/dev/api/)
- [Supabase JavaScript Client](https://supabase.com/docs/reference/javascript)
- [React Force Graph 2D](https://github.com/vasturiano/react-force-graph-2d)
- [Recharts](https://recharts.org/)
