import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session) return new NextResponse("Non autorisé", { status: 401 });

  const { id } = await params;
  const file = await prisma.taskFile.findUnique({
    where: { id },
    select: { url: true, name: true, mimeType: true },
  });
  if (!file) return new NextResponse("Fichier introuvable", { status: 404 });

  // Récupère le blob privé côté serveur avec le token
  const res = await fetch(file.url, {
    headers: { authorization: `Bearer ${process.env.BLOB_READ_WRITE_TOKEN}` },
  });

  if (!res.ok) return new NextResponse("Erreur de téléchargement", { status: 502 });

  const headers = new Headers();
  headers.set("Content-Type", file.mimeType ?? "application/octet-stream");
  headers.set("Content-Disposition", `attachment; filename="${encodeURIComponent(file.name)}"`);
  if (res.headers.get("content-length")) {
    headers.set("Content-Length", res.headers.get("content-length")!);
  }

  return new NextResponse(res.body, { headers });
}
