import { redirect } from "next/navigation";
import { UserManagementView } from "@/components/users/user-management-view";
import { requireUser } from "@/server/permissions";
import { listUsers } from "@/server/services/user-service";

export default async function UsersPage() {
  const actor = await requireUser();

  if (actor.role !== "admin") {
    redirect("/dashboard");
  }

  const users = await listUsers();

  return (
    <UserManagementView
      initialUsers={users}
      currentUserId={actor.id}
    />
  );
}

