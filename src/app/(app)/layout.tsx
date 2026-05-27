import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { Sidebar } from "@/components/layout/Sidebar";
import { prisma } from "@/lib/prisma";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  const where = session.user.role === "PROJECT_MANAGER" ? { managerId: session.user.id } : {};

  const [projects, templates, waves] = await Promise.all([
    prisma.project.findMany({
      where: { ...where, status: "ACTIVE" },
      select: { id: true, name: true, health: true },
      orderBy: { updatedAt: "desc" },
      take: 10,
    }),
    session.user.role !== "MEMBER"
      ? prisma.projectTemplate.findMany({
          select: { id: true, name: true },
          orderBy: { name: "asc" },
          take: 10,
        })
      : Promise.resolve([]),
    prisma.wave.findMany({
      where: { status: "ACTIVE" },
      select: { id: true, name: true, status: true },
      orderBy: { updatedAt: "desc" },
      take: 10,
    }),
  ]);

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar user={session.user} projects={projects} templates={templates} waves={waves} />
      <main className="flex-1 overflow-y-auto">{children}</main>
    </div>
  );
}
