/**
 * PaymentBadge - ícone visual para cada forma de pagamento.
 * Usa exclusivamente SVGs - sem emojis em lugar nenhum.
 */
import Image from "next/image";

// ─── Mapa de logos de BANDEIRAS de cartão ─────────────────────────────────────
export const CARD_BRAND_LOGOS: Record<string, string> = {
  visa:               "/icons/visa.svg",
  mastercard:         "/icons/mastercard.svg",
  master:             "/icons/mastercard.svg",
  elo:                "/icons/elo.svg",
  amex:               "/icons/amex.svg",
  "american express": "/icons/amex.svg",
  hipercard:          "/icons/hipercard.svg",
  nubank:             "/icons/nubank.svg",
  débito:             "/icons/debito.svg",
  debito:             "/icons/debito.svg",
};

// ─── Mapa de logos de BANCOS ──────────────────────────────────────────────────
export const BANK_LOGOS: Record<string, string> = {
  bradesco:          "/icons/bradesco.svg",
  "itaú":            "/icons/itau.svg",
  itau:              "/icons/itau.svg",
  santander:         "/icons/santander.svg",
  bb:                "/icons/bb.svg",
  "banco do brasil": "/icons/bb.svg",
  nubank:            "/icons/nubank.svg",
};

// ─── Metadados por forma de pagamento (somente logos SVG, sem emojis) ─────────
export const PAY_META: Record<string, { color: string; bg: string; border: string; label: string; logo: string }> = {
  pix:           { color: "#38bdf8", bg: "rgba(56,189,248,0.1)",   border: "rgba(56,189,248,0.25)",   label: "PIX",           logo: "/icons/pix.svg"          },
  dinheiro:      { color: "#22c55e", bg: "rgba(34,197,94,0.1)",    border: "rgba(34,197,94,0.25)",    label: "Dinheiro",      logo: "/icons/dinheiro.svg"     },
  transferencia: { color: "#06b6d4", bg: "rgba(6,182,212,0.1)",    border: "rgba(6,182,212,0.25)",    label: "Transferência", logo: "/icons/transferencia.svg"},
  cartao:        { color: "#f59e0b", bg: "rgba(245,158,11,0.1)",   border: "rgba(245,158,11,0.25)",   label: "Cartão",        logo: "/icons/outro-cartao.svg" },
  financiamento: { color: "#a78bfa", bg: "rgba(167,139,250,0.1)",  border: "rgba(167,139,250,0.25)",  label: "Financiamento", logo: "/icons/financiamento.svg"},
  consorcio:     { color: "#f97316", bg: "rgba(249,115,22,0.1)",   border: "rgba(249,115,22,0.25)",   label: "Consórcio",     logo: "/icons/consorcio.svg"    },
  permuta:       { color: "#ec4899", bg: "rgba(236,72,153,0.1)",   border: "rgba(236,72,153,0.25)",   label: "Permuta",       logo: "/icons/permuta.svg"      },
  misto:         { color: "#6366f1", bg: "rgba(99,102,241,0.1)",   border: "rgba(99,102,241,0.25)",   label: "Misto",         logo: "/icons/misto.svg"        },
};
const defaultMeta = { color: "#64748b", bg: "rgba(100,116,139,0.1)", border: "rgba(100,116,139,0.2)", label: "-", logo: "/icons/outro-cartao.svg" };

// ─── Helpers ──────────────────────────────────────────────────────────────────
export function getBankLogo(banco?: string | null): string {
  if (!banco) return "";
  const key = banco.toLowerCase().trim();
  return BANK_LOGOS[key] || Object.entries(BANK_LOGOS).find(([k]) => key.includes(k))?.[1] || "";
}

export function getCardBrandLogo(banco?: string | null): string {
  if (!banco) return "";
  const key = banco.toLowerCase().trim();
  return CARD_BRAND_LOGOS[key] || Object.entries(CARD_BRAND_LOGOS).find(([k]) => key.includes(k))?.[1] || "";
}

// ─── Componente principal ─────────────────────────────────────────────────────
interface PaymentBadgeProps {
  forma: string;
  banco?: string | null;
  parcelas?: number | null;
  size?: "sm" | "md" | "lg";
  iconOnly?: boolean;
}

export function PaymentBadge({ forma, banco, parcelas, size = "md", iconOnly = false }: PaymentBadgeProps) {
  const meta = PAY_META[forma] || defaultMeta;

  const s = {
    sm: { pad: "2px 7px",  fs: "9px",  ls: 14, gap: 4, r: 4  },
    md: { pad: "5px 12px", fs: "11px", ls: 18, gap: 6, r: 8  },
    lg: { pad: "8px 16px", fs: "13px", ls: 22, gap: 8, r: 10 },
  }[size];

  // Decide logo: cartão → bandeira, banco → logo do banco, senão → ícone do método
  let logoSrc = meta.logo;
  if (forma === "cartao" && banco) {
    const brandLogo = getCardBrandLogo(banco);
    logoSrc = brandLogo || "/icons/outro-cartao.svg";
  } else if ((forma === "financiamento" || forma === "transferencia") && banco) {
    const bankLogo = getBankLogo(banco);
    logoSrc = bankLogo || meta.logo;
  }

  const labelText = banco && forma === "cartao"
    ? banco
    : banco && forma === "financiamento"
    ? `Fin. ${banco}`
    : meta.label;

  return (
    <div style={{
      display: "inline-flex", alignItems: "center", gap: s.gap,
      padding: iconOnly ? `${s.gap}px` : s.pad,
      background: meta.bg, border: `1px solid ${meta.border}`,
      borderRadius: s.r, flexShrink: 0,
    }}>
      <Image
        src={logoSrc}
        alt={labelText}
        width={s.ls}
        height={s.ls}
        style={{ objectFit: "contain", flexShrink: 0 }}
        unoptimized
      />
      {!iconOnly && (
        <span style={{ fontSize: s.fs, fontWeight: 700, color: meta.color, whiteSpace: "nowrap" }}>
          {labelText}{parcelas ? <span style={{ fontWeight: 400, opacity: 0.75 }}> {parcelas}x</span> : null}
        </span>
      )}
    </div>
  );
}

// ─── Bank Logo standalone ─────────────────────────────────────────────────────
export function BankLogo({ banco, height = 18 }: { banco: string; height?: number }) {
  const src = getBankLogo(banco);
  if (!src) return <span style={{ fontSize: "11px", color: "var(--text-muted)", fontWeight: 600 }}>{banco}</span>;
  return <Image src={src} alt={banco} width={height * 2.5} height={height} style={{ objectFit: "contain" }} unoptimized />;
}
