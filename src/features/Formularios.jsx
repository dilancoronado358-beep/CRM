import { useState, useEffect, useRef } from "react";
import { T } from "../theme";
import { uid, uuid } from "../utils";
import { Btn, Inp, Tarjeta, EncabezadoSeccion, Ico, Sel, Modal, Campo, ConfirmModal } from "../components/ui";
import { sb } from "../hooks/useSupaState";
import { sileo as toast } from "../utils/sileo";

const FIELD_TYPES = [
  { value: "text", label: "Texto Corto" },
  { value: "email", label: "Email" },
  { value: "tel", label: "Teléfono" },
  { value: "number", label: "Número" },
  { value: "textarea", label: "Área de Texto" },
  { value: "select", label: "Desplegable" },
  { value: "checkbox", label: "Casilla" },
  { value: "url", label: "Sitio Web" },
  { value: "section", label: "Sección (Título/Separación)" },
];

const DEFAULT_FORM = () => ({
  id: uuid(),
  nombre: "Nuevo Formulario",
  pipeline_id: "",
  apariencia: {
    accentColor: "#06B6D4",
    bgColor: "#FFFFFF",
    textColor: "#111827",
    fontFamily: "Inter, system-ui, sans-serif",
    borderRadius: 8,
    buttonText: "Enviar →",
    subtitulo: "",
    footerText: "🔒 Tus datos están seguros con nosotros",
  },
  campos: [
    { id: "c1x", tipo: "text", etiqueta: "Nombre Completo", req: true, opciones: "" },
    { id: "c2x", tipo: "email", etiqueta: "Correo Electrónico", req: true, opciones: "" },
    { id: "c3x", tipo: "textarea", etiqueta: "Mensaje", req: false, opciones: "" },
  ],
});

const BASE_URL = window.location.origin;

export const Formularios = ({ db, guardarEnSupa, eliminarDeSupa }) => {
  const pipelines = db.pipelines || [];
  const [forms, setForms] = useState([]);
  const [activoId, setActivoId] = useState(null);
  const [tab, setTab] = useState("campos");
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [dragging, setDragging] = useState(null);
  const [dragOver, setDragOver] = useState(null);
  const [idToDelete, setIdToDelete] = useState(null);
  const dragRef = useRef(null);

  // ── Load from state ───────────────────────────────────────────────────────
  useEffect(() => {
    if (db.formularios_publicos) {
      const parsed = db.formularios_publicos.map((f) => ({
        ...f,
        campos: Array.isArray(f.campos) ? f.campos : JSON.parse(f.campos || "[]"),
        apariencia: typeof f.apariencia === "object" && f.apariencia !== null
          ? f.apariencia
          : JSON.parse(f.apariencia || "{}"),
      }));
      setForms(parsed);
      if (parsed.length > 0 && !activoId) setActivoId(parsed[0].id);
      setLoading(false);
    } else {
      // Seed fallback if absolutely no data
      setLoading(false);
    }
  }, [db.formularios_publicos]);

  const activo = forms.find((f) => f.id === activoId) || null;

  const updateActivo = (upd) => {
    setForms((prev) => prev.map((f) => f.id === activoId ? { ...f, ...upd } : f));
  };
  const updateApariencia = (upd) =>
    updateActivo({ apariencia: { ...(activo?.apariencia || {}), ...upd } });

  const addCampo = () => {
    if (!activo) return;
    updateActivo({
      campos: [...activo.campos, { id: "c" + uid(), tipo: "text", etiqueta: "Nuevo Campo", req: false, opciones: "" }],
    });
  };
  const delCampo = (id) => updateActivo({ campos: activo.campos.filter((c) => c.id !== id) });
  const upCampo = (id, k, v) =>
    updateActivo({ campos: activo.campos.map((c) => (c.id === id ? { ...c, [k]: v } : c)) });

  // Drag reorder
  const onDragStart = (e, idx) => {
    setDragging(idx);
    dragRef.current = e.currentTarget;
    requestAnimationFrame(() => { if (dragRef.current) dragRef.current.style.opacity = "0.4"; });
  };
  const onDragEnd = () => {
    if (dragging !== null && dragOver !== null && dragging !== dragOver) {
      const arr = [...(activo?.campos || [])];
      const [r] = arr.splice(dragging, 1);
      arr.splice(dragOver, 0, r);
      updateActivo({ campos: arr });
    }
    if (dragRef.current) dragRef.current.style.opacity = "1";
    setDragging(null); setDragOver(null); dragRef.current = null;
  };
  const moveField = (idx, dir) => {
    const arr = [...(activo?.campos || [])];
    const t = idx + dir;
    if (t < 0 || t >= arr.length) return;
    [arr[idx], arr[t]] = [arr[t], arr[idx]];
    updateActivo({ campos: arr });
  };

  // ── Save to Supabase ───────────────────────────────────────────────────────
  const guardar = async () => {
    if (!activo) return;
    setSaving(true);
    const payload = {
      id: activo.id,
      nombre: activo.nombre,
      color: activo.apariencia?.accentColor || "#06B6D4",
      campos: activo.campos || [],
      apariencia: activo.apariencia || {},
      pipeline_id: activo.pipeline_id || null,
    };
    const { error } = await guardarEnSupa("formularios_publicos", payload);
    setSaving(false);
    if (error) {
      toast.error("Error al guardar: " + error.message);
    } else {
      toast.success("¡Formulario guardado!", {
        description: `Link público: ${BASE_URL}/#/f/${activo.id}`,
        action: {
          label: "Copiar Link",
          onClick: () => {
            navigator.clipboard.writeText(`${BASE_URL}/#/f/${activo.id}`);
            toast.success("Link copiado al portapapeles");
          }
        }
      });
    }
  };

  const nuevoFormulario = async () => {
    const nf = DEFAULT_FORM();
    const { error } = await guardarEnSupa("formularios_publicos", {
      id: nf.id, nombre: nf.nombre, color: "#06B6D4", campos: nf.campos, apariencia: nf.apariencia, pipeline_id: null,
    });
    if (!error) {
      setForms((p) => [...p, nf]);
      setActivoId(nf.id);
      setTab("campos");
    }
  };

  const eliminarFormulario = (id) => setIdToDelete(id);

  const confirmEliminar = async () => {
    if (!idToDelete) return;
    await eliminarDeSupa("formularios_publicos", idToDelete);
    const error = null; // eliminarDeSupa handles UI updates via setDb
    if (error) {
      toast.error("Error al eliminar: " + error.message);
    } else {
      const remaining = forms.filter((f) => f.id !== idToDelete);
      setForms(remaining);
      setActivoId(remaining[0]?.id || null);
      toast.success("Formulario eliminado correctamente");
    }
    setIdToDelete(null);
  };

  const copiarLink = () => {
    if (!activo) return;
    const url = `${BASE_URL}/#/f/${activo.id}`;
    navigator.clipboard.writeText(url);
    toast.success("Link copiado", { description: url });
  };

  if (loading) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", gap: 16, color: T.whiteDim }}>
      <div style={{ width: 24, height: 24, border: `2px solid ${T.tealSoft}`, borderTopColor: T.teal, borderRadius: "50%", animation: "spin 1s linear infinite" }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      Cargando formularios...
    </div>
  );

  const A = activo?.apariencia || {};
  const selectedPipeline = pipelines.find((p) => p.id === activo?.pipeline_id);

  return (
    <div style={{ display: "flex", height: "calc(100vh - 120px)", overflow: "hidden" }}>
      {/* ── Panel izquierdo ── */}
      <div style={{ width: 370, display: "flex", flexDirection: "column", borderRight: `1px solid ${T.borderHi}`, flexShrink: 0, overflow: "hidden" }}>
        {/* Header */}
        <div style={{ padding: "14px 16px", borderBottom: `1px solid ${T.borderHi}`, flexShrink: 0 }}>
          <div style={{ fontSize: 16, fontWeight: 800, color: T.white, marginBottom: 2 }}>📋 Form Builder</div>
          <div style={{ fontSize: 11, color: T.whiteDim, marginBottom: 10 }}>Formularios que capturan leads reales</div>
          {/* Form selector */}
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 10 }}>
            {forms.map((f) => (
              <button key={f.id} onClick={() => setActivoId(f.id)} style={{ padding: "4px 10px", borderRadius: 6, border: `1px solid ${activoId === f.id ? T.teal : T.borderHi}`, background: activoId === f.id ? T.tealSoft : T.bg2, color: activoId === f.id ? T.teal : T.whiteDim, fontSize: 11, fontWeight: activoId === f.id ? 700 : 400, cursor: "pointer" }}>
                {f.nombre}
              </button>
            ))}
            <button onClick={nuevoFormulario} style={{ padding: "4px 10px", borderRadius: 6, border: `1px dashed ${T.teal}`, background: "transparent", color: T.teal, fontSize: 11, cursor: "pointer" }}>+ Nuevo</button>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <Btn variant="secundario" size="sm" onClick={copiarLink} style={{ flex: 1 }}><Ico k="link" size={12} /> Copiar Link</Btn>
            <Btn size="sm" onClick={guardar} style={{ flex: 1, background: T.teal, color: "#000" }} disabled={saving}>
              {saving ? "Guardando..." : <><Ico k="check" size={12} /> Guardar</>}
            </Btn>
            {activo && <button onClick={() => eliminarFormulario(activo.id)} style={{ background: "transparent", border: `1px solid ${T.red}40`, color: T.red, borderRadius: 6, padding: "4px 8px", fontSize: 11, cursor: "pointer" }}>🗑</button>}
          </div>
        </div>

        {/* Tabs */}
        <div style={{ display: "flex", borderBottom: `1px solid ${T.borderHi}`, flexShrink: 0 }}>
          {[["campos", "Campos"], ["apariencia", "Diseño"], ["config", "Config"]].map(([k, lbl]) => (
            <button key={k} onClick={() => setTab(k)} style={{ flex: 1, padding: "9px 0", background: "transparent", border: "none", color: tab === k ? T.teal : T.whiteDim, fontWeight: tab === k ? 700 : 400, fontSize: 11, cursor: "pointer", borderBottom: `2px solid ${tab === k ? T.teal : "transparent"}` }}>
              {lbl}
            </button>
          ))}
        </div>

        {/* Tab content */}
        <div style={{ flex: 1, overflowY: "auto", padding: 14 }}>
          {!activo ? (
            <div style={{ textAlign: "center", color: T.whiteDim, fontSize: 13, paddingTop: 40 }}>Crea un formulario para empezar</div>
          ) : (<>

            {/* CAMPOS */}
            {tab === "campos" && (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <div style={{ fontSize: 11, color: T.whiteDim, textAlign: "center", marginBottom: 4 }}>Arrastra ⠿ para reordenar</div>
                {activo.campos.map((c, idx) => (
                  <div key={c.id}
                    draggable
                    onDragStart={(e) => onDragStart(e, idx)}
                    onDragEnter={() => setDragOver(idx)}
                    onDragEnd={onDragEnd}
                    onDragOver={(e) => e.preventDefault()}
                    style={{ background: dragOver === idx ? T.tealSoft : T.bg2, border: `1px solid ${dragOver === idx ? T.teal : T.borderHi}`, borderRadius: 10, padding: 12, transition: "all .1s" }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
                      <span style={{ color: T.whiteDim, cursor: "grab", fontSize: 14, userSelect: "none" }}>⠿</span>
                      <Inp value={c.etiqueta} onChange={(e) => upCampo(c.id, "etiqueta", e.target.value)} style={{ flex: 1, fontWeight: 600, fontSize: 13 }} />
                      <Sel value={c.tipo} onChange={(e) => upCampo(c.id, "tipo", e.target.value)} style={{ width: 120, fontSize: 12 }}>
                        {FIELD_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                      </Sel>
                    </div>
                    {c.tipo === "select" && (
                      <div style={{ marginBottom: 6 }}>
                        <div style={{ fontSize: 10, color: T.whiteDim, marginBottom: 3 }}>Opciones (separadas por coma)</div>
                        <Inp value={c.opciones || ""} onChange={(e) => upCampo(c.id, "opciones", e.target.value)} placeholder="Sí, No, Tal vez" style={{ fontSize: 12 }} />
                      </div>
                    )}
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 4 }}>
                      <div style={{ visibility: c.tipo === "section" ? "hidden" : "visible" }}>
                        <label style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11, color: T.whiteDim, cursor: "pointer" }}>
                          <input type="checkbox" checked={!!c.req} onChange={(e) => upCampo(c.id, "req", e.target.checked)} style={{ accentColor: T.teal }} />
                          {c.req ? "Obligatorio" : "Opcional"}
                        </label>
                      </div>
                      <div style={{ display: "flex", gap: 3 }}>
                        <button onClick={() => moveField(idx, -1)} disabled={idx === 0} style={btnSm}>↑</button>
                        <button onClick={() => moveField(idx, 1)} disabled={idx === activo.campos.length - 1} style={btnSm}>↓</button>
                        <button onClick={() => delCampo(c.id)} style={{ ...btnSm, color: T.red, borderColor: T.red + "40" }}>✕</button>
                      </div>
                    </div>
                  </div>
                ))}
                <button onClick={addCampo} style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6, padding: "11px", background: "transparent", border: `2px dashed ${T.borderHi}`, borderRadius: 10, color: T.teal, fontWeight: 700, fontSize: 12, cursor: "pointer", width: "100%" }}>
                  <Ico k="plus" size={13} /> Añadir Campo
                </button>
              </div>
            )}

            {/* APARIENCIA */}
            {tab === "apariencia" && (
              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                <Section label="Textos">
                  <Row label="Nombre del formulario"><Inp value={activo.nombre} onChange={(e) => updateActivo({ nombre: e.target.value })} style={{ fontWeight: 700 }} /></Row>
                  <Row label="Subtítulo"><Inp value={A.subtitulo || ""} onChange={(e) => updateApariencia({ subtitulo: e.target.value })} placeholder="Texto debajo del título" /></Row>
                  <Row label="Texto del botón"><Inp value={A.buttonText || "Enviar →"} onChange={(e) => updateApariencia({ buttonText: e.target.value })} /></Row>
                  <Row label="Texto Inferior (Seguridad)"><Inp value={A.footerText ?? "🔒 Tus datos están seguros con nosotros"} onChange={(e) => updateApariencia({ footerText: e.target.value })} placeholder="Dejar en blanco para ocultar" /></Row>
                </Section>
                <Section label="Colores">
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                    {[["accentColor", "Color Principal"], ["bgColor", "Fondo"], ["textColor", "Color Texto"]].map(([k, lbl]) => (
                      <div key={k}>
                        <div style={{ fontSize: 10, color: T.whiteDim, marginBottom: 4 }}>{lbl}</div>
                        <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                          <input type="color" value={A[k] || "#06B6D4"} onChange={(e) => updateApariencia({ [k]: e.target.value })} style={{ width: 32, height: 30, border: "none", borderRadius: 6, cursor: "pointer", background: "transparent" }} />
                          <span style={{ fontSize: 11, color: T.whiteDim, fontFamily: "monospace" }}>{A[k]}</span>
                        </div>
                      </div>
                    ))}
                    <div>
                      <div style={{ fontSize: 10, color: T.whiteDim, marginBottom: 4 }}>Radio Bordes</div>
                      <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                        <input type="range" min="0" max="24" value={A.borderRadius ?? 8} onChange={(e) => updateApariencia({ borderRadius: +e.target.value })} style={{ flex: 1, accentColor: T.teal }} />
                        <span style={{ fontSize: 11, color: T.whiteDim }}>{A.borderRadius ?? 8}px</span>
                      </div>
                    </div>
                  </div>
                </Section>
                <Section label="Fuente">
                  <Sel value={A.fontFamily || "Inter, system-ui, sans-serif"} onChange={(e) => updateApariencia({ fontFamily: e.target.value })}>
                    <option value="Inter, system-ui, sans-serif">Inter (Moderna)</option>
                    <option value="Georgia, serif">Georgia (Clásica)</option>
                    <option value="'Courier New', monospace">Courier (Técnica)</option>
                    <option value="'Poppins', sans-serif">Poppins (Amigable)</option>
                  </Sel>
                </Section>
              </div>
            )}

            {/* CONFIG */}
            {tab === "config" && (
              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                <Section label="Pipeline destino">
                  <Sel value={activo.pipeline_id || ""} onChange={(e) => updateActivo({ pipeline_id: e.target.value })}>
                    <option value="">Sin pipeline asignado</option>
                    {pipelines.map((p) => <option key={p.id} value={p.id}>{p.nombre}</option>)}
                  </Sel>
                  {selectedPipeline && (
                    <div style={{ marginTop: 6, padding: "6px 10px", background: T.tealSoft, borderRadius: 6, border: `1px solid ${T.teal}30`, fontSize: 11, color: T.teal }}>
                      ✅ Leads entran en "{selectedPipeline.etapas?.[0]?.nombre || "Primera etapa"}"
                    </div>
                  )}
                </Section>
                <Section label="Link Público">
                  <div style={{ padding: "10px 12px", background: T.bg2, borderRadius: 8, fontFamily: "monospace", fontSize: 11, color: T.teal, wordBreak: "break-all", marginBottom: 8 }}>
                    {BASE_URL}/#/f/{activo.id}
                  </div>
                  <div style={{ display: "flex", gap: 6 }}>
                    <Btn variant="secundario" size="sm" onClick={copiarLink} style={{ flex: 1 }}>Copiar</Btn>
                    <Btn variant="secundario" size="sm" onClick={() => window.open(`${BASE_URL}/#/f/${activo.id}`, "_blank")} style={{ flex: 1 }}>Abrir ↗</Btn>
                  </div>
                </Section>
                <Section label="Código Embed">
                  <div style={{ padding: "8px 10px", background: T.bg2, borderRadius: 6, fontFamily: "monospace", fontSize: 10, color: T.whiteDim, wordBreak: "break-all" }}>
                    {`<iframe src="${BASE_URL}/#/f/${activo.id}" width="100%" height="600" frameborder="0"></iframe>`}
                  </div>
                  <button onClick={() => navigator.clipboard.writeText(`<iframe src="${BASE_URL}/#/f/${activo.id}" width="100%" height="600" frameborder="0"></iframe>`)} style={{ marginTop: 6, ...btnFull }}>Copiar embed</button>
                </Section>
              </div>
            )}
          </>)}
        </div>
      </div>

      {/* ── PREVIEW ── */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", background: `repeating-linear-gradient(45deg, ${T.bg0}, ${T.bg0} 10px, ${T.bg1} 10px, ${T.bg1} 20px)` }}>
        <div style={{ height: 40, background: T.bg1, borderBottom: `1px solid ${T.borderHi}`, display: "flex", alignItems: "center", padding: "0 14px", gap: 8, flexShrink: 0 }}>
          <div style={{ display: "flex", gap: 5 }}>{["#EF4444", "#F59E0B", "#10B981"].map((c, i) => <div key={i} style={{ width: 10, height: 10, borderRadius: "50%", background: c }} />)}</div>
          <div style={{ flex: 1, background: T.bg2, height: 22, borderRadius: 6, display: "flex", alignItems: "center", padding: "0 10px", fontSize: 10, color: T.whiteDim, maxWidth: 350, margin: "0 auto", gap: 4, border: `1px solid ${T.borderHi}` }}>
            <div style={{ flex: 1, display: "flex", alignItems: "center", gap: 4, overflow: "hidden" }}>
              <Ico k="lock" size={8} /> 
              <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{BASE_URL}/#/f/{activo?.id}</span>
            </div>
            <button 
              onClick={() => { navigator.clipboard.writeText(`${BASE_URL}/#/f/${activo?.id}`); toast.success("Copiado"); }}
              style={{ background: "none", border: "none", color: T.teal, cursor: "pointer", display: "flex", alignItems: "center", padding: "0 4px" }}
              title="Copiar Link"
            >
              <Ico k="copy" size={10} />
            </button>
          </div>
          <Btn size="sm" onClick={() => activo && window.open(`${BASE_URL}/#/f/${activo.id}`, "_blank")} style={{ fontSize: 10 }}>↗ Ver Real</Btn>
        </div>
        <div style={{ flex: 1, overflowY: "auto", display: "flex", alignItems: "flex-start", justifyContent: "center", padding: 24 }}>
          {activo && (
            <div style={{ background: A.bgColor || "#FFFFFF", borderRadius: 20, padding: 36, width: "100%", maxWidth: 440, boxShadow: "0 25px 60px rgba(0,0,0,0.25)", fontFamily: A.fontFamily || "Inter, system-ui, sans-serif", color: A.textColor || "#111827" }}>
              <div style={{ textAlign: "center", marginBottom: 24 }}>
                <div style={{ width: 46, height: 46, borderRadius: 12, background: (A.accentColor || "#06B6D4") + "22", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 14px", fontSize: 22 }}>📋</div>
                <h2 style={{ margin: "0 0 6px", fontSize: 20, fontWeight: 800, color: A.textColor || "#111827" }}>{activo.nombre}</h2>
                {A.subtitulo && <p style={{ margin: 0, fontSize: 13, color: "#6B7280" }}>{A.subtitulo}</p>}
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                {activo.campos.map((c) => (
                  <div key={c.id}>
                    {c.tipo === "section" ? (
                      <div style={{ marginTop: 12, paddingBottom: 6, borderBottom: `1px solid ${A.accentColor || "#06B6D4"}40` }}>
                        <span style={{ fontSize: 16, fontWeight: 800, color: A.textColor || "#111827" }}>{c.etiqueta}</span>
                      </div>
                    ) : (
                      <>
                        <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: A.textColor || "#374151", marginBottom: 5, marginTop: 4 }}>
                          {c.etiqueta} {c.req && <span style={{ color: "#EF4444" }}>*</span>}
                        </label>
                        {c.tipo === "textarea" ? (
                          <textarea rows={3} readOnly placeholder={`Ingresa ${c.etiqueta.toLowerCase()}`} style={{ ...previewInput, borderRadius: A.borderRadius ?? 8 }} />
                        ) : c.tipo === "select" ? (
                          <select disabled style={{ ...previewInput, borderRadius: A.borderRadius ?? 8 }}>
                            <option>Selecciona una opción</option>
                            {(c.opciones || "").split(",").filter(Boolean).map((o, i) => <option key={i}>{o.trim()}</option>)}
                          </select>
                        ) : c.tipo === "checkbox" ? (
                          <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, cursor: "pointer" }}>
                            <input type="checkbox" style={{ accentColor: A.accentColor, width: 15, height: 15 }} /> Sí, acepto
                          </label>
                        ) : (
                          <input type={c.tipo} readOnly placeholder={`Ingresa ${c.etiqueta.toLowerCase()}`} style={{ ...previewInput, borderRadius: A.borderRadius ?? 8 }} />
                        )}
                      </>
                    )}
                  </div>
                ))}
                <button style={{ width: "100%", padding: "13px", marginTop: 4, background: A.accentColor || "#06B6D4", color: "#fff", border: "none", borderRadius: A.borderRadius ?? 8, fontSize: 14, fontWeight: 700, cursor: "pointer", boxShadow: `0 6px 20px ${A.accentColor || "#06B6D4"}44` }}>
                  {A.buttonText || "Enviar →"}
                </button>
              </div>
              {(A.footerText ?? "🔒 Tus datos están seguros con nosotros") && (
                <p style={{ textAlign: "center", marginTop: 14, fontSize: 11, color: "#9CA3AF" }}>{A.footerText ?? "🔒 Tus datos están seguros con nosotros"}</p>
              )}
            </div>
          )}
        </div>
      </div>
      {/* CONFIRMACION ELIMINAR */}
      <ConfirmModal
        open={!!idToDelete}
        onClose={() => setIdToDelete(null)}
        onConfirm={confirmEliminar}
        title="¿Eliminar Formulario?"
        description="Esta acción borrará permanentemente el formulario y todos sus datos."
        confirmText="Eliminar Permanentemente"
        variant="danger"
      />
    </div>
  );
};

// ── Helpers ─────────────────────────────────────────────────────────────────
const Section = ({ label, children }) => (
  <div>
    <div style={{ fontSize: 10, fontWeight: 700, color: "#6B7280", textTransform: "uppercase", letterSpacing: ".1em", marginBottom: 8 }}>{label}</div>
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>{children}</div>
  </div>
);
const Row = ({ label, children }) => (
  <div>
    <div style={{ fontSize: 10, color: "#6B7280", marginBottom: 3 }}>{label}</div>
    {children}
  </div>
);
const btnSm = { background: "transparent", border: "1px solid #374151", color: "#9CA3AF", cursor: "pointer", borderRadius: 4, padding: "2px 6px", fontSize: 11 };
const btnFull = { background: "transparent", border: "1px solid #374151", color: "#9CA3AF", borderRadius: 6, padding: "6px 12px", fontSize: 11, cursor: "pointer", width: "100%" };
const previewInput = { width: "100%", padding: "10px 12px", border: "1.5px solid #E5E7EB", fontSize: 13, fontFamily: "inherit", boxSizing: "border-box", color: "#111827", background: "#fff", outline: "none" };
