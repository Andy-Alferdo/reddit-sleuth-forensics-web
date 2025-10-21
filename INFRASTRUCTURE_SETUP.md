# Reddit Sleuth - Infrastructure Setup Guide

This document provides detailed information on the Supabase infrastructure and features implemented in the Reddit Sleuth application.

## Table of Contents
1. [Overview](#overview)
2. [Edge Functions](#edge-functions)
3. [Secrets Management](#secrets-management)
4. [Reddit API Configuration](#reddit-api-configuration)
5. [Lovable AI Integration](#lovable-ai-integration)
6. [Database Schema](#database-schema)
7. [Deployment](#deployment)

---

## Overview

Reddit Sleuth uses **Lovable Cloud** (powered by Supabase) to provide backend functionality including:
- Reddit API integration via edge functions
- AI-powered content analysis using Lovable AI
- Secure secrets management
- Serverless architecture that auto-scales

---

## Edge Functions

The application uses two serverless edge functions that run on Supabase/Lovable Cloud:

### 1. Reddit Scraper (`reddit-scraper`)

**Location**: `supabase/functions/reddit-scraper/index.ts`

**Purpose**: Authenticates with Reddit API and fetches user/community data

**Features**:
- OAuth2 client credentials authentication
- Fetches user profiles, posts, and comments
- Fetches subreddit information and posts
- Error handling for non-existent users/communities
- CORS enabled for web app access

**API Endpoint**:
```
POST https://djcdnudwnyhajnzwykoq.supabase.co/functions/v1/reddit-scraper
```

**Request Body**:
```json
{
  "username": "string",      // For user profiling
  "type": "user|community",  // Type of scraping
  "subreddit": "string"      // For community analysis
}
```

**Response** (User):
```json
{
  "user": {
    "name": "string",
    "created_utc": "number",
    "link_karma": "number",
    "comment_karma": "number"
    // ... other Reddit user fields
  },
  "posts": [...],
  "comments": [...]
}
```

**Response** (Community):
```json
{
  "subreddit": {
    "display_name": "string",
    "subscribers": "number",
    "public_description": "string"
    // ... other subreddit fields
  },
  "posts": [...]
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
- Sentiment analysis (positive, negative, neutral)
- Location detection from text
- Behavior pattern identification
- Powered by Google Gemini 2.5 Flash via Lovable AI

**API Endpoint**:
```
POST https://djcdnudwnyhajnzwykoq.supabase.co/functions/v1/analyze-content
```

**Request Body**:
```json
{
  "posts": [
    {
      "title": "string",
      "selftext": "string"
    }
  ],
  "comments": [
    {
      "body": "string"
    }
  ]
}
```

**Response**:
```json
{
  "sentiment": {
    "overall": "positive|negative|neutral",
    "score": 0.75,
    "breakdown": {
      "positive": 0.6,
      "neutral": 0.3,
      "negative": 0.1
    }
  },
  "locations": ["New York", "San Francisco"],
  "behaviorPatterns": [
    "Active in technology discussions",
    "Frequently posts about coding"
  ]
}
```

**Environment Variables Required**:
- `LOVABLE_API_KEY` (auto-provided by Lovable Cloud)

---

## Secrets Management

All sensitive credentials are stored securely in Supabase Secrets and injected as environment variables at runtime.

### Current Secrets

1. **REDDIT_CLIENT_ID**
   - Purpose: Reddit OAuth2 app client ID
   - Used by: `reddit-scraper` edge function
   - How to obtain: Reddit app settings at https://www.reddit.com/prefs/apps

2. **REDDIT_CLIENT_SECRET**
   - Purpose: Reddit OAuth2 app client secret
   - Used by: `reddit-scraper` edge function
   - How to obtain: Reddit app settings at https://www.reddit.com/prefs/apps

3. **LOVABLE_API_KEY**
   - Purpose: Authentication for Lovable AI gateway
   - Used by: `analyze-content` edge function
   - Auto-provided: Yes (managed by Lovable Cloud)

4. **SUPABASE_URL**
   - Auto-managed by Lovable Cloud

5. **SUPABASE_ANON_KEY**
   - Auto-managed by Lovable Cloud

### How to Update Secrets

**Option 1: Through Lovable Interface**
- Secrets are managed through the Lovable Cloud backend interface
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
     - **Name**: Reddit Sleuth (or your preferred name)
     - **App Type**: Select **"script"**
     - **Description**: Intelligence analysis tool for Reddit
     - **About URL**: (leave blank or add your site)
     - **Redirect URI**: `http://localhost:8080`
   - Click "Create app"

2. **Retrieve Credentials**:
   - **Client ID**: The string under the app name (starts with random characters)
   - **Client Secret**: The "secret" field

3. **Configure in Lovable Cloud**:
   - Update the `REDDIT_CLIENT_ID` secret with your client ID
   - Update the `REDDIT_CLIENT_SECRET` secret with your client secret

### Authentication Flow

The application uses the **Client Credentials** OAuth2 flow:
- No user authentication required
- Direct server-to-server authentication
- Access to public Reddit data only
- Token automatically refreshed by edge function

---

## Lovable AI Integration

### What is Lovable AI?

Lovable AI is a gateway service that provides access to Google Gemini and OpenAI GPT models without requiring separate API keys.

### Current Implementation

**Model Used**: `google/gemini-2.5-flash`
- Balanced performance and cost
- Good at multimodal tasks (text analysis)
- Fast response times

**Features Powered by AI**:
1. **Sentiment Analysis**
   - Analyzes emotional tone of posts/comments
   - Provides overall sentiment + breakdown
   - Confidence scores included

2. **Location Detection**
   - Extracts mentioned locations from text
   - Identifies cities, states, countries
   - Deduplicates and validates locations

3. **Behavior Pattern Analysis**
   - Identifies posting patterns
   - Detects topic interests
   - Recognizes communication style

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

### Current Tables

The application uses the following Supabase tables:

#### 1. **profiles**
```sql
CREATE TABLE public.profiles (
  id UUID REFERENCES auth.users PRIMARY KEY,
  email TEXT,
  full_name TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### 2. **user_roles**
```sql
CREATE TYPE app_role AS ENUM ('user', 'admin');

CREATE TABLE public.user_roles (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users,
  role app_role NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Row Level Security (RLS)

RLS policies ensure users can only access their own data:

**profiles table**:
- Users can view their own profile
- Users can update their own profile
- Admins can view all profiles

**user_roles table**:
- Only accessible by authenticated users
- Admins can manage all roles

---

## Deployment

### Edge Functions Configuration

**File**: `supabase/config.toml`

```toml
project_id = "djcdnudwnyhajnzwykoq"

[functions.reddit-scraper]
verify_jwt = false

[functions.analyze-content]
verify_jwt = false
```

**Key Settings**:
- `verify_jwt = false`: Makes functions publicly accessible (no auth required)
- Enables CORS for web app integration

### Automatic Deployment

Edge functions are **automatically deployed** when you:
1. Make changes to function code
2. Save/commit changes in Lovable
3. Lovable Cloud handles deployment

**No manual deployment steps required!**

### Monitoring

**View Edge Function Logs**:
1. Access Lovable Cloud backend
2. Navigate to Edge Functions section
3. Select function to view logs
4. Monitor errors, performance, invocations

**Common Log Patterns**:
```
Reddit scraper called for: username, type: user
Reddit token obtained successfully
Fetched X posts
Fetched X comments
```

---

## Calling Edge Functions from Frontend

### Using Supabase Client

```typescript
import { supabase } from "@/integrations/supabase/client";

// Reddit scraper
const { data, error } = await supabase.functions.invoke('reddit-scraper', {
  body: { 
    username: 'someuser',
    type: 'user'
  }
});

// Content analyzer
const { data: analysis, error: analysisError } = await supabase.functions.invoke('analyze-content', {
  body: {
    posts: userData.posts,
    comments: userData.comments
  }
});
```

### Error Handling

```typescript
if (error) {
  if (error.message.includes('not_found')) {
    // User/community not found
  } else {
    // Other errors
  }
}
```

---

## Testing

### Test Reddit Scraper

```bash
curl -X POST https://djcdnudwnyhajnzwykoq.supabase.co/functions/v1/reddit-scraper \
  -H "Content-Type: application/json" \
  -d '{"username": "spez", "type": "user"}'
```

### Test Content Analyzer

```bash
curl -X POST https://djcdnudwnyhajnzwykoq.supabase.co/functions/v1/analyze-content \
  -H "Content-Type: application/json" \
  -d '{
    "posts": [{"title": "Hello", "selftext": "This is a test"}],
    "comments": [{"body": "Great post!"}]
  }'
```

---

## Troubleshooting

### Reddit API Issues

**Error**: "Failed to authenticate with Reddit API"
- **Cause**: Invalid or missing Reddit credentials
- **Solution**: Verify `REDDIT_CLIENT_ID` and `REDDIT_CLIENT_SECRET` are set correctly

**Error**: "User not found"
- **Cause**: Username doesn't exist on Reddit
- **Solution**: Verify username spelling (case-sensitive)

### AI Analysis Issues

**Error**: Rate limit (429)
- **Cause**: Too many AI requests
- **Solution**: Add delays between requests or upgrade plan

**Error**: Payment required (402)
- **Cause**: Insufficient Lovable AI credits
- **Solution**: Add credits in Settings → Workspace → Usage

### Edge Function Issues

**Error**: Function not found
- **Cause**: Function not deployed or incorrect name
- **Solution**: Check `supabase/config.toml` and redeploy

**Error**: CORS error
- **Cause**: Missing CORS headers
- **Solution**: Verify corsHeaders are included in function response

---

## Security Best Practices

1. **Never commit secrets to code**
   - Always use Supabase Secrets
   - Keep `.env` in `.gitignore`

2. **Use RLS policies**
   - Protect sensitive data
   - Limit user access appropriately

3. **Validate input**
   - Sanitize user input in edge functions
   - Prevent injection attacks

4. **Monitor logs**
   - Regularly check edge function logs
   - Watch for unusual patterns

5. **Rate limiting**
   - Implement client-side rate limiting
   - Prevent abuse of edge functions

---

## Additional Resources

- [Supabase Documentation](https://supabase.com/docs)
- [Lovable Cloud Docs](https://docs.lovable.dev/features/cloud)
- [Lovable AI Docs](https://docs.lovable.dev/features/ai)
- [Reddit API Documentation](https://www.reddit.com/dev/api)
- [Google Gemini Models](https://ai.google.dev/models/gemini)

---

## Support

For issues or questions:
- **Lovable Support**: support@lovable.dev
- **Lovable Discord**: [Join Community](https://discord.gg/lovable)
- **Documentation**: https://docs.lovable.dev

---

*Last Updated: 2025-10-21*
*Project ID: djcdnudwnyhajnzwykoq*
