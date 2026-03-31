-- Step 22: Automatic cleanup of old page_views data
-- This sets up a daily cron job to delete analytics data older than 90 days

-- Enable the pg_cron extension (if not already enabled)
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Create a table to log cleanup executions (both manual and automatic)
CREATE TABLE IF NOT EXISTS cleanup_log (
  id bigint generated always as identity primary key,
  executed_at timestamptz default now(),
  rows_deleted int
);

ALTER TABLE cleanup_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anon read cleanup_log" ON cleanup_log FOR SELECT USING (true);

-- Create a function to clean up old page views
CREATE OR REPLACE FUNCTION cleanup_old_page_views()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  deleted_count int;
BEGIN
  DELETE FROM page_views
  WHERE created_at < NOW() - INTERVAL '90 days';
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  
  INSERT INTO cleanup_log (rows_deleted) VALUES (deleted_count);
END;
$$;

-- Schedule the cleanup to run daily at 3 AM UTC
SELECT cron.schedule(
  'cleanup-old-page-views',           -- job name
  '0 3 * * *',                        -- cron schedule (3 AM daily)
  'SELECT cleanup_old_page_views();'  -- SQL to execute
);

-- Verify the cron job was created
SELECT * FROM cron.job WHERE jobname = 'cleanup-old-page-views';

-- Drop existing function if it exists (needed when changing return type)
DROP FUNCTION IF EXISTS get_last_cleanup_run();

-- Create a function to get the last cleanup run time (for admin dashboard)
CREATE OR REPLACE FUNCTION get_last_cleanup_run()
RETURNS TABLE(executed_at timestamptz, rows_deleted int)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    cl.executed_at,
    cl.rows_deleted
  FROM cleanup_log cl
  ORDER BY cl.executed_at DESC
  LIMIT 1;
END;
$$;

-- ============================================================================
-- MANUAL COMMANDS
-- ============================================================================

-- To manually run the cleanup immediately (useful for testing):
SELECT cleanup_old_page_views();

-- To verify the cleanup ran and check the timestamp:
SELECT * FROM cleanup_log 
ORDER BY executed_at DESC 
LIMIT 1;

-- To unschedule the job (if needed):
-- SELECT cron.unschedule('cleanup-old-page-views');
