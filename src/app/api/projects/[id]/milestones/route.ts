import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const createSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  dueDate: z.string(),
  order: z.number().optional(),
});

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  if (session.user.role === "MEMBER")
    return NextResponse.json({ error: "Accès refusé" }, { status: 403 });

  const { id } = await params;
  const body = await req.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const count = await prisma.milestone.count({ where: { projectId: id } });

  const milestone = await prisma.milestone.create({
    data: {
      name: parsed.data.name,
      description: parsed.data.description,
      dueDate: new Date(parsed.data.dueDate),
      order: parsed.data.order ?? count,
      projectId: id,
    },
    include: { tasks: true },
  });

  return NextResponse.json(milestone, { status: 201 });
}
