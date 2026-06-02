-- Migración 010: Habilitar RLS en tablas de agencia y comentarios de tareas
-- Todas las rutas admin usan createAdminClient() que bypasea RLS.
-- Las políticas aquí protegen el acceso directo via cliente autenticado normal.

-- ============================================================
-- agency_stages — solo super_admin
-- ============================================================
ALTER TABLE agency_stages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "super_admin can do all on agency_stages" ON agency_stages
  FOR ALL USING (is_super_admin());

-- ============================================================
-- agency_webhook_tokens — solo super_admin
-- ============================================================
ALTER TABLE agency_webhook_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "super_admin can do all on agency_webhook_tokens" ON agency_webhook_tokens
  FOR ALL USING (is_super_admin());

-- ============================================================
-- admin_audit_log — solo super_admin
-- ============================================================
ALTER TABLE admin_audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "super_admin can do all on admin_audit_log" ON admin_audit_log
  FOR ALL USING (is_super_admin());

-- ============================================================
-- agency_leads — solo super_admin
-- ============================================================
ALTER TABLE agency_leads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "super_admin can do all on agency_leads" ON agency_leads
  FOR ALL USING (is_super_admin());

-- ============================================================
-- agency_lead_activities — solo super_admin
-- ============================================================
ALTER TABLE agency_lead_activities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "super_admin can do all on agency_lead_activities" ON agency_lead_activities
  FOR ALL USING (is_super_admin());

-- ============================================================
-- agency_tasks — solo super_admin
-- ============================================================
ALTER TABLE agency_tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "super_admin can do all on agency_tasks" ON agency_tasks
  FOR ALL USING (is_super_admin());

-- ============================================================
-- task_comments — super_admin total, company members por su empresa
-- ============================================================
ALTER TABLE task_comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "super_admin can do all on task_comments" ON task_comments
  FOR ALL USING (is_super_admin());

CREATE POLICY "company members can manage task_comments" ON task_comments
  FOR ALL USING (
    task_id IN (
      SELECT id FROM tasks WHERE company_id = get_my_company_id()
    )
  );

-- ============================================================
-- agency_task_comments — solo super_admin
-- ============================================================
ALTER TABLE agency_task_comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "super_admin can do all on agency_task_comments" ON agency_task_comments
  FOR ALL USING (is_super_admin());
