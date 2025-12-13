-- ============================================
-- ADD ASSIGNEE TO INTERNAL EVENTS
-- Migration: Add assigned_to column for event responsibility
-- ============================================

-- 1. Add assigned_to column to internal_events
ALTER TABLE internal_events
ADD COLUMN IF NOT EXISTS assigned_to UUID REFERENCES auth.users(id) ON DELETE SET NULL;

-- 2. Create index for faster queries by assignee
CREATE INDEX IF NOT EXISTS idx_internal_events_assigned_to
ON internal_events(assigned_to)
WHERE assigned_to IS NOT NULL;

-- 3. Add composite index for workspace + assignee queries
CREATE INDEX IF NOT EXISTS idx_internal_events_workspace_assignee
ON internal_events(workspace_id, assigned_to)
WHERE assigned_to IS NOT NULL;

-- 4. Add comment explaining the column
COMMENT ON COLUMN internal_events.assigned_to IS 'User ID of the team member responsible for this event';

-- ============================================
-- FUNCTION: Get events by assignee
-- ============================================
CREATE OR REPLACE FUNCTION get_events_by_assignee(
  p_workspace_id UUID,
  p_user_id UUID,
  p_start_date TIMESTAMPTZ DEFAULT NULL,
  p_end_date TIMESTAMPTZ DEFAULT NULL
)
RETURNS SETOF internal_events
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT *
  FROM internal_events
  WHERE workspace_id = p_workspace_id
    AND assigned_to = p_user_id
    AND event_status != 'cancelled'
    AND (p_start_date IS NULL OR start_time >= p_start_date)
    AND (p_end_date IS NULL OR start_time <= p_end_date)
  ORDER BY start_time ASC;
$$;

-- ============================================
-- FUNCTION: Get assignee statistics
-- ============================================
CREATE OR REPLACE FUNCTION get_assignee_event_stats(
  p_workspace_id UUID,
  p_start_date TIMESTAMPTZ DEFAULT NULL,
  p_end_date TIMESTAMPTZ DEFAULT NULL
)
RETURNS TABLE (
  user_id UUID,
  user_name TEXT,
  total_events BIGINT,
  confirmed_events BIGINT,
  cancelled_events BIGINT,
  pending_events BIGINT
)
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT
    u.id AS user_id,
    u.name AS user_name,
    COUNT(*) AS total_events,
    COUNT(*) FILTER (WHERE e.event_status = 'confirmed') AS confirmed_events,
    COUNT(*) FILTER (WHERE e.event_status = 'cancelled') AS cancelled_events,
    COUNT(*) FILTER (WHERE e.event_status = 'tentative') AS pending_events
  FROM internal_events e
  JOIN auth.users u ON e.assigned_to = u.id
  WHERE e.workspace_id = p_workspace_id
    AND e.assigned_to IS NOT NULL
    AND (p_start_date IS NULL OR e.start_time >= p_start_date)
    AND (p_end_date IS NULL OR e.start_time <= p_end_date)
  GROUP BY u.id, u.name
  ORDER BY total_events DESC;
$$;
