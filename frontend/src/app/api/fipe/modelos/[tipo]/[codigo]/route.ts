import { NextResponse } from "next/server";

// Parallelum tem endpoint real de modelos por marca e tipo
// GET https://parallelum.com.br/fipe-promise/api/v1/{tipo}/marcas/{codigo}/modelos
// Resposta: { modelos: [{ codigo: number, nome: string }], anos: [...] }

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ tipo: string; codigo: string }> }
) {
  const { tipo, codigo } = await params;
  try {
    const res = await fetch(
      `https://parallelum.com.br/fipe-promise/api/v1/${tipo}/marcas/${codigo}/modelos`,
      { next: { revalidate: 86400 } }
    );
    if (!res.ok) throw new Error(`status ${res.status}`);
    const data = await res.json();
    // data.modelos = [{ codigo, nome }]
    return NextResponse.json(data.modelos ?? []);
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 502 });
  }
}
