import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function requireAdmin(session: any) {
  if (!session) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  if (session.user.role !== "ADMIN") return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
  return null;
}

export async function GET() {
  const session = await getServerSession(authOptions);
  const err = requireAdmin(session);
  if (err) return err;

  const tags = await prisma.tag.findMany({
    orderBy: { name: "asc" },
    include: { _count: { select: { projects: true } } },
  });
  return NextResponse.json(tags);
}

const createSchema = z.object({
  name:  z.string().min(1, "Le nom est requis"),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/, "Couleur hex invalide"),
});

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const err = requireAdmin(session);
  if (err) return err;

  const body = await req.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const tag = await prisma.tag.create({
    data: parsed.data,
    include: { _count: { select: { projects: true } } },
  });
  return NextResponse.json(tag, { status: 201 });
}
