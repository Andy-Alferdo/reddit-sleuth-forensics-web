# Reddit Sleuth - Infrastructure Setup Guide

This document provides detailed information on the backend infrastructure and features implemented in the Reddit Sleuth application.

## Table of Contents
1. [Overview](#overview)
2. [Edge Functions](#edge-functions)
3. [Secrets Management](#secrets-management)
4. [Reddit API Configuration](#reddit-api-configuration)
5. [Lovable AI Integration](#lovable-ai-integration)
6. [Database Schema](#database-schema)
7. [Report Generation](#report-generation)
8. [Deployment](#deployment)

---

## Overview

Reddit Sleuth uses **Lovable Cloud** (powered by Supabase) to provide backend functionality including:
- Reddit API integration via edge functions
- AI-powered content analysis using Lovable AI
- Secure secrets management
- Serverless architecture that auto-scales
- Community relationship detection

---

## Edge Functions

The application uses three serverless edge functions:

### 1. Reddit Scraper (`reddit-scraper`)

**Location**: `supabase/functions/reddit-scraper/index.ts`

**Purpose**: Authenticates with Reddit API and fetches user/community data including related communities

**Features**:
- OAuth2 client credentials authentication
- Fetches user profiles, posts, and comments
- Fetches subreddit information and posts
- **NEW**: Fetches community relations (related subreddits from widgets)
- Keyword search across Reddit
- Error handling for non-existent users/communities
- CORS enabled for web app access

**API Endpoint**:
```
POST https://<your-project>.supabase.co/functions/v1/reddit-scraper
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

**Response (Community)**:
```json
{
  "subreddit": {
    "display_name": "string",
    "subscribers": "number",
    "public_description": "string",
    "accounts_active": "number"
  },
  "posts": [...],
  "weeklyVisitors": "number",
  "activeUsers": "number"
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
POST https://<your-project>.supabase.co/functions/v1/analyze-content
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
  "commentSentiments": [
    {
      "text": "First 100 chars of comment...",
      "sentiment": "positive|negative|neutral",
      "explanation": "XAI reason for this classification"
    }
  ],
  "sentiment": {
    "postBreakdown": {
      "positive": 0.6,
      "neutral": 0.3,
      "negative": 0.1
    },
    "commentBreakdown": {
      "positive": 0.5,
      "neutral": 0.35,
      "negative": 0.15
    }
  },
  "locations": ["New York", "San Francisco", "California"],
  "patterns": {
    "topicInterests": ["technology", "programming", "gaming"]
  },
  "topSubreddits": [
    { "name": "technology", "count": 15 },
    { "name": "programming", "count": 10 }
  ],
  "stats": {
    "totalPosts": 50,
    "totalComments": 100,
    "totalActivity": 150
  }
}
```

**Environment Variables Required**:
- `LOVABLE_API_KEY` (auto-provided by Lovable Cloud)

---

### 3. Data Store (`data-store`)

**Location**: `supabase/functions/data-store/index.ts`

**Purpose**: Persists analysis results and investigation data to the database

---

## Secrets Management

All sensitive credentials are stored securely in Supabase Secrets.

### Current Secrets

| Secret | Purpose | Used By | How to Obtain |
|--------|---------|---------|---------------|
| `REDDIT_CLIENT_ID` | Reddit OAuth2 app client ID | `reddit-scraper` | https://www.reddit.com/prefs/apps |
| `REDDIT_CLIENT_SECRET` | Reddit OAuth2 app client secret | `reddit-scraper` | https://www.reddit.com/prefs/apps |
| `LOVABLE_API_KEY` | Authentication for Lovable AI | `analyze-content` | Auto-provided |
| `SUPABASE_URL` | Database URL | All functions | Auto-managed |
| `SUPABASE_ANON_KEY` | Database anon key | All functions | Auto-managed |

### How to Update Secrets

**Option 1: Through Lovable Interface**
- Access via: Settings → Backend → Secrets

**Option 2: Via Supabase CLI** (if connected to custom Supabase)
```bash
supabase secrets set REDDIT_CLIENT_ID=your_client_id
supabase secrets set REDDIT_CLIENT_SECRET=your_client_secret
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

Lovable AI is a gateway service that provides access to Google Gemini and OpenAI GPT models without requiring separate API keys.

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
   - Deduplicates and validates locations

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
- Charged per request after free tier
- View usage: Settings → Workspace → Usage

### Rate Limits

- Per-workspace rate limiting
- 429 error = too many requests (retry with backoff)
- 402 error = insufficient credits (add funds)

---

## Database Schema

### Tables Overview

| Table | Purpose |
|-------|---------|
| `profiles` | User profiles linked to auth |
| `user_roles` | User role assignments |
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
  department TEXT,
  lead_investigator TEXT,
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

### Row Level Security (RLS)

All tables have RLS enabled with policies for:
- Users can view their own data
- Users can CRUD their own investigation data
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
5. **Link Analysis** (NEW)
   - Network graph visualization
   - Community crossover connections
   - Relationship strength indicators
6. **Monitoring Data**
   - Activity timeline
   - Alert history

### Network Graph in Reports

The Link Analysis section includes:
- Visual network graph showing community connections
- Nodes represent subreddits
- Edges represent relationships (sidebar links, co-activity)
- Community crossover table with:
  - Source community
  - Related communities
  - Relationship type
  - Connection strength

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

// Reddit scraper - Community
const { data: communityData } = await supabase.functions.invoke('reddit-scraper', {
  body: { 
    subreddit: 'technology',
    type: 'community'
  }
});

// Content analyzer
const { data: analysis } = await supabase.functions.invoke('analyze-content', {
  body: {
    posts: userData.posts,
    comments: userData.comments
  }
});

// Access community relations (from user data)
const communityRelations = data.communityRelations;
```

### Error Handling

```typescript
if (error) {
  if (error.message.includes('not_found')) {
    toast.error('User/community not found');
  } else if (error.message.includes('rate_limit')) {
    toast.error('Rate limit exceeded. Please wait.');
  } else {
    toast.error('An error occurred');
  }
}
```

---

## Testing

### Test Reddit Scraper

```bash
# User lookup
curl -X POST https://<your-project>.supabase.co/functions/v1/reddit-scraper \
  -H "Content-Type: application/json" \
  -d '{"username": "spez", "type": "user"}'

# Community lookup
curl -X POST https://<your-project>.supabase.co/functions/v1/reddit-scraper \
  -H "Content-Type: application/json" \
  -d '{"subreddit": "technology", "type": "community"}'
```

### Test Content Analyzer

```bash
curl -X POST https://<your-project>.supabase.co/functions/v1/analyze-content \
  -H "Content-Type: application/json" \
  -d '{
    "posts": [{"title": "Hello World", "selftext": "This is a test post"}],
    "comments": [{"body": "Great post!"}]
  }'
```

---

## Troubleshooting

### Reddit API Issues

| Error | Cause | Solution |
|-------|-------|----------|
| "Failed to authenticate" | Invalid credentials | Verify REDDIT_CLIENT_ID and REDDIT_CLIENT_SECRET |
| "User not found" | Username doesn't exist | Verify spelling (case-sensitive) |
| 429 Rate Limited | Too many requests | Implement backoff, wait 60s |

### AI Analysis Issues

| Error | Cause | Solution |
|-------|-------|----------|
| 429 Rate Limit | Too many AI requests | Add delays, reduce batch size |
| 402 Payment Required | Insufficient credits | Add credits in Settings |
| Parse Error | Invalid JSON response | Check AI prompt formatting |

### Community Relations Not Showing

| Issue | Cause | Solution |
|-------|-------|----------|
| Empty communityRelations | Subreddit has no widgets | This is normal for some subreddits |
| Only some relations found | Not all subreddits have related communities | Expected behavior |

---

## Security Best Practices

1. **Never commit secrets to code** - Use Supabase Secrets
2. **Use RLS policies** - Protect sensitive data
3. **Validate input** - Sanitize user input in edge functions
4. **Monitor logs** - Check for unusual patterns
5. **Rate limiting** - Implement client-side rate limiting

---

## Additional Resources

- [Supabase Documentation](https://supabase.com/docs)
- [Lovable Cloud Docs](https://docs.lovable.dev/features/cloud)
- [Lovable AI Docs](https://docs.lovable.dev/features/ai)
- [Reddit API Documentation](https://www.reddit.com/dev/api)
- [Google Gemini Models](https://ai.google.dev/models/gemini)
