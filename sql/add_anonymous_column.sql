-- Add anonymous column to prayer_requests table
-- This migration adds the anonymous flag to properly handle anonymous vs non-anonymous submissions

ALTER TABLE prayer_requests 
ADD COLUMN IF NOT EXISTS anonymous BOOLEAN DEFAULT FALSE;

-- Update existing records: if created_by_member_id is null, mark as anonymous
UPDATE prayer_requests 
SET anonymous = TRUE 
WHERE created_by_member_id IS NULL;

-- Add comment to explain the column
COMMENT ON COLUMN prayer_requests.anonymous IS 'TRUE if the request was submitted anonymously (member identity hidden)';
