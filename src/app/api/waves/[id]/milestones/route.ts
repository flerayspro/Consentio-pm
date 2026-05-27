import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const schema = z.object({
  name:    z.string().min(1),
  dueDate: z.string(),
});

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  if ((session.user as any).role === "MEMBER")
    return NextResponse.json({ error: "Accès refusé" }, { status: 403 });

  const { id: waveId } = await params;
  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const count = await prisma.waveMilestone.count({ where: { waveId } });
  const milestone = await prisma.waveMilestone.create({
    data: {
      waveId,
      name: parsed.data.name,
      dueDate: new Date(parsed.data.dueDate),
      order: count,
      owner: "",
    },
    include: { tasks: true },
  });

  return NextResponse.json(milestone, { status: 201 });
}
