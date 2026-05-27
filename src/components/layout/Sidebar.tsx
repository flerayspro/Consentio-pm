"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { useState, useRef, useEffect } from "react";
import { cn, getRoleLabel } from "@/lib/utils";
import {
  LayoutDashboard, FolderKanban, FileStack, LogOut,
  ChevronRight, ChevronDown, Circle, CheckSquare, Settings, ShieldCheck, Check,
} from "lucide-react";

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
    href: "/flywheel",
    color: "bg-emerald-600",
    letter: "F",
  },
];

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
}

export function Sidebar({ user, projects, templates }: SidebarProps) {
  const pathname = usePathname();
  const [projectsOpen, setProjectsOpen] = useState(true);
  const [templatesOpen, setTemplatesOpen] = useState(false);

  const navItems = [
    { href: "/dashboard",  label: "Dashboard",        icon: LayoutDashboard },
    { href: "/mes-taches", label: "Mes tâches",        icon: CheckSquare },
    { href: "/projects",   label: "Tous les projets",  icon: FolderKanban },
    ...(user.role !== "MEMBER"
      ? [{ href: "/templates", label: "Templates", icon: FileStack }]
      : []),
    ...(user.role === "ADMIN"
      ? [{ href: "/admin", label: "Administration", icon: ShieldCheck }]
      : []),
  ];

  return (
    <aside className="w-64 bg-white border-r border-gray-200 flex flex-col overflow-hidden">
      {/* Workspace switcher */}
      <div className="p-4 border-b border-gray-100 flex-shrink-0">
        <WorkspaceSwitcher />
      </div>

      {/* Nav + sections scrollables */}
      <nav className="flex-1 overflow-y-auto p-3 space-y-0.5">
        {/* Nav principale */}
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                active ? "bg-blue-50 text-blue-700" : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
              )}
            >
              <Icon className="w-4 h-4 flex-shrink-0" />
              <span className="flex-1 truncate">{item.label}</span>
            </Link>
          );
        })}

        {/* Section Projets actifs */}
        {projects.length > 0 && (
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

        {/* Section Templates */}
        {templates.length > 0 && (
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
      </nav>

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
