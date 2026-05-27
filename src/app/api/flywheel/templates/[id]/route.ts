import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const patchSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().optional().nullable(),
});

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  const { id } = await params;
  const t = await prisma.waveTemplate.findUnique({
    where: { id },
    include: { milestones: { include: { tasks: { orderBy: { order: "asc" } } }, orderBy: { order: "asc" } } },
  });
  if (!t) return NextResponse.json({ error: "Non trouvé" }, { status: 404 });
  return NextResponse.json(t);
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  const { id } = await params;
  const body = await req.json();
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  const t = await prisma.waveTemplate.update({ where: { id }, data: parsed.data });
  return NextResponse.json(t);
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  if ((session.user as any).role !== "ADMIN") return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
  const { id } = await params;
  const t = await prisma.waveTemplate.findUnique({ where: { id } });
  if (t?.isDefault) return NextResponse.json({ error: "Le template standard ne peut pas être supprimé" }, { status: 400 });
  await prisma.waveTemplate.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
