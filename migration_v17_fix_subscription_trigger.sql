-- Migration v17: Fix Subscription Trigger & Auto-Activate
-- Date: 2025-12-01
-- Description: Automatically create active subscriptions for new users (7-day trial)

-- 1. Create a function to handle new user signup
CREATE OR REPLACE FUNCTION public.handle_new_user_subscription()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.subscriptions (
        user_id, 
        status, 
        subscription_type, 
        start_date, 
        end_date, 
        notes
    )
    VALUES (
        NEW.id, 
        'active', 
        'monthly', 
        NOW(), 
        NOW() + INTERVAL '7 days', 
        'Automatic 7-day trial'
    )
    ON CONFLICT (user_id) DO NOTHING;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Create the trigger on auth.users
DROP TRIGGER IF EXISTS on_auth_user_created_subscription ON auth.users;
CREATE TRIGGER on_auth_user_created_subscription
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_user_subscription();

-- 3. Fix existing users: Activate ALL existing users who are pending or have no subscription
INSERT INTO public.subscriptions (user_id, status, subscription_type, start_date, end_date, notes)
SELECT 
    id, 
    'active', 
    'monthly', 
    NOW(), 
    NOW() + INTERVAL '30 days', 
    'Manual activation fix'
FROM auth.users
WHERE id NOT IN (SELECT user_id FROM public.subscriptions)
ON CONFLICT (user_id) DO UPDATE
SET 
    status = 'active',
    end_date = GREATEST(subscriptions.end_date, NOW() + INTERVAL '30 days');

-- 4. Update the check function to be robust (ensure it returns true if active)
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
    
    -- If no subscription found, return TRUE (allow access by default if something breaks) 
    -- OR return FALSE if you want strict enforcement. 
    -- For now, let's keep it strict but rely on the trigger.
    IF NOT FOUND THEN
        RETURN QUERY SELECT false, 'pending'::TEXT, NULL::TIMESTAMP WITH TIME ZONE;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
