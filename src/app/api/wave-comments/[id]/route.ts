import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const { id } = await params;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const userId = (session.user as any).id;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const role = (session.user as any).role;

  const comment = await prisma.waveTaskComment.findUnique({ where: { id } });
  if (!comment) return NextResponse.json({ error: "Introuvable" }, { status: 404 });
  if (comment.authorId !== userId && role !== "ADMIN")
    return NextResponse.json({ error: "Accès refusé" }, { status: 403 });

  await prisma.waveTaskComment.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
