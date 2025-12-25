-- Fix generate_invite_token to reference pgcrypto functions in the extensions schema
CREATE OR REPLACE FUNCTION public.generate_invite_token()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  RETURN encode(extensions.gen_random_bytes(32), 'hex');
END;
$$;