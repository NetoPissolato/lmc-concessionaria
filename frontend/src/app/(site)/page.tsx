import { redirect } from "next/navigation";

// Redireciona (site)/ → /home  (que tem os dados reais com ISR)
export default function SiteRootPage() {
  redirect("/home");
}
