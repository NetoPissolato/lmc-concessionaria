import { NextResponse } from "next/server";

export async function GET() {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://site.spacerstorepaineladmin.com";
  const content = `User-agent: *
Allow: /

Sitemap: ${baseUrl}/sitemap.xml
`;
  return new NextResponse(content, {
    headers: { "Content-Type": "text/plain" },
  });
}
