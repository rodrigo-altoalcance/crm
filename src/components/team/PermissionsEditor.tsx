"use client"

import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import type { UserPermissions } from "@/types/database"

interface PermissionsEditorProps {
  value: UserPermissions
  onChange: (value: UserPermissions) => void
}

const permissionFields: { key: keyof UserPermissions; label: string; description?: string }[] = [
  { key: "can_view_all_leads", label: "Ver todos los leads", description: "Puede ver leads asignados a otros" },
  { key: "can_create_leads", label: "Crear leads" },
  { key: "can_edit_leads", label: "Editar leads" },
  { key: "can_delete_leads", label: "Eliminar leads" },
  { key: "can_close_leads", label: "Cerrar leads", description: "Puede mover leads a etapas finales" },
  { key: "can_view_reports", label: "Ver reportes" },
  { key: "can_manage_stages", label: "Gestionar etapas", description: "Puede crear y editar etapas del pipeline" },
]

export function PermissionsEditor({ value, onChange }: PermissionsEditorProps) {
  function toggle(key: keyof UserPermissions) {
    onChange({ ...value, [key]: !value[key] })
  }

  return (
    <div className="space-y-3">
      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Permisos</p>
      <div className="grid grid-cols-1 gap-2.5">
        {permissionFields.map(({ key, label, description }) => (
          <div key={key} className="flex items-start gap-3">
            <Checkbox
              id={`perm-${key}`}
              checked={value[key]}
              onCheckedChange={() => toggle(key)}
              className="mt-0.5"
            />
            <div className="flex-1">
              <Label
                htmlFor={`perm-${key}`}
                className="text-sm font-medium text-slate-700 cursor-pointer"
              >
                {label}
              </Label>
              {description && (
                <p className="text-xs text-slate-400 mt-0.5">{description}</p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
