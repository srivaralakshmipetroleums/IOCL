import { redirect } from "next/navigation";
import { getServerSession } from "@/lib/supabase/server";

export default async function LoginLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession();

  if (session?.user) {
    redirect("/dashboard");
  }

  return children;
}
