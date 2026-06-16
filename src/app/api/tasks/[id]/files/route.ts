import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { put } from "@vercel/blob";

export const maxDuration = 30; // 30s pour les gros fichiers

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    return NextResponse.json(
      { error: "Stockage non configuré — BLOB_READ_WRITE_TOKEN manquant" },
      { status: 503 }
    );
  }

  const { id } = await params;

  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return NextResponse.json({ error: "Impossible de lire le fichier envoyé" }, { status: 400 });
  }

  const file = formData.get("file") as File | null;
  if (!file || file.size === 0) {
    return NextResponse.json({ error: "Aucun fichier valide" }, { status: 400 });
  }

  // Nom sécurisé pour l'URL (évite caractères spéciaux)
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");

  let blob: { url: string };
  try {
    blob = await put(`tasks/${id}/${Date.now()}-${safeName}`, file, { access: "public" });
  } catch (err) {
    console.error("[upload] Vercel Blob error:", err);
    const msg = err instanceof Error ? err.message : "Erreur inconnue";
    return NextResponse.json({ error: `Échec du stockage : ${msg}` }, { status: 502 });
  }

  const taskFile = await prisma.taskFile.create({
    data: {
      name: file.name,
      url: blob.url,
      size: file.size,
      mimeType: file.type,
      taskId: id,
      uploadedById: session.user.id,
    },
    include: { uploadedBy: { select: { id: true, name: true } } },
  });

  return NextResponse.json(taskFile, { status: 201 });
}
