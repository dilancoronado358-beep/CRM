import { useState, useEffect } from "react";
import { createClient } from "@supabase/supabase-js";

const SUPA_URL = "https://eoylgxwlhsmwqgadahvk.supabase.co";
const SUPA_KEY = "sb_publishable_wKUbf7IFOoH4HIUayIAJdQ_Boj1jgZa";
const supa = createClient(SUPA_URL, SUPA_KEY);

// ─── Form inside landing page ─────────────────────────────────────────────────
const LeadForm = ({ accent }) => {
  const [v, setV] = useState({ nombre: "", email: "", empresa: "" });
  const [sent, setSent] = useState(false);
  const [sending, setSending] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    if (!v.nombre || !v.email) return;
    setSending(true);
    try {
      const cid = "c_lp_" + Date.now();
      await supa.from("contactos").insert({ id: cid, nombre: v.nombre, email: v.email, estado: "lead", fuente: "Landing Page Web", creado: new Date().toISOString().slice(0, 10) });
      const { data: pls } = await supa.from("pipelines").select("id, etapas").limit(1);
      const pl = pls?.[0];
      await supa.from("deals").insert({ id: "d_lp_" + Date.now(), titulo: `Demo: ${v.nombre}`, contacto_id: cid, pipeline_id: pl?.id || "", etapa_id: pl?.etapas?.[0]?.id || "", valor: 0, prob: 15, fecha_cierre: new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10), etiquetas: ["landing_page"], creado: new Date().toISOString().slice(0, 10), notas: `Lead web: ${v.nombre} · ${v.email} · ${v.empresa}` });
      setSent(true);
    } catch (err) { console.error(err); }
    setSending(false);
  };

  if (sent) return (
    <div style={{ textAlign: "center", padding: "24px 0" }}>
      <div style={{ fontSize: 40, marginBottom: 12 }}>🎉</div>
      <h3 style={{ fontSize: 18, fontWeight: 800, color: "#111827" }}>¡Solicitud recibida!</h3>
      <p style={{ color: "#6B7280" }}>Te contactaremos en menos de 24 horas.</p>
    </div>
  );

  return (
    <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      {[{ k: "nombre", l: "Nombre completo *", t: "text" }, { k: "email", l: "Email empresarial *", t: "email" }, { k: "empresa", l: "Empresa / Cargo", t: "text" }].map(({ k, l, t }) => (
        <input key={k} type={t} value={v[k]} onChange={(e) => setV(p => ({ ...p, [k]: e.target.value }))} placeholder={l} required={l.includes("*")} style={{ padding: "12px 14px", border: "1.5px solid #E5E7EB", borderRadius: 8, fontSize: 14, fontFamily: "inherit", outline: "none", width: "100%", boxSizing: "border-box", color: "#111827" }} />
      ))}
      <button type="submit" disabled={sending} style={{ padding: "14px", background: accent || "#06B6D4", color: "#fff", border: "none", borderRadius: 10, fontSize: 15, fontWeight: 700, cursor: "pointer", boxShadow: `0 8px 20px ${accent || "#06B6D4"}44` }}>
        {sending ? "Enviando..." : "Solicitar Demo Gratuita →"}
      </button>
    </form>
  );
};

// ─── Main public landing page ──────────────────────────────────────────────────
export const LandingPagePublica = ({ siteSlug }) => {
  const [page, setPage] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    const load = async () => {
      // Try by id first, then by slug
      const { data } = await supa
        .from("landing_pages")
        .select("*")
        .or(`id.eq.${siteSlug},slug.eq.${siteSlug}`)
        .eq("activo", true)
        .maybeSingle();

      if (data) {
        // Normalize snake_case columns from DB to camelCase
        setPage({
          ...data,
          heroTitle: data.hero_title || data.heroTitle || "Genera más negocios hoy",
          heroSub: data.hero_sub || data.heroSub || "",
          heroCTA: data.hero_cta || data.heroCTA || "Ver Demo",
          heroCTA2: data.hero_cta2 || data.heroCTA2 || "",
          accentColor: data.accent_color || data.accentColor || "#06B6D4",
          videoUrl: data.video_url || data.videoUrl || "",
          faqItems: Array.isArray(data.faq_items) ? data.faq_items : (data.faqItems || []),
          statsItems: Array.isArray(data.stats_items) ? data.stats_items : (data.statsItems || []),
          features: Array.isArray(data.features) ? data.features : [],
          blocks: Array.isArray(data.blocks) ? data.blocks : ["hero", "features", "cta"],
        });
      } else {
        // Also try without activo filter (for preview)
        const { data: preview } = await supa.from("landing_pages").select("*").or(`id.eq.${siteSlug},slug.eq.${siteSlug}`).maybeSingle();
        if (preview) {
          setPage({
            ...preview,
            heroTitle: preview.hero_title || "Genera más negocios hoy",
            heroSub: preview.hero_sub || "",
            heroCTA: preview.hero_cta || "Ver Demo",
            heroCTA2: preview.hero_cta2 || "",
            accentColor: preview.accent_color || "#06B6D4",
            videoUrl: preview.video_url || "",
            faqItems: preview.faq_items || [],
            statsItems: preview.stats_items || [],
            features: preview.features || [],
            blocks: Array.isArray(preview.blocks) ? preview.blocks : ["hero", "features", "cta"],
          });
        } else {
          setError("Página no encontrada o no publicada.");
        }
      }
    };
    load();
  }, [siteSlug]);

  if (error) return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "Inter, system-ui, sans-serif" }}>
      <div style={{ textAlign: "center" }}>
        <div style={{ fontSize: 60, marginBottom: 16 }}>🔍</div>
        <h2 style={{ color: "#111827" }}>Página no encontrada</h2>
        <p style={{ color: "#6B7280" }}>{error}</p>
      </div>
    </div>
  );

  if (!page) return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ width: 36, height: 36, border: "3px solid #E5E7EB", borderTopColor: "#06B6D4", borderRadius: "50%", animation: "spin 1s linear infinite" }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );

  const accent = page.accentColor;
  const blocks = page.blocks || ["hero", "features", "cta"];

  const renderBlock = (blockId) => {
    switch (blockId) {
      case "hero":
        return (
          <div key="hero" style={{ padding: "90px 24px", textAlign: "center", background: `linear-gradient(180deg, ${accent}0D 0%, #fff 100%)`, borderBottom: "1px solid #E5E7EB" }}>
            <div style={{ display: "inline-block", background: accent + "18", color: accent, padding: "5px 16px", borderRadius: 20, fontSize: 11, fontWeight: 700, marginBottom: 24, border: `1px solid ${accent}33`, textTransform: "uppercase" }}>🚀 Plataforma CRM #1</div>
            <h1 style={{ fontSize: "clamp(32px, 5vw, 56px)", fontWeight: 900, color: "#111827", margin: "0 0 18px", letterSpacing: "-.04em", lineHeight: 1.06, maxWidth: 700, marginInline: "auto" }}>{page.heroTitle}</h1>
            {page.heroSub && <p style={{ fontSize: 18, color: "#6B7280", margin: "0 auto 36px", maxWidth: 560, lineHeight: 1.7 }}>{page.heroSub}</p>}
            <div style={{ display: "flex", gap: 14, justifyContent: "center", flexWrap: "wrap" }}>
              <a href="#form-section" style={{ display: "inline-block", background: accent, color: "#fff", border: "none", padding: "15px 30px", borderRadius: 12, fontSize: 15, fontWeight: 700, textDecoration: "none", boxShadow: `0 8px 24px ${accent}44` }}>{page.heroCTA}</a>
              {page.heroCTA2 && <a href="#features-section" style={{ display: "inline-block", background: "#F3F4F6", color: "#374151", border: "none", padding: "15px 26px", borderRadius: 12, fontSize: 15, fontWeight: 700, textDecoration: "none" }}>{page.heroCTA2} →</a>}
            </div>
          </div>
        );
      case "stats":
        return page.statsItems?.length ? (
          <div key="stats" style={{ padding: "50px 24px", background: accent }}>
            <div style={{ display: "grid", gridTemplateColumns: `repeat(${Math.min(page.statsItems.length, 4)}, 1fr)`, gap: 24, maxWidth: 900, margin: "0 auto", textAlign: "center" }}>
              {page.statsItems.map((s, i) => <div key={i}><div style={{ fontSize: 34, fontWeight: 900, color: "#fff" }}>{s.value}</div><div style={{ fontSize: 13, color: "rgba(255,255,255,.8)", marginTop: 4 }}>{s.label}</div></div>)}
            </div>
          </div>
        ) : null;
      case "features":
        return (
          <div id="features-section" key="features" style={{ padding: "70px 24px", background: "#F9FAFB" }}>
            <h2 style={{ fontSize: 28, fontWeight: 800, color: "#111827", textAlign: "center", margin: "0 0 40px" }}>Todo lo que necesitas</h2>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 20, maxWidth: 900, margin: "0 auto" }}>
              {(page.features || []).map((f, i) => (
                <div key={i} style={{ background: "#fff", padding: 24, borderRadius: 14, border: "1px solid #E5E7EB" }}>
                  <div style={{ width: 42, height: 42, borderRadius: 12, background: accent + "18", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, marginBottom: 14 }}>{f.icon}</div>
                  <h3 style={{ fontSize: 14, fontWeight: 800, margin: "0 0 8px", color: "#111827" }}>{f.title}</h3>
                  <p style={{ fontSize: 13, color: "#6B7280", margin: 0, lineHeight: 1.6 }}>{f.desc}</p>
                </div>
              ))}
            </div>
          </div>
        );
      case "pricing":
        return (
          <div key="pricing" style={{ padding: "70px 24px", textAlign: "center" }}>
            <h2 style={{ fontSize: 28, fontWeight: 800, color: "#111827", margin: "0 0 40px" }}>Planes simples y transparentes</h2>
            <div style={{ display: "flex", gap: 20, justifyContent: "center", flexWrap: "wrap" }}>
              {[{ p: "Starter", price: "$29", f: ["5 usuarios", "1 pipeline", "Email básico"], h: false }, { p: "Pro", price: "$79", f: ["25 usuarios", "Pipelines ilimitados", "IA & Automations"], h: true }, { p: "Enterprise", price: "Custom", f: ["Usuarios ilimitados", "SSO", "SLA 99.9%"], h: false }].map((pl, i) => (
                <div key={i} style={{ background: pl.h ? accent : "#fff", padding: 28, borderRadius: 16, border: `2px solid ${pl.h ? "transparent" : "#E5E7EB"}`, width: 200, boxShadow: pl.h ? `0 10px 30px ${accent}40` : "none" }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: pl.h ? "rgba(255,255,255,.8)" : "#6B7280", marginBottom: 8 }}>{pl.p}</div>
                  <div style={{ fontSize: 32, fontWeight: 900, color: pl.h ? "#fff" : "#111827", marginBottom: 14 }}>{pl.price}</div>
                  {pl.f.map((ft, j) => <div key={j} style={{ fontSize: 12, color: pl.h ? "rgba(255,255,255,.85)" : "#374151", marginBottom: 5 }}>✓ {ft}</div>)}
                  <a href="#form-section" style={{ display: "inline-block", marginTop: 16, background: pl.h ? "#fff" : accent, color: pl.h ? accent : "#fff", border: "none", padding: "10px 20px", borderRadius: 8, fontSize: 13, fontWeight: 700, textDecoration: "none", cursor: "pointer" }}>Elegir Plan</a>
                </div>
              ))}
            </div>
          </div>
        );
      case "testimonials":
        return (
          <div key="testimonials" style={{ padding: "70px 24px", background: "#F9FAFB" }}>
            <h2 style={{ fontSize: 28, fontWeight: 800, color: "#111827", textAlign: "center", margin: "0 0 40px" }}>Lo que dicen nuestros clientes</h2>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 20, maxWidth: 900, margin: "0 auto" }}>
              {[{ n: "María G.", c: "TechCorp", t: "Incrementamos las ventas en 40% el primer trimestre." }, { n: "Carlos R.", c: "Startup SL", t: "La automatización nos ahorra 10h a la semana." }, { n: "Ana P.", c: "AgenciaX", t: "El mejor CRM que hemos usado en 5 años." }].map((t, i) => (
                <div key={i} style={{ background: "#fff", padding: 22, borderRadius: 14, border: "1px solid #E5E7EB" }}>
                  <div style={{ fontSize: 16, marginBottom: 10 }}>⭐⭐⭐⭐⭐</div>
                  <p style={{ fontSize: 13, color: "#374151", lineHeight: 1.7, margin: "0 0 14px", fontStyle: "italic" }}>"{t.t}"</p>
                  <div style={{ fontSize: 12, fontWeight: 700, color: "#111827" }}>{t.n} · <span style={{ color: "#6B7280", fontWeight: 400 }}>{t.c}</span></div>
                </div>
              ))}
            </div>
          </div>
        );
      case "faq":
        return page.faqItems?.length ? (
          <div key="faq" style={{ padding: "70px 24px" }}>
            <h2 style={{ fontSize: 28, fontWeight: 800, color: "#111827", textAlign: "center", margin: "0 0 40px" }}>Preguntas Frecuentes</h2>
            <div style={{ maxWidth: 680, margin: "0 auto", display: "flex", flexDirection: "column", gap: 12 }}>
              {page.faqItems.map((item, i) => <div key={i} style={{ background: "#F9FAFB", padding: "18px 22px", borderRadius: 12, border: "1px solid #E5E7EB" }}>
                <div style={{ fontWeight: 700, fontSize: 14, color: "#111827", marginBottom: 8 }}>❓ {item.q}</div>
                <div style={{ fontSize: 13, color: "#6B7280", lineHeight: 1.7 }}>{item.a}</div>
              </div>)}
            </div>
          </div>
        ) : null;
      case "video":
        return page.videoUrl ? (
          <div key="video" style={{ padding: "60px 24px", background: "#111827", textAlign: "center" }}>
            <h2 style={{ fontSize: 26, fontWeight: 800, color: "#fff", margin: "0 0 30px" }}>Ve cómo funciona</h2>
            <div style={{ maxWidth: 780, margin: "0 auto", borderRadius: 16, overflow: "hidden", boxShadow: "0 25px 60px rgba(0,0,0,0.5)" }}>
              <iframe src={page.videoUrl} width="100%" height="420" frameBorder="0" allowFullScreen style={{ display: "block" }} />
            </div>
          </div>
        ) : null;
      case "form":
        return (
          <div id="form-section" key="form" style={{ padding: "70px 24px", background: "#F9FAFB", textAlign: "center" }}>
            <h2 style={{ fontSize: 28, fontWeight: 800, color: "#111827", margin: "0 0 10px" }}>¿Listo para empezar?</h2>
            <p style={{ color: "#6B7280", marginBottom: 36, fontSize: 14 }}>Un asesor te contactará en menos de 24 horas.</p>
            <div style={{ maxWidth: 400, margin: "0 auto", background: "#fff", borderRadius: 18, padding: 30, boxShadow: "0 10px 40px rgba(0,0,0,0.08)", border: "1px solid #E5E7EB" }}>
              <LeadForm accent={accent} />
            </div>
          </div>
        );
      case "cta":
        return (
          <div key="cta" style={{ padding: "70px 24px", background: accent, textAlign: "center" }}>
            <h2 style={{ fontSize: 32, fontWeight: 900, color: "#fff", margin: "0 0 14px" }}>Empieza hoy. Es gratis.</h2>
            <p style={{ color: "rgba(255,255,255,.85)", fontSize: 15, marginBottom: 26 }}>Sin tarjeta de crédito · Configuración en 2 minutos</p>
            <a href="#form-section" style={{ display: "inline-block", background: "#fff", color: accent, border: "none", padding: "15px 34px", borderRadius: 12, fontSize: 15, fontWeight: 800, textDecoration: "none", boxShadow: "0 8px 24px rgba(0,0,0,0.15)" }}>{page.heroCTA || "Comenzar Ahora"} →</a>
          </div>
        );
      default: return null;
    }
  };

  return (
    <div style={{ fontFamily: "Inter, system-ui, sans-serif", minHeight: "100vh", background: "#fff" }}>
      {/* Navbar */}
      <nav style={{ position: "sticky", top: 0, zIndex: 100, background: "rgba(255,255,255,0.92)", backdropFilter: "blur(12px)", borderBottom: "1px solid #F3F4F6", padding: "0 24px", height: 64, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ fontWeight: 900, fontSize: 18, color: "#111827", letterSpacing: "-.03em" }}>
          <span style={{ color: accent }}>●</span> {(page.heroTitle || "").split(" ").slice(0, 2).join(" ") || "ENSING"}
        </div>
        <a href="#form-section" style={{ background: accent, color: "#fff", padding: "9px 20px", borderRadius: 8, fontSize: 13, fontWeight: 700, textDecoration: "none", boxShadow: `0 4px 12px ${accent}44` }}>
          {page.heroCTA} →
        </a>
      </nav>

      {/* Blocks */}
      {blocks.map(renderBlock).filter(Boolean)}

      {/* Footer */}
      <footer style={{ padding: "24px", background: "#111827", textAlign: "center", color: "#6B7280", fontSize: 12 }}>
        © {new Date().getFullYear()} · Potenciado por <span style={{ color: accent, fontWeight: 700 }}>ENSING CRM</span> · Todos los derechos reservados
      </footer>
    </div>
  );
};
