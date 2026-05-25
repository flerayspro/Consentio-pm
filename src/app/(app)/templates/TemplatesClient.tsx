"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { formatDate } from "@/lib/utils";
import { Plus, FileStack, Trash2, ChevronDown, ChevronRight } from "lucide-react";

interface TemplateTask { id: string; name: string; durationDays: number; order: number; }
interface TemplateMilestone {
  id: string; name: string; description?: string | null;
  offsetDays: number; order: number; tasks: TemplateTask[];
}
interface Template {
  id: string; name: string; description?: string | null;
  createdAt: Date; createdBy: { id: string; name: string };
  milestones: TemplateMilestone[];
  _count: { projects: number };
}

export function TemplatesClient({ templates: initial, currentUserRole }: {
  templates: Template[]; currentUserRole: string;
}) {
  const router = useRouter();
  const [templates, setTemplates] = useState(initial);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [showNew, setShowNew] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: "", description: "",
    milestones: [{ name: "", offsetDays: 0, tasks: [{ name: "", durationDays: 1 }] }],
  });

  const canDelete = currentUserRole === "ADMIN";

  function toggleExpand(id: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function addMilestoneToForm() {
    setForm((f) => ({
      ...f,
      milestones: [...f.milestones, { name: "", offsetDays: 0, tasks: [{ name: "", durationDays: 1 }] }],
    }));
  }

  function addTaskToMilestone(mIdx: number) {
    setForm((f) => ({
      ...f,
      milestones: f.milestones.map((m, i) =>
        i === mIdx ? { ...m, tasks: [...m.tasks, { name: "", durationDays: 1 }] } : m
      ),
    }));
  }

  function updateMilestone(mIdx: number, field: string, value: string | number) {
    setForm((f) => ({
      ...f,
      milestones: f.milestones.map((m, i) => (i === mIdx ? { ...m, [field]: value } : m)),
    }));
  }

  function updateTask(mIdx: number, tIdx: number, field: string, value: string | number) {
    setForm((f) => ({
      ...f,
      milestones: f.milestones.map((m, i) =>
        i === mIdx
          ? { ...m, tasks: m.tasks.map((t, j) => (j === tIdx ? { ...t, [field]: value } : t)) }
          : m
      ),
    }));
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch("/api/templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          description: form.description,
          milestones: form.milestones.map((m, i) => ({
            name: m.name,
            offsetDays: Number(m.offsetDays),
            order: i,
            tasks: m.tasks.map((t, j) => ({
              name: t.name,
              durationDays: Number(t.durationDays),
              order: j,
            })),
          })),
        }),
      });
      if (res.ok) {
        setShowNew(false);
        router.refresh();
      }
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Supprimer ce template ?")) return;
    const res = await fetch(`/api/templates/${id}`, { method: "DELETE" });
    if (res.ok) setTemplates((t) => t.filter((tmpl) => tmpl.id !== id));
  }

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Templates de projet</h1>
          <p className="text-gray-500 mt-1">{templates.length} template(s)</p>
        </div>
        <button
          onClick={() => setShowNew(true)}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-lg text-sm font-medium transition-colors"
        >
          <Plus className="w-4 h-4" />
          Nouveau template
        </button>
      </div>

      <div className="space-y-4">
        {templates.length === 0 && (
          <div className="text-center py-16">
            <FileStack className="w-12 h-12 text-gray-200 mx-auto mb-3" />
            <p className="text-gray-400">Aucun template. Créez votre premier template !</p>
          </div>
        )}

        {templates.map((tmpl) => {
          const isExpanded = expanded.has(tmpl.id);
          const totalTasks = tmpl.milestones.reduce((sum, m) => sum + m.tasks.length, 0);

          return (
            <div key={tmpl.id} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <div
                className="flex items-center gap-3 p-5 cursor-pointer hover:bg-gray-50"
                onClick={() => toggleExpand(tmpl.id)}
              >
                {isExpanded ? (
                  <ChevronDown className="w-4 h-4 text-gray-400 flex-shrink-0" />
                ) : (
                  <ChevronRight className="w-4 h-4 text-gray-400 flex-shrink-0" />
                )}
                <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center flex-shrink-0">
                  <FileStack className="w-5 h-5 text-blue-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-gray-900">{tmpl.name}</h3>
                  {tmpl.description && (
                    <p className="text-sm text-gray-500 truncate">{tmpl.description}</p>
                  )}
                  <div className="flex items-center gap-3 mt-1 text-xs text-gray-400">
                    <span>{tmpl.milestones.length} milestone(s)</span>
                    <span>{totalTasks} tâche(s)</span>
                    <span>{tmpl._count.projects} projet(s) créé(s)</span>
                    <span>Par {tmpl.createdBy.name}</span>
                  </div>
                </div>
                {canDelete && (
                  <button
                    onClick={(e) => { e.stopPropagation(); handleDelete(tmpl.id); }}
                    className="p-1.5 text-gray-300 hover:text-red-400 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>

              {isExpanded && (
                <div className="border-t border-gray-100 px-5 py-4 space-y-4">
                  {tmpl.milestones.map((m) => (
                    <div key={m.id} className="pl-4 border-l-2 border-blue-100">
                      <div className="flex items-center gap-2 mb-2">
                        <h4 className="font-medium text-gray-800 text-sm">{m.name}</h4>
                        <span className="text-xs text-gray-400">J+{m.offsetDays}</span>
                      </div>
                      <div className="space-y-1">
                        {m.tasks.map((t) => (
                          <div key={t.id} className="flex items-center gap-2 text-sm text-gray-600">
                            <span className="w-1.5 h-1.5 bg-gray-300 rounded-full flex-shrink-0" />
                            <span>{t.name}</span>
                            <span className="text-xs text-gray-400">({t.durationDays}j)</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Modal nouveau template */}
      {showNew && (
        <div className="fixed inset-0 bg-black/50 flex items-start justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl w-full max-w-2xl my-8 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-5">Nouveau template</h2>
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nom *</label>
                <input
                  required value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Ex: Onboarding Client"
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

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Milestones</label>
                <div className="space-y-3">
                  {form.milestones.map((m, mIdx) => (
                    <div key={mIdx} className="border border-gray-200 rounded-lg p-3">
                      <div className="flex gap-2 mb-2">
                        <input
                          required value={m.name}
                          onChange={(e) => updateMilestone(mIdx, "name", e.target.value)}
                          placeholder={`Milestone ${mIdx + 1}`}
                          className="flex-1 px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                        <div className="flex items-center gap-1.5">
                          <label className="text-xs text-gray-500 whitespace-nowrap">J+</label>
                          <input
                            type="number" min={0} value={m.offsetDays}
                            onChange={(e) => updateMilestone(mIdx, "offsetDays", Number(e.target.value))}
                            className="w-16 px-2 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        </div>
                      </div>
                      <div className="pl-3 space-y-1.5">
                        {m.tasks.map((t, tIdx) => (
                          <div key={tIdx} className="flex gap-2">
                            <input
                              required value={t.name}
                              onChange={(e) => updateTask(mIdx, tIdx, "name", e.target.value)}
                              placeholder={`Tâche ${tIdx + 1}`}
                              className="flex-1 px-2.5 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                            <div className="flex items-center gap-1">
                              <input
                                type="number" min={1} value={t.durationDays}
                                onChange={(e) => updateTask(mIdx, tIdx, "durationDays", Number(e.target.value))}
                                className="w-14 px-2 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                              />
                              <span className="text-xs text-gray-400">j</span>
                            </div>
                          </div>
                        ))}
                        <button
                          type="button"
                          onClick={() => addTaskToMilestone(mIdx)}
                          className="text-xs text-blue-500 hover:text-blue-700 mt-1"
                        >
                          + Tâche
                        </button>
                      </div>
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={addMilestoneToForm}
                    className="text-sm text-blue-500 hover:text-blue-700 flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" /> Ajouter une milestone
                  </button>
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowNew(false)}
                  className="flex-1 px-4 py-2.5 border border-gray-300 rounded-lg text-sm font-medium hover:bg-gray-50"
                >
                  Annuler
                </button>
                <button
                  type="submit" disabled={saving}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white px-4 py-2.5 rounded-lg text-sm font-medium"
                >
                  {saving ? "Création..." : "Créer le template"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
