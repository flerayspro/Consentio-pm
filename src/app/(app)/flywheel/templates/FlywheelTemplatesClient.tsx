"use client";

import { useState, useEffect } from "react";
import { Plus, FileStack, ChevronDown, ChevronRight, Trash2, Star, Pencil, X } from "lucide-react";

interface WaveTemplateTask { id: string; name: string; order: number; durationDays: number; }
interface WaveTemplateMilestone { id: string; name: string; order: number; offsetDays: number; tasks: WaveTemplateTask[]; }
interface WaveTemplate {
  id: string; name: string; description: string | null; isDefault: boolean;
  milestones: WaveTemplateMilestone[];
  _count: { waves: number };
}

type TaskForm = { name: string; durationDays: number };
type MilestoneForm = { name: string; offsetDays: number; tasks: TaskForm[] };
type TemplateForm = { name: string; description: string; milestones: MilestoneForm[] };

const emptyForm = (): TemplateForm => ({
  name: "", description: "",
  milestones: [{ name: "", offsetDays: 0, tasks: [{ name: "", durationDays: 0 }] }],
});

function templateToForm(tpl: WaveTemplate): TemplateForm {
  return {
    name: tpl.name,
    description: tpl.description ?? "",
    milestones: tpl.milestones.map((m) => ({
      name: m.name,
      offsetDays: m.offsetDays,
      tasks: m.tasks.map((t) => ({ name: t.name, durationDays: t.durationDays })),
    })),
  };
}

export function FlywheelTemplatesClient({ currentUserRole, currentUserId }: {
  currentUserRole: string; currentUserId: string;
}) {
  const [templates, setTemplates] = useState<WaveTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);

  // null = fermé, "new" = création, string = id du template en édition
  const [modalMode, setModalMode] = useState<null | "new" | string>(null);
  const [form, setForm] = useState<TemplateForm>(emptyForm());

  const canEdit = currentUserRole !== "MEMBER";
  const canDelete = currentUserRole === "ADMIN";
  const isEditing = modalMode !== null && modalMode !== "new";

  useEffect(() => {
    fetch("/api/flywheel/templates")
      .then((r) => r.json())
      .then((data) => { setTemplates(data); setLoading(false); });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  void currentUserId;

  function openNew() { setForm(emptyForm()); setModalMode("new"); }
  function openEdit(tpl: WaveTemplate) { setForm(templateToForm(tpl)); setModalMode(tpl.id); }
  function closeModal() { setModalMode(null); }

  function toggleExpand(id: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  // ── Form helpers ──────────────────────────────────────────────────────────
  function addMilestone() {
    setForm((f) => ({ ...f, milestones: [...f.milestones, { name: "", offsetDays: 0, tasks: [{ name: "", durationDays: 0 }] }] }));
  }
  function removeMilestone(mi: number) {
    setForm((f) => ({ ...f, milestones: f.milestones.filter((_, i) => i !== mi) }));
  }
  function updateMilestone(mi: number, field: string, value: string | number) {
    setForm((f) => ({ ...f, milestones: f.milestones.map((m, i) => i === mi ? { ...m, [field]: value } : m) }));
  }
  function addTask(mi: number) {
    setForm((f) => ({ ...f, milestones: f.milestones.map((m, i) => i === mi ? { ...m, tasks: [...m.tasks, { name: "", durationDays: 0 }] } : m) }));
  }
  function removeTask(mi: number, ti: number) {
    setForm((f) => ({ ...f, milestones: f.milestones.map((m, i) => i === mi ? { ...m, tasks: m.tasks.filter((_, j) => j !== ti) } : m) }));
  }
  function updateTask(mi: number, ti: number, field: string, value: string | number) {
    setForm((f) => ({
      ...f,
      milestones: f.milestones.map((m, i) =>
        i === mi ? { ...m, tasks: m.tasks.map((t, j) => j === ti ? { ...t, [field]: value } : t) } : m
      ),
    }));
  }

  // ── Submit (POST = new, PUT = edit) ───────────────────────────────────────
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const payload = {
      name: form.name,
      description: form.description,
      milestones: form.milestones.map((m, i) => ({
        name: m.name,
        offsetDays: Number(m.offsetDays),
        order: i,
        tasks: m.tasks.map((t, j) => ({ name: t.name, durationDays: Number(t.durationDays), order: j })),
      })),
    };
    try {
      if (modalMode === "new") {
        const res = await fetch("/api/flywheel/templates", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (res.ok) {
          const tpl = await res.json();
          setTemplates((prev) => [...prev, tpl]);
          closeModal();
        }
      } else {
        const res = await fetch(`/api/flywheel/templates/${modalMode}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (res.ok) {
          const updated = await res.json();
          setTemplates((prev) =>
            prev.map((t) => t.id === modalMode ? { ...t, ...updated, _count: t._count } : t)
          );
          closeModal();
        }
      }
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Supprimer ce template ?")) return;
    const res = await fetch(`/api/flywheel/templates/${id}`, { method: "DELETE" });
    if (res.ok) setTemplates((prev) => prev.filter((t) => t.id !== id));
    else { const d = await res.json(); alert(d.error ?? "Erreur"); }
  }

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <FileStack className="w-5 h-5 text-emerald-600" />
            <h1 className="text-2xl font-bold text-gray-900">Templates Flywheel</h1>
          </div>
          <p className="text-gray-500 text-sm">
            {loading ? "Chargement…" : `${templates.length} template${templates.length !== 1 ? "s" : ""}`}
          </p>
        </div>
        {canEdit && (
          <button onClick={openNew}
            className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2.5 rounded-lg text-sm font-medium transition-colors">
            <Plus className="w-4 h-4" /> Nouveau template
          </button>
        )}
      </div>

      {/* Skeleton */}
      {loading && (
        <div className="space-y-4">
          {[1, 2].map((i) => <div key={i} className="h-24 bg-gray-100 rounded-xl animate-pulse" />)}
        </div>
      )}

      {/* Template list */}
      <div className="space-y-4">
        {!loading && templates.length === 0 && (
          <div className="text-center py-16">
            <FileStack className="w-12 h-12 text-gray-200 mx-auto mb-3" />
            <p className="text-gray-400">Aucun template. Créez votre premier template !</p>
          </div>
        )}

        {templates.map((tpl) => {
          const isOpen = expanded.has(tpl.id);
          const taskCount = tpl.milestones.reduce((s, m) => s + m.tasks.length, 0);

          return (
            <div key={tpl.id} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              {/* Card header */}
              <div
                className="flex items-center gap-3 p-5 cursor-pointer hover:bg-gray-50 transition-colors"
                onClick={() => toggleExpand(tpl.id)}
              >
                {isOpen
                  ? <ChevronDown className="w-4 h-4 text-gray-400 flex-shrink-0" />
                  : <ChevronRight className="w-4 h-4 text-gray-400 flex-shrink-0" />
                }
                <div className="w-10 h-10 bg-emerald-50 rounded-xl flex items-center justify-center flex-shrink-0">
                  <FileStack className="w-5 h-5 text-emerald-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-gray-900">{tpl.name}</h3>
                    {tpl.isDefault && (
                      <span className="flex items-center gap-1 text-xs bg-emerald-50 text-emerald-700 border border-emerald-100 px-2 py-0.5 rounded-full font-medium">
                        <Star className="w-3 h-3" /> Standard
                      </span>
                    )}
                  </div>
                  {tpl.description && <p className="text-sm text-gray-500 truncate mt-0.5">{tpl.description}</p>}
                  <div className="flex items-center gap-3 mt-1 text-xs text-gray-400">
                    <span>{tpl.milestones.length} phase{tpl.milestones.length !== 1 ? "s" : ""}</span>
                    <span>{taskCount} tâche{taskCount !== 1 ? "s" : ""}</span>
                    <span>{tpl._count.waves} vague{tpl._count.waves !== 1 ? "s" : ""}</span>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                  {canEdit && (
                    <button
                      onClick={() => openEdit(tpl)}
                      className="p-1.5 text-gray-400 hover:text-emerald-500 hover:bg-emerald-50 rounded-lg transition-colors"
                      title="Modifier"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                  )}
                  {canDelete && !tpl.isDefault && (
                    <button
                      onClick={() => handleDelete(tpl.id)}
                      className="p-1.5 text-gray-300 hover:text-red-400 hover:bg-red-50 rounded-lg transition-colors"
                      title="Supprimer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>

              {/* Expanded detail */}
              {isOpen && (
                <div className="border-t border-gray-100 px-5 py-4 space-y-4">
                  {tpl.milestones.map((m) => (
                    <div key={m.id} className="pl-4 border-l-2 border-emerald-100">
                      <div className="flex items-center gap-2 mb-2">
                        <h4 className="font-medium text-gray-800 text-sm">{m.name}</h4>
                        {m.offsetDays > 0 && <span className="text-xs text-gray-400">J+{m.offsetDays}</span>}
                      </div>
                      <div className="space-y-1">
                        {m.tasks.map((t) => (
                          <div key={t.id} className="flex items-center gap-2 text-sm text-gray-600">
                            <span className="w-1.5 h-1.5 bg-gray-300 rounded-full flex-shrink-0" />
                            <span className="flex-1">{t.name}</span>
                            {t.durationDays > 0 && <span className="text-xs text-gray-400">({t.durationDays}j)</span>}
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

      {/* ── Modal création / édition ─────────────────────────────────────────── */}
      {modalMode !== null && (
        <div className="fixed inset-0 bg-black/50 flex items-start justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl w-full max-w-2xl my-8 p-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-semibold text-gray-900">
                {isEditing ? "Modifier le template" : "Nouveau template"}
              </h2>
              <button onClick={closeModal} className="text-gray-400 hover:text-gray-600 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nom *</label>
                <input
                  required value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="Ex: Template Express"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none"
                />
              </div>

              {/* Phases */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Phases</label>
                <div className="space-y-3">
                  {form.milestones.map((m, mi) => (
                    <div key={mi} className="border border-gray-200 rounded-lg p-3">
                      {/* Phase header */}
                      <div className="flex gap-2 mb-2">
                        <input
                          required value={m.name}
                          onChange={(e) => updateMilestone(mi, "name", e.target.value)}
                          placeholder={`Phase ${mi + 1}`}
                          className="flex-1 px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                        />
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs text-gray-500 whitespace-nowrap">J+</span>
                          <input
                            type="number" min={0} value={m.offsetDays}
                            onChange={(e) => updateMilestone(mi, "offsetDays", Number(e.target.value))}
                            className="w-16 px-2 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                          />
                        </div>
                        {form.milestones.length > 1 && (
                          <button type="button" onClick={() => removeMilestone(mi)}
                            className="text-gray-300 hover:text-red-400 transition-colors p-1">
                            <X className="w-4 h-4" />
                          </button>
                        )}
                      </div>

                      {/* Tasks */}
                      <div className="pl-3 space-y-1.5">
                        {m.tasks.map((t, ti) => (
                          <div key={ti} className="flex gap-2 items-center">
                            <input
                              required value={t.name}
                              onChange={(e) => updateTask(mi, ti, "name", e.target.value)}
                              placeholder={`Tâche ${ti + 1}`}
                              className="flex-1 px-2.5 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                            />
                            <div className="flex items-center gap-1">
                              <input
                                type="number" min={0} value={t.durationDays}
                                onChange={(e) => updateTask(mi, ti, "durationDays", Number(e.target.value))}
                                className="w-14 px-2 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                              />
                              <span className="text-xs text-gray-400">j</span>
                            </div>
                            {m.tasks.length > 1 && (
                              <button type="button" onClick={() => removeTask(mi, ti)}
                                className="text-gray-300 hover:text-red-400 transition-colors p-0.5">
                                <X className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        ))}
                        <button type="button" onClick={() => addTask(mi)}
                          className="text-xs text-emerald-500 hover:text-emerald-700 mt-1">
                          + Tâche
                        </button>
                      </div>
                    </div>
                  ))}

                  <button type="button" onClick={addMilestone}
                    className="text-sm text-emerald-500 hover:text-emerald-700 flex items-center gap-1">
                    <Plus className="w-3.5 h-3.5" /> Ajouter une phase
                  </button>
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button type="button" onClick={closeModal}
                  className="flex-1 px-4 py-2.5 border border-gray-300 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors">
                  Annuler
                </button>
                <button type="submit" disabled={saving}
                  className="flex-1 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white px-4 py-2.5 rounded-lg text-sm font-medium transition-colors">
                  {saving ? "Sauvegarde…" : isEditing ? "Enregistrer les modifications" : "Créer le template"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
