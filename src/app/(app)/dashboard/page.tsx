import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { DashboardClient } from "./DashboardClient";

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);
  if (!session) return null;

  const where =
    session.user.role === "PROJECT_MANAGER" ? { managerId: session.user.id } : {};

  const projects = await prisma.project.findMany({
    where,
    include: {
      manager: { select: { id: true, name: true } },
      milestones: {
        include: { tasks: true },
        orderBy: { order: "asc" },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return <DashboardClient projects={projects} userName={session.user.name} />;
}
