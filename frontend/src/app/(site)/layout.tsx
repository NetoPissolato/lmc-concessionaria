import type { ReactNode } from "react";
import { getPublicSettings } from "@/lib/publicApi";
import SiteShell from "./_SiteShell";
import AnalyticsScripts from "./_AnalyticsScripts";
import "./site.css";

export default async function SiteLayout({ children }: { children: ReactNode }) {
  const settings = await getPublicSettings();
  return (
    <>
      <AnalyticsScripts gaId={settings.ga_id} pixelId={settings.pixel_id} />
      <SiteShell settings={settings}>{children}</SiteShell>
    </>
  );
}
