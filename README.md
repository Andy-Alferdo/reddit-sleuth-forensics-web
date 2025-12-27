# Reddit Sleuth - Reddit Forensic Intelligence Platform

A comprehensive forensic intelligence tool for analyzing Reddit users, communities, and content patterns. Built with React, TypeScript, and powered by AI for sentiment analysis, location detection, and behavioral profiling.

## Features

### Core Analysis
- **User Profiling**: Deep analysis of Reddit user activity, karma, posting patterns, and behavior
- **Community Analysis**: Subreddit statistics, member analysis, and trending topics with date-based activity tracking
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

### Admin Features
- **User Management**: Admin dashboard for managing users and roles
- **User Invitations**: Send email invitations to new users with role assignment
- **Password Reset**: Admin-initiated password resets for users
- **Audit Logging**: Track all system actions for compliance

## Tech Stack

- **Frontend**: React 18, TypeScript, Vite, Tailwind CSS, shadcn/ui
- **Backend**: Lovable Cloud (powered by Supabase)
- **Database**: PostgreSQL with Row Level Security
- **AI**: Google Gemini 2.5 Flash via Lovable AI Gateway
- **Visualization**: Recharts, React Force Graph 2D, Word Clouds, Network Graphs
- **Authentication**: Supabase Auth with email/password
- **PDF Generation**: jsPDF with AutoTable
- **Email**: Resend API for invitations

## Quick Start

### Using Lovable Cloud (Recommended)

1. Visit the [Lovable Project](https://lovable.dev/projects/186bdb3b-fa32-4662-a51c-2b10429f41d6)
2. Configure Reddit API credentials in the backend secrets
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
│   │   ├── Monitoring.tsx   # Real-time monitoring
│   │   ├── Report.tsx
│   │   ├── AdminDashboard.tsx  # Admin user management
│   │   └── ...
│   ├── contexts/            # React contexts
│   │   └── InvestigationContext.tsx
│   ├── hooks/               # Custom hooks
│   │   └── useAuditLog.ts   # Audit logging hook
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
│   │   ├── data-store/      # Data persistence
│   │   ├── admin-create-user/    # Admin user creation
│   │   ├── admin-reset-password/ # Admin password reset
│   │   └── send-invite-email/    # Email invitations
│   └── config.toml
├── python_ml/               # Custom ML models (optional)
│   ├── preprocessing/       # Data preprocessing
│   ├── training/           # Model training
│   └── evaluation/         # Model evaluation
└── diagrams/               # Architecture diagrams
```

## Documentation

- [Local Setup Guide](./LOCAL_SETUP_GUIDE.md) - Complete guide for running locally
- [Infrastructure Setup](./INFRASTRUCTURE_SETUP.md) - Backend architecture details
- [Data Integration Guide](./DATA_INTEGRATION_GUIDE.md) - Data structures and API usage
- [Database Management Guide](./DATABASE_MANAGEMENT_GUIDE.md) - Database operations
- [Supabase Access Guide](./SUPABASE_ACCESS_GUIDE.md) - Connecting your own Supabase
- [Requirements](./REQUIREMENTS.md) - Functional and non-functional requirements

## Key Pages

| Page | Route | Description |
|------|-------|-------------|
| Home | `/` | Case creation and selection |
| Login | `/login` | User authentication |
| Register | `/register` | New user registration |
| Case Dashboard | `/dashboard` | Case overview and statistics |
| User Profiling | `/user-profiling` | Analyze Reddit users |
| Community Analysis | `/community-analysis` | Analyze subreddits |
| Analysis | `/analysis` | Combined analysis with tabs (User/Community/Link) |
| Link Analysis | `/link-analysis` | Cross-community connections |
| Monitoring | `/monitoring` | Real-time activity tracking |
| Report | `/report` | Generate investigation reports |
| Admin Dashboard | `/admin/dashboard` | User management (admin only) |

## API Endpoints (Edge Functions)

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
  communityRelations: [       // Related communities
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

### Admin Functions
- `POST /functions/v1/admin-create-user` - Create new users (admin only)
- `POST /functions/v1/admin-reset-password` - Reset user passwords (admin only)
- `POST /functions/v1/send-invite-email` - Send email invitations

## Database Tables

| Table | Purpose |
|-------|---------|
| `profiles` | User profiles linked to auth |
| `user_roles` | Role assignments (admin/user) |
| `user_invites` | Pending user invitations |
| `audit_logs` | System action logs |
| `investigation_cases` | Case management |
| `reddit_posts` | Stored Reddit posts |
| `reddit_comments` | Stored Reddit comments |
| `user_profiles_analyzed` | Analyzed user profiles |
| `analysis_results` | Analysis results storage |
| `monitoring_sessions` | Real-time monitoring sessions |
| `investigation_reports` | Generated reports |

## Key Features

### Link Analysis with Community Crossover

The Link Analysis feature includes real community-to-community connections:
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

### Real-Time Monitoring

- Monitor Reddit users or communities live
- 15-second automatic refresh interval
- Activity breakdown charts (posts vs comments)
- Word cloud updates in real-time
- Notification feed with timestamps

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
- Audit logging for admin actions

## Rate Limits

- Reddit API: 60 requests/minute
- AI Analysis: Varies by tier (usage-based pricing)

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
