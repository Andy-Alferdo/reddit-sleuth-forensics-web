# Reddit Sleuth - Requirements

## Functional Requirements

### 1. Authentication
- User registration and login with email/password
- Role-based access (admin and regular users)
- Admin dashboard for user management

### 2. Reddit User Profiling
- Search Reddit users by username
- Display profile data (karma, account age)
- Analyze activity patterns (active hours, days, timezone)
- Fetch posts and comments (up to 100 each)
- Generate word clouds from user content
- AI-powered sentiment analysis using Google Gemini 2.5 Flash
- Location detection from content
- Explainable AI (XAI) for sentiment classifications

### 3. Community Analysis
- Search subreddits by name
- Display community stats (members, creation date, moderators)
- Show recent posts and activity metrics
- Generate community word clouds
- Visualize member growth and activity trends

### 4. Link Analysis
- Find connections between subreddits (cross-community analysis)
- Identify shared users across communities
- Calculate community relationship strength
- Interactive network visualization of subreddit connections
- Discover community clusters and overlap patterns

### 5. Real-Time Monitoring
- Monitor Reddit users or communities live
- Check for new activity every 15 seconds
- Display activity feed with timestamps
- Start/stop monitoring controls
- Update word clouds and analytics in real-time

### 6. Case Management
- Create and manage investigation cases
- Track case status and evidence
- Dashboard with case overview
- Trending topics and communities

### 7. Data Visualization
- Interactive charts (bar, line, pie, word clouds)
- Responsive design for all screen sizes
- Forensic-themed color scheme

## Non-Functional Requirements

### Performance
- User profile analysis: < 10 seconds
- Real-time monitoring checks: < 3 seconds
- AI sentiment analysis: < 8 seconds for 25 items
- Support 100+ requests per minute

### Security
- Encrypted password storage
- Row Level Security (RLS) policies
- API credentials stored as secrets
- Input validation and CORS protection

### Reliability
- 99.5% uptime target
- Automatic error recovery
- Graceful handling of API failures
- Data integrity with atomic transactions

### Usability
- Dark forensic theme
- Responsive on all devices
- Clear error messages and loading states
- Accepts flexible input formats (with/without u/ or r/ prefixes)

### Maintainability
- TypeScript for type safety
- Modular, reusable components
- Comprehensive documentation
- Automated deployment

### Compliance
- Respect Reddit API rate limits
- Only access public data
- Follow ethical investigation practices

## Technology Stack
- **Frontend**: React 18, TypeScript, Vite, Tailwind CSS
- **Backend**: Supabase/Lovable Cloud (PostgreSQL, Edge Functions)
- **AI**: Google Gemini 2.5 Flash via Lovable AI Gateway
- **Visualization**: Recharts, React Force Graph 2D, Helios Web SDK
- **Authentication**: Supabase Auth

## Key APIs
- Reddit API (OAuth2)
- Lovable AI Gateway
- Supabase APIs
