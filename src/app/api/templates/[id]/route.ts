import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const taskSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  order: z.number().default(0),
  durationDays: z.number().default(1),
});

const milestoneSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  order: z.number().default(0),
  offsetDays: z.number().default(0),
  tasks: z.array(taskSchema).default([]),
});

const putSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  milestones: z.array(milestoneSchema).default([]),
});

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const { id } = await params;
  const template = await prisma.projectTemplate.findUnique({
    where: { id },
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

// Mise à jour complète du template (remplace toutes les milestones et tâches)
export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  if (session.user.role === "MEMBER")
    return NextResponse.json({ error: "Accès refusé" }, { status: 403 });

  const { id } = await params;
  const body = await req.json();
  const parsed = putSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  // Supprime toutes les milestones existantes (cascade sur les tâches)
  await prisma.templateMilestone.deleteMany({ where: { templateId: id } });

  // Recrée le template avec les nouvelles données
  const template = await prisma.projectTemplate.update({
    where: { id },
    data: {
      name: parsed.data.name,
      description: parsed.data.description,
      milestones: {
        create: parsed.data.milestones.map((m) => ({
          name: m.name,
          description: m.description,
          order: m.order,
          offsetDays: m.offsetDays,
          tasks: { create: m.tasks },
        })),
      },
    },
    include: {
      milestones: {
        include: { tasks: { orderBy: { order: "asc" } } },
        orderBy: { order: "asc" },
      },
    },
  });

  return NextResponse.json(template);
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  if (session.user.role !== "ADMIN")
    return NextResponse.json({ error: "Accès refusé" }, { status: 403 });

  const { id } = await params;
  await prisma.projectTemplate.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
