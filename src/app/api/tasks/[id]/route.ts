import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const updateSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().optional(),
  status: z.enum(["TODO", "IN_PROGRESS", "DONE"]).optional(),
  dueDate: z.string().optional(),
  ownerId: z.string().nullable().optional(),
});

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const { id } = await params;
  const body = await req.json();
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const data: Record<string, unknown> = { ...parsed.data };
  if (parsed.data.dueDate) data.dueDate = new Date(parsed.data.dueDate);

  const task = await prisma.task.update({
    where: { id },
    data,
    include: { owner: { select: { id: true, name: true } } },
  });

  // Auto-close milestone if all tasks are DONE
  if (parsed.data.status === "DONE") {
    const sibling = await prisma.task.findMany({
      where: { milestoneId: task.milestoneId },
      select: { status: true },
    });
    const allDone = sibling.every((t) => t.status === "DONE");
    if (allDone) {
      await prisma.milestone.update({ where: { id: task.milestoneId }, data: { status: "DONE" } });
    }
  } else if (parsed.data.status) {
    await prisma.milestone.update({ where: { id: task.milestoneId }, data: { status: "IN_PROGRESS" } });
  }

  return NextResponse.json(task);
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  if (session.user.role === "MEMBER")
    return NextResponse.json({ error: "Accès refusé" }, { status: 403 });

  const { id } = await params;
  await prisma.task.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
