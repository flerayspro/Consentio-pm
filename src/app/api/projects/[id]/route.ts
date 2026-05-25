import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const updateSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().optional(),
  status: z.enum(["ACTIVE", "COMPLETED", "ON_HOLD", "CANCELLED"]).optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  managerId: z.string().optional(),
});

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const project = await prisma.project.findUnique({
    where: { id: params.id },
    include: {
      manager: { select: { id: true, name: true, email: true } },
      template: { select: { id: true, name: true } },
      milestones: {
        include: {
          tasks: {
            include: { owner: { select: { id: true, name: true } } },
            orderBy: { order: "asc" },
          },
        },
        orderBy: { order: "asc" },
      },
    },
  });

  if (!project) return NextResponse.json({ error: "Projet introuvable" }, { status: 404 });
  return NextResponse.json(project);
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const body = await req.json();
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const data: Record<string, unknown> = { ...parsed.data };
  if (parsed.data.startDate) data.startDate = new Date(parsed.data.startDate);
  if (parsed.data.endDate) data.endDate = new Date(parsed.data.endDate);

  const project = await prisma.project.update({
    where: { id: params.id },
    data,
  });

  return NextResponse.json(project);
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  if (session.user.role === "MEMBER")
    return NextResponse.json({ error: "Accès refusé" }, { status: 403 });

  await prisma.project.delete({ where: { id: params.id } });
  return NextResponse.json({ success: true });
}
