import { NextResponse } from "next/server";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ tipo: string }> }
) {
  const { tipo } = await params;
  try {
    const res = await fetch(
      `https://brasilapi.com.br/api/fipe/marcas/v1/${tipo}`,
      { next: { revalidate: 86400 } } // cache 24h no servidor
    );
    if (!res.ok) throw new Error(`FIPE status ${res.status}`);
    const data = await res.json();
    return NextResponse.json(data);
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 502 });
  }
}
