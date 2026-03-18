import { useState, useEffect, useMemo } from "react";
import { createClient } from "@supabase/supabase-js";

const SUPA_URL = "https://eoylgxwlhsmwqgadahvk.supabase.co";
const SUPA_KEY = "sb_publishable_wKUbf7IFOoH4HIUayIAJdQ_Boj1jgZa";
const supa = createClient(SUPA_URL, SUPA_KEY);

// Default built-in forms (same as FormBuilder)
const DEFAULT_FORMS = [
  {
    id: "f1",
    nombre: "Contacto Web Principal",
    color: "#06B6D4",
    campos: [
      { id: "c1", tipo: "text", etiqueta: "Nombre Completo", req: true },
      { id: "c2", tipo: "email", etiqueta: "Correo Electrónico", req: true },
      { id: "c3", tipo: "textarea", etiqueta: "Mensaje", req: false },
    ],
  },
];

export const FormularioPublico = ({ formId, embed = false }) => {
  const [form, setForm] = useState(null);
  const [values, setValues] = useState({});
  const [enviado, setEnviado] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState(null);
  const [paso, setPaso] = useState(0);

  useEffect(() => {
    // First try to load from Supabase (saved forms)
    const loadForm = async () => {
      const { data } = await supa
        .from("formularios_publicos")
        .select("*")
        .eq("id", formId)
        .single();

      if (data) {
        setForm(data);
      } else {
        // Fallback to built-in forms
        const found = DEFAULT_FORMS.find((f) => f.id === formId);
        if (found) setForm(found);
        else setError("Formulario no encontrado.");
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

    // Validate *current page* required fields
    const currentFields = paginas[paso] || [];
    for (const campo of currentFields) {
      if (campo.req && !values[campo.id]?.trim()) {
        alert(`El campo "${campo.etiqueta}" es obligatorio.`);
        return;
      }
    }

    // Go to next step if not last
    if (paso < paginas.length - 1) {
      setPaso(p => p + 1);
      return;
    }

    setEnviando(true);

    const nombreCampo = form.campos?.find(
      (c) => c.tipo === "text" && c.etiqueta.toLowerCase().includes("nombre")
    );
    const emailCampo = form.campos?.find((c) => c.tipo === "email");
    const telCampo = form.campos?.find(
      (c) => c.tipo === "tel" || c.etiqueta.toLowerCase().includes("tel")
    );

    const nombre = (nombreCampo && values[nombreCampo.id]) || "Prospecto Web";
    const email = (emailCampo && values[emailCampo.id]) || "";
    const telefono = (telCampo && values[telCampo.id]) || "";

    try {
      // 1. Create/find contact
      const contactoId = "c_web_" + Date.now();
      await supa.from("contactos").insert({
        id: contactoId,
        nombre,
        email,
        telefono,
        estado: "lead",
        fuente: `Formulario: ${form.nombre}`,
        org_id: form.org_id || '00000000-0000-0000-0000-000000000001',
        creado: new Date().toISOString().slice(0, 10),
      });

      // 2. Get first pipeline and stage
      const { data: pipelines } = await supa
        .from("pipelines")
        .select("id, etapas")
        .eq("org_id", form.org_id || '00000000-0000-0000-0000-000000000001')
        .limit(1);
      const pl = pipelines?.[0];
      const etapas = pl?.etapas || [];

      // 3. Create deal
      const dealId = "d_web_" + Date.now();
      await supa.from("deals").insert({
        id: dealId,
        titulo: `Lead Web: ${nombre}`,
        contacto_id: contactoId,
        pipeline_id: pl?.id || "",
        etapa_id: etapas[0]?.id || "",
        valor: 0,
        prob: 10,
        fecha_cierre: new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10),
        etiquetas: ["lead_web", "formulario"],
        org_id: form.org_id || '00000000-0000-0000-0000-000000000001',
        creado: new Date().toISOString().slice(0, 10),
        notas: `Recibido por formulario "${form.nombre}". Campos:\n` +
          form.campos
            .filter(c => c.tipo !== 'section')
            .map((c) => `- ${c.etiqueta}: ${values[c.id] || "(vacío)"}`)
            .join("\n"),
      });

      setEnviado(true);
    } catch (err) {
      console.error("Error al enviar formulario:", err);
      setError("Hubo un error al enviar. Por favor intenta de nuevo.");
    }
    setEnviando(false);
  };

  const accent = form?.color || "#06B6D4";

  if (error) {
    const errContent = (
      <>
        <div style={{ fontSize: 48, marginBottom: 16 }}>⚠️</div>
        <h2 style={{ color: "#111827" }}>Formulario no disponible</h2>
        <p style={{ color: "#6B7280" }}>{error}</p>
      </>
    );
    if (embed) return <div style={{ textAlign: "center" }}>{errContent}</div>;
    return (
      <div style={styles.page}>
        <div style={styles.card}>{errContent}</div>
      </div>
    );
  }

  if (!form) {
    const loadContent = (
      <>
        <div style={{ width: 40, height: 40, border: "3px solid #E5E7EB", borderTopColor: "#06B6D4", borderRadius: "50%", animation: "spin 1s linear infinite", margin: embed ? "0 auto" : 0 }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </>
    );
    if (embed) return <div style={{ textAlign: "center", padding: 40 }}>{loadContent}</div>;
    return (
      <div style={styles.page}>
        <div style={styles.card}>{loadContent}</div>
      </div>
    );
  }

  if (enviado) {
    const successContent = (
      <>
        <div style={{ width: 64, height: 64, borderRadius: "50%", background: accent + "22", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 20px", fontSize: 32 }}>✅</div>
        <h2 style={{ color: "#111827", margin: "0 0 12px", fontSize: 24, fontWeight: 800 }}>¡Mensaje recibido!</h2>
        <p style={{ color: "#6B7280", fontSize: 15, lineHeight: 1.7, margin: 0 }}>
          Gracias por contactarnos. Un asesor se comunicará contigo en breve.
        </p>
      </>
    );
    if (embed) return <div style={{ textAlign: "center", padding: "20px 0" }}>{successContent}</div>;
    return (
      <div style={styles.page}>
        <div style={{ ...styles.card, textAlign: "center" }}>{successContent}</div>
      </div>
    );
  }

  const innerForm = (
    <div style={{ textAlign: "left" }}>
      {!embed && (
        <div style={{ textAlign: "center", marginBottom: 28 }}>
          <div style={{ width: 48, height: 48, borderRadius: 14, background: accent + "22", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px", fontSize: 24 }}>📋</div>
          <h1 style={{ margin: 0, fontSize: 24, fontWeight: 800, color: "#111827" }}>{form.nombre}</h1>
          <p style={{ margin: "8px 0 0", color: "#6B7280", fontSize: 14 }}>Completa el formulario y te contactaremos pronto.</p>
        </div>
      )}

      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        {(paginas[paso] || []).map((campo) => (
          <div key={campo.id}>
            {campo.tipo === "section" ? (
              <div style={{ marginTop: 12, paddingBottom: 6, borderBottom: `1px solid ${accent}40`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: 18, fontWeight: 800, color: "#111827" }}>{campo.etiqueta}</span>
                {paginas.length > 1 && <span style={{ fontSize: 13, fontWeight: 600, color: "#9CA3AF" }}>Paso {paso + 1} de {paginas.length}</span>}
              </div>
            ) : (
              <>
                <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#374151", marginBottom: 6, marginTop: 4 }}>
                  {campo.etiqueta}
                  {campo.req && <span style={{ color: "#EF4444", marginLeft: 4 }}>*</span>}
                </label>
                {campo.tipo === "textarea" ? (
                  <textarea
                    rows={4}
                    value={values[campo.id] || ""}
                    onChange={(e) => setValues((v) => ({ ...v, [campo.id]: e.target.value }))}
                    placeholder={`Ingresa ${campo.etiqueta.toLowerCase()}`}
                    style={styles.input}
                  />
                ) : campo.tipo === "checkbox" ? (
                  <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 14, cursor: "pointer", color: "#374151", userSelect: "none" }}>
                    <input type="checkbox" checked={values[campo.id] === "Sí"} onChange={(e) => setValues((v) => ({ ...v, [campo.id]: e.target.checked ? "Sí" : "No" }))} style={{ width: 18, height: 18, accentColor: accent }} />
                    Sí, acepto
                  </label>
                ) : campo.tipo === "select" ? (
                  <select
                    value={values[campo.id] || ""}
                    onChange={(e) => setValues((v) => ({ ...v, [campo.id]: e.target.value }))}
                    style={styles.input}
                    required={campo.req}
                  >
                    <option value="">Selecciona una opción</option>
                    {(campo.opciones || "").split(",").filter(Boolean).map((o, i) => (
                      <option key={i} value={o.trim()}>{o.trim()}</option>
                    ))}
                  </select>
                ) : (
                  <input
                    type={campo.tipo}
                    value={values[campo.id] || ""}
                    onChange={(e) => setValues((v) => ({ ...v, [campo.id]: e.target.value }))}
                    placeholder={`Ingresa ${campo.etiqueta.toLowerCase()}`}
                    style={styles.input}
                    required={campo.req}
                  />
                )}
              </>
            )}
          </div>
        ))}

        <div style={{ display: "flex", gap: 12, marginTop: 8 }}>
          {paso > 0 && (
            <button
              type="button"
              onClick={() => setPaso(p => p - 1)}
              disabled={enviando}
              style={{
                ...styles.btn,
                flex: "0 0 auto",
                background: "#F3F4F6",
                color: "#374151",
                width: "auto",
                padding: "14px 24px",
              }}
            >
              ← Anterior
            </button>
          )}
          <button
            type="submit"
            disabled={enviando}
            style={{
              ...styles.btn,
              background: enviando ? "#9CA3AF" : accent,
              color: "#fff",
              borderRadius: form.apariencia?.borderRadius ?? 10,
              boxShadow: `0 4px 20px ${accent}44`,
            }}
          >
            {enviando ? "Enviando..." : (paso < paginas.length - 1 ? "Siguiente →" : (form.apariencia?.buttonText || "Enviar →"))}
          </button>
        </div>
      </form>

      {!embed && (form.apariencia?.footerText ?? "🔒 Tus datos están seguros con nosotros. Nunca los compartiremos.") && (
        <p style={{ textAlign: "center", marginTop: 16, fontSize: 12, color: "#9CA3AF" }}>
          {form.apariencia?.footerText ?? "🔒 Tus datos están seguros con nosotros. Nunca los compartiremos."}
        </p>
      )}
    </div>
  );

  if (embed) return innerForm;

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        {innerForm}
      </div>
    </div>
  );
};

const styles = {
  page: {
    minHeight: "100vh",
    background: "linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 50%, #f0fdf4 100%)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
    fontFamily: "Inter, system-ui, sans-serif",
  },
  card: {
    background: "#fff",
    borderRadius: 20,
    padding: 40,
    width: "100%",
    maxWidth: 480,
    boxShadow: "0 25px 60px -12px rgba(0,0,0,0.12)",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
  },
  input: {
    width: "100%",
    padding: "12px 14px",
    border: "1.5px solid #E5E7EB",
    borderRadius: 8,
    fontSize: 15,
    fontFamily: "inherit",
    outline: "none",
    boxSizing: "border-box",
    transition: "border-color .2s",
    color: "#111827",
  },
  btn: {
    width: "100%",
    padding: "14px",
    border: "none",
    borderRadius: 10,
    fontSize: 15,
    fontWeight: 700,
    cursor: "pointer",
    transition: "all .2s",
  }
};
