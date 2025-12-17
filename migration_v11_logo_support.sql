-- Migration v11: Add Logo Support to Settings
-- Description: Adds logo_url column to settings table for storing store logo

-- Add logo_url column to settings table
ALTER TABLE settings
ADD COLUMN IF NOT EXISTS logo_url TEXT;

-- Add comment for documentation
COMMENT ON COLUMN settings.logo_url IS 'Base64 encoded logo image or URL to logo file';
