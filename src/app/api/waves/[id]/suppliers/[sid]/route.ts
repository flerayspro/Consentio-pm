import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const patchSchema = z.object({
  supplierName: z.string().optional(),
  supplierCode: z.string().nullable().optional(),
  email: z.string().optional(),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  phone: z.string().optional(),
  language: z.string().optional(),
  status: z.string().optional(),
  workspaceId: z.string().nullable().optional(),
  action: z.string().optional(),
  callAttempts: z.number().int().min(0).optional(),
  ownerId: z.string().nullable().optional(),
  comments: z.string().nullable().optional(),
  accountCreated: z.boolean().optional(),
  registeredWebinar: z.boolean().optional(),
  assistedWebinar: z.boolean().optional(),
  configured: z.boolean().optional(),
  productFamilies: z.array(z.string()).optional(),
});

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string; sid: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const { sid } = await params;
  const body = await req.json();
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const supplier = await prisma.waveSupplier.update({
    where: { id: sid },
    data: parsed.data,
    include: { owner: { select: { id: true, name: true } } },
  });
  return NextResponse.json(supplier);
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string; sid: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const { sid } = await params;
  await prisma.waveSupplier.delete({ where: { id: sid } });
  return NextResponse.json({ ok: true });
}
