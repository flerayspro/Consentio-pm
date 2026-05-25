"use client";

import { useState } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { formatDate, getStatusLabel } from "@/lib/utils";
import { ChevronLeft, User, Calendar, Save } from "lucide-react";
import { MilestonesTab } from "./tabs/MilestonesTab";
import { ResourcesTab } from "./tabs/ResourcesTab";
import { TaskPanel } from "./TaskPanel";
import { GanttClient } from "./gantt/GanttClient";

const RichTextEditor = dynamic(
  () => import("@/components/editor/RichTextEditor").then((m) => m.RichTextEditor),
  { ssr: false }
);

const HEALTH_OPTIONS = [
  { value: "ON_TRACK", label: "Dans les temps", color: "bg-green-100 text-green-700 border-green-200" },
  { value: "AT_RISK", label: "À risque", color: "bg-yellow-100 text-yellow-700 border-yellow-200" },
  { value: "LATE", label: "En retard", color: "bg-red-100 text-red-700 border-red-200" },
  { value: "BLOCKED", label: "Bloqué", color: "bg-red-100 text-red-800 border-red-300" },
  { value: "CANCELLED", label: "Annulé", color: "bg-gray-100 text-gray-600 border-gray-200" },
  { value: "COMPLETED", label: "Terminé", color: "bg-blue-100 text-blue-700 border-blue-200" },
];

const TABS = ["Résumé", "Milestones", "Gantt", "Ressources"] as const;

interface Owner { id: string; name: string; }
interface Task { id: string; name: string; description?: string | null; status: string; dueDate: Date; owner?: Owner | null; order: number; }
interface Milestone { id: string; name: string; description?: string | null; status: string; dueDate: Date; order: number; tasks: Task[]; }
interface Project {
  id: string; name: string; description?: string | null; status: string;
  health: string; summary?: string | null;
  startDate: Date; endDate: Date;
  manager: { id: string; name: string; email: string };
  template?: { id: string; name: string } | null;
  milestones: Milestone[];
}
interface User { id: string; name: string; email: string; role: string; }

export function ProjectDetailClient({
  project, users, currentUserRole, currentUserId,
}: {
  project: Project; users: User[]; currentUserRole: string; currentUserId: string;
}) {
  const [activeTab, setActiveTab] = useState<typeof TABS[number]>("Résumé");
  const [milestones, setMilestones] = useState(project.milestones);
  const [health, setHealth] = useState(project.health);
  const [summary, setSummary] = useState(project.summary ?? "");
  const [summarySaving, setSummarySaving] = useState(false);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);

  const allTasks = milestones.flatMap((m) => m.tasks);
  const doneTasks = allTasks.filter((t) => t.status === "DONE").length;
  const progress = allTasks.length > 0 ? Math.round((doneTasks / allTasks.length) * 100) : 0;
  const healthOption = HEALTH_OPTIONS.find((h) => h.value === health) ?? HEALTH_OPTIONS[0];

  async function saveSummary() {
    setSummarySaving(true);
    await fetch(`/api/projects/${project.id}/summary`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ summary, health }),
    });
    setSummarySaving(false);
  }

  async function changeHealth(newHealth: string) {
    setHealth(newHealth);
    await fetch(`/api/projects/${project.id}/summary`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ health: newHealth }),
    });
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4 flex-shrink-0">
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-3">
            <Link href="/projects" className="mt-1 p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors">
              <ChevronLeft className="w-4 h-4" />
            </Link>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-xl font-bold text-gray-900">{project.name}</h1>
                {/* Health badge + selector */}
                <div className="relative group">
                  <span className={`text-xs px-2.5 py-1 rounded-full font-medium border cursor-pointer select-none ${healthOption.color}`}>
                    {healthOption.label}
                  </span>
                  <div className="absolute top-full left-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-lg z-20 hidden group-hover:block min-w-[160px] py-1">
                    {HEALTH_OPTIONS.map((h) => (
                      <button key={h.value} onClick={() => changeHealth(h.value)}
                        className={`flex items-center gap-2 px-3 py-2 w-full text-sm hover:bg-gray-50 transition-colors ${h.value === health ? "font-medium" : ""}`}>
                        <span className={`w-2 h-2 rounded-full ${h.color.split(" ")[0]}`} />
                        {h.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-4 mt-1.5 text-xs text-gray-400">
                <span className="flex items-center gap-1"><User className="w-3 h-3" />{project.manager.name}</span>
                <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{formatDate(project.startDate)} → {formatDate(project.endDate)}</span>
                {project.template && <span className="text-blue-400">Template: {project.template.name}</span>}
              </div>
            </div>
          </div>
          {/* Progress */}
          <div className="text-right">
            <p className="text-sm font-semibold text-gray-900">{progress}%</p>
            <div className="w-32 bg-gray-100 rounded-full h-1.5 mt-1">
              <div className={`h-1.5 rounded-full ${progress === 100 ? "bg-green-500" : "bg-blue-500"}`} style={{ width: `${progress}%` }} />
            </div>
            <p className="text-xs text-gray-400 mt-0.5">{doneTasks}/{allTasks.length} tâches</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-0 mt-4 border-b border-gray-100 -mb-px">
          {TABS.map((tab) => (
            <button key={tab} onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab ? "border-blue-600 text-blue-700" : "border-transparent text-gray-500 hover:text-gray-700"
              }`}>
              {tab}
            </button>
          ))}
        </div>
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-y-auto">
        {/* Résumé */}
        {activeTab === "Résumé" && (
          <div className="p-6 max-w-3xl">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-gray-900">Résumé du projet</h2>
              <button onClick={saveSummary} disabled={summarySaving}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white rounded-lg text-sm font-medium transition-colors">
                <Save className="w-3.5 h-3.5" />
                {summarySaving ? "Sauvegarde..." : "Sauvegarder"}
              </button>
            </div>
            <RichTextEditor
              content={summary}
              onChange={setSummary}
              placeholder="Décrivez l'état du projet, les risques, les décisions clés..."
            />
            <p className="text-xs text-gray-400 mt-2">
              Cliquez sur le statut en haut pour le modifier. Le résumé se sauvegarde avec le bouton ci-dessus.
            </p>
          </div>
        )}

        {/* Milestones */}
        {activeTab === "Milestones" && (
          <MilestonesTab
            projectId={project.id}
            milestones={milestones}
            setMilestones={setMilestones}
            users={users}
            currentUserRole={currentUserRole}
            onTaskClick={setSelectedTaskId}
          />
        )}

        {/* Gantt */}
        {activeTab === "Gantt" && (
          <div className="p-6">
            <GanttClient project={{ id: project.id, name: project.name, startDate: project.startDate, endDate: project.endDate, milestones }} />
          </div>
        )}

        {/* Ressources */}
        {activeTab === "Ressources" && (
          <ResourcesTab projectId={project.id} />
        )}
      </div>

      {/* Task panel */}
      {selectedTaskId && (
        <TaskPanel
          taskId={selectedTaskId}
          users={users}
          currentUserId={currentUserId}
          currentUserRole={currentUserRole}
          onClose={() => setSelectedTaskId(null)}
          onUpdate={(updatedTask) => {
            setMilestones((prev) =>
              prev.map((m) => ({
                ...m,
                tasks: m.tasks.map((t) =>
                  t.id === updatedTask.id
                    ? {
                        ...t,
                        name: updatedTask.name ?? t.name,
                        description: updatedTask.description ?? t.description,
                        status: updatedTask.status ?? t.status,
                        dueDate: updatedTask.dueDate ? new Date(updatedTask.dueDate as unknown as string) : t.dueDate,
                        owner: updatedTask.owner !== undefined ? updatedTask.owner : t.owner,
                      }
                    : t
                ),
              }))
            );
          }}
        />
      )}
    </div>
  );
}
