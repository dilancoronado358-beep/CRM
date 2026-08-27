import { useState, useEffect, useMemo } from "react";
import { sileo as toast } from "../utils/sileo";
import { createClient } from "@supabase/supabase-js";
import { sb as supa } from "../hooks/useSupaState";

export const FormularioPublico = ({ formId, embed = false }) => {
  const [form, setForm] = useState(null);
  const [values, setValues] = useState({});
  const [enviado, setEnviado] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState(null);
  const [paso, setPaso] = useState(0);

  useEffect(() => {
    const loadForm = async () => {
      const { data } = await supa
        .from("formularios_publicos")
        .select("*")
        .eq("id", formId)
        .single();

      if (data) {
        // Parse fields and appearance if they are strings
        const campos = Array.isArray(data.campos) ? data.campos : JSON.parse(data.campos || "[]");
        const apariencia = typeof data.apariencia === "object" && data.apariencia !== null 
          ? data.apariencia 
          : JSON.parse(data.apariencia || "{}");
        setForm({ ...data, campos, apariencia });
      } else {
        setError("Formulario no encontrado.");
      }
    };
    loadForm();
  }, [formId]);

  const { paginas, indexPaso } = useMemo(() => {
    if (!form || !form.campos) return { paginas: [], indexPaso: 0 };
    const p = [];
    let cur = [];
    form.campos.forEach((campo, i) => {
      if (campo.tipo === "section" && i > 0) {
        p.push(cur);
        cur = [campo];
      } else {
        cur.push(campo);
      }
    });
    if (cur.length > 0) p.push(cur);
    return { paginas: p.length ? p : [form.campos], indexPaso: paso };
  }, [form, paso]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    const currentFields = paginas[paso] || [];
    for (const campo of currentFields) {
      if (campo.req && !values[campo.id]?.trim()) {
        toast.error(`El campo "${campo.etiqueta}" es obligatorio.`);
        return;
      }
    }

    if (paso < paginas.length - 1) {
      setPaso(p => p + 1);
      return;
    }

    setEnviando(true);

    const nombreCampo = form.campos?.find((c) => c.tipo === "text" && c.etiqueta.toLowerCase().includes("nombre"));
    const emailCampo = form.campos?.find((c) => c.tipo === "email");
    const telCampo = form.campos?.find((c) => c.tipo === "tel" || c.etiqueta.toLowerCase().includes("tel"));

    const nombre = (nombreCampo && values[nombreCampo.id]) || "Prospecto Web";
    const email = (emailCampo && values[emailCampo.id]) || "";
    const telefono = (telCampo && values[telCampo.id]) || "";

    try {
      const contactoId = "c_web_" + Date.now();
      await supa.from("contactos").insert({
        id: contactoId, nombre, email, telefono, estado: "lead",
        fuente: `Formulario: ${form.nombre}`, org_id: form.org_id || '00000000-0000-0000-0000-000000000001',
        creado: new Date().toISOString().slice(0, 10),
      });

      const { data: pipelines } = await supa.from("pipelines").select("id, etapas").eq("org_id", form.org_id || '00000000-0000-0000-0000-000000000001').limit(1);
      const pl = pipelines?.[0];
      const etapas = pl?.etapas || [];

      const dealId = "d_web_" + Date.now();
      await supa.from("deals").insert({
        id: dealId, titulo: `Lead Web: ${nombre}`, contacto_id: contactoId,
        pipeline_id: form.pipeline_id || pl?.id || "", etapa_id: etapas[0]?.id || "",
        valor: 0, prob: 10, fecha_cierre: new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10),
        etiquetas: ["lead_web", "formulario"], org_id: form.org_id || '00000000-0000-0000-0000-000000000001',
        creado: new Date().toISOString().slice(0, 10),
        notas: `Recibido por formulario "${form.nombre}". Campos:\n` +
          form.campos.filter(c => c.tipo !== 'section').map((c) => `- ${c.etiqueta}: ${values[c.id] || "(vacío)"}`).join("\n"),
      });

      setEnviado(true);
    } catch (err) {
      console.error(err);
      setError("Hubo un error al enviar. Por favor intenta de nuevo.");
    }
    setEnviando(false);
  };

  const A = form?.apariencia || {};
  const accent = A.accentColor || "#6366f1";
  const theme = A.theme || "glass";

  const getPreviewInputStyle = () => ({
    width: "100%", padding: "14px 16px",
    background: theme === "dark" ? "rgba(0,0,0,0.2)" : "rgba(255,255,255,0.9)",
    border: theme === "glass" ? "1px solid rgba(255,255,255,0.4)" : `1px solid ${theme === "dark" ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)"}`,
    borderRadius: Math.min(A.borderRadius ?? 16, 12),
    fontSize: 15, fontFamily: "inherit", color: "inherit", outline: "none", boxSizing: "border-box",
    boxShadow: "inset 0 2px 4px rgba(0,0,0,0.02)", transition: "all 0.2s"
  });

  const cardStyle = {
    background: A.bgColor || (theme === "dark" ? "#111827" : "rgba(255, 255, 255, 0.8)"),
    backdropFilter: theme === "glass" ? "blur(20px)" : "none",
    borderRadius: A.borderRadius ?? 16,
    padding: embed ? 0 : "40px 32px",
    boxShadow: embed ? "none" : (theme === "dark" ? "0 25px 50px -12px rgba(0,0,0,0.5)" : "0 20px 40px -10px rgba(0,0,0,0.1)"),
    border: embed ? "none" : (theme === "glass" ? "1px solid rgba(255,255,255,0.5)" : "none"),
    fontFamily: A.fontFamily || "'Inter', sans-serif",
    color: A.textColor || (theme === "dark" ? "#f3f4f6" : "#1f2937"),
    width: "100%", maxWidth: embed ? "100%" : 480, margin: embed ? 0 : "auto",
    transition: "all 0.3s ease"
  };

  if (error) {
    if (embed) return <div style={{ textAlign: "center", color: "#ef4444", padding: 20 }}>{error}</div>;
    return <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#f3f4f6" }}><div style={{ ...cardStyle, textAlign: "center" }}><h3>⚠️ {error}</h3></div></div>;
  }

  if (!form) {
    if (embed) return <div style={{ textAlign: "center", padding: 40 }}>Cargando...</div>;
    return <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#f3f4f6" }}>Cargando...</div>;
  }

  if (enviado) {
    const success = (
      <div style={{ textAlign: "center", animation: "fadeIn 0.5s ease" }}>
        <div style={{ width: 64, height: 64, borderRadius: "50%", background: `${accent}22`, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 24px", fontSize: 32 }}>✅</div>
        <h2 style={{ margin: "0 0 12px", fontSize: 24, fontWeight: 800 }}>¡Mensaje recibido!</h2>
        <p style={{ opacity: 0.8, fontSize: 15, lineHeight: 1.6, margin: 0 }}>Gracias por contactarnos. Te responderemos en breve.</p>
      </div>
    );
    if (embed) return success;
    return <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#f3f4f6" }}><div style={cardStyle}>{success}</div></div>;
  }

  const innerForm = (
    <div style={{ textAlign: "left" }}>
      {!embed && (
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <h2 style={{ margin: "0 0 8px", fontSize: 26, fontWeight: 800, letterSpacing: "-0.02em", lineHeight: 1.2 }}>{form.nombre}</h2>
          {A.subtitulo && <p style={{ margin: 0, fontSize: 15, opacity: 0.7, lineHeight: 1.5 }}>{A.subtitulo}</p>}
        </div>
      )}

      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 20 }}>
        {(paginas[paso] || []).map((campo) => (
          <div key={campo.id}>
            {campo.tipo === "section" ? (
              <div style={{ marginTop: 16, paddingBottom: 8, borderBottom: `2px solid ${accent}33`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: 18, fontWeight: 700, color: accent }}>{campo.etiqueta}</span>
                {paginas.length > 1 && <span style={{ fontSize: 13, fontWeight: 600, opacity: 0.5 }}>Paso {paso + 1} de {paginas.length}</span>}
              </div>
            ) : (
              <>
                <label style={{ display: "block", fontSize: 13, fontWeight: 600, marginBottom: 8, opacity: 0.9 }}>
                  {campo.etiqueta} {campo.req && <span style={{ color: "#ef4444" }}>*</span>}
                </label>
                {campo.tipo === "textarea" ? (
                  <textarea rows={4} value={values[campo.id] || ""} onChange={(e) => setValues((v) => ({ ...v, [campo.id]: e.target.value }))} placeholder={`Escribe tu ${campo.etiqueta.toLowerCase()}...`} style={getPreviewInputStyle()} required={campo.req} />
                ) : campo.tipo === "checkbox" ? (
                  <label style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 14, cursor: "pointer", opacity: 0.9 }}>
                    <input type="checkbox" checked={values[campo.id] === "Sí"} onChange={(e) => setValues((v) => ({ ...v, [campo.id]: e.target.checked ? "Sí" : "No" }))} style={{ width: 18, height: 18, accentColor: accent, borderRadius: 4 }} required={campo.req} />
                    Sí, acepto las condiciones
                  </label>
                ) : campo.tipo === "select" ? (
                  <div style={{ position: "relative" }}>
                    <select value={values[campo.id] || ""} onChange={(e) => setValues((v) => ({ ...v, [campo.id]: e.target.value }))} style={{ ...getPreviewInputStyle(), appearance: "none" }} required={campo.req}>
                      <option value="">Seleccionar opción</option>
                      {(campo.opciones || "").split(",").filter(Boolean).map((o, i) => <option key={i} value={o.trim()}>{o.trim()}</option>)}
                    </select>
                    <div style={{ position: "absolute", right: 14, top: 14, pointerEvents: "none", opacity: 0.5 }}>▼</div>
                  </div>
                ) : (
                  <input type={campo.tipo} value={values[campo.id] || ""} onChange={(e) => setValues((v) => ({ ...v, [campo.id]: e.target.value }))} placeholder={`Ingresa ${campo.etiqueta.toLowerCase()}...`} style={getPreviewInputStyle()} required={campo.req} />
                )}
              </>
            )}
          </div>
        ))}

        <div style={{ display: "flex", gap: 12, marginTop: 8 }}>
          {paso > 0 && (
            <button type="button" onClick={() => setPaso(p => p - 1)} disabled={enviando} style={{ padding: "16px 24px", background: "rgba(0,0,0,0.05)", border: "none", borderRadius: Math.min(A.borderRadius ?? 16, 12), fontSize: 15, fontWeight: 700, cursor: "pointer", color: "inherit" }}>← Anterior</button>
          )}
          <button type="submit" disabled={enviando} style={{ flex: 1, padding: "16px", background: enviando ? "#9ca3af" : accent, color: "#ffffff", border: "none", borderRadius: Math.min(A.borderRadius ?? 16, 12), fontSize: 15, fontWeight: 700, cursor: "pointer", boxShadow: `0 8px 16px ${accent}40`, transition: "transform 0.2s, box-shadow 0.2s" }}>
            {enviando ? "Enviando..." : (paso < paginas.length - 1 ? "Siguiente →" : (A.buttonText || "Enviar Formulario"))}
          </button>
        </div>
      </form>

      {!embed && (A.footerText) && (
        <div style={{ textAlign: "center", marginTop: 24, paddingTop: 20, borderTop: `1px solid ${A.textColor}15` }}>
          <p style={{ margin: 0, fontSize: 12, opacity: 0.6, display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
            {A.footerText}
          </p>
        </div>
      )}
    </div>
  );

  if (embed) return innerForm;

  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#f3f4f6", padding: 24, position: "relative", overflow: "hidden" }}>
      {/* Fondos decorativos para páginas standalone */}
      <div style={{ position: "absolute", top: -100, left: -100, width: "70%", height: "70%", background: `${accent}33`, filter: "blur(100px)", borderRadius: "50%", zIndex: 0 }} />
      <div style={{ position: "absolute", bottom: -100, right: -100, width: "60%", height: "60%", background: "rgba(168, 85, 247, 0.2)", filter: "blur(100px)", borderRadius: "50%", zIndex: 0 }} />
      <div style={{ position: "relative", zIndex: 10, width: "100%", maxWidth: 480 }}>
        <div style={cardStyle}>{innerForm}</div>
      </div>
    </div>
  );
};
