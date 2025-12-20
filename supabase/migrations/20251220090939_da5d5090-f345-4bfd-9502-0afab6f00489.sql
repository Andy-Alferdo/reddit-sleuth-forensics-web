-- Investigation cases table (structured data)
CREATE TABLE public.investigation_cases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_number TEXT UNIQUE NOT NULL,
  case_name TEXT NOT NULL,
  description TEXT,
  lead_investigator TEXT,
  department TEXT,
  priority TEXT DEFAULT 'medium',
  status TEXT DEFAULT 'active',
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Reddit posts table (unstructured via JSONB)
CREATE TABLE public.reddit_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id UUID REFERENCES public.investigation_cases(id) ON DELETE CASCADE,
  post_id TEXT,
  author TEXT,
  subreddit TEXT,
  title TEXT,
  content TEXT,
  score INTEGER,
  num_comments INTEGER,
  permalink TEXT,
  created_utc TIMESTAMPTZ,
  metadata JSONB,
  sentiment TEXT,
  sentiment_explanation TEXT,
  collected_at TIMESTAMPTZ DEFAULT now()
);

-- Reddit comments table
CREATE TABLE public.reddit_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id UUID REFERENCES public.investigation_cases(id) ON DELETE CASCADE,
  comment_id TEXT,
  author TEXT,
  subreddit TEXT,
  body TEXT,
  score INTEGER,
  link_title TEXT,
  permalink TEXT,
  created_utc TIMESTAMPTZ,
  metadata JSONB,
  sentiment TEXT,
  sentiment_explanation TEXT,
  collected_at TIMESTAMPTZ DEFAULT now()
);

-- Analyzed user profiles table
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
  analyzed_at TIMESTAMPTZ DEFAULT now()
);

-- Monitoring sessions table
CREATE TABLE public.monitoring_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id UUID REFERENCES public.investigation_cases(id) ON DELETE CASCADE,
  search_type TEXT NOT NULL,
  target_name TEXT NOT NULL,
  profile_data JSONB,
  activities JSONB,
  word_cloud_data JSONB,
  started_at TIMESTAMPTZ,
  ended_at TIMESTAMPTZ DEFAULT now(),
  new_activity_count INTEGER DEFAULT 0
);

-- Analysis results table (keyword/community/link)
CREATE TABLE public.analysis_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id UUID REFERENCES public.investigation_cases(id) ON DELETE CASCADE,
  analysis_type TEXT NOT NULL,
  target TEXT NOT NULL,
  result_data JSONB,
  sentiment_data JSONB,
  analyzed_at TIMESTAMPTZ DEFAULT now()
);

-- Investigation reports table
CREATE TABLE public.investigation_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id UUID REFERENCES public.investigation_cases(id) ON DELETE CASCADE,
  report_type TEXT NOT NULL,
  export_format TEXT,
  report_data JSONB,
  selected_modules JSONB,
  generated_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  generated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.investigation_cases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reddit_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reddit_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_profiles_analyzed ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.monitoring_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.analysis_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.investigation_reports ENABLE ROW LEVEL SECURITY;

-- RLS Policies for investigation_cases
CREATE POLICY "Users can view their own cases" ON public.investigation_cases
  FOR SELECT USING (auth.uid() = created_by);

CREATE POLICY "Users can create cases" ON public.investigation_cases
  FOR INSERT WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Users can update their own cases" ON public.investigation_cases
  FOR UPDATE USING (auth.uid() = created_by);

CREATE POLICY "Users can delete their own cases" ON public.investigation_cases
  FOR DELETE USING (auth.uid() = created_by);

CREATE POLICY "Admins can view all cases" ON public.investigation_cases
  FOR SELECT USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can manage all cases" ON public.investigation_cases
  FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for reddit_posts (via case ownership)
CREATE POLICY "Users can view posts in their cases" ON public.reddit_posts
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.investigation_cases WHERE id = case_id AND created_by = auth.uid())
  );

CREATE POLICY "Users can insert posts to their cases" ON public.reddit_posts
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.investigation_cases WHERE id = case_id AND created_by = auth.uid())
  );

CREATE POLICY "Admins can manage all posts" ON public.reddit_posts
  FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for reddit_comments
CREATE POLICY "Users can view comments in their cases" ON public.reddit_comments
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.investigation_cases WHERE id = case_id AND created_by = auth.uid())
  );

CREATE POLICY "Users can insert comments to their cases" ON public.reddit_comments
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.investigation_cases WHERE id = case_id AND created_by = auth.uid())
  );

CREATE POLICY "Admins can manage all comments" ON public.reddit_comments
  FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for user_profiles_analyzed
CREATE POLICY "Users can view profiles in their cases" ON public.user_profiles_analyzed
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.investigation_cases WHERE id = case_id AND created_by = auth.uid())
  );

CREATE POLICY "Users can insert profiles to their cases" ON public.user_profiles_analyzed
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.investigation_cases WHERE id = case_id AND created_by = auth.uid())
  );

CREATE POLICY "Admins can manage all profiles" ON public.user_profiles_analyzed
  FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for monitoring_sessions
CREATE POLICY "Users can view sessions in their cases" ON public.monitoring_sessions
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.investigation_cases WHERE id = case_id AND created_by = auth.uid())
  );

CREATE POLICY "Users can insert sessions to their cases" ON public.monitoring_sessions
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.investigation_cases WHERE id = case_id AND created_by = auth.uid())
  );

CREATE POLICY "Admins can manage all sessions" ON public.monitoring_sessions
  FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for analysis_results
CREATE POLICY "Users can view analyses in their cases" ON public.analysis_results
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.investigation_cases WHERE id = case_id AND created_by = auth.uid())
  );

CREATE POLICY "Users can insert analyses to their cases" ON public.analysis_results
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.investigation_cases WHERE id = case_id AND created_by = auth.uid())
  );

CREATE POLICY "Admins can manage all analyses" ON public.analysis_results
  FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for investigation_reports
CREATE POLICY "Users can view reports in their cases" ON public.investigation_reports
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.investigation_cases WHERE id = case_id AND created_by = auth.uid())
  );

CREATE POLICY "Users can insert reports to their cases" ON public.investigation_reports
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.investigation_cases WHERE id = case_id AND created_by = auth.uid())
  );

CREATE POLICY "Admins can manage all reports" ON public.investigation_reports
  FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- Create indexes for performance
CREATE INDEX idx_reddit_posts_case_id ON public.reddit_posts(case_id);
CREATE INDEX idx_reddit_posts_author ON public.reddit_posts(author);
CREATE INDEX idx_reddit_posts_subreddit ON public.reddit_posts(subreddit);
CREATE INDEX idx_reddit_comments_case_id ON public.reddit_comments(case_id);
CREATE INDEX idx_reddit_comments_author ON public.reddit_comments(author);
CREATE INDEX idx_user_profiles_case_id ON public.user_profiles_analyzed(case_id);
CREATE INDEX idx_user_profiles_username ON public.user_profiles_analyzed(username);
CREATE INDEX idx_monitoring_sessions_case_id ON public.monitoring_sessions(case_id);
CREATE INDEX idx_analysis_results_case_id ON public.analysis_results(case_id);
CREATE INDEX idx_investigation_reports_case_id ON public.investigation_reports(case_id);

-- Trigger for updated_at on investigation_cases
CREATE TRIGGER update_investigation_cases_updated_at
  BEFORE UPDATE ON public.investigation_cases
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();