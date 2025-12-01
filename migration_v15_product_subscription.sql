-- Migration v15: Product Improvements & Subscription System
-- Date: 2025-12-01
-- Description: Replace barcode with batch_number, add subscription management

-- 1. Rename barcode to batch_number in products table
ALTER TABLE products RENAME COLUMN barcode TO batch_number;

-- 2. Add batch_number to purchase_order_items if not exists
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'purchase_order_items' 
        AND column_name = 'batch_number'
    ) THEN
        ALTER TABLE purchase_order_items ADD COLUMN batch_number TEXT;
    END IF;
END $$;

-- 3. Create subscriptions table for manual subscription management
CREATE TABLE IF NOT EXISTS subscriptions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    status TEXT NOT NULL CHECK (status IN ('active', 'expired', 'pending')) DEFAULT 'pending',
    subscription_type TEXT CHECK (subscription_type IN ('monthly', 'yearly', 'lifetime')),
    start_date TIMESTAMP WITH TIME ZONE,
    end_date TIMESTAMP WITH TIME ZONE,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id)
);

-- Enable RLS on subscriptions
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for subscriptions
CREATE POLICY "Users can view their own subscription"
    ON subscriptions FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage all subscriptions"
    ON subscriptions FOR ALL
    USING (auth.role() = 'service_role');

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id ON subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON subscriptions(status);

-- Add trigger for updated_at
CREATE OR REPLACE FUNCTION update_subscriptions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_subscriptions_updated_at
    BEFORE UPDATE ON subscriptions
    FOR EACH ROW
    EXECUTE FUNCTION update_subscriptions_updated_at();

-- Create function to check subscription status
CREATE OR REPLACE FUNCTION check_subscription_status(user_uuid UUID)
RETURNS TABLE (
    is_active BOOLEAN,
    status TEXT,
    end_date TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        CASE 
            WHEN s.status = 'active' AND (s.end_date IS NULL OR s.end_date > NOW()) THEN true
            ELSE false
        END as is_active,
        COALESCE(s.status, 'pending') as status,
        s.end_date
    FROM subscriptions s
    WHERE s.user_id = user_uuid
    LIMIT 1;
    
    -- If no subscription found, return pending status
    IF NOT FOUND THEN
        RETURN QUERY SELECT false, 'pending'::TEXT, NULL::TIMESTAMP WITH TIME ZONE;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Insert default subscription for existing users (set to pending so they contact admin)
INSERT INTO subscriptions (user_id, status, notes)
SELECT id, 'pending', 'Existing user - requires activation by admin'
FROM auth.users
WHERE id NOT IN (SELECT user_id FROM subscriptions)
ON CONFLICT (user_id) DO NOTHING;

-- Add comment
COMMENT ON TABLE subscriptions IS 'User subscription management for SaaS model';
