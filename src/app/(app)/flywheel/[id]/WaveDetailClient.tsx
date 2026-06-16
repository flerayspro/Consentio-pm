"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import dynamic from "next/dynamic";
import { formatDate } from "@/lib/utils";
import {
  ChevronLeft, Calendar, User, Save, Pencil,
  Building2, ChevronDown, Trash2, AlertTriangle, Tag, Plus, X,
} from "lucide-react";
import { TagBadge } from "@/components/ui/TagBadge";
import { SuppliersTab } from "./tabs/SuppliersTab";
import { WaveMilestonesTab } from "./tabs/WaveMilestonesTab";
import { WaveTaskPanel } from "./WaveTaskPanel";

const RichTextEditor = dynamic(
  () => import("@/components/editor/RichTextEditor").then((m) => m.RichTextEditor),
  { ssr: false }
);

const WaveGanttTab = dynamic(
  () => import("./tabs/WaveGanttTab").then((m) => m.WaveGanttTab),
  { ssr: false }
);

const TABS = ["Résumé", "Milestones", "Gantt", "Fournisseurs"] as const;

const STATUS_OPTIONS = [
  { value: "ACTIVE",    label: "Active",    color: "bg-emerald-100 text-emerald-700 border-emerald-200" },
  { value: "COMPLETED", label: "Terminée",  color: "bg-blue-100 text-blue-700 border-blue-200" },
  { value: "ON_HOLD",   label: "En pause",  color: "bg-yellow-100 text-yellow-700 border-yellow-200" },
  { value: "CANCELLED", label: "Annulée",   color: "bg-gray-100 text-gray-600 border-gray-200" },
];

interface WaveTask {
  id: string; name: string; description?: string | null; status: string;
  startDate?: Date | null; dueDate: Date; order: number;
  assignee?: { id: string; name: string } | null;
}
interface WaveMilestone { id: string; name: string; status: string; startDate?: Date | null; dueDate: Date; order: number; tasks: WaveTask[]; }
interface WaveSupplier {
  id: string; waveId: string; supplierName: string; supplierCode: string | null;
  email: string | null; firstName: string | null; lastName: string | null;
  phone: string | null; language: string | null; status: string; workspaceId: string | null;
  action: string; callAttempts: number; comments: string | null; accountCreated: boolean;
  registeredWebinar: boolean; assistedWebinar: boolean; configured: boolean; productFamilies: string[];
  ownerId: string | null; owner: { id: string; name: string } | null;
}
interface TagItem { id: string; name: string; color: string; }
interface Wave {
  id: string; name: string; clientName: string; status: string;
  startDate: Date; endDate: Date; summary: string | null;
  manager: { id: string; name: string; email: string };
  milestones: WaveMilestone[];
  suppliers: WaveSupplier[];
  tags: TagItem[];
}
interface User { id: string; name: string; email: string; role: string; }

export function WaveDetailClient({ wave, users, allTags, currentUserRole, currentUserId }: {
  wave: Wave; users: User[]; allTags: TagItem[]; currentUserRole: string; currentUserId: string;
}) {
  const [activeTab, setActiveTab] = useState<typeof TABS[number]>("Résumé");
  const [milestones, setMilestones] = useState<WaveMilestone[]>(wave.milestones);
  const [summary, setSummary] = useState(wave.summary ?? "");
  const [editingSummary, setEditingSummary] = useState(false);
  const [summarySaving, setSummarySaving] = useState(false);
  const [status, setStatus] = useState(wave.status);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [waveName, setWaveName] = useState(wave.name);
  const [manager, setManager] = useState(wave.manager);
  const [editingManager, setEditingManager] = useState(false);
  const [managerSaving, setManagerSaving] = useState(false);
  const [waveTags, setWaveTags] = useState<TagItem[]>(wave.tags);
  const [showTagPicker, setShowTagPicker] = useState(false);
  const [tagSaving, setTagSaving] = useState(false);

  const router = useRouter();
  const canEdit = currentUserRole !== "MEMBER";

  const allTasks = milestones.flatMap((m) => m.tasks);
  const doneTasks = allTasks.filter((t) => t.status === "DONE").length;
  const progress = allTasks.length > 0 ? Math.round((doneTasks / allTasks.length) * 100) : 0;
  const statusOpt = STATUS_OPTIONS.find((s) => s.value === status) ?? STATUS_OPTIONS[0];

  async function saveSummary() {
    setSummarySaving(true);
    await fetch(`/api/waves/${wave.id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ summary }),
    });
    setSummarySaving(false);
    setEditingSummary(false);
  }

  async function changeStatus(v: string) {
    setStatus(v);
    await fetch(`/api/waves/${wave.id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: v }),
    });
  }

  async function deleteWave() {
    setDeleting(true);
    const res = await fetch(`/api/waves/${wave.id}`, { method: "DELETE" });
    if (res.ok) {
      router.push("/flywheel");
    } else {
      setDeleting(false);
      setShowDeleteConfirm(false);
    }
  }

  async function saveWaveName() {
    if (!waveName.trim() || waveName === wave.name) return;
    await fetch(`/api/waves/${wave.id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: waveName.trim() }),
    });
  }

  async function saveManager(newManagerId: string) {
    setManagerSaving(true);
    const res = await fetch(`/api/waves/${wave.id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ managerId: newManagerId }),
    });
    if (res.ok) {
      const found = users.find((u) => u.id === newManagerId);
      if (found) setManager({ id: found.id, name: found.name, email: found.email });
    }
    setManagerSaving(false);
    setEditingManager(false);
  }

  async function toggleTag(tag: TagItem) {
    const has = waveTags.some((t) => t.id === tag.id);
    const next = has ? waveTags.filter((t) => t.id !== tag.id) : [...waveTags, tag];
    setWaveTags(next);
    setTagSaving(true);
    await fetch(`/api/waves/${wave.id}/tags`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tagIds: next.map((t) => t.id) }),
    });
    setTagSaving(false);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function handleTaskUpdate(taskId: string, updated: Record<string, any>) {
    setMilestones((prev) => prev.map((m) => ({
      ...m,
      tasks: m.tasks.map((t) => t.id === taskId ? { ...t, ...updated } : t),
    })));
  }


  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4 flex-shrink-0">
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-3">
            <Link href="/flywheel" className="mt-1 p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors">
              <ChevronLeft className="w-4 h-4" />
            </Link>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <input
                  value={waveName}
                  onChange={(e) => setWaveName(e.target.value)}
                  onBlur={saveWaveName}
                  className="text-xl font-bold text-gray-900 bg-transparent border-b border-transparent hover:border-gray-300 focus:border-emerald-400 focus:outline-none pb-0.5 transition-colors min-w-[200px]"
                />
                <span className={`text-xs px-2.5 py-1 rounded-full font-medium border ${statusOpt.color}`}>
                  {statusOpt.label}
                </span>
                <span className="text-xs px-2 py-1 bg-gray-50 border border-gray-200 rounded-full text-gray-500 flex items-center gap-1">
                  <Building2 className="w-3 h-3" /> {wave.clientName}
                </span>
              </div>
              <div className="flex items-center gap-4 mt-1.5 text-xs text-gray-400">
                <span className="flex items-center gap-1"><User className="w-3 h-3" />{manager.name}</span>
                <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{formatDate(wave.startDate)} → {formatDate(wave.endDate)}</span>
                <span>{wave.suppliers.length} fournisseur{wave.suppliers.length !== 1 ? "s" : ""}</span>
              </div>
            </div>
          </div>
          {/* Progress */}
          <div className="text-right flex-shrink-0">
            <p className="text-sm font-semibold text-gray-900">{progress}%</p>
            <div className="w-32 bg-gray-100 rounded-full h-1.5 mt-1">
              <div className={`h-1.5 rounded-full ${progress === 100 ? "bg-emerald-600" : "bg-emerald-400"}`} style={{ width: `${progress}%` }} />
            </div>
            <p className="text-xs text-gray-400 mt-0.5">{doneTasks}/{allTasks.length} tâches</p>
          </div>
        </div>

        <div className="flex gap-0 mt-4 border-b border-gray-100 -mb-px">
          {TABS.map((tab) => (
            <button key={tab} onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab ? "border-emerald-600 text-emerald-700" : "border-transparent text-gray-500 hover:text-gray-700"
              }`}>
              {tab}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">

        {/* ── Résumé ── */}
        {activeTab === "Résumé" && (
          <div className="flex gap-6 p-6">
            {/* Gauche : résumé riche */}
            <div className="flex-1 min-w-0">
              <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-100">
                  <h2 className="font-semibold text-gray-900 text-sm">Résumé de la vague</h2>
                  {!editingSummary && canEdit && (
                    <button onClick={() => setEditingSummary(true)}
                      className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-gray-700 hover:bg-gray-100 px-2.5 py-1.5 rounded-lg transition-colors">
                      <Pencil className="w-3.5 h-3.5" /> Modifier
                    </button>
                  )}
                </div>
                <div className="p-5">
                  {editingSummary ? (
                    <>
                      <RichTextEditor content={summary} onChange={setSummary} placeholder="Décrivez l'état de la vague, les points d'attention, les décisions clés..." />
                      <div className="flex gap-2 mt-4">
                        <button onClick={saveSummary} disabled={summarySaving}
                          className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white rounded-lg text-sm font-medium transition-colors">
                          <Save className="w-3.5 h-3.5" />{summarySaving ? "Sauvegarde..." : "Sauvegarder"}
                        </button>
                        <button onClick={() => { setSummary(wave.summary ?? ""); setEditingSummary(false); }}
                          className="px-4 py-2 border border-gray-200 text-gray-600 rounded-lg text-sm hover:bg-gray-50 transition-colors">
                          Annuler
                        </button>
                      </div>
                    </>
                  ) : summary ? (
                    <div className="prose prose-sm max-w-none text-gray-700 prose-headings:text-gray-900 prose-a:text-emerald-600"
                      dangerouslySetInnerHTML={{ __html: summary }} />
                  ) : (
                    <button onClick={() => canEdit && setEditingSummary(true)}
                      className="flex flex-col items-center justify-center w-full py-12 text-gray-300 hover:text-gray-400 border-2 border-dashed border-gray-200 hover:border-gray-300 rounded-xl transition-colors gap-2">
                      <Pencil className="w-6 h-6" />
                      <span className="text-sm">{canEdit ? "Ajouter un résumé" : "Aucun résumé"}</span>
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Droite : sidebar infos */}
            <div className="w-64 flex-shrink-0 space-y-4">
              {/* Statut */}
              <div className="bg-white rounded-xl border border-gray-200 p-4">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Statut de la vague</p>
                <div className="relative group">
                  <button className={`flex items-center gap-2 w-full px-3 py-2 rounded-lg border font-medium text-sm transition-colors ${statusOpt.color}`}>
                    <span className="flex-1 text-left">{statusOpt.label}</span>
                    <ChevronDown className="w-3.5 h-3.5 opacity-60" />
                  </button>
                  {canEdit && (
                    <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-lg z-20 hidden group-hover:block py-1">
                      {STATUS_OPTIONS.map((opt) => (
                        <button key={opt.value} onClick={() => changeStatus(opt.value)}
                          className={`flex items-center gap-2 px-3 py-2 w-full text-sm hover:bg-gray-50 transition-colors ${opt.value === status ? "font-semibold" : ""}`}>
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Infos */}
              <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-3">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Informations</p>
                <div className="flex items-start gap-2.5">
                  <Building2 className="w-3.5 h-3.5 text-gray-400 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-xs text-gray-400 mb-0.5">Client</p>
                    <p className="text-sm font-medium text-gray-900">{wave.clientName}</p>
                  </div>
                </div>
                <div className="flex items-start gap-2.5">
                  <User className="w-3.5 h-3.5 text-gray-400 mt-0.5 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-gray-400 mb-0.5">Chef de projet</p>
                    {editingManager ? (
                      <div className="flex items-center gap-1.5">
                        <select defaultValue={manager.id}
                          onChange={(e) => saveManager(e.target.value)}
                          disabled={managerSaving} autoFocus
                          className="flex-1 min-w-0 text-sm border border-emerald-300 rounded-lg px-2 py-1 focus:outline-none focus:ring-2 focus:ring-emerald-500 disabled:opacity-60">
                          {users.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
                        </select>
                        <button onClick={() => setEditingManager(false)} className="text-gray-400 hover:text-gray-600 p-1 rounded">
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between gap-1">
                        <p className="text-sm font-medium text-gray-900">{manager.name}</p>
                        {canEdit && (
                          <button onClick={() => setEditingManager(true)}
                            className="p-1 text-gray-300 hover:text-gray-500 hover:bg-gray-100 rounded transition-colors flex-shrink-0"
                            title="Modifier le chef de projet">
                            <Pencil className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex items-start gap-2.5">
                  <Calendar className="w-3.5 h-3.5 text-gray-400 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-xs text-gray-400 mb-0.5">Dates</p>
                    <p className="text-sm text-gray-700">{formatDate(wave.startDate)}</p>
                    <p className="text-sm text-gray-700">→ {formatDate(wave.endDate)}</p>
                  </div>
                </div>
              </div>

              {/* Avancement */}
              <div className="bg-white rounded-xl border border-gray-200 p-4">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Avancement</p>
                <div className="flex items-end justify-between mb-1.5">
                  <span className="text-2xl font-bold text-gray-900">{progress}%</span>
                  <span className="text-xs text-gray-400 mb-1">{doneTasks} / {allTasks.length} tâches</span>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-2">
                  <div className={`h-2 rounded-full ${progress === 100 ? "bg-emerald-600" : "bg-emerald-400"}`} style={{ width: `${progress}%` }} />
                </div>
              </div>

              {/* Fournisseurs KPIs */}
              {wave.suppliers.length > 0 && (
                <div className="bg-white rounded-xl border border-gray-200 p-4">
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Fournisseurs</p>
                  {[
                    { label: "Total",       value: wave.suppliers.length },
                    { label: "Compte créé", value: wave.suppliers.filter((s) => s.accountCreated).length },
                    { label: "Formés",      value: wave.suppliers.filter((s) => s.assistedWebinar).length },
                    { label: "Configurés",  value: wave.suppliers.filter((s) => s.configured).length },
                  ].map(({ label, value }) => (
                    <div key={label} className="mb-2">
                      <div className="flex items-center justify-between mb-0.5">
                        <span className="text-xs text-gray-500">{label}</span>
                        <span className="text-xs font-semibold text-gray-700">{value}/{wave.suppliers.length}</span>
                      </div>
                      <div className="w-full bg-gray-100 rounded-full h-1">
                        <div className="h-1 rounded-full bg-emerald-400" style={{ width: `${wave.suppliers.length > 0 ? Math.round((value / wave.suppliers.length) * 100) : 0}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Tags */}
              {allTags.length > 0 && (
                <div className="bg-white rounded-xl border border-gray-200 p-4">
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide flex items-center gap-1.5">
                      <Tag className="w-3 h-3" /> Tags
                    </p>
                    {canEdit && (
                      <button onClick={() => setShowTagPicker((v) => !v)}
                        className="p-1 text-gray-300 hover:text-gray-500 hover:bg-gray-100 rounded transition-colors"
                        title="Gérer les tags">
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {waveTags.length === 0 && !showTagPicker && (
                      <p className="text-xs text-gray-300">Aucun tag</p>
                    )}
                    {waveTags.map((tag) => (
                      <div key={tag.id} className="group relative">
                        <TagBadge name={tag.name} color={tag.color} size="sm" />
                        {canEdit && (
                          <button onClick={() => toggleTag(tag)} disabled={tagSaving}
                            className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-gray-500 hover:bg-red-500 text-white rounded-full text-xs hidden group-hover:flex items-center justify-center transition-colors">
                            <X className="w-2 h-2" />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                  {showTagPicker && (
                    <div className="mt-2 pt-2 border-t border-gray-100">
                      <p className="text-xs text-gray-400 mb-1.5">Ajouter un tag :</p>
                      <div className="flex flex-col gap-1">
                        {allTags.filter((t) => !waveTags.some((wt) => wt.id === t.id)).map((tag) => (
                          <button key={tag.id} onClick={() => toggleTag(tag)} disabled={tagSaving}
                            className="flex items-center gap-2 w-full px-2 py-1.5 rounded-lg hover:bg-gray-50 transition-colors text-left disabled:opacity-60">
                            <TagBadge name={tag.name} color={tag.color} size="sm" />
                          </button>
                        ))}
                        {allTags.filter((t) => !waveTags.some((wt) => wt.id === t.id)).length === 0 && (
                          <p className="text-xs text-gray-300 px-2">Tous les tags sont ajoutés</p>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Supprimer la vague */}
              {canEdit && (
                <button
                  onClick={() => setShowDeleteConfirm(true)}
                  className="flex items-center justify-center gap-2 w-full px-4 py-2.5 text-sm text-red-500 hover:text-red-700 hover:bg-red-50 border border-red-200 hover:border-red-300 rounded-xl transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Supprimer cette vague
                </button>
              )}
            </div>
          </div>
        )}

        {/* ── Milestones ── */}
        {activeTab === "Milestones" && (
          <WaveMilestonesTab
            waveId={wave.id}
            milestones={milestones}
            setMilestones={setMilestones}
            users={users}
            currentUserRole={currentUserRole}
            onTaskClick={(taskId) => setSelectedTaskId(taskId)}
          />
        )}

        {/* ── Gantt ── */}
        {activeTab === "Gantt" && (
          <WaveGanttTab
            milestones={milestones}
            waveStart={wave.startDate}
            waveEnd={wave.endDate}
          />
        )}

        {/* ── Fournisseurs ── */}
        {activeTab === "Fournisseurs" && (
          <SuppliersTab
            waveId={wave.id}
            initialSuppliers={wave.suppliers}
            users={users}
            canEdit={true}
            canManage={canEdit}
          />
        )}
      </div>

      {/* Modale de confirmation suppression */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center flex-shrink-0">
                <AlertTriangle className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">Supprimer cette vague</h3>
                <p className="text-sm text-gray-500 truncate max-w-xs">&ldquo;{wave.name}&rdquo;</p>
              </div>
            </div>
            <p className="text-sm text-gray-600 mb-6">
              Cette action est <strong>irréversible</strong>. Toutes les milestones, tâches, fournisseurs et commentaires associés seront définitivement supprimés.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                disabled={deleting}
                className="px-4 py-2 border border-gray-200 text-gray-700 rounded-lg text-sm hover:bg-gray-50 transition-colors disabled:opacity-60"
              >
                Annuler
              </button>
              <button
                onClick={deleteWave}
                disabled={deleting}
                className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 disabled:opacity-60 text-white rounded-lg text-sm font-medium transition-colors"
              >
                <Trash2 className="w-4 h-4" />
                {deleting ? "Suppression..." : "Supprimer définitivement"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Task panel slide-in */}
      {selectedTaskId && (
        <WaveTaskPanel
          taskId={selectedTaskId}
          users={users}
          currentUserId={currentUserId}
          currentUserRole={currentUserRole}
          onClose={() => setSelectedTaskId(null)}
          onUpdate={(updated) => handleTaskUpdate(selectedTaskId, updated)}
        />
      )}
    </div>
  );
}

