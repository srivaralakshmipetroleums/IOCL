import { redirect } from "next/navigation";

export default function Page() {
  redirect("/dashboard?tab=finance&finance=bank");
}
