-- ============================================================
-- Migration 014: agency_member role
-- Colaboradores de agencia con acceso a /admin/* pero sin ver
-- datos financieros (pagos, fees mensuales).
-- ============================================================

-- 1. Add agency_member to profiles.role CHECK constraint
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE profiles ADD CONSTRAINT profiles_role_check
  CHECK (role IN ('super_admin', 'company_admin', 'seller', 'agency_member'));

-- 2. Helper function is_agency_staff()
CREATE OR REPLACE FUNCTION is_agency_staff()
RETURNS boolean AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles WHERE id = (select auth.uid()) AND role IN ('super_admin', 'agency_member')
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- 3. companies: agency_staff can SELECT (frontend ocultará montos)
DROP POLICY IF EXISTS "companies_select" ON companies;
CREATE POLICY "companies_select" ON companies
  FOR SELECT TO authenticated USING (is_agency_staff() OR id = get_my_company_id());

-- 4. profiles: agency_staff can SELECT (para listas de equipo)
DROP POLICY IF EXISTS "profiles_select" ON profiles;
CREATE POLICY "profiles_select" ON profiles
  FOR SELECT TO authenticated USING (
    is_agency_staff() OR company_id = get_my_company_id() OR id = (select auth.uid())
  );

-- 5. lead_stages: agency_staff can SELECT (para counts del dashboard)
DROP POLICY IF EXISTS "lead_stages_access" ON lead_stages;
CREATE POLICY "lead_stages_select" ON lead_stages
  FOR SELECT TO authenticated USING (is_agency_staff() OR company_id = get_my_company_id());
CREATE POLICY "lead_stages_insert" ON lead_stages
  FOR INSERT TO authenticated WITH CHECK (is_super_admin() OR company_id = get_my_company_id());
CREATE POLICY "lead_stages_update" ON lead_stages
  FOR UPDATE TO authenticated USING (is_super_admin() OR company_id = get_my_company_id());
CREATE POLICY "lead_stages_delete" ON lead_stages
  FOR DELETE TO authenticated USING (is_super_admin() OR company_id = get_my_company_id());

-- 6. leads: agency_staff can SELECT (para counts del dashboard)
DROP POLICY IF EXISTS "leads_access" ON leads;
CREATE POLICY "leads_select" ON leads
  FOR SELECT TO authenticated USING (is_agency_staff() OR company_id = get_my_company_id());
CREATE POLICY "leads_insert" ON leads
  FOR INSERT TO authenticated WITH CHECK (is_super_admin() OR company_id = get_my_company_id());
CREATE POLICY "leads_update" ON leads
  FOR UPDATE TO authenticated USING (is_super_admin() OR company_id = get_my_company_id());
CREATE POLICY "leads_delete" ON leads
  FOR DELETE TO authenticated USING (is_super_admin() OR company_id = get_my_company_id());

-- 7. Agency tables: acceso completo para agency_staff
DROP POLICY IF EXISTS "super_admin can do all on agency_stages" ON agency_stages;
CREATE POLICY "agency_stages_access" ON agency_stages
  FOR ALL TO authenticated USING (is_agency_staff());

DROP POLICY IF EXISTS "super_admin can do all on agency_leads" ON agency_leads;
CREATE POLICY "agency_leads_access" ON agency_leads
  FOR ALL TO authenticated USING (is_agency_staff());

DROP POLICY IF EXISTS "super_admin can do all on agency_lead_activities" ON agency_lead_activities;
CREATE POLICY "agency_lead_activities_access" ON agency_lead_activities
  FOR ALL TO authenticated USING (is_agency_staff());

DROP POLICY IF EXISTS "super_admin can do all on agency_tasks" ON agency_tasks;
CREATE POLICY "agency_tasks_access" ON agency_tasks
  FOR ALL TO authenticated USING (is_agency_staff());

DROP POLICY IF EXISTS "super_admin can do all on agency_task_comments" ON agency_task_comments;
CREATE POLICY "agency_task_comments_access" ON agency_task_comments
  FOR ALL TO authenticated USING (is_agency_staff());

DROP POLICY IF EXISTS "super_admin can do all on agency_webhook_tokens" ON agency_webhook_tokens;
CREATE POLICY "agency_webhook_tokens_access" ON agency_webhook_tokens
  FOR ALL TO authenticated USING (is_agency_staff());

-- 8. crm_settings: agency_staff puede SELECT; mutaciones solo super_admin
DROP POLICY IF EXISTS "super_admin can do all on crm_settings" ON crm_settings;
CREATE POLICY "crm_settings_select" ON crm_settings
  FOR SELECT TO authenticated USING (is_agency_staff());
CREATE POLICY "crm_settings_insert" ON crm_settings
  FOR INSERT TO authenticated WITH CHECK (is_super_admin());
CREATE POLICY "crm_settings_update" ON crm_settings
  FOR UPDATE TO authenticated USING (is_super_admin());
CREATE POLICY "crm_settings_delete" ON crm_settings
  FOR DELETE TO authenticated USING (is_super_admin());

-- 9. email_templates: agency_staff puede SELECT; mutaciones solo super_admin
DROP POLICY IF EXISTS "super_admin can do all on email_templates" ON email_templates;
CREATE POLICY "email_templates_select" ON email_templates
  FOR SELECT TO authenticated USING (is_agency_staff());
CREATE POLICY "email_templates_insert" ON email_templates
  FOR INSERT TO authenticated WITH CHECK (is_super_admin());
CREATE POLICY "email_templates_update" ON email_templates
  FOR UPDATE TO authenticated USING (is_super_admin());
CREATE POLICY "email_templates_delete" ON email_templates
  FOR DELETE TO authenticated USING (is_super_admin());

-- 10. custom_lead_fields: agency_staff para campos de agencia
DROP POLICY IF EXISTS "custom_lead_fields_access" ON custom_lead_fields;
CREATE POLICY "custom_lead_fields_access" ON custom_lead_fields
  FOR ALL TO authenticated USING (
    is_agency_staff() OR (
      context = 'company' AND
      company_id IN (
        SELECT company_id FROM profiles
        WHERE id = (select auth.uid()) AND role IN ('company_admin', 'seller')
      )
    )
  );

-- 11. custom_lead_field_values: agency_staff
DROP POLICY IF EXISTS "custom_lead_field_values_access" ON custom_lead_field_values;
CREATE POLICY "custom_lead_field_values_access" ON custom_lead_field_values
  FOR ALL TO authenticated USING (
    is_agency_staff() OR
    field_id IN (
      SELECT clf.id FROM custom_lead_fields clf
      JOIN profiles p ON p.id = (select auth.uid())
      WHERE clf.context = 'company'
        AND clf.company_id = p.company_id
        AND p.role IN ('company_admin', 'seller')
    )
  );

-- 12. admin_audit_log: agency_staff SELECT+INSERT; solo super_admin DELETE
DROP POLICY IF EXISTS "super_admin can do all on admin_audit_log" ON admin_audit_log;
CREATE POLICY "admin_audit_log_select" ON admin_audit_log
  FOR SELECT TO authenticated USING (is_agency_staff());
CREATE POLICY "admin_audit_log_insert" ON admin_audit_log
  FOR INSERT TO authenticated WITH CHECK (is_agency_staff());
CREATE POLICY "admin_audit_log_delete" ON admin_audit_log
  FOR DELETE TO authenticated USING (is_super_admin());

-- PAYMENTS: Sin cambios — sigue siendo solo super_admin
-- "super_admin can do all on payments" permanece intacta
