# Running Reddit Sleuth Locally - Complete Setup Guide

This guide explains how to run the Reddit Sleuth project entirely on your local system without Lovable Cloud/Gateway, using your own PostgreSQL database and direct API access.

---

## Table of Contents
1. [Prerequisites](#prerequisites)
2. [Local PostgreSQL Database Setup](#local-postgresql-database-setup)
3. [Database Schema Recreation](#database-schema-recreation)
4. [Environment Configuration](#environment-configuration)
5. [API Keys Setup](#api-keys-setup)
6. [Modifying Edge Functions for Direct API Access](#modifying-edge-functions-for-direct-api-access)
7. [Running the Application Locally](#running-the-application-locally)
8. [Troubleshooting](#troubleshooting)

---

## Prerequisites

Install the following on your system:

1. **Node.js** (v18 or higher): https://nodejs.org/
2. **PostgreSQL** (v14 or higher): https://www.postgresql.org/download/
3. **Git**: https://git-scm.com/downloads
4. **npm** or **bun**: Comes with Node.js
5. **Supabase CLI** (optional, for edge functions): https://supabase.com/docs/guides/cli

---

## Local PostgreSQL Database Setup

### Step 1: Install PostgreSQL

**On Windows:**
- Download installer from https://www.postgresql.org/download/windows/
- Run installer and set a password for the `postgres` user
- Default port: 5432

**On macOS:**
```bash
brew install postgresql@14
brew services start postgresql@14
```

**On Linux (Ubuntu/Debian):**
```bash
sudo apt update
sudo apt install postgresql postgresql-contrib
sudo systemctl start postgresql
```

### Step 2: Create Database

Open PostgreSQL command line (psql):

```bash
# On Windows: Use pgAdmin or Command Prompt
psql -U postgres

# On macOS/Linux:
sudo -u postgres psql
```

Create the database:

```sql
CREATE DATABASE reddit_sleuth;
\c reddit_sleuth
```

### Step 3: Create Database User (Optional but recommended)

```sql
CREATE USER reddit_admin WITH PASSWORD 'your_secure_password';
GRANT ALL PRIVILEGES ON DATABASE reddit_sleuth TO reddit_admin;
\c reddit_sleuth
GRANT ALL ON SCHEMA public TO reddit_admin;
```

---

## Database Schema Recreation

Connect to your database and run the following SQL commands to recreate the exact schema:

```sql
-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create app_role enum
CREATE TYPE public.app_role AS ENUM ('admin', 'moderator', 'user');

-- Create profiles table
CREATE TABLE public.profiles (
    id UUID PRIMARY KEY,
    email TEXT,
    full_name TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create user_roles table
CREATE TABLE public.user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    role app_role NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, role)
);

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for profiles updated_at
CREATE TRIGGER update_profiles_updated_at
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- Create security definer function for role checking
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1
        FROM public.user_roles
        WHERE user_id = _user_id
          AND role = _role
    )
$$;

-- Note: RLS policies require auth.uid() which is Supabase-specific
-- For local PostgreSQL without Supabase Auth, you'll need to implement
-- authentication differently or disable RLS for development
```

### Adding Authentication Support (Without Supabase)

Since `auth.users` is Supabase-specific, you have two options:

**Option A: Use Supabase Local Development**
- Install Supabase CLI and run `supabase init` and `supabase start`
- This gives you local Supabase Auth

**Option B: Create Your Own Auth Table**
```sql
CREATE TABLE public.users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT UNIQUE NOT NULL,
    encrypted_password TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add foreign key to profiles
ALTER TABLE public.profiles
ADD CONSTRAINT profiles_user_id_fkey
FOREIGN KEY (id) REFERENCES public.users(id) ON DELETE CASCADE;

-- Add foreign key to user_roles
ALTER TABLE public.user_roles
ADD CONSTRAINT user_roles_user_id_fkey
FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;
```

---

## Environment Configuration

### Step 1: Create `.env.local` File

Create a `.env.local` file in the project root:

```env
# Database Connection
VITE_DATABASE_URL=postgresql://reddit_admin:your_secure_password@localhost:5432/reddit_sleuth

# Reddit API Credentials
VITE_REDDIT_CLIENT_ID=your_reddit_client_id
VITE_REDDIT_CLIENT_SECRET=your_reddit_client_secret

# Google Gemini API
VITE_GEMINI_API_KEY=your_gemini_api_key

# Application Settings
VITE_API_URL=http://localhost:3000
```

### Step 2: Update Supabase Client

Since you're not using Supabase, you'll need to replace the Supabase client with a PostgreSQL client.

Install PostgreSQL client:
```bash
npm install pg
```

Create a new database client file `src/lib/database.ts`:

```typescript
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: import.meta.env.VITE_DATABASE_URL,
  ssl: false // Set to true if using SSL
});

export const query = async (text: string, params?: any[]) => {
  const result = await pool.query(text, params);
  return result.rows;
};

export default pool;
```

---

## API Keys Setup

### 1. Reddit API Setup

1. Go to https://www.reddit.com/prefs/apps
2. Click "Create App" or "Create Another App"
3. Fill in:
   - **Name**: Reddit Sleuth Local
   - **App type**: Script
   - **Description**: Local development
   - **About URL**: http://localhost:8080
   - **Redirect URI**: http://localhost:8080/callback
4. Click "Create app"
5. Note down:
   - **Client ID** (under the app name)
   - **Client Secret** (next to "secret")

### 2. Google Gemini API Setup

1. Go to https://makersuite.google.com/app/apikey
2. Click "Create API Key"
3. Select or create a Google Cloud project
4. Copy the API key
5. Add to `.env.local`

**Pricing**: https://ai.google.dev/pricing
- Gemini 2.5 Flash: $0.075 per 1M input tokens, $0.30 per 1M output tokens
- Has free tier with rate limits

---

## Modifying Edge Functions for Direct API Access

### Option 1: Convert to Express.js Backend

Create a local Express server `server/index.js`:

```javascript
import express from 'express';
import cors from 'cors';
import fetch from 'node-fetch';

const app = express();
app.use(cors());
app.use(express.json());

// Reddit Scraper Endpoint
app.post('/api/reddit-scraper', async (req, res) => {
  const { username, type, subreddit } = req.body;
  
  try {
    // Get Reddit OAuth token
    const tokenResponse = await fetch('https://www.reddit.com/api/v1/access_token', {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${Buffer.from(
          `${process.env.REDDIT_CLIENT_ID}:${process.env.REDDIT_CLIENT_SECRET}`
        ).toString('base64')}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: 'grant_type=client_credentials',
    });
    
    const { access_token } = await tokenResponse.json();
    
    // Fetch Reddit data based on type
    let data = {};
    
    if (type === 'user') {
      const aboutRes = await fetch(`https://oauth.reddit.com/user/${username}/about`, {
        headers: { 'Authorization': `Bearer ${access_token}` }
      });
      const postsRes = await fetch(`https://oauth.reddit.com/user/${username}/submitted?limit=100`, {
        headers: { 'Authorization': `Bearer ${access_token}` }
      });
      const commentsRes = await fetch(`https://oauth.reddit.com/user/${username}/comments?limit=100`, {
        headers: { 'Authorization': `Bearer ${access_token}` }
      });
      
      data = {
        about: await aboutRes.json(),
        posts: await postsRes.json(),
        comments: await commentsRes.json()
      };
    } else if (type === 'community') {
      const aboutRes = await fetch(`https://oauth.reddit.com/r/${subreddit}/about`, {
        headers: { 'Authorization': `Bearer ${access_token}` }
      });
      const postsRes = await fetch(`https://oauth.reddit.com/r/${subreddit}/hot?limit=100`, {
        headers: { 'Authorization': `Bearer ${access_token}` }
      });
      
      data = {
        about: await aboutRes.json(),
        posts: await postsRes.json()
      };
    }
    
    res.json(data);
  } catch (error) {
    console.error('Reddit API Error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Analyze Content Endpoint
app.post('/api/analyze-content', async (req, res) => {
  const { posts, comments } = req.body;
  
  try {
    // Format content for Gemini
    const formattedContent = [
      ...posts.map(p => `POST: ${p.title}\n${p.selftext || ''}\nSubreddit: ${p.subreddit}`),
      ...comments.map(c => `COMMENT: ${c.body}\nSubreddit: ${c.subreddit}`)
    ].join('\n\n');
    
    // Call Google Gemini API directly
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: `Analyze the following Reddit content and provide sentiment analysis, detected locations, and behavior patterns in JSON format:\n\n${formattedContent}`
            }]
          }],
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 2048,
          }
        })
      }
    );
    
    if (!response.ok) {
      if (response.status === 429) {
        return res.status(429).json({ error: 'Rate limit exceeded. Please try again later.' });
      }
      throw new Error(`Gemini API error: ${response.status}`);
    }
    
    const data = await response.json();
    const analysisText = data.candidates[0].content.parts[0].text;
    
    // Parse JSON from response
    const jsonMatch = analysisText.match(/\{[\s\S]*\}/);
    const analysis = jsonMatch ? JSON.parse(jsonMatch[0]) : {};
    
    res.json(analysis);
  } catch (error) {
    console.error('Analysis Error:', error);
    res.status(500).json({ error: error.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
```

Install dependencies:
```bash
npm install express cors node-fetch dotenv
```

### Option 2: Use Supabase CLI Locally

```bash
# Install Supabase CLI
npm install -g supabase

# Initialize Supabase in your project
supabase init

# Start local Supabase (includes Auth, Database, Edge Functions)
supabase start

# This will give you local URLs for all services
```

Modify edge functions to use direct API calls:

**`supabase/functions/analyze-content/index.ts`** (Direct Gemini API):

```typescript
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { posts, comments } = await req.json();
    const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY');

    const formattedContent = [
      ...posts.map((p: any) => `POST: ${p.title}\n${p.selftext || ''}`),
      ...comments.map((c: any) => `COMMENT: ${c.body}`)
    ].join('\n\n');

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [{ text: `Analyze this Reddit content and return JSON with sentiment, locations, patterns:\n\n${formattedContent}` }]
          }],
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 2048,
          }
        })
      }
    );

    if (!response.ok) {
      throw new Error(`Gemini API Error: ${response.status}`);
    }

    const data = await response.json();
    const analysisText = data.candidates[0].content.parts[0].text;
    const jsonMatch = analysisText.match(/\{[\s\S]*\}/);
    const analysis = jsonMatch ? JSON.parse(jsonMatch[0]) : {};

    return new Response(JSON.stringify(analysis), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
```

---

## Running the Application Locally

### Option 1: With Express Backend

1. **Start PostgreSQL**:
   ```bash
   # Should already be running from earlier setup
   ```

2. **Start Express Backend**:
   ```bash
   cd server
   node index.js
   # Server runs on http://localhost:3000
   ```

3. **Start React Frontend**:
   ```bash
   npm install
   npm run dev
   # App runs on http://localhost:8080
   ```

4. **Update Frontend API Calls**:
   Replace Supabase function calls with direct API calls:

   ```typescript
   // Instead of:
   const { data } = await supabase.functions.invoke('reddit-scraper', { body: { username } });

   // Use:
   const response = await fetch('http://localhost:3000/api/reddit-scraper', {
     method: 'POST',
     headers: { 'Content-Type': 'application/json' },
     body: JSON.stringify({ username, type: 'user' })
   });
   const data = await response.json();
   ```

### Option 2: With Supabase CLI

1. **Start Supabase locally**:
   ```bash
   supabase start
   ```

2. **Deploy functions locally**:
   ```bash
   supabase functions deploy reddit-scraper
   supabase functions deploy analyze-content
   ```

3. **Update `.env.local`** with local Supabase URLs (provided by `supabase start`)

4. **Start React Frontend**:
   ```bash
   npm run dev
   ```

---

## Troubleshooting

### PostgreSQL Connection Issues
```bash
# Check if PostgreSQL is running
sudo systemctl status postgresql  # Linux
brew services list  # macOS
services.msc  # Windows (look for postgresql)

# Test connection
psql -U reddit_admin -d reddit_sleuth -h localhost
```

### Reddit API Rate Limits
- Reddit limits: 60 requests per minute
- Solution: Implement request queuing or caching

### Gemini API Errors
- **403 Forbidden**: Invalid API key
- **429 Too Many Requests**: Rate limited (free tier: 15 RPM)
- **400 Bad Request**: Check request format matches Gemini API specs

### CORS Issues
- Ensure backend has proper CORS headers
- For Express, use `cors` middleware
- For local Supabase, CORS is handled automatically

### Database Permission Errors
```sql
-- Grant all permissions to your user
GRANT ALL PRIVILEGES ON DATABASE reddit_sleuth TO reddit_admin;
\c reddit_sleuth
GRANT ALL ON SCHEMA public TO reddit_admin;
GRANT ALL ON ALL TABLES IN SCHEMA public TO reddit_admin;
```

---

## Summary

You now have a complete local setup:

1. ✅ Local PostgreSQL database with Reddit Sleuth schema
2. ✅ Direct Reddit API access (no gateway)
3. ✅ Direct Google Gemini API access (no Lovable AI Gateway)
4. ✅ Local backend (Express or Supabase CLI)
5. ✅ React frontend running locally

**Key Differences from Lovable Cloud:**
- You manage your own database
- You pay for API usage directly (Reddit is free, Gemini has free tier)
- You handle authentication yourself
- You deploy and scale your own infrastructure

**Cost Estimates:**
- PostgreSQL: Free (self-hosted)
- Reddit API: Free (with rate limits)
- Gemini API: Free tier available, then ~$0.075 per 1M tokens
- Total: $0-5/month for hobby projects

**Next Steps:**
- Implement authentication (JWT, session-based, or use Supabase Auth locally)
- Add rate limiting to your API endpoints
- Set up monitoring and logging
- Consider Docker containers for easier deployment
