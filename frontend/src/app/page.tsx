import { redirect } from "next/navigation";

// Fallback — o middleware.ts já cuida da raiz "/" por domínio.
// Este redirect só executa se o middleware não estiver rodando (ex: build local sem domínio configurado).
export default function RootPage() {
  redirect("/home");
}
