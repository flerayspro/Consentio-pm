import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const patchSchema = z.object({
  name:        z.string().min(1).optional(),
  description: z.string().optional().nullable(),
  status:      z.enum(["TODO", "IN_PROGRESS", "DONE"]).optional(),
  dueDate:     z.string().optional(),
  startDate:   z.string().optional().nullable(),
  assigneeId:  z.string().nullable().optional(),
});

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const { id } = await params;
  const task = await prisma.waveTask.findUnique({
    where: { id },
    include: {
      assignee: { select: { id: true, name: true } },
      comments: {
        include: { author: { select: { id: true, name: true } } },
        orderBy: { createdAt: "asc" },
      },
    },
  });

  if (!task) return NextResponse.json({ error: "Introuvable" }, { status: 404 });
  return NextResponse.json(task);
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const { id } = await params;
  const body = await req.json();
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const data: Record<string, unknown> = { ...parsed.data };
  if (parsed.data.dueDate) data.dueDate = new Date(parsed.data.dueDate);
  if (parsed.data.startDate !== undefined)
    data.startDate = parsed.data.startDate ? new Date(parsed.data.startDate) : null;

  const task = await prisma.waveTask.update({
    where: { id },
    data,
    include: { assignee: { select: { id: true, name: true } } },
  });

  // Auto-update milestone status
  if (parsed.data.status) {
    const siblings = await prisma.waveTask.findMany({
      where: { milestoneId: task.milestoneId },
      select: { status: true },
    });
    const allDone = siblings.every((t) => t.status === "DONE");
    const anyProgress = siblings.some((t) => t.status !== "TODO");
    await prisma.waveMilestone.update({
      where: { id: task.milestoneId },
      data: { status: allDone ? "DONE" : anyProgress ? "IN_PROGRESS" : "TODO" },
    });
  }

  return NextResponse.json(task);
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  if ((session.user as any).role === "MEMBER")
    return NextResponse.json({ error: "Accès refusé" }, { status: 403 });

  const { id } = await params;
  await prisma.waveTask.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
