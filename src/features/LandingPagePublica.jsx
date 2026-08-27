import { useState, useEffect } from "react";
import { FormularioPublico } from "./FormularioPublico";
import { sb as supa } from "../hooks/useSupaState";

// ─── Form inside landing page ─────────────────────────────────────────────────
const LeadForm = ({ accent, org_id }) => {
  const [v, setV] = useState({ nombre: "", email: "", empresa: "" });
  const [sent, setSent] = useState(false);
  const [sending, setSending] = useState(false);
  const accentRGB = accent.startsWith("#") ? accent : "#6366f1";

  const submit = async (e) => {
    e.preventDefault();
    if (!v.nombre || !v.email) return;
    setSending(true);
    try {
      const cid = "c_lp_" + Date.now();
      await supa.from("contactos").insert({
        id: cid, nombre: v.nombre, email: v.email, estado: "lead",
        fuente: "Landing Page Web", org_id: org_id || '00000000-0000-0000-0000-000000000001',
        creado: new Date().toISOString().slice(0, 10)
      });
      const { data: pls } = await supa.from("pipelines").select("id, etapas").eq("org_id", org_id || '00000000-0000-0000-0000-000000000001').limit(1);
      const pl = pls?.[0];
      await supa.from("deals").insert({
        id: "d_lp_" + Date.now(), titulo: `Demo: ${v.nombre}`, contacto_id: cid,
        pipeline_id: pl?.id || "", etapa_id: pl?.etapas?.[0]?.id || "",
        valor: 0, prob: 15, fecha_cierre: new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10),
        etiquetas: ["landing_page"], org_id: org_id || '00000000-0000-0000-0000-000000000001',
        creado: new Date().toISOString().slice(0, 10), notas: `Lead web: ${v.nombre} · ${v.email} · ${v.empresa}`
      });
      setSent(true);
    } catch (err) { console.error(err); }
    setSending(false);
  };

  if (sent) return (
    <div style={{ textAlign: "center", padding: "24px 0", animation: "fadeIn 0.5s ease" }}>
      <div style={{ width: 64, height: 64, borderRadius: "50%", background: `${accentRGB}22`, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 24px", fontSize: 32 }}>🎉</div>
      <h3 style={{ margin: "0 0 12px", fontSize: 24, fontWeight: 800, color: "#0f172a" }}>¡Solicitud recibida!</h3>
      <p style={{ color: "#64748b", fontSize: 15, margin: 0 }}>Te contactaremos en menos de 24 horas.</p>
    </div>
  );

  return (
    <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {[{ k: "nombre", l: "Nombre completo *", t: "text" }, { k: "email", l: "Email empresarial *", t: "email" }, { k: "empresa", l: "Empresa / Cargo", t: "text" }].map(({ k, l, t }) => (
        <input key={k} type={t} value={v[k]} onChange={(e) => setV(p => ({ ...p, [k]: e.target.value }))} placeholder={l} required={l.includes("*")} style={{ width: "100%", padding: "14px 16px", background: "rgba(255,255,255,0.9)", border: "1px solid rgba(0,0,0,0.1)", borderRadius: 12, fontSize: 15, fontFamily: "inherit", color: "#1f2937", outline: "none", boxSizing: "border-box", boxShadow: "inset 0 2px 4px rgba(0,0,0,0.02)" }} />
      ))}
      <button type="submit" disabled={sending} style={{ width: "100%", padding: "16px", marginTop: 8, background: accentRGB, color: "#ffffff", border: "none", borderRadius: 12, fontSize: 15, fontWeight: 700, cursor: "pointer", boxShadow: `0 8px 16px ${accentRGB}40`, transition: "transform 0.2s, box-shadow 0.2s" }}>
        {sending ? "Enviando..." : "Solicitar Demo Gratuita"}
      </button>
    </form>
  );
};

// ─── Main public landing page ──────────────────────────────────────────────────
export const LandingPagePublica = ({ siteSlug }) => {
  const [page, setPage] = useState(null);
  const [error, setError] = useState(null);
  const [showPopup, setShowPopup] = useState(false);
  const [popupTriggered, setPopupTriggered] = useState(false);

  useEffect(() => {
    const load = async () => {
      const { data } = await supa.from("landing_pages").select("*").or(`id.eq.${siteSlug},slug.eq.${siteSlug}`).eq("activo", true).maybeSingle();
      if (data) {
        setPage({
          ...data,
          heroTitle: data.hero_title || data.heroTitle || "Genera más negocios hoy",
          heroSub: data.hero_sub || data.heroSub || "",
          heroCTA: data.hero_cta || data.heroCTA || "Ver Demo", heroCTAUrl: data.hero_cta_url || data.heroCTAUrl || "#form-section",
          heroCTA2: data.hero_cta2 || data.heroCTA2 || "", heroCTA2Url: data.hero_cta2_url || data.heroCTA2Url || "#features-section",
          accentColor: data.accent_color || data.accentColor || "#6366f1", videoUrl: data.video_url || data.videoUrl || "",
          ctaTitle: data.cta_title || data.ctaTitle || "Empieza hoy. Es gratis.", ctaSub: data.cta_sub || data.ctaSub || "",
          ctaBtn: data.cta_btn || data.ctaBtn || "Comenzar Ahora", ctaBtnUrl: data.cta_btn_url || data.ctaBtnUrl || "#form-section",
          customText: data.custom_text || data.customText || "Escribe aquí tu contenido libre...", imageUrl: data.image_url || data.imageUrl || "",
          faqItems: Array.isArray(data.faq_items) ? data.faq_items : (data.faqItems || []),
          statsItems: Array.isArray(data.stats_items) ? data.stats_items : (data.statsItems || []),
          features: Array.isArray(data.features) ? data.features : [], buttons: Array.isArray(data.buttons) ? data.buttons : [],
          floatingElements: Array.isArray(data.floating_elements) ? data.floating_elements : (data.floatingElements || []),
          blocks: Array.isArray(data.blocks) ? data.blocks : ["hero", "features", "cta"], customFormId: data.custom_form_id || data.customFormId || null,
        });
      } else {
        const { data: preview } = await supa.from("landing_pages").select("*").or(`id.eq.${siteSlug},slug.eq.${siteSlug}`).maybeSingle();
        if (preview) {
          setPage({
            ...preview,
            heroTitle: preview.hero_title || "Genera más negocios hoy", heroSub: preview.hero_sub || "",
            heroCTA: preview.hero_cta || "Ver Demo", heroCTAUrl: preview.hero_cta_url || "#form-section",
            heroCTA2: preview.hero_cta2 || "", heroCTA2Url: preview.hero_cta2_url || "#features-section",
            accentColor: preview.accent_color || "#6366f1", videoUrl: preview.video_url || "",
            ctaTitle: preview.cta_title || "Empieza hoy. Es gratis.", ctaSub: preview.cta_sub || "",
            ctaBtn: preview.cta_btn || "Comenzar Ahora", ctaBtnUrl: preview.cta_btn_url || "#form-section",
            customText: preview.custom_text || "Escribe aquí tu contenido libre...", imageUrl: preview.image_url || "",
            faqItems: preview.faq_items || [], statsItems: preview.stats_items || [], features: preview.features || [],
            buttons: Array.isArray(preview.buttons) ? preview.buttons : [],
            floatingElements: Array.isArray(preview.floating_elements) ? preview.floating_elements : (preview.floatingElements || []),
            blocks: Array.isArray(preview.blocks) ? preview.blocks : ["hero", "features", "cta"], customFormId: preview.custom_form_id || preview.customFormId || null,
          });
        } else setError("Página no encontrada o no publicada.");
      }
    };
    load();
  }, [siteSlug]);

  useEffect(() => {
    if (!page) return;
    const hasPopup = page.blocks?.includes("popup") && (page.floatingElements || []).some(e => e.type === "popup");
    if (!hasPopup) return;

    const handleMouseLeave = (e) => {
      if (e.clientY <= 0 && !popupTriggered) {
        setShowPopup(true);
        setPopupTriggered(true);
      }
    };

    document.addEventListener("mouseleave", handleMouseLeave);
    return () => document.removeEventListener("mouseleave", handleMouseLeave);
  }, [page, popupTriggered]);

  if (error) return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Inter', sans-serif", background: "#f3f4f6" }}>
      <div style={{ textAlign: "center", background: "#fff", padding: "60px", borderRadius: 24, boxShadow: "0 20px 40px -10px rgba(0,0,0,0.1)" }}>
        <div style={{ fontSize: 60, marginBottom: 16 }}>🔍</div>
        <h2 style={{ color: "#0f172a", margin: "0 0 12px", fontSize: 24, fontWeight: 800 }}>Página no encontrada</h2>
        <p style={{ color: "#64748b", margin: 0 }}>{error}</p>
      </div>
    </div>
  );

  if (!page) return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#f3f4f6" }}>
      <div style={{ width: 40, height: 40, border: "3px solid #e2e8f0", borderTopColor: "#6366f1", borderRadius: "50%", animation: "spin 1s linear infinite" }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );

  const accentRGB = page.accentColor || "#6366f1";
  const blocks = page.blocks || ["hero", "features", "cta"];

  const scrollTo = (e, href) => {
    if (!href || !href.startsWith("#")) return;
    e.preventDefault();
    const el = document.getElementById(href.replace("#", ""));
    if (el) el.scrollIntoView({ behavior: "smooth" });
  };

  const renderBlock = (blockId) => {
    switch (blockId) {
      case "hero": return (
        <div key="hero" style={{ padding: "100px 24px", textAlign: "center", background: "#ffffff", borderBottom: "1px solid #f3f4f6" }}>
          <div style={{ display: "inline-block", background: `${accentRGB}15`, color: accentRGB, padding: "6px 16px", borderRadius: 24, fontSize: 12, fontWeight: 700, marginBottom: 24, textTransform: "uppercase", letterSpacing: "0.05em" }}>🌟 Plataforma Líder</div>
          <h1 style={{ fontSize: "clamp(36px, 6vw, 64px)", fontWeight: 900, color: "#111827", margin: "0 0 24px", letterSpacing: "-0.04em", lineHeight: 1.1, maxWidth: 800, marginInline: "auto" }}>{page.heroTitle}</h1>
          {page.heroSub && <p style={{ fontSize: 18, color: "#4b5563", margin: "0 auto 48px", maxWidth: 600, lineHeight: 1.6 }}>{page.heroSub}</p>}
          <div style={{ display: "flex", gap: 16, justifyContent: "center", flexWrap: "wrap" }}>
            <a href={page.heroCTAUrl || "#form-section"} onClick={(e) => scrollTo(e, page.heroCTAUrl || "#form-section")} style={{ background: accentRGB, color: "#fff", padding: "16px 32px", borderRadius: 12, fontSize: 16, fontWeight: 700, textDecoration: "none", boxShadow: `0 8px 24px ${accentRGB}50`, transition: "transform 0.2s" }}>{page.heroCTA}</a>
            {page.heroCTA2 && <a href={page.heroCTA2Url || "#features-section"} onClick={(e) => scrollTo(e, page.heroCTA2Url || "#features-section")} style={{ background: "#f3f4f6", color: "#1f2937", padding: "16px 32px", borderRadius: 12, fontSize: 16, fontWeight: 700, textDecoration: "none", transition: "background 0.2s" }}>{page.heroCTA2} →</a>}
          </div>
        </div>
      );
      case "stats": return page.statsItems?.length ? (
        <div key="stats" style={{ padding: "80px 24px", background: accentRGB }}>
          <div style={{ display: "grid", gridTemplateColumns: `repeat(auto-fit, minmax(150px, 1fr))`, gap: 40, maxWidth: 1000, margin: "0 auto", textAlign: "center" }}>
            {page.statsItems.map((s, i) => <div key={i}><div style={{ fontSize: 48, fontWeight: 900, color: "#fff", letterSpacing: "-0.02em" }}>{s.value}</div><div style={{ fontSize: 15, color: "rgba(255,255,255,.9)", marginTop: 8, fontWeight: 500 }}>{s.label}</div></div>)}
          </div>
        </div>
      ) : null;
      case "features": return (
        <div id="features-section" key="features" style={{ padding: "100px 24px", background: "#f8fafc" }}>
          <h2 style={{ fontSize: 36, fontWeight: 800, color: "#0f172a", textAlign: "center", margin: "0 0 60px", letterSpacing: "-0.03em" }}>Todo lo que necesitas</h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 32, maxWidth: 1100, margin: "0 auto" }}>
            {(page.features || []).map((f, i) => (
              <div key={i} style={{ background: "#fff", padding: 40, borderRadius: 24, boxShadow: "0 4px 6px -1px rgba(0,0,0,0.05), 0 2px 4px -2px rgba(0,0,0,0.05)", border: "1px solid #f1f5f9" }}>
                <div style={{ width: 56, height: 56, borderRadius: 16, background: `${accentRGB}15`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 28, marginBottom: 24 }}>{f.icon}</div>
                <h3 style={{ fontSize: 20, fontWeight: 800, margin: "0 0 12px", color: "#0f172a" }}>{f.title}</h3>
                <p style={{ fontSize: 15, color: "#64748b", margin: 0, lineHeight: 1.6 }}>{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      );
      case "pricing": return (
        <div key="pricing" style={{ padding: "100px 24px", textAlign: "center", background: "#ffffff" }}>
          <h2 style={{ fontSize: 36, fontWeight: 800, color: "#111827", margin: "0 0 60px", letterSpacing: "-0.03em" }}>Planes simples y transparentes</h2>
          <div style={{ display: "flex", gap: 32, justifyContent: "center", flexWrap: "wrap", alignItems: "center" }}>
            {[{ p: "Starter", price: "$29", f: ["5 usuarios", "1 pipeline", "Email básico"], h: false }, { p: "Pro", price: "$79", f: ["25 usuarios", "Pipelines ilimitados", "IA"], h: true }, { p: "Enterprise", price: "Custom", f: ["Usuarios ilimitados", "SSO"], h: false }].map((pl, i) => (
              <div key={i} style={{ background: pl.h ? accentRGB : "#fff", padding: pl.h ? "56px 40px" : "40px 32px", borderRadius: 32, border: `1px solid ${pl.h ? "transparent" : "#e5e7eb"}`, width: 300, boxShadow: pl.h ? `0 25px 50px -12px ${accentRGB}50` : "none", color: pl.h ? "#fff" : "#111827", transform: pl.h ? "scale(1.05)" : "none" }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: pl.h ? "rgba(255,255,255,.9)" : "#6b7280", marginBottom: 12, textTransform: "uppercase", letterSpacing: "0.05em" }}>{pl.p}</div>
                <div style={{ fontSize: 56, fontWeight: 900, marginBottom: 32, letterSpacing: "-0.04em" }}>{pl.price}</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 16, marginBottom: 40 }}>
                  {pl.f.map((ft, j) => <div key={j} style={{ fontSize: 15, color: pl.h ? "rgba(255,255,255,.9)" : "#4b5563" }}>✓ {ft}</div>)}
                </div>
                <a href="#form-section" onClick={(e) => scrollTo(e, "#form-section")} style={{ display: "block", background: pl.h ? "#fff" : `${accentRGB}15`, color: pl.h ? accentRGB : accentRGB, padding: "16px 24px", borderRadius: 16, fontSize: 16, fontWeight: 700, textDecoration: "none" }}>Elegir Plan</a>
              </div>
            ))}
          </div>
        </div>
      );
      case "testimonials": return (
        <div key="testimonials" style={{ padding: "100px 24px", background: "#f8fafc" }}>
          <h2 style={{ fontSize: 36, fontWeight: 800, color: "#0f172a", textAlign: "center", margin: "0 0 60px", letterSpacing: "-0.03em" }}>Lo que dicen nuestros clientes</h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 32, maxWidth: 1100, margin: "0 auto" }}>
            {[{ n: "María G.", c: "TechCorp", t: "Incrementamos las ventas en 40% el primer trimestre." }, { n: "Carlos R.", c: "Startup SL", t: "La automatización nos ahorra 10h a la semana." }, { n: "Ana P.", c: "AgenciaX", t: "El mejor CRM que hemos usado en 5 años." }].map((t, i) => (
              <div key={i} style={{ background: "#fff", padding: 32, borderRadius: 24, border: "1px solid #f1f5f9", boxShadow: "0 4px 6px -1px rgba(0,0,0,0.05)" }}>
                <div style={{ fontSize: 20, marginBottom: 16 }}>⭐⭐⭐⭐⭐</div>
                <p style={{ fontSize: 16, color: "#334155", lineHeight: 1.7, margin: "0 0 24px", fontStyle: "italic" }}>"{t.t}"</p>
                <div style={{ fontSize: 15, fontWeight: 700, color: "#0f172a" }}>{t.n} · <span style={{ color: "#64748b", fontWeight: 400 }}>{t.c}</span></div>
              </div>
            ))}
          </div>
        </div>
      );
      case "faq": return page.faqItems?.length ? (
        <div key="faq" style={{ padding: "100px 24px", background: "#ffffff" }}>
          <h2 style={{ fontSize: 36, fontWeight: 800, color: "#0f172a", textAlign: "center", margin: "0 0 60px", letterSpacing: "-0.03em" }}>Preguntas Frecuentes</h2>
          <div style={{ maxWidth: 760, margin: "0 auto", display: "flex", flexDirection: "column", gap: 16 }}>
            {page.faqItems.map((item, i) => <div key={i} style={{ background: "#f8fafc", padding: "24px 32px", borderRadius: 16, border: "1px solid #f1f5f9" }}>
              <div style={{ fontWeight: 700, fontSize: 16, color: "#0f172a", marginBottom: 12 }}>{item.q}</div>
              <div style={{ fontSize: 15, color: "#64748b", lineHeight: 1.7 }}>{item.a}</div>
            </div>)}
          </div>
        </div>
      ) : null;
      case "video": return page.videoUrl ? (
        <div key="video" style={{ padding: "100px 24px", background: "#0f172a", textAlign: "center" }}>
          <h2 style={{ fontSize: 36, fontWeight: 800, color: "#fff", margin: "0 0 48px", letterSpacing: "-0.03em" }}>Ve cómo funciona</h2>
          <div style={{ maxWidth: 900, margin: "0 auto", borderRadius: 24, overflow: "hidden", boxShadow: "0 25px 60px rgba(0,0,0,0.5)" }}>
            <iframe src={page.videoUrl} width="100%" height="500" frameBorder="0" allowFullScreen style={{ display: "block" }} />
          </div>
        </div>
      ) : null;
      case "text": return (
        <div key="text" style={{ padding: "80px 24px", background: "#fff", textAlign: "left", fontSize: 18, color: "#334155", lineHeight: 1.8, maxWidth: 800, margin: "0 auto" }}>
          {(page.customText || "").split("\n").map((par, i) => (
            <p key={i} style={{ margin: "0 0 24px", minHeight: par ? "auto" : 28 }}>{par}</p>
          ))}
        </div>
      );
      case "image": return page.imageUrl ? (
        <div key="image" style={{ padding: "60px 24px", background: "#f8fafc", textAlign: "center" }}>
          <img src={page.imageUrl} alt="Contenido" style={{ maxWidth: "100%", height: "auto", borderRadius: 24, boxShadow: "0 10px 40px rgba(0,0,0,0.1)", display: "block", margin: "0 auto" }} />
        </div>
      ) : null;
      case "form": return (
        <div id="form-section" key="form" style={{ padding: "100px 24px", background: "#f8fafc", display: "flex", justifyContent: "center" }}>
          <div style={{ width: "100%", maxWidth: 500, background: "#fff", borderRadius: 24, padding: 48, boxShadow: "0 20px 40px -10px rgba(0,0,0,0.1)", border: "1px solid #f1f5f9" }}>
            <div style={{ textAlign: "center", marginBottom: 32 }}>
              <h3 style={{ fontSize: 28, fontWeight: 800, color: "#0f172a", margin: "0 0 12px", letterSpacing: "-0.02em" }}>¿Listo para empezar?</h3>
              <p style={{ color: "#64748b", margin: 0, fontSize: 16 }}>Déjanos tus datos y hablemos.</p>
            </div>
            {page.customFormId ? (
              <FormularioPublico formId={page.customFormId} embed={true} />
            ) : (
              <LeadForm accent={accentRGB} org_id={page.org_id} />
            )}
          </div>
        </div>
      );
      case "buttons": return page.buttons?.length ? (
        <div key="buttons" style={{ padding: "60px 24px", textAlign: "center", background: "#fff" }}>
          <div style={{ display: "flex", gap: 16, justifyContent: "center", flexWrap: "wrap" }}>
            {page.buttons.map((btn, i) => {
              const isSolid = !btn.variant || btn.variant === "solid";
              const isOutline = btn.variant === "outline";
              const btnBg = btn.bg || accentRGB;
              return (
                <a key={i} href={btn.url || "#"} onClick={btn.url?.startsWith("#") ? (e) => scrollTo(e, btn.url) : undefined} target={btn.url?.startsWith("http") ? "_blank" : undefined} rel="noopener noreferrer"
                  style={{
                    background: isSolid ? btnBg : "transparent", color: isSolid ? "#fff" : btnBg,
                    border: isOutline ? `2px solid ${btnBg}` : "none", padding: "16px 32px", borderRadius: 16, fontSize: 16, fontWeight: 700,
                    cursor: "pointer", textDecoration: "none", display: "inline-block", boxShadow: isSolid ? `0 8px 24px ${btnBg}44` : "none"
                  }}>{btn.label || "Botón"}</a>
              );
            })}
          </div>
        </div>
      ) : null;
      case "cta": return (
        <div key="cta" style={{ padding: "100px 24px", background: accentRGB, textAlign: "center" }}>
          <h2 style={{ fontSize: 40, fontWeight: 900, color: "#fff", margin: "0 0 20px", letterSpacing: "-0.03em" }}>{page.ctaTitle || "Empieza hoy. Es gratis."}</h2>
          <p style={{ color: "rgba(255,255,255,.9)", fontSize: 20, marginBottom: 48, maxWidth: 600, marginInline: "auto" }}>{page.ctaSub}</p>
          <a href={page.ctaBtnUrl || "#form-section"} onClick={(e) => scrollTo(e, page.ctaBtnUrl || "#form-section")} style={{ display: "inline-block", background: "#fff", color: accentRGB, padding: "20px 48px", borderRadius: 16, fontSize: 18, fontWeight: 800, textDecoration: "none", boxShadow: "0 10px 25px rgba(0,0,0,0.15)" }}>{page.ctaBtn || "Comenzar Ahora"} →</a>
        </div>
      );
      default: return null;
    }
  };

  return (
    <div style={{ fontFamily: "'Inter', sans-serif", minHeight: "100vh", background: "#fff", position: "relative" }}>
      {/* Navbar */}
      <nav style={{ position: "sticky", top: 0, zIndex: 100, background: "rgba(255,255,255,0.95)", backdropFilter: "blur(12px)", borderBottom: "1px solid #f1f5f9", padding: "0 24px", height: 72, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ fontWeight: 900, fontSize: 22, color: "#0f172a", letterSpacing: "-.03em" }}>
          <span style={{ color: accentRGB }}>●</span> {(page.heroTitle || "").split(" ").slice(0, 2).join(" ") || "ENSING"}
        </div>
        <a href="#form-section" onClick={(e) => scrollTo(e, "#form-section")} style={{ background: accentRGB, color: "#fff", padding: "12px 24px", borderRadius: 12, fontSize: 15, fontWeight: 700, textDecoration: "none", boxShadow: `0 4px 12px ${accentRGB}40` }}>
          {page.heroCTA || "Acción"} →
        </a>
      </nav>

      {/* Blocks */}
      {blocks.map(renderBlock).filter(Boolean)}

      {/* Footer */}
      <footer style={{ padding: "40px 24px", background: "#0f172a", textAlign: "center", color: "#64748b", fontSize: 15 }}>
        © {new Date().getFullYear()} · Potenciado por <span style={{ color: accentRGB, fontWeight: 700 }}>ENSING CRM</span>
      </footer>

      {/* Floating Elements Layer */}
      <div style={{ position: "fixed", inset: 0, pointerEvents: "none", zIndex: "auto", overflow: "hidden" }}>
        {(page.floatingElements || []).map(f => {
          if (f.type === "popup") return null;
          
          const z = f.zIndex !== undefined ? f.zIndex : 10;
          const scale = (f.scale || 100) / 100;
          const style = { position: "absolute", left: `${f.x || 50}%`, top: `${f.y || 50}%`, transform: `translate(-50%, -50%) scale(${scale})`, zIndex: z, pointerEvents: "auto" };
          
          if (f.type === "text") {
            return <div key={f.id} style={{ ...style, background: "rgba(255,255,255,0.9)", backdropFilter: "blur(10px)", padding: "12px 20px", borderRadius: 12, boxShadow: "0 10px 25px rgba(0,0,0,0.1)", fontSize: 14, fontWeight: 600, color: "#111827", border: "1px solid rgba(0,0,0,0.05)", whiteSpace: "pre-wrap" }}>{f.content}</div>;
          } else if (f.type === "image") {
            return <img key={f.id} src={f.content} alt="Flotante" style={{ ...style, maxWidth: 300, maxHeight: 300, objectFit: "contain", borderRadius: 12, boxShadow: "0 10px 25px rgba(0,0,0,0.15)" }} />;
          } else if (f.type === "button") {
            return <a key={f.id} href={f.url || "#"} target={f.url?.startsWith("http") ? "_blank" : undefined} rel="noopener noreferrer" style={{ ...style, background: accentRGB, color: "#fff", padding: "12px 24px", borderRadius: 12, fontSize: 15, fontWeight: 700, textDecoration: "none", boxShadow: `0 8px 24px ${accentRGB}50`, whiteSpace: "nowrap" }}>{f.content || "Botón Libre"}</a>;
          }
          return null;
        })}
      </div>

      {/* Exit Intent Popup */}
      {showPopup && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100000 }}>
          {(() => {
            const pEl = (page.floatingElements || []).find(e => e.type === "popup") || {};
            return (
              <div style={{ background: "#fff", padding: "40px", borderRadius: 24, maxWidth: 400, width: "90%", textAlign: "center", boxShadow: "0 25px 50px -12px rgba(0,0,0,0.5)", border: "1px solid #f1f5f9", position: "relative", animation: "popIn 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)" }}>
                <div onClick={() => setShowPopup(false)} style={{ position: "absolute", top: 16, right: 16, color: "#94a3b8", cursor: "pointer", fontSize: 24, width: 32, height: 32, display: "flex", alignItems: "center", justifyContent: "center", borderRadius: "50%", background: "#f8fafc" }}>✕</div>
                <div style={{ fontSize: 56, marginBottom: 16 }}>🎁</div>
                <h3 style={{ fontSize: 26, fontWeight: 900, color: "#0f172a", margin: "0 0 12px", letterSpacing: "-0.02em" }}>{pEl.title || "¡Espera!"}</h3>
                <p style={{ color: "#475569", margin: "0 0 24px", lineHeight: 1.6, fontSize: 16 }}>{pEl.content || "No te vayas aún..."}</p>
                <a href="#form-section" onClick={() => setShowPopup(false)} style={{ display: "block", background: accentRGB, color: "#fff", padding: "16px", borderRadius: 12, fontWeight: 800, fontSize: 16, cursor: "pointer", textDecoration: "none", boxShadow: `0 10px 25px -5px ${accentRGB}80` }}>{pEl.btn || "Obtener"}</a>
              </div>
            );
          })()}
          <style>{`@keyframes popIn { 0% { opacity: 0; transform: scale(0.8); } 100% { opacity: 1; transform: scale(1); } }`}</style>
        </div>
      )}
    </div>
  );
};
