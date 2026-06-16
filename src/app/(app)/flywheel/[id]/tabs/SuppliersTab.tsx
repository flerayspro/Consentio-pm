"use client";

import { useState, useRef } from "react";
import {
  Upload, Plus, Trash2, Search, X, CheckCircle2, XCircle,
  ChevronDown, Users, Phone, Globe, MessageSquare, Building2,
  Minus, Pencil, Download,
} from "lucide-react";

interface Supplier {
  id: string; waveId: string;
  supplierName: string; supplierCode: string | null;
  email: string | null; firstName: string | null; lastName: string | null;
  phone: string | null; language: string | null;
  status: string; workspaceId: string | null; action: string;
  callAttempts: number;
  comments: string | null;
  accountCreated: boolean; registeredWebinar: boolean; assistedWebinar: boolean; configured: boolean;
  productFamilies: string[];
  ownerId: string | null; owner: { id: string; name: string } | null;
}

interface UserItem { id: string; name: string; email: string; role: string; }

type SortDir = "asc" | "desc";

const STATUS_OPTIONS = [
  { value: "NEW",             label: "Nouveau",       color: "bg-blue-100 text-blue-700 border-blue-200" },
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

const LANGUAGES = ["FR","EN","ES","IT","DE","NL","PT","BE"];

function statusStyle(status: string) {
  return STATUS_OPTIONS.find((s) => s.value === status)?.color ?? "bg-gray-100 text-gray-600 border-gray-200";
}
function statusLabel(status: string) {
  return STATUS_OPTIONS.find((s) => s.value === status)?.label ?? status;
}
function actionLabel(action: string) {
  return ACTION_OPTIONS.find((a) => a.value === action)?.label ?? action;
}

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

// ── Sortable column header ────────────────────────────────────────────────────
function SortTh({
  col, label, sortCol, sortDir, onSort, align = "left", className = "",
}: {
  col: string; label: string; sortCol: string | null; sortDir: SortDir;
  onSort: (col: string) => void; align?: "left" | "center"; className?: string;
}) {
  const active = sortCol === col;
  return (
    <th className={`py-3 px-3 ${className}`}>
      <button
        onClick={() => onSort(col)}
        className={`flex items-center gap-0.5 text-xs font-semibold uppercase tracking-wide whitespace-nowrap transition-colors group
          ${align === "center" ? "justify-center w-full" : ""}
          ${active ? "text-emerald-600" : "text-gray-500 hover:text-gray-700"}`}
      >
        {label}
        <span className={`text-[10px] leading-none ml-0.5 ${active ? "text-emerald-400" : "text-gray-300 group-hover:text-gray-400"}`}>
          {active ? (sortDir === "asc" ? "↑" : "↓") : "↕"}
        </span>
      </button>
    </th>
  );
}

// ── Shared supplier form fields ───────────────────────────────────────────────
type SupplierForm = {
  supplierName: string; supplierCode: string; workspaceId: string;
  firstName: string; lastName: string; email: string;
  phone: string; language: string; status: string; action: string; comments: string;
};

function SupplierFormFields({
  form, setForm,
}: {
  form: SupplierForm;
  setForm: (f: SupplierForm) => void;
}) {
  const inp = "w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500";
  return (
    <div className="space-y-3">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Nom du fournisseur *</label>
        <input required value={form.supplierName} onChange={(e) => setForm({ ...form, supplierName: e.target.value })}
          placeholder="Ex: GOSSELIN SAE DES ETS" className={inp} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Code fournisseur</label>
          <input value={form.supplierCode} onChange={(e) => setForm({ ...form, supplierCode: e.target.value })}
            placeholder="Ex: SUP-001" className={inp} />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Workspace ID</label>
          <input value={form.workspaceId} onChange={(e) => setForm({ ...form, workspaceId: e.target.value })} className={inp} />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Prénom</label>
          <input value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} className={inp} />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Nom</label>
          <input value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} className={inp} />
        </div>
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
        <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className={inp} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Téléphone</label>
          <input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className={inp} />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Langue</label>
          <select value={form.language} onChange={(e) => setForm({ ...form, language: e.target.value })} className={inp}>
            {LANGUAGES.map((l) => <option key={l}>{l}</option>)}
          </select>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Statut</label>
          <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} className={inp}>
            {STATUS_OPTIONS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Action</label>
          <select value={form.action} onChange={(e) => setForm({ ...form, action: e.target.value })} className={inp}>
            {ACTION_OPTIONS.map((a) => <option key={a.value} value={a.value}>{a.label}</option>)}
          </select>
        </div>
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Commentaires</label>
        <textarea value={form.comments} onChange={(e) => setForm({ ...form, comments: e.target.value })}
          rows={2} className={`${inp} resize-none`} />
      </div>
    </div>
  );
}

const EMPTY_FORM: SupplierForm = {
  supplierName: "", supplierCode: "", workspaceId: "",
  firstName: "", lastName: "", email: "", phone: "",
  language: "FR", status: "NEW", action: "TO_CONTACT", comments: "",
};

function supplierToForm(s: Supplier): SupplierForm {
  return {
    supplierName: s.supplierName,
    supplierCode: s.supplierCode ?? "",
    workspaceId:  s.workspaceId  ?? "",
    firstName:    s.firstName    ?? "",
    lastName:     s.lastName     ?? "",
    email:        s.email        ?? "",
    phone:        s.phone        ?? "",
    language:     s.language     ?? "FR",
    status:       s.status,
    action:       s.action,
    comments:     s.comments     ?? "",
  };
}

function nullify(form: SupplierForm) {
  return {
    ...form,
    supplierCode: form.supplierCode || null,
    workspaceId:  form.workspaceId  || null,
    firstName:    form.firstName    || null,
    lastName:     form.lastName     || null,
    email:        form.email        || null,
    phone:        form.phone        || null,
    language:     form.language     || null,
    comments:     form.comments     || null,
  };
}

// ── Main component ────────────────────────────────────────────────────────────
export function SuppliersTab({ waveId, initialSuppliers, users, canEdit, canManage }: {
  waveId: string; initialSuppliers: Supplier[]; users: UserItem[]; canEdit: boolean; canManage: boolean;
}) {
  const [suppliers, setSuppliers] = useState(initialSuppliers);
  const [search, setSearch]           = useState("");
  const [filterStatus, setFilterStatus] = useState("ALL");
  const [filterAction, setFilterAction] = useState("ALL");
  const [filterOwner, setFilterOwner]   = useState("ALL");
  const [sortCol, setSortCol]           = useState<string | null>(null);
  const [sortDir, setSortDir]           = useState<SortDir>("asc");
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [saving, setSaving]             = useState<string | null>(null);
  const [importing, setImporting]       = useState(false);

  // Add modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [addForm, setAddForm]           = useState<SupplierForm>(EMPTY_FORM);

  // Edit modal
  const [editSupplier, setEditSupplier] = useState<Supplier | null>(null);
  const [editForm, setEditForm]         = useState<SupplierForm>(EMPTY_FORM);

  const fileRef = useRef<HTMLInputElement>(null);

  // ── Sort ───────────────────────────────────────────────────────────────────
  function toggleSort(col: string) {
    if (sortCol === col) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortCol(col); setSortDir("asc"); }
  }

  // ── Filter + sort ──────────────────────────────────────────────────────────
  const sorted = [...suppliers]
    .filter((s) => {
      const q = search.toLowerCase();
      const matchSearch =
        !q ||
        s.supplierName.toLowerCase().includes(q) ||
        (s.email ?? "").toLowerCase().includes(q) ||
        (s.supplierCode ?? "").toLowerCase().includes(q);
      const matchStatus = filterStatus === "ALL" || s.status === filterStatus;
      const matchAction = filterAction === "ALL" || s.action === filterAction;
      const matchOwner =
        filterOwner === "ALL" ||
        (filterOwner === "UNASSIGNED" ? !s.ownerId : s.ownerId === filterOwner);
      return matchSearch && matchStatus && matchAction && matchOwner;
    })
    .sort((a, b) => {
      if (!sortCol) return 0;
      const raw = (x: Supplier) =>
        sortCol === "owner" ? (x.owner?.name ?? "") : (x[sortCol as keyof Supplier] ?? "");
      const av = raw(a), bv = raw(b);
      const as = typeof av === "boolean" ? (av ? "1" : "0") : String(av);
      const bs = typeof bv === "boolean" ? (bv ? "1" : "0") : String(bv);
      const cmp = as.localeCompare(bs, undefined, { numeric: true, sensitivity: "base" });
      return sortDir === "asc" ? cmp : -cmp;
    });

  // KPIs
  const total         = suppliers.length;
  const withAccount   = suppliers.filter((s) => s.accountCreated).length;
  const registeredWeb = suppliers.filter((s) => s.registeredWebinar).length;
  const trainedWeb    = suppliers.filter((s) => s.assistedWebinar).length;
  const configured    = suppliers.filter((s) => s.configured).length;

  // ── Mutations ──────────────────────────────────────────────────────────────
  async function toggleField(s: Supplier, field: keyof Pick<Supplier,"accountCreated"|"registeredWebinar"|"assistedWebinar"|"configured">) {
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

  // Add
  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    setSaving("add");
    const res = await fetch(`/api/waves/${waveId}/suppliers`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify(nullify(addForm)),
    });
    if (res.ok) {
      const s = await res.json();
      setSuppliers((prev) => [...prev, s].sort((a, b) => a.supplierName.localeCompare(b.supplierName)));
      setShowAddModal(false);
      setAddForm(EMPTY_FORM);
    }
    setSaving(null);
  }

  // Edit
  function openEdit(s: Supplier) {
    setEditSupplier(s);
    setEditForm(supplierToForm(s));
  }

  async function handleEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!editSupplier) return;
    setSaving("edit");
    const res = await fetch(`/api/waves/${waveId}/suppliers/${editSupplier.id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify(nullify(editForm)),
    });
    if (res.ok) {
      const updated = await res.json();
      setSuppliers((prev) => prev.map((s) => s.id === editSupplier.id ? updated : s));
      setEditSupplier(null);
    }
    setSaving(null);
  }

  // CSV
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
    if (res.ok) setSuppliers(await res.json());
    if (fileRef.current) fileRef.current.value = "";
    setImporting(false);
  }

  const sortProps = { sortCol, sortDir, onSort: toggleSort };

  // ── Export CSV ─────────────────────────────────────────────────────────────
  function exportCsv() {
    const HEADERS = [
      "Nom fournisseur", "Code fournisseur", "Email",
      "Prénom", "Nom", "Téléphone", "Langue",
      "Statut", "Action", "Tentatives", "Owner", "Workspace ID",
      "Compte créé", "Inscrit webinaire", "Formé (webinaire)", "Configuré",
      "Commentaires",
    ];

    const esc = (v: string) => `"${String(v ?? "").replace(/"/g, '""')}"`;

    const rows = sorted.map((s) => [
      s.supplierName,
      s.supplierCode ?? "",
      s.email ?? "",
      s.firstName ?? "",
      s.lastName ?? "",
      s.phone ?? "",
      s.language ?? "",
      statusLabel(s.status),
      actionLabel(s.action),
      s.action === "ATTEMPTED" ? String(s.callAttempts) : "",
      s.owner?.name ?? "",
      s.workspaceId ?? "",
      s.accountCreated  ? "Oui" : "Non",
      s.registeredWebinar ? "Oui" : "Non",
      s.assistedWebinar ? "Oui" : "Non",
      s.configured      ? "Oui" : "Non",
      s.comments ?? "",
    ]);

    // BOM UTF-8 pour que Excel ouvre correctement les accents
    const csv = "﻿" + [HEADERS, ...rows].map((row) => row.map(esc).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `fournisseurs-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="p-6 space-y-5">
      {/* KPI Bar */}
      <div className="grid grid-cols-5 gap-3">
        {[
          { label: "Total fournisseurs", value: total,        color: "bg-gray-50   border-gray-200   text-gray-700",    icon: <Building2    className="w-4 h-4 text-gray-400" /> },
          { label: "Compte créé",        value: withAccount,  color: "bg-blue-50   border-blue-100   text-blue-700",    icon: <CheckCircle2 className="w-4 h-4 text-blue-400" /> },
          { label: "Inscrit webinaire",  value: registeredWeb,color: "bg-yellow-50  border-yellow-100  text-yellow-700", icon: <Users        className="w-4 h-4 text-yellow-400" /> },
          { label: "Formés (webinaire)", value: trainedWeb,   color: "bg-orange-50  border-orange-100  text-orange-700", icon: <Users        className="w-4 h-4 text-orange-400" /> },
          { label: "Configurés",         value: configured,   color: "bg-emerald-50 border-emerald-100 text-emerald-700",icon: <CheckCircle2 className="w-4 h-4 text-emerald-500" /> },
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
        <select value={filterOwner} onChange={(e) => setFilterOwner(e.target.value)}
          className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500">
          <option value="ALL">Tous les owners</option>
          <option value="UNASSIGNED">Non assigné</option>
          {users.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
        </select>
        <div className="flex-1" />
        <button
          onClick={exportCsv}
          title={`Exporter ${sorted.length} fournisseur${sorted.length !== 1 ? "s" : ""} en CSV`}
          className="flex items-center gap-1.5 px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50 transition-colors"
        >
          <Download className="w-4 h-4" />
          Exporter CSV
        </button>
        {canManage && (
          <>
            <input ref={fileRef} type="file" accept=".csv" className="hidden" onChange={handleCsvImport} />
            <button onClick={() => fileRef.current?.click()} disabled={importing}
              className="flex items-center gap-1.5 px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50 transition-colors disabled:opacity-60">
              <Upload className="w-4 h-4" />
              {importing ? "Import..." : "Importer CSV"}
            </button>
            <button onClick={() => { setAddForm(EMPTY_FORM); setShowAddModal(true); }}
              className="flex items-center gap-1.5 px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-medium transition-colors">
              <Plus className="w-4 h-4" /> Ajouter
            </button>
          </>
        )}
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="overflow-auto max-h-[65vh]">
          <table className="w-full text-sm">
            <thead className="sticky top-0 z-10">
              <tr className="bg-gray-50 border-b border-gray-100">
                <SortTh col="supplierName" label="Fournisseur" className="px-4" {...sortProps} />
                <SortTh col="owner"        label="Owner"       {...sortProps} />
                <SortTh col="status"       label="Statut"      {...sortProps} />
                <SortTh col="action"       label="Action"      {...sortProps} />
                <SortTh col="accountCreated"   label="Compte"    align="center" {...sortProps} />
                <SortTh col="workspaceId"  label="WS ID"       align="center" {...sortProps} />
                <SortTh col="supplierCode" label="Code"        align="center" {...sortProps} />
                <SortTh col="registeredWebinar" label="Inscrit WB" align="center" {...sortProps} />
                <SortTh col="assistedWebinar"   label="Formé"     align="center" {...sortProps} />
                <SortTh col="configured"        label="Config."   align="center" {...sortProps} />
                <th className="text-left px-3 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Commentaires</th>
                {canEdit && <th className="px-3 py-3" />}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {sorted.length === 0 && (
                <tr><td colSpan={12} className="text-center py-12 text-gray-400">Aucun fournisseur trouvé</td></tr>
              )}
              {sorted.map((s) => (
                <SupplierRow
                  key={s.id}
                  supplier={s}
                  users={users}
                  canEdit={canEdit}
                  canManage={canManage}
                  saving={saving}
                  editingCommentId={editingCommentId}
                  setEditingCommentId={setEditingCommentId}
                  onToggle={toggleField}
                  onPatch={patchSupplier}
                  onDelete={deleteSupplier}
                  onEdit={openEdit}
                />
              ))}
            </tbody>
          </table>
        </div>
        <div className="px-4 py-2.5 border-t border-gray-100 bg-gray-50 text-xs text-gray-400">
          {sorted.length} fournisseur{sorted.length !== 1 ? "s" : ""}
          {sorted.length !== suppliers.length ? ` (sur ${suppliers.length})` : ""}
          {sortCol && <span className="ml-2 text-emerald-500">· Trié par {sortCol} {sortDir === "asc" ? "↑" : "↓"}</span>}
        </div>
      </div>

      {/* ── Modal Ajouter ── */}
      {showAddModal && (
        <SupplierModal
          title="Ajouter un fournisseur"
          form={addForm}
          setForm={setAddForm}
          saving={saving === "add"}
          onSubmit={handleAdd}
          onClose={() => setShowAddModal(false)}
          submitLabel="Ajouter"
        />
      )}

      {/* ── Modal Modifier ── */}
      {editSupplier && (
        <SupplierModal
          title={`Modifier · ${editSupplier.supplierName}`}
          form={editForm}
          setForm={setEditForm}
          saving={saving === "edit"}
          onSubmit={handleEdit}
          onClose={() => setEditSupplier(null)}
          submitLabel="Enregistrer"
        />
      )}
    </div>
  );
}

// ── Modal partagée Ajouter / Modifier ─────────────────────────────────────────
function SupplierModal({
  title, form, setForm, saving, onSubmit, onClose, submitLabel,
}: {
  title: string; form: SupplierForm; setForm: (f: SupplierForm) => void;
  saving: boolean; onSubmit: (e: React.FormEvent) => void;
  onClose: () => void; submitLabel: string;
}) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-semibold text-gray-900 truncate pr-4">{title}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-1 rounded-lg hover:bg-gray-100 flex-shrink-0">
            <X className="w-4 h-4" />
          </button>
        </div>
        <form onSubmit={onSubmit} className="space-y-3">
          <SupplierFormFields form={form} setForm={setForm} />
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose}
              className="flex-1 px-4 py-2.5 border border-gray-300 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors">
              Annuler
            </button>
            <button type="submit" disabled={saving}
              className="flex-1 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white px-4 py-2.5 rounded-lg text-sm font-medium transition-colors">
              {saving ? "Enregistrement..." : submitLabel}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Supplier row ──────────────────────────────────────────────────────────────
function SupplierRow({
  supplier: s, users, canEdit, canManage, saving, editingCommentId, setEditingCommentId,
  onToggle, onPatch, onDelete, onEdit,
}: {
  supplier: Supplier; users: UserItem[]; canEdit: boolean; canManage: boolean; saving: string | null;
  editingCommentId: string | null; setEditingCommentId: (id: string | null) => void;
  onToggle: (s: Supplier, f: "accountCreated"|"registeredWebinar"|"assistedWebinar"|"configured") => void;
  onPatch: (id: string, data: Partial<Supplier>) => void;
  onDelete: (id: string) => void;
  onEdit: (s: Supplier) => void;
}) {
  const isEditingComment = editingCommentId === s.id;
  const [comment, setComment]           = useState(s.comments ?? "");
  const [supplierCode, setSupplierCode] = useState(s.supplierCode ?? "");
  const [wsId, setWsId]                 = useState(s.workspaceId ?? "");

  function saveComment() {
    onPatch(s.id, { comments: comment || null });
    setEditingCommentId(null);
  }

  return (
    <tr className="hover:bg-gray-50 transition-colors">
      {/* Fournisseur */}
      <td className="px-4 py-3">
        <p className="font-medium text-gray-900 text-sm">{s.supplierName}</p>
        {(s.firstName || s.lastName) && (
          <p className="text-xs text-gray-400">{[s.firstName, s.lastName].filter(Boolean).join(" ")}</p>
        )}
        {s.email && <p className="text-xs text-gray-400">{s.email}</p>}
        <div className="flex items-center gap-2 mt-0.5">
          {s.phone    && <span className="text-xs text-gray-300 flex items-center gap-0.5"><Phone  className="w-2.5 h-2.5" />{s.phone}</span>}
          {s.language && <span className="text-xs text-gray-300 flex items-center gap-0.5"><Globe  className="w-2.5 h-2.5" />{s.language}</span>}
        </div>
      </td>

      {/* Owner */}
      <td className="px-3 py-3">
        {canEdit ? (
          <div className="relative">
            <select
              value={s.ownerId ?? ""}
              onChange={(e) => {
                const uid = e.target.value || null;
                const u = users.find((x) => x.id === uid);
                onPatch(s.id, { ownerId: uid, owner: u ? { id: u.id, name: u.name } : null });
              }}
              className={`appearance-none text-xs px-2 py-1.5 pr-5 rounded-lg border cursor-pointer focus:outline-none focus:ring-1 focus:ring-emerald-400 max-w-[130px] truncate ${
                s.ownerId ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-gray-200 bg-white text-gray-400"
              }`}
            >
              <option value="">Non assigné</option>
              {users.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
            </select>
            <ChevronDown className="w-2.5 h-2.5 absolute right-1.5 top-1/2 -translate-y-1/2 pointer-events-none opacity-50" />
          </div>
        ) : (
          s.owner
            ? <span className="text-xs px-2 py-1 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200">{s.owner.name}</span>
            : <span className="text-xs text-gray-300">—</span>
        )}
      </td>

      {/* Statut */}
      <td className="px-3 py-3">
        {canEdit ? (
          <div className="relative">
            <select value={s.status} onChange={(e) => onPatch(s.id, { status: e.target.value })}
              className={`appearance-none text-xs px-2 py-1 rounded-full border font-medium pr-5 cursor-pointer focus:outline-none ${statusStyle(s.status)}`}>
              {STATUS_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
            <ChevronDown className="w-2.5 h-2.5 absolute right-1.5 top-1/2 -translate-y-1/2 pointer-events-none opacity-50" />
          </div>
        ) : (
          <span className={`text-xs px-2 py-1 rounded-full border font-medium ${statusStyle(s.status)}`}>{statusLabel(s.status)}</span>
        )}
      </td>

      {/* Action + compteur tentatives */}
      <td className="px-3 py-3">
        {canEdit ? (
          <div className="flex flex-col gap-1.5">
            <select value={s.action} onChange={(e) => onPatch(s.id, { action: e.target.value })}
              className="text-xs px-2 py-1 border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-1 focus:ring-emerald-400">
              {ACTION_OPTIONS.map((a) => <option key={a.value} value={a.value}>{a.label}</option>)}
            </select>
            {s.action === "ATTEMPTED" && (
              <div className="flex items-center gap-1">
                <button type="button"
                  onClick={() => onPatch(s.id, { callAttempts: Math.max(0, s.callAttempts - 1) })}
                  className="w-6 h-6 flex items-center justify-center rounded-md bg-gray-100 hover:bg-gray-200 text-gray-600 transition-colors">
                  <Minus className="w-3 h-3" />
                </button>
                <span className="text-xs font-semibold text-gray-700 w-6 text-center tabular-nums">{s.callAttempts}</span>
                <button type="button"
                  onClick={() => onPatch(s.id, { callAttempts: s.callAttempts + 1 })}
                  className="w-6 h-6 flex items-center justify-center rounded-md bg-gray-100 hover:bg-gray-200 text-gray-600 transition-colors">
                  <Plus className="w-3 h-3" />
                </button>
                <span className="text-xs text-gray-400 ml-0.5">essai{s.callAttempts !== 1 ? "s" : ""}</span>
              </div>
            )}
          </div>
        ) : (
          <div className="flex flex-col gap-0.5">
            <span className="text-xs text-gray-600">{actionLabel(s.action)}</span>
            {s.action === "ATTEMPTED" && s.callAttempts > 0 && (
              <span className="text-xs text-gray-400">{s.callAttempts} essai{s.callAttempts !== 1 ? "s" : ""}</span>
            )}
          </div>
        )}
      </td>

      {/* Compte créé */}
      <td className="px-3 py-3 text-center">
        <CheckToggle checked={s.accountCreated} onChange={() => onToggle(s, "accountCreated")}
          disabled={!canEdit || saving === s.id + "accountCreated"} />
      </td>

      {/* WS ID éditable */}
      <td className="px-3 py-3 text-center">
        {canEdit ? (
          <input value={wsId} onChange={(e) => setWsId(e.target.value)}
            onBlur={() => wsId !== (s.workspaceId ?? "") && onPatch(s.id, { workspaceId: wsId || null })}
            placeholder="—"
            className="w-28 text-xs px-2 py-1.5 border border-transparent hover:border-gray-200 focus:border-emerald-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-400 text-gray-700 bg-transparent hover:bg-white focus:bg-white transition-colors text-center font-mono"
          />
        ) : (
          <span className="text-xs text-gray-500 font-mono">{s.workspaceId || "—"}</span>
        )}
      </td>

      {/* Code fournisseur éditable */}
      <td className="px-3 py-3 text-center">
        {canEdit ? (
          <input value={supplierCode} onChange={(e) => setSupplierCode(e.target.value)}
            onBlur={() => supplierCode !== (s.supplierCode ?? "") && onPatch(s.id, { supplierCode: supplierCode || null })}
            placeholder="—"
            className="w-24 text-xs px-2 py-1.5 border border-transparent hover:border-gray-200 focus:border-emerald-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-400 text-gray-700 bg-transparent hover:bg-white focus:bg-white transition-colors text-center font-mono"
          />
        ) : (
          <span className="text-xs text-gray-500 font-mono">{s.supplierCode || "—"}</span>
        )}
      </td>

      {/* Inscrit WB */}
      <td className="px-3 py-3 text-center">
        <CheckToggle checked={s.registeredWebinar} onChange={() => onToggle(s, "registeredWebinar")}
          disabled={!canEdit || saving === s.id + "registeredWebinar"} />
      </td>
      {/* Formé */}
      <td className="px-3 py-3 text-center">
        <CheckToggle checked={s.assistedWebinar} onChange={() => onToggle(s, "assistedWebinar")}
          disabled={!canEdit || saving === s.id + "assistedWebinar"} />
      </td>
      {/* Config. */}
      <td className="px-3 py-3 text-center">
        <CheckToggle checked={s.configured} onChange={() => onToggle(s, "configured")}
          disabled={!canEdit || saving === s.id + "configured"} />
      </td>

      {/* Commentaires */}
      <td className="px-3 py-3 max-w-[160px]">
        {isEditingComment ? (
          <div className="flex gap-1">
            <textarea value={comment} onChange={(e) => setComment(e.target.value)}
              rows={2} autoFocus
              className="flex-1 text-xs px-2 py-1 border border-emerald-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-400 resize-none"
            />
            <div className="flex flex-col gap-1">
              <button onClick={saveComment} className="text-emerald-600 hover:text-emerald-700 p-0.5"><CheckCircle2 className="w-4 h-4" /></button>
              <button onClick={() => { setComment(s.comments ?? ""); setEditingCommentId(null); }} className="text-gray-400 hover:text-gray-600 p-0.5"><X className="w-4 h-4" /></button>
            </div>
          </div>
        ) : (
          <button onClick={() => canEdit && setEditingCommentId(s.id)}
            className={`text-left w-full text-xs text-gray-500 leading-relaxed ${canEdit ? "hover:text-gray-800 cursor-pointer" : ""}`}
            title={s.comments ?? ""}
          >
            {s.comments
              ? <span className="line-clamp-2">{s.comments}</span>
              : canEdit && <span className="flex items-center gap-1 text-gray-300 hover:text-gray-500"><MessageSquare className="w-3 h-3" />Ajouter...</span>
            }
          </button>
        )}
      </td>

      {/* Crayon + Poubelle */}
      {canEdit && (
        <td className="px-3 py-3">
          <div className="flex items-center gap-1">
            <button onClick={() => onEdit(s)}
              className="p-1.5 text-gray-300 hover:text-emerald-500 hover:bg-emerald-50 rounded-lg transition-colors"
              title="Modifier">
              <Pencil className="w-3.5 h-3.5" />
            </button>
            {canManage && (
              <button onClick={() => onDelete(s.id)}
                className="p-1.5 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                title="Supprimer">
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </td>
      )}
    </tr>
  );
}
