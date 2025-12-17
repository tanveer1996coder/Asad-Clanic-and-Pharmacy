-- ========================================
-- MIGRATION V13: Security & Device Management
-- ========================================

-- 1. Update device_tokens table
-- Ensure table exists (from v3)
CREATE TABLE IF NOT EXISTS public.device_tokens (
    id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    device_id text NOT NULL,
    device_name text,
    is_trusted boolean DEFAULT false,
    last_used_at timestamp with time zone DEFAULT timezone('utc'::text, now())
);

-- Add new columns for enhanced security
ALTER TABLE public.device_tokens 
ADD COLUMN IF NOT EXISTS ip_address text,
ADD COLUMN IF NOT EXISTS status text DEFAULT 'active', -- active, revoked, paused
ADD COLUMN IF NOT EXISTS location text;

-- 2. Enable RLS
ALTER TABLE public.device_tokens ENABLE ROW LEVEL SECURITY;

-- 3. Policies
DROP POLICY IF EXISTS "Users can view their own devices" ON public.device_tokens;
CREATE POLICY "Users can view their own devices" 
ON public.device_tokens FOR SELECT 
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own devices" ON public.device_tokens;
CREATE POLICY "Users can insert their own devices" 
ON public.device_tokens FOR INSERT 
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own devices" ON public.device_tokens;
CREATE POLICY "Users can update their own devices" 
ON public.device_tokens FOR UPDATE 
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own devices" ON public.device_tokens;
CREATE POLICY "Users can delete their own devices" 
ON public.device_tokens FOR DELETE 
USING (auth.uid() = user_id);

-- 4. Create index for performance
CREATE INDEX IF NOT EXISTS idx_device_tokens_user ON public.device_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_device_tokens_device ON public.device_tokens(device_id);

-- ========================================
-- 5. RPC Function to Revoke Device
-- ========================================
CREATE OR REPLACE FUNCTION revoke_device(device_token_id uuid)
RETURNS void AS $$
BEGIN
    UPDATE public.device_tokens
    SET status = 'revoked'
    WHERE id = device_token_id AND user_id = auth.uid();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
