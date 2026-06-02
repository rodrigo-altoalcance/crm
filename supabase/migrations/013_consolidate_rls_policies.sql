-- Migración 013: Consolidar políticas RLS — una sola política por acción+rol
-- Tener múltiples políticas permisivas para el mismo rol+acción obliga a PostgreSQL
-- a evaluar todas. Fusionarlas en una con OR elimina el warning y mejora performance.

-- ============================================================
-- companies: super_admin todo, company members solo SELECT
-- ============================================================
DROP POLICY IF EXISTS "super_admin can do all on companies" ON companies;
DROP POLICY IF EXISTS "company members can view their company" ON companies;
CREATE POLICY "companies_select" ON companies
  FOR SELECT TO authenticated USING (is_super_admin() OR id = get_my_company_id());
CREATE POLICY "companies_insert" ON companies
  FOR INSERT TO authenticated WITH CHECK (is_super_admin());
CREATE POLICY "companies_update" ON companies
  FOR UPDATE TO authenticated USING (is_super_admin());
CREATE POLICY "companies_delete" ON companies
  FOR DELETE TO authenticated USING (is_super_admin());

-- ============================================================
-- profiles: super_admin todo, company members SELECT, propio UPDATE
-- ============================================================
DROP POLICY IF EXISTS "super_admin can do all on profiles" ON profiles;
DROP POLICY IF EXISTS "users can view profiles in their company" ON profiles;
DROP POLICY IF EXISTS "users can update own profile" ON profiles;
CREATE POLICY "profiles_select" ON profiles
  FOR SELECT TO authenticated USING (is_super_admin() OR company_id = get_my_company_id() OR id = (select auth.uid()));
CREATE POLICY "profiles_insert" ON profiles
  FOR INSERT TO authenticated WITH CHECK (is_super_admin());
CREATE POLICY "profiles_update" ON profiles
  FOR UPDATE TO authenticated USING (is_super_admin() OR id = (select auth.uid()));
CREATE POLICY "profiles_delete" ON profiles
  FOR DELETE TO authenticated USING (is_super_admin());

-- ============================================================
-- lead_stages: ambos roles hacen todo
-- ============================================================
DROP POLICY IF EXISTS "super_admin can do all on lead_stages" ON lead_stages;
DROP POLICY IF EXISTS "company members can do all on their lead_stages" ON lead_stages;
CREATE POLICY "lead_stages_access" ON lead_stages
  FOR ALL TO authenticated USING (is_super_admin() OR company_id = get_my_company_id());

-- ============================================================
-- leads: ambos roles hacen todo
-- ============================================================
DROP POLICY IF EXISTS "super_admin can do all on leads" ON leads;
DROP POLICY IF EXISTS "company members can do all on their leads" ON leads;
CREATE POLICY "leads_access" ON leads
  FOR ALL TO authenticated USING (is_super_admin() OR company_id = get_my_company_id());

-- ============================================================
-- lead_activities: super_admin todo, company members SELECT+INSERT
-- ============================================================
DROP POLICY IF EXISTS "super_admin can do all on lead_activities" ON lead_activities;
DROP POLICY IF EXISTS "company members can view their lead activities" ON lead_activities;
DROP POLICY IF EXISTS "company members can insert lead activities" ON lead_activities;
CREATE POLICY "lead_activities_select" ON lead_activities
  FOR SELECT TO authenticated USING (
    is_super_admin() OR lead_id IN (SELECT id FROM leads WHERE company_id = get_my_company_id())
  );
CREATE POLICY "lead_activities_insert" ON lead_activities
  FOR INSERT TO authenticated WITH CHECK (
    is_super_admin() OR lead_id IN (SELECT id FROM leads WHERE company_id = get_my_company_id())
  );
CREATE POLICY "lead_activities_update" ON lead_activities
  FOR UPDATE TO authenticated USING (is_super_admin());
CREATE POLICY "lead_activities_delete" ON lead_activities
  FOR DELETE TO authenticated USING (is_super_admin());

-- ============================================================
-- tasks: ambos roles hacen todo
-- ============================================================
DROP POLICY IF EXISTS "super_admin can do all on tasks" ON tasks;
DROP POLICY IF EXISTS "company members can do all on their tasks" ON tasks;
CREATE POLICY "tasks_access" ON tasks
  FOR ALL TO authenticated USING (is_super_admin() OR company_id = get_my_company_id());

-- ============================================================
-- webhook_tokens: ambos roles hacen todo
-- ============================================================
DROP POLICY IF EXISTS "super_admin can do all on webhook_tokens" ON webhook_tokens;
DROP POLICY IF EXISTS "company members can manage their webhook_tokens" ON webhook_tokens;
CREATE POLICY "webhook_tokens_access" ON webhook_tokens
  FOR ALL TO authenticated USING (is_super_admin() OR company_id = get_my_company_id());

-- ============================================================
-- lead_field_definitions: ambos roles hacen todo
-- ============================================================
DROP POLICY IF EXISTS "super_admin can do all on lead_field_definitions" ON lead_field_definitions;
DROP POLICY IF EXISTS "company members can manage their field_definitions" ON lead_field_definitions;
CREATE POLICY "lead_field_definitions_access" ON lead_field_definitions
  FOR ALL TO authenticated USING (is_super_admin() OR company_id = get_my_company_id());

-- ============================================================
-- client_records: ambos roles hacen todo
-- ============================================================
DROP POLICY IF EXISTS "super_admin can do all on client_records" ON client_records;
DROP POLICY IF EXISTS "company members can do all on their client_records" ON client_records;
CREATE POLICY "client_records_access" ON client_records
  FOR ALL TO authenticated USING (is_super_admin() OR company_id = get_my_company_id());

-- ============================================================
-- custom_lead_fields: fusionar super_admin + company user
-- ============================================================
DROP POLICY IF EXISTS "super_admin_clf_all" ON custom_lead_fields;
DROP POLICY IF EXISTS "company_user_clf" ON custom_lead_fields;
CREATE POLICY "custom_lead_fields_access" ON custom_lead_fields
  FOR ALL TO authenticated USING (
    is_super_admin() OR (
      context = 'company' AND
      company_id IN (
        SELECT company_id FROM profiles
        WHERE id = (select auth.uid()) AND role IN ('company_admin', 'seller')
      )
    )
  );

-- ============================================================
-- custom_lead_field_values: fusionar super_admin + company user
-- ============================================================
DROP POLICY IF EXISTS "super_admin_clfv_all" ON custom_lead_field_values;
DROP POLICY IF EXISTS "company_user_clfv" ON custom_lead_field_values;
CREATE POLICY "custom_lead_field_values_access" ON custom_lead_field_values
  FOR ALL TO authenticated USING (
    is_super_admin() OR
    field_id IN (
      SELECT clf.id FROM custom_lead_fields clf
      JOIN profiles p ON p.id = (select auth.uid())
      WHERE clf.context = 'company'
        AND clf.company_id = p.company_id
        AND p.role IN ('company_admin', 'seller')
    )
  );

-- ============================================================
-- task_comments: fusionar super_admin + company members
-- ============================================================
DROP POLICY IF EXISTS "super_admin can do all on task_comments" ON task_comments;
DROP POLICY IF EXISTS "company members can manage task_comments" ON task_comments;
CREATE POLICY "task_comments_access" ON task_comments
  FOR ALL TO authenticated USING (
    is_super_admin() OR
    task_id IN (SELECT id FROM tasks WHERE company_id = get_my_company_id())
  );
