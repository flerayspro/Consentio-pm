"use client";

import { useState } from "react";
import { formatDate } from "@/lib/utils";
import { Plus, CheckCircle2, Circle, Clock, ChevronDown, ChevronRight, User, Calendar, Trash2 } from "lucide-react";

interface WaveTask {
  id: string; name: string; description?: string | null; status: string;
  dueDate: Date; startDate?: Date | null;
  assignee?: { id: string; name: string } | null;
  order: number;
}
interface WaveMilestone {
  id: string; name: string; status: string; dueDate: Date; order: number; tasks: WaveTask[];
}
interface UserItem { id: string; name: string; email: string; role: string; }

const TASK_STATUS_ICONS: Record<string, React.ReactNode> = {
  TODO:        <Circle className="w-4 h-4 text-gray-400" />,
  IN_PROGRESS: <Clock className="w-4 h-4 text-yellow-500" />,
  DONE:        <CheckCircle2 className="w-4 h-4 text-emerald-500" />,
};

const MILESTONE_STATUS_STYLES: Record<string, string> = {
  TODO:        "bg-gray-100 text-gray-600",
  IN_PROGRESS: "bg-yellow-100 text-yellow-700",
  DONE:        "bg-emerald-100 text-emerald-700",
};

const MILESTONE_STATUS_LABELS: Record<string, string> = {
  TODO: "À faire", IN_PROGRESS: "En cours", DONE: "Terminée",
};

interface Props {
  waveId: string;
  milestones: WaveMilestone[];
  setMilestones: React.Dispatch<React.SetStateAction<WaveMilestone[]>>;
  users: UserItem[];
  currentUserRole: string;
  onTaskClick: (taskId: string) => void;
}

export function WaveMilestonesTab({ waveId, milestones, setMilestones, users, currentUserRole, onTaskClick }: Props) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set(milestones.map((m) => m.id)));
  const [showAddMilestone, setShowAddMilestone] = useState(false);
  const [showAddTask, setShowAddTask] = useState<string | null>(null);
  const [milestoneForm, setMilestoneForm] = useState({ name: "", dueDate: "" });
  const [taskForm, setTaskForm] = useState({ name: "", dueDate: "", assigneeId: "" });
  const [saving, setSaving] = useState(false);
  const canEdit = currentUserRole !== "MEMBER";

  function toggleExpand(id: string) {
    setExpanded((prev) => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  }

  async function updateTaskStatus(taskId: string, milestoneId: string, newStatus: string) {
    const res = await fetch(`/api/wave-tasks/${taskId}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: newStatus }),
    });
    if (res.ok) {
      setMilestones((prev) => prev.map((m) => {
        if (m.id !== milestoneId) return m;
        const tasks = m.tasks.map((t) => t.id === taskId ? { ...t, status: newStatus } : t);
        const allDone = tasks.every((t) => t.status === "DONE");
        const anyProgress = tasks.some((t) => t.status !== "TODO");
        return { ...m, tasks, status: allDone ? "DONE" : anyProgress ? "IN_PROGRESS" : "TODO" };
      }));
    }
  }

  async function addMilestone(e: React.FormEvent) {
    e.preventDefault(); setSaving(true);
    const res = await fetch(`/api/waves/${waveId}/milestones`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify(milestoneForm),
    });
    if (res.ok) {
      const m = await res.json();
      setMilestones((prev) => [...prev, { ...m, tasks: [] }]);
      setExpanded((prev) => new Set([...prev, m.id]));
      setMilestoneForm({ name: "", dueDate: "" });
      setShowAddMilestone(false);
    }
    setSaving(false);
  }

  async function addTask(e: React.FormEvent, milestoneId: string) {
    e.preventDefault(); setSaving(true);
    const res = await fetch(`/api/wave-milestones/${milestoneId}/tasks`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...taskForm, assigneeId: taskForm.assigneeId || undefined }),
    });
    if (res.ok) {
      const task = await res.json();
      setMilestones((prev) => prev.map((m) => m.id === milestoneId ? { ...m, tasks: [...m.tasks, task] } : m));
      setTaskForm({ name: "", dueDate: "", assigneeId: "" });
      setShowAddTask(null);
    }
    setSaving(false);
  }

  async function deleteTask(taskId: string, milestoneId: string) {
    if (!confirm("Supprimer cette tâche ?")) return;
    const res = await fetch(`/api/wave-tasks/${taskId}`, { method: "DELETE" });
    if (res.ok) setMilestones((prev) => prev.map((m) => m.id === milestoneId ? { ...m, tasks: m.tasks.filter((t) => t.id !== taskId) } : m));
  }

  return (
    <div className="p-6 space-y-4">
      {milestones.length === 0 && !showAddMilestone && (
        <div className="text-center py-16 text-gray-400">
          Aucune phase — <span className="text-emerald-600 cursor-pointer hover:underline" onClick={() => setShowAddMilestone(true)}>ajoutez-en une</span>.
        </div>
      )}

      {milestones.map((milestone) => {
        const mDone = milestone.tasks.filter((t) => t.status === "DONE").length;
        const mProgress = milestone.tasks.length > 0 ? Math.round((mDone / milestone.tasks.length) * 100) : 0;
        const isExpanded = expanded.has(milestone.id);

        return (
          <div key={milestone.id} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="flex items-center gap-3 p-4 cursor-pointer hover:bg-gray-50 transition-colors" onClick={() => toggleExpand(milestone.id)}>
              {isExpanded ? <ChevronDown className="w-4 h-4 text-gray-400" /> : <ChevronRight className="w-4 h-4 text-gray-400" />}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold text-gray-900 text-sm">{milestone.name}</h3>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${MILESTONE_STATUS_STYLES[milestone.status] ?? "bg-gray-100 text-gray-600"}`}>
                    {MILESTONE_STATUS_LABELS[milestone.status] ?? milestone.status}
                  </span>
                </div>
                <div className="flex items-center gap-3 mt-0.5 text-xs text-gray-400">
                  <span>Échéance : {formatDate(milestone.dueDate)}</span>
                  <span>{mDone}/{milestone.tasks.length} tâches</span>
                </div>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <div className="w-20 bg-gray-100 rounded-full h-1.5">
                  <div className={`h-1.5 rounded-full ${mProgress === 100 ? "bg-emerald-500" : "bg-emerald-400"}`} style={{ width: `${mProgress}%` }} />
                </div>
                <span className="text-xs text-gray-500 w-8 text-right">{mProgress}%</span>
              </div>
            </div>

            {isExpanded && (
              <div className="border-t border-gray-100">
                {milestone.tasks.length === 0 && (
                  <p className="text-sm text-gray-400 text-center py-4">Aucune tâche</p>
                )}
                {milestone.tasks.map((task) => (
                  <div key={task.id}
                    className={`flex items-center gap-3 px-5 py-2.5 border-b border-gray-50 last:border-0 hover:bg-gray-50 transition-colors ${task.status === "DONE" ? "opacity-60" : ""}`}>
                    <button
                      onClick={() => canEdit && updateTaskStatus(task.id, milestone.id,
                        task.status === "DONE" ? "TODO" : task.status === "TODO" ? "IN_PROGRESS" : "DONE"
                      )}
                      className="flex-shrink-0"
                    >
                      {TASK_STATUS_ICONS[task.status] ?? TASK_STATUS_ICONS.TODO}
                    </button>
                    <button className="flex-1 min-w-0 text-left" onClick={() => onTaskClick(task.id)}>
                      <span className={`text-sm font-medium ${task.status === "DONE" ? "line-through text-gray-400" : "text-gray-900 hover:text-emerald-600"}`}>
                        {task.name}
                      </span>
                    </button>
                    <div className="flex items-center gap-3 text-xs text-gray-400 flex-shrink-0">
                      {task.assignee && (
                        <span className="flex items-center gap-1"><User className="w-3 h-3" />{task.assignee.name}</span>
                      )}
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />{formatDate(task.dueDate)}
                      </span>
                      {canEdit && (
                        <button onClick={() => deleteTask(task.id, milestone.id)} className="text-gray-300 hover:text-red-400 transition-colors">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}

                {canEdit && (
                  <div className="px-5 py-2.5">
                    {showAddTask === milestone.id ? (
                      <form onSubmit={(e) => addTask(e, milestone.id)} className="flex gap-2 flex-wrap">
                        <input required autoFocus value={taskForm.name}
                          onChange={(e) => setTaskForm({ ...taskForm, name: e.target.value })}
                          placeholder="Nom de la tâche"
                          className="flex-1 min-w-40 px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                        />
                        <input type="date" required value={taskForm.dueDate}
                          onChange={(e) => setTaskForm({ ...taskForm, dueDate: e.target.value })}
                          className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                        />
                        <select value={taskForm.assigneeId}
                          onChange={(e) => setTaskForm({ ...taskForm, assigneeId: e.target.value })}
                          className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500">
                          <option value="">Pas d&apos;assigné</option>
                          {users.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
                        </select>
                        <button type="submit" disabled={saving}
                          className="px-3 py-1.5 bg-emerald-600 text-white rounded-lg text-sm hover:bg-emerald-700 disabled:opacity-60">
                          Ajouter
                        </button>
                        <button type="button" onClick={() => setShowAddTask(null)}
                          className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm hover:bg-gray-50">
                          Annuler
                        </button>
                      </form>
                    ) : (
                      <button onClick={() => setShowAddTask(milestone.id)}
                        className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-emerald-600 transition-colors">
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
          <form onSubmit={addMilestone} className="bg-white rounded-xl border border-emerald-200 p-4 space-y-3">
            <h4 className="font-medium text-gray-900 text-sm">Nouvelle phase</h4>
            <div className="flex gap-3">
              <input required autoFocus value={milestoneForm.name}
                onChange={(e) => setMilestoneForm({ ...milestoneForm, name: e.target.value })}
                placeholder="Nom de la phase"
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
              <input type="date" required value={milestoneForm.dueDate}
                onChange={(e) => setMilestoneForm({ ...milestoneForm, dueDate: e.target.value })}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
            <div className="flex gap-2">
              <button type="submit" disabled={saving}
                className="px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm hover:bg-emerald-700 disabled:opacity-60">
                Créer
              </button>
              <button type="button" onClick={() => setShowAddMilestone(false)}
                className="px-4 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50">
                Annuler
              </button>
            </div>
          </form>
        ) : (
          <button onClick={() => setShowAddMilestone(true)}
            className="flex items-center gap-2 text-sm text-gray-400 hover:text-emerald-600 border border-dashed border-gray-200 hover:border-emerald-300 rounded-xl px-4 py-3 w-full transition-colors">
            <Plus className="w-4 h-4" /> Ajouter une phase
          </button>
        )
      )}
    </div>
  );
}
