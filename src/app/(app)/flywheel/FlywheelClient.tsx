"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Plus, Users, CheckCircle2, ChevronRight, Zap, Search } from "lucide-react";
import { formatDate } from "@/lib/utils";
import { TagBadge } from "@/components/ui/TagBadge";

interface WaveTemplate { id: string; name: string; description: string | null; isDefault: boolean; }
interface TagItem { id: string; name: string; color: string; }

interface WaveCard {
  id: string;
  name: string;
  clientName: string;
  status: string;
  startDate: Date;
  endDate: Date;
  manager: { id: string; name: string };
  milestones: { tasks: { status: string }[] }[];
  suppliers: { id: string; accountCreated: boolean; configured: boolean; assistedWebinar: boolean }[];
  tags: TagItem[];
}

interface User { id: string; name: string; email: string; }

const STATUS_COLORS: Record<string, string> = {
  ACTIVE:    "bg-emerald-100 text-emerald-700",
  COMPLETED: "bg-blue-100 text-blue-700",
  ON_HOLD:   "bg-yellow-100 text-yellow-700",
  CANCELLED: "bg-gray-100 text-gray-600",
};
const STATUS_LABELS: Record<string, string> = {
  ACTIVE: "Active", COMPLETED: "Terminée", ON_HOLD: "En pause", CANCELLED: "Annulée",
};

function getWaveProgress(wave: WaveCard) {
  const tasks = wave.milestones.flatMap((m) => m.tasks);
  if (!tasks.length) return 0;
  return Math.round((tasks.filter((t) => t.status === "DONE").length / tasks.length) * 100);
}

export function FlywheelClient({ waves, users, allTags, currentUserId, currentUserRole }: {
  waves: WaveCard[]; users: User[]; allTags: TagItem[];
  currentUserId: string; currentUserRole: string;
}) {
  const router = useRouter();
  const [showModal, setShowModal] = useState(false);
  const [creating, setCreating] = useState(false);
  const [templates, setTemplates] = useState<WaveTemplate[]>([]);
  const [form, setForm] = useState({
    name: "", clientName: "", startDate: "", endDate: "",
    managerId: currentUserId, templateId: "",
  });

  // Filtres
  const [search, setSearch]           = useState("");
  const [filterStatus, setFilterStatus] = useState("ALL");
  const [filterManager, setFilterManager] = useState("ALL");
  const [filterTag, setFilterTag]     = useState("ALL");

  useEffect(() => {
    fetch("/api/flywheel/templates")
      .then((r) => r.json())
      .then((data: WaveTemplate[]) => {
        setTemplates(data);
        const def = data.find((t) => t.isDefault);
        if (def) setForm((f) => ({ ...f, templateId: def.id }));
      });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filtered = waves.filter((w) => {
    const q = search.toLowerCase();
    const matchSearch  = !q || w.name.toLowerCase().includes(q) || w.clientName.toLowerCase().includes(q);
    const matchStatus  = filterStatus === "ALL" || w.status === filterStatus;
    const matchManager = filterManager === "ALL" || w.manager.id === filterManager;
    const matchTag     = filterTag === "ALL" || w.tags.some((t) => t.id === filterTag);
    return matchSearch && matchStatus && matchManager && matchTag;
  });

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setCreating(true);
    try {
      const res = await fetch("/api/waves", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          clientName: form.clientName,
          startDate: form.startDate,
          endDate: form.endDate,
          managerId: form.managerId,
          templateId: form.templateId || undefined,
        }),
      });
      if (res.ok) {
        const wave = await res.json();
        setShowModal(false);
        router.push(`/flywheel/${wave.id}`);
        router.refresh();
      }
    } finally {
      setCreating(false);
    }
  }

  const inp = "w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500";

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Zap className="w-5 h-5 text-emerald-600" />
            <h1 className="text-2xl font-bold text-gray-900">Tous les projets</h1>
          </div>
          <p className="text-gray-500 text-sm">
            {filtered.length === waves.length
              ? `${waves.length} vague${waves.length !== 1 ? "s" : ""} au total`
              : `${filtered.length} sur ${waves.length} vague${waves.length !== 1 ? "s" : ""}`}
          </p>
        </div>
        {currentUserRole !== "MEMBER" && (
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2.5 rounded-lg text-sm font-medium transition-colors"
          >
            <Plus className="w-4 h-4" />
            Nouvelle vague
          </button>
        )}
      </div>

      {/* Filtres */}
      <div className="flex flex-wrap gap-3 mb-6">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher une vague..."
            className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>
        <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}
          className="px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500">
          <option value="ALL">Tous les statuts</option>
          <option value="ACTIVE">Active</option>
          <option value="COMPLETED">Terminée</option>
          <option value="ON_HOLD">En pause</option>
          <option value="CANCELLED">Annulée</option>
        </select>
        <select value={filterManager} onChange={(e) => setFilterManager(e.target.value)}
          className="px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500">
          <option value="ALL">Tous les chefs de projet</option>
          {users.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
        </select>
        {allTags.length > 0 && (
          <select value={filterTag} onChange={(e) => setFilterTag(e.target.value)}
            className="px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500">
            <option value="ALL">Tous les tags</option>
            {allTags.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
        )}
      </div>

      {/* Waves grid */}
      <div className="grid gap-4">
        {filtered.length === 0 && (
          <div className="text-center py-20 text-gray-400">
            <div className="w-16 h-16 bg-emerald-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Zap className="w-8 h-8 text-emerald-300" />
            </div>
            <p className="font-medium text-gray-500">
              {waves.length === 0 ? "Aucune vague d'activation" : "Aucun résultat pour ces filtres"}
            </p>
            <p className="text-sm mt-1">
              {waves.length === 0 ? "Créez votre première vague pour commencer" : "Essayez d'autres filtres"}
            </p>
          </div>
        )}
        {filtered.map((wave) => {
          const progress    = getWaveProgress(wave);
          const total       = wave.suppliers.length;
          const activated   = wave.suppliers.filter((s) => s.configured).length;
          const withAccount = wave.suppliers.filter((s) => s.accountCreated).length;
          const trained     = wave.suppliers.filter((s) => s.assistedWebinar).length;

          return (
            <Link
              key={wave.id}
              href={`/flywheel/${wave.id}`}
              className="bg-white rounded-xl border border-gray-200 p-5 hover:border-emerald-300 hover:shadow-sm transition-all group"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <h3 className="font-semibold text-gray-900 group-hover:text-emerald-700 transition-colors">
                      {wave.name}
                    </h3>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[wave.status]}`}>
                      {STATUS_LABELS[wave.status]}
                    </span>
                    <span className="text-xs text-gray-400 bg-gray-50 px-2 py-0.5 rounded-full border border-gray-100">
                      {wave.clientName}
                    </span>
                  </div>
                  {wave.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mb-2">
                      {wave.tags.map((tag) => (
                        <TagBadge key={tag.id} name={tag.name} color={tag.color} size="sm" />
                      ))}
                    </div>
                  )}
                  <div className="flex items-center gap-4 text-xs text-gray-400 mb-3">
                    <span>Chef : {wave.manager.name}</span>
                    <span>{formatDate(wave.startDate)} → {formatDate(wave.endDate)}</span>
                    <span>{wave.milestones.length} milestone{wave.milestones.length !== 1 ? "s" : ""}</span>
                  </div>

                  {/* Supplier KPIs */}
                  {total > 0 && (
                    <div className="flex items-center gap-3 flex-wrap">
                      <KpiChip label="Fournisseurs" value={total} color="gray" icon={<Users className="w-3 h-3" />} />
                      <KpiChip label="Compte créé" value={withAccount} total={total} color="blue" />
                      <KpiChip label="Formés" value={trained} total={total} color="yellow" />
                      <KpiChip label="Configurés" value={activated} total={total} color="emerald" icon={<CheckCircle2 className="w-3 h-3" />} />
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-4 ml-4">
                  <div className="text-right">
                    <p className="text-sm font-semibold text-gray-900">{progress}%</p>
                    <div className="w-24 bg-gray-100 rounded-full h-1.5 mt-1">
                      <div
                        className={`h-1.5 rounded-full ${progress === 100 ? "bg-green-500" : "bg-emerald-500"}`}
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-emerald-400 transition-colors" />
                </div>
              </div>
            </Link>
          );
        })}
      </div>

      {/* Modal nouvelle vague */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-5">Nouvelle vague d&apos;activation</h2>
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nom de la vague *</label>
                <input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="Ex: Vague 3 Intermarché Tomates" className={inp} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Client *</label>
                <input required value={form.clientName} onChange={(e) => setForm({ ...form, clientName: e.target.value })}
                  placeholder="Ex: Intermarché, Carrefour..." className={inp} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Date de début *</label>
                  <input type="date" required value={form.startDate}
                    onChange={(e) => setForm({ ...form, startDate: e.target.value })} className={inp} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Date de fin *</label>
                  <input type="date" required value={form.endDate}
                    onChange={(e) => setForm({ ...form, endDate: e.target.value })} className={inp} />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Chef de projet *</label>
                <select required value={form.managerId} onChange={(e) => setForm({ ...form, managerId: e.target.value })} className={inp}>
                  {users.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Template</label>
                <select value={form.templateId} onChange={(e) => setForm({ ...form, templateId: e.target.value })} className={inp}>
                  <option value="">— Aucun template (vague vide) —</option>
                  {templates.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.isDefault ? "⭐ " : ""}{t.name}{t.description ? ` — ${t.description}` : ""}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowModal(false)}
                  className="flex-1 px-4 py-2.5 border border-gray-300 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors">
                  Annuler
                </button>
                <button type="submit" disabled={creating}
                  className="flex-1 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white px-4 py-2.5 rounded-lg text-sm font-medium transition-colors">
                  {creating ? "Création..." : "Créer la vague"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function KpiChip({ label, value, total, color, icon }: {
  label: string; value: number; total?: number; color: string; icon?: React.ReactNode;
}) {
  const colors: Record<string, string> = {
    gray:    "bg-gray-50 text-gray-600 border-gray-200",
    blue:    "bg-blue-50 text-blue-700 border-blue-100",
    yellow:  "bg-yellow-50 text-yellow-700 border-yellow-100",
    emerald: "bg-emerald-50 text-emerald-700 border-emerald-100",
  };
  return (
    <span className={`inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full border font-medium ${colors[color]}`}>
      {icon}
      {label} : <strong>{value}{total !== undefined ? `/${total}` : ""}</strong>
    </span>
  );
}
