-- Migración 011: Fix RLS performance — (select auth.uid()) evalúa una vez por query
-- Sin este patrón, auth.uid() se re-evalúa por cada fila, lo cual es ineficiente.

-- ============================================================
-- Funciones helper — corregir auth.uid() interno
-- ============================================================
CREATE OR REPLACE FUNCTION is_super_admin()
RETURNS boolean AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles WHERE id = (select auth.uid()) AND role = 'super_admin'
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION get_my_company_id()
RETURNS uuid AS $$
  SELECT company_id FROM profiles WHERE id = (select auth.uid());
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- ============================================================
-- profiles — políticas con auth.uid() directo
-- ============================================================
DROP POLICY IF EXISTS "users can view profiles in their company" ON profiles;
CREATE POLICY "users can view profiles in their company" ON profiles
  FOR SELECT USING (company_id = get_my_company_id() OR id = (select auth.uid()));

DROP POLICY IF EXISTS "users can update own profile" ON profiles;
CREATE POLICY "users can update own profile" ON profiles
  FOR UPDATE USING (id = (select auth.uid()));

-- ============================================================
-- custom_lead_fields — migración 008
-- ============================================================
DROP POLICY IF EXISTS "super_admin_clf_all" ON custom_lead_fields;
CREATE POLICY "super_admin_clf_all" ON custom_lead_fields
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = (select auth.uid()) AND role = 'super_admin')
  );

DROP POLICY IF EXISTS "company_user_clf" ON custom_lead_fields;
CREATE POLICY "company_user_clf" ON custom_lead_fields
  FOR ALL USING (
    context = 'company' AND
    company_id IN (
      SELECT company_id FROM profiles
      WHERE id = (select auth.uid()) AND role IN ('company_admin', 'seller')
    )
  );

-- ============================================================
-- custom_lead_field_values — migración 008
-- ============================================================
DROP POLICY IF EXISTS "super_admin_clfv_all" ON custom_lead_field_values;
CREATE POLICY "super_admin_clfv_all" ON custom_lead_field_values
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = (select auth.uid()) AND role = 'super_admin')
  );

DROP POLICY IF EXISTS "company_user_clfv" ON custom_lead_field_values;
CREATE POLICY "company_user_clfv" ON custom_lead_field_values
  FOR ALL USING (
    field_id IN (
      SELECT clf.id FROM custom_lead_fields clf
      JOIN profiles p ON p.id = (select auth.uid())
      WHERE clf.context = 'company'
        AND clf.company_id = p.company_id
        AND p.role IN ('company_admin', 'seller')
    )
  );

-- ============================================================
-- user_lead_column_preferences — migración 009
-- ============================================================
DROP POLICY IF EXISTS "users_own_column_prefs" ON user_lead_column_preferences;
CREATE POLICY "users_own_column_prefs" ON user_lead_column_preferences
  FOR ALL USING ((select auth.uid()) = user_id);
