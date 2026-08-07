/**
 * exportExcel.ts - Relatórios Excel profissionais LCM Concessionária.
 * xlsx-js-style · Cabeçalho dourado · Zebra · Bordas · Totais
 */
/* eslint-disable @typescript-eslint/no-explicit-any */
import XLSXStyle from "xlsx-js-style";
import type { CellStyle, CellObject, WorkSheet } from "xlsx-js-style";

// ─── Paleta ──────────────────────────────────────────────────────────────────
const P = {
  DARK: "1C1410", WHITE: "FFFFFF", GOLD: "F5A623",
  GOLD_L: "FFF3DC", GOLD_S: "FFF8EC",
  EVEN: "F5F5F5", ODD: "FFFFFF", BORDER: "D0C8BB",
  TEXT: "1A1A1A", MUTED: "888888",
  G_BG: "EAF7EE", G_TX: "1A7A3C",
  R_BG: "FDECEA", R_TX: "A01010",
};
const F_BRL = '"R$"#,##0.00';
const F_INT = '#,##0';
const F_PCT = '0.00"%"';

// ─── Tipos de borda / fill ───────────────────────────────────────────────────
function brd(c = P.BORDER): CellStyle["border"] {
  const s = { style: "thin" as const, color: { rgb: c } };
  return { top: s, bottom: s, left: s, right: s };
}
function fill(rgb: string): CellStyle["fill"] {
  return { patternType: "solid", fgColor: { rgb } };
}
function font(bold = false, sz = 10, rgb = P.TEXT): CellStyle["font"] {
  return { bold, sz, color: { rgb }, name: "Calibri" };
}
function aln(h: "left" | "center" | "right" = "left", wrap = false): CellStyle["alignment"] {
  return { horizontal: h, vertical: "center", wrapText: wrap };
}

// ─── Estilos prontos ─────────────────────────────────────────────────────────
const S = {
  hdrTitle:  (): CellStyle => ({ font: font(true, 13, P.WHITE), fill: fill(P.DARK),   alignment: aln("left"),   border: brd(P.DARK) }),
  hdrSub:    (): CellStyle => ({ font: font(false, 9, "CCCCCC"), fill: fill(P.DARK),  alignment: aln("left"),   border: brd(P.DARK) }),
  hdrEmpty:  (): CellStyle => ({ font: font(), fill: fill(P.DARK),   border: brd(P.DARK) }),
  colH:      (): CellStyle => ({ font: font(true, 10, P.WHITE), fill: fill(P.GOLD),   alignment: aln("center"), border: brd(P.BORDER) }),
  colHR:     (): CellStyle => ({ font: font(true, 10, P.WHITE), fill: fill(P.GOLD),   alignment: aln("right"),  border: brd(P.BORDER) }),
  sec:       (): CellStyle => ({ font: font(true, 10, P.GOLD),  fill: fill(P.GOLD_S), alignment: aln("left"),   border: brd(P.BORDER) }),
  tot:       (): CellStyle => ({ font: font(true, 10, "7A4500"),fill: fill(P.GOLD_L), alignment: aln("left"),   border: brd(P.BORDER) }),
  totR:      (fmt = F_BRL): CellStyle => ({ font: font(true, 10, "7A4500"), fill: fill(P.GOLD_L), alignment: aln("right"), border: brd(P.BORDER), numFmt: fmt }),
  row:       (i: number, h: "left"|"center"|"right" = "left"): CellStyle => ({
    font: font(false, 10), fill: fill(i % 2 === 0 ? P.EVEN : P.ODD), border: brd(P.BORDER), alignment: aln(h),
  }),
  rowB:      (i: number): CellStyle => ({
    font: font(true, 10), fill: fill(i % 2 === 0 ? P.EVEN : P.ODD), border: brd(P.BORDER), alignment: aln("left"),
  }),
  num:       (i: number, fmt = F_BRL, bold = false, rgb?: string): CellStyle => ({
    font: font(bold, 10, rgb ?? P.TEXT), fill: fill(i % 2 === 0 ? P.EVEN : P.ODD),
    border: brd(P.BORDER), alignment: aln("right"), numFmt: fmt,
  }),
  badge:     (txRgb: string, bgRgb: string): CellStyle => ({
    font: font(true, 9, txRgb), fill: fill(bgRgb), border: brd(P.BORDER), alignment: aln("center"),
  }),
};

// ─── Célula helpers ──────────────────────────────────────────────────────────
const cs  = (v: string | null | undefined, s: CellStyle): CellObject => ({ v: v ?? "", t: "s", s });
const ns  = (v: number, s: CellStyle): CellObject => ({ v: isFinite(v) ? v : 0, t: "n", s });
const nb  = (v: unknown) => Number(v) || 0;
const str = (v: unknown) => String(v ?? "-");
const today = () => new Date().toLocaleDateString("pt-BR", { day:"2-digit",month:"2-digit",year:"numeric" });

// ─── Linha de cabeçalho empresa ───────────────────────────────────────────────
function hdrRow(cols: number, title: string, style: () => CellStyle): CellObject[] {
  return [cs(title, style()), ...Array.from({ length: cols - 1 }, () => cs("", style()))];
}

// ─── Worksheet builder ───────────────────────────────────────────────────────
function buildWS(
  rows: CellObject[][],
  colW: number[],
  merges: { s: { r: number; c: number }; e: { r: number; c: number } }[] = [],
  rowH?: { hpt: number }[]
): WorkSheet {
  const ws: WorkSheet = {};
  const R = rows.length;
  const C = colW.length;
  for (let r = 0; r < R; r++) {
    for (let c = 0; c < C; c++) {
      const cell = rows[r]?.[c];
      ws[XLSXStyle.utils.encode_cell({ r, c })] = cell ?? cs("", S.hdrEmpty());
    }
  }
  ws["!ref"]    = XLSXStyle.utils.encode_range({ s: { r: 0, c: 0 }, e: { r: R - 1, c: C - 1 } });
  ws["!cols"]   = colW.map(w => ({ wch: w }));
  ws["!merges"] = merges;
  if (rowH) ws["!rows"] = rowH;
  return ws;
}

// ─── 3 linhas de cabeçalho empresa + merges ──────────────────────────────────
function hdrBlock(title: string, sub: string, cols: number) {
  return {
    rows: [
      hdrRow(cols, `LCM CONCESSIONÁRIA  ·  ${title}`, S.hdrTitle),
      hdrRow(cols, sub, S.hdrSub),
      hdrRow(cols, "", S.hdrEmpty),
    ] as CellObject[][],
    merges: [
      { s: { r: 0, c: 0 }, e: { r: 0, c: cols - 1 } },
      { s: { r: 1, c: 0 }, e: { r: 1, c: cols - 1 } },
      { s: { r: 2, c: 0 }, e: { r: 2, c: cols - 1 } },
    ],
    rowH: [{ hpt: 30 }, { hpt: 18 }, { hpt: 8 }],
  };
}

function save(name: string, wb: ReturnType<typeof XLSXStyle.utils.book_new>) {
  XLSXStyle.writeFile(wb, `${name}-${today().replace(/\//g, "-")}.xlsx`);
}

// ════════════════════════════════════════════════════════════════════════════
// 1. VENDAS
// ════════════════════════════════════════════════════════════════════════════
export function exportVendasExcel(data: {
  periodo: Record<string, unknown>;
  resumo:  Record<string, number>;
  vendas:  Record<string, unknown>[];
}) {
  const WB  = XLSXStyle.utils.book_new();
  const r   = data.resumo;
  const lbl = str((data.periodo as any).label || "Todos os períodos");
  const sub = `Período: ${lbl}  |  Gerado em: ${today()}`;

  // ── Aba 1: DETALHADO (abre primeiro) ──
  const H = [
    "Veículo","Placa","Cor","Tipo","Ano","KM","Cilindrada","Tipo Moto",
    "Cliente","CPF/CNPJ","Telefone","E-mail","Cidade","UF",
    "Vendedor","E-mail Vendedor",
    "Data Venda","Data Entrega","Pagamento","Parcelas","Banco/Bandeira","Observações",
    "Vl. Venda","Entrada","Financiado","Com. %","Comissão R$","Status",
  ];
  const W = [
    28,10,10,8,6,12,9,11,
    24,15,13,26,12,5,
    18,26,
    11,11,14,8,16,22,
    14,12,13,7,12,12,
  ];
  const C = H.length;
  const hdr = hdrBlock("VENDAS DETALHADAS", sub, C);
  const rowsD: CellObject[][] = [
    ...hdr.rows,
    H.map(h => cs(h, S.colH())),
  ];
  data.vendas.forEach((v, i) => {
    const ok = str(v.status) === "concluida";
    rowsD.push([
      cs(str(v.veiculo),            S.row(i)),
      cs(str(v.placa),              S.row(i,"center")),
      cs(str(v.cor),                S.row(i)),
      cs(str(v.tipo).toUpperCase(), S.row(i,"center")),
      ns(nb(v.veiculo_ano),         S.num(i, F_INT)),
      ns(nb(v.quilometragem),       S.num(i, '#,##0" km"')),
      cs(str(v.cilindrada)||"-",    S.row(i,"center")),
      cs(str(v.tipo_moto)||"-",     S.row(i)),
      cs(str(v.cliente),            S.rowB(i)),
      cs(str(v.cliente_cpf),        S.row(i,"center")),
      cs(str(v.cliente_tel),        S.row(i)),
      cs(str(v.cliente_email),      S.row(i)),
      cs(str(v.cliente_cidade),     S.row(i)),
      cs(str(v.cliente_uf),         S.row(i,"center")),
      cs(str(v.vendedor),           S.row(i)),
      cs(str(v.vendedor_email),     S.row(i)),
      cs(str(v.data_venda),         S.row(i,"center")),
      cs(str(v.data_entrega),       S.row(i,"center")),
      cs(str(v.forma_pagamento),    S.row(i)),
      cs(v.parcelas ? `${v.parcelas}x` : "À vista", S.row(i,"center")),
      cs(str(v.banco)||"-",         S.row(i)),
      cs(str(v.observacoes),        S.row(i)),
      ns(nb(v.valor_venda),         S.num(i, F_BRL, true)),
      ns(nb(v.valor_entrada),       S.num(i)),
      ns(nb(v.valor_financiado),    S.num(i)),
      ns(nb(v.comissao_pct),        S.num(i, F_PCT)),
      ns(nb(v.comissao_valor),      S.num(i, F_BRL, false, P.G_TX)),
      cs(str(v.status).toUpperCase(), S.badge(ok?P.G_TX:P.R_TX, ok?P.G_BG:P.R_BG)),
    ]);
  });
  // Linha de total
  const tot: CellObject[] = Array.from({ length: C }, () => cs("", S.tot()));
  tot[0]  = cs("TOTAL GERAL", S.tot());
  tot[22] = ns(r.receita_total,  S.totR());
  tot[26] = ns(r.comissao_total, S.totR());
  rowsD.push(tot);
  XLSXStyle.utils.book_append_sheet(WB, buildWS(rowsD, W, hdr.merges, hdr.rowH), "Vendas Detalhadas");

  // ── Aba 2: Resumo ──
  const HR = 2;
  const hdr2 = hdrBlock("RESUMO DE VENDAS", sub, HR);
  const kpis: [string, number, string][] = [
    ["Total de Vendas",    r.total_vendas,     F_INT],
    ["Concluídas",         r.concluidas,       F_INT],
    ["Pendentes",          r.pendentes,        F_INT],
    ["Canceladas",         r.canceladas,       F_INT],
    ["Receita Total",      r.receita_total,    F_BRL],
    ["Ticket Médio",       r.ticket_medio,     F_BRL],
    ["Total Financiado",   r.total_financiado, F_BRL],
    ["Total em Comissões", r.comissao_total,   F_BRL],
  ];
  const rowsR: CellObject[][] = [
    ...hdr2.rows,
    [cs("RESUMO EXECUTIVO", S.sec()), cs("", S.sec())],
    [cs("Indicador", S.colH()), cs("Valor", S.colHR())],
    ...kpis.map(([l, v, fmt], i) => [cs(l, S.row(i)), ns(v, S.num(i, fmt))]),
  ];
  const mergesR = [
    ...hdr2.merges,
    { s: { r: 3, c: 0 }, e: { r: 3, c: 1 } },
  ];
  XLSXStyle.utils.book_append_sheet(WB, buildWS(rowsR, [32, 22], mergesR, hdr2.rowH), "Resumo");

  save("relatorio-vendas", WB);
}

// ════════════════════════════════════════════════════════════════════════════
// 2. ESTOQUE
// ════════════════════════════════════════════════════════════════════════════
export function exportEstoqueExcel(data: {
  resumo: Record<string, unknown>;
  carros: Record<string, unknown>[];
  motos:  Record<string, unknown>[];
}) {
  const WB  = XLSXStyle.utils.book_new();
  const res = data.resumo;
  const sub = `Gerado em: ${today()}`;

  // ── Aba 1: CARROS ──
  const HC = ["Marca","Modelo","Versão","Ano","Cor","Placa","KM","Status","Dias Est.","Dt. Compra","Custo Compra","Multas","Despesas","Qtd.Desp.","Custo Total","Anunciado","Mínimo","Margem R$","Margem %","Observações"];
  const WC = [13,16,13,6,10,10,12,14,8,11,14,12,12,8,14,14,13,13,9,24];
  const hdrC = hdrBlock("ESTOQUE DE CARROS", sub, HC.length);
  const rowsC: CellObject[][] = [...hdrC.rows, HC.map(h => cs(h, S.colH()))];
  data.carros.forEach((v, i) => {
    rowsC.push([
      cs(str(v.marca),         S.row(i)),
      cs(str(v.modelo),        S.row(i)),
      cs(str(v.versao)||"-",   S.row(i)),
      ns(nb(v.ano),            S.num(i, F_INT)),
      cs(str(v.cor),           S.row(i)),
      cs(str(v.placa),         S.row(i,"center")),
      ns(nb(v.quilometragem),  S.num(i,'#,##0" km"')),
      cs(str(v.status).replace(/_/g," ").toUpperCase(), S.row(i,"center")),
      ns(nb(v.dias_estoque),   S.num(i,'#,##0" d"')),
      cs(str(v.data_compra),   S.row(i,"center")),
      ns(nb(v.valor_compra),   S.num(i)),
      ns(nb(v.valor_multas),   S.num(i)),
      ns(nb(v.total_despesas), S.num(i)),
      ns(nb(v.qtd_despesas),   S.num(i, F_INT)),
      ns(nb(v.custo_total),    S.num(i, F_BRL, true)),
      ns(nb(v.valor_anunciado),S.num(i, F_BRL, true)),
      ns(nb(v.valor_minimo),   S.num(i)),
      ns(nb(v.margem_reais),   S.num(i, F_BRL, false, nb(v.margem_reais)>=0?P.G_TX:P.R_TX)),
      ns(nb(v.margem_pct),     S.num(i, F_PCT, false, nb(v.margem_pct)>=0?P.G_TX:P.R_TX)),
      cs(str(v.observacoes),   S.row(i)),
    ]);
  });
  XLSXStyle.utils.book_append_sheet(WB, buildWS(rowsC, WC, hdrC.merges, hdrC.rowH), "Carros");

  // ── Aba 2: MOTOS ──
  const HM = ["Marca","Modelo","Versão","Ano","Cor","Placa","KM","Cilindrada","Tipo Moto","Status","Dias Est.","Dt. Compra","Custo Total","Anunciado","Mínimo","Margem R$","Margem %","Observações"];
  const WM = [13,16,13,6,10,10,12,10,13,14,8,11,14,14,13,13,9,24];
  const hdrM = hdrBlock("ESTOQUE DE MOTOS", sub, HM.length);
  const rowsM: CellObject[][] = [...hdrM.rows, HM.map(h => cs(h, S.colH()))];
  data.motos.forEach((v, i) => {
    rowsM.push([
      cs(str(v.marca),         S.row(i)),
      cs(str(v.modelo),        S.row(i)),
      cs(str(v.versao)||"-",   S.row(i)),
      ns(nb(v.ano),            S.num(i, F_INT)),
      cs(str(v.cor),           S.row(i)),
      cs(str(v.placa),         S.row(i,"center")),
      ns(nb(v.quilometragem),  S.num(i,'#,##0" km"')),
      ns(nb(v.cilindrada),     S.num(i,'#,##0" cc"')),
      cs(str(v.tipo_moto)||"-",S.row(i)),
      cs(str(v.status).replace(/_/g," ").toUpperCase(), S.row(i,"center")),
      ns(nb(v.dias_estoque),   S.num(i,'#,##0" d"')),
      cs(str(v.data_compra),   S.row(i,"center")),
      ns(nb(v.custo_total),    S.num(i, F_BRL, true)),
      ns(nb(v.valor_anunciado),S.num(i, F_BRL, true)),
      ns(nb(v.valor_minimo),   S.num(i)),
      ns(nb(v.margem_reais),   S.num(i, F_BRL, false, nb(v.margem_reais)>=0?P.G_TX:P.R_TX)),
      ns(nb(v.margem_pct),     S.num(i, F_PCT, false, nb(v.margem_pct)>=0?P.G_TX:P.R_TX)),
      cs(str(v.observacoes),   S.row(i)),
    ]);
  });
  XLSXStyle.utils.book_append_sheet(WB, buildWS(rowsM, WM, hdrM.merges, hdrM.rowH), "Motos");

  // ── Aba 3: Resumo ──
  const HR = 2;
  const hdrR = hdrBlock("RESUMO DO ESTOQUE", sub, HR);
  const kpis: [string, number, string][] = [
    ["Total de Carros",         nb(res.total_carros),        F_INT],
    ["Total de Motos",          nb(res.total_motos),         F_INT],
    ["Disponíveis",             nb(res.disponiveis),         F_INT],
    ["Reservados",              nb(res.reservados),          F_INT],
    ["Em Preparação",           nb(res.em_preparacao),       F_INT],
    ["Vendidos",                nb(res.vendidos),            F_INT],
    ["Valor Total em Estoque",  nb(res.valor_total_estoque), F_BRL],
    ["Custo Total em Estoque",  nb(res.custo_total_estoque), F_BRL],
    ["Média Dias em Estoque",   nb(res.media_dias_estoque),  F_INT],
  ];
  const rowsR: CellObject[][] = [
    ...hdrR.rows,
    [cs("RESUMO DO ESTOQUE", S.sec()), cs("", S.sec())],
    [cs("Indicador", S.colH()), cs("Valor", S.colHR())],
    ...kpis.map(([l, v, fmt], i) => [cs(l, S.row(i)), ns(v, S.num(i, fmt))]),
  ];
  const mergesR = [...hdrR.merges, { s:{r:3,c:0}, e:{r:3,c:1} }];
  XLSXStyle.utils.book_append_sheet(WB, buildWS(rowsR, [32, 22], mergesR, hdrR.rowH), "Resumo");

  save("relatorio-estoque", WB);
}

// ════════════════════════════════════════════════════════════════════════════
// 3. FINANCEIRO
// ════════════════════════════════════════════════════════════════════════════
export function exportFinanceiroExcel(data: {
  periodo:        Record<string, unknown>;
  resumo:         Record<string, number>;
  mensal:         Record<string, unknown>[];
  lancamentos:    Record<string, unknown>[];
  por_categoria?: Record<string, unknown>[];
}) {
  const WB  = XLSXStyle.utils.book_new();
  const r   = data.resumo;
  const lbl = str((data.periodo as any).label || "Todos os períodos");
  const sub = `Período: ${lbl}  |  Gerado em: ${today()}`;

  // ── Aba 1: LANÇAMENTOS ──
  const HL = ["Data","Mês","Ano","Tipo","Categoria","Descrição","Valor (R$)","Observações"];
  const WL = [12,14,6,10,18,40,16,24];
  const hdrL = hdrBlock("LANÇAMENTOS", sub, HL.length);
  const rowsL: CellObject[][] = [...hdrL.rows, HL.map(h => cs(h, S.colH()))];
  data.lancamentos.forEach((l, i) => {
    const ent = str(l.tipo) === "entrada";
    rowsL.push([
      cs(str(l.data),       S.row(i,"center")),
      cs(str(l.nome_mes),   S.row(i)),
      ns(nb(l.ano),         S.num(i, F_INT)),
      cs(str(l.tipo).toUpperCase(), S.badge(ent?P.G_TX:P.R_TX, ent?P.G_BG:P.R_BG)),
      cs(str(l.categoria),  S.row(i)),
      cs(str(l.descricao),  S.row(i)),
      ns(nb(l.valor),       S.num(i, F_BRL, true, ent?P.G_TX:P.R_TX)),
      cs(str(l.observacoes),S.row(i)),
    ]);
  });
  XLSXStyle.utils.book_append_sheet(WB, buildWS(rowsL, WL, hdrL.merges, hdrL.rowH), "Lançamentos");

  // ── Aba 2: DRE Mensal ──
  const HD = ["Mês","Entradas (R$)","Saídas (R$)","Lucro / Prejuízo (R$)","Resultado"];
  const WD = [18,22,20,26,14];
  const hdrD = hdrBlock("DRE MENSAL", sub, HD.length);
  const rowsD: CellObject[][] = [...hdrD.rows, HD.map(h => cs(h, S.colH()))];
  data.mensal.forEach((m, i) => {
    const lucro = nb(m.lucro);
    const pos   = lucro >= 0;
    rowsD.push([
      cs(str(m.nome_mes), S.row(i)),
      ns(nb(m.entradas),  S.num(i, F_BRL, false, P.G_TX)),
      ns(nb(m.saidas),    S.num(i, F_BRL, false, P.R_TX)),
      ns(lucro,           S.num(i, F_BRL, true,  pos?P.G_TX:P.R_TX)),
      cs(pos?"POSITIVO":"NEGATIVO", S.badge(pos?P.G_TX:P.R_TX, pos?P.G_BG:P.R_BG)),
    ]);
  });
  const totD: CellObject[] = Array.from({length:HD.length}, () => cs("", S.tot()));
  totD[0] = cs("TOTAL ANUAL", S.tot());
  totD[1] = ns(r.total_entradas, S.totR());
  totD[2] = ns(r.total_saidas,   S.totR());
  totD[3] = ns(r.lucro_liquido,  S.totR());
  rowsD.push(totD);
  XLSXStyle.utils.book_append_sheet(WB, buildWS(rowsD, WD, hdrD.merges, hdrD.rowH), "DRE Mensal");

  // ── Aba 3: Por Categoria ──
  if (data.por_categoria?.length) {
    const HCat = ["Categoria","Entradas (R$)","Saídas (R$)","Saldo (R$)","Qtd. Lançamentos"];
    const WCat = [24,20,18,20,16];
    const hdrCat = hdrBlock("POR CATEGORIA", sub, HCat.length);
    const rowsCat: CellObject[][] = [...hdrCat.rows, HCat.map(h => cs(h, S.colH()))];
    data.por_categoria.forEach((cat, i) => {
      const saldo = nb(cat.entradas) - nb(cat.saidas);
      rowsCat.push([
        cs(str(cat.categoria),  S.row(i)),
        ns(nb(cat.entradas),    S.num(i, F_BRL, false, P.G_TX)),
        ns(nb(cat.saidas),      S.num(i, F_BRL, false, P.R_TX)),
        ns(saldo,               S.num(i, F_BRL, true, saldo>=0?P.G_TX:P.R_TX)),
        ns(nb(cat.total),       S.num(i, F_INT)),
      ]);
    });
    XLSXStyle.utils.book_append_sheet(WB, buildWS(rowsCat, WCat, hdrCat.merges, hdrCat.rowH), "Por Categoria");
  }

  save("relatorio-financeiro", WB);
}

// ════════════════════════════════════════════════════════════════════════════
// 4. CLIENTES
// ════════════════════════════════════════════════════════════════════════════
export function exportClientesExcel(data: {
  resumo:   Record<string, number>;
  clientes: Record<string, unknown>[];
}) {
  const WB  = XLSXStyle.utils.book_new();
  const r   = data.resumo;
  const sub = `Gerado em: ${today()}`;

  // ── Aba 1: CLIENTES COMPLETO ──
  const HC = ["Nome","CPF/CNPJ","RG","Telefone","E-mail","Endereço","Bairro","Cidade","UF","CEP","Dt. Nasc.","Profissão","Compras","Cancelamentos","Total Gasto","Ticket Médio","1ª Compra","Última Compra","Veículos Comprados","Cliente Desde","Observações"];
  const WC = [26,16,12,14,28,26,14,14,5,10,11,16,8,13,16,16,11,11,40,12,24];
  const hdrC = hdrBlock("CLIENTES COMPLETO", sub, HC.length);
  const rowsC: CellObject[][] = [...hdrC.rows, HC.map(h => cs(h, S.colH()))];
  data.clientes.forEach((cl, i) => {
    rowsC.push([
      cs(str(cl.nome),            S.rowB(i)),
      cs(str(cl.cpf_cnpj),        S.row(i,"center")),
      cs(str(cl.rg),              S.row(i,"center")),
      cs(str(cl.telefone),        S.row(i)),
      cs(str(cl.email),           S.row(i)),
      cs(str(cl.endereco),        S.row(i)),
      cs(str(cl.bairro),          S.row(i)),
      cs(str(cl.cidade),          S.row(i)),
      cs(str(cl.estado),          S.row(i,"center")),
      cs(str(cl.cep),             S.row(i,"center")),
      cs(str(cl.data_nascimento), S.row(i,"center")),
      cs(str(cl.profissao),       S.row(i)),
      ns(nb(cl.total_compras),    S.num(i, F_INT)),
      ns(nb(cl.total_cancelamentos), S.num(i, F_INT)),
      ns(nb(cl.total_gasto),      S.num(i, F_BRL, true)),
      ns(nb(cl.ticket_medio),     S.num(i, F_BRL)),
      cs(str(cl.primeira_compra), S.row(i,"center")),
      cs(str(cl.ultima_compra),   S.row(i,"center")),
      cs(str(cl.veiculos),        S.row(i)),
      cs(str(cl.cliente_desde),   S.row(i,"center")),
      cs(str(cl.observacoes),     S.row(i)),
    ]);
  });
  XLSXStyle.utils.book_append_sheet(WB, buildWS(rowsC, WC, hdrC.merges, hdrC.rowH), "Clientes");

  // ── Aba 2: Resumo ──
  const HR = 2;
  const hdrR = hdrBlock("RESUMO DE CLIENTES", sub, HR);
  const kpis: [string, number, string][] = [
    ["Total de Clientes", r.total_clientes, F_INT],
    ["Com Compra",        r.com_compra,     F_INT],
    ["Recorrentes",       r.recorrentes,    F_INT],
    ["Ticket Médio",      r.ticket_medio,   F_BRL],
    ["Receita Total",     r.receita_total,  F_BRL],
  ];
  const rowsR: CellObject[][] = [
    ...hdrR.rows,
    [cs("CARTEIRA DE CLIENTES", S.sec()), cs("", S.sec())],
    [cs("Indicador", S.colH()), cs("Valor", S.colHR())],
    ...kpis.map(([l, v, fmt], i) => [cs(l, S.row(i)), ns(v, S.num(i, fmt))]),
  ];
  const mergesR = [...hdrR.merges, { s:{r:3,c:0}, e:{r:3,c:1} }];
  XLSXStyle.utils.book_append_sheet(WB, buildWS(rowsR, [30, 22], mergesR, hdrR.rowH), "Resumo");

  save("relatorio-clientes", WB);
}

// ════════════════════════════════════════════════════════════════════════════
// 5. LUCRATIVIDADE
// ════════════════════════════════════════════════════════════════════════════
export function exportLucratividadeExcel(data: {
  periodo:  Record<string, unknown>;
  resumo:   Record<string, unknown>;
  veiculos: Record<string, unknown>[];
}) {
  const WB  = XLSXStyle.utils.book_new();
  const res = data.resumo;
  const lbl = str((data.periodo as any).label || "Todos os períodos");
  const sub = `Período: ${lbl}  |  Gerado em: ${today()}`;

  // ── Aba 1: LUCRATIVIDADE DETALHADA ──
  const HD = ["#","Veículo","Marca","Modelo","Versão","Ano","Tipo","Placa","Cor","KM","Dt. Compra","Dt. Venda","Dias Est.","Custo Compra","Multas","Despesas","Custo Total","Vl. Vendido","Lucro Bruto","Margem %","Margem R$","Cliente","Tel. Cliente","Vendedor","Pagamento","Banco","Com. %","Comissão R$"];
  const WD  = [4,28,12,14,12,6,8,10,10,12,11,11,8,14,12,12,14,14,14,9,12,22,13,18,13,15,7,12];
  const hdrD = hdrBlock("LUCRATIVIDADE DETALHADA", sub, HD.length);
  const rowsD: CellObject[][] = [...hdrD.rows, HD.map(h => cs(h, S.colH()))];
  data.veiculos.forEach((v, i) => {
    const lucro  = nb(v.lucro_bruto);
    const margem = nb(v.margem_pct);
    const mTx    = margem >= 15 ? P.G_TX : margem >= 5 ? "7A4500" : P.R_TX;
    const mBg    = margem >= 15 ? P.G_BG : margem >= 5 ? "FFF3DC" : P.R_BG;
    rowsD.push([
      ns(i+1,                     S.num(i, F_INT)),
      cs(str(v.veiculo),          S.rowB(i)),
      cs(str(v.marca),            S.row(i)),
      cs(str(v.modelo),           S.row(i)),
      cs(str(v.versao)||"-",      S.row(i)),
      ns(nb(v.ano),               S.num(i, F_INT)),
      cs(str(v.tipo).toUpperCase(),S.row(i,"center")),
      cs(str(v.placa),            S.row(i,"center")),
      cs(str(v.cor),              S.row(i)),
      ns(nb(v.quilometragem),     S.num(i,'#,##0" km"')),
      cs(str(v.data_compra),      S.row(i,"center")),
      cs(str(v.data_venda),       S.row(i,"center")),
      ns(nb(v.dias_estoque),      S.num(i,'#,##0" d"')),
      ns(nb(v.valor_compra),      S.num(i)),
      ns(nb(v.valor_multas),      S.num(i)),
      ns(nb(v.total_despesas),    S.num(i)),
      ns(nb(v.custo_total),       S.num(i, F_BRL, true)),
      ns(nb(v.valor_vendido),     S.num(i, F_BRL, true)),
      ns(lucro,                   S.num(i, F_BRL, true, lucro>=0?P.G_TX:P.R_TX)),
      ns(margem,                  { font:font(true,10,mTx), fill:fill(mBg), numFmt:F_PCT, alignment:aln("center"), border:brd(P.BORDER) }),
      ns(nb(v.margem_reais),      S.num(i, F_BRL, false, lucro>=0?P.G_TX:P.R_TX)),
      cs(str(v.cliente),          S.row(i)),
      cs(str(v.cliente_tel),      S.row(i)),
      cs(str(v.vendedor),         S.row(i)),
      cs(str(v.forma_pagamento),  S.row(i)),
      cs(str(v.banco),            S.row(i)),
      ns(nb(v.com_pct),           S.num(i, F_PCT)),
      ns(nb(v.com_valor),         S.num(i, F_BRL, false, P.G_TX)),
    ]);
  });
  const tot: CellObject[] = Array.from({length:HD.length}, () => cs("", S.tot()));
  tot[0]  = cs("TOTAL", S.tot());
  tot[18] = ns(nb(res.lucro_total),    S.totR());
  tot[19] = ns(nb(res.margem_media),   S.totR(F_PCT));
  tot[27] = ns(nb(res.total_comissoes),S.totR());
  rowsD.push(tot);
  XLSXStyle.utils.book_append_sheet(WB, buildWS(rowsD, WD, hdrD.merges, hdrD.rowH), "Lucratividade");

  // ── Aba 2: Resumo ──
  const HR = 2;
  const hdrR = hdrBlock("RESUMO DE LUCRATIVIDADE", sub, HR);
  const rowsR: CellObject[][] = [
    ...hdrR.rows,
    [cs("INDICADORES", S.sec()), cs("", S.sec())],
    [cs("Indicador", S.colH()), cs("Valor", S.colHR())],
    [cs("Veículos Vendidos",     S.row(0)), ns(nb(res.total_vendidos),    S.num(0, F_INT))],
    [cs("Lucro Total",           S.row(1)), ns(nb(res.lucro_total),       S.num(1, F_BRL, true, P.G_TX))],
    [cs("Margem Média",          S.row(0)), ns(nb(res.margem_media),      S.num(0, F_PCT))],
    [cs("Melhor Margem",         S.row(1)), ns(nb(res.melhor_margem),     S.num(1, F_PCT))],
    [cs("Média Dias em Estoque", S.row(0)), ns(nb(res.media_dias_estoque),S.num(0, F_INT))],
    [cs("Total Comissões",       S.row(1)), ns(nb(res.total_comissoes),   S.num(1, F_BRL))],
    [cs("Melhor Veículo",        S.row(0)), cs(str(res.melhor_veiculo), S.row(0))],
  ];
  const mergesR = [...hdrR.merges, { s:{r:3,c:0}, e:{r:3,c:1} }];
  XLSXStyle.utils.book_append_sheet(WB, buildWS(rowsR, [32, 24], mergesR, hdrR.rowH), "Resumo");

  save("relatorio-lucratividade", WB);
}

// ════════════════════════════════════════════════════════════════════════════
// 6. COMISSÕES
// ════════════════════════════════════════════════════════════════════════════
export function exportComissoesExcel(data: {
  periodo:   Record<string, unknown>;
  resumo:    Record<string, number>;
  ranking:   Record<string, unknown>[];
  detalhado: Record<string, unknown>[];
}) {
  const WB  = XLSXStyle.utils.book_new();
  const r   = data.resumo;
  const lbl = str((data.periodo as any).label || "Todos os períodos");
  const sub = `Período: ${lbl}  |  Gerado em: ${today()}`;

  // ── Aba 1: DETALHAMENTO ──
  const HD = ["Vendedor","E-mail Vendedor","Cliente","Tel. Cliente","Veículo","Tipo","Placa","Data Venda","Vl. Venda","Pagamento","Taxa %","Comissão R$","Status"];
  const WD = [22,28,24,14,32,8,11,11,16,16,8,14,12];
  const hdrD = hdrBlock("COMISSÕES DETALHADAS", sub, HD.length);
  const rowsD: CellObject[][] = [...hdrD.rows, HD.map(h => cs(h, S.colH()))];
  data.detalhado.forEach((row, i) => {
    const ok = str(row.status) === "concluida";
    rowsD.push([
      cs(str(row.vendedor),       S.rowB(i)),
      cs(str(row.vendedor_email), S.row(i)),
      cs(str(row.cliente),        S.row(i)),
      cs(str(row.cliente_tel),    S.row(i)),
      cs(str(row.veiculo),        S.row(i)),
      cs(str(row.tipo_veiculo).toUpperCase(), S.row(i,"center")),
      cs(str(row.placa),          S.row(i,"center")),
      cs(str(row.data_venda),     S.row(i,"center")),
      ns(nb(row.valor_venda),     S.num(i)),
      cs(str(row.forma_pagamento),S.row(i)),
      ns(nb(row.comissao_pct),    S.num(i, F_PCT)),
      ns(nb(row.comissao),        S.num(i, F_BRL, true, P.G_TX)),
      cs(str(row.status).toUpperCase(), S.badge(ok?P.G_TX:P.R_TX, ok?P.G_BG:P.R_BG)),
    ]);
  });
  const totD: CellObject[] = Array.from({length:HD.length}, () => cs("", S.tot()));
  totD[0]  = cs("TOTAL COMISSÕES", S.tot());
  totD[8]  = ns(r.receita_total,  S.totR());
  totD[11] = ns(r.comissao_total, S.totR());
  rowsD.push(totD);
  XLSXStyle.utils.book_append_sheet(WB, buildWS(rowsD, WD, hdrD.merges, hdrD.rowH), "Detalhamento");

  // ── Aba 2: RANKING ──
  const HR = ["#","Vendedor","E-mail","Total Vendas","Receita Total","Comissão Total","Ticket Médio"];
  const WR = [4,26,30,14,18,18,16];
  const hdrRk = hdrBlock("RANKING DE VENDEDORES", sub, HR.length);
  const rowsRk: CellObject[][] = [...hdrRk.rows, HR.map(h => cs(h, S.colH()))];
  data.ranking.forEach((row, i) => {
    const gold = i === 0;
    const bg_  = gold ? P.GOLD_L : i%2===0?P.EVEN:P.ODD;
    const st   = (h:"left"|"center"|"right"="left"): CellStyle => ({ font:font(gold,10), fill:fill(bg_), border:brd(P.BORDER), alignment:aln(h) });
    rowsRk.push([
      ns(i+1,                    { ...st("center"), numFmt: F_INT }),
      cs(str(row.vendedor),      { ...st(), font:font(true,10) }),
      cs(str(row.vendedor_email),st()),
      ns(nb(row.total_vendas),   { ...st("center"), numFmt: F_INT }),
      ns(nb(row.receita_total),  { ...st("right"), numFmt: F_BRL }),
      ns(nb(row.comissao_total), { ...st("right"), numFmt: F_BRL, font:font(true,10,P.G_TX) }),
      ns(nb(row.ticket_medio),   { ...st("right"), numFmt: F_BRL }),
    ]);
  });
  const totRk: CellObject[] = Array.from({length:HR.length}, () => cs("", S.tot()));
  totRk[1] = cs("TOTAL GERAL", S.tot());
  totRk[3] = ns(r.total_vendas,   S.totR(F_INT));
  totRk[4] = ns(r.receita_total,  S.totR());
  totRk[5] = ns(r.comissao_total, S.totR());
  rowsRk.push(totRk);
  XLSXStyle.utils.book_append_sheet(WB, buildWS(rowsRk, WR, hdrRk.merges, hdrRk.rowH), "Ranking");

  save("relatorio-comissoes", WB);
}
