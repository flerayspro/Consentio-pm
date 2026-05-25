"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { formatDate, isOverdue, getStatusLabel } from "@/lib/utils";
import { Plus, Search, AlertTriangle, CheckCircle2, Clock, ChevronRight } from "lucide-react";
import { isBefore } from "date-fns";

interface Task { id: string; status: string; dueDate: Date; }
interface Milestone { id: string; tasks: Task[]; }
interface Project {
  id: string; name: string; description?: string | null;
  status: string; startDate: Date; endDate: Date;
  manager: { id: string; name: string };
  milestones: Milestone[];
}
interface User { id: string; name: string; email: string; }
interface Template { id: string; name: string; }

function getProgress(project: Project) {
  const tasks = project.milestones.flatMap((m) => m.tasks);
  if (tasks.length === 0) return 0;
  return Math.round((tasks.filter((t) => t.status === "DONE").length / tasks.length) * 100);
}

const STATUS_COLORS: Record<string, string> = {
  ACTIVE: "bg-blue-100 text-blue-700",
  COMPLETED: "bg-green-100 text-green-700",
  ON_HOLD: "bg-yellow-100 text-yellow-700",
  CANCELLED: "bg-gray-100 text-gray-600",
};

export function ProjectsClient({
  projects, users, templates, currentUserRole, currentUserId,
}: {
  projects: Project[]; users: User[]; templates: Template[];
  currentUserRole: string; currentUserId: string;
}) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("ALL");
  const [showNewModal, setShowNewModal] = useState(false);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({
    name: "", description: "", startDate: "", endDate: "",
    managerId: currentUserId, templateId: "",
  });

  const filtered = projects.filter((p) => {
    const matchSearch = p.name.toLowerCase().includes(search.toLowerCase());
    const matchFilter = filter === "ALL" || p.status === filter;
    return matchSearch && matchFilter;
  });

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setCreating(true);
    try {
      const res = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, templateId: form.templateId || undefined }),
      });
      if (res.ok) {
        const project = await res.json();
        setShowNewModal(false);
        router.push(`/projects/${project.id}`);
        router.refresh();
      }
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Projets</h1>
          <p className="text-gray-500 mt-1">{projects.length} projet(s) au total</p>
        </div>
        {currentUserRole !== "MEMBER" && (
          <button
            onClick={() => setShowNewModal(true)}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-lg text-sm font-medium transition-colors"
          >
            <Plus className="w-4 h-4" />
            Nouveau projet
          </button>
        )}
      </div>

      <div className="flex gap-3 mb-6">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher un projet..."
            className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="ALL">Tous les statuts</option>
          <option value="ACTIVE">Actif</option>
          <option value="COMPLETED">Terminé</option>
          <option value="ON_HOLD">En pause</option>
          <option value="CANCELLED">Annulé</option>
        </select>
      </div>

      <div className="grid gap-4">
        {filtered.length === 0 && (
          <div className="text-center py-16 text-gray-400">
            <FolderEmpty />
            <p className="mt-3">Aucun projet trouvé</p>
          </div>
        )}
        {filtered.map((project) => {
          const progress = getProgress(project);
          const overdue = isBefore(new Date(project.endDate), new Date()) && project.status === "ACTIVE";
          const overdueTasks = project.milestones.flatMap((m) => m.tasks)
            .filter((t) => t.status !== "DONE" && isOverdue(t.dueDate)).length;

          return (
            <Link
              key={project.id}
              href={`/projects/${project.id}`}
              className="bg-white rounded-xl border border-gray-200 p-5 hover:border-blue-300 hover:shadow-sm transition-all group"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-semibold text-gray-900 group-hover:text-blue-700 transition-colors">
                      {project.name}
                    </h3>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[project.status]}`}>
                      {getStatusLabel(project.status)}
                    </span>
                    {overdue && (
                      <span className="flex items-center gap-1 text-xs text-red-600 bg-red-50 px-2 py-0.5 rounded-full border border-red-100">
                        <AlertTriangle className="w-3 h-3" /> En retard
                      </span>
                    )}
                    {!overdue && overdueTasks > 0 && (
                      <span className="flex items-center gap-1 text-xs text-orange-600 bg-orange-50 px-2 py-0.5 rounded-full border border-orange-100">
                        <Clock className="w-3 h-3" /> {overdueTasks} tâche(s) en retard
                      </span>
                    )}
                  </div>
                  {project.description && (
                    <p className="text-sm text-gray-500 mb-3 truncate">{project.description}</p>
                  )}
                  <div className="flex items-center gap-4 text-xs text-gray-400">
                    <span>Chef: {project.manager.name}</span>
                    <span>Début: {formatDate(project.startDate)}</span>
                    <span>Fin: {formatDate(project.endDate)}</span>
                    <span>{project.milestones.length} milestone(s)</span>
                  </div>
                </div>
                <div className="flex items-center gap-4 ml-4">
                  <div className="text-right">
                    <p className="text-sm font-semibold text-gray-900">{progress}%</p>
                    <div className="w-24 bg-gray-100 rounded-full h-1.5 mt-1">
                      <div
                        className={`h-1.5 rounded-full ${progress === 100 ? "bg-green-500" : overdue ? "bg-red-400" : "bg-blue-500"}`}
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-blue-400 transition-colors" />
                </div>
              </div>
            </Link>
          );
        })}
      </div>

      {/* Modal nouveau projet */}
      {showNewModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-5">Nouveau projet</h2>
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nom du projet *</label>
                <input
                  required value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Ex: Onboarding Client ABC"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Date de début *</label>
                  <input
                    type="date" required value={form.startDate}
                    onChange={(e) => setForm({ ...form, startDate: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Date de fin *</label>
                  <input
                    type="date" required value={form.endDate}
                    onChange={(e) => setForm({ ...form, endDate: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Chef de projet *</label>
                <select
                  required value={form.managerId}
                  onChange={(e) => setForm({ ...form, managerId: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {users.map((u) => (
                    <option key={u.id} value={u.id}>{u.name}</option>
                  ))}
                </select>
              </div>
              {templates.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Template (optionnel)
                  </label>
                  <select
                    value={form.templateId}
                    onChange={(e) => setForm({ ...form, templateId: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Aucun template</option>
                    {templates.map((t) => (
                      <option key={t.id} value={t.id}>{t.name}</option>
                    ))}
                  </select>
                </div>
              )}
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowNewModal(false)}
                  className="flex-1 px-4 py-2.5 border border-gray-300 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
                >
                  Annuler
                </button>
                <button
                  type="submit" disabled={creating}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white px-4 py-2.5 rounded-lg text-sm font-medium transition-colors"
                >
                  {creating ? "Création..." : "Créer le projet"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function FolderEmpty() {
  return (
    <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto">
      <svg className="w-8 h-8 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
          d="M3 7a2 2 0 012-2h4l2 2h8a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V7z" />
      </svg>
    </div>
  );
}
