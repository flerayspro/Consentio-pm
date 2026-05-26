"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { getRoleLabel } from "@/lib/utils";
import {
  User, Mail, Briefcase, Shield, Lock, Eye, EyeOff,
  Check, AlertCircle, Calendar, Settings,
} from "lucide-react";

interface UserData {
  id: string;
  name: string;
  email: string;
  role: string;
  position: string | null;
  createdAt: Date;
}

const AVATAR_COLORS = [
  "from-blue-500 to-blue-600",
  "from-violet-500 to-violet-600",
  "from-emerald-500 to-emerald-600",
  "from-orange-500 to-orange-600",
  "from-pink-500 to-pink-600",
  "from-teal-500 to-teal-600",
];

function getAvatarColor(name: string) {
  const idx = name.charCodeAt(0) % AVATAR_COLORS.length;
  return AVATAR_COLORS[idx];
}

function getInitials(name: string) {
  return name.split(" ").map((n) => n[0]).slice(0, 2).join("").toUpperCase();
}

function PasswordStrength({ password }: { password: string }) {
  if (!password) return null;
  const checks = [
    { label: "8 caractères minimum", ok: password.length >= 8 },
    { label: "Une majuscule",         ok: /[A-Z]/.test(password) },
    { label: "Un chiffre",            ok: /[0-9]/.test(password) },
    { label: "Un caractère spécial",  ok: /[^A-Za-z0-9]/.test(password) },
  ];
  const score = checks.filter((c) => c.ok).length;
  const colors = ["bg-red-400", "bg-orange-400", "bg-yellow-400", "bg-green-400", "bg-green-500"];
  const labels = ["", "Faible", "Moyen", "Bon", "Fort"];

  return (
    <div className="mt-2 space-y-1.5">
      <div className="flex gap-1">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className={`h-1.5 flex-1 rounded-full transition-all ${i < score ? colors[score] : "bg-gray-100"}`} />
        ))}
        <span className={`text-xs font-medium ml-1 ${score >= 3 ? "text-green-600" : score >= 2 ? "text-yellow-600" : "text-red-500"}`}>
          {labels[score]}
        </span>
      </div>
      <div className="flex flex-wrap gap-x-3 gap-y-0.5">
        {checks.map((c) => (
          <span key={c.label} className={`text-xs flex items-center gap-1 ${c.ok ? "text-green-600" : "text-gray-400"}`}>
            <Check className={`w-3 h-3 ${c.ok ? "opacity-100" : "opacity-30"}`} />
            {c.label}
          </span>
        ))}
      </div>
    </div>
  );
}

export function ProfilClient({ user }: { user: UserData }) {
  const router = useRouter();

  // ── Profil ──
  const [name, setName]         = useState(user.name);
  const [position, setPosition] = useState(user.position ?? "");
  const [profileSaving, setProfileSaving]   = useState(false);
  const [profileSuccess, setProfileSuccess] = useState(false);
  const [profileError, setProfileError]     = useState("");

  // ── Mot de passe ──
  const [currentPwd, setCurrentPwd]   = useState("");
  const [newPwd, setNewPwd]           = useState("");
  const [confirmPwd, setConfirmPwd]   = useState("");
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew]         = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [pwdSaving, setPwdSaving]     = useState(false);
  const [pwdSuccess, setPwdSuccess]   = useState(false);
  const [pwdError, setPwdError]       = useState("");

  async function saveProfile(e: React.FormEvent) {
    e.preventDefault();
    setProfileSaving(true);
    setProfileError("");
    setProfileSuccess(false);
    const res = await fetch("/api/me/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, position }),
    });
    if (res.ok) {
      setProfileSuccess(true);
      router.refresh(); // rafraîchit le nom dans la sidebar
      setTimeout(() => setProfileSuccess(false), 3000);
    } else {
      const data = await res.json();
      setProfileError(data.error ?? "Une erreur est survenue");
    }
    setProfileSaving(false);
  }

  async function savePassword(e: React.FormEvent) {
    e.preventDefault();
    setPwdError("");
    setPwdSuccess(false);
    if (newPwd !== confirmPwd) { setPwdError("Les mots de passe ne correspondent pas"); return; }
    if (newPwd.length < 8)     { setPwdError("Le nouveau mot de passe doit faire au moins 8 caractères"); return; }
    setPwdSaving(true);
    const res = await fetch("/api/me/password", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ currentPassword: currentPwd, newPassword: newPwd }),
    });
    if (res.ok) {
      setPwdSuccess(true);
      setCurrentPwd(""); setNewPwd(""); setConfirmPwd("");
      setTimeout(() => setPwdSuccess(false), 3000);
    } else {
      const data = await res.json();
      setPwdError(data.error ?? "Une erreur est survenue");
    }
    setPwdSaving(false);
  }

  const avatarColor = getAvatarColor(name);
  const initials    = getInitials(name);

  return (
    <div className="flex flex-col h-full overflow-y-auto bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-8 py-5 flex-shrink-0">
        <div className="flex items-center gap-2">
          <Settings className="w-5 h-5 text-gray-400" />
          <h1 className="text-xl font-bold text-gray-900">Préférences</h1>
        </div>
        <p className="text-sm text-gray-400 mt-0.5">Gérez vos informations personnelles et votre sécurité</p>
      </div>

      <div className="flex-1 p-8">
        <div className="max-w-2xl space-y-6">

          {/* ── Carte avatar + identité ── */}
          <div className="bg-white rounded-2xl border border-gray-200 p-6">
            <div className="flex items-center gap-5">
              <div className={`w-20 h-20 rounded-2xl bg-gradient-to-br ${avatarColor} flex items-center justify-center flex-shrink-0 shadow-sm`}>
                <span className="text-white font-bold text-2xl">{initials}</span>
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900">{name}</h2>
                {position && <p className="text-sm text-gray-500 mt-0.5">{position}</p>}
                <div className="flex items-center gap-2 mt-2">
                  <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${
                    user.role === "ADMIN" ? "bg-purple-100 text-purple-700" :
                    user.role === "PROJECT_MANAGER" ? "bg-blue-100 text-blue-700" :
                    "bg-gray-100 text-gray-600"
                  }`}>
                    {getRoleLabel(user.role)}
                  </span>
                  <span className="text-xs text-gray-400">{user.email}</span>
                </div>
              </div>
            </div>
          </div>

          {/* ── Informations personnelles ── */}
          <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <User className="w-4 h-4 text-gray-400" />
                <h3 className="font-semibold text-gray-900">Informations personnelles</h3>
              </div>
            </div>
            <form onSubmit={saveProfile} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Nom complet <span className="text-red-400">*</span>
                </label>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-shadow"
                  placeholder="Prénom Nom"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5 flex items-center gap-1.5">
                  <Briefcase className="w-3.5 h-3.5 text-gray-400" />
                  Poste / Titre
                </label>
                <input
                  value={position}
                  onChange={(e) => setPosition(e.target.value)}
                  className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-shadow"
                  placeholder="Ex: Chef de projet, Account Manager..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5 flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5 text-gray-400" />
                  Adresse email
                </label>
                <input
                  value={user.email}
                  disabled
                  className="w-full px-3.5 py-2.5 border border-gray-100 rounded-xl text-sm bg-gray-50 text-gray-400 cursor-not-allowed"
                />
                <p className="text-xs text-gray-400 mt-1">L'email ne peut pas être modifié.</p>
              </div>

              {profileError && (
                <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl px-3.5 py-2.5">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  {profileError}
                </div>
              )}

              <div className="flex items-center justify-between pt-2">
                {profileSuccess ? (
                  <span className="flex items-center gap-1.5 text-sm text-green-600 font-medium">
                    <Check className="w-4 h-4" /> Modifications enregistrées
                  </span>
                ) : <span />}
                <button
                  type="submit"
                  disabled={profileSaving}
                  className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white rounded-xl text-sm font-medium transition-colors"
                >
                  {profileSaving ? "Enregistrement..." : "Enregistrer"}
                </button>
              </div>
            </form>
          </div>

          {/* ── Mon compte (lecture seule) ── */}
          <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <Shield className="w-4 h-4 text-gray-400" />
                <h3 className="font-semibold text-gray-900">Mon compte</h3>
              </div>
            </div>
            <div className="p-6 grid grid-cols-2 gap-4">
              <div className="bg-gray-50 rounded-xl p-4">
                <p className="text-xs text-gray-400 mb-1">Rôle</p>
                <span className={`text-sm font-semibold ${
                  user.role === "ADMIN" ? "text-purple-700" :
                  user.role === "PROJECT_MANAGER" ? "text-blue-700" :
                  "text-gray-700"
                }`}>
                  {getRoleLabel(user.role)}
                </span>
              </div>
              <div className="bg-gray-50 rounded-xl p-4">
                <p className="text-xs text-gray-400 mb-1 flex items-center gap-1">
                  <Calendar className="w-3 h-3" /> Membre depuis
                </p>
                <p className="text-sm font-medium text-gray-700">
                  {new Date(user.createdAt).toLocaleDateString("fr-FR", {
                    day: "numeric", month: "long", year: "numeric"
                  })}
                </p>
              </div>
            </div>
          </div>

          {/* ── Sécurité / mot de passe ── */}
          <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <Lock className="w-4 h-4 text-gray-400" />
                <h3 className="font-semibold text-gray-900">Mot de passe</h3>
              </div>
            </div>
            <form onSubmit={savePassword} className="p-6 space-y-4">
              {/* Mot de passe actuel */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Mot de passe actuel</label>
                <div className="relative">
                  <input
                    type={showCurrent ? "text" : "password"}
                    value={currentPwd}
                    onChange={(e) => setCurrentPwd(e.target.value)}
                    required
                    className="w-full px-3.5 py-2.5 pr-10 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="••••••••"
                  />
                  <button type="button" onClick={() => setShowCurrent(!showCurrent)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                    {showCurrent ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Nouveau mot de passe */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Nouveau mot de passe</label>
                <div className="relative">
                  <input
                    type={showNew ? "text" : "password"}
                    value={newPwd}
                    onChange={(e) => setNewPwd(e.target.value)}
                    required
                    className="w-full px-3.5 py-2.5 pr-10 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="••••••••"
                  />
                  <button type="button" onClick={() => setShowNew(!showNew)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                    {showNew ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <PasswordStrength password={newPwd} />
              </div>

              {/* Confirmer */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Confirmer le nouveau mot de passe</label>
                <div className="relative">
                  <input
                    type={showConfirm ? "text" : "password"}
                    value={confirmPwd}
                    onChange={(e) => setConfirmPwd(e.target.value)}
                    required
                    className={`w-full px-3.5 py-2.5 pr-10 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      confirmPwd && newPwd !== confirmPwd ? "border-red-300 bg-red-50" : "border-gray-200"
                    }`}
                    placeholder="••••••••"
                  />
                  <button type="button" onClick={() => setShowConfirm(!showConfirm)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                    {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {confirmPwd && newPwd !== confirmPwd && (
                  <p className="text-xs text-red-500 mt-1">Les mots de passe ne correspondent pas</p>
                )}
              </div>

              {pwdError && (
                <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl px-3.5 py-2.5">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  {pwdError}
                </div>
              )}

              <div className="flex items-center justify-between pt-2">
                {pwdSuccess ? (
                  <span className="flex items-center gap-1.5 text-sm text-green-600 font-medium">
                    <Check className="w-4 h-4" /> Mot de passe mis à jour
                  </span>
                ) : <span />}
                <button
                  type="submit"
                  disabled={pwdSaving || !currentPwd || !newPwd || !confirmPwd}
                  className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white rounded-xl text-sm font-medium transition-colors"
                >
                  {pwdSaving ? "Mise à jour..." : "Changer le mot de passe"}
                </button>
              </div>
            </form>
          </div>

        </div>
      </div>
    </div>
  );
}
