# Reddit Sleuth - Reddit Forensic Intelligence Platform

A comprehensive forensic intelligence tool for analyzing Reddit users, communities, and content patterns. Built with React, TypeScript, and powered by AI for sentiment analysis, location detection, and behavioral profiling.

## Features

### Core Analysis
- **User Profiling**: Deep analysis of Reddit user activity, karma, posting patterns, and behavior
- **Community Analysis**: Subreddit statistics, member analysis, and trending topics
- **Link Analysis**: Cross-community relationship mapping with network graph visualization
- **Community Crossover**: Real community-to-community connections from Reddit's related subreddits
- **Real-Time Monitoring**: Live tracking of user/community activity with 15-second refresh

### AI-Powered Intelligence
- **Sentiment Analysis**: Using Google Gemini 2.5 Flash for sentiment classification with explainable AI (XAI)
- **Location Detection**: Extract location indicators from user content
- **Behavior Pattern Recognition**: Identify topic interests and communication styles
- **Word Cloud Generation**: Visual representation of frequently used terms

### Case Management & Reporting
- **Investigation Cases**: Create and manage investigation cases with evidence tracking
- **Report Generation**: Export comprehensive reports in PDF/HTML format
- **Network Graph Reports**: Visual community connection diagrams in reports
- **Activity Timelines**: Track user activity patterns over time

## Tech Stack

- **Frontend**: React 18, TypeScript, Vite, Tailwind CSS, shadcn/ui
- **Backend**: Lovable Cloud (Supabase) or Express.js
- **Database**: PostgreSQL
- **AI**: Google Gemini 2.5 Flash via Lovable AI Gateway (or direct API)
- **Visualization**: Recharts, React Force Graph 2D, Word Clouds, Network Graphs
- **Authentication**: Supabase Auth
- **PDF Generation**: jsPDF with AutoTable

## Quick Start

### Using Lovable Cloud (Recommended)

1. Visit the [Lovable Project](https://lovable.dev/projects/186bdb3b-fa32-4662-a51c-2b10429f41d6)
2. Configure Reddit API credentials in the backend settings
3. Start using the application

### Local Development

```bash
# Clone the repository
git clone <your-repo-url>
cd reddit-sleuth

# Install dependencies
npm install

# Start development server
npm run dev
```

The app will be available at `http://localhost:8080`

## Configuration

### Environment Variables

For local development, create a `.env.local` file:

```env
# Required for local setup without Lovable Cloud
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_PUBLISHABLE_KEY=your_anon_key

# For Express backend
REDDIT_CLIENT_ID=your_reddit_client_id
REDDIT_CLIENT_SECRET=your_reddit_client_secret
GEMINI_API_KEY=your_gemini_api_key
```

### Reddit API Setup

1. Go to https://www.reddit.com/prefs/apps
2. Create a new application (script type)
3. Add credentials to your environment or Lovable Cloud secrets

## Project Structure

```
reddit-sleuth/
├── src/
│   ├── components/           # React components
│   │   ├── ui/              # shadcn/ui components
│   │   ├── WordCloud.tsx    # Word cloud visualization
│   │   ├── AnalyticsChart.tsx
│   │   ├── UserCommunityNetworkGraph.tsx  # Network graph for link analysis
│   │   ├── NetworkVisualization.tsx
│   │   └── ...
│   ├── pages/               # Page components
│   │   ├── Home.tsx         # Main dashboard
│   │   ├── UserProfiling.tsx
│   │   ├── CommunityAnalysis.tsx
│   │   ├── LinkAnalysis.tsx
│   │   ├── Analysis.tsx     # Combined analysis with tabs
│   │   ├── Monitoring.tsx
│   │   ├── Report.tsx
│   │   └── ...
│   ├── contexts/            # React contexts
│   │   └── InvestigationContext.tsx
│   ├── hooks/               # Custom hooks
│   ├── lib/                 # Utilities
│   │   ├── reportGenerator.ts  # PDF/HTML report generation
│   │   ├── dateUtils.ts
│   │   └── utils.ts
│   └── integrations/        # External integrations
│       └── supabase/
├── supabase/
│   ├── functions/           # Edge functions
│   │   ├── reddit-scraper/  # Reddit API integration
│   │   ├── analyze-content/ # AI content analysis
│   │   └── data-store/      # Data persistence
│   └── config.toml
├── server/                  # Express backend (optional)
└── python_ml/               # Custom ML models (optional)
    ├── preprocessing/       # Data preprocessing
    ├── training/           # Model training
    └── evaluation/         # Model evaluation
```

## Documentation

- [Local Setup Guide](./LOCAL_SETUP_GUIDE.md) - Complete guide for running locally
- [Infrastructure Setup](./INFRASTRUCTURE_SETUP.md) - Backend architecture details
- [Data Integration Guide](./DATA_INTEGRATION_GUIDE.md) - How to integrate real data
- [Database Management Guide](./DATABASE_MANAGEMENT_GUIDE.md) - Database operations
- [Supabase Access Guide](./SUPABASE_ACCESS_GUIDE.md) - Connecting your own Supabase
- [Requirements](./REQUIREMENTS.md) - Functional and non-functional requirements

## Key Pages

| Page | Route | Description |
|------|-------|-------------|
| Home | `/` | Case creation and selection |
| Case Dashboard | `/dashboard` | Case overview and statistics |
| User Profiling | `/user-profiling` | Analyze Reddit users |
| Community Analysis | `/community-analysis` | Analyze subreddits |
| Analysis | `/analysis` | Combined analysis with tabs (User/Community/Link) |
| Link Analysis | `/link-analysis` | Cross-community connections |
| Monitoring | `/monitoring` | Real-time activity tracking |
| Report | `/report` | Generate investigation reports |

## API Endpoints

### Reddit Scraper
```
POST /functions/v1/reddit-scraper
Body: { 
  username: string,           // For user profiling
  type: 'user' | 'community' | 'search',
  subreddit?: string,         // For community analysis
  keyword?: string            // For keyword search
}

Response (User):
{
  user: { ... },
  posts: [...],
  comments: [...],
  communityRelations: [       // NEW: Related communities
    { subreddit: "...", relatedTo: ["...", "..."] }
  ]
}
```

### Content Analyzer
```
POST /functions/v1/analyze-content
Body: { posts: Array, comments: Array }

Response:
{
  postSentiments: [...],      // Individual post sentiments with XAI
  commentSentiments: [...],   // Individual comment sentiments with XAI
  sentiment: {
    postBreakdown: { positive, negative, neutral },
    commentBreakdown: { positive, negative, neutral }
  },
  locations: [...],
  patterns: { topicInterests: [...] },
  topSubreddits: [...]
}
```

## Key Features

### Link Analysis with Community Crossover

The Link Analysis feature now includes real community-to-community connections:
- Fetches related subreddits from Reddit's community widgets
- Displays network graph showing community relationships
- Shows connection strength and relationship type (sidebar/co-activity)
- Visualized in both the analysis page and exported reports

### Report Generation

Reports include:
- Case overview and executive summary
- User profiling data with sentiment analysis
- Community analysis with statistics
- **Link Analysis with network graph visualization**
- Community crossover connections
- Monitoring data and activity timelines
- Word clouds and charts

## Deployment

### Lovable Cloud
Click "Share → Publish" in the Lovable interface.

### Self-Hosted
See [Local Setup Guide](./LOCAL_SETUP_GUIDE.md) for complete instructions.

## Security

- All API credentials stored as secrets (never in code)
- Row Level Security (RLS) on all database tables
- Input validation on all endpoints
- CORS protection enabled
- XAI (Explainable AI) for sentiment analysis transparency

## Rate Limits

- Reddit API: 60 requests/minute
- AI Analysis: Varies by tier (free tier: 15 RPM for Gemini)

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## License

This project is for educational and research purposes. Ensure compliance with Reddit's API Terms of Service when using this tool.

## Support

- [Lovable Documentation](https://docs.lovable.dev)
- [Lovable Discord](https://discord.gg/lovable)
- [Reddit API Documentation](https://www.reddit.com/dev/api/)
