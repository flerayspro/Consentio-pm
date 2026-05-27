import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { MesTachesFlywheelClient } from "./MesTachesFlywheelClient";

export default async function MesTachesFlywheelPage() {
  const session = await getServerSession(authOptions);
  if (!session) return null;

  const [tasks, users] = await Promise.all([
    prisma.waveTask.findMany({
      where: { assigneeId: session.user.id },
      include: {
        milestone: {
          select: {
            id: true,
            name: true,
            wave: { select: { id: true, name: true, status: true, clientName: true } },
          },
        },
        assignee: { select: { id: true, name: true } },
      },
      orderBy: { dueDate: "asc" },
    }),
    prisma.user.findMany({
      select: { id: true, name: true, email: true, role: true },
      orderBy: { name: "asc" },
    }),
  ]);

  return (
    <MesTachesFlywheelClient
      tasks={tasks}
      users={users}
      currentUserId={session.user.id}
      currentUserRole={session.user.role}
    />
  );
}
