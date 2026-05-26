"use client";

import { useState } from "react";
import { getRoleLabel } from "@/lib/utils";
import {
  ShieldCheck, Users, UserPlus, Trash2, KeyRound,
  Copy, Check, AlertCircle, X, Mail, Briefcase,
  FolderKanban, CheckSquare2, Crown, ChevronDown,
} from "lucide-react";

interface UserRow {
  id: string;
  name: string;
  email: string;
  role: string;
  position: string | null;
  createdAt: Date;
  _count: { managedProjects: number; ownedTasks: number };
}

const ROLE_OPTIONS = [
  { value: "ADMIN",           label: "Administrateur", color: "bg-purple-100 text-purple-700 border-purple-200" },
  { value: "PROJECT_MANAGER", label: "Chef de projet",  color: "bg-blue-100 text-blue-700 border-blue-200" },
  { value: "MEMBER",          label: "Membre",          color: "bg-gray-100 text-gray-600 border-gray-200" },
];

function roleStyle(role: string) {
  return ROLE_OPTIONS.find((r) => r.value === role)?.color ?? "bg-gray-100 text-gray-600 border-gray-200";
}

function Avatar({ name, size = "md" }: { name: string; size?: "sm" | "md" }) {
  const colors = ["bg-blue-500", "bg-violet-500", "bg-emerald-500", "bg-orange-500", "bg-pink-500", "bg-teal-500"];
  const color = colors[name.charCodeAt(0) % colors.length];
  const initials = name.split(" ").map((n) => n[0]).slice(0, 2).join("").toUpperCase();
  const sz = size === "sm" ? "w-7 h-7 text-xs" : "w-9 h-9 text-sm";
  return (
    <div className={`${sz} ${color} rounded-full flex items-center justify-center flex-shrink-0 text-white font-bold`}>
      {initials}
    </div>
  );
}

// ── Modal confirmation suppression ────────────────────────────────────────
function DeleteModal({ user, onConfirm, onCancel, loading }: {
  user: UserRow; onConfirm: () => void; onCancel: () => void; loading: boolean;
}) {
  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 bg-red-100 rounded-xl flex items-center justify-center flex-shrink-0">
            <Trash2 className="w-5 h-5 text-red-500" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">Supprimer l'utilisateur</h3>
            <p className="text-sm text-gray-500">Cette action est irréversible</p>
          </div>
        </div>
        <div className="bg-gray-50 rounded-xl p-3 mb-5 flex items-center gap-3">
          <Avatar name={user.name} size="sm" />
          <div>
            <p className="text-sm font-medium text-gray-900">{user.name}</p>
            <p className="text-xs text-gray-400">{user.email}</p>
          </div>
        </div>
        <p className="text-sm text-gray-600 mb-5">
          Le compte sera définitivement supprimé. Les projets et tâches associés ne seront pas supprimés, mais ils seront désassignés.
        </p>
        <div className="flex gap-3">
          <button onClick={onCancel} className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl text-sm font-medium hover:bg-gray-50 transition-colors">
            Annuler
          </button>
          <button onClick={onConfirm} disabled={loading}
            className="flex-1 px-4 py-2.5 bg-red-600 hover:bg-red-700 disabled:opacity-60 text-white rounded-xl text-sm font-medium transition-colors">
            {loading ? "Suppression..." : "Supprimer"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Modal mot de passe temporaire ─────────────────────────────────────────
function TempPasswordModal({ name, email, password, onClose }: {
  name: string; email: string; password: string; onClose: () => void;
}) {
  const [copied, setCopied] = useState(false);
  function copy() {
    navigator.clipboard.writeText(password);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }
  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <KeyRound className="w-5 h-5 text-blue-500" />
            <h3 className="font-semibold text-gray-900">Mot de passe temporaire</h3>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-1 rounded-lg hover:bg-gray-100">
            <X className="w-4 h-4" />
          </button>
        </div>
        <p className="text-sm text-gray-600 mb-4">
          Partagez ce mot de passe temporaire avec <strong>{name}</strong> ({email}). L'utilisateur pourra le modifier depuis ses préférences.
        </p>
        <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 mb-5">
          <code className="flex-1 text-lg font-mono font-bold text-gray-900 tracking-widest">{password}</code>
          <button onClick={copy} className="flex items-center gap-1.5 text-xs font-medium text-blue-600 hover:text-blue-700 px-2 py-1 rounded-lg hover:bg-blue-50 transition-colors">
            {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
            {copied ? "Copié !" : "Copier"}
          </button>
        </div>
        <p className="text-xs text-amber-600 bg-amber-50 border border-amber-100 rounded-xl px-3 py-2 mb-4">
          ⚠ Ce mot de passe ne sera affiché qu'une seule fois. Notez-le avant de fermer.
        </p>
        <button onClick={onClose} className="w-full px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-medium transition-colors">
          J'ai bien noté le mot de passe
        </button>
      </div>
    </div>
  );
}

// ── Modal invitation ───────────────────────────────────────────────────────
function InviteModal({ onClose, onCreated }: {
  onClose: () => void;
  onCreated: (user: UserRow, tempPwd: string) => void;
}) {
  const [form, setForm] = useState({ name: "", email: "", role: "MEMBER", position: "" });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true); setError("");
    const res = await fetch("/api/admin/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const data = await res.json();
    if (!res.ok) { setError(typeof data.error === "string" ? data.error : "Une erreur est survenue"); setSaving(false); return; }
    onCreated(data.user, data.tempPassword);
  }

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl p-6">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            <UserPlus className="w-5 h-5 text-blue-500" />
            <h3 className="font-semibold text-gray-900">Inviter un utilisateur</h3>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-1 rounded-lg hover:bg-gray-100">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Nom complet *</label>
            <input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="Prénom Nom"
              className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5 flex items-center gap-1.5">
              <Mail className="w-3.5 h-3.5 text-gray-400" /> Email *
            </label>
            <input required type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })}
              placeholder="prenom.nom@consentio.co"
              className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5 flex items-center gap-1.5">
              <Briefcase className="w-3.5 h-3.5 text-gray-400" /> Poste
            </label>
            <input value={form.position} onChange={(e) => setForm({ ...form, position: e.target.value })}
              placeholder="Ex: Account Manager..."
              className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Rôle *</label>
            <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}
              className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
              {ROLE_OPTIONS.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
            </select>
            <p className="text-xs text-gray-400 mt-1.5">
              {form.role === "ADMIN" && "Accès complet à toutes les fonctionnalités et à la gestion des comptes."}
              {form.role === "PROJECT_MANAGER" && "Peut créer et gérer des projets et des templates."}
              {form.role === "MEMBER" && "Peut consulter les projets et mettre à jour ses tâches."}
            </p>
          </div>

          {error && (
            <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl px-3.5 py-2.5">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />{error}
            </div>
          )}

          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose}
              className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl text-sm font-medium hover:bg-gray-50 transition-colors">
              Annuler
            </button>
            <button type="submit" disabled={saving}
              className="flex-1 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white rounded-xl text-sm font-medium transition-colors">
              {saving ? "Création..." : "Créer le compte"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Composant principal ────────────────────────────────────────────────────
export function AdminClient({ users: initialUsers, currentUserId }: {
  users: UserRow[];
  currentUserId: string;
}) {
  const [users, setUsers] = useState(initialUsers);
  const [deleteTarget, setDeleteTarget] = useState<UserRow | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState("");
  const [showInvite, setShowInvite] = useState(false);
  const [tempPwd, setTempPwd] = useState<{ name: string; email: string; password: string } | null>(null);
  const [roleChanging, setRoleChanging] = useState<string | null>(null);

  const stats = {
    total:   users.length,
    admins:  users.filter((u) => u.role === "ADMIN").length,
    pms:     users.filter((u) => u.role === "PROJECT_MANAGER").length,
    members: users.filter((u) => u.role === "MEMBER").length,
  };

  async function changeRole(userId: string, newRole: string) {
    setRoleChanging(userId);
    const res = await fetch(`/api/admin/users/${userId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role: newRole }),
    });
    if (res.ok) {
      setUsers((prev) => prev.map((u) => u.id === userId ? { ...u, role: newRole } : u));
    }
    setRoleChanging(null);
  }

  async function deleteUser() {
    if (!deleteTarget) return;
    setDeleting(true); setDeleteError("");
    const res = await fetch(`/api/admin/users/${deleteTarget.id}`, { method: "DELETE" });
    if (res.ok) {
      setUsers((prev) => prev.filter((u) => u.id !== deleteTarget.id));
      setDeleteTarget(null);
    } else {
      const data = await res.json();
      setDeleteError(data.error ?? "Erreur lors de la suppression");
    }
    setDeleting(false);
  }

  async function resetPassword(user: UserRow) {
    const res = await fetch(`/api/admin/users/${user.id}/reset-password`, { method: "POST" });
    if (res.ok) {
      const data = await res.json();
      setTempPwd({ name: user.name, email: user.email, password: data.tempPassword });
    }
  }

  function handleUserCreated(user: UserRow, pwd: string) {
    setUsers((prev) => [...prev, { ...user, _count: { managedProjects: 0, ownedTasks: 0 } }]);
    setShowInvite(false);
    setTempPwd({ name: user.name, email: user.email, password: pwd });
  }

  return (
    <div className="flex flex-col h-full overflow-y-auto bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-8 py-5 flex-shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-purple-600" />
            <h1 className="text-xl font-bold text-gray-900">Administration</h1>
          </div>
          <button onClick={() => setShowInvite(true)}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-xl text-sm font-medium transition-colors">
            <UserPlus className="w-4 h-4" />
            Inviter un utilisateur
          </button>
        </div>
        <p className="text-sm text-gray-400 mt-0.5">Gestion des comptes et des accès</p>
      </div>

      <div className="flex-1 p-8">
        <div className="max-w-5xl space-y-6">

          {/* Stats */}
          <div className="grid grid-cols-4 gap-4">
            {[
              { label: "Utilisateurs", value: stats.total,   icon: Users,       color: "blue",   bg: "bg-blue-50",   text: "text-blue-600" },
              { label: "Admins",       value: stats.admins,  icon: Crown,       color: "purple", bg: "bg-purple-50", text: "text-purple-600" },
              { label: "Chefs projet", value: stats.pms,     icon: FolderKanban, color: "indigo", bg: "bg-indigo-50", text: "text-indigo-600" },
              { label: "Membres",      value: stats.members, icon: CheckSquare2, color: "gray",   bg: "bg-gray-100",  text: "text-gray-600" },
            ].map(({ label, value, icon: Icon, bg, text }) => (
              <div key={label} className="bg-white rounded-xl border border-gray-200 p-5">
                <div className={`inline-flex p-2 rounded-lg ${bg} mb-3`}>
                  <Icon className={`w-5 h-5 ${text}`} />
                </div>
                <p className="text-2xl font-bold text-gray-900">{value}</p>
                <p className="text-sm text-gray-500">{label}</p>
              </div>
            ))}
          </div>

          {/* Table */}
          <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
              <h2 className="font-semibold text-gray-900">Tous les utilisateurs</h2>
              <span className="text-sm text-gray-400">{users.length} compte{users.length !== 1 ? "s" : ""}</span>
            </div>

            <div className="divide-y divide-gray-50">
              {users.map((user) => (
                <div key={user.id} className="flex items-center gap-4 px-6 py-4 hover:bg-gray-50 transition-colors">
                  {/* Avatar + identité */}
                  <Avatar name={user.name} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold text-gray-900">{user.name}</p>
                      {user.id === currentUserId && (
                        <span className="text-xs bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded-full border border-blue-100">Vous</span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <p className="text-xs text-gray-400">{user.email}</p>
                      {user.position && (
                        <>
                          <span className="text-gray-200">·</span>
                          <p className="text-xs text-gray-400">{user.position}</p>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Stats */}
                  <div className="flex items-center gap-4 text-xs text-gray-400 flex-shrink-0">
                    <span className="flex items-center gap-1" title="Projets gérés">
                      <FolderKanban className="w-3.5 h-3.5" />{user._count.managedProjects}
                    </span>
                    <span className="flex items-center gap-1" title="Tâches assignées">
                      <CheckSquare2 className="w-3.5 h-3.5" />{user._count.ownedTasks}
                    </span>
                    <span title="Membre depuis" className="hidden lg:block">
                      {new Date(user.createdAt).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" })}
                    </span>
                  </div>

                  {/* Rôle (editable) */}
                  <div className="relative flex-shrink-0">
                    <select
                      value={user.role}
                      onChange={(e) => changeRole(user.id, e.target.value)}
                      disabled={roleChanging === user.id || user.id === currentUserId}
                      className={`appearance-none pl-2.5 pr-7 py-1.5 rounded-full text-xs font-medium border cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-400 disabled:cursor-not-allowed transition-opacity ${roleStyle(user.role)} ${roleChanging === user.id ? "opacity-50" : ""}`}
                    >
                      {ROLE_OPTIONS.map((r) => (
                        <option key={r.value} value={r.value}>{r.label}</option>
                      ))}
                    </select>
                    <ChevronDown className="w-3 h-3 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none opacity-50" />
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <button onClick={() => resetPassword(user)} title="Réinitialiser le mot de passe"
                      className="p-2 text-gray-400 hover:text-blue-500 hover:bg-blue-50 rounded-lg transition-colors">
                      <KeyRound className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => { setDeleteError(""); setDeleteTarget(user); }}
                      disabled={user.id === currentUserId}
                      title={user.id === currentUserId ? "Vous ne pouvez pas vous supprimer" : "Supprimer"}
                      className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Légende rôles */}
          <div className="bg-white rounded-2xl border border-gray-200 p-5">
            <h3 className="text-sm font-semibold text-gray-700 mb-3">Définition des rôles</h3>
            <div className="space-y-2">
              {[
                { role: "ADMIN",           desc: "Accès total : gestion des comptes, projets, templates, tâches." },
                { role: "PROJECT_MANAGER", desc: "Peut créer des projets et des templates, gérer les milestones et tâches." },
                { role: "MEMBER",          desc: "Accès lecture aux projets, peut mettre à jour le statut de ses tâches." },
              ].map(({ role, desc }) => (
                <div key={role} className="flex items-start gap-3">
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium border flex-shrink-0 mt-0.5 ${roleStyle(role)}`}>
                    {getRoleLabel(role)}
                  </span>
                  <p className="text-sm text-gray-500">{desc}</p>
                </div>
              ))}
            </div>
          </div>

        </div>
      </div>

      {/* Modals */}
      {deleteTarget && (
        <DeleteModal
          user={deleteTarget}
          onConfirm={deleteUser}
          onCancel={() => { setDeleteTarget(null); setDeleteError(""); }}
          loading={deleting}
        />
      )}
      {deleteError && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-red-600 text-white px-4 py-2.5 rounded-xl text-sm shadow-lg flex items-center gap-2 z-50">
          <AlertCircle className="w-4 h-4" />{deleteError}
        </div>
      )}
      {showInvite && <InviteModal onClose={() => setShowInvite(false)} onCreated={handleUserCreated} />}
      {tempPwd && <TempPasswordModal {...tempPwd} onClose={() => setTempPwd(null)} />}
    </div>
  );
}
