"use client";

import { useState, useRef } from "react";
import {
  Upload, Plus, Trash2, Search, X, CheckCircle2, XCircle,
  ChevronDown, Users, Phone, Globe, MessageSquare, Building2,
} from "lucide-react";

interface Supplier {
  id: string; waveId: string;
  supplierName: string; supplierCode: string | null;
  email: string | null; firstName: string | null; lastName: string | null;
  phone: string | null; language: string | null;
  status: string; workspaceId: string | null; action: string; comments: string | null;
  accountCreated: boolean; registeredWebinar: boolean; assistedWebinar: boolean; configured: boolean;
  productFamilies: string[];
}

const STATUS_OPTIONS = [
  { value: "NEW",            label: "Nouveau",        color: "bg-blue-100 text-blue-700 border-blue-200" },
  { value: "ALREADY_HAS_WS", label: "A déjà un WS",  color: "bg-green-100 text-green-700 border-green-200" },
  { value: "NOT_NEW",        label: "Existant",       color: "bg-purple-100 text-purple-700 border-purple-200" },
  { value: "IN_HUBSPOT_ONLY",label: "Hubspot only",   color: "bg-orange-100 text-orange-700 border-orange-200" },
];

const ACTION_OPTIONS = [
  { value: "TO_CONTACT", label: "À contacter" },
  { value: "NO_NEED",    label: "OK / Pas besoin" },
  { value: "CONNECTED",  label: "Connecté" },
  { value: "ATTEMPTED",  label: "Tentative(s)" },
];

function statusStyle(status: string) {
  return STATUS_OPTIONS.find((s) => s.value === status)?.color ?? "bg-gray-100 text-gray-600 border-gray-200";
}
function statusLabel(status: string) {
  return STATUS_OPTIONS.find((s) => s.value === status)?.label ?? status;
}
function actionLabel(action: string) {
  return ACTION_OPTIONS.find((a) => a.value === action)?.label ?? action;
}

// Map from CSV header → supplier field
function mapCsvRow(row: Record<string, string>): Partial<Supplier> {
  return {
    supplierName: row["SUPPLIER_NAME"] ?? row["supplierName"] ?? "",
    supplierCode: row["SUPPLIER_CODE"] ?? row["supplierCode"] ?? "",
    email:        row["USER_EMAIL"] ?? row["SUPPLIER_EMAIL"] ?? row["email"] ?? "",
    firstName:    row["USER_FIRST_NAME"] ?? row["SUPPLIER_FIRST_NAME"] ?? row["firstName"] ?? "",
    lastName:     row["USER_LAST_NAME"] ?? row["SUPPLIER_LAST_NAME"] ?? row["lastName"] ?? "",
    phone:        row["SUPPLIER_PHONE_NB"] ?? row["phone"] ?? "",
    language:     row["LANGUAGE"] ?? row["language"] ?? "",
  };
}

function parseCsv(text: string): Record<string, string>[] {
  const lines = text.trim().split("\n");
  if (lines.length < 2) return [];
  const headers = lines[0].split(",").map((h) => h.trim().replace(/^"|"$/g, ""));
  return lines.slice(1).map((line) => {
    const values = line.split(",").map((v) => v.trim().replace(/^"|"$/g, ""));
    return Object.fromEntries(headers.map((h, i) => [h, values[i] ?? ""]));
  });
}

function CheckToggle({ checked, onChange, disabled }: { checked: boolean; onChange: () => void; disabled?: boolean }) {
  return (
    <button
      type="button"
      onClick={onChange}
      disabled={disabled}
      className={`flex items-center justify-center w-7 h-7 rounded-lg transition-colors ${checked ? "bg-emerald-100 text-emerald-600 hover:bg-emerald-200" : "bg-gray-100 text-gray-300 hover:bg-gray-200"} disabled:opacity-40`}
    >
      {checked ? <CheckCircle2 className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
    </button>
  );
}

export function SuppliersTab({ waveId, initialSuppliers, canEdit }: {
  waveId: string; initialSuppliers: Supplier[]; canEdit: boolean;
}) {
  const [suppliers, setSuppliers] = useState(initialSuppliers);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("ALL");
  const [filterAction, setFilterAction] = useState("ALL");
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const [form, setForm] = useState({
    supplierName: "", supplierCode: "", email: "", firstName: "",
    lastName: "", phone: "", language: "FR", status: "NEW",
    workspaceId: "", action: "TO_CONTACT", comments: "", productFamilies: [] as string[],
  });

  const filtered = suppliers.filter((s) => {
    const q = search.toLowerCase();
    const matchSearch = !q || s.supplierName.toLowerCase().includes(q) || (s.email ?? "").toLowerCase().includes(q);
    const matchStatus = filterStatus === "ALL" || s.status === filterStatus;
    const matchAction = filterAction === "ALL" || s.action === filterAction;
    return matchSearch && matchStatus && matchAction;
  });

  // KPIs
  const total          = suppliers.length;
  const withAccount    = suppliers.filter((s) => s.accountCreated).length;
  const registeredWeb  = suppliers.filter((s) => s.registeredWebinar).length;
  const trainedWeb     = suppliers.filter((s) => s.assistedWebinar).length;
  const configured     = suppliers.filter((s) => s.configured).length;

  async function toggleField(s: Supplier, field: keyof Pick<Supplier, "accountCreated"|"registeredWebinar"|"assistedWebinar"|"configured">) {
    if (!canEdit) return;
    const next = !s[field];
    setSaving(s.id + field);
    setSuppliers((prev) => prev.map((x) => x.id === s.id ? { ...x, [field]: next } : x));
    await fetch(`/api/waves/${waveId}/suppliers/${s.id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ [field]: next }),
    });
    setSaving(null);
  }

  async function patchSupplier(id: string, data: Partial<Supplier>) {
    if (!canEdit) return;
    setSuppliers((prev) => prev.map((x) => x.id === id ? { ...x, ...data } : x));
    await fetch(`/api/waves/${waveId}/suppliers/${id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
  }

  async function deleteSupplier(id: string) {
    if (!confirm("Supprimer ce fournisseur ?")) return;
    await fetch(`/api/waves/${waveId}/suppliers/${id}`, { method: "DELETE" });
    setSuppliers((prev) => prev.filter((s) => s.id !== id));
  }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    setSaving("add");
    const res = await fetch(`/api/waves/${waveId}/suppliers`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    if (res.ok) {
      const s = await res.json();
      setSuppliers((prev) => [...prev, s].sort((a, b) => a.supplierName.localeCompare(b.supplierName)));
      setShowAddModal(false);
      setForm({ supplierName: "", supplierCode: "", email: "", firstName: "", lastName: "",
        phone: "", language: "FR", status: "NEW", workspaceId: "", action: "TO_CONTACT", comments: "", productFamilies: [] });
    }
    setSaving(null);
  }

  async function handleCsvImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setImporting(true);
    const text = await file.text();
    const rows = parseCsv(text);
    const mapped = rows.map(mapCsvRow).filter((r) => r.supplierName);
    if (mapped.length === 0) { setImporting(false); return; }
    const res = await fetch(`/api/waves/${waveId}/suppliers`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify(mapped),
    });
    if (res.ok) {
      const all = await res.json();
      setSuppliers(all);
    }
    if (fileRef.current) fileRef.current.value = "";
    setImporting(false);
  }

  return (
    <div className="p-6 space-y-5">
      {/* KPI Bar */}
      <div className="grid grid-cols-5 gap-3">
        {[
          { label: "Total fournisseurs",    value: total,       color: "bg-gray-50  border-gray-200  text-gray-700",    icon: <Building2 className="w-4 h-4 text-gray-400" /> },
          { label: "Compte créé",           value: withAccount, color: "bg-blue-50  border-blue-100  text-blue-700",   icon: <CheckCircle2 className="w-4 h-4 text-blue-400" /> },
          { label: "Inscrit webinaire",     value: registeredWeb, color: "bg-yellow-50 border-yellow-100 text-yellow-700", icon: <Users className="w-4 h-4 text-yellow-400" /> },
          { label: "Formés (webinaire)",    value: trainedWeb,  color: "bg-orange-50 border-orange-100 text-orange-700", icon: <Users className="w-4 h-4 text-orange-400" /> },
          { label: "Configurés",            value: configured,  color: "bg-emerald-50 border-emerald-100 text-emerald-700", icon: <CheckCircle2 className="w-4 h-4 text-emerald-500" /> },
        ].map(({ label, value, color, icon }) => (
          <div key={label} className={`rounded-xl border p-4 ${color}`}>
            <div className="flex items-center gap-2 mb-1">{icon}<span className="text-xs font-medium">{label}</span></div>
            <p className="text-2xl font-bold">{value}</p>
            {total > 0 && value !== total && (
              <div className="mt-1.5 bg-white/60 rounded-full h-1.5">
                <div className="h-1.5 rounded-full bg-current opacity-50" style={{ width: `${Math.round((value / total) * 100)}%` }} />
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Toolbar */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher un fournisseur..."
            className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>
        <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}
          className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500">
          <option value="ALL">Tous les statuts</option>
          {STATUS_OPTIONS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
        </select>
        <select value={filterAction} onChange={(e) => setFilterAction(e.target.value)}
          className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500">
          <option value="ALL">Toutes les actions</option>
          {ACTION_OPTIONS.map((a) => <option key={a.value} value={a.value}>{a.label}</option>)}
        </select>
        <div className="flex-1" />
        {canEdit && (
          <>
            <input ref={fileRef} type="file" accept=".csv" className="hidden" onChange={handleCsvImport} />
            <button onClick={() => fileRef.current?.click()} disabled={importing}
              className="flex items-center gap-1.5 px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50 transition-colors disabled:opacity-60">
              <Upload className="w-4 h-4" />
              {importing ? "Import..." : "Importer CSV"}
            </button>
            <button onClick={() => setShowAddModal(true)}
              className="flex items-center gap-1.5 px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-medium transition-colors">
              <Plus className="w-4 h-4" /> Ajouter
            </button>
          </>
        )}
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Fournisseur</th>
                <th className="text-left px-3 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Statut</th>
                <th className="text-left px-3 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Action</th>
                <th className="text-center px-3 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Compte</th>
                <th className="text-center px-3 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">WS ID</th>
                <th className="text-center px-3 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Inscrit WB</th>
                <th className="text-center px-3 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Formé</th>
                <th className="text-center px-3 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Config.</th>
                <th className="text-left px-3 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Commentaires</th>
                {canEdit && <th className="px-3 py-3" />}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.length === 0 && (
                <tr><td colSpan={10} className="text-center py-12 text-gray-400">Aucun fournisseur trouvé</td></tr>
              )}
              {filtered.map((s) => (
                <SupplierRow
                  key={s.id}
                  supplier={s}
                  canEdit={canEdit}
                  saving={saving}
                  editingId={editingId}
                  setEditingId={setEditingId}
                  onToggle={toggleField}
                  onPatch={patchSupplier}
                  onDelete={deleteSupplier}
                />
              ))}
            </tbody>
          </table>
        </div>
        <div className="px-4 py-2.5 border-t border-gray-100 bg-gray-50 text-xs text-gray-400">
          {filtered.length} fournisseur{filtered.length !== 1 ? "s" : ""}{filtered.length !== suppliers.length ? ` (sur ${suppliers.length})` : ""}
        </div>
      </div>

      {/* Modal ajout fournisseur */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-semibold text-gray-900">Ajouter un fournisseur</h2>
              <button onClick={() => setShowAddModal(false)} className="text-gray-400 hover:text-gray-600 p-1 rounded-lg hover:bg-gray-100">
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleAdd} className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nom du fournisseur *</label>
                <input required value={form.supplierName} onChange={(e) => setForm({ ...form, supplierName: e.target.value })}
                  placeholder="Ex: GOSSELIN SAE DES ETS"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Prénom</label>
                  <input value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nom</label>
                  <input value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Téléphone</label>
                  <input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Langue</label>
                  <select value={form.language} onChange={(e) => setForm({ ...form, language: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500">
                    {["FR","EN","ES","IT","DE","NL","PT","BE"].map((l) => <option key={l}>{l}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Code fournisseur</label>
                  <input value={form.supplierCode} onChange={(e) => setForm({ ...form, supplierCode: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Workspace ID</label>
                  <input value={form.workspaceId} onChange={(e) => setForm({ ...form, workspaceId: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Statut</label>
                  <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500">
                    {STATUS_OPTIONS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Action</label>
                  <select value={form.action} onChange={(e) => setForm({ ...form, action: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500">
                    {ACTION_OPTIONS.map((a) => <option key={a.value} value={a.value}>{a.label}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Commentaires</label>
                <textarea value={form.comments} onChange={(e) => setForm({ ...form, comments: e.target.value })}
                  rows={2} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none" />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowAddModal(false)}
                  className="flex-1 px-4 py-2.5 border border-gray-300 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors">
                  Annuler
                </button>
                <button type="submit" disabled={saving === "add"}
                  className="flex-1 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white px-4 py-2.5 rounded-lg text-sm font-medium transition-colors">
                  {saving === "add" ? "Ajout..." : "Ajouter"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Supplier row ──────────────────────────────────────────────────────────────
function SupplierRow({
  supplier: s, canEdit, saving, editingId, setEditingId, onToggle, onPatch, onDelete,
}: {
  supplier: Supplier; canEdit: boolean; saving: string | null;
  editingId: string | null; setEditingId: (id: string | null) => void;
  onToggle: (s: Supplier, f: "accountCreated"|"registeredWebinar"|"assistedWebinar"|"configured") => void;
  onPatch: (id: string, data: Partial<Supplier>) => void;
  onDelete: (id: string) => void;
}) {
  const isEditing = editingId === s.id;
  const [comment, setComment] = useState(s.comments ?? "");

  function saveComment() {
    onPatch(s.id, { comments: comment || null });
    setEditingId(null);
  }

  return (
    <tr className="hover:bg-gray-50 transition-colors">
      {/* Nom */}
      <td className="px-4 py-3">
        <div>
          <p className="font-medium text-gray-900 text-sm">{s.supplierName}</p>
          {(s.firstName || s.lastName) && (
            <p className="text-xs text-gray-400">{[s.firstName, s.lastName].filter(Boolean).join(" ")}</p>
          )}
          {s.email && <p className="text-xs text-gray-400">{s.email}</p>}
          <div className="flex items-center gap-2 mt-0.5">
            {s.phone && <span className="text-xs text-gray-300 flex items-center gap-0.5"><Phone className="w-2.5 h-2.5" />{s.phone}</span>}
            {s.language && <span className="text-xs text-gray-300 flex items-center gap-0.5"><Globe className="w-2.5 h-2.5" />{s.language}</span>}
          </div>
        </div>
      </td>

      {/* Statut */}
      <td className="px-3 py-3">
        {canEdit ? (
          <div className="relative">
            <select
              value={s.status}
              onChange={(e) => onPatch(s.id, { status: e.target.value })}
              className={`appearance-none text-xs px-2 py-1 rounded-full border font-medium pr-5 cursor-pointer focus:outline-none ${statusStyle(s.status)}`}
            >
              {STATUS_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
            <ChevronDown className="w-2.5 h-2.5 absolute right-1.5 top-1/2 -translate-y-1/2 pointer-events-none opacity-50" />
          </div>
        ) : (
          <span className={`text-xs px-2 py-1 rounded-full border font-medium ${statusStyle(s.status)}`}>{statusLabel(s.status)}</span>
        )}
      </td>

      {/* Action */}
      <td className="px-3 py-3">
        {canEdit ? (
          <select
            value={s.action}
            onChange={(e) => onPatch(s.id, { action: e.target.value })}
            className="text-xs px-2 py-1 border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-1 focus:ring-emerald-400"
          >
            {ACTION_OPTIONS.map((a) => <option key={a.value} value={a.value}>{a.label}</option>)}
          </select>
        ) : (
          <span className="text-xs text-gray-600">{actionLabel(s.action)}</span>
        )}
      </td>

      {/* Checkboxes */}
      <td className="px-3 py-3 text-center">
        <CheckToggle checked={s.accountCreated} onChange={() => onToggle(s, "accountCreated")} disabled={!canEdit || saving === s.id + "accountCreated"} />
      </td>
      <td className="px-3 py-3 text-center">
        <span className="text-xs text-gray-500">{s.workspaceId || "—"}</span>
      </td>
      <td className="px-3 py-3 text-center">
        <CheckToggle checked={s.registeredWebinar} onChange={() => onToggle(s, "registeredWebinar")} disabled={!canEdit || saving === s.id + "registeredWebinar"} />
      </td>
      <td className="px-3 py-3 text-center">
        <CheckToggle checked={s.assistedWebinar} onChange={() => onToggle(s, "assistedWebinar")} disabled={!canEdit || saving === s.id + "assistedWebinar"} />
      </td>
      <td className="px-3 py-3 text-center">
        <CheckToggle checked={s.configured} onChange={() => onToggle(s, "configured")} disabled={!canEdit || saving === s.id + "configured"} />
      </td>

      {/* Commentaires */}
      <td className="px-3 py-3 max-w-[200px]">
        {isEditing ? (
          <div className="flex gap-1">
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              rows={2}
              autoFocus
              className="flex-1 text-xs px-2 py-1 border border-emerald-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-400 resize-none"
            />
            <div className="flex flex-col gap-1">
              <button onClick={saveComment} className="text-emerald-600 hover:text-emerald-700 p-0.5"><CheckCircle2 className="w-4 h-4" /></button>
              <button onClick={() => { setComment(s.comments ?? ""); setEditingId(null); }} className="text-gray-400 hover:text-gray-600 p-0.5"><X className="w-4 h-4" /></button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => canEdit && setEditingId(s.id)}
            className={`text-left w-full text-xs text-gray-500 leading-relaxed ${canEdit ? "hover:text-gray-800 cursor-pointer" : ""}`}
            title={s.comments ?? ""}
          >
            {s.comments ? (
              <span className="line-clamp-2">{s.comments}</span>
            ) : (
              canEdit && <span className="flex items-center gap-1 text-gray-300 hover:text-gray-500"><MessageSquare className="w-3 h-3" />Ajouter...</span>
            )}
          </button>
        )}
      </td>

      {/* Actions */}
      {canEdit && (
        <td className="px-3 py-3">
          <button onClick={() => onDelete(s.id)} className="p-1.5 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors">
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </td>
      )}
    </tr>
  );
}
