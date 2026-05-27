"use client";

import { useState, useEffect } from "react";
import { Plus, FileStack, ChevronDown, Trash2, Star, Layers } from "lucide-react";

interface WaveTemplateTask { id: string; name: string; owner: string; order: number; durationDays: number; }
interface WaveTemplateMilestone { id: string; name: string; owner: string; order: number; offsetDays: number; tasks: WaveTemplateTask[]; }
interface WaveTemplate {
  id: string; name: string; description: string | null; isDefault: boolean;
  milestones: WaveTemplateMilestone[];
  _count: { waves: number };
}

const OWNER_COLORS: Record<string, string> = {
  Consentio:    "bg-blue-100 text-blue-700",
  Client:       "bg-purple-100 text-purple-700",
  Fournisseurs: "bg-orange-100 text-orange-700",
};

export function FlywheelTemplatesClient({ currentUserRole, currentUserId }: {
  currentUserRole: string; currentUserId: string;
}) {
  const [templates, setTemplates] = useState<WaveTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [openIds, setOpenIds] = useState<Set<string>>(new Set());
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({
    name: "",
    description: "",
    milestones: [{ name: "", owner: "Consentio", offsetDays: 0, tasks: [{ name: "", owner: "Consentio", durationDays: 0 }] }],
  });

  const canEdit = currentUserRole !== "MEMBER";

  useEffect(() => {
    fetch("/api/flywheel/templates")
      .then((r) => r.json())
      .then((data) => { setTemplates(data); setLoading(false); });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function toggleOpen(id: string) {
    setOpenIds((prev) => {
      const s = new Set(prev);
      s.has(id) ? s.delete(id) : s.add(id);
      return s;
    });
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setCreating(true);
    const res = await fetch("/api/flywheel/templates", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: form.name,
        description: form.description || undefined,
        milestones: form.milestones.map((m, mi) => ({
          name: m.name, owner: m.owner, order: mi, offsetDays: m.offsetDays,
          tasks: m.tasks.map((t, ti) => ({ name: t.name, owner: t.owner, order: ti, durationDays: t.durationDays })),
        })),
      }),
    });
    if (res.ok) {
      const tpl = await res.json();
      setTemplates((prev) => [...prev, tpl]);
      setShowModal(false);
      setForm({ name: "", description: "", milestones: [{ name: "", owner: "Consentio", offsetDays: 0, tasks: [{ name: "", owner: "Consentio", durationDays: 0 }] }] });
    }
    setCreating(false);
  }

  async function handleDelete(id: string) {
    if (!confirm("Supprimer ce template ?")) return;
    const res = await fetch(`/api/flywheel/templates/${id}`, { method: "DELETE" });
    if (res.ok) setTemplates((prev) => prev.filter((t) => t.id !== id));
    else { const d = await res.json(); alert(d.error ?? "Erreur"); }
  }

  function addMilestone() {
    setForm((f) => ({ ...f, milestones: [...f.milestones, { name: "", owner: "Consentio", offsetDays: 0, tasks: [{ name: "", owner: "Consentio", durationDays: 0 }] }] }));
  }
  function removeMilestone(mi: number) {
    setForm((f) => ({ ...f, milestones: f.milestones.filter((_, i) => i !== mi) }));
  }
  function addTask(mi: number) {
    setForm((f) => {
      const ms = [...f.milestones];
      ms[mi] = { ...ms[mi], tasks: [...ms[mi].tasks, { name: "", owner: "Consentio", durationDays: 0 }] };
      return { ...f, milestones: ms };
    });
  }
  function removeTask(mi: number, ti: number) {
    setForm((f) => {
      const ms = [...f.milestones];
      ms[mi] = { ...ms[mi], tasks: ms[mi].tasks.filter((_, i) => i !== ti) };
      return { ...f, milestones: ms };
    });
  }

  void currentUserId;

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <FileStack className="w-5 h-5 text-emerald-600" />
            <h1 className="text-2xl font-bold text-gray-900">Templates Flywheel</h1>
          </div>
          <p className="text-gray-500 text-sm">Bibliothèque de templates pour les vagues d'activation</p>
        </div>
        {canEdit && (
          <button onClick={() => setShowModal(true)}
            className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2.5 rounded-lg text-sm font-medium transition-colors">
            <Plus className="w-4 h-4" /> Nouveau template
          </button>
        )}
      </div>

      {loading && (
        <div className="grid gap-4">
          {[1, 2].map((i) => <div key={i} className="h-24 bg-gray-100 rounded-xl animate-pulse" />)}
        </div>
      )}

      <div className="grid gap-4">
        {templates.map((tpl) => {
          const isOpen = openIds.has(tpl.id);
          const taskCount = tpl.milestones.reduce((s, m) => s + m.tasks.length, 0);
          return (
            <div key={tpl.id} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <button
                onClick={() => toggleOpen(tpl.id)}
                className="w-full flex items-center gap-3 px-5 py-4 hover:bg-gray-50 transition-colors text-left"
              >
                <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform flex-shrink-0 ${isOpen ? "" : "-rotate-90"}`} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-gray-900">{tpl.name}</span>
                    {tpl.isDefault && (
                      <span className="flex items-center gap-1 text-xs bg-emerald-50 text-emerald-700 border border-emerald-100 px-2 py-0.5 rounded-full font-medium">
                        <Star className="w-3 h-3" /> Standard
                      </span>
                    )}
                  </div>
                  {tpl.description && <p className="text-sm text-gray-400 mt-0.5">{tpl.description}</p>}
                  <div className="flex items-center gap-3 mt-1 text-xs text-gray-400">
                    <span className="flex items-center gap-1"><Layers className="w-3 h-3" />{tpl.milestones.length} phases</span>
                    <span>{taskCount} tâches</span>
                    <span>{tpl._count.waves} vague{tpl._count.waves !== 1 ? "s" : ""}</span>
                  </div>
                </div>
                {canEdit && !tpl.isDefault && (
                  <button
                    onClick={(e) => { e.stopPropagation(); handleDelete(tpl.id); }}
                    className="p-2 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors flex-shrink-0"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </button>

              {isOpen && (
                <div className="border-t border-gray-100 divide-y divide-gray-50">
                  {tpl.milestones.map((m) => (
                    <div key={m.id} className="px-6 py-3">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-sm font-medium text-gray-700">{m.name}</span>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${OWNER_COLORS[m.owner] ?? "bg-gray-100 text-gray-600"}`}>{m.owner}</span>
                        {m.offsetDays > 0 && <span className="text-xs text-gray-400">J+{m.offsetDays}</span>}
                      </div>
                      <div className="space-y-1 pl-3 border-l-2 border-gray-100">
                        {m.tasks.map((t) => (
                          <div key={t.id} className="flex items-center gap-2 text-sm">
                            <span className="text-gray-500 flex-1">{t.name}</span>
                            <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${OWNER_COLORS[t.owner] ?? "bg-gray-100 text-gray-600"}`}>{t.owner}</span>
                            {t.durationDays > 0 && <span className="text-xs text-gray-300">{t.durationDays}j</span>}
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

      {/* Modal création template */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-start justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl w-full max-w-2xl p-6 my-8">
            <h2 className="text-lg font-semibold text-gray-900 mb-5">Nouveau template</h2>
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nom du template *</label>
                <input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="Ex: Template Vague Express"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" />
              </div>

              {/* Milestones */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-medium text-gray-700">Phases</label>
                  <button type="button" onClick={addMilestone}
                    className="text-xs text-emerald-600 hover:text-emerald-700 font-medium flex items-center gap-1">
                    <Plus className="w-3 h-3" /> Ajouter une phase
                  </button>
                </div>
                <div className="space-y-3">
                  {form.milestones.map((m, mi) => (
                    <div key={mi} className="border border-gray-200 rounded-xl p-3 space-y-2">
                      <div className="flex gap-2 items-center">
                        <input value={m.name} onChange={(e) => {
                          const ms = [...form.milestones]; ms[mi] = { ...ms[mi], name: e.target.value }; setForm({ ...form, milestones: ms });
                        }} placeholder="Nom de la phase" required
                          className="flex-1 px-2.5 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-emerald-400" />
                        <select value={m.owner} onChange={(e) => {
                          const ms = [...form.milestones]; ms[mi] = { ...ms[mi], owner: e.target.value }; setForm({ ...form, milestones: ms });
                        }} className="px-2 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-emerald-400">
                          <option>Consentio</option><option>Client</option><option>Fournisseurs</option>
                        </select>
                        <input type="number" value={m.offsetDays} min={0}
                          onChange={(e) => {
                            const ms = [...form.milestones]; ms[mi] = { ...ms[mi], offsetDays: +e.target.value }; setForm({ ...form, milestones: ms });
                          }}
                          title="Décalage en jours depuis le début"
                          className="w-16 px-2 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-emerald-400"
                          placeholder="J+"
                        />
                        {form.milestones.length > 1 && (
                          <button type="button" onClick={() => removeMilestone(mi)} className="text-gray-300 hover:text-red-500 p-1 rounded">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                      {/* Tasks */}
                      <div className="space-y-1.5 pl-2">
                        {m.tasks.map((t, ti) => (
                          <div key={ti} className="flex gap-2 items-center">
                            <input value={t.name} onChange={(e) => {
                              const ms = [...form.milestones]; const ts = [...ms[mi].tasks]; ts[ti] = { ...ts[ti], name: e.target.value }; ms[mi] = { ...ms[mi], tasks: ts }; setForm({ ...form, milestones: ms });
                            }} placeholder="Nom de la tâche" required
                              className="flex-1 px-2 py-1 border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-emerald-400" />
                            <select value={t.owner} onChange={(e) => {
                              const ms = [...form.milestones]; const ts = [...ms[mi].tasks]; ts[ti] = { ...ts[ti], owner: e.target.value }; ms[mi] = { ...ms[mi], tasks: ts }; setForm({ ...form, milestones: ms });
                            }} className="px-2 py-1 border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-emerald-400">
                              <option>Consentio</option><option>Client</option><option>Fournisseurs</option>
                            </select>
                            <input type="number" value={t.durationDays} min={0}
                              onChange={(e) => {
                                const ms = [...form.milestones]; const ts = [...ms[mi].tasks]; ts[ti] = { ...ts[ti], durationDays: +e.target.value }; ms[mi] = { ...ms[mi], tasks: ts }; setForm({ ...form, milestones: ms });
                              }}
                              className="w-14 px-2 py-1 border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-emerald-400"
                              placeholder="Durée"
                            />
                            {m.tasks.length > 1 && (
                              <button type="button" onClick={() => removeTask(mi, ti)} className="text-gray-300 hover:text-red-500 p-0.5 rounded">
                                <Trash2 className="w-3 h-3" />
                              </button>
                            )}
                          </div>
                        ))}
                        <button type="button" onClick={() => addTask(mi)}
                          className="text-xs text-gray-400 hover:text-emerald-600 flex items-center gap-1 mt-1">
                          <Plus className="w-3 h-3" /> Tâche
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowModal(false)}
                  className="flex-1 px-4 py-2.5 border border-gray-300 rounded-lg text-sm font-medium hover:bg-gray-50">
                  Annuler
                </button>
                <button type="submit" disabled={creating}
                  className="flex-1 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white px-4 py-2.5 rounded-lg text-sm font-medium transition-colors">
                  {creating ? "Création..." : "Créer le template"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
