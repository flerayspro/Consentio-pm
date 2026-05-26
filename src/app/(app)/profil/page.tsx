import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ProfilClient } from "./ProfilClient";
import { redirect } from "next/navigation";

export default async function ProfilPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      id: true, name: true, email: true,
      role: true, position: true, createdAt: true,
    },
  });

  if (!user) redirect("/login");

  return <ProfilClient user={user} />;
}
