import { redirect } from "next/navigation";

// Em produção: / vai ser servido pelo domínio do site público (subdomínio)
// Em desenvolvimento local: redireciona para /home (dentro do grupo (site))
export default function RootPage() {
  redirect("/home");
}

