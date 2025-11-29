-- ========================================
-- MIGRATION V3: Device Security
-- ========================================
-- Create device_tokens table to track authorized devices

-- 1. Create device_tokens table
CREATE TABLE IF NOT EXISTS public.device_tokens (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    device_name TEXT,
    device_id TEXT NOT NULL, -- Unique ID stored in local storage
    last_used_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    is_trusted BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    UNIQUE(user_id, device_id)
);

-- 2. Enable RLS
ALTER TABLE public.device_tokens ENABLE ROW LEVEL SECURITY;

-- 3. Drop existing policies if they exist (prevents duplicate policy error)
DROP POLICY IF EXISTS "Users can view their own devices" ON public.device_tokens;
DROP POLICY IF EXISTS "Users can insert their own devices" ON public.device_tokens;
DROP POLICY IF EXISTS "Users can update their own devices" ON public.device_tokens;

-- 4. Create RLS Policies
CREATE POLICY "Users can view their own devices" 
ON public.device_tokens FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own devices" 
ON public.device_tokens FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own devices" 
ON public.device_tokens FOR UPDATE 
USING (auth.uid() = user_id);

-- 5. Function to update last_used_at
CREATE OR REPLACE FUNCTION update_device_last_used()
RETURNS TRIGGER AS $$
BEGIN
    NEW.last_used_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 6. Trigger to update last_used_at automatically
DROP TRIGGER IF EXISTS update_device_timestamp ON public.device_tokens;
CREATE TRIGGER update_device_timestamp
    BEFORE UPDATE ON public.device_tokens
    FOR EACH ROW
    EXECUTE FUNCTION update_device_last_used();

-- ========================================
-- MIGRATION COMPLETE
-- ========================================
