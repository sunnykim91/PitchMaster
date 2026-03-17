import { auth } from "@/lib/auth";
import NotificationsClient from "./NotificationsClient";
import { getNotificationsData } from "@/lib/server/getNotificationsData";

export default async function NotificationsPage() {
  const session = await auth();

  if (!session) {
    return null;
  }

  const initialData = await getNotificationsData(session.user.id);
  return <NotificationsClient initialData={initialData} />;
}
