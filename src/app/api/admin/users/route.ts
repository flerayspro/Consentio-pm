import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
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

  const users = await prisma.user.findMany({
    select: {
      id: true, name: true, email: true,
      role: true, position: true, createdAt: true,
      _count: {
        select: {
          managedProjects: true,
          ownedTasks: true,
        },
      },
    },
    orderBy: { createdAt: "asc" },
  });

  return NextResponse.json(users);
}

const createSchema = z.object({
  name:     z.string().min(1),
  email:    z.string().email(),
  role:     z.enum(["ADMIN", "PROJECT_MANAGER", "MEMBER"]),
  position: z.string().optional(),
});

function generateTempPassword() {
  const chars = "abcdefghijkmnpqrstuvwxyz23456789";
  let pwd = "";
  for (let i = 0; i < 8; i++) pwd += chars[Math.floor(Math.random() * chars.length)];
  return pwd.charAt(0).toUpperCase() + pwd.slice(1) + "!";
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const err = requireAdmin(session);
  if (err) return err;

  const body = await req.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const existing = await prisma.user.findUnique({ where: { email: parsed.data.email } });
  if (existing) return NextResponse.json({ error: "Un compte avec cet email existe déjà" }, { status: 409 });

  const tempPassword = generateTempPassword();
  const hashed = await bcrypt.hash(tempPassword, 10);

  const user = await prisma.user.create({
    data: {
      name:     parsed.data.name,
      email:    parsed.data.email,
      role:     parsed.data.role,
      position: parsed.data.position ?? null,
      password: hashed,
    },
    select: { id: true, name: true, email: true, role: true, position: true, createdAt: true },
  });

  return NextResponse.json({ user, tempPassword }, { status: 201 });
}
