-- Migration 009: notifications table
-- Stores in-app notifications for users (task_assigned, task_due)

CREATE TABLE IF NOT EXISTS notifications (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type           TEXT NOT NULL CHECK (type IN ('task_assigned', 'task_due')),
  title          TEXT NOT NULL,
  body           TEXT,
  related_task_id UUID,  -- optional soft reference; no FK to avoid cross-table issues with agency_tasks
  read_at        TIMESTAMPTZ,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS notifications_user_id_created_at_idx
  ON notifications (user_id, created_at DESC);

-- RLS
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Users can only read their own notifications
CREATE POLICY "Users read own notifications"
  ON notifications FOR SELECT
  USING (auth.uid() = user_id);

-- Users can update (mark as read) their own notifications
CREATE POLICY "Users update own notifications"
  ON notifications FOR UPDATE
  USING (auth.uid() = user_id);

-- Service role (admin client) can insert notifications for any user
-- No INSERT policy for authenticated role — notifications are created server-side via admin client
