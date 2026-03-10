import { auth } from "@/lib/auth";
import NotificationsClient from "@/app/(app)/notifications/NotificationsClient";

export default async function NotificationsPage() {
  const session = await auth();

  if (!session) {
    return null;
  }

  return <NotificationsClient />;
}
