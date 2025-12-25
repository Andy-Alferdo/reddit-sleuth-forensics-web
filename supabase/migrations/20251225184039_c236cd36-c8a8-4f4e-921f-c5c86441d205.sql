-- Enable realtime for investigation tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.user_profiles_analyzed;
ALTER PUBLICATION supabase_realtime ADD TABLE public.analysis_results;
ALTER PUBLICATION supabase_realtime ADD TABLE public.monitoring_sessions;