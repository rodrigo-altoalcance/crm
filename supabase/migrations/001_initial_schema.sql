-- ============================================================
-- Alto Alcance CRM — Initial Schema
-- ============================================================

-- Companies (Alto Alcance's paying clients)
CREATE TABLE companies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  logo_url text,
  email text,
  phone text,
  address text,
  website text,
  monthly_fee numeric(12,2),
  currency text DEFAULT 'CLP',
  next_payment_date date,
  payment_day integer CHECK (payment_day BETWEEN 1 AND 31),
  max_users integer DEFAULT 5,
  status text DEFAULT 'active' CHECK (status IN ('active','inactive','trial')),
  org_name text,
  org_email text,
  org_phone text,
  org_website text,
  created_at timestamptz DEFAULT now()
);

-- Payments (Alto Alcance collects from companies)
CREATE TABLE payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid REFERENCES companies(id) ON DELETE CASCADE,
  amount numeric(12,2) NOT NULL,
  currency text DEFAULT 'CLP',
  paid_at timestamptz NOT NULL,
  notes text,
  recorded_by uuid,
  created_at timestamptz DEFAULT now()
);

-- User profiles (extends auth.users)
CREATE TABLE profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  company_id uuid REFERENCES companies(id) ON DELETE SET NULL,
  role text NOT NULL DEFAULT 'seller' CHECK (role IN ('super_admin','company_admin','seller')),
  full_name text NOT NULL DEFAULT '',
  phone text,
  avatar_url text,
  permissions jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);

-- Lead stages (per company, customizable)
CREATE TABLE lead_stages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid REFERENCES companies(id) ON DELETE CASCADE,
  name text NOT NULL,
  color text DEFAULT '#6366F1',
  position integer DEFAULT 0,
  is_final boolean DEFAULT false,
  is_lost boolean DEFAULT false
);

-- Leads (prospects managed by companies)
CREATE TABLE leads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid REFERENCES companies(id) ON DELETE CASCADE,
  stage_id uuid REFERENCES lead_stages(id) ON DELETE SET NULL,
  first_name text NOT NULL,
  last_name text NOT NULL,
  email text NOT NULL,
  phone text,
  message text,
  source text DEFAULT 'manual' CHECK (source IN ('meta','calendly','manual')),
  assigned_to uuid REFERENCES profiles(id) ON DELETE SET NULL,
  notes text,
  custom_fields jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Lead activity log
CREATE TABLE lead_activities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid REFERENCES leads(id) ON DELETE CASCADE,
  user_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  type text NOT NULL,
  description text NOT NULL,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);

-- Tasks (linked to company and optionally a lead)
CREATE TABLE tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid REFERENCES companies(id) ON DELETE CASCADE,
  lead_id uuid REFERENCES leads(id) ON DELETE SET NULL,
  title text NOT NULL,
  description text,
  assigned_to uuid REFERENCES profiles(id) ON DELETE SET NULL,
  due_date date,
  priority text DEFAULT 'medium' CHECK (priority IN ('low','medium','high')),
  status text DEFAULT 'pending' CHECK (status IN ('pending','in_progress','completed')),
  created_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now()
);

-- Webhook tokens (for Make.com integration)
CREATE TABLE webhook_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid REFERENCES companies(id) ON DELETE CASCADE,
  token uuid UNIQUE DEFAULT gen_random_uuid(),
  name text NOT NULL,
  field_mapping jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);

-- Custom lead field definitions (per company)
CREATE TABLE lead_field_definitions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid REFERENCES companies(id) ON DELETE CASCADE,
  name text NOT NULL,
  label text NOT NULL,
  type text DEFAULT 'text' CHECK (type IN ('text','number','date','select')),
  options jsonb,
  required boolean DEFAULT false,
  position integer DEFAULT 0
);

-- Client records (post-conversion notes for company's own clients)
CREATE TABLE client_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid REFERENCES leads(id) ON DELETE CASCADE,
  company_id uuid REFERENCES companies(id) ON DELETE CASCADE,
  created_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  title text NOT NULL,
  description text,
  type text DEFAULT 'note' CHECK (type IN ('note','meeting','agreement','other')),
  record_date date,
  created_at timestamptz DEFAULT now()
);

-- Email templates (for billing reminders)
CREATE TABLE email_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  subject text NOT NULL,
  body_html text NOT NULL,
  type text DEFAULT 'billing',
  is_default boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- Global CRM settings
CREATE TABLE crm_settings (
  key text PRIMARY KEY,
  value text,
  updated_at timestamptz DEFAULT now()
);

-- ============================================================
-- Indexes
-- ============================================================
CREATE INDEX leads_company_id_idx ON leads(company_id);
CREATE INDEX leads_stage_id_idx ON leads(stage_id);
CREATE INDEX tasks_company_id_idx ON tasks(company_id);
CREATE INDEX lead_activities_lead_id_idx ON lead_activities(lead_id);
CREATE INDEX webhook_tokens_token_idx ON webhook_tokens(token);
CREATE INDEX profiles_company_id_idx ON profiles(company_id);
CREATE INDEX client_records_lead_id_idx ON client_records(lead_id);
CREATE INDEX client_records_company_id_idx ON client_records(company_id);

-- ============================================================
-- RLS
-- ============================================================
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE lead_stages ENABLE ROW LEVEL SECURITY;
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE lead_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE webhook_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE lead_field_definitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE client_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm_settings ENABLE ROW LEVEL SECURITY;

-- Helper function
CREATE OR REPLACE FUNCTION is_super_admin()
RETURNS boolean AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'super_admin'
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION get_my_company_id()
RETURNS uuid AS $$
  SELECT company_id FROM profiles WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Companies policies
CREATE POLICY "super_admin can do all on companies" ON companies
  FOR ALL USING (is_super_admin());
CREATE POLICY "company members can view their company" ON companies
  FOR SELECT USING (id = get_my_company_id());

-- Payments policies (super_admin only)
CREATE POLICY "super_admin can do all on payments" ON payments
  FOR ALL USING (is_super_admin());

-- Profiles policies
CREATE POLICY "super_admin can do all on profiles" ON profiles
  FOR ALL USING (is_super_admin());
CREATE POLICY "users can view profiles in their company" ON profiles
  FOR SELECT USING (company_id = get_my_company_id() OR id = auth.uid());
CREATE POLICY "users can update own profile" ON profiles
  FOR UPDATE USING (id = auth.uid());

-- Lead stages policies
CREATE POLICY "super_admin can do all on lead_stages" ON lead_stages
  FOR ALL USING (is_super_admin());
CREATE POLICY "company members can do all on their lead_stages" ON lead_stages
  FOR ALL USING (company_id = get_my_company_id());

-- Leads policies
CREATE POLICY "super_admin can do all on leads" ON leads
  FOR ALL USING (is_super_admin());
CREATE POLICY "company members can do all on their leads" ON leads
  FOR ALL USING (company_id = get_my_company_id());

-- Lead activities policies
CREATE POLICY "super_admin can do all on lead_activities" ON lead_activities
  FOR ALL USING (is_super_admin());
CREATE POLICY "company members can view their lead activities" ON lead_activities
  FOR SELECT USING (
    lead_id IN (SELECT id FROM leads WHERE company_id = get_my_company_id())
  );
CREATE POLICY "company members can insert lead activities" ON lead_activities
  FOR INSERT WITH CHECK (
    lead_id IN (SELECT id FROM leads WHERE company_id = get_my_company_id())
  );

-- Tasks policies
CREATE POLICY "super_admin can do all on tasks" ON tasks
  FOR ALL USING (is_super_admin());
CREATE POLICY "company members can do all on their tasks" ON tasks
  FOR ALL USING (company_id = get_my_company_id());

-- Webhook tokens policies
CREATE POLICY "super_admin can do all on webhook_tokens" ON webhook_tokens
  FOR ALL USING (is_super_admin());
CREATE POLICY "company members can manage their webhook_tokens" ON webhook_tokens
  FOR ALL USING (company_id = get_my_company_id());

-- Lead field definitions policies
CREATE POLICY "super_admin can do all on lead_field_definitions" ON lead_field_definitions
  FOR ALL USING (is_super_admin());
CREATE POLICY "company members can manage their field_definitions" ON lead_field_definitions
  FOR ALL USING (company_id = get_my_company_id());

-- Client records policies
CREATE POLICY "super_admin can do all on client_records" ON client_records
  FOR ALL USING (is_super_admin());
CREATE POLICY "company members can do all on their client_records" ON client_records
  FOR ALL USING (company_id = get_my_company_id());

-- Email templates (super_admin only)
CREATE POLICY "super_admin can do all on email_templates" ON email_templates
  FOR ALL USING (is_super_admin());

-- CRM settings (super_admin only)
CREATE POLICY "super_admin can do all on crm_settings" ON crm_settings
  FOR ALL USING (is_super_admin());

-- ============================================================
-- Trigger: auto-create profile on auth.users insert
-- ============================================================
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO profiles (id, role, full_name, company_id)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'role', 'seller'),
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    CASE
      WHEN NEW.raw_user_meta_data->>'company_id' IS NOT NULL
      THEN (NEW.raw_user_meta_data->>'company_id')::uuid
      ELSE NULL
    END
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ============================================================
-- Function: seed default stages for a new company
-- ============================================================
CREATE OR REPLACE FUNCTION seed_default_stages(p_company_id uuid)
RETURNS void AS $$
BEGIN
  INSERT INTO lead_stages (company_id, name, color, position, is_final, is_lost) VALUES
    (p_company_id, 'Nuevo',              '#6366F1', 0, false, false),
    (p_company_id, 'Llamada agendada',   '#F59E0B', 1, false, false),
    (p_company_id, 'Reunión',            '#3B82F6', 2, false, false),
    (p_company_id, 'Negociación',        '#8B5CF6', 3, false, false),
    (p_company_id, 'Cerrado',            '#10B981', 4, true,  false),
    (p_company_id, 'No calificó',        '#EF4444', 5, false, true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- Default email template
-- ============================================================
INSERT INTO email_templates (name, subject, body_html, type, is_default) VALUES (
  'Recordatorio de pago',
  'Recordatorio de pago — {{agencia_nombre}}',
  '<!DOCTYPE html><html><body style="font-family:sans-serif;background:#f8fafc;padding:40px 0"><div style="max-width:560px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,.1)"><div style="background:#0F172A;padding:32px;text-align:center"><h1 style="color:#fff;margin:0;font-size:24px">{{agencia_nombre}}</h1></div><div style="padding:32px"><h2 style="color:#1e293b;margin-top:0">Hola {{cliente_nombre}},</h2><p style="color:#475569;line-height:1.6">Te recordamos que tienes un pago pendiente correspondiente a los servicios del mes.</p><div style="background:#f8fafc;border-radius:8px;padding:20px;margin:24px 0"><p style="margin:0;color:#64748b;font-size:14px">Monto a pagar</p><p style="margin:8px 0 0;color:#1e293b;font-size:28px;font-weight:700">{{monto}}</p></div><p style="color:#475569">Fecha límite: <strong>{{fecha_vencimiento}}</strong></p><a href="mailto:{{agencia_email}}" style="display:inline-block;background:#6366F1;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;margin-top:8px">Contactar a {{agencia_nombre}}</a></div><div style="padding:24px 32px;border-top:1px solid #e2e8f0;text-align:center"><p style="margin:0;color:#94a3b8;font-size:12px">{{agencia_nombre}} — Este es un email automático</p></div></div></body></html>',
  'billing',
  true
);

-- Initial CRM settings
INSERT INTO crm_settings (key, value) VALUES
  ('agency_name', 'Alto Alcance'),
  ('agency_email', ''),
  ('resend_api_key', '');
