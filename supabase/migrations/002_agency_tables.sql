-- Agency pipeline stages (independent from client stages)
CREATE TABLE IF NOT EXISTS agency_stages (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  color text NOT NULL DEFAULT '#6366F1',
  position integer NOT NULL DEFAULT 0,
  is_final boolean NOT NULL DEFAULT false,
  is_lost boolean NOT NULL DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- Agency webhook tokens (independent from company tokens)
CREATE TABLE IF NOT EXISTS agency_webhook_tokens (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  token uuid DEFAULT gen_random_uuid() NOT NULL UNIQUE,
  name text NOT NULL,
  field_mapping jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

-- Admin audit log for tracking configuration changes
CREATE TABLE IF NOT EXISTS admin_audit_log (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid,
  user_name text,
  action text NOT NULL,
  section text NOT NULL,
  details jsonb,
  created_at timestamptz DEFAULT now()
);

-- Agency leads received via webhook
CREATE TABLE IF NOT EXISTS agency_leads (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  stage_id uuid REFERENCES agency_stages(id) ON DELETE SET NULL,
  first_name text,
  last_name text,
  email text,
  phone text,
  source text,
  message text,
  custom_fields jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

-- Storage bucket for agency logo
INSERT INTO storage.buckets (id, name, public)
VALUES ('agency-assets', 'agency-assets', true)
ON CONFLICT (id) DO NOTHING;

-- Allow public read of agency assets
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename = 'objects'
      AND policyname = 'Public read agency assets'
  ) THEN
    CREATE POLICY "Public read agency assets"
      ON storage.objects FOR SELECT
      USING (bucket_id = 'agency-assets');
  END IF;
END $$;
