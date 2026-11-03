import { redirect } from "next/navigation";
import { getOptionalActor } from "@/server/permissions";

export default async function HomePage() {
  const actor = await getOptionalActor();
  if (actor) {
    redirect("/dashboard");
  }
  redirect("/login");
}
