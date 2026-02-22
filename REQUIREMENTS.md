# Reddit Sleuth - Requirements

## Functional Requirements

### 1. Authentication & Authorization
- User registration and login with email/password
- Role-based access control (admin, user)
- Admin dashboard for user management
- Session management and secure logout
- Password reset functionality (admin-initiated)
- User invitation system via email

### 2. Case Management
- Create new investigation cases with unique case numbers (CASE-YYYY-XXX format)
- Track case status (active, closed, pending)
- Assign investigators and investigation units
- Sensitive case protection with password
- View all cases on home dashboard
- Filter and search existing cases
- Cache duration settings for case data
- Auto-generated case numbers unique per user per year

### 3. Reddit User Profiling
- Search Reddit users by username (with or without u/ prefix)
- Display profile data:
  - Account age
  - Post karma and comment karma
  - Total karma
- Analyze activity patterns:
  - Most active hours (converted to PKT timezone)
  - Most active days of the week
  - Estimated timezone
- Fetch posts and comments (up to 100 each)
- Generate word clouds from user content with frequency categories:
  - High frequency (red)
  - Medium frequency (green)
  - Low frequency (blue)
- AI-powered sentiment analysis using Google Gemini 2.5 Flash:
  - Per-post sentiment with explanations
  - Per-comment sentiment with explanations
  - Overall sentiment breakdown percentages
- Location detection from content:
  - Cities, states, countries
  - Neighborhoods, landmarks
  - Timezone references
  - Location-related phrases
- Explainable AI (XAI) for sentiment classifications
- Save analyzed profiles to active case

### 4. Community Analysis
- Search subreddits by name (with or without r/ prefix)
- Display community statistics:
  - Subscriber count
  - Creation date
  - Public description
  - Moderator list
- Show recent posts and activity metrics
- Post frequency chart with exact dates (format: Day, DD-MM-YYYY)
- Generate community word clouds
- Visualize member growth and activity trends
- Analyze community sentiment

### 5. Link Analysis
- Find connections between subreddits
- Identify shared users across communities
- Calculate community relationship strength
- Interactive network visualization of subreddit connections
- Discover community clusters and overlap patterns
- Force-directed graph visualization

### 6. Real-Time Monitoring
- Monitor Reddit users or communities live
- Automatic activity checks every 15 seconds
- Display activity feed with timestamps
- Start/stop monitoring controls
- Update word clouds in real-time
- Track new activity count
- Posts (Last 7 Days) chart with accurate daily counts
- Activity breakdown chart (posts vs comments)
- Full-width notifications display
- Save monitoring sessions to database

### 7. Report Generation
- Generate comprehensive investigation reports
- Include multiple modules:
  - Case summary
  - User profiles analyzed
  - Community analysis
  - Link analysis results
  - Monitoring data
- Export in PDF format
- Customizable report sections
- Professional formatting with case details
- Auto-populated case fields (Case Number, Case Name, Investigation Unit, Date Generated)

### 8. Data Visualization
- Interactive charts (bar, line, pie, area)
- Word clouds with color-coded categories
- Network graphs for relationship mapping
- Activity timeline charts
- Sentiment distribution charts
- Responsive design for all screen sizes
- OSINT-themed dark color scheme

### 9. Dashboard
- Home page with case creation/selection
- Case dashboard with:
  - Active cases count
  - Analyzed users count
  - Posts scraped count
  - Recent activity feed
- Quick navigation to all features
- Case context maintained across pages

### 10. Admin Features
- User management dashboard
- Create new users with role assignment
- View all registered users
- Reset user passwords
- Send email invitations to new users
- View audit logs of system actions
- Manage user roles (admin/user)

## Non-Functional Requirements

### Performance
- User profile analysis: < 10 seconds
- Real-time monitoring checks: < 3 seconds
- AI sentiment analysis: < 8 seconds for 25 items
- Page load time: < 2 seconds
- Support 100+ requests per minute

### Security
- Encrypted password storage (bcrypt)
- Row Level Security (RLS) policies on all tables
- API credentials stored as encrypted secrets
- Input validation and sanitization
- CORS protection
- JWT token authentication
- No sensitive data in client-side code
- Audit logging for admin actions

### Reliability
- 99.5% uptime target
- Automatic error recovery
- Graceful handling of API failures
- Data integrity with atomic transactions
- Fallback values for missing data

### Usability
- Dark OSINT theme with good contrast
- Responsive on all devices (desktop, tablet, mobile)
- Clear error messages and loading states
- Flexible input formats (with/without u/ or r/ prefixes)
- Intuitive navigation
- Keyboard shortcuts for common actions

### Maintainability
- TypeScript for type safety
- Modular, reusable components
- Comprehensive documentation
- Automated deployment
- Clean code architecture
- Consistent coding standards

### Scalability
- Serverless edge functions
- Connection pooling for database
- Caching for frequently accessed data
- Pagination for large datasets
- Efficient query optimization

### Compliance
- Respect Reddit API rate limits (60 req/min)
- Only access public data
- Follow ethical investigation practices
- Data retention policies
- User consent for data collection

## Technology Stack

### Frontend
- React 18
- TypeScript 5
- Vite 5
- Tailwind CSS 3
- shadcn/ui components
- Lucide React icons
- Recharts for charts
- React Force Graph 2D

### Backend
- Lovable Cloud (powered by Supabase)
- PostgreSQL 15
- Deno Edge Functions
- Row Level Security

### AI/ML
- Google Gemini 2.5 Flash (via Lovable AI Gateway)
- Optional: Custom BERT models (python_ml directory)
- LIME/SHAP for explainability

### Authentication
- Supabase Auth
- Email/password authentication
- Role-based access control

### Email
- Resend API for invitations

### External APIs
- Reddit API (OAuth2 client credentials)
- Lovable AI Gateway

## Database Schema

### Tables
- `profiles` - Application user profiles
- `user_roles` - Role assignments (admin/user enum)
- `user_invites` - Pending user invitations
- `audit_logs` - System action logs
- `investigation_cases` - Case management (includes investigation_unit field stored as `department`)
- `reddit_posts` - Scraped posts
- `reddit_comments` - Scraped comments
- `user_profiles_analyzed` - Analyzed Reddit users
- `analysis_results` - Analysis outputs
- `monitoring_sessions` - Real-time monitoring data
- `investigation_reports` - Generated reports

## API Endpoints

### Edge Functions
1. `reddit-scraper` - Fetch Reddit user/community data
2. `analyze-content` - AI sentiment analysis
3. `data-store` - Data persistence operations
4. `admin-create-user` - Create users (admin only)
5. `admin-reset-password` - Reset passwords (admin only)
6. `send-invite-email` - Send email invitations

### Response Formats
- All responses in JSON
- Error responses include error code and message
- Pagination support for list endpoints

## Testing Requirements

- Unit tests for utility functions
- Integration tests for API endpoints
- E2E tests for critical user flows
- Performance testing for load scenarios
- Security testing for vulnerabilities

## Deployment Requirements

- Automatic deployment via Lovable
- Environment-based configuration
- Zero-downtime deployments
- Rollback capability
- Health monitoring

## Documentation Requirements

- README with quick start
- Local setup guide
- API documentation
- Database schema documentation
- Troubleshooting guide
- Contributing guidelines
