import { NextResponse } from "next/server";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ codigo: string }> }
) {
  const { codigo } = await params;
  try {
    const res = await fetch(
      `https://brasilapi.com.br/api/fipe/veiculos/v1/${codigo}`,
      { next: { revalidate: 86400 } }
    );
    if (!res.ok) throw new Error(`FIPE status ${res.status}`);
    const data = await res.json();
    return NextResponse.json(data);
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 502 });
  }
}
