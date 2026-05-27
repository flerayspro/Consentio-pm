"use client";

import { useState } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { formatDate } from "@/lib/utils";
import { ChevronLeft, ChevronDown, User, Calendar, Save, Pencil, LayoutTemplate, Tag, Plus, X } from "lucide-react";
import { MilestonesTab } from "./tabs/MilestonesTab";
import { ResourcesTab } from "./tabs/ResourcesTab";
import { TaskPanel } from "./TaskPanel";
import { GanttClient } from "./gantt/GanttClient";
import { TagBadge } from "@/components/ui/TagBadge";

const RichTextEditor = dynamic(
  () => import("@/components/editor/RichTextEditor").then((m) => m.RichTextEditor),
  { ssr: false }
);

const HEALTH_OPTIONS = [
  { value: "ON_TRACK",  label: "Dans les temps", color: "bg-green-100 text-green-700 border-green-200",  dot: "bg-green-500" },
  { value: "AT_RISK",   label: "À risque",        color: "bg-yellow-100 text-yellow-700 border-yellow-200", dot: "bg-yellow-400" },
  { value: "LATE",      label: "En retard",       color: "bg-red-100 text-red-700 border-red-200",        dot: "bg-red-500" },
  { value: "BLOCKED",   label: "Bloqué",          color: "bg-red-100 text-red-800 border-red-300",        dot: "bg-red-700" },
  { value: "CANCELLED", label: "Annulé",          color: "bg-gray-100 text-gray-600 border-gray-200",     dot: "bg-gray-400" },
  { value: "COMPLETED", label: "Terminé",         color: "bg-blue-100 text-blue-700 border-blue-200",     dot: "bg-blue-500" },
];

const TABS = ["Résumé", "Milestones", "Gantt", "Ressources"] as const;

interface Owner { id: string; name: string; }
interface Task { id: string; name: string; description?: string | null; status: string; dueDate: Date; owner?: Owner | null; order: number; }
interface Milestone { id: string; name: string; description?: string | null; status: string; dueDate: Date; order: number; tasks: Task[]; }
interface TagItem { id: string; name: string; color: string; }
interface Project {
  id: string; name: string; description?: string | null; status: string;
  health: string; summary?: string | null;
  startDate: Date; endDate: Date;
  manager: { id: string; name: string; email: string };
  template?: { id: string; name: string } | null;
  milestones: Milestone[];
  tags: TagItem[];
}
interface User { id: string; name: string; email: string; role: string; }

export function ProjectDetailClient({
  project, users, allTags, currentUserRole, currentUserId,
}: {
  project: Project; users: User[]; allTags: TagItem[]; currentUserRole: string; currentUserId: string;
}) {
  const [activeTab, setActiveTab] = useState<typeof TABS[number]>("Résumé");
  const [milestones, setMilestones] = useState(project.milestones);
  const [health, setHealth] = useState(project.health);
  const [summary, setSummary] = useState(project.summary ?? "");
  const [summarySaving, setSummarySaving] = useState(false);
  const [editingSummary, setEditingSummary] = useState(false);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [manager, setManager] = useState(project.manager);
  const [editingManager, setEditingManager] = useState(false);
  const [managerSaving, setManagerSaving] = useState(false);
  const [projectTags, setProjectTags] = useState<TagItem[]>(project.tags);
  const [showTagPicker, setShowTagPicker] = useState(false);
  const [tagSaving, setTagSaving] = useState(false);

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
    setEditingSummary(false);
  }

  function cancelEdit() {
    setSummary(project.summary ?? "");
    setEditingSummary(false);
  }

  async function saveManager(newManagerId: string) {
    setManagerSaving(true);
    const res = await fetch(`/api/projects/${project.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ managerId: newManagerId }),
    });
    if (res.ok) {
      const found = users.find((u) => u.id === newManagerId);
      if (found) setManager({ id: found.id, name: found.name, email: found.email });
    }
    setManagerSaving(false);
    setEditingManager(false);
  }

  async function changeHealth(newHealth: string) {
    setHealth(newHealth);
    await fetch(`/api/projects/${project.id}/summary`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ health: newHealth }),
    });
  }

  async function toggleTag(tag: TagItem) {
    const has = projectTags.some((t) => t.id === tag.id);
    const next = has ? projectTags.filter((t) => t.id !== tag.id) : [...projectTags, tag];
    setProjectTags(next);
    setTagSaving(true);
    await fetch(`/api/projects/${project.id}/tags`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tagIds: next.map((t) => t.id) }),
    });
    setTagSaving(false);
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
                {/* Health badge */}
                <span className={`text-xs px-2.5 py-1 rounded-full font-medium border ${healthOption.color}`}>
                  {healthOption.label}
                </span>
              </div>
              <div className="flex items-center gap-4 mt-1.5 text-xs text-gray-400">
                <span className="flex items-center gap-1"><User className="w-3 h-3" />{manager.name}</span>
                <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{formatDate(project.startDate)} → {formatDate(project.endDate)}</span>
                {project.template && <span className="text-blue-400 flex items-center gap-1"><LayoutTemplate className="w-3 h-3" />{project.template.name}</span>}
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

        {/* ── Résumé ── */}
        {activeTab === "Résumé" && (
          <div className="flex gap-6 p-6">

            {/* Left: summary content */}
            <div className="flex-1 min-w-0">
              <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-100">
                  <h2 className="font-semibold text-gray-900 text-sm">Résumé du projet</h2>
                  {!editingSummary && (
                    <button
                      onClick={() => setEditingSummary(true)}
                      className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-gray-700 hover:bg-gray-100 px-2.5 py-1.5 rounded-lg transition-colors"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                      Modifier
                    </button>
                  )}
                </div>

                <div className="p-5">
                  {editingSummary ? (
                    <>
                      <RichTextEditor
                        content={summary}
                        onChange={setSummary}
                        placeholder="Décrivez l'état du projet, les risques, les décisions clés..."
                      />
                      <div className="flex items-center gap-2 mt-4">
                        <button
                          onClick={saveSummary}
                          disabled={summarySaving}
                          className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white rounded-lg text-sm font-medium transition-colors"
                        >
                          <Save className="w-3.5 h-3.5" />
                          {summarySaving ? "Sauvegarde..." : "Sauvegarder"}
                        </button>
                        <button
                          onClick={cancelEdit}
                          className="px-4 py-2 border border-gray-200 text-gray-600 rounded-lg text-sm hover:bg-gray-50 transition-colors"
                        >
                          Annuler
                        </button>
                      </div>
                    </>
                  ) : summary ? (
                    <div
                      className="prose prose-sm max-w-none text-gray-700 prose-headings:text-gray-900 prose-a:text-blue-600"
                      dangerouslySetInnerHTML={{ __html: summary }}
                    />
                  ) : (
                    <button
                      onClick={() => setEditingSummary(true)}
                      className="flex flex-col items-center justify-center w-full py-12 text-gray-300 hover:text-gray-400 border-2 border-dashed border-gray-200 hover:border-gray-300 rounded-xl transition-colors gap-2"
                    >
                      <Pencil className="w-6 h-6" />
                      <span className="text-sm">Ajouter un résumé</span>
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Right sidebar */}
            <div className="w-64 flex-shrink-0 space-y-4">

              {/* Health card */}
              <div className="bg-white rounded-xl border border-gray-200 p-4">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Statut de santé</p>
                <div className="relative group">
                  <button className={`flex items-center gap-2 w-full px-3 py-2 rounded-lg border font-medium text-sm transition-colors ${healthOption.color}`}>
                    <span className={`w-2 h-2 rounded-full flex-shrink-0 ${healthOption.dot}`} />
                    <span className="flex-1 text-left">{healthOption.label}</span>
                    <ChevronDown className="w-3.5 h-3.5 opacity-60" />
                  </button>
                  <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-lg z-20 hidden group-hover:block py-1">
                    {HEALTH_OPTIONS.map((h) => (
                      <button key={h.value} onClick={() => changeHealth(h.value)}
                        className={`flex items-center gap-2 px-3 py-2 w-full text-sm hover:bg-gray-50 transition-colors ${h.value === health ? "font-semibold" : ""}`}>
                        <span className={`w-2 h-2 rounded-full flex-shrink-0 ${h.dot}`} />
                        {h.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Project info */}
              <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-3">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Informations</p>
                <div className="flex items-start gap-2.5">
                  <User className="w-3.5 h-3.5 text-gray-400 mt-0.5 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-gray-400 mb-0.5">Chef de projet</p>
                    {editingManager ? (
                      <div className="flex items-center gap-1.5">
                        <select
                          defaultValue={manager.id}
                          onChange={(e) => saveManager(e.target.value)}
                          disabled={managerSaving}
                          autoFocus
                          className="flex-1 min-w-0 text-sm border border-blue-300 rounded-lg px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-60"
                        >
                          {users.map((u) => (
                            <option key={u.id} value={u.id}>{u.name}</option>
                          ))}
                        </select>
                        <button
                          onClick={() => setEditingManager(false)}
                          className="text-gray-400 hover:text-gray-600 p-1 rounded"
                        >
                          ✕
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between gap-1">
                        <p className="text-sm font-medium text-gray-900">{manager.name}</p>
                        <button
                          onClick={() => setEditingManager(true)}
                          className="p-1 text-gray-300 hover:text-gray-500 hover:bg-gray-100 rounded transition-colors flex-shrink-0"
                          title="Modifier le chef de projet"
                        >
                          <Pencil className="w-3 h-3" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex items-start gap-2.5">
                  <Calendar className="w-3.5 h-3.5 text-gray-400 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-xs text-gray-400 mb-0.5">Dates</p>
                    <p className="text-sm text-gray-700">{formatDate(project.startDate)}</p>
                    <p className="text-sm text-gray-700">→ {formatDate(project.endDate)}</p>
                  </div>
                </div>
                {project.template && (
                  <div className="flex items-start gap-2.5 pt-2 border-t border-gray-100">
                    <LayoutTemplate className="w-3.5 h-3.5 text-blue-400 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-xs text-gray-400 mb-0.5">Template</p>
                      <p className="text-sm text-blue-600 font-medium">{project.template.name}</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Progress */}
              <div className="bg-white rounded-xl border border-gray-200 p-4">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Avancement</p>
                <div className="flex items-end justify-between mb-1.5">
                  <span className="text-2xl font-bold text-gray-900">{progress}%</span>
                  <span className="text-xs text-gray-400 mb-1">{doneTasks} / {allTasks.length} tâches</span>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full transition-all duration-500 ${progress === 100 ? "bg-green-500" : "bg-blue-500"}`}
                    style={{ width: `${progress}%` }}
                  />
                </div>
                {progress === 100 && (
                  <p className="text-xs text-green-600 font-medium mt-2">Toutes les tâches sont terminées !</p>
                )}
              </div>

              {/* Tags */}
              {allTags.length > 0 && (
                <div className="bg-white rounded-xl border border-gray-200 p-4">
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide flex items-center gap-1.5">
                      <Tag className="w-3 h-3" /> Tags
                    </p>
                    {currentUserRole !== "MEMBER" && (
                      <button
                        onClick={() => setShowTagPicker((v) => !v)}
                        className="p-1 text-gray-300 hover:text-gray-500 hover:bg-gray-100 rounded transition-colors"
                        title="Gérer les tags"
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  {/* Current tags */}
                  <div className="flex flex-wrap gap-1.5">
                    {projectTags.length === 0 && !showTagPicker && (
                      <p className="text-xs text-gray-300">Aucun tag</p>
                    )}
                    {projectTags.map((tag) => (
                      <div key={tag.id} className="group relative">
                        <TagBadge name={tag.name} color={tag.color} size="sm" />
                        {currentUserRole !== "MEMBER" && (
                          <button
                            onClick={() => toggleTag(tag)}
                            disabled={tagSaving}
                            className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-gray-500 hover:bg-red-500 text-white rounded-full text-xs hidden group-hover:flex items-center justify-center transition-colors"
                          >
                            <X className="w-2 h-2" />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>

                  {/* Tag picker dropdown */}
                  {showTagPicker && (
                    <div className="mt-2 pt-2 border-t border-gray-100">
                      <p className="text-xs text-gray-400 mb-1.5">Ajouter un tag :</p>
                      <div className="flex flex-col gap-1">
                        {allTags
                          .filter((t) => !projectTags.some((pt) => pt.id === t.id))
                          .map((tag) => (
                            <button
                              key={tag.id}
                              onClick={() => toggleTag(tag)}
                              disabled={tagSaving}
                              className="flex items-center gap-2 w-full px-2 py-1.5 rounded-lg hover:bg-gray-50 transition-colors text-left disabled:opacity-60"
                            >
                              <TagBadge name={tag.name} color={tag.color} size="sm" />
                            </button>
                          ))
                        }
                        {allTags.filter((t) => !projectTags.some((pt) => pt.id === t.id)).length === 0 && (
                          <p className="text-xs text-gray-300 px-2">Tous les tags sont ajoutés</p>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}

            </div>
          </div>
        )}

        {/* ── Milestones ── */}
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

        {/* ── Gantt ── */}
        {activeTab === "Gantt" && (
          <div className="p-6">
            <GanttClient project={{ id: project.id, name: project.name, startDate: project.startDate, endDate: project.endDate, milestones }} />
          </div>
        )}

        {/* ── Ressources ── */}
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
