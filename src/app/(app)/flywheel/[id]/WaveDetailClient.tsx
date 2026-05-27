"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import dynamic from "next/dynamic";
import { formatDate } from "@/lib/utils";
import {
  ChevronLeft, Calendar, User, Save, Pencil,
  Building2, ChevronDown, Trash2, AlertTriangle,
} from "lucide-react";
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
}
interface Wave {
  id: string; name: string; clientName: string; status: string;
  startDate: Date; endDate: Date; summary: string | null;
  manager: { id: string; name: string; email: string };
  milestones: WaveMilestone[];
  suppliers: WaveSupplier[];
}
interface User { id: string; name: string; email: string; role: string; }

export function WaveDetailClient({ wave, users, currentUserRole, currentUserId }: {
  wave: Wave; users: User[]; currentUserRole: string; currentUserId: string;
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
                <h1 className="text-xl font-bold text-gray-900">{wave.name}</h1>
                <span className={`text-xs px-2.5 py-1 rounded-full font-medium border ${statusOpt.color}`}>
                  {statusOpt.label}
                </span>
                <span className="text-xs px-2 py-1 bg-gray-50 border border-gray-200 rounded-full text-gray-500 flex items-center gap-1">
                  <Building2 className="w-3 h-3" /> {wave.clientName}
                </span>
              </div>
              <div className="flex items-center gap-4 mt-1.5 text-xs text-gray-400">
                <span className="flex items-center gap-1"><User className="w-3 h-3" />{wave.manager.name}</span>
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
                  <div>
                    <p className="text-xs text-gray-400 mb-0.5">Chef de projet</p>
                    <p className="text-sm font-medium text-gray-900">{wave.manager.name}</p>
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
            canEdit={canEdit}
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

