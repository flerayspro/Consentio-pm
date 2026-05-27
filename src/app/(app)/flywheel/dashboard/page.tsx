import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { formatDate } from "@/lib/utils";
import { Zap, Users, CheckCircle2, TrendingUp, ChevronRight } from "lucide-react";

export default async function FlywheelDashboardPage() {
  const session = await getServerSession(authOptions);
  if (!session) return null;

  const waves = await prisma.wave.findMany({
    include: {
      manager: { select: { id: true, name: true } },
      milestones: { include: { tasks: { select: { status: true } } } },
      suppliers: { select: { id: true, accountCreated: true, configured: true, assistedWebinar: true, registeredWebinar: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  const activeWaves     = waves.filter((w) => w.status === "ACTIVE");
  const totalSuppliers  = waves.reduce((s, w) => s + w.suppliers.length, 0);
  const totalConfigured = waves.reduce((s, w) => s + w.suppliers.filter((x) => x.configured).length, 0);
  const totalTrained    = waves.reduce((s, w) => s + w.suppliers.filter((x) => x.assistedWebinar).length, 0);
  const totalAccounts   = waves.reduce((s, w) => s + w.suppliers.filter((x) => x.accountCreated).length, 0);

  function getProgress(wave: typeof waves[0]) {
    const tasks = wave.milestones.flatMap((m) => m.tasks);
    if (!tasks.length) return 0;
    return Math.round((tasks.filter((t) => t.status === "DONE").length / tasks.length) * 100);
  }

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-center gap-2 mb-6">
        <Zap className="w-5 h-5 text-emerald-600" />
        <h1 className="text-2xl font-bold text-gray-900">Dashboard Flywheel</h1>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-4 gap-4 mb-8">
        {[
          { label: "Vagues actives",      value: activeWaves.length,  icon: Zap,          bg: "bg-emerald-50", text: "text-emerald-600" },
          { label: "Fournisseurs suivis", value: totalSuppliers,       icon: Users,         bg: "bg-blue-50",    text: "text-blue-600" },
          { label: "Comptes créés",       value: totalAccounts,        icon: CheckCircle2,  bg: "bg-purple-50",  text: "text-purple-600" },
          { label: "Configurés",          value: totalConfigured,      icon: TrendingUp,    bg: "bg-orange-50",  text: "text-orange-600" },
        ].map(({ label, value, icon: Icon, bg, text }) => (
          <div key={label} className="bg-white rounded-xl border border-gray-200 p-5">
            <div className={`inline-flex p-2 rounded-lg ${bg} mb-3`}>
              <Icon className={`w-5 h-5 ${text}`} />
            </div>
            <p className="text-2xl font-bold text-gray-900">{value}</p>
            <p className="text-sm text-gray-500 mt-0.5">{label}</p>
          </div>
        ))}
      </div>

      {/* Global supplier funnel */}
      {totalSuppliers > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-5 mb-6">
          <h2 className="font-semibold text-gray-900 text-sm mb-4">Entonnoir d'activation (toutes vagues)</h2>
          <div className="grid grid-cols-4 gap-3">
            {[
              { label: "Comptes créés",       value: totalAccounts,   color: "bg-blue-400" },
              { label: "Inscrits webinaire",   value: waves.reduce((s, w) => s + w.suppliers.filter((x) => x.registeredWebinar).length, 0), color: "bg-purple-400" },
              { label: "Formés (webinaire)",   value: totalTrained,    color: "bg-yellow-400" },
              { label: "Configurés",           value: totalConfigured, color: "bg-emerald-500" },
            ].map(({ label, value, color }) => (
              <div key={label} className="text-center">
                <div className={`h-2 rounded-full ${color} mb-2`} style={{ opacity: totalSuppliers > 0 ? 0.3 + (value / totalSuppliers) * 0.7 : 0.3 }} />
                <p className="text-xl font-bold text-gray-900">{value}<span className="text-sm text-gray-400 font-normal">/{totalSuppliers}</span></p>
                <p className="text-xs text-gray-500 mt-0.5">{label}</p>
                <p className="text-xs text-emerald-600 font-medium">{totalSuppliers > 0 ? Math.round((value / totalSuppliers) * 100) : 0}%</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recent waves */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold text-gray-700 text-sm">Vagues récentes</h2>
          <Link href="/flywheel" className="text-xs text-emerald-600 hover:text-emerald-700 font-medium">
            Voir tout →
          </Link>
        </div>
        <div className="grid gap-3">
          {waves.slice(0, 5).map((wave) => {
            const progress = getProgress(wave);
            const configured = wave.suppliers.filter((s) => s.configured).length;
            return (
              <Link key={wave.id} href={`/flywheel/${wave.id}`}
                className="bg-white rounded-xl border border-gray-200 p-4 hover:border-emerald-300 hover:shadow-sm transition-all group flex items-center gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="font-medium text-gray-900 group-hover:text-emerald-700 transition-colors">{wave.name}</p>
                    <span className="text-xs text-gray-400">· {wave.clientName}</span>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-gray-400">
                    <span>{formatDate(wave.startDate)} → {formatDate(wave.endDate)}</span>
                    <span>{wave.suppliers.length} fournisseurs</span>
                    {configured > 0 && <span className="text-emerald-600">{configured} configurés</span>}
                  </div>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-sm font-semibold text-gray-900">{progress}%</p>
                  <div className="w-20 bg-gray-100 rounded-full h-1.5 mt-1">
                    <div className="h-1.5 rounded-full bg-emerald-500" style={{ width: `${progress}%` }} />
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-emerald-400" />
              </Link>
            );
          })}
          {waves.length === 0 && (
            <div className="text-center py-12 text-gray-400">
              <Zap className="w-8 h-8 text-emerald-200 mx-auto mb-3" />
              <p>Aucune vague — <Link href="/flywheel" className="text-emerald-600 hover:underline">créez votre première vague</Link></p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
