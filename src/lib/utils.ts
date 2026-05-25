import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { format, isPast, isToday } from "date-fns";
import { fr } from "date-fns/locale";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(date: Date | string) {
  return format(new Date(date), "dd MMM yyyy", { locale: fr });
}

export function isOverdue(date: Date | string) {
  return isPast(new Date(date)) && !isToday(new Date(date));
}

export function getStatusLabel(status: string) {
  const labels: Record<string, string> = {
    TODO: "À faire",
    IN_PROGRESS: "En cours",
    DONE: "Terminé",
    ACTIVE: "Actif",
    COMPLETED: "Complété",
    ON_HOLD: "En pause",
    CANCELLED: "Annulé",
  };
  return labels[status] ?? status;
}

export function getRoleLabel(role: string) {
  const labels: Record<string, string> = {
    ADMIN: "Administrateur",
    PROJECT_MANAGER: "Chef de projet",
    MEMBER: "Membre",
  };
  return labels[role] ?? role;
}
