-- Migración 009: Preferencias de columnas visibles por usuario

CREATE TABLE user_lead_column_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  context TEXT NOT NULL CHECK (context IN ('agency', 'company')),
  company_id UUID,
  column_key TEXT NOT NULL,
  visible BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_ulcp_user_context ON user_lead_column_preferences(user_id, context);
CREATE INDEX idx_ulcp_user_company ON user_lead_column_preferences(user_id, company_id) WHERE company_id IS NOT NULL;

ALTER TABLE user_lead_column_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_own_column_prefs" ON user_lead_column_preferences
  FOR ALL USING (auth.uid() = user_id);
