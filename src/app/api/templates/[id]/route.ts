import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const updateSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().optional(),
});

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const template = await prisma.projectTemplate.findUnique({
    where: { id: params.id },
    include: {
      createdBy: { select: { id: true, name: true } },
      milestones: {
        include: { tasks: { orderBy: { order: "asc" } } },
        orderBy: { order: "asc" },
      },
    },
  });

  if (!template) return NextResponse.json({ error: "Template introuvable" }, { status: 404 });
  return NextResponse.json(template);
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  if (session.user.role === "MEMBER")
    return NextResponse.json({ error: "Accès refusé" }, { status: 403 });

  const body = await req.json();
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const template = await prisma.projectTemplate.update({
    where: { id: params.id },
    data: parsed.data,
  });

  return NextResponse.json(template);
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  if (session.user.role !== "ADMIN")
    return NextResponse.json({ error: "Accès refusé" }, { status: 403 });

  await prisma.projectTemplate.delete({ where: { id: params.id } });
  return NextResponse.json({ success: true });
}
