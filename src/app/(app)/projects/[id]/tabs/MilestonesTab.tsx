"use client";

import { useState } from "react";
import { formatDate, isOverdue, getStatusLabel } from "@/lib/utils";
import {
  Plus, CheckCircle2, Circle, Clock, ChevronDown, ChevronRight,
  User, Calendar, Trash2,
} from "lucide-react";

interface Owner { id: string; name: string; }
interface Task { id: string; name: string; description?: string | null; status: string; dueDate: Date; owner?: Owner | null; order: number; }
interface Milestone { id: string; name: string; description?: string | null; status: string; dueDate: Date; order: number; tasks: Task[]; }
interface UserItem { id: string; name: string; email: string; role: string; }

const TASK_STATUS_ICONS: Record<string, React.ReactNode> = {
  TODO: <Circle className="w-4 h-4 text-gray-400" />,
  IN_PROGRESS: <Clock className="w-4 h-4 text-blue-500" />,
  DONE: <CheckCircle2 className="w-4 h-4 text-green-500" />,
};

const MILESTONE_STATUS_STYLES: Record<string, string> = {
  TODO: "bg-gray-100 text-gray-600",
  IN_PROGRESS: "bg-blue-100 text-blue-700",
  DONE: "bg-green-100 text-green-700",
};

interface Props {
  projectId: string;
  milestones: Milestone[];
  setMilestones: React.Dispatch<React.SetStateAction<Milestone[]>>;
  users: UserItem[];
  currentUserRole: string;
  onTaskClick: (taskId: string) => void;
}

export function MilestonesTab({ projectId, milestones, setMilestones, users, currentUserRole, onTaskClick }: Props) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set(milestones.map((m) => m.id)));
  const [showAddMilestone, setShowAddMilestone] = useState(false);
  const [showAddTask, setShowAddTask] = useState<string | null>(null);
  const [milestoneForm, setMilestoneForm] = useState({ name: "", description: "", dueDate: "" });
  const [taskForm, setTaskForm] = useState({ name: "", description: "", dueDate: "", ownerId: "" });
  const [saving, setSaving] = useState(false);
  const canEdit = currentUserRole !== "MEMBER";

  function toggleExpand(id: string) {
    setExpanded((prev) => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  }

  async function updateTaskStatus(taskId: string, milestoneId: string, newStatus: string) {
    const res = await fetch(`/api/tasks/${taskId}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: newStatus }),
    });
    if (res.ok) {
      setMilestones((prev) => prev.map((m) => {
        if (m.id !== milestoneId) return m;
        const tasks = m.tasks.map((t) => t.id === taskId ? { ...t, status: newStatus } : t);
        const allDone = tasks.every((t) => t.status === "DONE");
        return { ...m, tasks, status: allDone ? "DONE" : newStatus === "TODO" ? "TODO" : "IN_PROGRESS" };
      }));
    }
  }

  async function addMilestone(e: React.FormEvent) {
    e.preventDefault(); setSaving(true);
    const res = await fetch(`/api/projects/${projectId}/milestones`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify(milestoneForm),
    });
    if (res.ok) {
      const m = await res.json();
      setMilestones((prev) => [...prev, { ...m, tasks: [] }]);
      setExpanded((prev) => new Set([...prev, m.id]));
      setMilestoneForm({ name: "", description: "", dueDate: "" });
      setShowAddMilestone(false);
    }
    setSaving(false);
  }

  async function addTask(e: React.FormEvent, milestoneId: string) {
    e.preventDefault(); setSaving(true);
    const res = await fetch(`/api/milestones/${milestoneId}/tasks`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...taskForm, ownerId: taskForm.ownerId || undefined }),
    });
    if (res.ok) {
      const task = await res.json();
      setMilestones((prev) => prev.map((m) => m.id === milestoneId ? { ...m, tasks: [...m.tasks, task] } : m));
      setTaskForm({ name: "", description: "", dueDate: "", ownerId: "" });
      setShowAddTask(null);
    }
    setSaving(false);
  }

  async function deleteTask(taskId: string, milestoneId: string) {
    if (!confirm("Supprimer cette tâche ?")) return;
    const res = await fetch(`/api/tasks/${taskId}`, { method: "DELETE" });
    if (res.ok) setMilestones((prev) => prev.map((m) => m.id === milestoneId ? { ...m, tasks: m.tasks.filter((t) => t.id !== taskId) } : m));
  }

  return (
    <div className="p-6 space-y-4">
      {milestones.map((milestone) => {
        const mDone = milestone.tasks.filter((t) => t.status === "DONE").length;
        const mProgress = milestone.tasks.length > 0 ? Math.round((mDone / milestone.tasks.length) * 100) : 0;
        const mOverdue = isOverdue(milestone.dueDate) && milestone.status !== "DONE";
        const isExpanded = expanded.has(milestone.id);

        return (
          <div key={milestone.id} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="flex items-center gap-3 p-4 cursor-pointer hover:bg-gray-50" onClick={() => toggleExpand(milestone.id)}>
              {isExpanded ? <ChevronDown className="w-4 h-4 text-gray-400" /> : <ChevronRight className="w-4 h-4 text-gray-400" />}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold text-gray-900 text-sm">{milestone.name}</h3>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${MILESTONE_STATUS_STYLES[milestone.status]}`}>
                    {getStatusLabel(milestone.status)}
                  </span>
                  {mOverdue && <span className="flex items-center gap-1 text-xs text-red-500"><Clock className="w-3 h-3" />En retard</span>}
                </div>
                <div className="flex items-center gap-3 mt-0.5 text-xs text-gray-400">
                  <span>Échéance: {formatDate(milestone.dueDate)}</span>
                  <span>{mDone}/{milestone.tasks.length} tâches</span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-20 bg-gray-100 rounded-full h-1.5">
                  <div className={`h-1.5 rounded-full ${mProgress === 100 ? "bg-green-500" : "bg-blue-500"}`} style={{ width: `${mProgress}%` }} />
                </div>
                <span className="text-xs text-gray-500 w-8 text-right">{mProgress}%</span>
              </div>
            </div>

            {isExpanded && (
              <div className="border-t border-gray-100">
                {milestone.tasks.length === 0 && (
                  <p className="text-sm text-gray-400 text-center py-4">Aucune tâche</p>
                )}
                {milestone.tasks.map((task) => {
                  const taskOverdue = isOverdue(task.dueDate) && task.status !== "DONE";
                  return (
                    <div key={task.id}
                      className={`flex items-center gap-3 px-5 py-2.5 border-b border-gray-50 last:border-0 hover:bg-gray-50 transition-colors ${task.status === "DONE" ? "opacity-60" : ""}`}>
                      <button onClick={() => updateTaskStatus(task.id, milestone.id,
                        task.status === "DONE" ? "TODO" : task.status === "TODO" ? "IN_PROGRESS" : "DONE"
                      )} className="flex-shrink-0">
                        {TASK_STATUS_ICONS[task.status]}
                      </button>
                      <button className="flex-1 min-w-0 text-left" onClick={() => onTaskClick(task.id)}>
                        <span className={`text-sm font-medium ${task.status === "DONE" ? "line-through text-gray-400" : "text-gray-900 hover:text-blue-600"}`}>
                          {task.name}
                        </span>
                      </button>
                      <div className="flex items-center gap-3 text-xs text-gray-400">
                        {task.owner && <span className="flex items-center gap-1"><User className="w-3 h-3" />{task.owner.name}</span>}
                        <span className={`flex items-center gap-1 ${taskOverdue ? "text-red-500" : ""}`}>
                          <Calendar className="w-3 h-3" />{formatDate(task.dueDate)}
                        </span>
                        {canEdit && (
                          <button onClick={() => deleteTask(task.id, milestone.id)} className="text-gray-300 hover:text-red-400">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}

                {canEdit && (
                  <div className="px-5 py-2.5">
                    {showAddTask === milestone.id ? (
                      <form onSubmit={(e) => addTask(e, milestone.id)} className="flex gap-2 flex-wrap">
                        <input required autoFocus value={taskForm.name} onChange={(e) => setTaskForm({ ...taskForm, name: e.target.value })}
                          placeholder="Nom de la tâche" className="flex-1 min-w-40 px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                        <input type="date" required value={taskForm.dueDate} onChange={(e) => setTaskForm({ ...taskForm, dueDate: e.target.value })}
                          className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                        <select value={taskForm.ownerId} onChange={(e) => setTaskForm({ ...taskForm, ownerId: e.target.value })}
                          className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                          <option value="">Pas d'assigné</option>
                          {users.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
                        </select>
                        <button type="submit" disabled={saving} className="px-3 py-1.5 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 disabled:opacity-60">Ajouter</button>
                        <button type="button" onClick={() => setShowAddTask(null)} className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm hover:bg-gray-50">Annuler</button>
                      </form>
                    ) : (
                      <button onClick={() => setShowAddTask(milestone.id)} className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-blue-600 transition-colors">
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

      {canEdit && (
        showAddMilestone ? (
          <form onSubmit={addMilestone} className="bg-white rounded-xl border border-blue-200 p-4 space-y-3">
            <h4 className="font-medium text-gray-900 text-sm">Nouvelle milestone</h4>
            <div className="flex gap-3">
              <input required autoFocus value={milestoneForm.name} onChange={(e) => setMilestoneForm({ ...milestoneForm, name: e.target.value })}
                placeholder="Nom de la milestone" className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              <input type="date" required value={milestoneForm.dueDate} onChange={(e) => setMilestoneForm({ ...milestoneForm, dueDate: e.target.value })}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div className="flex gap-2">
              <button type="submit" disabled={saving} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 disabled:opacity-60">Créer</button>
              <button type="button" onClick={() => setShowAddMilestone(false)} className="px-4 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50">Annuler</button>
            </div>
          </form>
        ) : (
          <button onClick={() => setShowAddMilestone(true)}
            className="flex items-center gap-2 text-sm text-gray-400 hover:text-blue-600 border border-dashed border-gray-200 hover:border-blue-300 rounded-xl px-4 py-3 w-full transition-colors">
            <Plus className="w-4 h-4" /> Ajouter une milestone
          </button>
        )
      )}
    </div>
  );
}
