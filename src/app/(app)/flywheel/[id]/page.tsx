import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { WaveDetailClient } from "./WaveDetailClient";

export default async function WaveDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session) return null;

  const { id } = await params;

  const [wave, users] = await Promise.all([
    prisma.wave.findUnique({
      where: { id },
      include: {
        manager: { select: { id: true, name: true, email: true } },
        milestones: {
          include: {
            tasks: {
              include: { assignee: { select: { id: true, name: true } } },
              orderBy: { order: "asc" },
            },
          },
          orderBy: { order: "asc" },
        },
        suppliers: {
          orderBy: { supplierName: "asc" },
          include: { owner: { select: { id: true, name: true } } },
        },
      },
    }),
    prisma.user.findMany({
      select: { id: true, name: true, email: true, role: true },
      orderBy: { name: "asc" },
    }),
  ]);

  if (!wave) notFound();

  return (
    <WaveDetailClient
      wave={wave}
      users={users}
      currentUserRole={session.user.role}
      currentUserId={session.user.id}
    />
  );
}
