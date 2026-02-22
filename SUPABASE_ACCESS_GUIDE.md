# Supabase Database Access Guide - Reddit Sleuth OSINT Platform

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
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

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
-- USER INVITES TABLE
-- =====================================================
CREATE TABLE public.user_invites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  invite_token TEXT NOT NULL UNIQUE,
  role app_role NOT NULL DEFAULT 'user',
  created_by UUID REFERENCES auth.users(id),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  used_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- AUDIT LOGS TABLE
-- =====================================================
CREATE TABLE public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  action_type TEXT NOT NULL,
  resource_type TEXT NOT NULL,
  resource_id UUID,
  details JSONB,
  ip_address TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
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
  department TEXT,                    -- UI label: "Investigation Unit"
  lead_investigator TEXT,
  is_sensitive BOOLEAN DEFAULT FALSE,
  case_password_hash TEXT,
  cache_duration_days INTEGER DEFAULT 30,
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
  started_at TIMESTAMP WITH TIME ZONE,
  ended_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
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
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;

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

-- Function to log audit events
CREATE OR REPLACE FUNCTION public.log_audit_event(
  p_user_id UUID,
  p_action_type TEXT,
  p_resource_type TEXT,
  p_resource_id UUID DEFAULT NULL,
  p_details JSONB DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_log_id UUID;
BEGIN
  INSERT INTO public.audit_logs (user_id, action_type, resource_type, resource_id, details)
  VALUES (p_user_id, p_action_type, p_resource_type, p_resource_id, p_details)
  RETURNING id INTO v_log_id;
  RETURN v_log_id;
END;
$$;

-- Function to hash case passwords
CREATE OR REPLACE FUNCTION public.hash_case_password(p_password TEXT)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN crypt(p_password, gen_salt('bf'));
END;
$$;

-- Function to verify case passwords
CREATE OR REPLACE FUNCTION public.verify_case_password(p_case_id UUID, p_password TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_hash TEXT;
  v_is_sensitive BOOLEAN;
BEGIN
  SELECT case_password_hash, is_sensitive INTO v_hash, v_is_sensitive
  FROM public.investigation_cases
  WHERE id = p_case_id;
  
  IF NOT v_is_sensitive THEN
    RETURN TRUE;
  END IF;
  
  IF v_hash IS NULL THEN
    RETURN TRUE;
  END IF;
  
  RETURN v_hash = crypt(p_password, v_hash);
END;
$$;

-- Function to generate invite tokens
CREATE OR REPLACE FUNCTION public.generate_invite_token()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN encode(extensions.gen_random_bytes(32), 'hex');
END;
$$;

-- Function to mark invite as used
CREATE OR REPLACE FUNCTION public.mark_invite_used(p_invite_token TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_updated BOOLEAN;
BEGIN
  UPDATE public.user_invites
  SET used_at = NOW()
  WHERE invite_token = p_invite_token
    AND used_at IS NULL
    AND expires_at > NOW();
  
  v_updated := FOUND;
  RETURN v_updated;
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
CREATE INDEX idx_user_profiles_analyzed_case_id ON public.user_profiles_analyzed(case_id);
CREATE INDEX idx_investigation_cases_status ON public.investigation_cases(status);
CREATE INDEX idx_investigation_cases_created_by ON public.investigation_cases(created_by);
CREATE INDEX idx_monitoring_sessions_case_id ON public.monitoring_sessions(case_id);
CREATE INDEX idx_analysis_results_case_id ON public.analysis_results(case_id);
CREATE INDEX idx_audit_logs_user_id ON public.audit_logs(user_id);
CREATE INDEX idx_audit_logs_created_at ON public.audit_logs(created_at);
CREATE INDEX idx_user_invites_email ON public.user_invites(email);
CREATE INDEX idx_user_invites_token ON public.user_invites(invite_token);
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
ALTER TABLE public.user_invites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
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
-- USER INVITES POLICIES
-- =====================================================
CREATE POLICY "Admins can manage invites"
  ON public.user_invites FOR ALL
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Anyone can view valid invite by token"
  ON public.user_invites FOR SELECT
  USING (
    invite_token IS NOT NULL 
    AND used_at IS NULL 
    AND expires_at > NOW()
  );

-- =====================================================
-- AUDIT LOGS POLICIES
-- =====================================================
CREATE POLICY "Admins can view all audit logs"
  ON public.audit_logs FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can view their own audit logs"
  ON public.audit_logs FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "System can insert audit logs"
  ON public.audit_logs FOR INSERT
  WITH CHECK (TRUE);

-- =====================================================
-- INVESTIGATION CASES POLICIES
-- =====================================================
CREATE POLICY "Users can view their own cases"
  ON public.investigation_cases FOR SELECT
  USING (auth.uid() = created_by);

CREATE POLICY "Admins can view all cases"
  ON public.investigation_cases FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can create cases"
  ON public.investigation_cases FOR INSERT
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Users can update their own cases"
  ON public.investigation_cases FOR UPDATE
  USING (auth.uid() = created_by);

CREATE POLICY "Users can delete their own cases"
  ON public.investigation_cases FOR DELETE
  USING (auth.uid() = created_by);

CREATE POLICY "Admins can manage all cases"
  ON public.investigation_cases FOR ALL
  USING (public.has_role(auth.uid(), 'admin'));

-- =====================================================
-- REDDIT POSTS POLICIES
-- =====================================================
CREATE POLICY "Users can view posts in their cases"
  ON public.reddit_posts FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.investigation_cases 
      WHERE id = reddit_posts.case_id 
      AND created_by = auth.uid()
    )
  );

CREATE POLICY "Users can insert posts to their cases"
  ON public.reddit_posts FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.investigation_cases 
      WHERE id = case_id 
      AND created_by = auth.uid()
    )
  );

CREATE POLICY "Admins can manage all posts"
  ON public.reddit_posts FOR ALL
  USING (public.has_role(auth.uid(), 'admin'));

-- =====================================================
-- REDDIT COMMENTS POLICIES
-- =====================================================
CREATE POLICY "Users can view comments in their cases"
  ON public.reddit_comments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.investigation_cases 
      WHERE id = reddit_comments.case_id 
      AND created_by = auth.uid()
    )
  );

CREATE POLICY "Users can insert comments to their cases"
  ON public.reddit_comments FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.investigation_cases 
      WHERE id = case_id 
      AND created_by = auth.uid()
    )
  );

CREATE POLICY "Admins can manage all comments"
  ON public.reddit_comments FOR ALL
  USING (public.has_role(auth.uid(), 'admin'));

-- =====================================================
-- USER PROFILES ANALYZED POLICIES
-- =====================================================
CREATE POLICY "Users can view profiles in their cases"
  ON public.user_profiles_analyzed FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.investigation_cases 
      WHERE id = user_profiles_analyzed.case_id 
      AND created_by = auth.uid()
    )
  );

CREATE POLICY "Users can insert profiles to their cases"
  ON public.user_profiles_analyzed FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.investigation_cases 
      WHERE id = case_id 
      AND created_by = auth.uid()
    )
  );

CREATE POLICY "Admins can manage all profiles"
  ON public.user_profiles_analyzed FOR ALL
  USING (public.has_role(auth.uid(), 'admin'));

-- =====================================================
-- ANALYSIS RESULTS POLICIES
-- =====================================================
CREATE POLICY "Users can view analyses in their cases"
  ON public.analysis_results FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.investigation_cases 
      WHERE id = analysis_results.case_id 
      AND created_by = auth.uid()
    )
  );

CREATE POLICY "Users can insert analyses to their cases"
  ON public.analysis_results FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.investigation_cases 
      WHERE id = case_id 
      AND created_by = auth.uid()
    )
  );

CREATE POLICY "Admins can manage all analyses"
  ON public.analysis_results FOR ALL
  USING (public.has_role(auth.uid(), 'admin'));

-- =====================================================
-- MONITORING SESSIONS POLICIES
-- =====================================================
CREATE POLICY "Users can view sessions in their cases"
  ON public.monitoring_sessions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.investigation_cases 
      WHERE id = monitoring_sessions.case_id 
      AND created_by = auth.uid()
    )
  );

CREATE POLICY "Users can insert sessions to their cases"
  ON public.monitoring_sessions FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.investigation_cases 
      WHERE id = case_id 
      AND created_by = auth.uid()
    )
  );

CREATE POLICY "Admins can manage all sessions"
  ON public.monitoring_sessions FOR ALL
  USING (public.has_role(auth.uid(), 'admin'));

-- =====================================================
-- INVESTIGATION REPORTS POLICIES
-- =====================================================
CREATE POLICY "Users can view reports in their cases"
  ON public.investigation_reports FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.investigation_cases 
      WHERE id = investigation_reports.case_id 
      AND created_by = auth.uid()
    )
  );

CREATE POLICY "Users can insert reports to their cases"
  ON public.investigation_reports FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.investigation_cases 
      WHERE id = case_id 
      AND created_by = auth.uid()
    )
  );

CREATE POLICY "Admins can manage all reports"
  ON public.investigation_reports FOR ALL
  USING (public.has_role(auth.uid(), 'admin'));
```

---

## Edge Functions Setup

### Available Edge Functions

The project includes the following edge functions:

| Function | Description |
|----------|-------------|
| `reddit-scraper` | Scrapes Reddit posts and comments from users/subreddits |
| `analyze-content` | AI-powered sentiment analysis using Lovable AI |
| `data-store` | Handles data persistence operations |
| `admin-create-user` | Admin-only user creation with role assignment |
| `admin-reset-password` | Admin-only password reset functionality |
| `send-invite-email` | Sends user invitation emails via Resend |

### Deploy Edge Functions

If using your own Supabase project, deploy the edge functions:

```bash
# Login to Supabase
supabase login

# Link to your project
supabase link --project-ref your-project-id

# Deploy all functions
supabase functions deploy reddit-scraper
supabase functions deploy analyze-content
supabase functions deploy data-store
supabase functions deploy admin-create-user
supabase functions deploy admin-reset-password
supabase functions deploy send-invite-email
```

### Required Secrets

Set the following secrets for edge functions:

```bash
# Reddit API credentials
supabase secrets set REDDIT_CLIENT_ID=your_client_id
supabase secrets set REDDIT_CLIENT_SECRET=your_client_secret

# Email service (Resend)
supabase secrets set RESEND_API_KEY=your_resend_api_key
supabase secrets set RESEND_FROM=your_verified_email@domain.com

# Supabase (auto-provided in Lovable Cloud)
supabase secrets set SUPABASE_URL=your_project_url
supabase secrets set SUPABASE_ANON_KEY=your_anon_key
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
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

## Database Summary

### Tables (11 total)
| Table | Description |
|-------|-------------|
| `profiles` | User profile information |
| `user_roles` | User role assignments (admin/user) |
| `user_invites` | Pending user invitations |
| `audit_logs` | System audit trail |
| `investigation_cases` | Investigation case records |
| `reddit_posts` | Collected Reddit posts |
| `reddit_comments` | Collected Reddit comments |
| `user_profiles_analyzed` | Analyzed Reddit user profiles |
| `analysis_results` | AI analysis results |
| `monitoring_sessions` | Real-time monitoring sessions |
| `investigation_reports` | Generated investigation reports |

### Functions (8 total)
| Function | Description |
|----------|-------------|
| `has_role(uuid, app_role)` | Check if user has specific role |
| `handle_new_user()` | Auto-create profile on signup |
| `update_updated_at_column()` | Auto-update timestamps |
| `log_audit_event(...)` | Create audit log entries |
| `hash_case_password(text)` | Hash sensitive case passwords |
| `verify_case_password(uuid, text)` | Verify case password |
| `generate_invite_token()` | Generate secure invite tokens |
| `mark_invite_used(text)` | Mark invitation as used |

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

**Email invites not sending**
- Verify RESEND_API_KEY and RESEND_FROM secrets are set
- Check that the sender email is verified in Resend

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
