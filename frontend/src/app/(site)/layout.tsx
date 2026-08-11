import type { ReactNode } from "react";
import { getPublicSettings } from "@/lib/publicApi";
import SiteShell from "./_SiteShell";
import "./site.css";

export default async function SiteLayout({ children }: { children: ReactNode }) {
  const settings = await getPublicSettings();
  return <SiteShell settings={settings}>{children}</SiteShell>;
}
