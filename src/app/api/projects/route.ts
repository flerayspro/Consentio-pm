import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { addDays } from "date-fns";

const createProjectSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  startDate: z.string(),
  endDate: z.string(),
  managerId: z.string(),
  templateId: z.string().optional(),
  tagIds: z.array(z.string()).optional(),
});

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const where =
    session.user.role === "PROJECT_MANAGER"
      ? { managerId: session.user.id }
      : session.user.role === "MEMBER"
        ? { milestones: { some: { tasks: { some: { ownerId: session.user.id } } } } }
        : {};

  const projects = await prisma.project.findMany({
    where,
    include: {
      manager: { select: { id: true, name: true, email: true } },
      template: { select: { id: true, name: true } },
      milestones: {
        include: { tasks: true },
        orderBy: { order: "asc" },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(projects);
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  if (session.user.role === "MEMBER")
    return NextResponse.json({ error: "Accès refusé" }, { status: 403 });

  const body = await req.json();
  const parsed = createProjectSchema.safeParse(body);
  if (!parsed.success)
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const { name, description, startDate, endDate, managerId, templateId, tagIds } = parsed.data;

  let milestonesData: Parameters<typeof prisma.project.create>[0]["data"]["milestones"] =
    undefined;

  if (templateId) {
    const template = await prisma.projectTemplate.findUnique({
      where: { id: templateId },
      include: { milestones: { include: { tasks: true }, orderBy: { order: "asc" } } },
    });

    if (template) {
      milestonesData = {
        create: template.milestones.map((m, mIdx) => ({
          name: m.name,
          description: m.description,
          order: mIdx,
          dueDate: addDays(new Date(startDate), m.offsetDays + 14),
          tasks: {
            create: m.tasks.map((t, tIdx) => ({
              name: t.name,
              description: t.description,
              order: tIdx,
              dueDate: addDays(new Date(startDate), m.offsetDays + t.durationDays),
            })),
          },
        })),
      };
    }
  }

  const project = await prisma.project.create({
    data: {
      name,
      description,
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      managerId,
      templateId,
      milestones: milestonesData,
      tags: tagIds && tagIds.length > 0
        ? { connect: tagIds.map((tid) => ({ id: tid })) }
        : undefined,
    },
    include: {
      manager: { select: { id: true, name: true } },
      milestones: { include: { tasks: true } },
    },
  });

  return NextResponse.json(project, { status: 201 });
}
