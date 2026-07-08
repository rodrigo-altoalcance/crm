-- ============================================================
-- Migration 015: leads.source como texto libre
-- El webhook de leads (empresa) ya no restringe "origen" a un
-- whitelist de 3 valores fijos (meta, calendly, manual). El campo
-- se normaliza en la app (trim + lowercase) antes de insertar.
-- ============================================================

ALTER TABLE public.leads DROP CONSTRAINT leads_source_check;

-- Nota: agency_leads.source nunca tuvo CHECK constraint en BD.
-- El webhook de agencia (src/app/api/webhook/agency/[token]/route.ts)
-- todavía tiene el mismo whitelist a nivel de código — pendiente,
-- fix aparte.
