import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { AdminClient } from "./AdminClient";

export default async function AdminPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");
  if (session.user.role !== "ADMIN") redirect("/dashboard");

  const users = await prisma.user.findMany({
    select: {
      id: true, name: true, email: true,
      role: true, position: true, createdAt: true,
      _count: { select: { managedProjects: true, ownedTasks: true } },
    },
    orderBy: { createdAt: "asc" },
  });

  return <AdminClient users={users} currentUserId={session.user.id} />;
}
