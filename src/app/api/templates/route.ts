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

const createSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  milestones: z.array(milestoneSchema).default([]),
});

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const templates = await prisma.projectTemplate.findMany({
    include: {
      createdBy: { select: { id: true, name: true } },
      milestones: {
        include: { tasks: { orderBy: { order: "asc" } } },
        orderBy: { order: "asc" },
      },
      _count: { select: { projects: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(templates);
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  if (session.user.role === "MEMBER")
    return NextResponse.json({ error: "Accès refusé" }, { status: 403 });

  const body = await req.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const template = await prisma.projectTemplate.create({
    data: {
      name: parsed.data.name,
      description: parsed.data.description,
      createdById: session.user.id,
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
      milestones: { include: { tasks: true } },
    },
  });

  return NextResponse.json(template, { status: 201 });
}
