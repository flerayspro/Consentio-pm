import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

// ── Standard template data (from Project Planning Vague 3 Excel) ──────────────
const STANDARD_TEMPLATE = {
  name: "Template Standard Activation",
  description: "Template basé sur le retro-planning Vague 3 Intermarché. 5 phases, 15 tâches.",
  isDefault: true,
  milestones: [
    { name: "Collecte des données", owner: "Consentio", order: 0, offsetDays: 0, tasks: [
      { name: "Finalisation complète des données fournisseurs et produits", owner: "Client", order: 0, durationDays: 0 },
      { name: "Début des configurations techniques sur le workspace (référentiel, arborescence, identification fournisseurs)", owner: "Consentio", order: 1, durationDays: 4 },
      { name: "Préparation des liens d'invitation personnalisés pour les fournisseurs", owner: "Consentio", order: 2, durationDays: 0 },
    ]},
    { name: "Mobilisation Acheteur et Fournisseurs", owner: "Consentio", order: 1, offsetDays: 0, tasks: [
      { name: "Envoi de l'email de communication par l'acheteur (introduction du projet aux fournisseurs)", owner: "Client", order: 0, durationDays: 0 },
      { name: "Invitation des nouveaux fournisseurs via lien dédié", owner: "Consentio", order: 1, durationDays: 0 },
      { name: "Information ciblée des fournisseurs déjà utilisateurs de la plateforme", owner: "Consentio", order: 2, durationDays: 0 },
    ]},
    { name: "Paramétrage des workspaces Consentio", owner: "Consentio", order: 2, offsetDays: 2, tasks: [
      { name: "Appel des fournisseurs pour valider la création de leurs comptes Consentio", owner: "Consentio", order: 0, durationDays: 8 },
      { name: "Configuration des workspaces des nouveaux fournisseurs", owner: "Consentio", order: 1, durationDays: 6 },
      { name: "Configuration des workspaces des fournisseurs historiques Consentio", owner: "Consentio", order: 2, durationDays: 6 },
    ]},
    { name: "Formation", owner: "Consentio", order: 3, offsetDays: 2, tasks: [
      { name: "Planification et préparation du webinar de formation Consentio", owner: "Consentio", order: 0, durationDays: 2 },
      { name: "Formation acheteur + backups (en présentiel)", owner: "Consentio", order: 1, durationDays: 9 },
      { name: "Vérification exhaustive des configurations", owner: "Consentio", order: 2, durationDays: 11 },
      { name: "Webinar collectif fournisseurs (30-40 minutes)", owner: "Consentio", order: 3, durationDays: 10 },
      { name: "Envoi de l'email post webinar", owner: "Consentio", order: 4, durationDays: 11 },
    ]},
    { name: "Déploiement", owner: "Consentio", order: 4, offsetDays: 14, tasks: [
      { name: "Début effectif des offres quotidiennes sur Consentio", owner: "Fournisseurs", order: 0, durationDays: 14 },
      { name: "Activation du support proactif", owner: "Consentio", order: 1, durationDays: 36 },
      { name: "Vérification que 100 % des fournisseurs partagent leurs offres", owner: "Consentio", order: 2, durationDays: 36 },
    ]},
  ],
};

async function ensureDefaultTemplate(userId: string) {
  const count = await prisma.waveTemplate.count();
  if (count === 0) {
    await prisma.waveTemplate.create({
      data: {
        name: STANDARD_TEMPLATE.name,
        description: STANDARD_TEMPLATE.description,
        isDefault: true,
        createdById: userId,
        milestones: {
          create: STANDARD_TEMPLATE.milestones.map((m) => ({
            name: m.name, owner: m.owner, order: m.order, offsetDays: m.offsetDays,
            tasks: { create: m.tasks.map((t) => ({ name: t.name, owner: t.owner, order: t.order, durationDays: t.durationDays })) },
          })),
        },
      },
    });
  }
}

const createSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  milestones: z.array(z.object({
    name: z.string().min(1),
    owner: z.string().default("Consentio"),
    order: z.number().default(0),
    offsetDays: z.number().default(0),
    tasks: z.array(z.object({
      name: z.string().min(1),
      owner: z.string().default("Consentio"),
      order: z.number().default(0),
      durationDays: z.number().default(0),
    })).default([]),
  })).default([]),
});

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await ensureDefaultTemplate((session.user as any).id);

  const templates = await prisma.waveTemplate.findMany({
    include: {
      milestones: { include: { tasks: true }, orderBy: { order: "asc" } },
      _count: { select: { waves: true } },
    },
    orderBy: [{ isDefault: "desc" }, { createdAt: "asc" }],
  });

  return NextResponse.json(templates);
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const role = (session.user as any).role;
  if (role === "MEMBER") return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const userId = (session.user as any).id;

  const body = await req.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const template = await prisma.waveTemplate.create({
    data: {
      name: parsed.data.name,
      description: parsed.data.description,
      createdById: userId,
      milestones: {
        create: parsed.data.milestones.map((m) => ({
          name: m.name, owner: m.owner, order: m.order, offsetDays: m.offsetDays,
          tasks: { create: m.tasks.map((t) => ({ name: t.name, owner: t.owner, order: t.order, durationDays: t.durationDays })) },
        })),
      },
    },
    include: { milestones: { include: { tasks: true } }, _count: { select: { waves: true } } },
  });

  return NextResponse.json(template, { status: 201 });
}
