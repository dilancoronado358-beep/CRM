import { useState, useEffect } from "react";
import { createClient } from "@supabase/supabase-js";

const SUPA_URL = "https://eoylgxwlhsmwqgadahvk.supabase.co";
const SUPA_KEY = "sb_publishable_wKUbf7IFOoH4HIUayIAJdQ_Boj1jgZa";
const supa = createClient(SUPA_URL, SUPA_KEY);

// Default built-in landing pages
const DEFAULT_PAGES = [
  {
    id: "p1",
    slug: "landing-2026",
    titulo: "Campaña Q1 2026",
    activo: true,
    blocks: ["hero", "features", "form", "cta"],
    heroTitle: "Genera más negocios hoy",
    heroCTA: "Ver Demo",
    accentColor: "#06B6D4",
  },
];

const FormEmbebido = ({ accentColor }) => {
  const [values, setValues] = useState({ nombre: "", email: "", mensaje: "" });
  const [enviado, setEnviado] = useState(false);
  const [enviando, setEnviando] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!values.nombre || !values.email) return;
    setEnviando(true);
    try {
      const contactoId = "c_lp_" + Date.now();
      await supa.from("contactos").insert({
        id: contactoId,
        nombre: values.nombre,
        email: values.email,
        estado: "lead",
        fuente: "Landing Page Web",
        creado: new Date().toISOString().slice(0, 10),
      });
      const { data: pls } = await supa.from("pipelines").select("id, etapas").limit(1);
      const pl = pls?.[0];
      await supa.from("deals").insert({
        id: "d_lp_" + Date.now(),
        titulo: `Demo Request: ${values.nombre}`,
        contacto_id: contactoId,
        pipeline_id: pl?.id || "",
        etapa_id: pl?.etapas?.[0]?.id || "",
        valor: 0,
        prob: 15,
        fecha_cierre: new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10),
        etiquetas: ["landing_page", "demo_request"],
        creado: new Date().toISOString().slice(0, 10),
        notas: `Solicitud de demo desde Landing Page.\nNombre: ${values.nombre}\nEmail: ${values.email}\nMensaje: ${values.mensaje}`,
      });
      setEnviado(true);
    } catch (err) {
      console.error(err);
      alert("Error al enviar. Intenta de nuevo.");
    }
    setEnviando(false);
  };

  if (enviado) {
    return (
      <div style={{ textAlign: "center", padding: 32 }}>
        <div style={{ fontSize: 48, marginBottom: 12 }}>🎉</div>
        <h3 style={{ fontSize: 20, fontWeight: 800, color: "#111827" }}>¡Solicitud recibida!</h3>
        <p style={{ color: "#6B7280" }}>Te contactaremos en menos de 24 horas.</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} style={{ maxWidth: 420, margin: "0 auto", display: "flex", flexDirection: "column", gap: 14 }}>
      {[
        { key: "nombre", label: "Nombre completo", type: "text", req: true },
        { key: "email", label: "Email empresarial", type: "email", req: true },
        { key: "mensaje", label: "¿Cómo podemos ayudarte?", type: "textarea", req: false },
      ].map(({ key, label, type, req }) => (
        <div key={key}>
          <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#374151", marginBottom: 5 }}>
            {label}{req && <span style={{ color: "#EF4444" }}> *</span>}
          </label>
          {type === "textarea" ? (
            <textarea rows={3} value={values[key]} onChange={e => setValues(v => ({ ...v, [key]: e.target.value }))} style={inpStyle} placeholder={label} />
          ) : (
            <input type={type} value={values[key]} onChange={e => setValues(v => ({ ...v, [key]: e.target.value }))} style={inpStyle} placeholder={label} required={req} />
          )}
        </div>
      ))}
      <button type="submit" disabled={enviando} style={{ padding: "14px", background: accentColor || "#06B6D4", color: "#fff", border: "none", borderRadius: 10, fontSize: 15, fontWeight: 700, cursor: "pointer", marginTop: 4, boxShadow: `0 8px 20px ${accentColor || "#06B6D4"}44` }}>
        {enviando ? "Enviando..." : "Solicitar Demo Gratuita →"}
      </button>
    </form>
  );
};

const inpStyle = { width: "100%", padding: "11px 14px", border: "1.5px solid #E5E7EB", borderRadius: 8, fontSize: 14, fontFamily: "inherit", outline: "none", boxSizing: "border-box" };

export const LandingPagePublica = ({ siteSlug }) => {
  const [page, setPage] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    const loadPage = async () => {
      // Try to load from Supabase
      const { data } = await supa
        .from("landing_pages")
        .select("*")
        .or(`id.eq.${siteSlug},slug.eq.${siteSlug}`)
        .eq("activo", true)
        .single();

      if (data) {
        setPage(data);
      } else {
        // Fallback to built-in default pages
        const found = DEFAULT_PAGES.find(p => p.id === siteSlug || p.slug === siteSlug);
        if (found) setPage(found);
        else setError("Página no encontrada o no está publicada.");
      }
    };
    loadPage();
  }, [siteSlug]);

  if (error) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#F9FAFB", fontFamily: "Inter, system-ui, sans-serif" }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: 64, marginBottom: 16 }}>🔍</div>
          <h2 style={{ color: "#111827" }}>Página no encontrada</h2>
          <p style={{ color: "#6B7280" }}>{error}</p>
        </div>
      </div>
    );
  }

  if (!page) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#F9FAFB" }}>
        <div style={{ width: 40, height: 40, border: "3px solid #E5E7EB", borderTopColor: "#06B6D4", borderRadius: "50%", animation: "spin 1s linear infinite" }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  const accent = page.accentColor || "#06B6D4";

  return (
    <div style={{ fontFamily: "Inter, system-ui, sans-serif", minHeight: "100vh", background: "#fff" }}>
      {/* Navbar */}
      <nav style={{ position: "sticky", top: 0, zIndex: 50, background: "rgba(255,255,255,0.9)", backdropFilter: "blur(12px)", borderBottom: "1px solid #F3F4F6", padding: "0 24px", height: 64, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ fontWeight: 800, fontSize: 18, color: "#111827", letterSpacing: "-.02em" }}>
          <span style={{ color: accent }}>●</span> {page.heroTitle?.split(" ").slice(0, 2).join(" ") || "ENSING"}
        </div>
        <a href="#form-section" style={{ background: accent, color: "#fff", border: "none", padding: "9px 20px", borderRadius: 8, fontSize: 13, fontWeight: 700, textDecoration: "none", cursor: "pointer" }}>
          {page.heroCTA || "Contact us"} →
        </a>
      </nav>

      {/* Hero */}
      {(!page.blocks || page.blocks.includes("hero")) && (
        <div style={{ padding: "90px 24px", textAlign: "center", background: "linear-gradient(180deg, #f0f9ff 0%, #fff 100%)", borderBottom: "1px solid #F3F4F6" }}>
          <div style={{ display: "inline-block", background: accent + "18", color: accent, padding: "5px 16px", borderRadius: 20, fontSize: 12, fontWeight: 700, marginBottom: 24, border: `1px solid ${accent}33`, letterSpacing: ".05em", textTransform: "uppercase" }}>
            🚀 Plataforma CRM Empresarial
          </div>
          <h1 style={{ fontSize: "clamp(36px, 6vw, 60px)", fontWeight: 900, color: "#111827", margin: "0 0 20px", letterSpacing: "-.04em", lineHeight: 1.05, maxWidth: 700, marginInline: "auto" }}>
            {page.heroTitle || "Genera más negocios hoy"}
          </h1>
          <p style={{ fontSize: 18, color: "#6B7280", margin: "0 auto 36px", maxWidth: 560, lineHeight: 1.7 }}>
            La plataforma líder para captar leads y convertirlos en clientes usando automatización inteligente.
          </p>
          <div style={{ display: "flex", gap: 14, justifyContent: "center", flexWrap: "wrap" }}>
            <a href="#form-section" style={{ background: accent, color: "#fff", border: "none", padding: "16px 32px", borderRadius: 12, fontSize: 16, fontWeight: 700, textDecoration: "none", boxShadow: `0 8px 24px ${accent}44`, cursor: "pointer" }}>
              {page.heroCTA || "Ver Demo"}
            </a>
            <a href="#features-section" style={{ background: "#F3F4F6", color: "#374151", border: "none", padding: "16px 28px", borderRadius: 12, fontSize: 16, fontWeight: 700, textDecoration: "none", cursor: "pointer" }}>
              Ver características →
            </a>
          </div>
        </div>
      )}

      {/* Features */}
      {(!page.blocks || page.blocks.includes("features")) && (
        <div id="features-section" style={{ padding: "80px 24px", background: "#F9FAFB" }}>
          <h2 style={{ fontSize: 32, fontWeight: 800, color: "#111827", textAlign: "center", margin: "0 0 48px", letterSpacing: "-.02em" }}>
            Todo lo que necesitas para vender más
          </h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 24, maxWidth: 960, margin: "0 auto" }}>
            {[
              { icon: "⚡", title: "Automatizaciones IA", desc: "Automatiza seguimientos y tareas repetitivas con inteligencia artificial avanzada." },
              { icon: "🎯", title: "Pipeline Visual", desc: "Visualiza y gestiona todas tus oportunidades de venta en un tablero Kanban intuitivo." },
              { icon: "📊", title: "Reportes en Tiempo Real", desc: "Accede a métricas de ventas actualizadas al instante para tomar mejores decisiones." },
              { icon: "📱", title: "WhatsApp Integrado", desc: "Responde a clientes directamente desde el CRM con el chatbot automático." },
            ].map((f, i) => (
              <div key={i} style={{ background: "#fff", padding: 28, borderRadius: 16, border: "1px solid #E5E7EB", boxShadow: "0 4px 6px -1px rgba(0,0,0,0.04)" }}>
                <div style={{ width: 48, height: 48, borderRadius: 12, background: accent + "18", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24, marginBottom: 16 }}>{f.icon}</div>
                <h3 style={{ fontSize: 16, fontWeight: 800, margin: "0 0 10px", color: "#111827" }}>{f.title}</h3>
                <p style={{ fontSize: 14, color: "#6B7280", margin: 0, lineHeight: 1.7 }}>{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Testimonials */}
      {page.blocks?.includes("testimonials") && (
        <div style={{ padding: "80px 24px", background: "#fff" }}>
          <h2 style={{ fontSize: 32, fontWeight: 800, color: "#111827", textAlign: "center", margin: "0 0 48px" }}>Lo que dicen nuestros clientes</h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 20, maxWidth: 900, margin: "0 auto" }}>
            {[
              { name: "María G.", company: "TechCorp", text: "Incrementamos las ventas en 40% el primer trimestre." },
              { name: "Carlos R.", company: "Startup SL", text: "La automatización nos ahorra 10 horas a la semana." },
              { name: "Ana P.", company: "AgenciaX", text: "El mejor CRM que hemos usado en 5 años." },
            ].map((t, i) => (
              <div key={i} style={{ background: "#F9FAFB", padding: 24, borderRadius: 14, border: "1px solid #E5E7EB" }}>
                <div style={{ fontSize: 20, marginBottom: 12 }}>⭐⭐⭐⭐⭐</div>
                <p style={{ fontSize: 14, color: "#374151", lineHeight: 1.7, margin: "0 0 16px", fontStyle: "italic" }}>"{t.text}"</p>
                <div style={{ fontSize: 13, fontWeight: 700, color: "#111827" }}>{t.name} · <span style={{ color: "#6B7280", fontWeight: 500 }}>{t.company}</span></div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Form */}
      {(!page.blocks || page.blocks.includes("form")) && (
        <div id="form-section" style={{ padding: "80px 24px", background: "#F9FAFB", textAlign: "center" }}>
          <h2 style={{ fontSize: 32, fontWeight: 800, color: "#111827", margin: "0 0 12px", letterSpacing: "-.02em" }}>¿Listo para empezar?</h2>
          <p style={{ color: "#6B7280", marginBottom: 40, fontSize: 16 }}>Un asesor te contactará en menos de 24 horas.</p>
          <div style={{ background: "#fff", borderRadius: 20, padding: 36, maxWidth: 480, margin: "0 auto", boxShadow: "0 10px 40px rgba(0,0,0,0.08)", border: "1px solid #E5E7EB" }}>
            <FormEmbebido accentColor={accent} />
          </div>
        </div>
      )}

      {/* CTA */}
      {(!page.blocks || page.blocks.includes("cta")) && (
        <div style={{ padding: "70px 24px", background: accent, textAlign: "center" }}>
          <h2 style={{ fontSize: 34, fontWeight: 900, color: "#fff", margin: "0 0 16px" }}>Empieza hoy. Es gratis.</h2>
          <p style={{ color: "rgba(255,255,255,.85)", fontSize: 16, marginBottom: 28 }}>Sin tarjeta de crédito · Configuración en 2 minutos</p>
          <a href="#form-section" style={{ background: "#fff", color: accent, border: "none", padding: "16px 36px", borderRadius: 12, fontSize: 16, fontWeight: 800, textDecoration: "none", cursor: "pointer", boxShadow: "0 8px 24px rgba(0,0,0,0.15)" }}>
            {page.heroCTA || "Comenzar Ahora"} →
          </a>
        </div>
      )}

      {/* Footer */}
      <footer style={{ padding: "24px", background: "#111827", textAlign: "center", color: "#6B7280", fontSize: 13 }}>
        © {new Date().getFullYear()} · Potenciado por <span style={{ color: accent, fontWeight: 700 }}>ENSING CRM</span>
      </footer>
    </div>
  );
};
