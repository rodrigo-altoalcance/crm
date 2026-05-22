import type { Profile, UserPermissions } from "@/types/database"

export function isSuperAdmin(profile: Profile | null): boolean {
  return profile?.role === "super_admin"
}

export function isCompanyAdmin(profile: Profile | null): boolean {
  return profile?.role === "company_admin"
}

export function isSeller(profile: Profile | null): boolean {
  return profile?.role === "seller"
}

export function canCloseLead(profile: Profile | null): boolean {
  if (!profile) return false
  if (profile.role === "super_admin" || profile.role === "company_admin") return true
  return profile.permissions?.can_close_leads === true
}

export function canCreateLead(profile: Profile | null): boolean {
  if (!profile) return false
  if (profile.role === "super_admin" || profile.role === "company_admin") return true
  return profile.permissions?.can_create_leads === true
}

export function canEditLead(profile: Profile | null): boolean {
  if (!profile) return false
  if (profile.role === "super_admin" || profile.role === "company_admin") return true
  return profile.permissions?.can_edit_leads === true
}

export function canDeleteLead(profile: Profile | null): boolean {
  if (!profile) return false
  if (profile.role === "super_admin" || profile.role === "company_admin") return true
  return profile.permissions?.can_delete_leads === true
}

export function canViewAllLeads(profile: Profile | null): boolean {
  if (!profile) return false
  if (profile.role === "super_admin" || profile.role === "company_admin") return true
  return profile.permissions?.can_view_all_leads === true
}

export function getDefaultPermissions(): UserPermissions {
  return {
    can_view_all_leads: false,
    can_create_leads: true,
    can_edit_leads: true,
    can_delete_leads: false,
    can_close_leads: false,
    can_view_reports: false,
    can_manage_stages: false,
  }
}
