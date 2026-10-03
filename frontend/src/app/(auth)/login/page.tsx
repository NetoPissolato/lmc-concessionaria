"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence, useMotionValue, useTransform, useSpring } from "framer-motion";
import { Eye, EyeOff, Loader2, Lock, User, Shield, ArrowRight, Car, BarChart3, DollarSign, FileText, CheckCircle2, AlertTriangle, Clock, XCircle } from "lucide-react";
import { authApi } from "@/lib/api";
import { toast } from "@/lib/toast";

// ─── Floating particle ──────────────────────────────────────────────────────
function Particle({ delay, x, size }: { delay: number; x: string; size: number }) {
  return (
    <motion.div
      style={{
        position: "absolute", bottom: "-20px", left: x,
        width: size, height: size,
        borderRadius: "50%",
        background: "rgba(245,166,35,0.6)",
        boxShadow: "0 0 8px rgba(245,166,35,0.8)",
        pointerEvents: "none", zIndex: 3,
      }}
      animate={{ y: [0, -600], opacity: [0, 0.8, 0.4, 0] }}
      transition={{ duration: 6 + delay, repeat: Infinity, delay, ease: "linear" }}
    />
  );
}

// ─── Typewriter ─────────────────────────────────────────────────────────────
const PHRASES = ["ao melhor", "ao futuro", "ao sucesso"];
function Typewriter() {
  const [idx, setIdx]    = useState(0);
  const [text, setText]  = useState("");
  const [del, setDel]    = useState(false);
  const phrase = PHRASES[idx];

  useEffect(() => {
    let t: NodeJS.Timeout;
    if (!del && text.length < phrase.length) {
      t = setTimeout(() => setText(phrase.slice(0, text.length + 1)), 85);
    } else if (!del && text.length === phrase.length) {
      t = setTimeout(() => setDel(true), 2200);
    } else if (del && text.length > 0) {
      t = setTimeout(() => setText(text.slice(0, -1)), 45);
    } else if (del && text.length === 0) {
      setDel(false);
      setIdx(i => (i + 1) % PHRASES.length);
    }
    return () => clearTimeout(t);
  }, [text, del, phrase]);

  return (
    <span style={{ color: "#F5A623", textShadow: "0 0 30px rgba(245,166,35,0.5)" }}>
      {text}
      <motion.span
        animate={{ opacity: [1, 0] }}
        transition={{ duration: 0.5, repeat: Infinity, repeatType: "reverse" }}
        style={{ color: "#F5A623" }}>|</motion.span>
    </span>
  );
}

// ─── Main ───────────────────────────────────────────────────────────────────
export default function LoginPage() {
  const router = useRouter();
  const [identifier, setIdentifier]     = useState("");
  const [senha, setSenha]               = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe]     = useState(false);
  const [isLoading, setIsLoading]       = useState(false);
  const [success, setSuccess]           = useState(false);
  const [error, setError]               = useState("");
  const [errorType, setErrorType]       = useState<"credentials" | "locked" | "rate" | "generic" | "">("");
  const [mounted, setMounted]           = useState(false);
  const [capsLock, setCapsLock]         = useState(false);
  const [shake, setShake]               = useState(false);
  const [attempts, setAttempts]         = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const identifierRef = useRef<HTMLInputElement>(null);

  // Mouse parallax
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);
  const bgX = useSpring(useTransform(mouseX, [0, 1], [-18, 18]), { stiffness: 60, damping: 20 });
  const bgY = useSpring(useTransform(mouseY, [0, 1], [-10, 10]), { stiffness: 60, damping: 20 });

  const handleMouseMove = useCallback((e: MouseEvent) => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    mouseX.set((e.clientX - rect.left) / rect.width);
    mouseY.set((e.clientY - rect.top) / rect.height);
  }, [mouseX, mouseY]);

  // Auto-redirect if already logged in
  useEffect(() => {
    if (authApi.isAuthenticated()) {
      router.replace("/dashboard");
    }
  }, [router]);

  // Load remembered email + mount
  useEffect(() => {
    setMounted(true);
    const saved = localStorage.getItem("lmc_remember_email");
    if (saved) {
      setIdentifier(saved);
      setRememberMe(true);
    }
    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, [handleMouseMove]);

  // Caps Lock detection
  const handleKeyEvent = useCallback((e: React.KeyboardEvent) => {
    setCapsLock(e.getModifierState("CapsLock"));
  }, []);

  // Trigger shake animation
  const triggerShake = () => {
    setShake(true);
    setTimeout(() => setShake(false), 500);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!identifier || !senha) {
      setError("Preencha todos os campos");
      setErrorType("generic");
      triggerShake();
      return;
    }
    setError("");
    setErrorType("");
    setIsLoading(true);
    try {
      await authApi.login(identifier, senha);
      // Save or clear remembered email
      if (rememberMe) {
        localStorage.setItem("lmc_remember_email", identifier);
      } else {
        localStorage.removeItem("lmc_remember_email");
      }
      setAttempts(0);
      setSuccess(true);
      await new Promise(r => setTimeout(r, 900));
      router.push("/dashboard");
    } catch (err: any) {
      let msg = "Erro ao fazer login. Tente novamente.";
      let type: typeof errorType = "generic";
      if (err?.response?.data?.detail) {
        const detail = err.response.data.detail;
        if (typeof detail === "string") {
          if (detail.toLowerCase().includes("bloqueada") || detail.toLowerCase().includes("bloqueado")) {
            msg = "Conta bloqueada por excesso de tentativas. Aguarde alguns minutos.";
            type = "locked";
          } else if (detail.toLowerCase().includes("credenciais") || detail.toLowerCase().includes("inválid")) {
            const remaining = 5 - (attempts + 1);
            msg = remaining > 0
              ? `E-mail/usuário ou senha incorretos. ${remaining} tentativa${remaining > 1 ? "s" : ""} restante${remaining > 1 ? "s" : ""}.`
              : "E-mail/usuário ou senha incorretos.";
            type = "credentials";
          } else {
            msg = detail;
          }
        }
      } else if (err?.response?.status === 429) {
        msg = "Muitas tentativas. Aguarde um momento antes de tentar novamente.";
        type = "rate";
      } else if (err?.response?.status === 401 || err?.response?.status === 403) {
        const remaining = 5 - (attempts + 1);
        msg = remaining > 0
          ? `E-mail/usuário ou senha incorretos. ${remaining} tentativa${remaining > 1 ? "s" : ""} restante${remaining > 1 ? "s" : ""}.`
          : "E-mail/usuário ou senha incorretos.";
        type = "credentials";
      }
      setAttempts(a => a + 1);
      setError(msg);
      setErrorType(type);
      triggerShake();
      setIsLoading(false);
    }
  };

  const features = [
    { icon: Car,        label: "Gestão de",   sub: "veículos"    },
    { icon: BarChart3,  label: "Controle de", sub: "vendas"      },
    { icon: DollarSign, label: "Financeiro",  sub: "inteligente" },
    { icon: FileText,   label: "Relatórios",  sub: "completos"   },
  ];

  const particles = [
    { delay: 0,   x: "8%",  size: 4 },
    { delay: 1.5, x: "22%", size: 3 },
    { delay: 3,   x: "40%", size: 5 },
    { delay: 0.8, x: "60%", size: 3 },
    { delay: 2.2, x: "75%", size: 4 },
    { delay: 4,   x: "90%", size: 3 },
  ];

  if (!mounted) return null;

  return (
    <div ref={containerRef} style={{
      display: "flex", height: "100vh", width: "100vw",
      overflow: "hidden", fontFamily: "'Inter','Segoe UI',sans-serif", background: "#111",
    }}>

      {/* ============== LEFT ============== */}
      <div className="login-left" style={{
        position: "relative", overflow: "hidden",
        flexDirection: "column", justifyContent: "space-between",
        padding: "36px 44px", minWidth: 0 }}>

        {/* Ken Burns background */}
        <motion.div
          style={{
            position: "absolute", inset: "-5%",
            backgroundImage: "url('/fundo-login.jpg')",
            backgroundSize: "cover", backgroundPosition: "20% center",
            x: bgX, y: bgY,
          }}
          animate={{ scale: [1, 1.06, 1] }}
          transition={{ duration: 18, repeat: Infinity, ease: "easeInOut" }}
        />

        {/* Grain texture overlay */}
        <svg style={{ position: "absolute", inset: 0, width: "100%", height: "100%", zIndex: 1, opacity: 0.04, pointerEvents: "none" }}>
          <filter id="grain">
            <feTurbulence type="fractalNoise" baseFrequency="0.65" numOctaves="3" stitchTiles="stitch" />
            <feColorMatrix type="saturate" values="0" />
          </filter>
          <rect width="100%" height="100%" filter="url(#grain)" />
        </svg>

        {/* Overlay layers */}
        <div style={{ position: "absolute", inset: 0, zIndex: 2,
          background: "linear-gradient(to right, rgba(0,0,0,0.9) 0%, rgba(0,0,0,0.6) 55%, rgba(0,0,0,0.2) 100%)" }} />
        <div style={{ position: "absolute", inset: 0, zIndex: 2,
          background: "linear-gradient(to top, rgba(0,0,0,0.88) 0%, transparent 50%)" }} />

        {/* Ambient orange glow */}
        <motion.div
          animate={{ opacity: [0.6, 1, 0.6], scale: [1, 1.15, 1] }}
          transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
          style={{
            position: "absolute", zIndex: 2, pointerEvents: "none",
            width: "350px", height: "350px",
            background: "radial-gradient(circle, rgba(245,166,35,0.1) 0%, transparent 70%)",
            top: "25%", left: "5%", filter: "blur(50px)",
          }}
        />

        {/* Floating particles */}
        {particles.map((p, i) => <Particle key={i} {...p} />)}

        {/* ── LOGO ── */}
        <motion.div style={{ position: "relative", zIndex: 4 }}
          initial={{ opacity: 0, y: -16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7 }}>
          <img
            src="/brand/lmc-logo-on-dark.svg"
            alt="LMC Veículos"
            style={{ height: "clamp(64px, 9vw, 110px)", width: "auto", display: "block" }}
          />
        </motion.div>

        {/* ── TAGLINE ── */}
        <motion.div style={{ position: "relative", zIndex: 4 }}
          initial={{ opacity: 0, x: -24 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.25, duration: 0.7 }}>
          <h1 style={{ fontSize: "42px", fontWeight: "900", lineHeight: 1.12, color: "#fff", margin: "0 0 16px",
            textShadow: "0 2px 30px rgba(0,0,0,0.7)" }}>
            Conectando<br />você{" "}<Typewriter />
          </h1>
          <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.6 }}
            style={{ fontSize: "15px", color: "rgba(255,255,255,0.62)", lineHeight: 1.7,
              maxWidth: "300px", margin: 0 }}>
            Gestão completa da sua<br />concessionária em um só lugar.
          </motion.p>
        </motion.div>

        {/* ── FEATURE GRID ── */}
        <div style={{ position: "relative", zIndex: 4 }}>
          <motion.div initial={{ opacity: 0, y: 28 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5, duration: 0.6 }}
            style={{
              display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: "10px",
              padding: "16px 18px",
              background: "rgba(0,0,0,0.5)",
              backdropFilter: "blur(18px)", WebkitBackdropFilter: "blur(18px)",
              borderRadius: "16px",
              border: "1px solid rgba(255,255,255,0.07)",
              marginBottom: "16px",
              boxShadow: "0 8px 40px rgba(0,0,0,0.5)",
            }}>
            {features.map(({ icon: Icon, label, sub }, i) => (
              <motion.div key={i}
                initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6 + i * 0.08 }}
                whileHover={{ y: -3, transition: { duration: 0.2 } }}
                style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "8px", cursor: "default" }}>
                <motion.div
                  whileHover={{ scale: 1.12 }}
                  animate={{ boxShadow: ["0 0 6px rgba(245,166,35,0.1)","0 0 14px rgba(245,166,35,0.25)","0 0 6px rgba(245,166,35,0.1)"] }}
                  transition={{ boxShadow: { duration: 2.5, repeat: Infinity, delay: i * 0.4 } }}
                  style={{ width: "40px", height: "40px", borderRadius: "12px",
                    background: "linear-gradient(135deg,rgba(245,166,35,0.2),rgba(245,166,35,0.05))",
                    border: "1px solid rgba(245,166,35,0.25)",
                    display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <Icon size={18} color="#F5A623" />
                </motion.div>
                <div style={{ textAlign: "center" }}>
                  <p style={{ fontSize: "11px", color: "rgba(255,255,255,0.85)", fontWeight: "600", margin: 0, lineHeight: 1.3 }}>{label}</p>
                  <p style={{ fontSize: "11px", color: "rgba(255,255,255,0.85)", fontWeight: "600", margin: 0, lineHeight: 1.3 }}>{sub}</p>
                </div>
              </motion.div>
            ))}
          </motion.div>
          <p style={{ fontSize: "11px", color: "rgba(255,255,255,0.28)", margin: 0 }}>
            &copy; 2026 LMC Veiculos. Todos os direitos reservados.
          </p>
        </div>
      </div>

      {/* ============== RIGHT ============== */}
      <motion.div
        initial={{ opacity: 0, x: 60 }} animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="login-right"
        style={{
          background: "linear-gradient(160deg,#1c1c1c 0%,#131313 100%)",
          display: "flex", flexDirection: "column", justifyContent: "center",
          padding: "clamp(28px, 5vw, 52px) clamp(20px, 5vw, 44px)",
          position: "relative", overflow: "hidden",
          boxShadow: "-20px 0 60px rgba(0,0,0,0.7)",
        }}>

        {/* Animated top accent bar */}
        <motion.div
          animate={{ backgroundPosition: ["0% 50%","100% 50%","0% 50%"] }}
          transition={{ duration: 4, repeat: Infinity }}
          style={{
            position: "absolute", top: 0, left: 0, right: 0, height: "3px",
            background: "linear-gradient(90deg,#F5A623,#ffce6e,#e8920e,#F5A623)",
            backgroundSize: "200%",
            boxShadow: "0 0 20px rgba(245,166,35,0.7)",
          }} />

        {/* Bottom-right orange ambient */}
        <motion.div
          animate={{ opacity: [0.5, 0.9, 0.5], scale: [1, 1.2, 1] }}
          transition={{ duration: 6, repeat: Infinity }}
          style={{
            position: "absolute", bottom: "-100px", right: "-100px",
            width: "300px", height: "300px",
            background: "radial-gradient(circle,rgba(245,166,35,0.06) 0%,transparent 70%)",
            borderRadius: "50%", pointerEvents: "none",
          }} />

        {/* Scan line shimmer */}
        <motion.div
          animate={{ y: ["-100%","300%"] }}
          transition={{ duration: 5, repeat: Infinity, ease: "linear", delay: 2 }}
          style={{
            position: "absolute", left: 0, right: 0, height: "60px",
            background: "linear-gradient(180deg,transparent,rgba(245,166,35,0.025),transparent)",
            pointerEvents: "none", zIndex: 0,
          }} />

        {/* Mobile logo */}
        <motion.div
          initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
          className="login-mobile-logo"
          style={{ alignItems: "flex-start", marginBottom: "28px", position: "relative", zIndex: 1 }}
        >
          {/* Pulsing glow */}
          <motion.div
            animate={{ opacity: [0.3, 0.8, 0.3], scale: [0.9, 1.15, 0.9] }}
            transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
            style={{
              position: "absolute",
              width: "140px", height: "100px",
              top: "50%", left: "50%",
              transform: "translate(-50%, -50%)",
              background: "radial-gradient(ellipse, rgba(245,166,35,0.35) 0%, transparent 70%)",
              filter: "blur(14px)",
              pointerEvents: "none",
            }}
          />
          <motion.img
            src="/brand/lmc-logo-on-dark.svg"
            alt="LMC Veículos"
            style={{
              height: "90px",
              width: "auto",
              objectFit: "contain",
              display: "block",
              position: "relative",
              zIndex: 1,
            }}
          />
        </motion.div>

        <motion.div initial={{ opacity: 0, y: -14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
          style={{ marginBottom: "36px", position: "relative", zIndex: 1 }}>
          <h2 style={{ fontSize: "27px", fontWeight: "800", color: "#fff", margin: "0 0 10px", letterSpacing: "-0.5px" }}>
            Bem-vindo{" "}
            <motion.span animate={{ textShadow: ["0 0 12px rgba(245,166,35,0.3)","0 0 28px rgba(245,166,35,0.7)","0 0 12px rgba(245,166,35,0.3)"] }}
              transition={{ duration: 3, repeat: Infinity }}
              style={{ color: "#F5A623" }}>
              de volta!
            </motion.span>
          </h2>
          <p style={{ fontSize: "14px", color: "rgba(255,255,255,0.4)", lineHeight: 1.65, margin: 0 }}>
            Faça login para acessar o sistema<br />de gestão da sua concessionária.
          </p>
        </motion.div>

        {/* ── FORM ── */}
        <AnimatePresence mode="wait">
          {success ? (
            <motion.div key="success"
              initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
              style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "16px", padding: "40px 0" }}>
              <motion.div
                animate={{ scale: [1, 1.15, 1] }} transition={{ duration: 0.6 }}
                style={{ width: "64px", height: "64px", borderRadius: "50%",
                  background: "linear-gradient(135deg,#10b981,#059669)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  boxShadow: "0 0 40px rgba(16,185,129,0.5)" }}>
                <CheckCircle2 size={32} color="#fff" />
              </motion.div>
              <p style={{ color: "#fff", fontWeight: "700", fontSize: "18px" }}>Entrando...</p>
            </motion.div>
          ) : (
            <motion.form key="form" onSubmit={handleSubmit}
              initial={{ opacity: 0 }} animate={shake ? { x: [0, -10, 10, -10, 10, 0], opacity: 1 } : { opacity: 1 }}
              transition={shake ? { duration: 0.4 } : undefined}
              style={{ display: "flex", flexDirection: "column", gap: "18px", position: "relative", zIndex: 1 }}>

              {/* Usuario */}
              <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.4 }}>
                <label htmlFor="login-usuario" style={{ display: "block", fontSize: "13px", fontWeight: "600",
                  color: "rgba(255,255,255,0.78)", marginBottom: "8px" }}>Usuário</label>
                <div style={{ position: "relative" }}>
                  <User size={15} color="rgba(255,255,255,0.28)"
                    style={{ position: "absolute", left: "15px", top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }} />
                  <input id="login-usuario" type="text" autoComplete="username" autoCapitalize="none" spellCheck={false}
                    placeholder="E-mail ou nome de usuário" value={identifier}
                    onChange={e => { setIdentifier(e.target.value); setError(""); }}
                    style={{ width: "100%", boxSizing: "border-box", padding: "13px 14px 13px 44px",
                      background: "rgba(255,255,255,0.05)", border: `1px solid ${error ? "#ef4444" : "rgba(255,255,255,0.1)"}`,
                      borderRadius: "12px", color: "#fff", fontSize: "14px", outline: "none",
                      transition: "border-color 0.2s, box-shadow 0.2s", fontFamily: "inherit" }}
                    onFocus={e => { e.target.style.borderColor="#F5A623"; e.target.style.boxShadow="0 0 0 3px rgba(245,166,35,0.12)"; }}
                    onBlur={e => { e.target.style.borderColor=error?"#ef4444":"rgba(255,255,255,0.1)"; e.target.style.boxShadow="none"; }} />
                </div>
              </motion.div>

              {/* Senha */}
              <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.48 }}>
                <label htmlFor="login-senha" style={{ display: "block", fontSize: "13px", fontWeight: "600",
                  color: "rgba(255,255,255,0.78)", marginBottom: "8px" }}>Senha</label>
                <div style={{ position: "relative" }}>
                  <Lock size={15} color="rgba(255,255,255,0.28)"
                    style={{ position: "absolute", left: "15px", top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }} />
                  <input id="login-senha" type={showPassword ? "text" : "password"} autoComplete="current-password"
                    placeholder="Digite sua senha" value={senha}
                    onChange={e => { setSenha(e.target.value); setError(""); }}
                    onKeyDown={handleKeyEvent} onKeyUp={handleKeyEvent}
                    style={{ width: "100%", boxSizing: "border-box", padding: "13px 46px 13px 44px",
                      background: "rgba(255,255,255,0.05)", border: `1px solid ${error ? "#ef4444" : "rgba(255,255,255,0.1)"}`,
                      borderRadius: "12px", color: "#fff", fontSize: "14px", outline: "none",
                      transition: "border-color 0.2s, box-shadow 0.2s", fontFamily: "inherit" }}
                    onFocus={e => { e.target.style.borderColor="#F5A623"; e.target.style.boxShadow="0 0 0 3px rgba(245,166,35,0.12)"; }}
                    onBlur={e => { e.target.style.borderColor=error?"#ef4444":"rgba(255,255,255,0.1)"; e.target.style.boxShadow="none"; }} />
                  <motion.button type="button" onClick={() => setShowPassword(v => !v)} whileTap={{ scale: 0.85 }}
                    aria-label={showPassword ? "Esconder senha" : "Mostrar senha"}
                    style={{
                      position: "absolute", right: "12px", top: 0, bottom: 0,
                      background: "none", border: "none", cursor: "pointer",
                      color: "rgba(255,255,255,0.3)", padding: 0, margin: 0,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      width: "28px",
                    }}
                    onMouseEnter={e => (e.currentTarget.style.color="#F5A623")}
                    onMouseLeave={e => (e.currentTarget.style.color="rgba(255,255,255,0.3)")}>
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </motion.button>
                </div>
                {/* Caps Lock warning */}
                <AnimatePresence>
                  {capsLock && (
                    <motion.p initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      style={{ fontSize: "11px", color: "#f59e0b", margin: "6px 0 0",
                        display: "flex", alignItems: "center", gap: "5px" }}>
                      <AlertTriangle size={12} /> Caps Lock está ativado
                    </motion.p>
                  )}
                </AnimatePresence>
              </motion.div>

              {/* Error */}
              <AnimatePresence>
                {error && (
                  <motion.div initial={{ opacity: 0, y: -8, height: 0 }} animate={{ opacity: 1, y: 0, height: "auto" }}
                    exit={{ opacity: 0, y: -8, height: 0 }}
                    style={{ fontSize: "12px", margin: 0, padding: "10px 12px", borderRadius: "8px",
                      display: "flex", alignItems: "center", gap: "8px",
                      color: errorType === "locked" ? "#f59e0b" : errorType === "rate" ? "#60a5fa" : "#ef4444",
                      background: errorType === "locked" ? "rgba(245,158,11,0.08)" : errorType === "rate" ? "rgba(96,165,250,0.08)" : "rgba(239,68,68,0.08)",
                      border: `1px solid ${errorType === "locked" ? "rgba(245,158,11,0.2)" : errorType === "rate" ? "rgba(96,165,250,0.2)" : "rgba(239,68,68,0.2)"}`,
                    }}>
                    {errorType === "locked" ? <Lock size={14} style={{ flexShrink: 0 }} /> 
                     : errorType === "rate" ? <Clock size={14} style={{ flexShrink: 0 }} />
                     : <XCircle size={14} style={{ flexShrink: 0 }} />}
                    <span>{error}</span>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Remember + Forgot */}
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.55 }}
                style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <label style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer", userSelect: "none" }}>
                  <input type="checkbox" checked={rememberMe} onChange={e => setRememberMe(e.target.checked)}
                    style={{ accentColor: "#F5A623", width: "15px", height: "15px", cursor: "pointer" }} />
                  <span style={{ fontSize: "13px", color: "rgba(255,255,255,0.7)" }}>Lembrar meu usuário</span>
                </label>
                <motion.button type="button" whileHover={{ scale: 1.04 }}
                  onClick={() => { setErrorType("rate"); setError("Peça ao administrador da loja para criar uma nova senha em Usuários."); }}
                  style={{ background: "none", border: "none", cursor: "pointer",
                    fontSize: "13px", color: "#F5A623", fontWeight: "600", padding: 0 }}>
                  Esqueci minha senha
                </motion.button>
              </motion.div>

              {/* CTA */}
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }}>
                <motion.button type="submit" disabled={isLoading}
                  whileHover={!isLoading ? { scale: 1.02, boxShadow: "0 10px 40px rgba(245,166,35,0.5)" } : {}}
                  whileTap={!isLoading ? { scale: 0.97 } : {}}
                  style={{
                    width: "100%", padding: "15px",
                    background: isLoading
                      ? "rgba(245,166,35,0.4)"
                      : "linear-gradient(135deg,#F5A623 0%,#f0920d 100%)",
                    border: "none", borderRadius: "12px",
                    color: "#fff", fontSize: "15px", fontWeight: "700",
                    cursor: isLoading ? "not-allowed" : "pointer",
                    display: "flex", alignItems: "center", justifyContent: "center", gap: "10px",
                    boxShadow: isLoading ? "none" : "0 4px 24px rgba(245,166,35,0.35)",
                    transition: "all 0.2s", letterSpacing: "0.01em",
                  }}>
                  {isLoading
                    ? <><Loader2 size={16} style={{ animation: "spin 1s linear infinite" }} /> Entrando...</>
                    : <>Entrar no sistema <ArrowRight size={16} /></>
                  }
                </motion.button>
              </motion.div>

              {/* Divider */}
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.65 }}
                style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                <div style={{ flex: 1, height: "1px", background: "rgba(255,255,255,0.07)" }} />
                <span style={{ fontSize: "12px", color: "rgba(255,255,255,0.22)" }}>ou</span>
                <div style={{ flex: 1, height: "1px", background: "rgba(255,255,255,0.07)" }} />
              </motion.div>

            </motion.form>
          )}
        </AnimatePresence>

        {/* Security footer */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.8 }}
          style={{ display: "flex", alignItems: "center", justifyContent: "center",
            gap: "6px", marginTop: "30px", position: "relative", zIndex: 1 }}>
          <motion.div animate={{ opacity: [0.5, 1, 0.5] }} transition={{ duration: 3, repeat: Infinity }}>
            <Shield size={12} color="rgba(255,255,255,0.22)" />
          </motion.div>
          <span style={{ fontSize: "12px", color: "rgba(255,255,255,0.22)" }}>Acesso seguro e criptografado</span>
        </motion.div>
      </motion.div>
    </div>
  );
}
