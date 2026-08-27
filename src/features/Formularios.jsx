import { useState, useEffect, useRef } from "react";
import { T } from "../theme";
import { uid, uuid } from "../utils";
import { Btn, Inp, Ico, Sel, ConfirmModal } from "../components/ui";
import { sileo as toast } from "../utils/sileo";
import { checkPlanLimit, getPlanLimitError } from "../utils/planes";

const FIELD_TYPES = [
  { value: "text", label: "Texto Corto", icon: "type" },
  { value: "email", label: "Email", icon: "mail" },
  { value: "tel", label: "Teléfono", icon: "phone" },
  { value: "number", label: "Número", icon: "hash" },
  { value: "textarea", label: "Área de Texto", icon: "align-left" },
  { value: "select", label: "Desplegable", icon: "list" },
  { value: "checkbox", label: "Casilla", icon: "check-square" },
  { value: "url", label: "Sitio Web", icon: "link" },
  { value: "date", label: "Fecha", icon: "calendar" },
  { value: "section", label: "Sección", icon: "layout" },
];

const DEFAULT_FORM = () => ({
  id: uuid(),
  nombre: "Nuevo Formulario Premium",
  pipeline_id: "",
  apariencia: {
    accentColor: "#6366f1",
    bgColor: "rgba(255, 255, 255, 0.8)",
    textColor: "#1f2937",
    fontFamily: "'Inter', sans-serif",
    borderRadius: 16,
    buttonText: "Enviar →",
    subtitulo: "Déjanos tus datos y te contactaremos.",
    footerText: "🔒 Datos protegidos bajo estrictas normas de seguridad",
    theme: "glass", // solid, glass, dark
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
  const [activeFieldId, setActiveFieldId] = useState(null);
  const dragRef = useRef(null);

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
      setLoading(false);
    }
  }, [db.formularios_publicos]);

  const activo = forms.find((f) => f.id === activoId) || null;

  const updateActivo = (upd) => setForms((prev) => prev.map((f) => f.id === activoId ? { ...f, ...upd } : f));
  const updateApariencia = (upd) => updateActivo({ apariencia: { ...(activo?.apariencia || {}), ...upd } });

  const addCampo = (tipo = "text") => {
    if (!activo) return;
    const nc = { id: "c" + uid(), tipo, etiqueta: "Nuevo Campo", req: false, opciones: "" };
    updateActivo({ campos: [...activo.campos, nc] });
    setActiveFieldId(nc.id);
  };
  const delCampo = (id) => updateActivo({ campos: activo.campos.filter((c) => c.id !== id) });
  const upCampo = (id, k, v) => updateActivo({ campos: activo.campos.map((c) => (c.id === id ? { ...c, [k]: v } : c)) });

  const onDragStart = (e, idx) => {
    setDragging(idx);
    dragRef.current = e.currentTarget;
    setTimeout(() => { if (dragRef.current) dragRef.current.style.opacity = "0.4"; }, 0);
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

  const guardar = async () => {
    if (!activo) return;
    setSaving(true);
    const payload = {
      id: activo.id, nombre: activo.nombre, color: activo.apariencia?.accentColor || "#6366f1",
      campos: activo.campos || [], apariencia: activo.apariencia || {}, pipeline_id: activo.pipeline_id || null,
    };
    const { error } = await guardarEnSupa("formularios_publicos", payload);
    setSaving(false);
    if (error) toast.error("Error al guardar: " + error.message);
    else {
      toast.success("¡Formulario guardado!", {
        description: `Link público actualizado.`,
        action: { label: "Copiar Link", onClick: () => navigator.clipboard.writeText(`${BASE_URL}/#/f/${activo.id}`) }
      });
    }
  };

  const nuevoFormulario = async () => {
    const nf = DEFAULT_FORM();
    const { error } = await guardarEnSupa("formularios_publicos", {
      id: nf.id, nombre: nf.nombre, color: "#6366f1", campos: nf.campos, apariencia: nf.apariencia, pipeline_id: null,
    });
    if (!error) { setForms((p) => [...p, nf]); setActivoId(nf.id); setTab("campos"); }
  };

  const confirmEliminar = async () => {
    if (!idToDelete) return;
    await eliminarDeSupa("formularios_publicos", idToDelete);
    const remaining = forms.filter((f) => f.id !== idToDelete);
    setForms(remaining);
    setActivoId(remaining[0]?.id || null);
    toast.success("Formulario eliminado");
    setIdToDelete(null);
  };

  if (loading) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", gap: 16, color: T.whiteDim }}>
      <div style={{ width: 24, height: 24, border: `2px solid ${T.tealSoft}`, borderTopColor: T.teal, borderRadius: "50%", animation: "spin 1s linear infinite" }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      Preparando el estudio...
    </div>
  );

  const A = activo?.apariencia || {};
  const selectedPipeline = pipelines.find((p) => p.id === activo?.pipeline_id);

  return (
    <div style={{ display: "flex", height: "calc(100vh - 120px)", overflow: "hidden", background: T.bg0, fontFamily: "'Inter', sans-serif" }}>
      {/* PANEL IZQUIERDO (BUILDER) */}
      <div style={{ width: 420, display: "flex", flexDirection: "column", background: T.bg1, borderRight: `1px solid ${T.borderHi}`, flexShrink: 0, zIndex: 10, boxShadow: "4px 0 24px rgba(0,0,0,0.2)" }}>
        
        {/* HEADER */}
        <div style={{ padding: "20px 24px", borderBottom: `1px solid ${T.borderHi}`, flexShrink: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
            <div style={{ width: 32, height: 32, borderRadius: 10, background: "linear-gradient(135deg, #6366f1, #a855f7)", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: 16 }}>✨</div>
            <div>
              <div style={{ fontSize: 18, fontWeight: 800, color: T.white, letterSpacing: "-0.02em" }}>Form Studio</div>
              <div style={{ fontSize: 12, color: T.whiteDim }}>Creador de experiencias premium</div>
            </div>
          </div>
          
          <div style={{ marginTop: 20, marginBottom: 12 }}>
            <div style={{ display: "flex", gap: 8, overflowX: "auto", paddingBottom: 4, scrollbarWidth: "none" }}>
              {forms.map((f) => (
                <button key={f.id} onClick={() => setActivoId(f.id)} style={{ padding: "8px 16px", borderRadius: 12, border: `1px solid ${activoId === f.id ? "#6366f1" : T.borderHi}`, background: activoId === f.id ? "rgba(99, 102, 241, 0.1)" : T.bg2, color: activoId === f.id ? "#818cf8" : T.whiteDim, fontSize: 13, fontWeight: activoId === f.id ? 600 : 400, cursor: "pointer", whiteSpace: "nowrap", transition: "all 0.2s" }}>
                  {f.nombre}
                </button>
              ))}
              <button onClick={() => { if(!checkPlanLimit(db, "formularios")) return toast.error(getPlanLimitError("formularios")); nuevoFormulario(); }} style={{ padding: "8px 16px", borderRadius: 12, border: `1px dashed ${T.borderHi}`, background: "transparent", color: T.whiteDim, fontSize: 13, cursor: "pointer", whiteSpace: "nowrap", transition: "all 0.2s" }}>
                + Nuevo
              </button>
            </div>
          </div>

          <div style={{ display: "flex", gap: 8 }}>
            <Btn variant="secundario" size="sm" onClick={() => navigator.clipboard.writeText(`${BASE_URL}/#/f/${activo?.id}`)} style={{ flex: 1, borderRadius: 10 }}>🔗 Copiar Link</Btn>
            <Btn size="sm" onClick={guardar} style={{ flex: 1, background: "linear-gradient(135deg, #6366f1, #8b5cf6)", color: "#fff", border: "none", borderRadius: 10, boxShadow: "0 4px 12px rgba(99, 102, 241, 0.3)" }} disabled={saving}>
              {saving ? "Guardando..." : "Guardar Cambios"}
            </Btn>
            {activo && <button onClick={() => setIdToDelete(activo.id)} style={{ background: "transparent", border: `1px solid rgba(239, 68, 68, 0.2)`, color: "#ef4444", borderRadius: 10, padding: "0 12px", fontSize: 14, cursor: "pointer", transition: "all 0.2s" }}>🗑</button>}
          </div>
        </div>

        {/* TABS */}
        <div style={{ display: "flex", padding: "0 12px", borderBottom: `1px solid ${T.borderHi}`, flexShrink: 0 }}>
          {[["campos", "🎨 Campos"], ["apariencia", "✨ Diseño"], ["config", "⚙️ Ajustes"]].map(([k, lbl]) => (
            <button key={k} onClick={() => setTab(k)} style={{ flex: 1, padding: "16px 0", background: "transparent", border: "none", color: tab === k ? "#818cf8" : T.whiteDim, fontWeight: tab === k ? 700 : 500, fontSize: 13, cursor: "pointer", borderBottom: `2px solid ${tab === k ? "#6366f1" : "transparent"}`, transition: "all 0.2s" }}>
              {lbl}
            </button>
          ))}
        </div>

        {/* CONTENT */}
        <div style={{ flex: 1, overflowY: "auto", padding: 24 }}>
          {!activo ? (
            <div style={{ textAlign: "center", color: T.whiteDim, fontSize: 14, marginTop: 60 }}>Selecciona o crea un formulario</div>
          ) : (<>

            {/* CAMPOS */}
            {tab === "campos" && (
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {activo.campos.map((c, idx) => {
                  const isActive = activeFieldId === c.id;
                  const isDragOver = dragOver === idx;
                  const fieldDef = FIELD_TYPES.find(t => t.value === c.tipo) || FIELD_TYPES[0];
                  
                  return (
                    <div key={c.id} draggable onDragStart={(e) => onDragStart(e, idx)} onDragEnter={() => setDragOver(idx)} onDragEnd={onDragEnd} onDragOver={(e) => e.preventDefault()}
                      style={{ background: isDragOver ? "rgba(99, 102, 241, 0.1)" : (isActive ? T.bg2 : "transparent"), border: `1px solid ${isActive ? "#6366f1" : T.borderHi}`, borderRadius: 12, padding: 16, transition: "all .2s", cursor: isActive ? "default" : "pointer" }}
                      onClick={() => !isActive && setActiveFieldId(c.id)}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                        <div style={{ cursor: "grab", color: T.whiteDim, padding: "4px", margin: "-4px" }}>⠿</div>
                        <div style={{ width: 32, height: 32, borderRadius: 8, background: T.bg1, border: `1px solid ${T.borderHi}`, display: "flex", alignItems: "center", justifyContent: "center", color: T.whiteDim }}>
                          <Ico k={fieldDef.icon} size={14} />
                        </div>
                        <div style={{ flex: 1, fontWeight: 600, color: T.white, fontSize: 14 }}>{c.etiqueta}</div>
                        {c.req && <div style={{ fontSize: 10, background: "rgba(239, 68, 68, 0.1)", color: "#ef4444", padding: "2px 6px", borderRadius: 4, fontWeight: 700 }}>REQ</div>}
                        <button onClick={(e) => { e.stopPropagation(); delCampo(c.id); }} style={{ background: "none", border: "none", color: T.whiteDim, cursor: "pointer", padding: 4 }}>✕</button>
                      </div>

                      {/* EDIT PANEL */}
                      {isActive && (
                        <div style={{ marginTop: 16, paddingTop: 16, borderTop: `1px dashed ${T.borderHi}`, display: "flex", flexDirection: "column", gap: 12, animation: "fadeIn 0.2s" }}>
                          <div>
                            <div style={lblStyle}>Etiqueta del Campo</div>
                            <Inp value={c.etiqueta} onChange={(e) => upCampo(c.id, "etiqueta", e.target.value)} style={inpStyle} />
                          </div>
                          <div style={{ display: "flex", gap: 12 }}>
                            <div style={{ flex: 1 }}>
                              <div style={lblStyle}>Tipo de Campo</div>
                              <Sel value={c.tipo} onChange={(e) => upCampo(c.id, "tipo", e.target.value)} style={inpStyle}>
                                {FIELD_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                              </Sel>
                            </div>
                            {c.tipo !== "section" && (
                              <div style={{ display: "flex", alignItems: "flex-end", paddingBottom: 8 }}>
                                <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: T.white, cursor: "pointer" }}>
                                  <input type="checkbox" checked={!!c.req} onChange={(e) => upCampo(c.id, "req", e.target.checked)} style={{ width: 16, height: 16, accentColor: "#6366f1" }} />
                                  Obligatorio
                                </label>
                              </div>
                            )}
                          </div>
                          {c.tipo === "select" && (
                            <div>
                              <div style={lblStyle}>Opciones (separadas por coma)</div>
                              <Inp value={c.opciones || ""} onChange={(e) => upCampo(c.id, "opciones", e.target.value)} placeholder="Ej: Opción 1, Opción 2" style={inpStyle} />
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
                
                <div style={{ marginTop: 12, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                  <button onClick={() => addCampo("text")} style={addBtnStyle}><Ico k="type" size={14} /> + Texto</button>
                  <button onClick={() => addCampo("email")} style={addBtnStyle}><Ico k="mail" size={14} /> + Email</button>
                  <button onClick={() => addCampo("select")} style={addBtnStyle}><Ico k="list" size={14} /> + Lista</button>
                  <button onClick={() => addCampo("section")} style={{ ...addBtnStyle, gridColumn: "span 2" }}><Ico k="layout" size={14} /> + Añadir Sección</button>
                </div>
              </div>
            )}

            {/* APARIENCIA */}
            {tab === "apariencia" && (
              <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
                <Section title="Textos Generales">
                  <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                    <div><div style={lblStyle}>Título del Formulario</div><Inp value={activo.nombre} onChange={(e) => updateActivo({ nombre: e.target.value })} style={inpStyle} /></div>
                    <div><div style={lblStyle}>Subtítulo</div><Inp value={A.subtitulo || ""} onChange={(e) => updateApariencia({ subtitulo: e.target.value })} style={inpStyle} placeholder="Ej: Te responderemos pronto" /></div>
                    <div><div style={lblStyle}>Texto del Botón</div><Inp value={A.buttonText || "Enviar"} onChange={(e) => updateApariencia({ buttonText: e.target.value })} style={inpStyle} /></div>
                    <div><div style={lblStyle}>Nota al Pie (Seguridad)</div><Inp value={A.footerText ?? ""} onChange={(e) => updateApariencia({ footerText: e.target.value })} style={inpStyle} placeholder="Dejar en blanco para ocultar" /></div>
                  </div>
                </Section>
                
                <Section title="Estilo Visual">
                  <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                    <div>
                      <div style={lblStyle}>Tema Global</div>
                      <div style={{ display: "flex", gap: 8 }}>
                        {[{v:"glass",l:"Glassmorphism"},{v:"solid",l:"Sólido Claro"},{v:"dark",l:"Sólido Oscuro"}].map(t => (
                          <button key={t.v} onClick={() => updateApariencia({ theme: t.v, bgColor: t.v==="dark"?"#111827":t.v==="solid"?"#ffffff":"rgba(255,255,255,0.7)", textColor: t.v==="dark"?"#f3f4f6":"#1f2937" })} style={{ flex: 1, padding: "10px", borderRadius: 8, background: A.theme === t.v ? "rgba(99, 102, 241, 0.15)" : T.bg2, border: `1px solid ${A.theme === t.v ? "#6366f1" : T.borderHi}`, color: A.theme === t.v ? "#818cf8" : T.white, fontSize: 12, fontWeight: 600, cursor: "pointer", transition: "all 0.2s" }}>{t.l}</button>
                        ))}
                      </div>
                    </div>
                    
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                      <div>
                        <div style={lblStyle}>Color Principal</div>
                        <div style={{ display: "flex", alignItems: "center", gap: 8, background: T.bg2, padding: "4px 12px", borderRadius: 8, border: `1px solid ${T.borderHi}` }}>
                          <input type="color" value={A.accentColor || "#6366f1"} onChange={(e) => updateApariencia({ accentColor: e.target.value })} style={{ width: 24, height: 24, border: "none", background: "transparent", cursor: "pointer", padding: 0 }} />
                          <span style={{ fontSize: 13, color: T.white, fontFamily: "monospace" }}>{A.accentColor || "#6366f1"}</span>
                        </div>
                      </div>
                      <div>
                        <div style={lblStyle}>Redondeo (Bordes)</div>
                        <div style={{ display: "flex", alignItems: "center", gap: 12, height: 34 }}>
                          <input type="range" min="0" max="32" value={A.borderRadius ?? 16} onChange={(e) => updateApariencia({ borderRadius: +e.target.value })} style={{ flex: 1, accentColor: "#6366f1" }} />
                          <span style={{ fontSize: 13, color: T.white, width: 30 }}>{A.borderRadius ?? 16}px</span>
                        </div>
                      </div>
                    </div>

                    <div>
                      <div style={lblStyle}>Tipografía</div>
                      <Sel value={A.fontFamily || "'Inter', sans-serif"} onChange={(e) => updateApariencia({ fontFamily: e.target.value })} style={inpStyle}>
                        <option value="'Inter', sans-serif">Inter (Moderna & Limpia)</option>
                        <option value="'Outfit', sans-serif">Outfit (Geométrica)</option>
                        <option value="'Playfair Display', serif">Playfair (Elegante)</option>
                        <option value="'Space Grotesk', sans-serif">Space Grotesk (Tech)</option>
                      </Sel>
                    </div>
                  </div>
                </Section>
              </div>
            )}

            {/* CONFIG */}
            {tab === "config" && (
              <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
                <Section title="Destino de Leads">
                  <div style={lblStyle}>¿A qué Pipeline irán los contactos capturados?</div>
                  <Sel value={activo.pipeline_id || ""} onChange={(e) => updateActivo({ pipeline_id: e.target.value })} style={inpStyle}>
                    <option value="">-- Solo guardar en Contactos --</option>
                    {pipelines.map((p) => <option key={p.id} value={p.id}>{p.nombre}</option>)}
                  </Sel>
                  {selectedPipeline && (
                    <div style={{ marginTop: 12, padding: "12px", background: "rgba(16, 185, 129, 0.1)", borderRadius: 8, border: `1px solid rgba(16, 185, 129, 0.2)`, display: "flex", gap: 10, alignItems: "flex-start" }}>
                      <div style={{ color: "#10b981", marginTop: 2 }}>⚡</div>
                      <div>
                        <div style={{ color: "#10b981", fontSize: 13, fontWeight: 700 }}>Automatización Activa</div>
                        <div style={{ color: "rgba(16, 185, 129, 0.8)", fontSize: 12, marginTop: 2 }}>Se creará un Deal en "{selectedPipeline.etapas?.[0]?.nombre || "Primera etapa"}" por cada envío.</div>
                      </div>
                    </div>
                  )}
                </Section>

                <Section title="Compartir & Embed">
                  <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                    <div>
                      <div style={lblStyle}>Link Público Válido</div>
                      <div style={{ display: "flex", gap: 8 }}>
                        <div style={{ flex: 1, padding: "10px 12px", background: T.bg2, borderRadius: 8, border: `1px solid ${T.borderHi}`, fontSize: 12, color: "#818cf8", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {BASE_URL}/#/f/{activo.id}
                        </div>
                        <Btn onClick={() => navigator.clipboard.writeText(`${BASE_URL}/#/f/${activo.id}`)} style={{ background: T.bg2, color: T.white, border: `1px solid ${T.borderHi}` }}>Copiar</Btn>
                      </div>
                    </div>
                    <div>
                      <div style={lblStyle}>Código Iframe para tu Web</div>
                      <textarea readOnly value={`<iframe src="${BASE_URL}/#/f/${activo.id}" width="100%" height="600" frameborder="0" style="border:none; background:transparent;"></iframe>`} rows={3} style={{ ...inpStyle, fontFamily: "monospace", fontSize: 11, color: T.whiteDim, resize: "none" }} />
                    </div>
                  </div>
                </Section>
              </div>
            )}
          </>)}
        </div>
      </div>

      {/* ── CANVAS DE PREVISUALIZACIÓN (PREMIUM) ── */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", position: "relative", overflow: "hidden", background: "#f3f4f6" }}>
        
        {/* Fondo decorativo (Mesh Gradient) */}
        <div style={{ position: "absolute", top: -100, left: -100, width: "70%", height: "70%", background: A.accentColor ? `${A.accentColor}33` : "rgba(99, 102, 241, 0.2)", filter: "blur(100px)", borderRadius: "50%", zIndex: 0, transition: "all 0.5s ease" }} />
        <div style={{ position: "absolute", bottom: -100, right: -100, width: "60%", height: "60%", background: "rgba(168, 85, 247, 0.2)", filter: "blur(100px)", borderRadius: "50%", zIndex: 0 }} />

        {/* Topbar Preview */}
        <div style={{ height: 48, background: "rgba(255,255,255,0.6)", backdropFilter: "blur(12px)", borderBottom: "1px solid rgba(0,0,0,0.05)", display: "flex", alignItems: "center", padding: "0 20px", gap: 16, zIndex: 10 }}>
          <div style={{ display: "flex", gap: 6 }}>{["#ef4444", "#f59e0b", "#10b981"].map((c, i) => <div key={i} style={{ width: 12, height: 12, borderRadius: "50%", background: c, boxShadow: "inset 0 1px 2px rgba(0,0,0,0.1)" }} />)}</div>
          <div style={{ flex: 1, display: "flex", justifyContent: "center" }}>
            <div style={{ background: "rgba(255,255,255,0.8)", padding: "4px 16px", borderRadius: 12, fontSize: 12, color: "#6b7280", fontWeight: 500, border: "1px solid rgba(0,0,0,0.05)", display: "flex", alignItems: "center", gap: 6, boxShadow: "0 2px 4px rgba(0,0,0,0.02)" }}>
              <Ico k="lock" size={10} /> form.ensin.com/f/{activo?.id?.substring(0,8)}...
            </div>
          </div>
          <a href={`${BASE_URL}/#/f/${activo?.id}`} target="_blank" rel="noreferrer" style={{ textDecoration: "none", fontSize: 12, fontWeight: 700, color: "#6366f1", display: "flex", alignItems: "center", gap: 4 }}>
            Ver Real <Ico k="external-link" size={12} />
          </a>
        </div>

        {/* Scrollable Container */}
        <div style={{ flex: 1, overflowY: "auto", display: "flex", padding: "40px 20px", zIndex: 1 }}>
          {activo && (
            <div style={{ margin: "auto", width: "100%", maxWidth: 480 }}>
              
              {/* EL FORMULARIO EN SÍ */}
              <div style={{ 
                background: A.bgColor || "rgba(255, 255, 255, 0.8)",
                backdropFilter: A.theme === "glass" ? "blur(20px)" : "none",
                borderRadius: A.borderRadius ?? 16, 
                padding: "40px 32px", 
                boxShadow: A.theme === "dark" ? "0 25px 50px -12px rgba(0,0,0,0.5)" : "0 20px 40px -10px rgba(0,0,0,0.1), 0 10px 20px -15px rgba(0,0,0,0.05)",
                border: A.theme === "glass" ? "1px solid rgba(255,255,255,0.5)" : "none",
                fontFamily: A.fontFamily || "'Inter', sans-serif",
                color: A.textColor || "#1f2937",
                transition: "all 0.3s ease"
              }}>
                
                {/* Cabecera */}
                <div style={{ textAlign: "center", marginBottom: 32 }}>
                  <h2 style={{ margin: "0 0 8px", fontSize: 26, fontWeight: 800, letterSpacing: "-0.02em", lineHeight: 1.2 }}>{activo.nombre}</h2>
                  {A.subtitulo && <p style={{ margin: 0, fontSize: 15, opacity: 0.7, lineHeight: 1.5 }}>{A.subtitulo}</p>}
                </div>

                {/* Campos */}
                <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
                  {activo.campos.map((c) => (
                    <div key={c.id}>
                      {c.tipo === "section" ? (
                        <div style={{ marginTop: 16, paddingBottom: 8, borderBottom: `2px solid ${A.accentColor || "#6366f1"}33` }}>
                          <span style={{ fontSize: 18, fontWeight: 700, color: A.accentColor || "#6366f1" }}>{c.etiqueta}</span>
                        </div>
                      ) : (
                        <>
                          <label style={{ display: "block", fontSize: 13, fontWeight: 600, marginBottom: 8, opacity: 0.9 }}>
                            {c.etiqueta} {c.req && <span style={{ color: "#ef4444" }}>*</span>}
                          </label>
                          {c.tipo === "textarea" ? (
                            <textarea rows={3} readOnly placeholder={`Escribe tu ${c.etiqueta.toLowerCase()}...`} style={getPreviewInputStyle(A)} />
                          ) : c.tipo === "select" ? (
                            <div style={{ position: "relative" }}>
                              <select disabled style={{ ...getPreviewInputStyle(A), appearance: "none" }}>
                                <option>Seleccionar opción</option>
                                {(c.opciones || "").split(",").filter(Boolean).map((o, i) => <option key={i}>{o.trim()}</option>)}
                              </select>
                              <div style={{ position: "absolute", right: 14, top: 14, pointerEvents: "none", opacity: 0.5 }}>▼</div>
                            </div>
                          ) : c.tipo === "checkbox" ? (
                            <label style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 14, cursor: "pointer", opacity: 0.9 }}>
                              <input type="checkbox" style={{ width: 18, height: 18, accentColor: A.accentColor || "#6366f1", borderRadius: 4 }} /> 
                              Sí, acepto las condiciones
                            </label>
                          ) : (
                            <input type={c.tipo} readOnly placeholder={`Ingresa ${c.etiqueta.toLowerCase()}...`} style={getPreviewInputStyle(A)} />
                          )}
                        </>
                      )}
                    </div>
                  ))}

                  {/* Botón */}
                  <button style={{ width: "100%", padding: "16px", marginTop: 12, background: A.accentColor || "#6366f1", color: "#ffffff", border: "none", borderRadius: Math.min(A.borderRadius ?? 16, 12), fontSize: 15, fontWeight: 700, cursor: "pointer", boxShadow: `0 8px 16px ${A.accentColor || "#6366f1"}40`, transition: "transform 0.2s, box-shadow 0.2s" }}>
                    {A.buttonText || "Enviar Formulario"}
                  </button>
                </div>

                {/* Footer */}
                {(A.footerText) && (
                  <div style={{ textAlign: "center", marginTop: 24, paddingTop: 20, borderTop: `1px solid ${A.textColor}15` }}>
                    <p style={{ margin: 0, fontSize: 12, opacity: 0.6, display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
                      {A.footerText}
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      <ConfirmModal open={!!idToDelete} onClose={() => setIdToDelete(null)} onConfirm={confirmEliminar} title="¿Eliminar Formulario?" description="Esta acción es irreversible." confirmText="Eliminar" variant="danger" />
    </div>
  );
};

// ── Helpers & Styles ─────────────────────────────────────────────────────────

const Section = ({ title, children }) => (
  <div>
    <div style={{ fontSize: 11, fontWeight: 800, color: T.white, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 12 }}>{title}</div>
    {children}
  </div>
);

const lblStyle = { fontSize: 12, fontWeight: 600, color: T.whiteDim, marginBottom: 6 };
const inpStyle = { width: "100%", padding: "10px 12px", background: T.bg0, border: `1px solid ${T.borderHi}`, borderRadius: 8, color: T.white, fontSize: 13, outline: "none", boxSizing: "border-box", transition: "border 0.2s" };
const addBtnStyle = { padding: "12px", background: "transparent", border: `1px dashed ${T.borderHi}`, borderRadius: 12, color: T.white, fontSize: 13, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, transition: "all 0.2s" };

const getPreviewInputStyle = (A) => ({
  width: "100%", 
  padding: "14px 16px", 
  background: A.theme === "dark" ? "rgba(0,0,0,0.2)" : "rgba(255,255,255,0.9)", 
  border: A.theme === "glass" ? "1px solid rgba(255,255,255,0.4)" : `1px solid ${A.theme === "dark" ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)"}`, 
  borderRadius: Math.min(A.borderRadius ?? 16, 12), 
  fontSize: 15, 
  fontFamily: "inherit", 
  color: "inherit", 
  outline: "none", 
  boxSizing: "border-box",
  boxShadow: "inset 0 2px 4px rgba(0,0,0,0.02)"
});
