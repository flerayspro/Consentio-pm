import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { addDays } from "date-fns";

const createWaveSchema = z.object({
  name: z.string().min(1),
  clientName: z.string().min(1),
  startDate: z.string(),
  endDate: z.string(),
  managerId: z.string(),
  templateId: z.string().optional(),
});

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const waves = await prisma.wave.findMany({
    include: {
      manager: { select: { id: true, name: true } },
      milestones: { include: { tasks: true } },
      suppliers: { select: { id: true, accountCreated: true, configured: true, assistedWebinar: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(waves);
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  if ((session.user as any).role === "MEMBER") return NextResponse.json({ error: "Accès refusé" }, { status: 403 });

  const body = await req.json();
  const parsed = createWaveSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const { name, clientName, startDate, endDate, managerId, templateId } = parsed.data;
  const start = new Date(startDate);

  let milestonesData: Parameters<typeof prisma.wave.create>[0]["data"]["milestones"] = undefined;

  if (templateId) {
    const tpl = await prisma.waveTemplate.findUnique({
      where: { id: templateId },
      include: { milestones: { include: { tasks: true }, orderBy: { order: "asc" } } },
    });
    if (tpl) {
      milestonesData = {
        create: tpl.milestones.map((m) => ({
          name: m.name,
          owner: m.owner,
          order: m.order,
          startDate: addDays(start, m.offsetDays),
          dueDate: addDays(start, m.offsetDays + Math.max(...m.tasks.map((t) => t.durationDays), 0)),
          tasks: {
            create: m.tasks.map((t) => ({
              name: t.name,
              owner: t.owner,
              order: t.order,
              startDate: addDays(start, m.offsetDays),
              dueDate: addDays(start, m.offsetDays + t.durationDays),
            })),
          },
        })),
      };
    }
  }

  const wave = await prisma.wave.create({
    data: { name, clientName, startDate: start, endDate: new Date(endDate), managerId, templateId, milestones: milestonesData },
  });

  return NextResponse.json(wave, { status: 201 });
}
