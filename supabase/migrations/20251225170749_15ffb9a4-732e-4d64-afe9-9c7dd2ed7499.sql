-- Add sensitive case fields to investigation_cases
ALTER TABLE public.investigation_cases 
ADD COLUMN IF NOT EXISTS is_sensitive boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS case_password_hash text,
ADD COLUMN IF NOT EXISTS cache_duration_days integer DEFAULT 30;

-- Create audit_logs table
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  action_type text NOT NULL,
  resource_type text NOT NULL,
  resource_id uuid,
  details jsonb,
  ip_address text,
  created_at timestamp with time zone DEFAULT now()
);

-- Create user_invites table for invite-only signup
CREATE TABLE IF NOT EXISTS public.user_invites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  invite_token text NOT NULL UNIQUE,
  role app_role NOT NULL DEFAULT 'user',
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  expires_at timestamp with time zone NOT NULL,
  used_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_invites ENABLE ROW LEVEL SECURITY;

-- Audit logs policies (admins see all, users see their own)
CREATE POLICY "Admins can view all audit logs" ON public.audit_logs
FOR SELECT USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can view their own audit logs" ON public.audit_logs
FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "System can insert audit logs" ON public.audit_logs
FOR INSERT WITH CHECK (true);

-- User invites policies (admin only)
CREATE POLICY "Admins can manage invites" ON public.user_invites
FOR ALL USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Anyone can view valid invite by token" ON public.user_invites
FOR SELECT USING (
  invite_token IS NOT NULL 
  AND used_at IS NULL 
  AND expires_at > now()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON public.audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_resource ON public.audit_logs(resource_type, resource_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON public.audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_invites_token ON public.user_invites(invite_token);
CREATE INDEX IF NOT EXISTS idx_user_invites_email ON public.user_invites(email);

-- Function to log audit events
CREATE OR REPLACE FUNCTION public.log_audit_event(
  p_user_id uuid,
  p_action_type text,
  p_resource_type text,
  p_resource_id uuid DEFAULT NULL,
  p_details jsonb DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_log_id uuid;
BEGIN
  INSERT INTO public.audit_logs (user_id, action_type, resource_type, resource_id, details)
  VALUES (p_user_id, p_action_type, p_resource_type, p_resource_id, p_details)
  RETURNING id INTO v_log_id;
  RETURN v_log_id;
END;
$$;

-- Function to verify case password
CREATE OR REPLACE FUNCTION public.verify_case_password(
  p_case_id uuid,
  p_password text
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_hash text;
  v_is_sensitive boolean;
BEGIN
  SELECT case_password_hash, is_sensitive INTO v_hash, v_is_sensitive
  FROM public.investigation_cases
  WHERE id = p_case_id;
  
  IF NOT v_is_sensitive THEN
    RETURN true;
  END IF;
  
  IF v_hash IS NULL THEN
    RETURN true;
  END IF;
  
  RETURN v_hash = crypt(p_password, v_hash);
END;
$$;

-- Function to generate invite token
CREATE OR REPLACE FUNCTION public.generate_invite_token()
RETURNS text
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN encode(gen_random_bytes(32), 'hex');
END;
$$;

-- Function to hash case password
CREATE OR REPLACE FUNCTION public.hash_case_password(p_password text)
RETURNS text
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN crypt(p_password, gen_salt('bf'));
END;
$$;