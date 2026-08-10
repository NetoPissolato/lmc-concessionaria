/**
 * exportPDF.ts - Relatórios PDF profissionais para LCM Concessionária.
 * jsPDF + jspdf-autotable  |  orientação landscape A4 (297 × 210 mm)
 * Margem: 14 de cada lado → área útil = 269 mm
 */
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

// ─── Paleta ──────────────────────────────────────────────────────────────────
const GOLD:   [number,number,number] = [245, 166, 35];
const DARK:   [number,number,number] = [18,  18,  18];
const GRAY:   [number,number,number] = [100, 100, 100];
const WHITE:  [number,number,number] = [255, 255, 255];
const LIGHT:  [number,number,number] = [250, 250, 250];
const GREEN:  [number,number,number] = [26,  122, 60];
const RED:    [number,number,number] = [160, 16,  16];
const BLUE:   [number,number,number] = [59,  130, 246];
const PURPLE: [number,number,number] = [124, 58,  237];
const GOLD_L: [number,number,number] = [255, 243, 220];

// ─── Formatação ───────────────────────────────────────────────────────────────
const brl  = (v: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);
const pct  = (v: number) => `${Number(v).toFixed(1)}%`;
const num  = (v: number) => Number(v).toLocaleString("pt-BR");
const today = () => new Date().toLocaleDateString("pt-BR");
const now   = () => new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
const nb    = (v: unknown) => Number(v) || 0;
const str   = (v: unknown, max = 999) => String(v ?? "-").slice(0, max);

const lastY = (doc: jsPDF) =>
  (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY;

// ─── Cabeçalho ───────────────────────────────────────────────────────────────
function drawHeader(doc: jsPDF, title: string, subtitle: string, pw: number) {
  doc.setFillColor(...DARK);
  doc.rect(0, 0, pw, 38, "F");
  doc.setFillColor(...GOLD);
  doc.rect(0, 36, pw, 2, "F");

  doc.setTextColor(...GOLD);
  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.text("LCM CONCESSIONÁRIA", 14, 14);

  doc.setTextColor(...GRAY);
  doc.setFontSize(7);
  doc.setFont("helvetica", "normal");
  doc.text("Sistema de Gestão ERP - Documento Confidencial", 14, 20);

  doc.setTextColor(...WHITE);
  doc.setFontSize(13);
  doc.setFont("helvetica", "bold");
  doc.text(title, pw - 14, 14, { align: "right" });

  doc.setTextColor(...GRAY);
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.text(subtitle, pw - 14, 21, { align: "right" });
  doc.setFontSize(7);
  doc.text(`Gerado em: ${today()} às ${now()}`, pw - 14, 34, { align: "right" });
}

// ─── Rodapé ───────────────────────────────────────────────────────────────────
function drawFooter(doc: jsPDF, pw: number, ph: number) {
  const pages = doc.getNumberOfPages();
  for (let i = 1; i <= pages; i++) {
    doc.setPage(i);
    doc.setDrawColor(220, 220, 220);
    doc.line(14, ph - 12, pw - 14, ph - 12);
    doc.setFontSize(7);
    doc.setTextColor(...GRAY);
    doc.text("LCM Concessionária - Documento Confidencial", 14, ph - 7);
    doc.text(`Página ${i} de ${pages}`, pw - 14, ph - 7, { align: "right" });
  }
}

// ─── KPI boxes ────────────────────────────────────────────────────────────────
function drawKPIs(
  doc: jsPDF,
  y: number,
  items: { label: string; value: string; color?: [number,number,number] }[],
  pw: number
): number {
  const colW = (pw - 28) / items.length;
  const boxH = 22;
  items.forEach((item, i) => {
    const x = 14 + i * colW;
    doc.setFillColor(248, 248, 252);
    doc.roundedRect(x + 1, y, colW - 2, boxH, 3, 3, "F");
    doc.setDrawColor(220, 220, 230);
    doc.roundedRect(x + 1, y, colW - 2, boxH, 3, 3, "S");
    doc.setTextColor(...(item.color || DARK));
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.text(item.value, x + colW / 2, y + 10, { align: "center" });
    doc.setTextColor(...GRAY);
    doc.setFontSize(7);
    doc.setFont("helvetica", "normal");
    doc.text(item.label, x + colW / 2, y + 17, { align: "center" });
  });
  return y + boxH + 8;
}

// ─── Seção título ─────────────────────────────────────────────────────────────
function drawSection(doc: jsPDF, title: string, y: number, color: [number,number,number] = DARK): number {
  doc.setFillColor(...color);
  doc.rect(14, y, 3, 7, "F");
  doc.setTextColor(...color);
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.text(title, 20, y + 5.5);
  return y + 12;
}

// ─── Tabela padrão ────────────────────────────────────────────────────────────
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ColStyles = Record<number, Record<string, unknown>>;

function drawTable(doc: jsPDF, startY: number, opts: {
  head: string[][];
  body: (string | number)[][];
  foot?: (string | number)[][];
  headColor?: [number,number,number];
  colStyles?: ColStyles;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  didParseCell?: (d: any) => void;
  fontSize?: number;
}) {
  autoTable(doc, {
    startY,
    margin: { left: 14, right: 14 },
    head: opts.head,
    body: opts.body,
    foot: opts.foot,
    styles: {
      fontSize: opts.fontSize ?? 7.5,
      cellPadding: 2.5,
      lineColor: [230, 230, 230],
      lineWidth: 0.3,
      overflow: "linebreak",
      minCellHeight: 7,
    },
    headStyles: {
      fillColor: opts.headColor || DARK,
      textColor: WHITE,
      fontStyle: "bold",
      fontSize: (opts.fontSize ?? 7.5) + 0.5,
    },
    footStyles: { fillColor: GOLD_L, textColor: DARK, fontStyle: "bold" },
    alternateRowStyles: { fillColor: LIGHT },
    columnStyles: opts.colStyles || {},
    didParseCell: opts.didParseCell,
  });
}

function newPDF() {
  return new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
}
const savePDF = (doc: jsPDF, name: string) =>
  doc.save(`${name}-${today().replace(/\//g, "-")}.pdf`);

// ===============================================================================
// 1. VENDAS
// ===============================================================================
export function exportVendasPDF(data: {
  periodo: Record<string, unknown>;
  resumo:  Record<string, number>;
  vendas:  Record<string, unknown>[];
}) {
  const doc = newPDF();
  const pw = doc.internal.pageSize.getWidth();
  const ph = doc.internal.pageSize.getHeight();
  const r  = data.resumo;
  const lbl = str((data.periodo as any).label || "Todos");  // eslint-disable-line

  drawHeader(doc, "RELATÓRIO DE VENDAS", `Período: ${lbl}`, pw);
  let y = 46;

  y = drawKPIs(doc, y, [
    { label: "Total de Vendas",  value: num(r.total_vendas)     },
    { label: "Concluídas",       value: num(r.concluidas),       color: GREEN  },
    { label: "Pendentes",        value: num(r.pendentes),        color: BLUE   },
    { label: "Canceladas",       value: num(r.canceladas),       color: RED    },
    { label: "Receita Total",    value: brl(r.receita_total),    color: GREEN  },
    { label: "Ticket Médio",     value: brl(r.ticket_medio),     color: PURPLE },
    { label: "Total Financiado", value: brl(r.total_financiado) },
    { label: "Total Comissões",  value: brl(r.comissao_total)   },
  ], pw);

  // ── Tabela principal: dados da venda ──────────────────────────────────────
  y = drawSection(doc, "DADOS DA VENDA", y);
  // Área útil ≈ 269 mm. Widths abaixo somam 269.
  drawTable(doc, y, {
    head: [["Veículo","Placa","Cor","Tipo","Ano","KM","Cliente","Vendedor","Data Venda","Entrega","Status"]],
    body: data.vendas.map(v => [
      str(v.veiculo_nome || v.veiculo, 30),
      str(v.placa),
      str(v.cor, 12),
      str(v.tipo).toUpperCase(),
      str(v.veiculo_ano || ""),
      nb(v.quilometragem) ? `${num(nb(v.quilometragem))} km` : "-",
      str(v.cliente, 28),
      str(v.vendedor, 20),
      str(v.data_venda),
      str(v.data_entrega),
      str(v.status).toUpperCase(),
    ]),
    colStyles: {
      0:  { cellWidth: 40 },
      1:  { cellWidth: 18, halign: "center" },
      2:  { cellWidth: 16 },
      3:  { cellWidth: 12, halign: "center" },
      4:  { cellWidth: 10, halign: "center" },
      5:  { cellWidth: 20, halign: "right" },
      6:  { cellWidth: 38 },
      7:  { cellWidth: 28 },
      8:  { cellWidth: 20, halign: "center" },
      9:  { cellWidth: 20, halign: "center" },
      10: { cellWidth: 20, halign: "center" },
    },
    didParseCell(d) {
      if (d.section === "body" && d.column.index === 10) {
        const v = String(d.cell.raw).toLowerCase();
        d.cell.styles.textColor = v === "concluida" ? GREEN : v === "pendente" ? BLUE : RED;
        d.cell.styles.fontStyle = "bold";
      }
    },
  });

  // ── Tabela 2: dados do cliente ────────────────────────────────────────────
  const nY2 = lastY(doc) + 10;
  drawSection(doc, "DADOS DO CLIENTE E FINANCEIRO", nY2);
  const y2 = nY2 + 12;
  drawTable(doc, y2, {
    head: [["Cliente","CPF/CNPJ","Telefone","E-mail","Cidade/UF","Pagamento","Banco","Parc.","Vl. Venda","Entrada","Financiado","Com.%","Comissão"]],
    body: data.vendas.map(v => [
      str(v.cliente, 28),
      str(v.cliente_cpf),
      str(v.cliente_tel),
      str(v.cliente_email, 26),
      `${str(v.cliente_cidade,16)}/${str(v.cliente_uf)}`,
      str(v.forma_pagamento, 16),
      str(v.banco, 14),
      nb(v.parcelas) ? `${v.parcelas}x` : "À vista",
      brl(nb(v.valor_venda)),
      brl(nb(v.valor_entrada)),
      brl(nb(v.valor_financiado)),
      pct(nb(v.comissao_pct)),
      brl(nb(v.comissao_valor)),
    ]),
    colStyles: {
      0:  { cellWidth: 34 },
      1:  { cellWidth: 26, halign: "center" },
      2:  { cellWidth: 22 },
      3:  { cellWidth: 32 },
      4:  { cellWidth: 24 },
      5:  { cellWidth: 20 },
      6:  { cellWidth: 18 },
      7:  { cellWidth: 15, halign: "center" },
      8:  { cellWidth: 22, halign: "right", fontStyle: "bold" },
      9:  { cellWidth: 18, halign: "right" },
      10: { cellWidth: 18, halign: "right" },
      11: { cellWidth: 12, halign: "center" },
      12: { cellWidth: 20, halign: "right", textColor: [0,100,0] },
    },
  });

  drawFooter(doc, pw, ph);
  savePDF(doc, "relatorio-vendas");
}

// ===============================================================================
// 2. ESTOQUE
// ===============================================================================
export function exportEstoquePDF(data: {
  resumo: Record<string, unknown>;
  carros: Record<string, unknown>[];
  motos:  Record<string, unknown>[];
}) {
  const doc = newPDF();
  const pw = doc.internal.pageSize.getWidth();
  const ph = doc.internal.pageSize.getHeight();
  const res = data.resumo;

  drawHeader(doc, "RELATÓRIO DE ESTOQUE", `Gerado em ${today()}`, pw);
  let y = 46;

  y = drawKPIs(doc, y, [
    { label: "Total Carros",     value: num(nb(res.total_carros))          },
    { label: "Total Motos",      value: num(nb(res.total_motos))           },
    { label: "Disponíveis",      value: num(nb(res.disponiveis)),  color: GREEN  },
    { label: "Reservados",       value: num(nb(res.reservados)),   color: BLUE   },
    { label: "Em Preparação",    value: num(nb(res.em_preparacao))          },
    { label: "Valor em Estoque", value: brl(nb(res.valor_total_estoque)), color: PURPLE },
    { label: "Custo em Estoque", value: brl(nb(res.custo_total_estoque))   },
    { label: "Média Dias Est.",  value: `${num(nb(res.media_dias_estoque))} d` },
  ], pw);

  const renderTable = (lista: Record<string,unknown>[], titulo: string, cor: [number,number,number]) => {
    if (!lista.length) return;
    y = drawSection(doc, titulo, y, cor);
    drawTable(doc, y, {
      head: [["Veículo","Placa","Cor","Ano","KM","Status","Dias","Dt.Compra","Custo Total","Anunciado","Mínimo","Margem R$","Margem %"]],
      body: lista.map(v => [
        `${str(v.marca)} ${str(v.modelo)} ${str(v.versao || "")}`.trim().slice(0,32),
        str(v.placa),
        str(v.cor, 12),
        str(v.ano),
        `${num(nb(v.quilometragem))} km`,
        str(v.status).replace(/_/g," ").toUpperCase(),
        `${num(nb(v.dias_estoque))} d`,
        str(v.data_compra),
        brl(nb(v.custo_total)),
        brl(nb(v.valor_anunciado)),
        brl(nb(v.valor_minimo)),
        brl(nb(v.margem_reais)),
        pct(nb(v.margem_pct)),
      ]),
      headColor: cor,
      colStyles: {
        0:  { cellWidth: 42 },
        1:  { cellWidth: 18, halign: "center" },
        2:  { cellWidth: 16 },
        3:  { cellWidth: 10, halign: "center" },
        4:  { cellWidth: 22, halign: "right" },
        5:  { cellWidth: 24, halign: "center" },
        6:  { cellWidth: 12, halign: "center" },
        7:  { cellWidth: 20, halign: "center" },
        8:  { cellWidth: 24, halign: "right" },
        9:  { cellWidth: 24, halign: "right", fontStyle: "bold" },
        10: { cellWidth: 20, halign: "right" },
        11: { cellWidth: 22, halign: "right" },
        12: { cellWidth: 16, halign: "right", fontStyle: "bold" },
      },
      didParseCell(d) {
        if (d.section === "body" && d.column.index === 12) {
          d.cell.styles.textColor = parseFloat(String(d.cell.raw)) >= 0 ? GREEN : RED;
        }
        if (d.section === "body" && d.column.index === 11) {
          d.cell.styles.textColor = nb(d.row.cells[11]?.raw) >= 0 ? GREEN : RED;
        }
      },
    });
    y = lastY(doc) + 10;
  };

  renderTable(data.carros, "CARROS EM ESTOQUE", BLUE);
  renderTable(data.motos,  "MOTOS EM ESTOQUE",  [249, 115, 22]);
  drawFooter(doc, pw, ph);
  savePDF(doc, "relatorio-estoque");
}

// ===============================================================================
// 3. FINANCEIRO
// ===============================================================================
export function exportFinanceiroPDF(data: {
  periodo:       Record<string, unknown>;
  resumo:        Record<string, number>;
  mensal:        Record<string, unknown>[];
  lancamentos:   Record<string, unknown>[];
  por_categoria?: Record<string, unknown>[];
}) {
  const doc = newPDF();
  const pw = doc.internal.pageSize.getWidth();
  const ph = doc.internal.pageSize.getHeight();
  const r  = data.resumo;
  const lbl = str((data.periodo as any).label || "Todos"); // eslint-disable-line

  drawHeader(doc, "RELATÓRIO FINANCEIRO", `Período: ${lbl}`, pw);
  let y = 46;

  y = drawKPIs(doc, y, [
    { label: "Total Entradas",    value: brl(r.total_entradas),    color: GREEN },
    { label: "Total Saídas",      value: brl(r.total_saidas),      color: RED   },
    { label: "Lucro Líquido",     value: brl(r.lucro_liquido),     color: r.lucro_liquido >= 0 ? GREEN : RED },
    { label: "Lançamentos",       value: num(r.total_lancamentos)  },
    { label: "Margem Financeira", value: pct(r.margem_financeira), color: r.margem_financeira >= 0 ? GREEN : RED },
  ], pw);

  y = drawSection(doc, "DEMONSTRATIVO MENSAL (DRE)", y);
  drawTable(doc, y, {
    head: [["Mês","Entradas (R$)","Saídas (R$)","Lucro / Prejuízo (R$)","Resultado"]],
    body: data.mensal.map(m => [
      str(m.nome_mes),
      brl(nb(m.entradas)),
      brl(nb(m.saidas)),
      brl(nb(m.lucro)),
      nb(m.lucro) >= 0 ? "POSITIVO" : "NEGATIVO",
    ]),
    foot: [["TOTAL", brl(r.total_entradas), brl(r.total_saidas), brl(r.lucro_liquido), ""]],
    colStyles: {
      0: { cellWidth: 30 },
      1: { cellWidth: 50, halign: "right", textColor: [0,130,0] as [number,number,number] },
      2: { cellWidth: 50, halign: "right", textColor: [160,0,0] as [number,number,number] },
      3: { cellWidth: 60, halign: "right", fontStyle: "bold" },
      4: { cellWidth: 30, halign: "center" },
    },
    didParseCell(d) {
      if (d.section === "body") {
        if (d.column.index === 4) {
          d.cell.styles.textColor = String(d.cell.raw) === "POSITIVO" ? GREEN : RED;
          d.cell.styles.fontStyle = "bold";
        }
        if (d.column.index === 3) {
          d.cell.styles.textColor = String(d.cell.raw).startsWith("-") ? RED : GREEN;
        }
      }
    },
  });

  y = lastY(doc) + 12;

  if (data.por_categoria?.length) {
    y = drawSection(doc, "ANÁLISE POR CATEGORIA", y, PURPLE);
    drawTable(doc, y, {
      head: [["Categoria","Entradas (R$)","Saídas (R$)","Saldo (R$)","Lançamentos"]],
      body: data.por_categoria.slice(0, 20).map(cat => [
        str(cat.categoria, 40),
        brl(nb(cat.entradas)),
        brl(nb(cat.saidas)),
        brl(nb(cat.entradas) - nb(cat.saidas)),
        num(nb(cat.total)),
      ]),
      headColor: PURPLE,
      colStyles: {
        0: { cellWidth: 70 },
        1: { cellWidth: 50, halign: "right", textColor: [0,130,0] as [number,number,number] },
        2: { cellWidth: 50, halign: "right", textColor: [160,0,0] as [number,number,number] },
        3: { cellWidth: 55, halign: "right", fontStyle: "bold" },
        4: { cellWidth: 25, halign: "center" },
      },
      didParseCell(d) {
        if (d.section === "body" && d.column.index === 3) {
          d.cell.styles.textColor = String(d.cell.raw).startsWith("-") ? RED : GREEN;
        }
      },
    });
    y = lastY(doc) + 12;
  }

  y = drawSection(doc, "LANÇAMENTOS DETALHADOS", y);
  drawTable(doc, y, {
    head: [["Data","Mês","Tipo","Categoria","Descrição","Valor (R$)"]],
    body: data.lancamentos.map(l => [
      str(l.data),
      str(l.nome_mes),
      str(l.tipo).toUpperCase(),
      str(l.categoria, 24),
      str(l.descricao, 60),
      brl(nb(l.valor)),
    ]),
    colStyles: {
      0: { cellWidth: 22, halign: "center" },
      1: { cellWidth: 22 },
      2: { cellWidth: 18, halign: "center" },
      3: { cellWidth: 34 },
      4: { cellWidth: 118 },
      5: { cellWidth: 30, halign: "right", fontStyle: "bold" },
    },
    didParseCell(d) {
      if (d.section === "body" && d.column.index === 2) {
        d.cell.styles.textColor = String(d.cell.raw) === "ENTRADA" ? GREEN : RED;
        d.cell.styles.fontStyle = "bold";
      }
      if (d.section === "body" && d.column.index === 5) {
        // Verde para entrada, vermelho para saída
        const tipo = d.row.cells[2]?.raw;
        d.cell.styles.textColor = tipo === "ENTRADA" ? GREEN : RED;
      }
    },
  });

  drawFooter(doc, pw, ph);
  savePDF(doc, "relatorio-financeiro");
}

// ===============================================================================
// 4. CLIENTES
// ===============================================================================
export function exportClientesPDF(data: {
  resumo:   Record<string, number>;
  clientes: Record<string, unknown>[];
}) {
  const doc = newPDF();
  const pw = doc.internal.pageSize.getWidth();
  const ph = doc.internal.pageSize.getHeight();
  const r  = data.resumo;

  drawHeader(doc, "RELATÓRIO DE CLIENTES", `Gerado em ${today()}`, pw);
  let y = 46;

  y = drawKPIs(doc, y, [
    { label: "Total Clientes",  value: num(r.total_clientes) },
    { label: "Com Compra",      value: num(r.com_compra),    color: GREEN  },
    { label: "Recorrentes",     value: num(r.recorrentes),   color: PURPLE },
    { label: "Ticket Médio",    value: brl(r.ticket_medio),  color: BLUE   },
    { label: "Receita Total",   value: brl(r.receita_total), color: GREEN  },
  ], pw);

  // ── Tabela 1: dados de contato ────────────────────────────────────────────
  y = drawSection(doc, "DADOS DE CONTATO", y, PURPLE);
  drawTable(doc, y, {
    head: [["Nome","CPF/CNPJ","Telefone","E-mail","Cidade","UF","Profissão","Cliente Desde"]],
    body: data.clientes.map(c => [
      str(c.nome, 32),
      str(c.cpf_cnpj),
      str(c.telefone),
      str(c.email, 30),
      str(c.cidade, 20),
      str(c.estado),
      str(c.profissao, 18),
      str(c.cliente_desde),
    ]),
    headColor: PURPLE,
    colStyles: {
      0: { cellWidth: 44, fontStyle: "bold" },
      1: { cellWidth: 28, halign: "center" },
      2: { cellWidth: 26 },
      3: { cellWidth: 44 },
      4: { cellWidth: 28 },
      5: { cellWidth: 10, halign: "center" },
      6: { cellWidth: 28 },
      7: { cellWidth: 24, halign: "center" },
    },
  });

  y = lastY(doc) + 10;

  // ── Tabela 2: histórico de compras ───────────────────────────────────────
  drawSection(doc, "HISTÓRICO DE COMPRAS", y, BLUE);
  const y2 = y + 12;
  drawTable(doc, y2, {
    head: [["Nome","Compras","Cancel.","Total Gasto","Ticket Médio","1ª Compra","Última Compra","Veículos Comprados"]],
    body: data.clientes.map(c => [
      str(c.nome, 30),
      num(nb(c.total_compras)),
      num(nb(c.total_cancelamentos)),
      brl(nb(c.total_gasto)),
      brl(nb(c.ticket_medio)),
      str(c.primeira_compra),
      str(c.ultima_compra),
      str(c.veiculos, 55),
    ]),
    headColor: BLUE,
    colStyles: {
      0: { cellWidth: 38, fontStyle: "bold" },
      1: { cellWidth: 14, halign: "center" },
      2: { cellWidth: 14, halign: "center" },
      3: { cellWidth: 28, halign: "right", fontStyle: "bold", textColor: [0,100,0] as [number,number,number] },
      4: { cellWidth: 26, halign: "right" },
      5: { cellWidth: 22, halign: "center" },
      6: { cellWidth: 22, halign: "center" },
      7: { cellWidth: 72 },
    },
  });

  drawFooter(doc, pw, ph);
  savePDF(doc, "relatorio-clientes");
}

// ===============================================================================
// 5. LUCRATIVIDADE
// ===============================================================================
export function exportLucratividadePDF(data: {
  periodo:  Record<string, unknown>;
  resumo:   Record<string, unknown>;
  veiculos: Record<string, unknown>[];
}) {
  const doc = newPDF();
  const pw = doc.internal.pageSize.getWidth();
  const ph = doc.internal.pageSize.getHeight();
  const res = data.resumo;
  const lbl = str((data.periodo as any).label || "Todos"); // eslint-disable-line

  drawHeader(doc, "RELATÓRIO DE LUCRATIVIDADE", `Período: ${lbl}`, pw);
  let y = 46;

  y = drawKPIs(doc, y, [
    { label: "Veículos Vendidos", value: num(nb(res.total_vendidos))           },
    { label: "Lucro Total",       value: brl(nb(res.lucro_total)),  color: GREEN  },
    { label: "Margem Média",      value: pct(nb(res.margem_media)), color: BLUE   },
    { label: "Melhor Margem",     value: pct(nb(res.melhor_margem)),color: GREEN  },
    { label: "Média Dias Est.",   value: `${num(nb(res.media_dias_estoque))} d` },
    { label: "Total Comissões",   value: brl(nb(res.total_comissoes))           },
  ], pw);

  // ── Tabela 1: dados do veículo ────────────────────────────────────────────
  y = drawSection(doc, "LUCRATIVIDADE POR VEÍCULO", y);
  drawTable(doc, y, {
    head: [["#","Veículo","Placa","Ano","Tipo","Dt.Compra","Dt.Venda","Dias","Custo Total","Vl.Vendido","Lucro","Margem%"]],
    body: data.veiculos.map((v, i) => [
      String(i + 1),
      str(v.veiculo, 32),
      str(v.placa),
      str(v.ano),
      str(v.tipo).toUpperCase(),
      str(v.data_compra),
      str(v.data_venda),
      `${num(nb(v.dias_estoque))} d`,
      brl(nb(v.custo_total)),
      brl(nb(v.valor_vendido)),
      brl(nb(v.lucro_bruto)),
      pct(nb(v.margem_pct)),
    ]),
    foot: [["","TOTAL","","","","","","","",brl(nb(res.lucro_total)),"",pct(nb(res.margem_media))]],
    colStyles: {
      0:  { cellWidth: 8, halign: "center" },
      1:  { cellWidth: 44 },
      2:  { cellWidth: 18, halign: "center" },
      3:  { cellWidth: 10, halign: "center" },
      4:  { cellWidth: 12, halign: "center" },
      5:  { cellWidth: 20, halign: "center" },
      6:  { cellWidth: 20, halign: "center" },
      7:  { cellWidth: 14, halign: "center" },
      8:  { cellWidth: 28, halign: "right" },
      9:  { cellWidth: 28, halign: "right", fontStyle: "bold" },
      10: { cellWidth: 28, halign: "right", fontStyle: "bold" },
      11: { cellWidth: 22, halign: "right", fontStyle: "bold" },
    },
    didParseCell(d) {
      if (d.section === "body") {
        if (d.column.index === 10) d.cell.styles.textColor = nb((v: number) => v) >= 0 ? GREEN : RED;
        if (d.column.index === 11) {
          d.cell.styles.textColor = parseFloat(String(d.cell.raw)) >= 0 ? GREEN : RED;
        }
        if (d.column.index === 10) {
          // lucro
          const raw = String(d.cell.raw);
          const isNeg = raw.startsWith("-");
          d.cell.styles.textColor = isNeg ? RED : GREEN;
        }
      }
    },
  });

  y = lastY(doc) + 10;

  // ── Tabela 2: dados da venda ──────────────────────────────────────────────
  drawSection(doc, "DADOS DA VENDA POR VEÍCULO", y, PURPLE);
  const y2 = y + 12;
  drawTable(doc, y2, {
    head: [["Veículo","Placa","Cliente","Tel. Cliente","Vendedor","Pagamento","Banco","Com. %","Comissão R$"]],
    body: data.veiculos.map(v => [
      str(v.veiculo, 28),
      str(v.placa),
      str(v.cliente, 24),
      str(v.cliente_tel),
      str(v.vendedor, 18),
      str(v.forma_pagamento, 16),
      str(v.banco, 14),
      pct(nb(v.com_pct)),
      brl(nb(v.com_valor)),
    ]),
    headColor: PURPLE,
    colStyles: {
      0: { cellWidth: 40 },
      1: { cellWidth: 18, halign: "center" },
      2: { cellWidth: 36 },
      3: { cellWidth: 26 },
      4: { cellWidth: 28 },
      5: { cellWidth: 26 },
      6: { cellWidth: 24 },
      7: { cellWidth: 16, halign: "center" },
      8: { cellWidth: 28, halign: "right", fontStyle: "bold", textColor: [0,100,0] as [number,number,number] },
    },
  });

  drawFooter(doc, pw, ph);
  savePDF(doc, "relatorio-lucratividade");
}

// ===============================================================================
// 6. COMISSÕES
// ===============================================================================
export function exportComissoesPDF(data: {
  periodo:   Record<string, unknown>;
  resumo:    Record<string, number>;
  ranking:   Record<string, unknown>[];
  detalhado: Record<string, unknown>[];
}) {
  const doc = newPDF();
  const pw = doc.internal.pageSize.getWidth();
  const ph = doc.internal.pageSize.getHeight();
  const r   = data.resumo;
  const lbl = str((data.periodo as any).label || "Todos"); // eslint-disable-line

  drawHeader(doc, "RELATÓRIO DE COMISSÕES", `Período: ${lbl}`, pw);
  let y = 46;

  y = drawKPIs(doc, y, [
    { label: "Vendedores",      value: num(r.total_vendedores) },
    { label: "Total de Vendas", value: num(r.total_vendas)     },
    { label: "Receita Total",   value: brl(r.receita_total),   color: BLUE  },
    { label: "Comissões Pagas", value: brl(r.comissao_total),  color: GREEN },
  ], pw);

  y = drawSection(doc, "RANKING DE VENDEDORES", y, PURPLE);
  drawTable(doc, y, {
    head: [["#","Vendedor","E-mail","Total Vendas","Receita Total","Comissão Total","Ticket Médio"]],
    body: data.ranking.map((row, i) => [
      String(i + 1),
      str(row.vendedor, 28),
      str(row.vendedor_email, 34),
      num(nb(row.total_vendas)),
      brl(nb(row.receita_total)),
      brl(nb(row.comissao_total)),
      brl(nb(row.ticket_medio)),
    ]),
    foot: [["","TOTAL","",num(r.total_vendas),brl(r.receita_total),brl(r.comissao_total),""]],
    headColor: PURPLE,
    colStyles: {
      0: { cellWidth: 8,  halign: "center" },
      1: { cellWidth: 40, fontStyle: "bold" },
      2: { cellWidth: 50 },
      3: { cellWidth: 22, halign: "center" },
      4: { cellWidth: 38, halign: "right" },
      5: { cellWidth: 38, halign: "right", fontStyle: "bold", textColor: [0,100,0] as [number,number,number] },
      6: { cellWidth: 38, halign: "right" },
    },
    didParseCell(d) {
      if (d.section === "body" && d.column.index === 0 && Number(d.cell.raw) === 1) {
        d.cell.styles.fillColor = GOLD_L;
      }
    },
  });

  y = lastY(doc) + 12;
  y = drawSection(doc, "DETALHAMENTO POR VENDA", y);
  drawTable(doc, y, {
    head: [["Vendedor","Cliente","Tel. Cliente","Veículo","Tipo","Placa","Data","Vl. Venda","Pagamento","Taxa %","Comissão","Status"]],
    body: data.detalhado.map(row => [
      str(row.vendedor, 22),
      str(row.cliente, 22),
      str(row.cliente_tel),
      str(row.veiculo, 28),
      str(row.tipo_veiculo).toUpperCase(),
      str(row.placa),
      str(row.data_venda),
      brl(nb(row.valor_venda)),
      str(row.forma_pagamento, 14),
      pct(nb(row.comissao_pct)),
      brl(nb(row.comissao)),
      str(row.status).toUpperCase(),
    ]),
    foot: [["","","","","","","",brl(r.receita_total),"","",brl(r.comissao_total),""]],
    colStyles: {
      0:  { cellWidth: 30 },
      1:  { cellWidth: 30 },
      2:  { cellWidth: 24 },
      3:  { cellWidth: 38 },
      4:  { cellWidth: 12, halign: "center" },
      5:  { cellWidth: 16, halign: "center" },
      6:  { cellWidth: 20, halign: "center" },
      7:  { cellWidth: 26, halign: "right" },
      8:  { cellWidth: 22 },
      9:  { cellWidth: 14, halign: "center" },
      10: { cellWidth: 24, halign: "right", fontStyle: "bold", textColor: [0,100,0] as [number,number,number] },
      11: { cellWidth: 18, halign: "center" },
    },
    didParseCell(d) {
      if (d.section === "body" && d.column.index === 11) {
        const v = String(d.cell.raw).toLowerCase();
        d.cell.styles.textColor = v === "concluida" ? GREEN : v === "pendente" ? BLUE : RED;
        d.cell.styles.fontStyle = "bold";
      }
    },
  });

  drawFooter(doc, pw, ph);
  savePDF(doc, "relatorio-comissoes");
}
