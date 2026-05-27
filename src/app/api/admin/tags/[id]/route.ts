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
  name:  z.string().min(1).optional(),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
});

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  const err = requireAdmin(session);
  if (err) return err;

  const { id } = await params;
  const body = await req.json();
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const tag = await prisma.tag.update({
    where: { id },
    data: parsed.data,
    include: { _count: { select: { projects: true } } },
  });
  return NextResponse.json(tag);
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  const err = requireAdmin(session);
  if (err) return err;

  const { id } = await params;
  await prisma.tag.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
