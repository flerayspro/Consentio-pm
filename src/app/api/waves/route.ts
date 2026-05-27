import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { addDays } from "date-fns";

// ── Template from "Project Planning Vague 3 Intermarché" Excel ────────────────
const WAVE_TEMPLATE_MILESTONES = [
  {
    name: "Collecte des données", order: 0, offsetDays: 0,
    tasks: [
      { name: "Finalisation complète des données fournisseurs et produits", owner: "Client", durationDays: 0, order: 0 },
      { name: "Début des configurations techniques sur le workspace (référentiel, arborescence, identification fournisseurs)", owner: "Consentio", durationDays: 4, order: 1 },
      { name: "Préparation des liens d'invitation personnalisés pour les fournisseurs", owner: "Consentio", durationDays: 0, order: 2 },
    ],
  },
  {
    name: "Mobilisation Acheteur et Fournisseurs", order: 1, offsetDays: 0,
    tasks: [
      { name: "Envoi de l'email de communication par l'acheteur (introduction du projet aux fournisseurs)", owner: "Client", durationDays: 0, order: 0 },
      { name: "Invitation des nouveaux fournisseurs via lien dédié", owner: "Consentio", durationDays: 0, order: 1 },
      { name: "Information ciblée des fournisseurs déjà utilisateurs de la plateforme", owner: "Consentio", durationDays: 0, order: 2 },
    ],
  },
  {
    name: "Paramétrage des workspaces Consentio", order: 2, offsetDays: 2,
    tasks: [
      { name: "Appel des fournisseurs pour valider la création de leurs comptes Consentio", owner: "Consentio", durationDays: 8, order: 0 },
      { name: "Configuration des workspaces des nouveaux fournisseurs", owner: "Consentio", durationDays: 6, order: 1 },
      { name: "Configuration des workspaces des fournisseurs historiques Consentio", owner: "Consentio", durationDays: 6, order: 2 },
    ],
  },
  {
    name: "Formation", order: 3, offsetDays: 2,
    tasks: [
      { name: "Planification et préparation du webinar de formation Consentio", owner: "Consentio", durationDays: 2, order: 0 },
      { name: "Formation acheteur + backups (en présentiel)", owner: "Consentio", durationDays: 9, order: 1 },
      { name: "Vérification exhaustive des configurations", owner: "Consentio", durationDays: 11, order: 2 },
      { name: "Webinar collectif fournisseurs (30-40 minutes)", owner: "Consentio", durationDays: 10, order: 3 },
      { name: "Envoi de l'email post webinar", owner: "Consentio", durationDays: 11, order: 4 },
    ],
  },
  {
    name: "Déploiement", order: 4, offsetDays: 14,
    tasks: [
      { name: "Début effectif des offres quotidiennes sur Consentio", owner: "Fournisseurs", durationDays: 14, order: 0 },
      { name: "Activation du support proactif", owner: "Consentio", durationDays: 36, order: 1 },
      { name: "Vérification que 100 % des fournisseurs partagent leurs offres", owner: "Consentio", durationDays: 36, order: 2 },
    ],
  },
];

const createWaveSchema = z.object({
  name: z.string().min(1),
  clientName: z.string().min(1),
  startDate: z.string(),
  endDate: z.string(),
  managerId: z.string(),
  useTemplate: z.boolean().optional(),
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

  const { name, clientName, startDate, endDate, managerId, useTemplate } = parsed.data;
  const start = new Date(startDate);

  const wave = await prisma.wave.create({
    data: {
      name,
      clientName,
      startDate: start,
      endDate: new Date(endDate),
      managerId,
      milestones: useTemplate
        ? {
            create: WAVE_TEMPLATE_MILESTONES.map((m) => ({
              name: m.name,
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
          }
        : undefined,
    },
  });

  return NextResponse.json(wave, { status: 201 });
}
