# Running Reddit Sleuth Locally - Complete Setup Guide

This guide explains how to run the Reddit Sleuth project entirely on your local system without Lovable Cloud/Gateway, using your own PostgreSQL database and direct API access.

---

## Table of Contents
1. [Prerequisites](#prerequisites)
2. [Quick Start](#quick-start)
3. [Local PostgreSQL Database Setup](#local-postgresql-database-setup)
4. [Complete Database Schema](#complete-database-schema)
5. [Environment Configuration](#environment-configuration)
6. [API Keys Setup](#api-keys-setup)
7. [Backend Options](#backend-options)
8. [Edge Functions (Local)](#edge-functions-local)
9. [Using Custom Trained Models](#using-custom-trained-models)
10. [Adding Explainable AI (XAI)](#adding-explainable-ai-xai)
11. [Running the Application](#running-the-application-locally)
12. [Troubleshooting](#troubleshooting)

---

## Prerequisites

Install the following on your system:

1. **Node.js** (v18 or higher): https://nodejs.org/
2. **PostgreSQL** (v14 or higher): https://www.postgresql.org/download/
3. **Git**: https://git-scm.com/downloads
4. **npm** or **bun**: Comes with Node.js
5. **Python 3.9+** (optional, for custom ML models): https://www.python.org/downloads/
6. **Supabase CLI** (optional, for edge functions): https://supabase.com/docs/guides/cli

---

## Quick Start

For those who want to get running quickly:

```bash
# 1. Clone the repository
git clone <your-repo-url>
cd reddit-sleuth

# 2. Install dependencies
npm install

# 3. Set up PostgreSQL (see detailed instructions below)
# 4. Create .env.local file with your credentials
# 5. Start the development server
npm run dev
```

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
sudo systemctl enable postgresql
```

### Step 2: Create Database and User

Open PostgreSQL command line:

```bash
# On Windows: Use pgAdmin or Command Prompt
psql -U postgres

# On macOS/Linux:
sudo -u postgres psql
```

Create the database and user:

```sql
-- Create database
CREATE DATABASE reddit_sleuth;

-- Create user with secure password
CREATE USER reddit_admin WITH PASSWORD 'your_secure_password_here';

-- Grant privileges
GRANT ALL PRIVILEGES ON DATABASE reddit_sleuth TO reddit_admin;

-- Connect to the database
\c reddit_sleuth

-- Grant schema privileges
GRANT ALL ON SCHEMA public TO reddit_admin;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO reddit_admin;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO reddit_admin;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO reddit_admin;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO reddit_admin;
```

---

## Complete Database Schema

Connect to your database and run the following SQL to recreate the full schema:

```sql
-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Create app_role enum
DO $$ BEGIN
    CREATE TYPE public.app_role AS ENUM ('admin', 'user');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- =====================================================
-- PROFILES TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT UNIQUE,
    full_name TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- USER ROLES TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS public.user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    role app_role NOT NULL DEFAULT 'user',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, role)
);

-- =====================================================
-- INVESTIGATION CASES TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS public.investigation_cases (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    case_number TEXT NOT NULL UNIQUE,
    case_name TEXT NOT NULL,
    description TEXT,
    status TEXT DEFAULT 'active',
    priority TEXT DEFAULT 'medium',
    department TEXT,
    lead_investigator TEXT,
    created_by UUID REFERENCES public.profiles(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- REDDIT POSTS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS public.reddit_posts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    post_id TEXT UNIQUE,
    case_id UUID REFERENCES public.investigation_cases(id) ON DELETE CASCADE,
    author TEXT,
    subreddit TEXT,
    title TEXT,
    content TEXT,
    score INTEGER DEFAULT 0,
    num_comments INTEGER DEFAULT 0,
    permalink TEXT,
    created_utc TIMESTAMP WITH TIME ZONE,
    collected_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    sentiment TEXT,
    sentiment_explanation TEXT,
    metadata JSONB
);

-- =====================================================
-- REDDIT COMMENTS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS public.reddit_comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    comment_id TEXT UNIQUE,
    case_id UUID REFERENCES public.investigation_cases(id) ON DELETE CASCADE,
    author TEXT,
    subreddit TEXT,
    body TEXT,
    score INTEGER DEFAULT 0,
    link_title TEXT,
    permalink TEXT,
    created_utc TIMESTAMP WITH TIME ZONE,
    collected_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    sentiment TEXT,
    sentiment_explanation TEXT,
    metadata JSONB
);

-- =====================================================
-- USER PROFILES ANALYZED TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS public.user_profiles_analyzed (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    case_id UUID REFERENCES public.investigation_cases(id) ON DELETE CASCADE,
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
    analyzed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- ANALYSIS RESULTS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS public.analysis_results (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    case_id UUID REFERENCES public.investigation_cases(id) ON DELETE CASCADE,
    analysis_type TEXT NOT NULL,
    target TEXT NOT NULL,
    result_data JSONB,
    sentiment_data JSONB,
    analyzed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- MONITORING SESSIONS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS public.monitoring_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    case_id UUID REFERENCES public.investigation_cases(id) ON DELETE CASCADE,
    target_name TEXT NOT NULL,
    search_type TEXT NOT NULL,
    profile_data JSONB,
    activities JSONB,
    word_cloud_data JSONB,
    new_activity_count INTEGER DEFAULT 0,
    started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    ended_at TIMESTAMP WITH TIME ZONE
);

-- =====================================================
-- INVESTIGATION REPORTS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS public.investigation_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    case_id UUID REFERENCES public.investigation_cases(id) ON DELETE CASCADE,
    report_type TEXT NOT NULL,
    report_data JSONB,
    selected_modules JSONB,
    export_format TEXT,
    generated_by UUID REFERENCES public.profiles(id),
    generated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- HELPER FUNCTIONS
-- =====================================================

-- Function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to check user roles
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

-- =====================================================
-- TRIGGERS
-- =====================================================

-- Trigger for profiles updated_at
DROP TRIGGER IF EXISTS update_profiles_updated_at ON public.profiles;
CREATE TRIGGER update_profiles_updated_at
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- Trigger for investigation_cases updated_at
DROP TRIGGER IF EXISTS update_investigation_cases_updated_at ON public.investigation_cases;
CREATE TRIGGER update_investigation_cases_updated_at
    BEFORE UPDATE ON public.investigation_cases
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- =====================================================
-- INDEXES FOR PERFORMANCE
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_reddit_posts_case_id ON public.reddit_posts(case_id);
CREATE INDEX IF NOT EXISTS idx_reddit_posts_author ON public.reddit_posts(author);
CREATE INDEX IF NOT EXISTS idx_reddit_posts_subreddit ON public.reddit_posts(subreddit);
CREATE INDEX IF NOT EXISTS idx_reddit_comments_case_id ON public.reddit_comments(case_id);
CREATE INDEX IF NOT EXISTS idx_reddit_comments_author ON public.reddit_comments(author);
CREATE INDEX IF NOT EXISTS idx_user_profiles_analyzed_username ON public.user_profiles_analyzed(username);
CREATE INDEX IF NOT EXISTS idx_investigation_cases_status ON public.investigation_cases(status);

-- =====================================================
-- SAMPLE DATA (OPTIONAL)
-- =====================================================
-- Insert a default admin user
INSERT INTO public.profiles (id, email, full_name)
VALUES (gen_random_uuid(), 'admin@reddit-sleuth.local', 'System Administrator')
ON CONFLICT (email) DO NOTHING;

-- Grant admin role to the admin user
INSERT INTO public.user_roles (user_id, role)
SELECT id, 'admin'::app_role
FROM public.profiles
WHERE email = 'admin@reddit-sleuth.local'
ON CONFLICT (user_id, role) DO NOTHING;
```

---

## Environment Configuration

### Create `.env.local` File

Create a `.env.local` file in the project root:

```env
# ===========================================
# DATABASE CONFIGURATION
# ===========================================
VITE_DATABASE_URL=postgresql://reddit_admin:your_secure_password@localhost:5432/reddit_sleuth

# For direct PostgreSQL connection (if not using Supabase)
DATABASE_HOST=localhost
DATABASE_PORT=5432
DATABASE_NAME=reddit_sleuth
DATABASE_USER=reddit_admin
DATABASE_PASSWORD=your_secure_password

# ===========================================
# REDDIT API CREDENTIALS
# ===========================================
REDDIT_CLIENT_ID=your_reddit_client_id
REDDIT_CLIENT_SECRET=your_reddit_client_secret
REDDIT_USER_AGENT=RedditSleuth/1.0.0

# ===========================================
# AI/ML API KEYS
# ===========================================
# Google Gemini API (Direct - for local development)
GEMINI_API_KEY=your_gemini_api_key

# OR OpenAI API (Alternative)
OPENAI_API_KEY=your_openai_api_key

# OR Custom Model Server
MODEL_SERVER_URL=http://localhost:5000

# ===========================================
# SUPABASE LOCAL (If using Supabase CLI)
# ===========================================
# These are provided by `supabase start`
VITE_SUPABASE_URL=http://localhost:54321
VITE_SUPABASE_PUBLISHABLE_KEY=your_local_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_local_service_role_key

# ===========================================
# APPLICATION SETTINGS
# ===========================================
VITE_API_URL=http://localhost:3000
NODE_ENV=development
PORT=3000
```

---

## API Keys Setup

### 1. Reddit API Setup

1. Go to https://www.reddit.com/prefs/apps
2. Click "Create App" or "Create Another App"
3. Fill in:
   - **Name**: Reddit Sleuth Local
   - **App type**: Select **script**
   - **Description**: Local development for Reddit analysis
   - **About URL**: http://localhost:8080
   - **Redirect URI**: http://localhost:8080/callback
4. Click "Create app"
5. Note down:
   - **Client ID**: The string under the app name (e.g., `Ab1Cd2Ef3Gh4Ij`)
   - **Client Secret**: Next to "secret"

**Rate Limits:**
- 60 requests per minute
- 600 requests per 10 minutes
- Free to use

### 2. Google Gemini API Setup

1. Go to https://aistudio.google.com/app/apikey
2. Click "Create API Key"
3. Select or create a Google Cloud project
4. Copy the API key
5. Add to `.env.local` as `GEMINI_API_KEY`

**Pricing (as of 2024):**
- Gemini 1.5 Flash: Free tier with 15 RPM, 1M tokens/day
- Gemini 2.5 Flash: Similar pricing

### 3. OpenAI API Setup (Alternative)

1. Go to https://platform.openai.com/api-keys
2. Create a new API key
3. Add to `.env.local` as `OPENAI_API_KEY`

---

## Backend Options

### Option 1: Express.js Backend (Recommended for Local)

Create a complete Express.js backend server that replicates edge function behavior.

**Install dependencies:**
```bash
npm install express cors dotenv node-fetch
```

**Create `server/index.js`:**

```javascript
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const app = express();
app.use(cors());
app.use(express.json());

// Reddit OAuth Token Cache
let redditToken = null;
let tokenExpiry = 0;

// Get Reddit Access Token
async function getRedditToken() {
  if (redditToken && Date.now() < tokenExpiry) {
    return redditToken;
  }

  const auth = Buffer.from(
    `${process.env.REDDIT_CLIENT_ID}:${process.env.REDDIT_CLIENT_SECRET}`
  ).toString('base64');

  const response = await fetch('https://www.reddit.com/api/v1/access_token', {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${auth}`,
      'Content-Type': 'application/x-www-form-urlencoded',
      'User-Agent': process.env.REDDIT_USER_AGENT || 'RedditSleuth/1.0.0'
    },
    body: 'grant_type=client_credentials'
  });

  const data = await response.json();
  redditToken = data.access_token;
  tokenExpiry = Date.now() + (data.expires_in * 1000) - 60000;
  return redditToken;
}

// Reddit Scraper Endpoint
app.post('/api/reddit-scraper', async (req, res) => {
  const { username, type, subreddit, keyword } = req.body;
  
  try {
    const token = await getRedditToken();
    const headers = {
      'Authorization': `Bearer ${token}`,
      'User-Agent': process.env.REDDIT_USER_AGENT || 'RedditSleuth/1.0.0'
    };

    if (type === 'search') {
      // Search for keyword
      const searchResponse = await fetch(
        `https://oauth.reddit.com/search?q=${encodeURIComponent(keyword)}&limit=100&sort=relevance&t=week`,
        { headers }
      );
      const searchData = await searchResponse.json();
      const posts = searchData.data?.children?.map(c => c.data) || [];
      
      res.json({ posts, keyword });
      
    } else if (type === 'user') {
      // Fetch user data
      const [aboutRes, postsRes, commentsRes] = await Promise.all([
        fetch(`https://oauth.reddit.com/user/${username}/about`, { headers }),
        fetch(`https://oauth.reddit.com/user/${username}/submitted?limit=100`, { headers }),
        fetch(`https://oauth.reddit.com/user/${username}/comments?limit=100`, { headers })
      ]);

      if (aboutRes.status === 404) {
        return res.json({ error: 'not_found', message: `User ${username} not found` });
      }

      const [about, postsData, commentsData] = await Promise.all([
        aboutRes.json(),
        postsRes.json(),
        commentsRes.json()
      ]);

      const posts = postsData.data?.children?.map(c => c.data) || [];
      const comments = commentsData.data?.children?.map(c => c.data) || [];

      // Get active subreddits
      const activeSubreddits = new Set();
      posts.forEach(p => activeSubreddits.add(p.subreddit));
      comments.forEach(c => activeSubreddits.add(c.subreddit));
      
      // Fetch related communities for top subreddits
      const topSubreddits = Array.from(activeSubreddits).slice(0, 5);
      const communityRelations = [];
      
      for (const sub of topSubreddits) {
        try {
          const widgetsResponse = await fetch(
            `https://oauth.reddit.com/r/${sub}/api/widgets`,
            { headers }
          );
          
          if (widgetsResponse.ok) {
            const widgetsData = await widgetsResponse.json();
            const relatedSubs = [];
            
            if (widgetsData.items) {
              for (const key of Object.keys(widgetsData.items)) {
                const widget = widgetsData.items[key];
                if (widget.kind === 'community-list' && widget.data) {
                  widget.data.forEach(item => {
                    if (item.name && item.name !== sub) {
                      relatedSubs.push(item.name.replace(/^r\//, ''));
                    }
                  });
                }
              }
            }
            
            if (relatedSubs.length > 0) {
              communityRelations.push({
                subreddit: sub,
                relatedTo: relatedSubs.slice(0, 5)
              });
            }
          }
        } catch (e) {
          console.log(`Could not fetch widgets for r/${sub}`);
        }
      }

      res.json({
        user: about.data,
        posts,
        comments,
        communityRelations
      });

    } else if (type === 'community') {
      // Fetch subreddit data
      const [aboutRes, postsRes] = await Promise.all([
        fetch(`https://oauth.reddit.com/r/${subreddit}/about`, { headers }),
        fetch(`https://oauth.reddit.com/r/${subreddit}/hot?limit=100`, { headers })
      ]);

      if (aboutRes.status === 404) {
        return res.json({ error: 'not_found', message: `Subreddit r/${subreddit} not found` });
      }

      const [about, postsData] = await Promise.all([
        aboutRes.json(),
        postsRes.json()
      ]);

      res.json({
        subreddit: about.data,
        posts: postsData.data?.children?.map(c => c.data) || [],
        weeklyVisitors: about.data.accounts_active || 0,
        activeUsers: about.data.active_user_count || 0
      });
    }

  } catch (error) {
    console.error('Reddit API Error:', error);
    res.status(500).json({ error: 'api_error', message: error.message });
  }
});

// Content Analyzer Endpoint (using Gemini)
app.post('/api/analyze-content', async (req, res) => {
  const { posts, comments } = req.body;
  
  try {
    const formattedPosts = posts.slice(0, 10).map((p, idx) => 
      `POST${idx + 1}: ${p.title} ${p.selftext || ''}`.slice(0, 500)
    );
    const formattedComments = comments.slice(0, 15).map((c, idx) => 
      `COMMENT${idx + 1}: ${c.body}`.slice(0, 300)
    );

    const prompt = `Analyze sentiment for each post and comment. Return ONLY valid JSON.

CRITICAL: You must analyze EVERY post and comment individually.

LOCATION EXTRACTION: Scan ALL text for location mentions including cities, states, countries, regions, neighborhoods, landmarks, timezone references, and location-related phrases.

Required format:
{
  "postSentiments": [{"text": "first 100 chars", "sentiment": "positive/negative/neutral", "explanation": "XAI reason"}],
  "commentSentiments": [{"text": "first 100 chars", "sentiment": "positive/negative/neutral", "explanation": "XAI reason"}],
  "sentiment": {
    "postBreakdown": {"positive": 0.0-1.0, "negative": 0.0-1.0, "neutral": 0.0-1.0},
    "commentBreakdown": {"positive": 0.0-1.0, "negative": 0.0-1.0, "neutral": 0.0-1.0}
  },
  "locations": ["City, Country", "Region"],
  "patterns": {"topicInterests": ["topic1", "topic2"]}
}

POSTS:
${formattedPosts.join('\n\n')}

COMMENTS:
${formattedComments.join('\n\n')}`;

    // Call Gemini API directly
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.3,
            maxOutputTokens: 4096,
          }
        })
      }
    );

    if (!response.ok) {
      if (response.status === 429) {
        return res.status(429).json({ error: 'rate_limit', message: 'Rate limit exceeded' });
      }
      throw new Error(`Gemini API error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.candidates[0].content.parts[0].text;
    
    // Parse JSON from response
    const jsonMatch = content.match(/```json\n([\s\S]*?)\n```/) || content.match(/\{[\s\S]*\}/);
    const jsonStr = Array.isArray(jsonMatch) && jsonMatch[1] ? jsonMatch[1] : content;
    const analysis = JSON.parse(jsonStr.match(/\{[\s\S]*\}/)?.[0] || '{}');

    // Calculate subreddit activity
    const subredditActivity = [...posts, ...comments].reduce((acc, item) => {
      const sub = item.subreddit;
      if (sub) {
        acc[sub] = (acc[sub] || 0) + 1;
      }
      return acc;
    }, {});

    const topSubreddits = Object.entries(subredditActivity)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([name, count]) => ({ name, count }));

    res.json({
      ...analysis,
      topSubreddits,
      stats: {
        totalPosts: posts.length,
        totalComments: comments.length,
        totalActivity: posts.length + comments.length,
      }
    });

  } catch (error) {
    console.error('Analysis Error:', error);
    res.status(500).json({ error: 'analysis_error', message: error.message });
  }
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'healthy', timestamp: new Date().toISOString() });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
```

**Add to `package.json` scripts:**
```json
{
  "scripts": {
    "server": "node server/index.js",
    "dev:full": "concurrently \"npm run server\" \"npm run dev\""
  }
}
```

**Install concurrently:**
```bash
npm install concurrently --save-dev
```

---

### Option 2: Use Supabase CLI Locally

```bash
# Install Supabase CLI
npm install -g supabase

# Initialize Supabase in your project
supabase init

# Start local Supabase services
supabase start

# This provides:
# - PostgreSQL database on port 54322
# - Auth server on port 54321
# - Edge Functions runtime
# - Storage server
```

**Set secrets for local Supabase:**
```bash
supabase secrets set GEMINI_API_KEY=your_api_key
supabase secrets set REDDIT_CLIENT_ID=your_client_id
supabase secrets set REDDIT_CLIENT_SECRET=your_client_secret
```

---

## Edge Functions (Local)

The project includes edge functions that work with Supabase CLI:

### Reddit Scraper (`supabase/functions/reddit-scraper/index.ts`)

This function:
- Authenticates with Reddit OAuth2
- Fetches user profiles, posts, comments
- Fetches community data
- **NEW**: Fetches related subreddits from community widgets
- Returns `communityRelations` for link analysis

### Content Analyzer (`supabase/functions/analyze-content/index.ts`)

This function:
- Analyzes posts/comments with AI
- Returns individual sentiments with XAI explanations
- Extracts locations
- Identifies behavior patterns

**To run edge functions locally:**
```bash
supabase functions serve
```

---

## Using Custom Trained Models

If you have trained your own ML model for Reddit analysis:

### Supported Model Formats

- **`.pkl`** (Pickle): Scikit-learn models
- **`.safetensors`**: PyTorch/Transformers (secure format)
- **`.pt` / `.pth`**: PyTorch models
- **`.h5` / `.keras`**: TensorFlow/Keras models
- **`.onnx`**: ONNX format (cross-platform)

### Create Model Inference Server

**`server/model_server.py`:**

```python
from flask import Flask, request, jsonify
from flask_cors import CORS
import torch
from transformers import AutoTokenizer, AutoModelForSequenceClassification
from safetensors.torch import load_file
import numpy as np

app = Flask(__name__)
CORS(app)

# Configuration
MODEL_PATH = "./models/reddit_classifier.safetensors"
MODEL_TYPE = "transformer"

# Initialize model
if MODEL_TYPE == "transformer":
    tokenizer = AutoTokenizer.from_pretrained("bert-base-uncased")
    model = AutoModelForSequenceClassification.from_pretrained(
        "bert-base-uncased", num_labels=3
    )
    state_dict = load_file(MODEL_PATH)
    model.load_state_dict(state_dict)
    model.eval()

@app.route('/predict', methods=['POST'])
def predict():
    try:
        data = request.json
        texts = data.get('texts', [])
        
        inputs = tokenizer(texts, padding=True, truncation=True, 
                          max_length=512, return_tensors="pt")
        
        with torch.no_grad():
            outputs = model(**inputs)
            predictions = torch.nn.functional.softmax(outputs.logits, dim=-1)
        
        results = []
        for i, text in enumerate(texts):
            probs = predictions[i].tolist()
            results.append({
                "text": text[:100],
                "sentiment": ["positive", "neutral", "negative"][torch.argmax(predictions[i]).item()],
                "confidence": max(probs),
                "probabilities": {"positive": probs[0], "neutral": probs[1], "negative": probs[2]}
            })
        
        return jsonify({"success": True, "results": results})
        
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500

@app.route('/health', methods=['GET'])
def health():
    return jsonify({"status": "healthy", "model_type": MODEL_TYPE})

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)
```

**Install dependencies:**
```bash
pip install flask flask-cors torch transformers safetensors
```

**Run the model server:**
```bash
python server/model_server.py
# Server runs on http://localhost:5000
```

---

## Adding Explainable AI (XAI)

### LIME Integration

```python
from lime.lime_text import LimeTextExplainer

explainer = LimeTextExplainer(class_names=['positive', 'neutral', 'negative'])

@app.route('/explain', methods=['POST'])
def explain():
    text = request.json.get('text')
    
    def predict_proba(texts):
        inputs = tokenizer(texts, padding=True, truncation=True, 
                          max_length=512, return_tensors="pt")
        with torch.no_grad():
            outputs = model(**inputs)
            return torch.nn.functional.softmax(outputs.logits, dim=-1).numpy()
    
    exp = explainer.explain_instance(text, predict_proba, num_features=10)
    
    return jsonify({
        "text": text,
        "explanation": [{"feature": f, "importance": float(w)} for f, w in exp.as_list()],
        "prediction": exp.predict_proba.argmax()
    })
```

### SHAP Integration

```python
import shap

@app.route('/explain-shap', methods=['POST'])
def explain_shap():
    text = request.json.get('text')
    
    explainer = shap.Explainer(model, tokenizer)
    shap_values = explainer([text])
    
    tokens = tokenizer.tokenize(text)
    values = shap_values.values[0]
    
    return jsonify({
        "text": text,
        "explanation": [{"token": t, "importance": float(v[1])} 
                       for t, v in zip(tokens, values)][:20]
    })
```

---

## Running the Application Locally

### Full Stack Startup

**Terminal 1 - Database:**
```bash
# Linux/macOS
sudo systemctl start postgresql
# or
brew services start postgresql

# Windows
net start postgresql
```

**Terminal 2 - Backend Server:**
```bash
# Option A: Express backend
npm run server

# Option B: Supabase local
supabase start
supabase functions serve
```

**Terminal 3 - Model Server (if using custom models):**
```bash
python server/model_server.py
```

**Terminal 4 - Frontend:**
```bash
npm run dev
# App runs on http://localhost:8080
```

### Update Frontend API Calls (for Express backend)

If using Express backend instead of Supabase functions, create `src/lib/api.ts`:

```typescript
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

export const redditScraper = async (params: { 
  username?: string; 
  type: string; 
  subreddit?: string;
  keyword?: string;
}) => {
  const response = await fetch(`${API_URL}/api/reddit-scraper`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params)
  });
  return response.json();
};

export const analyzeContent = async (params: { posts: any[]; comments: any[] }) => {
  const response = await fetch(`${API_URL}/api/analyze-content`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params)
  });
  return response.json();
};
```

---

## Troubleshooting

### PostgreSQL Issues

```bash
# Check if PostgreSQL is running
sudo systemctl status postgresql  # Linux
brew services list                # macOS
services.msc                      # Windows

# Test connection
psql -U reddit_admin -d reddit_sleuth -h localhost

# Reset password
sudo -u postgres psql
ALTER USER reddit_admin PASSWORD 'new_password';
```

### Reddit API Issues

| Error | Cause | Solution |
|-------|-------|----------|
| 401 Unauthorized | Invalid credentials | Check CLIENT_ID and CLIENT_SECRET |
| 403 Forbidden | Invalid User-Agent | Use format: `AppName/1.0.0` |
| 429 Too Many Requests | Rate limited | Wait 60s and retry |
| 404 Not Found | User/subreddit doesn't exist | Verify name spelling |

### Gemini API Issues

| Error | Cause | Solution |
|-------|-------|----------|
| 400 Bad Request | Invalid request format | Check JSON structure |
| 403 Forbidden | Invalid API key | Verify key in Google AI Studio |
| 429 Rate Limited | Too many requests | Free tier: 15 RPM, wait and retry |
| 500 Server Error | Gemini service issue | Retry or use fallback |

### CORS Errors

If you see CORS errors in the browser:
```javascript
// In server/index.js, ensure CORS is properly configured:
app.use(cors({
  origin: ['http://localhost:8080', 'http://localhost:5173'],
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
```

### Module Not Found

```bash
# Ensure all dependencies are installed
npm install

# Clear node_modules and reinstall
rm -rf node_modules
npm install
```

---

## Cost Comparison

| Service | Lovable Cloud | Local Setup |
|---------|--------------|-------------|
| Database | Included | Free (PostgreSQL) |
| Reddit API | Free | Free |
| AI Analysis | Usage-based | Pay per API call |
| Hosting | Included | Self-hosted |

---

## Summary

To run Reddit Sleuth locally:

1. ✅ Install PostgreSQL and create database
2. ✅ Run the complete schema SQL
3. ✅ Get Reddit API credentials
4. ✅ Get Gemini API key
5. ✅ Create `.env.local` file
6. ✅ Choose backend (Express.js or Supabase CLI)
7. ✅ Start all services
8. ✅ Open http://localhost:8080

For questions or issues, refer to:
- [Lovable Documentation](https://docs.lovable.dev)
- [Reddit API Docs](https://www.reddit.com/dev/api/)
- [Google AI Studio](https://aistudio.google.com/)
