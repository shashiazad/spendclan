import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { isGoogleConfigured } from "@/lib/auth-options";
import { RegisterForm } from "@/components/auth/RegisterForm";

/** Signed-in people go straight to their groups; Google is offered only when it's configured. */
export default async function Page() {
  const session = await getSession();
  if (session?.user?.id) redirect("/groups");
  return <RegisterForm googleEnabled={isGoogleConfigured()} />;
}
