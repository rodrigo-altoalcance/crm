-- Migración 008: Campos personalizados de lead por empresa o agencia

CREATE TABLE custom_lead_fields (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  context TEXT NOT NULL CHECK (context IN ('agency', 'company')),
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  nombre TEXT NOT NULL,
  tipo TEXT NOT NULL CHECK (tipo IN ('texto', 'numero', 'fecha')),
  obligatorio BOOLEAN NOT NULL DEFAULT false,
  orden INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT chk_company_id_by_context CHECK (
    (context = 'company' AND company_id IS NOT NULL) OR
    (context = 'agency' AND company_id IS NULL)
  )
);

-- lead_id es UUID sin FK explícita porque puede referenciar leads o agency_leads
CREATE TABLE custom_lead_field_values (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  field_id UUID NOT NULL REFERENCES custom_lead_fields(id) ON DELETE CASCADE,
  lead_id UUID NOT NULL,
  valor TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_custom_lead_fields_context ON custom_lead_fields(context);
CREATE INDEX idx_custom_lead_fields_company_id ON custom_lead_fields(company_id) WHERE company_id IS NOT NULL;
CREATE INDEX idx_custom_lead_field_values_lead_id ON custom_lead_field_values(lead_id);
CREATE INDEX idx_custom_lead_field_values_field_id ON custom_lead_field_values(field_id);

ALTER TABLE custom_lead_fields ENABLE ROW LEVEL SECURITY;
ALTER TABLE custom_lead_field_values ENABLE ROW LEVEL SECURITY;

CREATE POLICY "super_admin_clf_all" ON custom_lead_fields
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'super_admin')
  );

CREATE POLICY "super_admin_clfv_all" ON custom_lead_field_values
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'super_admin')
  );

CREATE POLICY "company_user_clf" ON custom_lead_fields
  FOR ALL USING (
    context = 'company' AND
    company_id IN (
      SELECT company_id FROM profiles
      WHERE id = auth.uid() AND role IN ('company_admin', 'seller')
    )
  );

CREATE POLICY "company_user_clfv" ON custom_lead_field_values
  FOR ALL USING (
    field_id IN (
      SELECT clf.id FROM custom_lead_fields clf
      JOIN profiles p ON p.id = auth.uid()
      WHERE clf.context = 'company'
        AND clf.company_id = p.company_id
        AND p.role IN ('company_admin', 'seller')
    )
  );
