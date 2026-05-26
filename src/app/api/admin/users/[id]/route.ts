import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function requireAdmin(session: any) {
  if (!session) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  if (session.user.role !== "ADMIN") return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
  return null;
}

const patchSchema = z.object({
  role:     z.enum(["ADMIN", "PROJECT_MANAGER", "MEMBER"]).optional(),
  name:     z.string().min(1).optional(),
  position: z.string().nullable().optional(),
});

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  const err = requireAdmin(session);
  if (err) return err;

  const { id } = await params;
  const body = await req.json();
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const user = await prisma.user.update({
    where: { id },
    data: parsed.data,
    select: { id: true, name: true, email: true, role: true, position: true, createdAt: true },
  });

  return NextResponse.json(user);
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  const err = requireAdmin(session);
  if (err) return err;

  const { id } = await params;

  // Empêcher l'auto-suppression
  if (id === session!.user.id)
    return NextResponse.json({ error: "Vous ne pouvez pas supprimer votre propre compte" }, { status: 400 });

  // Vérifier qu'il reste au moins un admin
  const target = await prisma.user.findUnique({ where: { id }, select: { role: true } });
  if (target?.role === "ADMIN") {
    const adminCount = await prisma.user.count({ where: { role: "ADMIN" } });
    if (adminCount <= 1)
      return NextResponse.json({ error: "Impossible de supprimer le dernier administrateur" }, { status: 400 });
  }

  await prisma.user.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
