import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { TemplatesClient } from "./TemplatesClient";

export default async function TemplatesPage() {
  const session = await getServerSession(authOptions);
  if (!session) return null;
  if (session.user.role === "MEMBER") redirect("/dashboard");

  const templates = await prisma.projectTemplate.findMany({
    include: {
      createdBy: { select: { id: true, name: true } },
      milestones: {
        include: { tasks: { orderBy: { order: "asc" } } },
        orderBy: { order: "asc" },
      },
      _count: { select: { projects: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return <TemplatesClient templates={templates} currentUserRole={session.user.role} />;
}
