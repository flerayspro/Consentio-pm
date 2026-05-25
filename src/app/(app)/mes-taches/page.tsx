import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { MesTachesClient } from "./MesTachesClient";

export default async function MesTachesPage() {
  const session = await getServerSession(authOptions);
  if (!session) return null;

  const [tasks, users] = await Promise.all([
    prisma.task.findMany({
      where: { ownerId: session.user.id },
      include: {
        milestone: {
          select: {
            id: true,
            name: true,
            project: { select: { id: true, name: true, health: true } },
          },
        },
        owner: { select: { id: true, name: true } },
      },
      orderBy: { dueDate: "asc" },
    }),
    prisma.user.findMany({
      select: { id: true, name: true, email: true, role: true },
      orderBy: { name: "asc" },
    }),
  ]);

  return (
    <MesTachesClient
      tasks={tasks}
      users={users}
      currentUserId={session.user.id}
      currentUserRole={session.user.role}
    />
  );
}
