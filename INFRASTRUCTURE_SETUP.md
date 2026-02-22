# Reddit Sleuth - Infrastructure Setup Guide

This document provides detailed information on the backend infrastructure and features implemented in the Reddit Sleuth Open-Source Intelligence Platform.

## Table of Contents
1. [Overview](#overview)
2. [Edge Functions](#edge-functions)
3. [Secrets Management](#secrets-management)
4. [Reddit API Configuration](#reddit-api-configuration)
5. [Lovable AI Integration](#lovable-ai-integration)
6. [Database Schema](#database-schema)
7. [Report Generation](#report-generation)
8. [Email Integration](#email-integration)
9. [Deployment](#deployment)

---

## Overview

Reddit Sleuth uses **Lovable Cloud** (powered by Supabase) to provide backend functionality including:
- Reddit API integration via edge functions
- AI-powered content analysis using Lovable AI (Google Gemini)
- Secure secrets management
- Serverless architecture that auto-scales
- Community relationship detection
- Email invitations via Resend
- Admin user management

---

## Edge Functions

The application uses six serverless edge functions:

### 1. Reddit Scraper (`reddit-scraper`)

**Location**: `supabase/functions/reddit-scraper/index.ts`

**Purpose**: Authenticates with Reddit API and fetches user/community data including related communities

**Features**:
- OAuth2 client credentials authentication
- Fetches user profiles, posts, and comments
- Fetches subreddit information and posts
- Fetches community relations (related subreddits from widgets)
- Keyword search across Reddit
- Error handling for non-existent users/communities
- CORS enabled for web app access

**API Endpoint**:
```
POST /functions/v1/reddit-scraper
```

**Request Body (User)**:
```json
{
  "username": "string",
  "type": "user"
}
```

**Request Body (Community)**:
```json
{
  "type": "community",
  "subreddit": "string"
}
```

**Request Body (Search)**:
```json
{
  "type": "search",
  "keyword": "string"
}
```

**Response (User)**:
```json
{
  "user": {
    "name": "string",
    "created_utc": "number",
    "link_karma": "number",
    "comment_karma": "number"
  },
  "posts": [...],
  "comments": [...],
  "communityRelations": [
    {
      "subreddit": "technology",
      "relatedTo": ["programming", "science", "gadgets"]
    }
  ]
}
```

**Environment Variables Required**:
- `REDDIT_CLIENT_ID`
- `REDDIT_CLIENT_SECRET`

---

### 2. Content Analyzer (`analyze-content`)

**Location**: `supabase/functions/analyze-content/index.ts`

**Purpose**: Analyzes Reddit posts and comments using AI to extract sentiment, locations, and behavior patterns

**Features**:
- Individual sentiment analysis for each post/comment
- Explainable AI (XAI) - provides reasoning for each sentiment
- Location detection from text (cities, states, countries, landmarks)
- Behavior pattern identification
- Topic interest detection
- Powered by Google Gemini 2.5 Flash via Lovable AI

**API Endpoint**:
```
POST /functions/v1/analyze-content
```

**Request Body**:
```json
{
  "posts": [
    {
      "title": "string",
      "selftext": "string",
      "subreddit": "string"
    }
  ],
  "comments": [
    {
      "body": "string",
      "subreddit": "string"
    }
  ]
}
```

**Response**:
```json
{
  "postSentiments": [
    {
      "text": "First 100 chars of post...",
      "sentiment": "positive|negative|neutral",
      "explanation": "XAI reason for this classification"
    }
  ],
  "commentSentiments": [...],
  "sentiment": {
    "postBreakdown": {
      "positive": 0.6,
      "neutral": 0.3,
      "negative": 0.1
    },
    "commentBreakdown": {...}
  },
  "locations": ["New York", "San Francisco"],
  "patterns": {
    "topicInterests": ["technology", "programming"]
  },
  "topSubreddits": [
    { "name": "technology", "count": 15 }
  ]
}
```

**Environment Variables Required**:
- `LOVABLE_API_KEY` (auto-provided by Lovable Cloud)

---

### 3. Data Store (`data-store`)

**Location**: `supabase/functions/data-store/index.ts`

**Purpose**: Persists analysis results and investigation data to the database

**Operations**:
- `createCase` - Create new investigation case
- `getCases` - List all cases for user
- `getCase` - Get single case details
- `updateCase` - Update case information
- `savePosts` - Save Reddit posts
- `getPosts` - Retrieve posts for a case
- `saveComments` - Save Reddit comments
- `getComments` - Retrieve comments for a case
- `saveUserProfile` - Save analyzed user profile
- `getUserProfiles` - Retrieve user profiles for a case
- `saveMonitoringSession` - Save monitoring session
- `getMonitoringSessions` - Retrieve monitoring sessions
- `saveAnalysis` - Save analysis results
- `getAnalyses` - Retrieve analysis results
- `saveReport` - Save generated report
- `getReports` - Retrieve reports
- `getCaseFullData` - Get all data for a case

---

### 4. Admin Create User (`admin-create-user`)

**Location**: `supabase/functions/admin-create-user/index.ts`

**Purpose**: Allows admins to create new users with specified roles

**Features**:
- Verifies admin authorization
- Creates user with email/password
- Assigns specified role (admin/user)
- Logs audit event

**Request Body**:
```json
{
  "email": "user@example.com",
  "password": "secure_password",
  "fullName": "User Name",
  "role": "user"
}
```

---

### 5. Admin Reset Password (`admin-reset-password`)

**Location**: `supabase/functions/admin-reset-password/index.ts`

**Purpose**: Allows admins to reset user passwords

**Features**:
- Verifies admin authorization
- Updates user password
- Logs audit event

**Request Body**:
```json
{
  "userId": "user-uuid",
  "newPassword": "new_secure_password"
}
```

---

### 6. Send Invite Email (`send-invite-email`)

**Location**: `supabase/functions/send-invite-email/index.ts`

**Purpose**: Sends email invitations to new users

**Features**:
- Uses Resend API for email delivery
- HTML formatted invitation email
- Includes invite link, role, and expiration

**Request Body**:
```json
{
  "email": "invitee@example.com",
  "inviteLink": "https://...",
  "role": "user",
  "expiresAt": "2024-01-15T00:00:00Z"
}
```

**Environment Variables Required**:
- `RESEND_API_KEY`
- `RESEND_FROM` (optional, defaults to onboarding@resend.dev)

---

## Secrets Management

All sensitive credentials are stored securely in Supabase Secrets.

### Current Secrets

| Secret | Purpose | Used By |
|--------|---------|---------|
| `REDDIT_CLIENT_ID` | Reddit OAuth2 app client ID | `reddit-scraper` |
| `REDDIT_CLIENT_SECRET` | Reddit OAuth2 app client secret | `reddit-scraper` |
| `LOVABLE_API_KEY` | Authentication for Lovable AI | `analyze-content` |
| `RESEND_API_KEY` | Email delivery API key | `send-invite-email` |
| `RESEND_FROM` | Sender email address | `send-invite-email` |
| `SUPABASE_URL` | Database URL | All functions |
| `SUPABASE_ANON_KEY` | Database anon key | All functions |
| `SUPABASE_SERVICE_ROLE_KEY` | Admin database access | Admin functions |
| `SUPABASE_DB_URL` | Direct database connection | Edge functions |

### How to Update Secrets

**Through Lovable Interface:**
- Access via: Settings → Cloud → Secrets

**Via Supabase CLI** (if connected to custom Supabase):
```bash
supabase secrets set REDDIT_CLIENT_ID=your_client_id
supabase secrets set REDDIT_CLIENT_SECRET=your_client_secret
supabase secrets set RESEND_API_KEY=your_resend_key
```

---

## Reddit API Configuration

### Setting Up Reddit OAuth App

1. **Create a Reddit App**:
   - Go to https://www.reddit.com/prefs/apps
   - Click "Create App" or "Create Another App"
   - Fill in the details:
     - **Name**: Reddit Sleuth
     - **App Type**: Select **"script"**
     - **Description**: Intelligence analysis tool for Reddit
     - **About URL**: (leave blank or add your site)
     - **Redirect URI**: `http://localhost:8080`
   - Click "Create app"

2. **Retrieve Credentials**:
   - **Client ID**: The string under the app name
   - **Client Secret**: The "secret" field

### Authentication Flow

The application uses the **Client Credentials** OAuth2 flow:
- No user authentication required
- Direct server-to-server authentication
- Access to public Reddit data only
- Token automatically refreshed by edge function

### Rate Limits

- 60 requests per minute
- 600 requests per 10 minutes
- Implement exponential backoff for 429 errors

---

## Lovable AI Integration

### What is Lovable AI?

Lovable AI is a gateway service that provides access to AI models without requiring separate API keys.

### Supported Models

- `google/gemini-2.5-pro` - Top-tier reasoning and multimodal
- `google/gemini-2.5-flash` - Balanced performance and cost (currently used)
- `google/gemini-2.5-flash-lite` - Fastest and cheapest
- `openai/gpt-5` - Powerful all-rounder
- `openai/gpt-5-mini` - Lower cost, good performance
- `openai/gpt-5-nano` - Speed and cost optimized

### Current Implementation

**Model Used**: `google/gemini-2.5-flash`
- Balanced performance and cost
- Good at multimodal tasks (text analysis)
- Fast response times
- Supports JSON output format

**Features Powered by AI**:

1. **Sentiment Analysis**
   - Analyzes emotional tone of posts/comments individually
   - Provides overall sentiment breakdown
   - Includes XAI explanations for each classification

2. **Location Detection**
   - Extracts mentioned locations from text
   - Identifies cities, states, countries, landmarks
   - Detects timezone and regional references

3. **Behavior Pattern Analysis**
   - Identifies topic interests
   - Recognizes communication style
   - Detects posting patterns

### API Endpoint

```
https://ai.gateway.lovable.dev/v1/chat/completions
```

### Pricing

- Usage-based pricing
- Free monthly usage included
- View usage: Settings → Workspace → Usage

---

## Database Schema

### Tables Overview

| Table | Purpose |
|-------|---------|
| `profiles` | User profiles linked to auth |
| `user_roles` | User role assignments (admin/user) |
| `user_invites` | Pending user invitations |
| `audit_logs` | System action logs |
| `investigation_cases` | Investigation case management |
| `reddit_posts` | Stored Reddit posts |
| `reddit_comments` | Stored Reddit comments |
| `user_profiles_analyzed` | Analyzed user profiles |
| `analysis_results` | Analysis results storage |
| `monitoring_sessions` | Real-time monitoring sessions |
| `investigation_reports` | Generated reports |

### Key Tables

#### investigation_cases
```sql
CREATE TABLE public.investigation_cases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_number TEXT NOT NULL UNIQUE,
  case_name TEXT NOT NULL,
  description TEXT,
  status TEXT DEFAULT 'active',
  priority TEXT DEFAULT 'medium',
  department TEXT,                    -- UI label: "Investigation Unit"
  lead_investigator TEXT,
  is_sensitive BOOLEAN DEFAULT false,
  case_password_hash TEXT,
  cache_duration_days INTEGER,
  created_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### user_profiles_analyzed
```sql
CREATE TABLE public.user_profiles_analyzed (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id UUID REFERENCES investigation_cases(id),
  username TEXT NOT NULL,
  account_age TEXT,
  total_karma INTEGER,
  post_karma INTEGER,
  comment_karma INTEGER,
  active_subreddits JSONB,
  activity_pattern JSONB,
  sentiment_analysis JSONB,
  post_sentiments JSONB,
  comment_sentiments JSONB,
  location_indicators JSONB,
  behavior_patterns JSONB,
  word_cloud JSONB,
  analyzed_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Database Functions

| Function | Purpose |
|----------|---------|
| `update_updated_at_column()` | Auto-update timestamps |
| `handle_new_user()` | Create profile on signup |
| `has_role()` | Check user role |
| `log_audit_event()` | Log admin actions |
| `generate_invite_token()` | Create invite tokens |
| `mark_invite_used()` | Mark invitation as used |
| `hash_case_password()` | Hash case passwords |
| `verify_case_password()` | Verify case passwords |

### Row Level Security (RLS)

All tables have RLS enabled with policies for:
- Users can view/modify their own data
- Users can CRUD their own investigation data
- Case-linked data requires case ownership
- Admins can view all data

---

## Report Generation

### Supported Formats

- **PDF**: Full-featured reports with charts and network graphs
- **HTML**: Web-viewable reports with styling

### Report Sections

1. **Cover Page**
2. **Executive Summary**
3. **User Profiling Analysis**
   - Sentiment breakdown charts
   - Activity patterns
   - Word cloud
4. **Community Analysis**
   - Subreddit statistics
   - Member analysis
5. **Link Analysis**
   - Network graph visualization
   - Community crossover connections
   - Relationship strength indicators
6. **Monitoring Data**
   - Activity timeline
   - Alert history

---

## Email Integration

### Resend Configuration

Reddit Sleuth uses Resend for email delivery:

1. **Get API Key**: Visit https://resend.com and create an account
2. **Add Secret**: Add `RESEND_API_KEY` to Lovable Cloud secrets
3. **Configure Sender**: Optionally set `RESEND_FROM` for custom sender address

### Email Features

- User invitation emails with role and expiration
- HTML formatted professional emails
- Automatic link generation

---

## Deployment

### Edge Functions Configuration

**File**: `supabase/config.toml`

```toml
project_id = "your-project-id"

[functions.reddit-scraper]
verify_jwt = false

[functions.analyze-content]
verify_jwt = false

[functions.data-store]
verify_jwt = false

[functions.admin-create-user]
verify_jwt = false

[functions.admin-reset-password]
verify_jwt = false

[functions.send-invite-email]
verify_jwt = false
```

### Automatic Deployment

Edge functions are **automatically deployed** when you:
1. Make changes to function code
2. Save/commit changes in Lovable
3. Lovable Cloud handles deployment

### Monitoring

**View Edge Function Logs**:
1. Access Lovable Cloud backend
2. Navigate to Edge Functions section
3. Select function to view logs

---

## Calling Edge Functions from Frontend

### Using Supabase Client

```typescript
import { supabase } from "@/integrations/supabase/client";

// Reddit scraper - User
const { data, error } = await supabase.functions.invoke('reddit-scraper', {
  body: { 
    username: 'someuser',
    type: 'user'
  }
});

// Content analyzer
const { data: analysis } = await supabase.functions.invoke('analyze-content', {
  body: {
    posts: userData.posts,
    comments: userData.comments
  }
});

// Admin create user (requires admin token)
const { data: newUser } = await supabase.functions.invoke('admin-create-user', {
  body: {
    email: 'new@user.com',
    password: 'password123',
    fullName: 'New User',
    role: 'user'
  }
});
```

### Error Handling

```typescript
if (error) {
  if (error.message.includes('not_found')) {
    toast.error('User not found');
  } else if (error.message.includes('rate_limit')) {
    toast.error('Rate limit exceeded, try again later');
  } else {
    toast.error('An error occurred');
  }
}
```

---

## Testing Edge Functions

### Using cURL

**Test Reddit Scraper**:
```bash
curl -X POST 'https://djcdnudwnyhajnzwykoq.supabase.co/functions/v1/reddit-scraper' \
  -H 'Content-Type: application/json' \
  -d '{"username": "testuser", "type": "user"}'
```

**Test Content Analyzer**:
```bash
curl -X POST 'https://djcdnudwnyhajnzwykoq.supabase.co/functions/v1/analyze-content' \
  -H 'Content-Type: application/json' \
  -d '{"posts": [{"title": "Test", "selftext": "Hello world"}], "comments": []}'
```

---

## Troubleshooting

### Reddit API Issues
- Verify REDDIT_CLIENT_ID and REDDIT_CLIENT_SECRET are set
- Check Reddit app is "script" type
- Ensure rate limits aren't exceeded

### AI Analysis Issues
- LOVABLE_API_KEY is auto-provided (shouldn't need manual setup)
- Check for rate limit (429) or payment (402) errors
- Verify request payload format

### Email Issues
- Verify RESEND_API_KEY is set correctly
- Check Resend dashboard for delivery status
- Verify sender email is verified in Resend

### Database Issues
- Check RLS policies if data not appearing
- Verify case_id references are correct
- Check user has appropriate permissions

---

## Security Best Practices

1. **Secrets**: Never commit secrets to code
2. **RLS**: All tables have Row Level Security enabled
3. **Validation**: All inputs are validated
4. **Audit**: Admin actions are logged
5. **Tokens**: JWTs are validated on protected operations

---

## Resources

- [Lovable Documentation](https://docs.lovable.dev)
- [Lovable Cloud](https://docs.lovable.dev/features/cloud)
- [Lovable AI](https://docs.lovable.dev/features/ai)
- [Reddit API](https://www.reddit.com/dev/api/)
- [Resend Documentation](https://resend.com/docs)
