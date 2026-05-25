"use client";

import { useState } from "react";
import Link from "next/link";
import { formatDate, isOverdue } from "@/lib/utils";
import {
  AlertTriangle, CheckCircle2, Clock, FolderKanban, TrendingUp,
  ChevronDown, ChevronRight, Calendar,
} from "lucide-react";
import { isBefore } from "date-fns";

interface Task {
  id: string;
  name: string;
  status: string;
  dueDate: Date;
}

interface Milestone {
  id: string;
  name: string;
  status: string;
  dueDate: Date;
  tasks: Task[];
}

interface Project {
  id: string;
  name: string;
  status: string;
  health: string;
  startDate: Date;
  endDate: Date;
  manager: { id: string; name: string };
  milestones: Milestone[];
}

const HEALTH_CONFIG: Record<string, { label: string; color: string; dot: string }> = {
  ON_TRACK:  { label: "Dans les temps", color: "bg-green-100 text-green-700 border-green-200",  dot: "bg-green-500" },
  AT_RISK:   { label: "À risque",        color: "bg-yellow-100 text-yellow-700 border-yellow-200", dot: "bg-yellow-400" },
  LATE:      { label: "En retard",       color: "bg-red-100 text-red-700 border-red-200",        dot: "bg-red-500" },
  BLOCKED:   { label: "Bloqué",          color: "bg-red-100 text-red-800 border-red-300",        dot: "bg-red-700" },
  CANCELLED: { label: "Annulé",          color: "bg-gray-100 text-gray-600 border-gray-200",     dot: "bg-gray-400" },
  COMPLETED: { label: "Terminé",         color: "bg-blue-100 text-blue-700 border-blue-200",     dot: "bg-blue-500" },
};

function getProgress(project: Project) {
  const tasks = project.milestones.flatMap((m) => m.tasks);
  if (tasks.length === 0) return 0;
  return Math.round((tasks.filter((t) => t.status === "DONE").length / tasks.length) * 100);
}

function isProjectOverdue(project: Project) {
  return project.status === "ACTIVE" && isBefore(new Date(project.endDate), new Date());
}

// Retourne les tâches en retard par milestone pour un projet
function getOverdueItems(project: Project) {
  const milestoneOverdue = project.milestones.filter(
    (m) => m.status !== "DONE" && isOverdue(m.dueDate)
  );
  const tasksByMilestone = project.milestones
    .map((m) => ({
      milestone: m,
      tasks: m.tasks.filter((t) => t.status !== "DONE" && isOverdue(t.dueDate)),
    }))
    .filter((x) => x.tasks.length > 0);

  return { milestoneOverdue, tasksByMilestone };
}

function OverdueProjectRow({ project }: { project: Project }) {
  const [open, setOpen] = useState(false);
  const { milestoneOverdue, tasksByMilestone } = getOverdueItems(project);
  const totalOverdueTasks = tasksByMilestone.reduce((s, x) => s + x.tasks.length, 0);
  const healthCfg = HEALTH_CONFIG[project.health] ?? HEALTH_CONFIG.ON_TRACK;

  return (
    <div className="border border-orange-100 rounded-lg overflow-hidden">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center gap-3 px-4 py-3 bg-orange-50 hover:bg-orange-100 transition-colors text-left"
      >
        {open ? (
          <ChevronDown className="w-4 h-4 text-orange-400 flex-shrink-0" />
        ) : (
          <ChevronRight className="w-4 h-4 text-orange-400 flex-shrink-0" />
        )}
        <span className="flex-1 text-sm font-medium text-gray-900">{project.name}</span>
        <span className={`text-xs px-2 py-0.5 rounded-full font-medium border ${healthCfg.color}`}>
          {healthCfg.label}
        </span>
        {milestoneOverdue.length > 0 && (
          <span className="text-xs bg-orange-200 text-orange-800 px-2 py-0.5 rounded-full">
            {milestoneOverdue.length} milestone{milestoneOverdue.length > 1 ? "s" : ""}
          </span>
        )}
        {totalOverdueTasks > 0 && (
          <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full">
            {totalOverdueTasks} tâche{totalOverdueTasks > 1 ? "s" : ""}
          </span>
        )}
      </button>

      {open && (
        <div className="px-4 py-3 bg-white space-y-3">
          {/* Milestones en retard */}
          {milestoneOverdue.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
                Milestones en retard
              </p>
              {milestoneOverdue.map((m) => (
                <div key={m.id} className="flex items-center gap-2 py-1 pl-2 border-l-2 border-orange-300">
                  <Clock className="w-3 h-3 text-orange-400 flex-shrink-0" />
                  <span className="text-sm text-gray-700 flex-1">{m.name}</span>
                  <span className="text-xs text-orange-500 flex items-center gap-1">
                    <Calendar className="w-3 h-3" />{formatDate(m.dueDate)}
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* Tâches en retard, groupées par milestone */}
          {tasksByMilestone.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
                Tâches en retard
              </p>
              {tasksByMilestone.map(({ milestone, tasks }) => (
                <div key={milestone.id} className="mb-2">
                  <p className="text-xs font-medium text-gray-400 mb-1 ml-2">{milestone.name}</p>
                  {tasks.map((t) => (
                    <div key={t.id} className="flex items-center gap-2 py-1 pl-4 border-l-2 border-red-200">
                      <Clock className="w-3 h-3 text-red-400 flex-shrink-0" />
                      <span className="text-sm text-gray-700 flex-1">{t.name}</span>
                      <span className="text-xs text-red-500 flex items-center gap-1">
                        <Calendar className="w-3 h-3" />{formatDate(t.dueDate)}
                      </span>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          )}

          <Link
            href={`/projects/${project.id}`}
            className="inline-block text-xs text-blue-600 hover:underline mt-1"
          >
            Ouvrir le projet →
          </Link>
        </div>
      )}
    </div>
  );
}

export function DashboardClient({ projects, userName }: { projects: Project[]; userName: string }) {
  const active = projects.filter((p) => p.status === "ACTIVE");
  const completed = projects.filter((p) => p.status === "COMPLETED");

  // Projets à risque = statut manuel AT_RISK, LATE ou BLOCKED
  const atRisk = active.filter((p) => ["AT_RISK", "LATE", "BLOCKED"].includes(p.health));

  // Projets avec retards réels (date dépassée projet OU tâches/milestones en retard)
  const overdueProjects = active.filter((p) => {
    const { milestoneOverdue, tasksByMilestone } = getOverdueItems(p);
    return isProjectOverdue(p) || milestoneOverdue.length > 0 || tasksByMilestone.length > 0;
  });

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Bonjour, {userName.split(" ")[0]}</h1>
        <p className="text-gray-500 mt-1">Voici l'état de vos projets</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4 mb-8">
        {[
          { label: "Projets actifs",  value: active.length,    icon: FolderKanban, color: "blue" },
          { label: "À risque / bloqués", value: atRisk.length, icon: AlertTriangle, color: "yellow" },
          { label: "Terminés",        value: completed.length, icon: CheckCircle2,  color: "green" },
          { label: "Total",           value: projects.length,  icon: TrendingUp,    color: "purple" },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="bg-white rounded-xl border border-gray-200 p-5">
            <div className={`inline-flex p-2 rounded-lg bg-${color}-50 mb-3`}>
              <Icon className={`w-5 h-5 text-${color}-600`} />
            </div>
            <p className="text-2xl font-bold text-gray-900">{value}</p>
            <p className="text-sm text-gray-500">{label}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-6 mb-6">
        {/* Projets en cours */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-gray-900">Projets en cours</h2>
            <Link href="/projects" className="text-sm text-blue-600 hover:underline">Voir tout</Link>
          </div>
          <div className="space-y-3">
            {active.length === 0 && (
              <p className="text-sm text-gray-400 py-4 text-center">Aucun projet actif</p>
            )}
            {active.slice(0, 5).map((project) => {
              const progress = getProgress(project);
              const healthCfg = HEALTH_CONFIG[project.health] ?? HEALTH_CONFIG.ON_TRACK;
              return (
                <Link key={project.id} href={`/projects/${project.id}`}
                  className="block p-3 rounded-lg hover:bg-gray-50 transition-colors">
                  <div className="flex justify-between items-start mb-1.5">
                    <div className="flex items-center gap-2">
                      <span className={`w-2 h-2 rounded-full flex-shrink-0 ${healthCfg.dot}`} />
                      <span className="text-sm font-medium text-gray-900">{project.name}</span>
                    </div>
                    <span className="text-xs text-gray-400">{progress}%</span>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-1.5 ml-4">
                    <div className="bg-blue-500 h-1.5 rounded-full transition-all" style={{ width: `${progress}%` }} />
                  </div>
                  <div className="flex justify-between mt-1.5 ml-4">
                    <span className="text-xs text-gray-400">{project.manager.name}</span>
                    <span className="text-xs text-gray-400">Fin: {formatDate(project.endDate)}</span>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>

        {/* Projets à risque (statut manuel) */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center gap-2 mb-4">
            <AlertTriangle className="w-4 h-4 text-yellow-500" />
            <h2 className="font-semibold text-gray-900">Projets à risque / bloqués</h2>
          </div>
          <div className="space-y-3">
            {atRisk.length === 0 && (
              <div className="flex flex-col items-center py-4">
                <CheckCircle2 className="w-8 h-8 text-green-400 mb-2" />
                <p className="text-sm text-gray-400">Tout est sous contrôle !</p>
              </div>
            )}
            {atRisk.slice(0, 5).map((project) => {
              const healthCfg = HEALTH_CONFIG[project.health] ?? HEALTH_CONFIG.ON_TRACK;
              return (
                <Link key={project.id} href={`/projects/${project.id}`}
                  className="block p-3 rounded-lg border border-yellow-100 bg-yellow-50 hover:bg-yellow-100 transition-colors">
                  <div className="flex justify-between items-start">
                    <span className="text-sm font-medium text-gray-900">{project.name}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium border ${healthCfg.color}`}>
                      {healthCfg.label}
                    </span>
                  </div>
                  <div className="flex justify-between mt-1.5 text-xs text-gray-400">
                    <span>{project.manager.name}</span>
                    <span>Fin: {formatDate(project.endDate)}</span>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      </div>

      {/* Bloc retards réels - dépliable */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-center gap-2 mb-4">
          <Clock className="w-4 h-4 text-red-500" />
          <h2 className="font-semibold text-gray-900">Retards réels</h2>
          <span className="text-sm text-gray-400">
            ({overdueProjects.length} projet{overdueProjects.length !== 1 ? "s" : ""} avec des éléments en retard)
          </span>
        </div>

        {overdueProjects.length === 0 ? (
          <div className="flex flex-col items-center py-8">
            <CheckCircle2 className="w-10 h-10 text-green-400 mb-2" />
            <p className="text-sm text-gray-400">Aucun retard détecté — bravo !</p>
          </div>
        ) : (
          <div className="space-y-2">
            {overdueProjects.map((project) => (
              <OverdueProjectRow key={project.id} project={project} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
