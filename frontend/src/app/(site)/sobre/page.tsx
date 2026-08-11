import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { ChevronRight, MapPin, Phone, Mail, Clock, Award, Handshake, Users, ShieldCheck, Star, ArrowRight } from "lucide-react";
import ReviewsSection from "./_ReviewsSection";

const API_INTERNAL = process.env.BACKEND_INTERNAL_URL ?? "http://backend:8000";
const API_PUBLIC = process.env.NEXT_PUBLIC_API_URL ?? "/api/v1";

export const metadata: Metadata = {
  title: "Sobre a LMC Veiculos | Nossa historia e equipe",
  description: "Conheca a historia da LMC Veiculos, nossa missao, valores e equipe dedicada a oferecer a melhor experiencia na compra de veiculos.",
  robots: "index, follow",
};

const NUMBERS = [
  { num: "10+",   label: "Anos de mercado"        },
  { num: "2.500+",label: "Veiculos vendidos"       },
  { num: "98%",   label: "Satisfacao dos clientes" },
  { num: "50+",   label: "Marcas trabalhadas"       },
];

const VALUES = [
  {
    icon: Handshake,
    title: "Transparencia",
    text: "Negociacoes honestas, sem letras miudas ou surpresas. O que voce ve e o que voce leva.",
    color: "#f47920",
  },
  {
    icon: Award,
    title: "Qualidade",
    text: "Selecionamos apenas veiculos que entregaríamos a nossa propria familia. Nada menos do que o melhor.",
    color: "#3b82f6",
  },
  {
    icon: ShieldCheck,
    title: "Seguranca",
    text: "Documentacao verificada, historico completo e vistoria rigorosa em todos os veiculos do estoque.",
    color: "#22c55e",
  },
  {
    icon: Users,
    title: "Relacionamento",
    text: "Queremos ser seu parceiro de confianca por toda a vida, nao apenas em uma venda.",
    color: "#a855f7",
  },
];

interface TeamMember {
  id: string;
  nome: string;
  cargo: string;
  foto: string | null;
  data_contratacao: string | null;
}

function calcTenure(dateStr: string | null): string {
  if (!dateStr) return "";
  const start = new Date(dateStr);
  const now = new Date();
  const months = (now.getFullYear() - start.getFullYear()) * 12 + (now.getMonth() - start.getMonth());
  if (months < 1) return "Recém-contratado";
  const years = Math.floor(months / 12);
  const rem = months % 12;
  if (years === 0) return `${rem} ${rem === 1 ? "mes" : "meses"} na empresa`;
  if (rem === 0) return `${years} ${years === 1 ? "ano" : "anos"} na empresa`;
  return `${years} ${years === 1 ? "ano" : "anos"} e ${rem} ${rem === 1 ? "mes" : "meses"} na empresa`;
}

async function fetchTeam(): Promise<TeamMember[]> {
  try {
    const res = await fetch(`${API_INTERNAL}/api/v1/public/team`, { cache: "no-store" });
    if (!res.ok) return [];
    return res.json();
  } catch { return []; }
}


const CONTACT = [
  { icon: MapPin, label: "Endereco",  text: "Rua das Flores, 123 — Bairro, Cidade/UF"            },
  { icon: Phone,  label: "Telefone",  text: "(11) 9 9999-9999"                                   },
  { icon: Mail,   label: "E-mail",    text: "contato@lmcveiculos.com.br"                         },
  { icon: Clock,  label: "Horario",   text: "Seg–Sex: 8h–18h  |  Sab: 8h–13h  |  Dom: Fechado"  },
];

export default async function SobrePage() {
  const team = await fetchTeam();
  return (
    <>
      {/* ===========================================
          HERO — gradient premium, sem foto
      =========================================== */}
      <div style={{
        background:"linear-gradient(135deg, #0e0f11 0%, #13151a 45%, #1a1008 100%)",
        borderBottom:"1px solid rgba(255,255,255,0.07)",
        padding:"clamp(48px,7vw,80px) 0",
        position:"relative", overflow:"hidden",
      }}>
        {/* Glow decorativo laranja */}
        <div style={{ position:"absolute", top:-80, left:"25%", width:500, height:500, borderRadius:"50%",
          background:"radial-gradient(circle, rgba(244,121,32,0.12) 0%, transparent 65%)", pointerEvents:"none" }} />
        <div style={{ position:"absolute", bottom:-100, right:"10%", width:380, height:380, borderRadius:"50%",
          background:"radial-gradient(circle, rgba(244,121,32,0.06) 0%, transparent 65%)", pointerEvents:"none" }} />
        {/* Linha decorativa */}
        <div style={{ position:"absolute", top:0, left:0, right:0, height:3,
          background:"linear-gradient(90deg, transparent, var(--s-orange), transparent)" }} />

        <div className="s-container" style={{ position:"relative", zIndex:1 }}>
          <nav style={{ display:"flex", alignItems:"center", gap:6, fontSize:12, color:"rgba(255,255,255,0.35)", marginBottom:28 }}>
            <Link href="/" style={{ color:"inherit", textDecoration:"none" }}>Inicio</Link>
            <ChevronRight size={11} />
            <span style={{ color:"rgba(255,255,255,0.70)" }}>Sobre</span>
          </nav>

          <div style={{ maxWidth:680 }}>
            <div style={{ display:"inline-flex", alignItems:"center", gap:8, marginBottom:18 }}>
              <div style={{ width:3, height:22, background:"var(--s-orange)", borderRadius:2 }} />
              <span style={{ fontSize:11, fontWeight:700, textTransform:"uppercase", letterSpacing:2, color:"var(--s-orange)" }}>
                Nossa historia
              </span>
            </div>
            <h1 style={{ fontSize:"clamp(30px,5.5vw,58px)", fontWeight:900, letterSpacing:"-2px", color:"#fff", lineHeight:1.08, marginBottom:20 }}>
              Ha mais de{" "}
              <span style={{ backgroundImage:"linear-gradient(90deg,#f47920,#ffb347)", WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent" }}>
                10 anos
              </span>
              {" "}realizando sonhos
            </h1>
            <p style={{ fontSize:"clamp(14px,1.6vw,17px)", color:"rgba(255,255,255,0.55)", lineHeight:1.75, maxWidth:520 }}>
              Uma concessionaria fundada na paixao por automoveis e no compromisso com a honestidade em cada negociacao.
            </p>
          </div>
        </div>
      </div>

      {/* ===========================================
          NUMBERS STRIP
      =========================================== */}
      <div style={{ background:"var(--s-dark)", borderBottom:"1px solid rgba(255,255,255,0.07)" }}>
        <div className="s-container">
          <div className="s-sobre-numbers">
            {[
              { num:"10+",   countTarget:"10+",    label:"Anos de mercado"        },
              { num:"2.500+",countTarget:"2500+",   label:"Veiculos vendidos"       },
              { num:"98%",   countTarget:"98%",     label:"Satisfacao dos clientes" },
              { num:"50+",   countTarget:"50+",     label:"Marcas trabalhadas"       },
            ].map((n, i) => (
              <div key={n.num} style={{
                padding:"28px 20px", textAlign:"center",
                borderRight: i < 3 ? "1px solid rgba(255,255,255,0.08)" : "none",
                transitionDelay: `${i * 80}ms`,
              }}>
                <p data-count-target={n.countTarget}
                  style={{ fontSize:"clamp(28px,4vw,42px)", fontWeight:900, letterSpacing:"-2px", color:"var(--s-orange)", marginBottom:4 }}>{n.num}</p>
                <p style={{ fontSize:12, color:"rgba(255,255,255,0.45)", fontWeight:600, textTransform:"uppercase", letterSpacing:1 }}>{n.label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ===========================================
          MISSION — texto + fundo-login
      =========================================== */}
      <section className="s-section" style={{ background:"var(--s-bg)" }}>
        <div className="s-container">
          <div className="s-sobre-mission">
            <div className="s-reveal-left">
              <span style={{ display:"inline-block", background:"var(--s-orange-muted)", color:"var(--s-orange)", fontSize:11, fontWeight:700, textTransform:"uppercase", letterSpacing:1.5, padding:"5px 14px", borderRadius:999, marginBottom:18 }}>
                Quem somos
              </span>
              <h2 style={{ fontSize:"clamp(22px,3vw,34px)", fontWeight:900, letterSpacing:"-1px", lineHeight:1.2, color:"var(--s-text-1)", marginBottom:20 }}>
                Transparencia e qualidade<br />
                <span style={{ color:"var(--s-orange)" }}>em cada negociacao</span>
              </h2>
              <p style={{ fontSize:15, color:"var(--s-text-2)", lineHeight:1.85, marginBottom:16 }}>
                A LMC Veiculos nasceu da paixao por automoveis e do compromisso com a honestidade. Desde a fundacao, nossa missao e proporcionar a melhor experiencia de compra, com total transparencia.
              </p>
              <p style={{ fontSize:15, color:"var(--s-text-2)", lineHeight:1.85, marginBottom:28 }}>
                Cada veiculo em nosso estoque passa por inspecao rigorosa de 100 pontos, tem procedencia verificada e documentacao em dia. Porque acreditamos que um negocio justo e bom para todos.
              </p>
              <Link href="/estoque" className="s-btn s-btn-primary s-btn-md" style={{ display:"inline-flex", alignItems:"center", gap:8, textDecoration:"none" }}>
                Ver nosso estoque <ArrowRight size={16} strokeWidth={2.5} />
              </Link>
            </div>

            {/* Image: fundo-login */}
            <div className="s-sobre-img" style={{ position:"relative", width:"100%", borderRadius:20, overflow:"hidden", background:"#1a1d24" }}>
              <Image src="/fundo-login.jpg" alt="LMC Veiculos — fachada" fill
                style={{ objectFit:"cover", objectPosition:"center" }} />
              {/* Overlay badge glassmorphism */}
              <div style={{
                position:"absolute", bottom:20, left:20, right:20,
                background:"rgba(10,11,14,0.85)", backdropFilter:"blur(12px)",
                border:"1px solid rgba(255,255,255,0.10)", borderRadius:14,
                padding:"14px 18px", display:"flex", alignItems:"center", gap:12,
              }}>
                <div style={{ width:40, height:40, borderRadius:10, background:"var(--s-orange-muted)", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                  <Star size={18} color="var(--s-orange)" strokeWidth={2} />
                </div>
                <div>
                  <p style={{ fontSize:14, fontWeight:800, color:"#fff", marginBottom:2 }}>Concessionaria verificada</p>
                  <p style={{ fontSize:12, color:"rgba(255,255,255,0.50)" }}>98% de satisfacao dos clientes</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ===========================================
          VALUES
      =========================================== */}
      <section style={{ background:"var(--s-dark)", borderTop:"1px solid rgba(255,255,255,0.07)", padding:"72px 0" }}>
        <div className="s-container">
          <div style={{ textAlign:"center", marginBottom:52 }}>
            <span style={{ display:"inline-block", background:"var(--s-orange-muted)", color:"var(--s-orange)", fontSize:11, fontWeight:700, textTransform:"uppercase", letterSpacing:1.5, padding:"5px 14px", borderRadius:999, marginBottom:14 }}>
              Nossos valores
            </span>
            <h2 style={{ fontSize:"clamp(22px,3vw,34px)", fontWeight:900, letterSpacing:"-1px", color:"#fff", lineHeight:1.2 }}>
              O que nos guia todos os dias
            </h2>
          </div>
          <div className="s-grid-4" style={{ gap:20 }}>
            {VALUES.map((v, i) => (
              <div key={v.title} style={{
                background:"rgba(255,255,255,0.04)", border:"1px solid rgba(255,255,255,0.08)",
                borderRadius:16, padding:"28px 22px", position:"relative", overflow:"hidden",
                transitionDelay: `${i * 80}ms`,
              }}>
                {/* Colored top accent */}
                <div style={{ position:"absolute", top:0, left:0, right:0, height:3, background:v.color, borderRadius:"16px 16px 0 0" }} />
                <div style={{ width:48, height:48, borderRadius:13, background:v.color + "22", display:"flex", alignItems:"center", justifyContent:"center", marginBottom:18 }}>
                  <v.icon size={22} color={v.color} strokeWidth={1.8} />
                </div>
                <p style={{ fontSize:16, fontWeight:800, color:"#fff", marginBottom:10 }}>{v.title}</p>
                <p style={{ fontSize:13.5, color:"rgba(255,255,255,0.55)", lineHeight:1.7 }}>{v.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ===========================================
          TEAM — premium dark cards
      =========================================== */}
      {team.length > 0 && (
      <section style={{ background:"var(--s-dark-3)", borderTop:"1px solid rgba(255,255,255,0.07)", padding:"80px 0", position:"relative", overflow:"hidden" }}>
        {/* Decorative glow */}
        <div style={{ position:"absolute", top:"50%", left:"50%", transform:"translate(-50%,-50%)", width:700, height:400, borderRadius:"50%",
          background:"radial-gradient(ellipse, rgba(244,121,32,0.07) 0%, transparent 70%)", pointerEvents:"none" }} />

        <div className="s-container" style={{ position:"relative", zIndex:1 }}>
          {/* Header */}
          <div style={{ textAlign:"center", marginBottom:56 }}>
            <span style={{ display:"inline-flex", alignItems:"center", gap:8, background:"rgba(244,121,32,0.10)", border:"1px solid rgba(244,121,32,0.22)", color:"var(--s-orange)", fontSize:11, fontWeight:700, textTransform:"uppercase", letterSpacing:1.8, padding:"6px 16px", borderRadius:999, marginBottom:18 }}>
              <span style={{ width:5, height:5, borderRadius:"50%", background:"var(--s-orange)", display:"inline-block" }} />
              Nossa equipe
            </span>
            <h2 style={{ fontSize:"clamp(24px,3.5vw,38px)", fontWeight:900, letterSpacing:"-1.5px", color:"#fff", lineHeight:1.1, marginBottom:12 }}>
              Pessoas que fazem<br/>
              <span style={{ backgroundImage:"linear-gradient(90deg,#f47920,#ffb347)", WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent" }}>
                a diferença
              </span>
            </h2>
            <p style={{ fontSize:15, color:"rgba(255,255,255,0.40)", maxWidth:400, margin:"0 auto" }}>
              Conheça o time por trás de cada negociação.
            </p>
          </div>

          {/* Cards grid */}
          <div className="s-team-grid">
            {team.map((t, i) => {
              const palette = [
                { accent:"#f47920", glow:"rgba(244,121,32,0.18)", soft:"rgba(244,121,32,0.10)" },
                { accent:"#3b82f6", glow:"rgba(59,130,246,0.18)", soft:"rgba(59,130,246,0.10)" },
                { accent:"#22c55e", glow:"rgba(34,197,94,0.18)",  soft:"rgba(34,197,94,0.10)"  },
                { accent:"#a855f7", glow:"rgba(168,85,247,0.18)", soft:"rgba(168,85,247,0.10)" },
                { accent:"#f43f5e", glow:"rgba(244,63,94,0.18)",  soft:"rgba(244,63,94,0.10)"  },
              ];
              const { accent, glow, soft } = palette[i % palette.length];
              const initials = t.nome.split(" ").slice(0, 2).map((p: string) => p[0]).join("").toUpperCase();
              const tenure = calcTenure(t.data_contratacao);
              return (
                <div key={t.id} className="s-team-card">
                  {/* Top accent line */}
                  <div style={{ position:"absolute", top:0, left:0, right:0, height:3,
                    background:`linear-gradient(90deg, transparent, ${accent}, transparent)`,
                    borderRadius:"16px 16px 0 0" }} />

                  {/* Glow spot behind avatar */}
                  <div style={{ position:"absolute", top:24, left:"50%", transform:"translateX(-50%)",
                    width:100, height:100, borderRadius:"50%", background:glow, filter:"blur(20px)", pointerEvents:"none" }} />

                  {/* Avatar */}
                  <div style={{ position:"relative", zIndex:1, marginBottom:18 }}>
                    <div style={{
                      width:80, height:80, borderRadius:"50%", margin:"0 auto",
                      background: t.foto ? "#1a1d24" : `linear-gradient(135deg,${accent}22,${accent}08)`,
                      border:`2px solid ${accent}55`,
                      boxShadow:`0 0 0 4px ${soft}, 0 8px 24px rgba(0,0,0,0.4)`,
                      display:"flex", alignItems:"center", justifyContent:"center",
                      fontSize:24, fontWeight:900, color:accent,
                      overflow:"hidden", transition:"box-shadow 250ms",
                    }}>
                      {t.foto
                        ? <img src={t.foto} alt={t.nome} style={{ width:"100%", height:"100%", objectFit:"cover" }} />
                        : initials
                      }
                    </div>
                  </div>

                  {/* Info */}
                  <div style={{ position:"relative", zIndex:1, textAlign:"center" }}>
                    <p style={{ fontSize:15, fontWeight:800, color:"#fff", marginBottom:5, letterSpacing:"-0.3px" }}>{t.nome}</p>
                    <span style={{ display:"inline-block", padding:"3px 12px", borderRadius:999, fontSize:11.5, fontWeight:700,
                      background:soft, border:`1px solid ${accent}30`, color:accent, marginBottom:10 }}>
                      {t.cargo}
                    </span>
                    {tenure && (
                      <p style={{ fontSize:11, color:"rgba(255,255,255,0.28)", display:"flex", alignItems:"center", justifyContent:"center", gap:5 }}>
                        <span style={{ width:4, height:4, borderRadius:"50%", background:"rgba(255,255,255,0.20)", display:"inline-block" }} />
                        {tenure}
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <style>{`
          .s-team-grid {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
            gap: 20px;
          }
          .s-team-card {
            position: relative;
            background: rgba(255,255,255,0.04);
            border: 1px solid rgba(255,255,255,0.09);
            border-radius: 16px;
            padding: 32px 20px 24px;
            text-align: center;
            overflow: hidden;
            transition: transform 220ms ease, border-color 220ms ease, box-shadow 220ms ease;
            backdrop-filter: blur(8px);
          }
          .s-team-card:hover {
            transform: translateY(-6px);
            border-color: rgba(255,255,255,0.16);
            box-shadow: 0 20px 50px rgba(0,0,0,0.45);
          }
          @media (max-width: 640px) {
            .s-team-grid { grid-template-columns: repeat(2, 1fr); gap: 14px; }
          }
          @media (max-width: 380px) {
            .s-team-grid { grid-template-columns: 1fr; }
          }
        `}</style>
      </section>
      )}

      {/* ===========================================
          LOCATION / CONTACT
      =========================================== */}
      <section style={{ background:"var(--s-dark)", borderTop:"1px solid rgba(255,255,255,0.07)", padding:"72px 0" }}>
        <div className="s-container">
          <div className="s-sobre-location">
            {/* Contact info */}
            <div>
              <span style={{ display:"inline-block", background:"var(--s-orange-muted)", color:"var(--s-orange)", fontSize:11, fontWeight:700, textTransform:"uppercase", letterSpacing:1.5, padding:"5px 14px", borderRadius:999, marginBottom:18 }}>
                Onde estamos
              </span>
              <h2 style={{ fontSize:"clamp(22px,3vw,34px)", fontWeight:900, letterSpacing:"-1px", color:"#fff", marginBottom:32, lineHeight:1.2 }}>
                Venha nos <span style={{ color:"var(--s-orange)" }}>visitar</span>
              </h2>
              <div style={{ display:"flex", flexDirection:"column", gap:20 }}>
                {CONTACT.map(item => (
                  <div key={item.label} style={{ display:"flex", alignItems:"flex-start", gap:14 }}>
                    <div style={{ width:42, height:42, borderRadius:11, background:"rgba(244,121,32,0.12)", border:"1px solid rgba(244,121,32,0.20)", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                      <item.icon size={17} color="var(--s-orange)" strokeWidth={2} />
                    </div>
                    <div style={{ paddingTop:4 }}>
                      <p style={{ fontSize:10.5, fontWeight:700, textTransform:"uppercase", letterSpacing:1, color:"rgba(255,255,255,0.35)", marginBottom:3 }}>{item.label}</p>
                      <p style={{ fontSize:14, color:"rgba(255,255,255,0.75)", lineHeight:1.5 }}>{item.text}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Map placeholder — styled premium */}
            <div style={{ position:"relative", borderRadius:20, overflow:"hidden", background:"#1a1d24", minHeight:380, border:"1px solid rgba(255,255,255,0.08)", display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", gap:16 }}>
              {/* Grid pattern */}
              <div style={{ position:"absolute", inset:0, backgroundImage:"linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)", backgroundSize:"40px 40px" }} />
              <div style={{ position:"relative", zIndex:1, textAlign:"center" }}>
                <div style={{ width:64, height:64, borderRadius:18, background:"var(--s-orange-muted)", display:"flex", alignItems:"center", justifyContent:"center", margin:"0 auto 16px" }}>
                  <MapPin size={28} color="var(--s-orange)" strokeWidth={1.5} />
                </div>
                <p style={{ fontSize:16, fontWeight:800, color:"#fff", marginBottom:6 }}>Rua das Flores, 123</p>
                <p style={{ fontSize:13, color:"rgba(255,255,255,0.45)" }}>Bairro, Cidade/UF</p>
                <a href="https://maps.google.com" target="_blank" rel="noopener noreferrer"
                  style={{ display:"inline-flex", alignItems:"center", gap:6, marginTop:20, padding:"10px 20px", borderRadius:10, background:"var(--s-orange)", color:"#fff", textDecoration:"none", fontSize:13, fontWeight:700 }}>
                  <MapPin size={13} /> Ver no Google Maps
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ===========================================
          RESPONSIVE STYLES
      =========================================== */}

      {/* Reviews Section */}
      <ReviewsSection />

      <style>{`
        .s-sobre-numbers {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
        }
        .s-sobre-mission {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 64px;
          align-items: center;
        }
        .s-sobre-location {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 60px;
          align-items: start;
        }

        @media (max-width: 900px) {
          .s-sobre-mission { grid-template-columns: 1fr; gap: 32px; }
          .s-sobre-location { grid-template-columns: 1fr; gap: 40px; }
        }
        @media (max-width: 700px) {
          .s-sobre-numbers { grid-template-columns: repeat(2, 1fr); }
          .s-sobre-numbers > div { border-bottom: 1px solid rgba(255,255,255,0.08); }
          .s-sobre-numbers > div:nth-child(odd) { border-right: 1px solid rgba(255,255,255,0.08); }
          .s-sobre-numbers > div:last-child, .s-sobre-numbers > div:nth-child(3) { border-bottom: none; }
        }
        @media (max-width: 480px) {
          .s-sobre-numbers { grid-template-columns: repeat(2, 1fr); }
        }
        /* Image container: needs explicit height for Next.js Image fill */
        .s-sobre-img {
          aspect-ratio: 4 / 3;
          min-height: 300px;
        }
        @media (max-width: 900px) {
          .s-sobre-img { min-height: 280px; aspect-ratio: 16 / 9; }
        }
        @media (max-width: 560px) {
          .s-sobre-img { min-height: 240px; aspect-ratio: 4 / 3; }
        }
      `}</style>
    </>
  );
}
