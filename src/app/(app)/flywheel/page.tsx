import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { FlywheelClient } from "./FlywheelClient";

export default async function FlywheelPage() {
  const session = await getServerSession(authOptions);
  if (!session) return null;

  const [waves, users, allTags] = await Promise.all([
    prisma.wave.findMany({
      include: {
        manager: { select: { id: true, name: true } },
        milestones: { include: { tasks: { select: { status: true } } } },
        suppliers: { select: { id: true, accountCreated: true, configured: true, assistedWebinar: true } },
        tags: { select: { id: true, name: true, color: true } },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.user.findMany({
      where: { role: { in: ["ADMIN", "PROJECT_MANAGER"] } },
      select: { id: true, name: true, email: true },
      orderBy: { name: "asc" },
    }),
    prisma.tag.findMany({ orderBy: { name: "asc" } }),
  ]);

  return (
    <FlywheelClient
      waves={waves}
      users={users}
      allTags={allTags}
      currentUserId={session.user.id}
      currentUserRole={session.user.role}
    />
  );
}
