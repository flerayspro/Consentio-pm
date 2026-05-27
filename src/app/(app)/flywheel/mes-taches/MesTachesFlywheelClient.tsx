"use client";

import { useState } from "react";
import Link from "next/link";
import { formatDate } from "@/lib/utils";
import {
  CheckSquare, Circle, Clock, CheckCircle2,
  ChevronDown, ChevronRight, Calendar, Zap,
} from "lucide-react";
import { isBefore, isToday, addDays, startOfDay, isAfter } from "date-fns";
import { WaveTaskPanel } from "../[id]/WaveTaskPanel";

interface TaskItem {
  id: string;
  name: string;
  status: string;
  dueDate: Date;
  startDate?: Date | null;
  description?: string | null;
  milestone: {
    id: string;
    name: string;
    wave: { id: string; name: string; status: string; clientName: string };
  };
  assignee: { id: string; name: string } | null;
}

interface UserItem { id: string; name: string; email: string; role: string; }

// ─── Constantes ─────────────────────────────────────────────────────────────

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
  IN_PROGRESS: <Clock className="w-4 h-4 text-yellow-500" />,
  DONE:        <CheckCircle2 className="w-4 h-4 text-emerald-500" />,
};

const STATUS_NEXT: Record<string, string> = {
  TODO: "IN_PROGRESS",
  IN_PROGRESS: "DONE",
  DONE: "TODO",
};

// Couleur du point selon le statut de la vague
const WAVE_STATUS_DOT: Record<string, string> = {
  ACTIVE:    "bg-emerald-500",
  COMPLETED: "bg-blue-500",
  ON_HOLD:   "bg-yellow-400",
  CANCELLED: "bg-gray-400",
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function dueDateStyle(task: TaskItem): string {
  const d = new Date(task.dueDate);
  const today = startOfDay(new Date());
  if (task.status === "DONE") return "text-gray-400";
  if (isBefore(d, today)) return "text-red-500 font-medium";
  if (isToday(d)) return "text-orange-500 font-medium";
  return "text-gray-400";
}

function applyDateFilter(task: TaskItem, filter: string): boolean {
  const d = startOfDay(new Date(task.dueDate));
  const today = startOfDay(new Date());
  if (filter === "ALL")      return true;
  if (filter === "OVERDUE")  return isBefore(d, today) && task.status !== "DONE";
  if (filter === "TODAY")    return isToday(new Date(task.dueDate));
  if (filter === "WEEK")     return !isBefore(d, today) && isBefore(d, addDays(today, 7)) && task.status !== "DONE";
  if (filter === "UPCOMING") return isAfter(d, addDays(today, 6)) && task.status !== "DONE";
  return true;
}

function groupByWave(tasks: TaskItem[]) {
  const map = new Map<string, {
    wave: TaskItem["milestone"]["wave"];
    milestones: Map<string, { milestone: { id: string; name: string }; tasks: TaskItem[] }>;
  }>();

  for (const task of tasks) {
    const wid = task.milestone.wave.id;
    if (!map.has(wid)) map.set(wid, { wave: task.milestone.wave, milestones: new Map() });
    const wg = map.get(wid)!;
    const mid = task.milestone.id;
    if (!wg.milestones.has(mid))
      wg.milestones.set(mid, { milestone: { id: task.milestone.id, name: task.milestone.name }, tasks: [] });
    wg.milestones.get(mid)!.tasks.push(task);
  }

  return Array.from(map.values());
}

// ─── Composant principal ──────────────────────────────────────────────────────

export function MesTachesFlywheelClient({
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
  const [dateFilter, setDateFilter]     = useState<string>("ALL");
  const [expandedWaves, setExpandedWaves] = useState<Set<string>>(
    new Set(initialTasks.map((t) => t.milestone.wave.id))
  );
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);

  // Filtrage
  const filtered = tasks.filter((t) => {
    const matchStatus = statusFilter === "ALL" || t.status === statusFilter;
    const matchDate   = applyDateFilter(t, dateFilter);
    return matchStatus && matchDate;
  });

  const grouped = groupByWave(filtered);

  function toggleWave(id: string) {
    setExpandedWaves((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  async function cycleStatus(taskId: string) {
    const task = tasks.find((t) => t.id === taskId);
    if (!task) return;
    const newStatus = STATUS_NEXT[task.status];
    const res = await fetch(`/api/wave-tasks/${taskId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: newStatus }),
    });
    if (res.ok) {
      setTasks((prev) => prev.map((t) => t.id === taskId ? { ...t, status: newStatus } : t));
    }
  }

  const today       = startOfDay(new Date());
  const overdueCount = tasks.filter((t) => isBefore(startOfDay(new Date(t.dueDate)), today) && t.status !== "DONE").length;
  const todayCount   = tasks.filter((t) => isToday(new Date(t.dueDate))).length;
  const pendingCount = tasks.filter((t) => t.status !== "DONE").length;

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-8 py-5 flex-shrink-0">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <CheckSquare className="w-5 h-5 text-emerald-600" />
              <h1 className="text-xl font-bold text-gray-900">Mes tâches</h1>
            </div>
            <div className="flex items-center gap-4 text-xs text-gray-400">
              <span>{pendingCount} tâche{pendingCount !== 1 ? "s" : ""} en cours</span>
              {overdueCount > 0 && (
                <span className="text-red-500 font-medium">{overdueCount} en retard</span>
              )}
              {todayCount > 0 && (
                <span className="text-orange-500">{todayCount} aujourd&apos;hui</span>
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
                    ? "bg-white text-emerald-700 shadow-sm border border-gray-200"
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
                    ? "bg-white text-emerald-700 shadow-sm border border-gray-200"
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
                : "Aucune tâche Flywheel ne t'est assignée pour l'instant"}
            </p>
          </div>
        ) : (
          <div className="space-y-4 max-w-3xl">
            {grouped.map(({ wave, milestones }) => {
              const isOpen      = expandedWaves.has(wave.id);
              const waveTasks   = Array.from(milestones.values()).flatMap((m) => m.tasks);
              const donePct     = waveTasks.length
                ? Math.round((waveTasks.filter((t) => t.status === "DONE").length / waveTasks.length) * 100)
                : 0;

              return (
                <div key={wave.id} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                  {/* En-tête vague */}
                  <button
                    onClick={() => toggleWave(wave.id)}
                    className="w-full flex items-center gap-3 px-5 py-3.5 hover:bg-gray-50 transition-colors"
                  >
                    {isOpen
                      ? <ChevronDown className="w-4 h-4 text-gray-400 flex-shrink-0" />
                      : <ChevronRight className="w-4 h-4 text-gray-400 flex-shrink-0" />
                    }
                    <span className={`w-2 h-2 rounded-full flex-shrink-0 ${WAVE_STATUS_DOT[wave.status] ?? "bg-gray-300"}`} />
                    <Zap className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                    <span className="font-semibold text-gray-900 text-sm flex-1 text-left truncate">
                      {wave.name}
                      <span className="font-normal text-gray-400 ml-1.5">· {wave.clientName}</span>
                    </span>
                    <span className="text-xs text-gray-400 mr-2">{donePct}%</span>
                    <Link
                      href={`/flywheel/${wave.id}`}
                      onClick={(e) => e.stopPropagation()}
                      className="text-xs text-emerald-500 hover:underline flex-shrink-0"
                    >
                      Voir la vague →
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
                            const dueDay   = startOfDay(new Date(task.dueDate));
                            const isOverdue  = isBefore(dueDay, today) && task.status !== "DONE";
                            const isTodayDue = isToday(new Date(task.dueDate));

                            return (
                              <div
                                key={task.id}
                                className={`flex items-center gap-3 px-5 py-2.5 border-b border-gray-50 last:border-0 hover:bg-gray-50 transition-colors ${
                                  task.status === "DONE" ? "opacity-60" : ""
                                }`}
                              >
                                {/* Icône statut */}
                                <button
                                  onClick={() => cycleStatus(task.id)}
                                  className="flex-shrink-0 hover:scale-110 transition-transform"
                                  title="Cliquer pour changer le statut"
                                >
                                  {STATUS_ICONS[task.status]}
                                </button>

                                {/* Nom */}
                                <button
                                  className="flex-1 min-w-0 text-left"
                                  onClick={() => setSelectedTaskId(task.id)}
                                >
                                  <span className={`text-sm ${
                                    task.status === "DONE"
                                      ? "line-through text-gray-400"
                                      : "text-gray-800 hover:text-emerald-600"
                                  }`}>
                                    {task.name}
                                  </span>
                                </button>

                                {/* Date d'échéance */}
                                <span className={`flex items-center gap-1 text-xs flex-shrink-0 ${dueDateStyle(task)}`}>
                                  {isOverdue && <Clock className="w-3 h-3" />}
                                  {isTodayDue && !isOverdue && <Calendar className="w-3 h-3" />}
                                  {formatDate(task.dueDate)}
                                </span>

                                {/* Badges */}
                                {isOverdue && (
                                  <span className="text-xs bg-red-50 text-red-500 border border-red-100 px-1.5 py-0.5 rounded-full flex-shrink-0">
                                    En retard
                                  </span>
                                )}
                                {isTodayDue && task.status !== "DONE" && (
                                  <span className="text-xs bg-orange-50 text-orange-500 border border-orange-100 px-1.5 py-0.5 rounded-full flex-shrink-0">
                                    Aujourd&apos;hui
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
        <WaveTaskPanel
          taskId={selectedTaskId}
          users={users}
          currentUserId={currentUserId}
          currentUserRole={currentUserRole}
          onClose={() => setSelectedTaskId(null)}
          onUpdate={(updated) => {
            setTasks((prev) =>
              prev.map((t) =>
                t.id === selectedTaskId
                  ? {
                      ...t,
                      name:    updated.name    ?? t.name,
                      status:  updated.status  ?? t.status,
                      dueDate: updated.dueDate ? new Date(updated.dueDate as string) : t.dueDate,
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
