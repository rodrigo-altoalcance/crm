-- Add scheduled_at to agency_leads (already exists in leads table)
ALTER TABLE agency_leads
  ADD COLUMN IF NOT EXISTS scheduled_at timestamptz NULL;
