-- Allow users to delete their own analyzed profiles
CREATE POLICY "Users can delete profiles in their cases"
ON public.user_profiles_analyzed
FOR DELETE
USING (EXISTS (
  SELECT 1 FROM investigation_cases
  WHERE investigation_cases.id = user_profiles_analyzed.case_id
    AND investigation_cases.created_by = auth.uid()
));

-- Allow users to delete their own analysis results
CREATE POLICY "Users can delete analyses in their cases"
ON public.analysis_results
FOR DELETE
USING (EXISTS (
  SELECT 1 FROM investigation_cases
  WHERE investigation_cases.id = analysis_results.case_id
    AND investigation_cases.created_by = auth.uid()
));