# Supabase Database Access Guide

This guide explains how to connect your own Supabase account to Reddit Sleuth or set up a local Supabase instance.

---

## Table of Contents
1. [Connecting Your Own Supabase Account](#connecting-your-own-supabase-account)
2. [Complete Database Schema](#complete-database-schema)
3. [Row Level Security (RLS)](#row-level-security-rls)
4. [Edge Functions Setup](#edge-functions-setup)
5. [Local Supabase Development](#local-supabase-development)
6. [Troubleshooting](#troubleshooting)

---

## Connecting Your Own Supabase Account

### Step 1: Create a Supabase Project

1. Go to [https://supabase.com](https://supabase.com) and sign up/login
2. Click "New Project"
3. Fill in your project details (name, database password, region)
4. Wait for the project to be created (~2 minutes)

### Step 2: Get Your Project Credentials

Once your project is created, get these credentials:

1. **Project URL**: 
   - Go to Project Settings → API
   - Copy the "Project URL" (e.g., `https://xxxxx.supabase.co`)

2. **Anon/Public Key**:
   - Same page (Project Settings → API)
   - Copy the "anon" key under "Project API keys"

3. **Service Role Key** (for admin operations):
   - Same page, copy the "service_role" key
   - ⚠️ Never expose this in client-side code

4. **Project ID**:
   - Go to Project Settings → General
   - Copy the "Reference ID"

### Step 3: Update Your Project Configuration

Create or update the `.env` file in your project root:

```env
VITE_SUPABASE_PROJECT_ID="your-project-id-here"
VITE_SUPABASE_PUBLISHABLE_KEY="your-anon-key-here"
VITE_SUPABASE_URL="https://your-project-id.supabase.co"
```

### Step 4: Add Secrets for Edge Functions

In your Supabase dashboard:

1. Go to Project Settings → Edge Functions
2. Add secrets:
   - `REDDIT_CLIENT_ID`: Your Reddit app client ID
   - `REDDIT_CLIENT_SECRET`: Your Reddit app secret

Or use Supabase CLI:
```bash
supabase secrets set REDDIT_CLIENT_ID=your_client_id
supabase secrets set REDDIT_CLIENT_SECRET=your_client_secret
```

---

## Complete Database Schema

Go to your Supabase dashboard → SQL Editor and run these commands:

```sql
-- =====================================================
-- ENABLE EXTENSIONS
-- =====================================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- CREATE ENUM TYPES
-- =====================================================
CREATE TYPE public.app_role AS ENUM ('admin', 'user');

-- =====================================================
-- PROFILES TABLE
-- =====================================================
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  full_name TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- USER ROLES TABLE
-- =====================================================
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, role)
);

-- =====================================================
-- INVESTIGATION CASES TABLE
-- =====================================================
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
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- REDDIT POSTS TABLE
-- =====================================================
CREATE TABLE public.reddit_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id TEXT,
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
CREATE TABLE public.reddit_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  comment_id TEXT,
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
CREATE TABLE public.user_profiles_analyzed (
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
CREATE TABLE public.analysis_results (
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
CREATE TABLE public.monitoring_sessions (
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
CREATE TABLE public.investigation_reports (
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

-- Function to handle new user signups
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data->>'full_name'
  );
  
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'user');
  
  RETURN NEW;
END;
$$;

-- =====================================================
-- TRIGGERS
-- =====================================================

-- Trigger for new user signups
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Trigger for profiles updated_at
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Trigger for investigation_cases updated_at
CREATE TRIGGER update_investigation_cases_updated_at
  BEFORE UPDATE ON public.investigation_cases
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- =====================================================
-- INDEXES FOR PERFORMANCE
-- =====================================================
CREATE INDEX idx_reddit_posts_case_id ON public.reddit_posts(case_id);
CREATE INDEX idx_reddit_posts_author ON public.reddit_posts(author);
CREATE INDEX idx_reddit_posts_subreddit ON public.reddit_posts(subreddit);
CREATE INDEX idx_reddit_comments_case_id ON public.reddit_comments(case_id);
CREATE INDEX idx_reddit_comments_author ON public.reddit_comments(author);
CREATE INDEX idx_user_profiles_analyzed_username ON public.user_profiles_analyzed(username);
CREATE INDEX idx_investigation_cases_status ON public.investigation_cases(status);
CREATE INDEX idx_monitoring_sessions_case_id ON public.monitoring_sessions(case_id);
```

---

## Row Level Security (RLS)

Enable RLS and create policies for all tables:

```sql
-- =====================================================
-- ENABLE RLS ON ALL TABLES
-- =====================================================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.investigation_cases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reddit_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reddit_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_profiles_analyzed ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.analysis_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.monitoring_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.investigation_reports ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- PROFILES POLICIES
-- =====================================================
CREATE POLICY "Users can view their own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Admins can view all profiles"
  ON public.profiles FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Admins can update all profiles"
  ON public.profiles FOR UPDATE
  USING (public.has_role(auth.uid(), 'admin'));

-- =====================================================
-- USER ROLES POLICIES
-- =====================================================
CREATE POLICY "Users can view their own roles"
  ON public.user_roles FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all roles"
  ON public.user_roles FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert roles"
  ON public.user_roles FOR INSERT
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update roles"
  ON public.user_roles FOR UPDATE
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete roles"
  ON public.user_roles FOR DELETE
  USING (public.has_role(auth.uid(), 'admin'));

-- =====================================================
-- INVESTIGATION CASES POLICIES
-- =====================================================
CREATE POLICY "Users can view their own cases"
  ON public.investigation_cases FOR SELECT
  USING (auth.uid() = created_by OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Authenticated users can create cases"
  ON public.investigation_cases FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Users can update their own cases"
  ON public.investigation_cases FOR UPDATE
  USING (auth.uid() = created_by OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can delete their own cases"
  ON public.investigation_cases FOR DELETE
  USING (auth.uid() = created_by OR public.has_role(auth.uid(), 'admin'));

-- =====================================================
-- REDDIT DATA POLICIES (linked to cases)
-- =====================================================
CREATE POLICY "Users can view posts for their cases"
  ON public.reddit_posts FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.investigation_cases 
      WHERE id = reddit_posts.case_id 
      AND (created_by = auth.uid() OR public.has_role(auth.uid(), 'admin'))
    )
  );

CREATE POLICY "Users can insert posts for their cases"
  ON public.reddit_posts FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.investigation_cases 
      WHERE id = case_id 
      AND (created_by = auth.uid() OR public.has_role(auth.uid(), 'admin'))
    )
  );

CREATE POLICY "Users can view comments for their cases"
  ON public.reddit_comments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.investigation_cases 
      WHERE id = reddit_comments.case_id 
      AND (created_by = auth.uid() OR public.has_role(auth.uid(), 'admin'))
    )
  );

CREATE POLICY "Users can insert comments for their cases"
  ON public.reddit_comments FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.investigation_cases 
      WHERE id = case_id 
      AND (created_by = auth.uid() OR public.has_role(auth.uid(), 'admin'))
    )
  );

-- =====================================================
-- ANALYSIS DATA POLICIES
-- =====================================================
CREATE POLICY "Users can view analysis for their cases"
  ON public.user_profiles_analyzed FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.investigation_cases 
      WHERE id = user_profiles_analyzed.case_id 
      AND (created_by = auth.uid() OR public.has_role(auth.uid(), 'admin'))
    )
  );

CREATE POLICY "Users can insert analysis for their cases"
  ON public.user_profiles_analyzed FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.investigation_cases 
      WHERE id = case_id 
      AND (created_by = auth.uid() OR public.has_role(auth.uid(), 'admin'))
    )
  );

CREATE POLICY "Users can view results for their cases"
  ON public.analysis_results FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.investigation_cases 
      WHERE id = analysis_results.case_id 
      AND (created_by = auth.uid() OR public.has_role(auth.uid(), 'admin'))
    )
  );

CREATE POLICY "Users can insert results for their cases"
  ON public.analysis_results FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.investigation_cases 
      WHERE id = case_id 
      AND (created_by = auth.uid() OR public.has_role(auth.uid(), 'admin'))
    )
  );

-- =====================================================
-- MONITORING SESSIONS POLICIES
-- =====================================================
CREATE POLICY "Users can view monitoring for their cases"
  ON public.monitoring_sessions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.investigation_cases 
      WHERE id = monitoring_sessions.case_id 
      AND (created_by = auth.uid() OR public.has_role(auth.uid(), 'admin'))
    )
  );

CREATE POLICY "Users can create monitoring for their cases"
  ON public.monitoring_sessions FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.investigation_cases 
      WHERE id = case_id 
      AND (created_by = auth.uid() OR public.has_role(auth.uid(), 'admin'))
    )
  );

CREATE POLICY "Users can update monitoring for their cases"
  ON public.monitoring_sessions FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.investigation_cases 
      WHERE id = monitoring_sessions.case_id 
      AND (created_by = auth.uid() OR public.has_role(auth.uid(), 'admin'))
    )
  );

-- =====================================================
-- INVESTIGATION REPORTS POLICIES
-- =====================================================
CREATE POLICY "Users can view reports for their cases"
  ON public.investigation_reports FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.investigation_cases 
      WHERE id = investigation_reports.case_id 
      AND (created_by = auth.uid() OR public.has_role(auth.uid(), 'admin'))
    )
  );

CREATE POLICY "Users can create reports for their cases"
  ON public.investigation_reports FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.investigation_cases 
      WHERE id = case_id 
      AND (created_by = auth.uid() OR public.has_role(auth.uid(), 'admin'))
    )
  );
```

---

## Edge Functions Setup

### Deploy Edge Functions

If using your own Supabase project, deploy the edge functions:

```bash
# Login to Supabase
supabase login

# Link to your project
supabase link --project-ref your-project-id

# Deploy functions
supabase functions deploy reddit-scraper
supabase functions deploy analyze-content
supabase functions deploy data-store
```

### Set Edge Function Secrets

```bash
supabase secrets set REDDIT_CLIENT_ID=your_client_id
supabase secrets set REDDIT_CLIENT_SECRET=your_client_secret
```

Note: `LOVABLE_API_KEY` is auto-provided by Lovable Cloud. If self-hosting, you'll need to use direct Gemini API access (see LOCAL_SETUP_GUIDE.md).

---

## Local Supabase Development

### Start Local Supabase

```bash
# Install CLI
npm install -g supabase

# Initialize
supabase init

# Start local services
supabase start
```

This provides:
- PostgreSQL on port 54322
- Auth server on port 54321
- Edge Functions runtime
- Studio UI on port 54323

### Local Credentials

After `supabase start`, you'll see:

```
API URL: http://localhost:54321
GraphQL URL: http://localhost:54321/graphql/v1
DB URL: postgresql://postgres:postgres@localhost:54322/postgres
Studio URL: http://localhost:54323
anon key: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
service_role key: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

Use these in your `.env.local` file.

---

## Create Your First Admin User

After setting up the database:

1. Sign up through your app's signup page
2. Go to Supabase Dashboard → SQL Editor
3. Run this command (replace with your email):

```sql
-- Grant admin role to a user
INSERT INTO public.user_roles (user_id, role)
SELECT id, 'admin'::app_role
FROM auth.users
WHERE email = 'your-email@example.com';
```

---

## Troubleshooting

### Common Errors

**Error: "Invalid API key"**
- Double-check you copied the correct anon key from Project Settings → API

**Error: "Failed to fetch"**
- Verify the VITE_SUPABASE_URL is correct
- Make sure you restarted your development server after updating .env

**Error: "Permission denied for table"**
- Check RLS policies are correctly set up
- Verify the user has the correct role

**Can't login as admin**
- Make sure you ran the SQL command to grant admin role
- Check the user_roles table in your Supabase dashboard

**Edge function errors**
- Check edge function logs in Supabase dashboard
- Verify secrets are set correctly

### Accessing Your Supabase Dashboard

Once connected, access your database at:
`https://supabase.com/dashboard/project/YOUR-PROJECT-ID`

From there you can:
- View and edit database tables
- Manage authentication settings
- Configure storage buckets
- Write SQL queries
- Monitor your project
- View edge function logs

---

## Resources

- [Supabase Documentation](https://supabase.com/docs)
- [Supabase CLI Reference](https://supabase.com/docs/reference/cli)
- [Row Level Security Guide](https://supabase.com/docs/guides/auth/row-level-security)
- [Edge Functions Guide](https://supabase.com/docs/guides/functions)
