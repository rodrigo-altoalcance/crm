export type Role = "super_admin" | "company_admin" | "seller"
export type LeadSource = "meta" | "calendly" | "manual"
export type TaskPriority = "low" | "medium" | "high"
export type TaskStatus = "pending" | "in_progress" | "completed"
export type CompanyStatus = "active" | "inactive" | "trial"
export type Currency = "CLP" | "USD"
export type RecordType = "note" | "meeting" | "agreement" | "other"

export interface Company {
  id: string
  name: string
  logo_url: string | null
  email: string | null
  phone: string | null
  address: string | null
  website: string | null
  monthly_fee: number | null
  currency: Currency
  next_payment_date: string | null
  payment_day: number | null
  max_users: number
  status: CompanyStatus
  org_name: string | null
  org_email: string | null
  org_phone: string | null
  org_website: string | null
  created_at: string
}

export interface Payment {
  id: string
  company_id: string
  amount: number
  currency: Currency
  paid_at: string
  notes: string | null
  recorded_by: string
  created_at: string
}

export interface UserPermissions {
  can_view_all_leads: boolean
  can_create_leads: boolean
  can_edit_leads: boolean
  can_delete_leads: boolean
  can_close_leads: boolean
  can_view_reports: boolean
  can_manage_stages: boolean
}

export interface Profile {
  id: string
  company_id: string | null
  role: Role
  full_name: string
  phone: string | null
  avatar_url: string | null
  permissions: UserPermissions
  created_at: string
}

export interface LeadStage {
  id: string
  company_id: string
  name: string
  color: string
  position: number
  is_final: boolean
  is_lost: boolean
}

export interface Lead {
  id: string
  company_id: string
  stage_id: string
  first_name: string
  last_name: string
  email: string
  phone: string | null
  message: string | null
  source: LeadSource
  assigned_to: string | null
  notes: string | null
  custom_fields: Record<string, string>
  scheduled_at: string | null
  created_at: string
  updated_at: string
  stage?: LeadStage
  assigned_profile?: Profile
}

export interface LeadActivity {
  id: string
  lead_id: string
  user_id: string
  type: string
  description: string
  metadata: Record<string, unknown>
  created_at: string
  profile?: Profile
}

export interface Task {
  id: string
  company_id: string
  lead_id: string | null
  title: string
  description: string | null
  assigned_to: string | null
  due_date: string | null
  priority: TaskPriority
  status: TaskStatus
  created_by: string
  created_at: string
  google_calendar_event_id?: string | null
  lead?: Lead
  assigned_profile?: Profile
}

export interface UserGoogleCalendarToken {
  id: string
  user_id: string
  access_token: string
  refresh_token: string
  token_expiry: string
  calendar_id: string
  calendar_name: string | null
  google_email: string | null
  connected_at: string
  updated_at: string
}

export interface WebhookToken {
  id: string
  company_id: string
  token: string
  name: string
  field_mapping: Record<string, string>
  created_at: string
}

export interface LeadFieldDefinition {
  id: string
  company_id: string
  name: string
  label: string
  type: "text" | "number" | "date" | "select"
  options: string[] | null
  required: boolean
  position: number
}

export interface ClientRecord {
  id: string
  lead_id: string
  company_id: string
  created_by: string
  title: string
  description: string | null
  type: RecordType
  record_date: string | null
  created_at: string
  profile?: Profile
}

export interface EmailTemplate {
  id: string
  name: string
  subject: string
  body_html: string
  type: string
  is_default: boolean
  created_at: string
}

export interface CrmSetting {
  key: string
  value: string
  updated_at: string
}

export interface AgencyStage {
  id: string
  name: string
  color: string
  position: number
  is_final: boolean
  is_lost: boolean
  created_at: string
}

export interface AgencyWebhookToken {
  id: string
  token: string
  name: string
  field_mapping: Record<string, string>
  created_at: string
}

export interface AdminAuditLog {
  id: string
  user_id: string | null
  user_name: string | null
  action: string
  section: string
  details: Record<string, unknown> | null
  created_at: string
}

export interface TaskComment {
  id: string
  task_id: string
  user_id: string | null
  text: string
  created_at: string
  profile?: Pick<Profile, "full_name" | "avatar_url">
}

export interface UserLeadColumnPreference {
  id: string
  user_id: string
  context: "agency" | "company"
  company_id: string | null
  column_key: string
  visible: boolean
  created_at: string
}

export type CustomLeadFieldType = "texto" | "numero" | "fecha"
export type CustomLeadFieldContext = "agency" | "company"

export interface CustomLeadField {
  id: string
  context: CustomLeadFieldContext
  company_id: string | null
  nombre: string
  tipo: CustomLeadFieldType
  obligatorio: boolean
  orden: number
  created_at: string
}

export interface CustomLeadFieldValue {
  id: string
  field_id: string
  lead_id: string
  valor: string | null
  created_at: string
}

export interface AgencyLead {
  id: string
  stage_id: string | null
  first_name: string | null
  last_name: string | null
  email: string | null
  phone: string | null
  source: string | null
  message: string | null
  custom_fields: Record<string, string>
  scheduled_at: string | null
  created_at: string
}

export type NotificationType = "task_assigned" | "task_due"

export interface Notification {
  id: string
  user_id: string
  type: NotificationType
  title: string
  body: string | null
  related_task_id: string | null
  read_at: string | null
  created_at: string
}
