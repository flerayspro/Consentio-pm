"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { formatDate, isOverdue, getStatusLabel } from "@/lib/utils";
import {
  ChevronLeft, BarChart2, Plus, CheckCircle2, Circle,
  Clock, ChevronDown, ChevronRight, User, Calendar, Trash2,
} from "lucide-react";

interface Owner { id: string; name: string; }
interface Task {
  id: string; name: string; description?: string | null;
  status: string; dueDate: Date; owner?: Owner | null; order: number;
}
interface Milestone {
  id: string; name: string; description?: string | null;
  status: string; dueDate: Date; order: number; tasks: Task[];
}
interface Project {
  id: string; name: string; description?: string | null;
  status: string; startDate: Date; endDate: Date;
  manager: { id: string; name: string; email: string };
  template?: { id: string; name: string } | null;
  milestones: Milestone[];
}
interface User { id: string; name: string; email: string; role: string; }

const TASK_STATUS_STYLES: Record<string, string> = {
  TODO: "text-gray-400",
  IN_PROGRESS: "text-blue-500",
  DONE: "text-green-500",
};

const MILESTONE_STATUS_STYLES: Record<string, string> = {
  TODO: "bg-gray-100 text-gray-600",
  IN_PROGRESS: "bg-blue-100 text-blue-700",
  DONE: "bg-green-100 text-green-700",
};

export function ProjectDetailClient({
  project, users, currentUserRole, currentUserId,
}: {
  project: Project; users: User[]; currentUserRole: string; currentUserId: string;
}) {
  const router = useRouter();
  const [milestones, setMilestones] = useState(project.milestones);
  const [expandedMilestones, setExpandedMilestones] = useState<Set<string>>(
    new Set(project.milestones.map((m) => m.id))
  );
  const [showAddMilestone, setShowAddMilestone] = useState(false);
  const [showAddTask, setShowAddTask] = useState<string | null>(null);
  const [milestoneForm, setMilestoneForm] = useState({ name: "", description: "", dueDate: "" });
  const [taskForm, setTaskForm] = useState({ name: "", description: "", dueDate: "", ownerId: "" });
  const [saving, setSaving] = useState(false);

  const canEdit = currentUserRole !== "MEMBER";
  const isManager = project.manager.id === currentUserId || currentUserRole === "ADMIN";

  const allTasks = milestones.flatMap((m) => m.tasks);
  const doneTasks = allTasks.filter((t) => t.status === "DONE").length;
  const progress = allTasks.length > 0 ? Math.round((doneTasks / allTasks.length) * 100) : 0;

  function toggleMilestone(id: string) {
    setExpandedMilestones((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  async function updateTaskStatus(taskId: string, milestoneId: string, newStatus: string) {
    const res = await fetch(`/api/tasks/${taskId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: newStatus }),
    });
    if (res.ok) {
      const updatedTask = await res.json();
      setMilestones((prev) =>
        prev.map((m) => {
          if (m.id !== milestoneId) return m;
          const updatedTasks = m.tasks.map((t) => (t.id === taskId ? { ...t, ...updatedTask } : t));
          const allDone = updatedTasks.every((t) => t.status === "DONE");
          return { ...m, tasks: updatedTasks, status: allDone ? "DONE" : newStatus === "TODO" ? "TODO" : "IN_PROGRESS" };
        })
      );
    }
  }

  async function addMilestone(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const res = await fetch(`/api/projects/${project.id}/milestones`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(milestoneForm),
    });
    if (res.ok) {
      const m = await res.json();
      setMilestones((prev) => [...prev, { ...m, tasks: [] }]);
      setExpandedMilestones((prev) => new Set([...prev, m.id]));
      setMilestoneForm({ name: "", description: "", dueDate: "" });
      setShowAddMilestone(false);
    }
    setSaving(false);
  }

  async function addTask(e: React.FormEvent, milestoneId: string) {
    e.preventDefault();
    setSaving(true);
    const res = await fetch(`/api/milestones/${milestoneId}/tasks`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...taskForm, ownerId: taskForm.ownerId || undefined }),
    });
    if (res.ok) {
      const task = await res.json();
      setMilestones((prev) =>
        prev.map((m) => (m.id === milestoneId ? { ...m, tasks: [...m.tasks, task] } : m))
      );
      setTaskForm({ name: "", description: "", dueDate: "", ownerId: "" });
      setShowAddTask(null);
    }
    setSaving(false);
  }

  async function deleteTask(taskId: string, milestoneId: string) {
    if (!confirm("Supprimer cette tâche ?")) return;
    const res = await fetch(`/api/tasks/${taskId}`, { method: "DELETE" });
    if (res.ok) {
      setMilestones((prev) =>
        prev.map((m) =>
          m.id === milestoneId ? { ...m, tasks: m.tasks.filter((t) => t.id !== taskId) } : m
        )
      );
    }
  }

  return (
    <div className="p-8 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div className="flex items-start gap-4">
          <Link
            href="/projects"
            className="mt-1 p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
          >
            <ChevronLeft className="w-5 h-5" />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold text-gray-900">{project.name}</h1>
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${MILESTONE_STATUS_STYLES[project.status] || "bg-gray-100 text-gray-600"}`}>
                {getStatusLabel(project.status)}
              </span>
            </div>
            {project.description && (
              <p className="text-gray-500 mt-1">{project.description}</p>
            )}
            <div className="flex items-center gap-4 mt-2 text-sm text-gray-400">
              <span className="flex items-center gap-1">
                <User className="w-3.5 h-3.5" /> {project.manager.name}
              </span>
              <span className="flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5" />
                {formatDate(project.startDate)} → {formatDate(project.endDate)}
              </span>
              {project.template && (
                <span className="text-blue-500">Template: {project.template.name}</span>
              )}
            </div>
          </div>
        </div>
        <Link
          href={`/projects/${project.id}/gantt`}
          className="flex items-center gap-2 border border-gray-200 hover:border-blue-300 text-gray-600 hover:text-blue-700 px-3 py-2 rounded-lg text-sm font-medium transition-colors"
        >
          <BarChart2 className="w-4 h-4" />
          Vue Gantt
        </Link>
      </div>

      {/* Progress bar */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 mb-6">
        <div className="flex justify-between text-sm mb-2">
          <span className="text-gray-500">Progression globale</span>
          <span className="font-semibold text-gray-900">{doneTasks}/{allTasks.length} tâches • {progress}%</span>
        </div>
        <div className="w-full bg-gray-100 rounded-full h-2">
          <div
            className={`h-2 rounded-full transition-all ${progress === 100 ? "bg-green-500" : "bg-blue-500"}`}
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Milestones */}
      <div className="space-y-4">
        {milestones.map((milestone) => {
          const mDone = milestone.tasks.filter((t) => t.status === "DONE").length;
          const mProgress = milestone.tasks.length > 0
            ? Math.round((mDone / milestone.tasks.length) * 100) : 0;
          const mOverdue = isOverdue(milestone.dueDate) && milestone.status !== "DONE";
          const expanded = expandedMilestones.has(milestone.id);

          return (
            <div key={milestone.id} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <div
                className="flex items-center gap-3 p-4 cursor-pointer hover:bg-gray-50 transition-colors"
                onClick={() => toggleMilestone(milestone.id)}
              >
                {expanded ? (
                  <ChevronDown className="w-4 h-4 text-gray-400 flex-shrink-0" />
                ) : (
                  <ChevronRight className="w-4 h-4 text-gray-400 flex-shrink-0" />
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-gray-900">{milestone.name}</h3>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${MILESTONE_STATUS_STYLES[milestone.status]}`}>
                      {getStatusLabel(milestone.status)}
                    </span>
                    {mOverdue && (
                      <span className="flex items-center gap-1 text-xs text-red-600">
                        <Clock className="w-3 h-3" /> En retard
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 mt-1">
                    <span className="text-xs text-gray-400">
                      Échéance: {formatDate(milestone.dueDate)}
                    </span>
                    <span className="text-xs text-gray-400">
                      {mDone}/{milestone.tasks.length} tâches
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-24 bg-gray-100 rounded-full h-1.5">
                    <div
                      className={`h-1.5 rounded-full ${mProgress === 100 ? "bg-green-500" : "bg-blue-500"}`}
                      style={{ width: `${mProgress}%` }}
                    />
                  </div>
                  <span className="text-xs font-medium text-gray-600 w-8 text-right">{mProgress}%</span>
                </div>
              </div>

              {expanded && (
                <div className="border-t border-gray-100">
                  {milestone.tasks.length === 0 && (
                    <p className="text-sm text-gray-400 text-center py-6">
                      Aucune tâche dans cette milestone
                    </p>
                  )}
                  {milestone.tasks.map((task) => {
                    const taskOverdue = isOverdue(task.dueDate) && task.status !== "DONE";
                    return (
                      <div
                        key={task.id}
                        className={`flex items-center gap-3 px-6 py-3 border-b border-gray-50 last:border-0 hover:bg-gray-50 transition-colors ${task.status === "DONE" ? "opacity-60" : ""}`}
                      >
                        <button
                          onClick={() =>
                            updateTaskStatus(
                              task.id,
                              milestone.id,
                              task.status === "DONE" ? "TODO" : task.status === "TODO" ? "IN_PROGRESS" : "DONE"
                            )
                          }
                          className={`flex-shrink-0 transition-colors ${TASK_STATUS_STYLES[task.status]}`}
                          title="Changer le statut"
                        >
                          {task.status === "DONE" ? (
                            <CheckCircle2 className="w-5 h-5" />
                          ) : task.status === "IN_PROGRESS" ? (
                            <Clock className="w-5 h-5" />
                          ) : (
                            <Circle className="w-5 h-5" />
                          )}
                        </button>

                        <div className="flex-1 min-w-0">
                          <span className={`text-sm font-medium ${task.status === "DONE" ? "line-through text-gray-400" : "text-gray-900"}`}>
                            {task.name}
                          </span>
                          {task.description && (
                            <p className="text-xs text-gray-400 truncate">{task.description}</p>
                          )}
                        </div>

                        <div className="flex items-center gap-4 text-xs text-gray-400">
                          {task.owner && (
                            <span className="flex items-center gap-1">
                              <User className="w-3 h-3" /> {task.owner.name}
                            </span>
                          )}
                          <span className={`flex items-center gap-1 ${taskOverdue ? "text-red-500" : ""}`}>
                            <Calendar className="w-3 h-3" /> {formatDate(task.dueDate)}
                          </span>
                          <span className={`px-2 py-0.5 rounded-full text-xs ${MILESTONE_STATUS_STYLES[task.status]}`}>
                            {getStatusLabel(task.status)}
                          </span>
                          {canEdit && (
                            <button
                              onClick={() => deleteTask(task.id, milestone.id)}
                              className="text-gray-300 hover:text-red-400 transition-colors"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}

                  {/* Add task */}
                  {canEdit && (
                    <div className="px-6 py-3">
                      {showAddTask === milestone.id ? (
                        <form onSubmit={(e) => addTask(e, milestone.id)} className="flex gap-2 flex-wrap">
                          <input
                            required autoFocus value={taskForm.name}
                            onChange={(e) => setTaskForm({ ...taskForm, name: e.target.value })}
                            placeholder="Nom de la tâche"
                            className="flex-1 min-w-40 px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                          <input
                            type="date" required value={taskForm.dueDate}
                            onChange={(e) => setTaskForm({ ...taskForm, dueDate: e.target.value })}
                            className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                          <select
                            value={taskForm.ownerId}
                            onChange={(e) => setTaskForm({ ...taskForm, ownerId: e.target.value })}
                            className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                          >
                            <option value="">Pas d'assigné</option>
                            {users.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
                          </select>
                          <button
                            type="submit" disabled={saving}
                            className="px-3 py-1.5 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 disabled:opacity-60 transition-colors"
                          >
                            Ajouter
                          </button>
                          <button
                            type="button"
                            onClick={() => setShowAddTask(null)}
                            className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm hover:bg-gray-50 transition-colors"
                          >
                            Annuler
                          </button>
                        </form>
                      ) : (
                        <button
                          onClick={() => setShowAddTask(milestone.id)}
                          className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-blue-600 transition-colors"
                        >
                          <Plus className="w-3.5 h-3.5" /> Ajouter une tâche
                        </button>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}

        {/* Add milestone */}
        {canEdit && (
          <div>
            {showAddMilestone ? (
              <form onSubmit={addMilestone} className="bg-white rounded-xl border border-blue-200 p-4 space-y-3">
                <h4 className="font-medium text-gray-900 text-sm">Nouvelle milestone</h4>
                <div className="flex gap-3">
                  <input
                    required autoFocus value={milestoneForm.name}
                    onChange={(e) => setMilestoneForm({ ...milestoneForm, name: e.target.value })}
                    placeholder="Nom de la milestone"
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <input
                    type="date" required value={milestoneForm.dueDate}
                    onChange={(e) => setMilestoneForm({ ...milestoneForm, dueDate: e.target.value })}
                    className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div className="flex gap-2">
                  <button
                    type="submit" disabled={saving}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 disabled:opacity-60 transition-colors"
                  >
                    Créer la milestone
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowAddMilestone(false)}
                    className="px-4 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50 transition-colors"
                  >
                    Annuler
                  </button>
                </div>
              </form>
            ) : (
              <button
                onClick={() => setShowAddMilestone(true)}
                className="flex items-center gap-2 text-sm text-gray-400 hover:text-blue-600 border border-dashed border-gray-200 hover:border-blue-300 rounded-xl px-4 py-3 w-full transition-colors"
              >
                <Plus className="w-4 h-4" /> Ajouter une milestone
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
