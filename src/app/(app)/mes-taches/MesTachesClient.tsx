"use client";

import { useState } from "react";
import Link from "next/link";
import { formatDate } from "@/lib/utils";
import {
  CheckSquare, Circle, Clock, CheckCircle2,
  ChevronDown, ChevronRight, Calendar, FolderKanban,
} from "lucide-react";
import { isAfter, isBefore, isToday, addDays, startOfDay } from "date-fns";
import { TaskPanel } from "../projects/[id]/TaskPanel";

interface TaskItem {
  id: string;
  name: string;
  status: string;
  dueDate: Date;
  milestone: {
    id: string;
    name: string;
    project: { id: string; name: string; health: string };
  };
  owner: { id: string; name: string } | null;
}

interface UserItem { id: string; name: string; email: string; role: string; }

// ─── Constantes ────────────────────────────────────────────────────────────

const STATUS_FILTERS = [
  { value: "ALL",         label: "Tous les statuts" },
  { value: "TODO",        label: "À faire" },
  { value: "IN_PROGRESS", label: "En cours" },
  { value: "DONE",        label: "Terminées" },
] as const;

const DATE_FILTERS = [
  { value: "ALL",      label: "Toutes les dates" },
  { value: "OVERDUE",  label: "En retard" },
  { value: "TODAY",    label: "Aujourd'hui" },
  { value: "WEEK",     label: "Cette semaine" },
  { value: "UPCOMING", label: "À venir" },
] as const;

const STATUS_ICONS: Record<string, React.ReactNode> = {
  TODO:        <Circle className="w-4 h-4 text-gray-400" />,
  IN_PROGRESS: <Clock className="w-4 h-4 text-blue-500" />,
  DONE:        <CheckCircle2 className="w-4 h-4 text-green-500" />,
};

const STATUS_NEXT: Record<string, string> = {
  TODO: "IN_PROGRESS",
  IN_PROGRESS: "DONE",
  DONE: "TODO",
};

const DUE_DATE_STYLE = (task: TaskItem) => {
  const d = new Date(task.dueDate);
  const today = startOfDay(new Date());
  if (task.status === "DONE") return "text-gray-400";
  if (isBefore(d, today)) return "text-red-500 font-medium";
  if (isToday(d)) return "text-orange-500 font-medium";
  return "text-gray-400";
};

const HEALTH_COLORS: Record<string, string> = {
  ON_TRACK:  "bg-green-500",
  AT_RISK:   "bg-yellow-400",
  LATE:      "bg-red-500",
  BLOCKED:   "bg-red-700",
  CANCELLED: "bg-gray-400",
  COMPLETED: "bg-blue-500",
};

// ─── Helpers ───────────────────────────────────────────────────────────────

function applyDateFilter(task: TaskItem, filter: string): boolean {
  const d = startOfDay(new Date(task.dueDate));
  const today = startOfDay(new Date());
  if (filter === "ALL") return true;
  if (filter === "OVERDUE")  return isBefore(d, today) && task.status !== "DONE";
  if (filter === "TODAY")    return isToday(new Date(task.dueDate));
  if (filter === "WEEK")     return !isBefore(d, today) && isBefore(d, addDays(today, 7)) && task.status !== "DONE";
  if (filter === "UPCOMING") return isAfter(d, addDays(today, 6)) && task.status !== "DONE";
  return true;
}

function groupByProject(tasks: TaskItem[]) {
  const map = new Map<string, { project: TaskItem["milestone"]["project"]; milestones: Map<string, { milestone: { id: string; name: string }; tasks: TaskItem[] }> }>();
  for (const task of tasks) {
    const pid = task.milestone.project.id;
    if (!map.has(pid)) {
      map.set(pid, { project: task.milestone.project, milestones: new Map() });
    }
    const mid = task.milestone.id;
    const pg = map.get(pid)!;
    if (!pg.milestones.has(mid)) {
      pg.milestones.set(mid, { milestone: { id: task.milestone.id, name: task.milestone.name }, tasks: [] });
    }
    pg.milestones.get(mid)!.tasks.push(task);
  }
  return Array.from(map.values());
}

// ─── Composant principal ───────────────────────────────────────────────────

export function MesTachesClient({
  tasks: initialTasks,
  users,
  currentUserId,
  currentUserRole,
}: {
  tasks: TaskItem[];
  users: UserItem[];
  currentUserId: string;
  currentUserRole: string;
}) {
  const [tasks, setTasks] = useState(initialTasks);
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [dateFilter, setDateFilter] = useState<string>("ALL");
  const [expandedProjects, setExpandedProjects] = useState<Set<string>>(
    new Set(initialTasks.map((t) => t.milestone.project.id))
  );
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);

  // Filtrage
  const filtered = tasks.filter((t) => {
    const matchStatus = statusFilter === "ALL" || t.status === statusFilter;
    const matchDate = applyDateFilter(t, dateFilter);
    return matchStatus && matchDate;
  });

  const grouped = groupByProject(filtered);

  function toggleProject(id: string) {
    setExpandedProjects((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  async function cycleStatus(taskId: string) {
    const task = tasks.find((t) => t.id === taskId);
    if (!task) return;
    const newStatus = STATUS_NEXT[task.status];
    const res = await fetch(`/api/tasks/${taskId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: newStatus }),
    });
    if (res.ok) {
      setTasks((prev) => prev.map((t) => t.id === taskId ? { ...t, status: newStatus } : t));
    }
  }

  const overdueCount  = tasks.filter((t) => isBefore(startOfDay(new Date(t.dueDate)), startOfDay(new Date())) && t.status !== "DONE").length;
  const todayCount    = tasks.filter((t) => isToday(new Date(t.dueDate))).length;
  const pendingCount  = tasks.filter((t) => t.status !== "DONE").length;

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-8 py-5 flex-shrink-0">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <CheckSquare className="w-5 h-5 text-blue-600" />
              <h1 className="text-xl font-bold text-gray-900">Mes tâches</h1>
            </div>
            <div className="flex items-center gap-4 text-xs text-gray-400">
              <span>{pendingCount} tâche{pendingCount !== 1 ? "s" : ""} en cours</span>
              {overdueCount > 0 && (
                <span className="text-red-500 font-medium">{overdueCount} en retard</span>
              )}
              {todayCount > 0 && (
                <span className="text-orange-500">{todayCount} aujourd'hui</span>
              )}
            </div>
          </div>
        </div>

        {/* Filtres */}
        <div className="flex flex-wrap gap-4 mt-4">
          {/* Statut */}
          <div className="flex items-center gap-1.5 bg-gray-50 rounded-xl p-1">
            {STATUS_FILTERS.map((f) => (
              <button
                key={f.value}
                onClick={() => setStatusFilter(f.value)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  statusFilter === f.value
                    ? "bg-white text-blue-700 shadow-sm border border-gray-200"
                    : "text-gray-500 hover:text-gray-700"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          {/* Date */}
          <div className="flex items-center gap-1.5 bg-gray-50 rounded-xl p-1">
            {DATE_FILTERS.map((f) => (
              <button
                key={f.value}
                onClick={() => setDateFilter(f.value)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  dateFilter === f.value
                    ? "bg-white text-blue-700 shadow-sm border border-gray-200"
                    : "text-gray-500 hover:text-gray-700"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Contenu */}
      <div className="flex-1 overflow-y-auto p-8">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-gray-300">
            <CheckCircle2 className="w-14 h-14 mb-3" />
            <p className="text-lg font-medium text-gray-400">Aucune tâche</p>
            <p className="text-sm text-gray-300 mt-1">
              {statusFilter !== "ALL" || dateFilter !== "ALL"
                ? "Essaie d'autres filtres"
                : "Tu n'as aucune tâche assignée pour l'instant"}
            </p>
          </div>
        ) : (
          <div className="space-y-4 max-w-3xl">
            {grouped.map(({ project, milestones }) => {
              const isOpen = expandedProjects.has(project.id);
              const projectTasks = Array.from(milestones.values()).flatMap((m) => m.tasks);
              const donePct = projectTasks.length
                ? Math.round((projectTasks.filter((t) => t.status === "DONE").length / projectTasks.length) * 100)
                : 0;

              return (
                <div key={project.id} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                  {/* En-tête projet */}
                  <button
                    onClick={() => toggleProject(project.id)}
                    className="w-full flex items-center gap-3 px-5 py-3.5 hover:bg-gray-50 transition-colors"
                  >
                    {isOpen
                      ? <ChevronDown className="w-4 h-4 text-gray-400 flex-shrink-0" />
                      : <ChevronRight className="w-4 h-4 text-gray-400 flex-shrink-0" />
                    }
                    <span className={`w-2 h-2 rounded-full flex-shrink-0 ${HEALTH_COLORS[project.health] ?? "bg-gray-300"}`} />
                    <FolderKanban className="w-4 h-4 text-gray-400 flex-shrink-0" />
                    <span className="font-semibold text-gray-900 text-sm flex-1 text-left truncate">{project.name}</span>
                    <span className="text-xs text-gray-400 mr-2">{donePct}%</span>
                    <Link
                      href={`/projects/${project.id}`}
                      onClick={(e) => e.stopPropagation()}
                      className="text-xs text-blue-500 hover:underline flex-shrink-0"
                    >
                      Voir le projet
                    </Link>
                  </button>

                  {/* Milestones + tâches */}
                  {isOpen && (
                    <div className="border-t border-gray-100">
                      {Array.from(milestones.values()).map(({ milestone, tasks: mtasks }) => (
                        <div key={milestone.id}>
                          {/* Label milestone */}
                          <div className="flex items-center gap-2 px-5 py-2 bg-gray-50 border-b border-gray-100">
                            <Calendar className="w-3 h-3 text-gray-400" />
                            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                              {milestone.name}
                            </span>
                            <span className="text-xs text-gray-400 ml-auto">
                              {mtasks.filter((t) => t.status === "DONE").length}/{mtasks.length}
                            </span>
                          </div>

                          {/* Tâches */}
                          {mtasks.map((task) => {
                            const today = startOfDay(new Date());
                            const dueDay = startOfDay(new Date(task.dueDate));
                            const isOverdue = isBefore(dueDay, today) && task.status !== "DONE";
                            const isTodayDue = isToday(new Date(task.dueDate));

                            return (
                              <div
                                key={task.id}
                                className={`flex items-center gap-3 px-5 py-2.5 border-b border-gray-50 last:border-0 hover:bg-gray-50 transition-colors group ${
                                  task.status === "DONE" ? "opacity-60" : ""
                                }`}
                              >
                                {/* Icône statut (cliquable pour changer) */}
                                <button
                                  onClick={() => cycleStatus(task.id)}
                                  className="flex-shrink-0 hover:scale-110 transition-transform"
                                  title="Cliquer pour changer le statut"
                                >
                                  {STATUS_ICONS[task.status]}
                                </button>

                                {/* Nom (cliquable pour ouvrir le panneau) */}
                                <button
                                  className="flex-1 min-w-0 text-left"
                                  onClick={() => setSelectedTaskId(task.id)}
                                >
                                  <span className={`text-sm ${
                                    task.status === "DONE"
                                      ? "line-through text-gray-400"
                                      : "text-gray-800 hover:text-blue-600"
                                  }`}>
                                    {task.name}
                                  </span>
                                </button>

                                {/* Date d'échéance */}
                                <span className={`flex items-center gap-1 text-xs flex-shrink-0 ${DUE_DATE_STYLE(task)}`}>
                                  {isOverdue && <Clock className="w-3 h-3" />}
                                  {isTodayDue && !isOverdue && <Calendar className="w-3 h-3" />}
                                  {formatDate(task.dueDate)}
                                </span>

                                {/* Badge retard */}
                                {isOverdue && (
                                  <span className="text-xs bg-red-50 text-red-500 border border-red-100 px-1.5 py-0.5 rounded-full flex-shrink-0">
                                    En retard
                                  </span>
                                )}
                                {isTodayDue && task.status !== "DONE" && (
                                  <span className="text-xs bg-orange-50 text-orange-500 border border-orange-100 px-1.5 py-0.5 rounded-full flex-shrink-0">
                                    Aujourd'hui
                                  </span>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Panneau tâche */}
      {selectedTaskId && (
        <TaskPanel
          taskId={selectedTaskId}
          users={users}
          currentUserId={currentUserId}
          currentUserRole={currentUserRole}
          onClose={() => setSelectedTaskId(null)}
          onUpdate={(updatedTask) => {
            setTasks((prev) =>
              prev.map((t) =>
                t.id === updatedTask.id
                  ? {
                      ...t,
                      name: updatedTask.name ?? t.name,
                      status: updatedTask.status ?? t.status,
                      dueDate: updatedTask.dueDate
                        ? new Date(updatedTask.dueDate as unknown as string)
                        : t.dueDate,
                    }
                  : t
              )
            );
          }}
        />
      )}
    </div>
  );
}
