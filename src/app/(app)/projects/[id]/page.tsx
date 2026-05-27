import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { ProjectDetailClient } from "./ProjectDetailClient";

export default async function ProjectDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session) return null;

  const { id } = await params;
  const [project, users, allTags] = await Promise.all([
    prisma.project.findUnique({
      where: { id },
      include: {
        manager: { select: { id: true, name: true, email: true } },
        template: { select: { id: true, name: true } },
        tags: { select: { id: true, name: true, color: true } },
        milestones: {
          include: {
            tasks: {
              include: { owner: { select: { id: true, name: true } } },
              orderBy: { order: "asc" },
            },
          },
          orderBy: { order: "asc" },
        },
      },
    }),
    prisma.user.findMany({
      select: { id: true, name: true, email: true, role: true },
      orderBy: { name: "asc" },
    }),
    prisma.tag.findMany({ orderBy: { name: "asc" } }),
  ]);

  if (!project) notFound();

  return (
    <ProjectDetailClient
      project={project}
      users={users}
      allTags={allTags}
      currentUserRole={session.user.role}
      currentUserId={session.user.id}
    />
  );
}
