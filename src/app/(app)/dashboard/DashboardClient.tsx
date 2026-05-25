"use client";

import Link from "next/link";
import { formatDate, isOverdue, getStatusLabel } from "@/lib/utils";
import { AlertTriangle, CheckCircle2, Clock, FolderKanban, TrendingUp } from "lucide-react";
import { isBefore } from "date-fns";

interface Task {
  id: string;
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
  startDate: Date;
  endDate: Date;
  manager: { id: string; name: string };
  milestones: Milestone[];
}

function getProjectProgress(project: Project) {
  const tasks = project.milestones.flatMap((m) => m.tasks);
  if (tasks.length === 0) return 0;
  return Math.round((tasks.filter((t) => t.status === "DONE").length / tasks.length) * 100);
}

function isProjectOverdue(project: Project) {
  return (
    project.status === "ACTIVE" &&
    isBefore(new Date(project.endDate), new Date())
  );
}

function hasOverdueTasks(project: Project) {
  return project.milestones.some((m) =>
    m.tasks.some((t) => t.status !== "DONE" && isOverdue(t.dueDate))
  );
}

export function DashboardClient({ projects, userName }: { projects: Project[]; userName: string }) {
  const active = projects.filter((p) => p.status === "ACTIVE");
  const overdue = projects.filter((p) => isProjectOverdue(p) || hasOverdueTasks(p));
  const completed = projects.filter((p) => p.status === "COMPLETED");

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Bonjour, {userName.split(" ")[0]}</h1>
        <p className="text-gray-500 mt-1">Voici l'état de vos projets</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4 mb-8">
        {[
          { label: "Projets actifs", value: active.length, icon: FolderKanban, color: "blue" },
          { label: "En retard", value: overdue.length, icon: AlertTriangle, color: "red" },
          { label: "Terminés", value: completed.length, icon: CheckCircle2, color: "green" },
          { label: "Total", value: projects.length, icon: TrendingUp, color: "purple" },
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

      <div className="grid grid-cols-2 gap-6">
        {/* Projets en cours */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-gray-900">Projets en cours</h2>
            <Link href="/projects" className="text-sm text-blue-600 hover:underline">
              Voir tout
            </Link>
          </div>
          <div className="space-y-3">
            {active.length === 0 && (
              <p className="text-sm text-gray-400 py-4 text-center">Aucun projet actif</p>
            )}
            {active.slice(0, 5).map((project) => {
              const progress = getProjectProgress(project);
              return (
                <Link
                  key={project.id}
                  href={`/projects/${project.id}`}
                  className="block p-3 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <div className="flex justify-between items-start mb-1.5">
                    <span className="text-sm font-medium text-gray-900">{project.name}</span>
                    <span className="text-xs text-gray-400">{progress}%</span>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-1.5">
                    <div
                      className="bg-blue-500 h-1.5 rounded-full transition-all"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                  <div className="flex justify-between mt-1.5">
                    <span className="text-xs text-gray-400">{project.manager.name}</span>
                    <span className="text-xs text-gray-400">
                      Fin: {formatDate(project.endDate)}
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>

        {/* Projets en retard */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center gap-2 mb-4">
            <AlertTriangle className="w-4 h-4 text-red-500" />
            <h2 className="font-semibold text-gray-900">Projets en retard / à risque</h2>
          </div>
          <div className="space-y-3">
            {overdue.length === 0 && (
              <div className="flex flex-col items-center py-4">
                <CheckCircle2 className="w-8 h-8 text-green-400 mb-2" />
                <p className="text-sm text-gray-400">Tout est à jour !</p>
              </div>
            )}
            {overdue.slice(0, 5).map((project) => {
              const overdueTasksCount = project.milestones
                .flatMap((m) => m.tasks)
                .filter((t) => t.status !== "DONE" && isOverdue(t.dueDate)).length;

              return (
                <Link
                  key={project.id}
                  href={`/projects/${project.id}`}
                  className="block p-3 rounded-lg border border-red-100 bg-red-50 hover:bg-red-100 transition-colors"
                >
                  <div className="flex justify-between items-start">
                    <span className="text-sm font-medium text-gray-900">{project.name}</span>
                    <span className="text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded-full border border-red-200">
                      {isProjectOverdue(project) ? "Projet en retard" : `${overdueTasksCount} tâche(s)`}
                    </span>
                  </div>
                  <div className="flex items-center gap-1 mt-1.5">
                    <Clock className="w-3 h-3 text-red-400" />
                    <span className="text-xs text-red-500">
                      Échéance: {formatDate(project.endDate)}
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
