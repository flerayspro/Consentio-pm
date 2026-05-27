import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { FlywheelTemplatesClient } from "./FlywheelTemplatesClient";

export default async function FlywheelTemplatesPage() {
  const session = await getServerSession(authOptions);
  if (!session) return null;

  return (
    <FlywheelTemplatesClient
      currentUserRole={session.user.role}
      currentUserId={session.user.id}
    />
  );
}
