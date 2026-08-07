// ─── Unmask ───────────────────────────────────────────────────────────────────
export const unmask = (v: string) => v.replace(/\D/g, "");

// ─── Phone (00) 00000-0000 / (00) 0000-0000 ──────────────────────────────────
export function maskPhone(v: string): string {
  const d = unmask(v).slice(0, 11);
  if (d.length <= 10) {
    return d
      .replace(/^(\d{2})(\d)/, "($1) $2")
      .replace(/(\d{4})(\d{1,4})$/, "$1-$2");
  }
  return d
    .replace(/^(\d{2})(\d)/, "($1) $2")
    .replace(/(\d{5})(\d{1,4})$/, "$1-$2");
}

// ─── CPF 000.000.000-00 ───────────────────────────────────────────────────────
export function maskCPF(v: string): string {
  const d = unmask(v).slice(0, 11);
  return d
    .replace(/^(\d{3})(\d)/, "$1.$2")
    .replace(/^(\d{3})\.(\d{3})(\d)/, "$1.$2.$3")
    .replace(/\.(\d{3})(\d{1,2})$/, ".$1-$2");
}

// ─── CNPJ 00.000.000/0000-00 ─────────────────────────────────────────────────
export function maskCNPJ(v: string): string {
  const d = unmask(v).slice(0, 14);
  return d
    .replace(/^(\d{2})(\d)/, "$1.$2")
    .replace(/^(\d{2})\.(\d{3})(\d)/, "$1.$2.$3")
    .replace(/\.(\d{3})(\d)/, ".$1/$2")
    .replace(/(\d{4})(\d{1,2})$/, "$1-$2");
}

// ─── CPF or CNPJ (auto by length) ────────────────────────────────────────────
export function maskCPFOrCNPJ(v: string): string {
  const d = unmask(v);
  return d.length <= 11 ? maskCPF(v) : maskCNPJ(v);
}

// ─── CEP 00000-000 ───────────────────────────────────────────────────────────
export function maskCEP(v: string): string {
  const d = unmask(v).slice(0, 8);
  return d.replace(/^(\d{5})(\d{1,3})$/, "$1-$2");
}

// ─── Placa Brasileira (antiga ABC-1234 ou Mercosul ABC1D23) ──────────────────
export function maskPlaca(v: string): string {
  const raw = v.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 7);
  // Mercosul: ABC1D23 - letras nos índices 0,1,2,4; dígito no índice 3; letra ou dígito no 4
  if (raw.length <= 3) return raw;
  return raw.slice(0, 3) + raw.slice(3);
}

// ─── RENAVAM (9 ou 11 dígitos) ────────────────────────────────────────────────
export function maskRENAVAM(v: string): string {
  return unmask(v).slice(0, 11);
}

// ─── Chassi (17 alfanuméricos) ────────────────────────────────────────────────
export function maskChassi(v: string): string {
  return v.toUpperCase().replace(/[^A-HJ-NPR-Z0-9]/g, "").slice(0, 17);
}

// ─── Currency (R$) ───────────────────────────────────────────────────────────
export function maskCurrency(v: string): string {
  const d = unmask(v).slice(0, 12);
  if (!d) return "";
  const num = parseInt(d, 10) / 100;
  return num.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

/** Convert masked currency string (e.g. "1.234,56") back to number */
export function parseCurrency(v: string): number {
  const clean = v.replace(/\./g, "").replace(",", ".");
  return parseFloat(clean) || 0;
}

// ─── KM / Integer ────────────────────────────────────────────────────────────
export function maskKM(v: string): string {
  return unmask(v).replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}

// ─── Validators ──────────────────────────────────────────────────────────────
export function validateCPF(raw: string): boolean {
  const d = unmask(raw);
  if (d.length !== 11 || /^(\d)\1+$/.test(d)) return false;
  let sum = 0;
  for (let i = 0; i < 9; i++) sum += parseInt(d[i]) * (10 - i);
  let r = (sum * 10) % 11;
  if (r === 10 || r === 11) r = 0;
  if (r !== parseInt(d[9])) return false;
  sum = 0;
  for (let i = 0; i < 10; i++) sum += parseInt(d[i]) * (11 - i);
  r = (sum * 10) % 11;
  if (r === 10 || r === 11) r = 0;
  return r === parseInt(d[10]);
}

export function validateCNPJ(raw: string): boolean {
  const d = unmask(raw);
  if (d.length !== 14 || /^(\d)\1+$/.test(d)) return false;
  const calc = (d: string, weights: number[]) =>
    weights.reduce((sum, w, i) => sum + parseInt(d[i]) * w, 0);
  const mod = (n: number) => { const r = n % 11; return r < 2 ? 0 : 11 - r; };
  const w1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  const w2 = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  return mod(calc(d, w1)) === parseInt(d[12]) && mod(calc(d, w2)) === parseInt(d[13]);
}

export function validatePhone(raw: string): boolean {
  const d = unmask(raw);
  return d.length === 10 || d.length === 11;
}

export function validatePlaca(v: string): boolean {
  const raw = v.replace(/[^A-Z0-9]/gi, "").toUpperCase();
  // Antiga: ABC1234
  const antiga = /^[A-Z]{3}\d{4}$/.test(raw);
  // Mercosul: ABC1D23
  const mercosul = /^[A-Z]{3}\d[A-Z]\d{2}$/.test(raw);
  return antiga || mercosul;
}
