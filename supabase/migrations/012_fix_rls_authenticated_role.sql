-- Migración 012: Agregar TO authenticated a todas las políticas RLS
-- Sin esto, las políticas aplican también al rol anon, generando múltiples
-- políticas permisivas para el mismo rol+acción (subóptimo en performance).

-- ============================================================
-- companies
-- ============================================================
DROP POLICY IF EXISTS "super_admin can do all on companies" ON companies;
DROP POLICY IF EXISTS "company members can view their company" ON companies;
CREATE POLICY "super_admin can do all on companies" ON companies
  FOR ALL TO authenticated USING (is_super_admin());
CREATE POLICY "company members can view their company" ON companies
  FOR SELECT TO authenticated USING (id = get_my_company_id());

-- ============================================================
-- payments
-- ============================================================
DROP POLICY IF EXISTS "super_admin can do all on payments" ON payments;
CREATE POLICY "super_admin can do all on payments" ON payments
  FOR ALL TO authenticated USING (is_super_admin());

-- ============================================================
-- profiles
-- ============================================================
DROP POLICY IF EXISTS "super_admin can do all on profiles" ON profiles;
DROP POLICY IF EXISTS "users can view profiles in their company" ON profiles;
DROP POLICY IF EXISTS "users can update own profile" ON profiles;
CREATE POLICY "super_admin can do all on profiles" ON profiles
  FOR ALL TO authenticated USING (is_super_admin());
CREATE POLICY "users can view profiles in their company" ON profiles
  FOR SELECT TO authenticated USING (company_id = get_my_company_id() OR id = (select auth.uid()));
CREATE POLICY "users can update own profile" ON profiles
  FOR UPDATE TO authenticated USING (id = (select auth.uid()));

-- ============================================================
-- lead_stages
-- ============================================================
DROP POLICY IF EXISTS "super_admin can do all on lead_stages" ON lead_stages;
DROP POLICY IF EXISTS "company members can do all on their lead_stages" ON lead_stages;
CREATE POLICY "super_admin can do all on lead_stages" ON lead_stages
  FOR ALL TO authenticated USING (is_super_admin());
CREATE POLICY "company members can do all on their lead_stages" ON lead_stages
  FOR ALL TO authenticated USING (company_id = get_my_company_id());

-- ============================================================
-- leads
-- ============================================================
DROP POLICY IF EXISTS "super_admin can do all on leads" ON leads;
DROP POLICY IF EXISTS "company members can do all on their leads" ON leads;
CREATE POLICY "super_admin can do all on leads" ON leads
  FOR ALL TO authenticated USING (is_super_admin());
CREATE POLICY "company members can do all on their leads" ON leads
  FOR ALL TO authenticated USING (company_id = get_my_company_id());

-- ============================================================
-- lead_activities
-- ============================================================
DROP POLICY IF EXISTS "super_admin can do all on lead_activities" ON lead_activities;
DROP POLICY IF EXISTS "company members can view their lead activities" ON lead_activities;
DROP POLICY IF EXISTS "company members can insert lead activities" ON lead_activities;
CREATE POLICY "super_admin can do all on lead_activities" ON lead_activities
  FOR ALL TO authenticated USING (is_super_admin());
CREATE POLICY "company members can view their lead activities" ON lead_activities
  FOR SELECT TO authenticated USING (
    lead_id IN (SELECT id FROM leads WHERE company_id = get_my_company_id())
  );
CREATE POLICY "company members can insert lead activities" ON lead_activities
  FOR INSERT TO authenticated WITH CHECK (
    lead_id IN (SELECT id FROM leads WHERE company_id = get_my_company_id())
  );

-- ============================================================
-- tasks
-- ============================================================
DROP POLICY IF EXISTS "super_admin can do all on tasks" ON tasks;
DROP POLICY IF EXISTS "company members can do all on their tasks" ON tasks;
CREATE POLICY "super_admin can do all on tasks" ON tasks
  FOR ALL TO authenticated USING (is_super_admin());
CREATE POLICY "company members can do all on their tasks" ON tasks
  FOR ALL TO authenticated USING (company_id = get_my_company_id());

-- ============================================================
-- webhook_tokens
-- ============================================================
DROP POLICY IF EXISTS "super_admin can do all on webhook_tokens" ON webhook_tokens;
DROP POLICY IF EXISTS "company members can manage their webhook_tokens" ON webhook_tokens;
CREATE POLICY "super_admin can do all on webhook_tokens" ON webhook_tokens
  FOR ALL TO authenticated USING (is_super_admin());
CREATE POLICY "company members can manage their webhook_tokens" ON webhook_tokens
  FOR ALL TO authenticated USING (company_id = get_my_company_id());

-- ============================================================
-- lead_field_definitions
-- ============================================================
DROP POLICY IF EXISTS "super_admin can do all on lead_field_definitions" ON lead_field_definitions;
DROP POLICY IF EXISTS "company members can manage their field_definitions" ON lead_field_definitions;
CREATE POLICY "super_admin can do all on lead_field_definitions" ON lead_field_definitions
  FOR ALL TO authenticated USING (is_super_admin());
CREATE POLICY "company members can manage their field_definitions" ON lead_field_definitions
  FOR ALL TO authenticated USING (company_id = get_my_company_id());

-- ============================================================
-- client_records
-- ============================================================
DROP POLICY IF EXISTS "super_admin can do all on client_records" ON client_records;
DROP POLICY IF EXISTS "company members can do all on their client_records" ON client_records;
CREATE POLICY "super_admin can do all on client_records" ON client_records
  FOR ALL TO authenticated USING (is_super_admin());
CREATE POLICY "company members can do all on their client_records" ON client_records
  FOR ALL TO authenticated USING (company_id = get_my_company_id());

-- ============================================================
-- email_templates
-- ============================================================
DROP POLICY IF EXISTS "super_admin can do all on email_templates" ON email_templates;
CREATE POLICY "super_admin can do all on email_templates" ON email_templates
  FOR ALL TO authenticated USING (is_super_admin());

-- ============================================================
-- crm_settings
-- ============================================================
DROP POLICY IF EXISTS "super_admin can do all on crm_settings" ON crm_settings;
CREATE POLICY "super_admin can do all on crm_settings" ON crm_settings
  FOR ALL TO authenticated USING (is_super_admin());

-- ============================================================
-- custom_lead_fields — corregir también (migración 011 no tenía TO authenticated)
-- ============================================================
DROP POLICY IF EXISTS "super_admin_clf_all" ON custom_lead_fields;
DROP POLICY IF EXISTS "company_user_clf" ON custom_lead_fields;
CREATE POLICY "super_admin_clf_all" ON custom_lead_fields
  FOR ALL TO authenticated USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = (select auth.uid()) AND role = 'super_admin')
  );
CREATE POLICY "company_user_clf" ON custom_lead_fields
  FOR ALL TO authenticated USING (
    context = 'company' AND
    company_id IN (
      SELECT company_id FROM profiles
      WHERE id = (select auth.uid()) AND role IN ('company_admin', 'seller')
    )
  );

-- ============================================================
-- custom_lead_field_values — corregir también (migración 011 no tenía TO authenticated)
-- ============================================================
DROP POLICY IF EXISTS "super_admin_clfv_all" ON custom_lead_field_values;
DROP POLICY IF EXISTS "company_user_clfv" ON custom_lead_field_values;
CREATE POLICY "super_admin_clfv_all" ON custom_lead_field_values
  FOR ALL TO authenticated USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = (select auth.uid()) AND role = 'super_admin')
  );
CREATE POLICY "company_user_clfv" ON custom_lead_field_values
  FOR ALL TO authenticated USING (
    field_id IN (
      SELECT clf.id FROM custom_lead_fields clf
      JOIN profiles p ON p.id = (select auth.uid())
      WHERE clf.context = 'company'
        AND clf.company_id = p.company_id
        AND p.role IN ('company_admin', 'seller')
    )
  );

-- ============================================================
-- user_lead_column_preferences — corregir también (migración 011 no tenía TO authenticated)
-- ============================================================
DROP POLICY IF EXISTS "users_own_column_prefs" ON user_lead_column_preferences;
CREATE POLICY "users_own_column_prefs" ON user_lead_column_preferences
  FOR ALL TO authenticated USING ((select auth.uid()) = user_id);

-- ============================================================
-- Tablas de agencia y comentarios — migración 010 sin TO authenticated
-- ============================================================
DROP POLICY IF EXISTS "super_admin can do all on agency_stages" ON agency_stages;
CREATE POLICY "super_admin can do all on agency_stages" ON agency_stages
  FOR ALL TO authenticated USING (is_super_admin());

DROP POLICY IF EXISTS "super_admin can do all on agency_webhook_tokens" ON agency_webhook_tokens;
CREATE POLICY "super_admin can do all on agency_webhook_tokens" ON agency_webhook_tokens
  FOR ALL TO authenticated USING (is_super_admin());

DROP POLICY IF EXISTS "super_admin can do all on admin_audit_log" ON admin_audit_log;
CREATE POLICY "super_admin can do all on admin_audit_log" ON admin_audit_log
  FOR ALL TO authenticated USING (is_super_admin());

DROP POLICY IF EXISTS "super_admin can do all on agency_leads" ON agency_leads;
CREATE POLICY "super_admin can do all on agency_leads" ON agency_leads
  FOR ALL TO authenticated USING (is_super_admin());

DROP POLICY IF EXISTS "super_admin can do all on agency_lead_activities" ON agency_lead_activities;
CREATE POLICY "super_admin can do all on agency_lead_activities" ON agency_lead_activities
  FOR ALL TO authenticated USING (is_super_admin());

DROP POLICY IF EXISTS "super_admin can do all on agency_tasks" ON agency_tasks;
CREATE POLICY "super_admin can do all on agency_tasks" ON agency_tasks
  FOR ALL TO authenticated USING (is_super_admin());

DROP POLICY IF EXISTS "super_admin can do all on task_comments" ON task_comments;
DROP POLICY IF EXISTS "company members can manage task_comments" ON task_comments;
CREATE POLICY "super_admin can do all on task_comments" ON task_comments
  FOR ALL TO authenticated USING (is_super_admin());
CREATE POLICY "company members can manage task_comments" ON task_comments
  FOR ALL TO authenticated USING (
    task_id IN (
      SELECT id FROM tasks WHERE company_id = get_my_company_id()
    )
  );

DROP POLICY IF EXISTS "super_admin can do all on agency_task_comments" ON agency_task_comments;
CREATE POLICY "super_admin can do all on agency_task_comments" ON agency_task_comments
  FOR ALL TO authenticated USING (is_super_admin());
