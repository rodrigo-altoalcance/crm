"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { TaskCard } from "./TaskCard"
import { TaskForm } from "./TaskForm"
import { EmptyState } from "@/components/shared/EmptyState"
import { CheckSquare } from "lucide-react"
import type { Task, Profile } from "@/types/database"

interface TasksViewProps {
  tasks: Task[]
  teamMembers: Profile[]
  companyId: string
}

export function TasksView({ tasks, teamMembers, companyId }: TasksViewProps) {
  const router = useRouter()
  const [dialogOpen, setDialogOpen] = useState(false)

  const pending = tasks.filter((t) => t.status === "pending")
  const inProgress = tasks.filter((t) => t.status === "in_progress")
  const completed = tasks.filter((t) => t.status === "completed")

  function handleSuccess() {
    setDialogOpen(false)
    router.refresh()
  }

  return (
    <>
      <div className="flex justify-end mb-4">
        <Button onClick={() => setDialogOpen(true)}>
          <Plus className="w-4 h-4 mr-1" /> Nueva tarea
        </Button>
      </div>

      <Tabs defaultValue="pending">
        <TabsList className="mb-4">
          <TabsTrigger value="pending">
            Pendientes{" "}
            {pending.length > 0 && (
              <span className="ml-1.5 bg-slate-200 text-slate-700 rounded-full text-xs px-1.5 py-0.5">
                {pending.length}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="in_progress">
            En progreso{" "}
            {inProgress.length > 0 && (
              <span className="ml-1.5 bg-slate-200 text-slate-700 rounded-full text-xs px-1.5 py-0.5">
                {inProgress.length}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="completed">
            Completadas{" "}
            {completed.length > 0 && (
              <span className="ml-1.5 bg-slate-200 text-slate-700 rounded-full text-xs px-1.5 py-0.5">
                {completed.length}
              </span>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="pending">
          <TaskList tasks={pending} emptyMessage="No hay tareas pendientes" />
        </TabsContent>
        <TabsContent value="in_progress">
          <TaskList tasks={inProgress} emptyMessage="No hay tareas en progreso" />
        </TabsContent>
        <TabsContent value="completed">
          <TaskList tasks={completed} emptyMessage="No hay tareas completadas" />
        </TabsContent>
      </Tabs>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Nueva tarea</DialogTitle>
          </DialogHeader>
          <TaskForm
            teamMembers={teamMembers}
            companyId={companyId}
            onSuccess={handleSuccess}
          />
        </DialogContent>
      </Dialog>
    </>
  )
}

function TaskList({ tasks, emptyMessage }: { tasks: Task[]; emptyMessage: string }) {
  if (tasks.length === 0) {
    return (
      <EmptyState
        icon={<CheckSquare className="w-6 h-6" />}
        title={emptyMessage}
      />
    )
  }
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {tasks.map((task) => (
        <TaskCard key={task.id} task={task} />
      ))}
    </div>
  )
}
