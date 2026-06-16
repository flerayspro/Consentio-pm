"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { useState, useRef, useEffect } from "react";
import { cn, getRoleLabel } from "@/lib/utils";
import {
  LayoutDashboard, FolderKanban, FileStack, LogOut,
  ChevronRight, ChevronDown, Circle, CheckSquare, Settings, ShieldCheck,
  Check, Zap,
} from "lucide-react";

// ── Workspace definitions ────────────────────────────────────────────────────
const WORKSPACES = [
  {
    id: "implementation",
    name: "Consentio Implementation",
    subtitle: "Gestion de projet",
    href: "/dashboard",
    color: "bg-blue-600",
    letter: "I",
  },
  {
    id: "flywheel",
    name: "Consentio Flywheel",
    subtitle: "Activation fournisseurs",
    href: "/flywheel/dashboard",
    color: "bg-emerald-600",
    letter: "F",
  },
];

const HEALTH_COLORS: Record<string, string> = {
  ON_TRACK: "text-green-400",
  LATE: "text-red-400",
  AT_RISK: "text-yellow-400",
  BLOCKED: "text-red-600",
  CANCELLED: "text-gray-400",
  COMPLETED: "text-blue-400",
};

interface SidebarProps {
  user: { name: string; email: string; role: string };
  projects: { id: string; name: string; health: string }[];
  templates: { id: string; name: string }[];
  waves: { id: string; name: string; status: string }[];
  waveTemplates: { id: string; name: string; isDefault: boolean }[];
}

// ── Workspace switcher ────────────────────────────────────────────────────────
function WorkspaceSwitcher() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const isFlywheel = pathname.startsWith("/flywheel");
  const current = isFlywheel ? WORKSPACES[1] : WORKSPACES[0];

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-3 w-full hover:bg-gray-50 rounded-xl p-1 -m-1 transition-colors group"
      >
        <div className={`w-8 h-8 ${current.color} rounded-xl flex items-center justify-center flex-shrink-0`}>
          <span className="text-white font-bold text-sm">{current.letter}</span>
        </div>
        <div className="flex-1 min-w-0 text-left">
          <p className="font-semibold text-gray-900 text-sm leading-tight truncate">{current.name}</p>
          <p className="text-xs text-gray-400 leading-tight">{current.subtitle}</p>
        </div>
        <ChevronDown className={`w-3.5 h-3.5 text-gray-400 flex-shrink-0 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-gray-200 rounded-xl shadow-lg z-50 p-1.5">
          <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider px-2.5 py-1.5">Instances</p>
          {WORKSPACES.map((ws) => {
            const isActive = ws.id === current.id;
            return (
              <Link
                key={ws.id}
                href={ws.href}
                onClick={() => setOpen(false)}
                className={cn(
                  "flex items-center gap-3 px-2.5 py-2.5 rounded-lg transition-colors",
                  isActive ? "bg-gray-50" : "hover:bg-gray-50"
                )}
              >
                <div className={`w-7 h-7 ${ws.color} rounded-lg flex items-center justify-center flex-shrink-0`}>
                  <span className="text-white font-bold text-xs">{ws.letter}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 leading-tight">{ws.name}</p>
                  <p className="text-xs text-gray-400 leading-tight">{ws.subtitle}</p>
                </div>
                {isActive && <Check className="w-4 h-4 text-blue-500 flex-shrink-0" />}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── Main sidebar ──────────────────────────────────────────────────────────────
export function Sidebar({ user, projects, templates, waves, waveTemplates }: SidebarProps) {
  const pathname = usePathname();
  const [projectsOpen, setProjectsOpen] = useState(true);
  const [templatesOpen, setTemplatesOpen] = useState(false);
  const [wavesOpen, setWavesOpen] = useState(true);
  const [waveTemplatesOpen, setWaveTemplatesOpen] = useState(false);

  const isFlywheel = pathname.startsWith("/flywheel");

  // ── Navigation items ───────────────────────────────────────────────────────
  const implNavItems = [
    { href: "/dashboard",  label: "Dashboard",        icon: LayoutDashboard },
    { href: "/mes-taches", label: "Mes tâches",        icon: CheckSquare },
    { href: "/projects",   label: "Tous les projets",  icon: FolderKanban },
    ...(user.role !== "MEMBER" ? [{ href: "/templates", label: "Templates", icon: FileStack }] : []),
  ];

  const flywheelNavItems = [
    { href: "/flywheel/dashboard",   label: "Dashboard",           icon: LayoutDashboard },
    { href: "/flywheel/mes-taches",  label: "Mes tâches",          icon: CheckSquare },
    { href: "/flywheel",             label: "Tous les projets",    icon: Zap },
    ...(user.role !== "MEMBER" ? [{ href: "/flywheel/templates", label: "Templates", icon: FileStack }] : []),
  ];

  const navItems = isFlywheel ? flywheelNavItems : implNavItems;

  function isActive(href: string, exact = false) {
    if (exact) return pathname === href;
    // For the wave list, only active when exactly /flywheel
    if (href === "/flywheel") return pathname === "/flywheel";
    return pathname === href || pathname.startsWith(href + "/");
  }

  return (
    <aside className="w-64 bg-white border-r border-gray-200 flex flex-col overflow-hidden">
      {/* Workspace switcher */}
      <div className="p-4 border-b border-gray-100 flex-shrink-0">
        <WorkspaceSwitcher />
      </div>

      {/* Nav + scrollable sections */}
      <nav className="flex-1 overflow-y-auto p-3 space-y-0.5">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                active
                  ? isFlywheel ? "bg-emerald-50 text-emerald-700" : "bg-blue-50 text-blue-700"
                  : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
              )}
            >
              <Icon className="w-4 h-4 flex-shrink-0" />
              <span className="flex-1 truncate">{item.label}</span>
            </Link>
          );
        })}

        {/* ── Implementation: active projects ──────────────────────────── */}
        {!isFlywheel && projects.length > 0 && (
          <div className="pt-2">
            <button
              onClick={() => setProjectsOpen((o) => !o)}
              className="flex items-center gap-2 px-3 py-1.5 w-full text-xs font-semibold text-gray-400 uppercase tracking-wider hover:text-gray-600 transition-colors"
            >
              {projectsOpen ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
              Projets actifs
            </button>
            {projectsOpen && (
              <div className="mt-0.5 space-y-0.5">
                {projects.map((p) => {
                  const active = pathname === `/projects/${p.id}` || pathname.startsWith(`/projects/${p.id}/`);
                  return (
                    <Link
                      key={p.id}
                      href={`/projects/${p.id}`}
                      className={cn(
                        "flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm transition-colors group",
                        active ? "bg-blue-50 text-blue-700" : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                      )}
                    >
                      <Circle className={cn("w-2 h-2 flex-shrink-0 fill-current", HEALTH_COLORS[p.health] || "text-gray-400")} />
                      <span className="truncate flex-1">{p.name}</span>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ── Implementation: templates ─────────────────────────────────── */}
        {!isFlywheel && templates.length > 0 && (
          <div className="pt-2">
            <button
              onClick={() => setTemplatesOpen((o) => !o)}
              className="flex items-center gap-2 px-3 py-1.5 w-full text-xs font-semibold text-gray-400 uppercase tracking-wider hover:text-gray-600 transition-colors"
            >
              {templatesOpen ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
              Templates
            </button>
            {templatesOpen && (
              <div className="mt-0.5 space-y-0.5">
                {templates.map((t) => (
                  <Link
                    key={t.id}
                    href="/templates"
                    className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm text-gray-600 hover:bg-gray-100 hover:text-gray-900 transition-colors"
                  >
                    <FileStack className="w-3.5 h-3.5 flex-shrink-0 text-gray-400" />
                    <span className="truncate">{t.name}</span>
                  </Link>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── Flywheel: active waves ────────────────────────────────────── */}
        {isFlywheel && waves.length > 0 && (
          <div className="pt-2">
            <button
              onClick={() => setWavesOpen((o) => !o)}
              className="flex items-center gap-2 px-3 py-1.5 w-full text-xs font-semibold text-gray-400 uppercase tracking-wider hover:text-gray-600 transition-colors"
            >
              {wavesOpen ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
              Vagues actives
            </button>
            {wavesOpen && (
              <div className="mt-0.5 space-y-0.5">
                {waves.map((w) => {
                  const active = pathname === `/flywheel/${w.id}` || pathname.startsWith(`/flywheel/${w.id}/`);
                  return (
                    <Link
                      key={w.id}
                      href={`/flywheel/${w.id}`}
                      className={cn(
                        "flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm transition-colors",
                        active ? "bg-emerald-50 text-emerald-700" : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                      )}
                    >
                      <Zap className="w-3 h-3 flex-shrink-0 text-emerald-400" />
                      <span className="truncate flex-1">{w.name}</span>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ── Flywheel: templates ───────────────────────────────────────── */}
        {isFlywheel && waveTemplates.length > 0 && (
          <div className="pt-2">
            <button
              onClick={() => setWaveTemplatesOpen((o) => !o)}
              className="flex items-center gap-2 px-3 py-1.5 w-full text-xs font-semibold text-gray-400 uppercase tracking-wider hover:text-gray-600 transition-colors"
            >
              {waveTemplatesOpen ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
              Templates
            </button>
            {waveTemplatesOpen && (
              <div className="mt-0.5 space-y-0.5">
                {waveTemplates.map((t) => (
                  <Link
                    key={t.id}
                    href="/flywheel/templates"
                    className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm text-gray-600 hover:bg-gray-100 hover:text-gray-900 transition-colors"
                  >
                    <FileStack className="w-3.5 h-3.5 flex-shrink-0 text-gray-400" />
                    <span className="truncate flex-1">{t.name}</span>
                  </Link>
                ))}
              </div>
            )}
          </div>
        )}
      </nav>

      {/* ── Global section (instance-agnostic) ──────────────────────────── */}
      {user.role === "ADMIN" && (
        <div className="px-3 pb-2 border-t border-gray-100 pt-2 flex-shrink-0">
          <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider px-3 py-1.5">
            Global
          </p>
          <Link
            href="/admin"
            className={cn(
              "flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
              pathname === "/admin" || pathname.startsWith("/admin/")
                ? "bg-gray-100 text-gray-900"
                : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
            )}
          >
            <ShieldCheck className="w-4 h-4 flex-shrink-0" />
            <span className="flex-1 truncate">Administration</span>
          </Link>
        </div>
      )}

      {/* User + logout */}
      <div className="p-3 border-t border-gray-100 flex-shrink-0">
        <Link
          href="/profil"
          className={cn(
            "flex items-center gap-2.5 px-2 py-1.5 mb-1 rounded-lg transition-colors group",
            pathname === "/profil" ? "bg-blue-50" : "hover:bg-gray-100"
          )}
        >
          <div className="w-7 h-7 bg-blue-600 rounded-full flex items-center justify-center flex-shrink-0">
            <span className="text-white text-xs font-bold">
              {user.name.charAt(0).toUpperCase()}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <p className={cn("text-xs font-medium truncate", pathname === "/profil" ? "text-blue-700" : "text-gray-900")}>
              {user.name}
            </p>
            <p className="text-xs text-gray-400">{getRoleLabel(user.role)}</p>
          </div>
          <Settings className="w-3.5 h-3.5 text-gray-300 group-hover:text-gray-500 flex-shrink-0 transition-colors" />
        </Link>
        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="flex items-center gap-2 px-2 py-1.5 w-full rounded-lg text-xs text-gray-500 hover:text-red-600 hover:bg-red-50 transition-colors"
        >
          <LogOut className="w-3.5 h-3.5" />
          Déconnexion
        </button>
      </div>
    </aside>
  );
}
