-- Create a function to mark invite as used (runs with elevated privileges)
CREATE OR REPLACE FUNCTION public.mark_invite_used(p_invite_token text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_updated boolean;
BEGIN
  UPDATE public.user_invites
  SET used_at = now()
  WHERE invite_token = p_invite_token
    AND used_at IS NULL
    AND expires_at > now();
  
  v_updated := FOUND;
  RETURN v_updated;
END;
$$;