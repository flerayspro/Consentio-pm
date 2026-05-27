import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const schema = z.object({
  name:       z.string().min(1),
  dueDate:    z.string(),
  assigneeId: z.string().optional(),
});

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  if ((session.user as any).role === "MEMBER")
    return NextResponse.json({ error: "Accès refusé" }, { status: 403 });

  const { id: milestoneId } = await params;
  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const count = await prisma.waveTask.count({ where: { milestoneId } });
  const task = await prisma.waveTask.create({
    data: {
      milestoneId,
      name: parsed.data.name,
      dueDate: new Date(parsed.data.dueDate),
      assigneeId: parsed.data.assigneeId || null,
      order: count,
      owner: "",
    },
    include: { assignee: { select: { id: true, name: true } } },
  });

  return NextResponse.json(task, { status: 201 });
}
