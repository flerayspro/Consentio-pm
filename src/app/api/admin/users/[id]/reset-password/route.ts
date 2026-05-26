import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

function generateTempPassword() {
  const chars = "abcdefghijkmnpqrstuvwxyz23456789";
  let pwd = "";
  for (let i = 0; i < 8; i++) pwd += chars[Math.floor(Math.random() * chars.length)];
  return pwd.charAt(0).toUpperCase() + pwd.slice(1) + "!";
}

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  if (session.user.role !== "ADMIN") return NextResponse.json({ error: "Accès refusé" }, { status: 403 });

  const { id } = await params;
  const tempPassword = generateTempPassword();
  const hashed = await bcrypt.hash(tempPassword, 10);

  await prisma.user.update({ where: { id }, data: { password: hashed } });

  return NextResponse.json({ tempPassword });
}
