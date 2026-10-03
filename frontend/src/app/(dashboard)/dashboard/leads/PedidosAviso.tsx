"use client";

import Link from "next/link";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { BellRing, Check, Mail, Car } from "lucide-react";
import { alertsApi } from "@/lib/api";
import { fmtCurrency } from "@/lib/formatters";
import { toast } from "@/lib/toast";

type Pedido = {
  id: string;
  nome: string | null;
  email: string;
  marca: string | null;
  modelo: string | null;
  tipo: string | null;
  ano_min: number | null;
  preco_max: number | null;
  created_at: string | null;
  veiculos_compativeis: { id: string; marca: string; modelo: string; ano: number; valor_anunciado: number | null }[];
};

/**
 * Pedidos "me avise quando chegar" feitos no site. Antes eram gravados e ninguém via.
 * Mostra quais carros do estoque JÁ atendem cada pedido: é só chamar o cliente.
 */
export default function PedidosAviso() {
  const qc = useQueryClient();
  const { data, isLoading, isError } = useQuery<{ items: Pedido[]; total: number }>({
    queryKey: ["pedidos-aviso"],
    queryFn: () => alertsApi.list({ status: "pendente", limit: 100 }),
  });
  const atender = useMutation({
    mutationFn: (id: string) => alertsApi.update(id, "atendido"),
    onSuccess: () => { toast.success("Pedido marcado como atendido"); qc.invalidateQueries({ queryKey: ["pedidos-aviso"] }); },
    onError: () => toast.error("Não foi possível atualizar o pedido"),
  });

  if (isLoading) return null;
  if (isError) return <div className="dash-card"><p className="dash-card__sub">Não foi possível carregar os pedidos de aviso.</p></div>;
  const pedidos = data?.items ?? [];
  if (!pedidos.length) return null;

  return (
    <section className="dash-card" style={{ marginBottom: 18 }}>
      <div className="dash-card__topo">
        <div>
          <h3 className="dash-card__titulo" style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <BellRing size={17} color="var(--brand)" /> Pedidos de aviso ({data?.total ?? pedidos.length})
          </h3>
          <p className="dash-card__sub">Clientes que pediram para ser avisados quando chegar um veículo. Os que já têm carro compatível aparecem primeiro.</p>
        </div>
      </div>
      <ul style={{ listStyle: "none", display: "grid", gap: 8 }}>
        {[...pedidos].sort((a, b) => b.veiculos_compativeis.length - a.veiculos_compativeis.length).map((p) => {
          const procura = [p.marca, p.modelo].filter(Boolean).join(" ") || (p.tipo === "moto" ? "Moto" : "Qualquer carro");
          const detalhes = [p.ano_min ? `a partir de ${p.ano_min}` : null, p.preco_max ? `até ${fmtCurrency(p.preco_max)}` : null].filter(Boolean).join(" · ");
          return (
            <li key={p.id} style={{ padding: "12px 14px", borderRadius: 10, background: "var(--surface-2)", border: "1px solid var(--border)", display: "grid", gap: 8 }}>
              <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "6px 12px" }}>
                <strong style={{ color: "var(--text-primary)", fontSize: 14 }}>{procura}</strong>
                {detalhes && <span style={{ color: "var(--text-secondary)", fontSize: 13 }}>{detalhes}</span>}
                <span style={{ marginLeft: "auto", display: "flex", gap: 6 }}>
                  <a className="btn btn-secondary" style={{ minHeight: 34, padding: "0 12px", fontSize: 13 }} href={`mailto:${p.email}?subject=${encodeURIComponent(`Chegou: ${procura}`)}`}>
                    <Mail size={14} /> {p.nome ? p.nome.split(" ")[0] : p.email}
                  </a>
                  <button className="btn btn-ghost" style={{ minHeight: 34, padding: "0 12px", fontSize: 13 }} disabled={atender.isPending} onClick={() => atender.mutate(p.id)}>
                    <Check size={14} /> Atendido
                  </button>
                </span>
              </div>
              {p.veiculos_compativeis.length > 0 ? (
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                  {p.veiculos_compativeis.map((v) => (
                    <Link key={v.id} href={`/dashboard/veiculos/${v.id}`} style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12.5, padding: "4px 10px", borderRadius: 999, background: "rgba(34,197,94,0.12)", border: "1px solid rgba(34,197,94,0.3)", color: "#86efac" }}>
                      <Car size={13} /> {v.marca} {v.modelo} {v.ano}{v.valor_anunciado ? ` · ${fmtCurrency(v.valor_anunciado)}` : ""}
                    </Link>
                  ))}
                </div>
              ) : (
                <span style={{ fontSize: 12.5, color: "var(--text-muted)" }}>Nenhum veículo compatível no estoque ainda.</span>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
