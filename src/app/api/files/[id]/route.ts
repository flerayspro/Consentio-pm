import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { del } from "@vercel/blob";

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const { id } = await params;
  const file = await prisma.taskFile.findUnique({ where: { id } });
  if (!file) return NextResponse.json({ error: "Introuvable" }, { status: 404 });

  if (file.uploadedById !== session.user.id && session.user.role !== "ADMIN")
    return NextResponse.json({ error: "Accès refusé" }, { status: 403 });

  await del(file.url);
  await prisma.taskFile.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
