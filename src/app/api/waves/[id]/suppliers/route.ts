import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const createSchema = z.object({
  supplierName: z.string().min(1),
  supplierCode: z.string().optional(),
  email: z.string().optional(),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  phone: z.string().optional(),
  language: z.string().optional(),
  status: z.string().optional(),
  workspaceId: z.string().optional(),
  action: z.string().optional(),
  callAttempts: z.number().int().min(0).optional(),
  ownerId: z.string().nullable().optional(),
  comments: z.string().optional(),
  productFamilies: z.array(z.string()).optional(),
});

// Bulk import (array of suppliers)
const importSchema = z.array(createSchema);

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const { id } = await params;
  const suppliers = await prisma.waveSupplier.findMany({
    where: { waveId: id },
    orderBy: { supplierName: "asc" },
    include: { owner: { select: { id: true, name: true } } },
  });
  return NextResponse.json(suppliers);
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  if (session.user.role === "MEMBER")
    return NextResponse.json({ error: "Accès refusé" }, { status: 403 });

  const { id } = await params;
  const body = await req.json();

  // Bulk import?
  if (Array.isArray(body)) {
    const parsed = importSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

    await prisma.waveSupplier.createMany({
      data: parsed.data.map((s) => ({ waveId: id, ...s, productFamilies: s.productFamilies ?? [] })),
      skipDuplicates: false,
    });
    const all = await prisma.waveSupplier.findMany({
      where: { waveId: id },
      orderBy: { supplierName: "asc" },
      include: { owner: { select: { id: true, name: true } } },
    });
    return NextResponse.json(all, { status: 201 });
  }

  // Single create
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const supplier = await prisma.waveSupplier.create({
    data: { waveId: id, ...parsed.data, productFamilies: parsed.data.productFamilies ?? [] },
    include: { owner: { select: { id: true, name: true } } },
  });
  return NextResponse.json(supplier, { status: 201 });
}
