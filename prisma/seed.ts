import { PrismaClient, Role } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const adminPassword = await bcrypt.hash("admin123", 10);
  const admin = await prisma.user.upsert({
    where: { email: "admin@consentio.co" },
    update: {},
    create: {
      email: "admin@consentio.co",
      name: "Admin Consentio",
      password: adminPassword,
      role: Role.ADMIN,
    },
  });

  const pmPassword = await bcrypt.hash("pm123", 10);
  const pm = await prisma.user.upsert({
    where: { email: "pm@consentio.co" },
    update: {},
    create: {
      email: "pm@consentio.co",
      name: "Chef de Projet",
      password: pmPassword,
      role: Role.PROJECT_MANAGER,
    },
  });

  const memberPassword = await bcrypt.hash("member123", 10);
  await prisma.user.upsert({
    where: { email: "member@consentio.co" },
    update: {},
    create: {
      email: "member@consentio.co",
      name: "Membre Équipe",
      password: memberPassword,
      role: Role.MEMBER,
    },
  });

  const template = await prisma.projectTemplate.upsert({
    where: { id: "template-onboarding" },
    update: {},
    create: {
      id: "template-onboarding",
      name: "Onboarding Client",
      description: "Template standard pour l'onboarding d'un nouveau client",
      createdById: admin.id,
      milestones: {
        create: [
          {
            name: "Phase 1 — Discovery",
            description: "Recueil des besoins et analyse",
            order: 0,
            offsetDays: 0,
            tasks: {
              create: [
                { name: "Kick-off meeting", order: 0, durationDays: 1 },
                { name: "Audit des processus existants", order: 1, durationDays: 5 },
                { name: "Rédaction du cahier des charges", order: 2, durationDays: 7 },
              ],
            },
          },
          {
            name: "Phase 2 — Setup",
            description: "Configuration de la plateforme",
            order: 1,
            offsetDays: 14,
            tasks: {
              create: [
                { name: "Configuration du compte", order: 0, durationDays: 2 },
                { name: "Import des données", order: 1, durationDays: 3 },
                { name: "Formation des utilisateurs", order: 2, durationDays: 5 },
              ],
            },
          },
          {
            name: "Phase 3 — Go Live",
            description: "Lancement en production",
            order: 2,
            offsetDays: 30,
            tasks: {
              create: [
                { name: "Tests de recette", order: 0, durationDays: 3 },
                { name: "Validation client", order: 1, durationDays: 2 },
                { name: "Déploiement production", order: 2, durationDays: 1 },
              ],
            },
          },
        ],
      },
    },
  });

  console.log("Seed terminé :");
  console.log("- Admin:", admin.email, "/ mot de passe: admin123");
  console.log("- PM:", pm.email, "/ mot de passe: pm123");
  console.log("- Template créé:", template.name);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
