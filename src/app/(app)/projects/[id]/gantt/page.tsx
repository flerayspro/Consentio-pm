import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { GanttClient } from "./GanttClient";

export default async function GanttPage({ params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return null;

  const project = await prisma.project.findUnique({
    where: { id: params.id },
    include: {
      milestones: {
        include: {
          tasks: { orderBy: { order: "asc" } },
        },
        orderBy: { order: "asc" },
      },
    },
  });

  if (!project) notFound();

  return <GanttClient project={project} />;
}
