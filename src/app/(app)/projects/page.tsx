import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ProjectsClient } from "./ProjectsClient";

export default async function ProjectsPage() {
  const session = await getServerSession(authOptions);
  if (!session) return null;

  const where =
    session.user.role === "PROJECT_MANAGER" ? { managerId: session.user.id } : {};

  const [projects, users, templates, allTags] = await Promise.all([
    prisma.project.findMany({
      where,
      include: {
        manager: { select: { id: true, name: true } },
        milestones: { include: { tasks: true } },
        tags: { select: { id: true, name: true, color: true } },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.user.findMany({
      where: { role: { in: ["ADMIN", "PROJECT_MANAGER"] } },
      select: { id: true, name: true, email: true },
      orderBy: { name: "asc" },
    }),
    prisma.projectTemplate.findMany({
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
    prisma.tag.findMany({ orderBy: { name: "asc" } }),
  ]);

  return (
    <ProjectsClient
      projects={projects}
      users={users}
      templates={templates}
      allTags={allTags}
      currentUserRole={session.user.role}
      currentUserId={session.user.id}
    />
  );
}
