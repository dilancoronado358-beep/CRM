import { useState, useRef } from "react";
import { T } from "../theme";
import { uid } from "../utils";
import { Btn, Inp, Tarjeta, EncabezadoSeccion, Ico, Sel } from "../components/ui";
import { sb } from "../hooks/useSupaState";

const FIELD_TYPES = [
  { value: "text", label: "Texto Corto" },
  { value: "email", label: "Email" },
  { value: "tel", label: "Teléfono" },
  { value: "number", label: "Número" },
  { value: "textarea", label: "Área de Texto" },
  { value: "select", label: "Desplegable" },
  { value: "checkbox", label: "Casilla" },
  { value: "date", label: "Fecha" },
  { value: "url", label: "Sitio Web" },
];

const DEFAULT_APARIENCIA = {
  accentColor: "#06B6D4",
  bgColor: "#FFFFFF",
  textColor: "#111827",
  fontFamily: "Inter, system-ui, sans-serif",
  borderRadius: 8,
  buttonText: "Enviar →",
  titulo: "",
  subtitulo: "",
  logo: "",
};

export const Formularios = ({ db, setDb }) => {
  const pipelines = db.pipelines || [];

  const [forms, setForms] = useState([
    {
      id: "f1",
      nombre: "Contacto Web Principal",
      pipeline_id: pipelines[0]?.id || "",
      apariencia: { ...DEFAULT_APARIENCIA },
      campos: [
        { id: "c1", tipo: "text", etiqueta: "Nombre Completo", req: true, opciones: "" },
        { id: "c2", tipo: "email", etiqueta: "Correo Electrónico", req: true, opciones: "" },
        { id: "c3", tipo: "textarea", etiqueta: "Mensaje", req: false, opciones: "" },
      ],
    },
  ]);
  const [activo, setActivo] = useState(forms[0]);
  const [tab, setTab] = useState("campos"); // campos | apariencia | config
  const [dragging, setDragging] = useState(null);
  const [dragOver, setDragOver] = useState(null);
  const dragNode = useRef(null);

  const updateActivo = (upd) => {
    const nv = { ...activo, ...upd };
    setForms((p) => p.map((x) => (x.id === activo.id ? nv : x)));
    setActivo(nv);
  };
  const updateApariencia = (upd) =>
    updateActivo({ apariencia: { ...activo.apariencia, ...upd } });

  const addCampo = () => {
    updateActivo({
      campos: [
        ...activo.campos,
        { id: "c" + uid(), tipo: "text", etiqueta: "Nuevo Campo", req: false, opciones: "" },
      ],
    });
  };
  const delCampo = (id) =>
    updateActivo({ campos: activo.campos.filter((c) => c.id !== id) });
  const upCampo = (id, k, v) =>
    updateActivo({ campos: activo.campos.map((c) => (c.id === id ? { ...c, [k]: v } : c)) });

  // Drag to reorder
  const handleDragStart = (e, idx) => {
    setDragging(idx);
    dragNode.current = e.target;
    setTimeout(() => { if (dragNode.current) dragNode.current.style.opacity = "0.4"; }, 0);
  };
  const handleDragEnter = (idx) => setDragOver(idx);
  const handleDragEnd = () => {
    if (dragging !== null && dragOver !== null && dragging !== dragOver) {
      const newCampos = [...activo.campos];
      const [removed] = newCampos.splice(dragging, 1);
      newCampos.splice(dragOver, 0, removed);
      updateActivo({ campos: newCampos });
    }
    if (dragNode.current) dragNode.current.style.opacity = "1";
    setDragging(null);
    setDragOver(null);
    dragNode.current = null;
  };

  const moveField = (idx, dir) => {
    const newCampos = [...activo.campos];
    const target = idx + dir;
    if (target < 0 || target >= newCampos.length) return;
    [newCampos[idx], newCampos[target]] = [newCampos[target], newCampos[idx]];
    updateActivo({ campos: newCampos });
  };

  const BASE_URL = "https://crm.ensing.lat";

  const copiarLink = () => {
    const url = `${BASE_URL}/#/f/${activo.id}`;
    navigator.clipboard.writeText(url);
    alert(`✅ Link copiado!\n\n${url}`);
  };

  const guardarFormulario = async () => {
    const { error } = await sb.from("formularios_publicos").upsert({
      id: activo.id,
      nombre: activo.nombre,
      color: activo.apariencia.accentColor,
      campos: activo.campos,
      apariencia: activo.apariencia,
      pipeline_id: activo.pipeline_id,
      created_at: new Date().toISOString(),
    });
    if (error) {
      alert("⚠️ Error al guardar en Supabase. Datos guardados localmente.\n" + error.message);
    } else {
      alert(`✅ Formulario guardado!\n\nLink público:\n${BASE_URL}/#/f/${activo.id}`);
    }
  };

  const A = activo.apariencia || DEFAULT_APARIENCIA;
  const selectedPipeline = pipelines.find((p) => p.id === activo.pipeline_id);

  // ─── RENDER ────────────────────────────────────────────────────────────────
  return (
    <div style={{ display: "flex", gap: 0, height: "calc(100vh - 120px)", overflow: "hidden" }}>
      {/* ── PANEL IZQUIERDO ── */}
      <div style={{ width: 380, display: "flex", flexDirection: "column", borderRight: `1px solid ${T.borderHi}`, flexShrink: 0 }}>
        <div style={{ padding: "16px 20px", borderBottom: `1px solid ${T.borderHi}` }}>
          <div style={{ fontSize: 17, fontWeight: 800, color: T.white, marginBottom: 4 }}>📋 Form Builder</div>
          <div style={{ fontSize: 12, color: T.whiteDim }}>Crea formularios que capturan leads reales</div>
          <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
            <Btn variant="secundario" size="sm" onClick={copiarLink}><Ico k="link" size={13} /> Link</Btn>
            <Btn size="sm" onClick={guardarFormulario} style={{ background: T.teal, color: "#000" }}><Ico k="check" size={13} /> Guardar</Btn>
          </div>
        </div>

        {/* TABS */}
        <div style={{ display: "flex", borderBottom: `1px solid ${T.borderHi}` }}>
          {[["campos", "Campos"], ["apariencia", "Diseño"], ["config", "Config"]].map(([k, label]) => (
            <button key={k} onClick={() => setTab(k)} style={{ flex: 1, padding: "10px 0", background: "transparent", border: "none", color: tab === k ? T.teal : T.whiteDim, fontWeight: tab === k ? 700 : 500, fontSize: 12, cursor: "pointer", borderBottom: `2px solid ${tab === k ? T.teal : "transparent"}`, transition: "all .15s" }}>
              {label}
            </button>
          ))}
        </div>

        <div style={{ flex: 1, overflowY: "auto", padding: "16px" }}>
          {/* ── TAB: CAMPOS ── */}
          {tab === "campos" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <div style={{ fontSize: 12, color: T.whiteDim, textAlign: "center", marginBottom: 4 }}>
                Arrastra los campos para reordernarlos
              </div>

              {activo.campos.map((c, idx) => (
                <div key={c.id}
                  draggable
                  onDragStart={(e) => handleDragStart(e, idx)}
                  onDragEnter={() => handleDragEnter(idx)}
                  onDragEnd={handleDragEnd}
                  onDragOver={(e) => e.preventDefault()}
                  style={{
                    background: dragOver === idx ? T.tealSoft : T.bg2,
                    border: `1px solid ${dragOver === idx ? T.teal : T.borderHi}`,
                    borderRadius: 10, padding: 14, cursor: "grab",
                    transition: "all .15s",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                    <span style={{ color: T.whiteDim, fontSize: 16, cursor: "grab", userSelect: "none" }}>⠿</span>
                    <Inp value={c.etiqueta} onChange={(e) => upCampo(c.id, "etiqueta", e.target.value)} style={{ flex: 1, fontWeight: 600, fontSize: 13 }} />
                    <Sel value={c.tipo} onChange={(e) => upCampo(c.id, "tipo", e.target.value)} style={{ width: 120, fontSize: 12 }}>
                      {FIELD_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                    </Sel>
                  </div>

                  {c.tipo === "select" && (
                    <div style={{ marginBottom: 8 }}>
                      <div style={{ fontSize: 11, color: T.whiteDim, marginBottom: 4 }}>Opciones (separadas por coma)</div>
                      <Inp value={c.opciones || ""} onChange={(e) => upCampo(c.id, "opciones", e.target.value)} placeholder="Opción 1, Opción 2, Opción 3" style={{ fontSize: 12 }} />
                    </div>
                  )}

                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: T.whiteDim, cursor: "pointer" }}>
                      <input type="checkbox" checked={c.req} onChange={(e) => upCampo(c.id, "req", e.target.checked)} style={{ accentColor: T.teal }} />
                      {c.req ? "Obligatorio" : "Opcional"}
                    </label>
                    <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
                      <button onClick={() => moveField(idx, -1)} disabled={idx === 0} style={{ background: "transparent", border: `1px solid ${T.borderHi}`, color: T.whiteDim, cursor: "pointer", borderRadius: 4, padding: "2px 6px", fontSize: 12 }}>↑</button>
                      <button onClick={() => moveField(idx, 1)} disabled={idx === activo.campos.length - 1} style={{ background: "transparent", border: `1px solid ${T.borderHi}`, color: T.whiteDim, cursor: "pointer", borderRadius: 4, padding: "2px 6px", fontSize: 12 }}>↓</button>
                      <button onClick={() => delCampo(c.id)} style={{ background: "transparent", border: "none", color: T.red, cursor: "pointer", fontSize: 11, fontWeight: 700, padding: "2px 6px" }}>✕</button>
                    </div>
                  </div>
                </div>
              ))}

              <button onClick={addCampo} style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, padding: "12px", background: "transparent", border: `2px dashed ${T.borderHi}`, borderRadius: 10, color: T.teal, fontWeight: 700, fontSize: 13, cursor: "pointer", width: "100%", transition: "all .15s" }}>
                <Ico k="plus" size={14} /> Añadir Campo
              </button>
            </div>
          )}

          {/* ── TAB: APARIENCIA ── */}
          {tab === "apariencia" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
              <div>
                <div style={{ fontSize: 12, fontWeight: 700, color: T.whiteDim, textTransform: "uppercase", letterSpacing: ".08em", marginBottom: 10 }}>Textos</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  <div>
                    <label style={{ fontSize: 11, color: T.whiteDim, display: "block", marginBottom: 4 }}>Nombre del Formulario</label>
                    <Inp value={activo.nombre} onChange={(e) => updateActivo({ nombre: e.target.value })} style={{ fontWeight: 700 }} />
                  </div>
                  <div>
                    <label style={{ fontSize: 11, color: T.whiteDim, display: "block", marginBottom: 4 }}>Subtítulo</label>
                    <Inp value={A.subtitulo || ""} onChange={(e) => updateApariencia({ subtitulo: e.target.value })} placeholder="Texto opcional debajo del título" />
                  </div>
                  <div>
                    <label style={{ fontSize: 11, color: T.whiteDim, display: "block", marginBottom: 4 }}>Texto del Botón</label>
                    <Inp value={A.buttonText || "Enviar →"} onChange={(e) => updateApariencia({ buttonText: e.target.value })} />
                  </div>
                </div>
              </div>

              <div>
                <div style={{ fontSize: 12, fontWeight: 700, color: T.whiteDim, textTransform: "uppercase", letterSpacing: ".08em", marginBottom: 10 }}>Colores</div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  {[
                    { key: "accentColor", label: "Color Principal" },
                    { key: "bgColor", label: "Fondo" },
                    { key: "textColor", label: "Color Texto" },
                  ].map(({ key, label }) => (
                    <div key={key}>
                      <label style={{ fontSize: 11, color: T.whiteDim, display: "block", marginBottom: 4 }}>{label}</label>
                      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                        <input type="color" value={A[key] || "#06B6D4"} onChange={(e) => updateApariencia({ [key]: e.target.value })}
                          style={{ width: 36, height: 32, border: "none", borderRadius: 6, cursor: "pointer", background: "transparent" }} />
                        <span style={{ fontSize: 12, color: T.whiteDim, fontFamily: "monospace" }}>{A[key]}</span>
                      </div>
                    </div>
                  ))}
                  <div>
                    <label style={{ fontSize: 11, color: T.whiteDim, display: "block", marginBottom: 4 }}>Radio Bordes</label>
                    <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                      <input type="range" min="0" max="24" value={A.borderRadius || 8} onChange={(e) => updateApariencia({ borderRadius: parseInt(e.target.value) })} style={{ flex: 1, accentColor: T.teal }} />
                      <span style={{ fontSize: 12, color: T.whiteDim }}>{A.borderRadius || 8}px</span>
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <div style={{ fontSize: 12, fontWeight: 700, color: T.whiteDim, textTransform: "uppercase", letterSpacing: ".08em", marginBottom: 10 }}>Fuente</div>
                <Sel value={A.fontFamily || "Inter, system-ui, sans-serif"} onChange={(e) => updateApariencia({ fontFamily: e.target.value })}>
                  <option value="Inter, system-ui, sans-serif">Inter (Moderna)</option>
                  <option value="'Georgia', serif">Georgia (Clásica)</option>
                  <option value="'Montserrat', sans-serif">Montserrat (Elegante)</option>
                  <option value="'Courier New', monospace">Courier New (Técnica)</option>
                  <option value="'Poppins', sans-serif">Poppins (Amigable)</option>
                </Sel>
              </div>
            </div>
          )}

          {/* ── TAB: CONFIG ── */}
          {tab === "config" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
              <div>
                <div style={{ fontSize: 12, fontWeight: 700, color: T.whiteDim, textTransform: "uppercase", letterSpacing: ".08em", marginBottom: 10 }}>Destino de Leads</div>
                <div style={{ marginBottom: 8, fontSize: 13, color: T.white }}>Pipeline donde irán los leads capturados:</div>
                <Sel value={activo.pipeline_id || ""} onChange={(e) => updateActivo({ pipeline_id: e.target.value })}>
                  <option value="">Sin pipeline asignado</option>
                  {pipelines.map((p) => (
                    <option key={p.id} value={p.id}>{p.nombre}</option>
                  ))}
                </Sel>
                {selectedPipeline && (
                  <div style={{ marginTop: 8, padding: "8px 12px", background: T.tealSoft, borderRadius: 8, border: `1px solid ${T.teal}30`, fontSize: 12, color: T.teal }}>
                    ✅ Los leads entrarán en "{selectedPipeline.etapas?.[0]?.nombre || "Primera etapa"}" de {selectedPipeline.nombre}
                  </div>
                )}
              </div>

              <div>
                <div style={{ fontSize: 12, fontWeight: 700, color: T.whiteDim, textTransform: "uppercase", letterSpacing: ".08em", marginBottom: 10 }}>Link Público</div>
                <div style={{ padding: 12, background: T.bg2, borderRadius: 8, border: `1px solid ${T.borderHi}`, fontFamily: "monospace", fontSize: 12, color: T.teal, wordBreak: "break-all", marginBottom: 8 }}>
                  {BASE_URL}/#/f/{activo.id}
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <Btn variant="secundario" size="sm" onClick={copiarLink} style={{ flex: 1 }}><Ico k="link" size={13} /> Copiar</Btn>
                  <Btn variant="secundario" size="sm" onClick={() => window.open(`${BASE_URL}/#/f/${activo.id}`, "_blank")} style={{ flex: 1 }}><Ico k="eye" size={13} /> Abrir</Btn>
                </div>
              </div>

              <div>
                <div style={{ fontSize: 12, fontWeight: 700, color: T.whiteDim, textTransform: "uppercase", letterSpacing: ".08em", marginBottom: 10 }}>Código de Inserción (Embed)</div>
                <div style={{ padding: 12, background: T.bg2, borderRadius: 8, border: `1px solid ${T.borderHi}`, fontFamily: "monospace", fontSize: 11, color: T.whiteDim, wordBreak: "break-all" }}>
                  {`<iframe src="${BASE_URL}/#/f/${activo.id}" width="100%" height="600" frameborder="0"></iframe>`}
                </div>
                <button onClick={() => navigator.clipboard.writeText(`<iframe src="${BASE_URL}/#/f/${activo.id}" width="100%" height="600" frameborder="0"></iframe>`)}
                  style={{ marginTop: 8, background: "transparent", border: `1px solid ${T.borderHi}`, color: T.whiteDim, borderRadius: 6, padding: "6px 12px", fontSize: 11, cursor: "pointer", width: "100%" }}>
                  Copiar código embed
                </button>
              </div>

              <div>
                <div style={{ fontSize: 12, fontWeight: 700, color: T.whiteDim, textTransform: "uppercase", letterSpacing: ".08em", marginBottom: 10 }}>Formularios</div>
                {forms.map((f) => (
                  <div key={f.id} onClick={() => setActivo(f)} style={{ padding: "10px 12px", background: activo.id === f.id ? T.tealSoft : T.bg2, border: `1px solid ${activo.id === f.id ? T.teal : T.borderHi}`, borderRadius: 8, cursor: "pointer", marginBottom: 6, fontSize: 13, fontWeight: 600, color: activo.id === f.id ? T.teal : T.white }}>
                    {f.nombre}
                  </div>
                ))}
                <button onClick={() => {
                  const nf = { id: "f" + uid(), nombre: "Nuevo Formulario", pipeline_id: pipelines[0]?.id || "", apariencia: { ...DEFAULT_APARIENCIA }, campos: [{ id: "c" + uid(), tipo: "text", etiqueta: "Nombre Completo", req: true }] };
                  setForms((p) => [...p, nf]);
                  setActivo(nf);
                }} style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, padding: "10px", background: "transparent", border: `2px dashed ${T.borderHi}`, borderRadius: 8, color: T.teal, fontWeight: 700, fontSize: 12, cursor: "pointer", width: "100%" }}>
                  <Ico k="plus" size={13} /> Nuevo Formulario
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── PREVIEW ── */}
      <div style={{ flex: 1, background: `repeating-linear-gradient(45deg, ${T.bg0}, ${T.bg0} 10px, ${T.bg1} 10px, ${T.bg1} 20px)`, display: "flex", flexDirection: "column", overflow: "hidden" }}>
        {/* Preview header */}
        <div style={{ height: 44, background: T.bg1, borderBottom: `1px solid ${T.borderHi}`, display: "flex", alignItems: "center", padding: "0 16px", gap: 12, flexShrink: 0 }}>
          <div style={{ display: "flex", gap: 6 }}>
            {["#EF4444", "#F59E0B", "#10B981"].map((c, i) => <div key={i} style={{ width: 11, height: 11, borderRadius: "50%", background: c }} />)}
          </div>
          <div style={{ flex: 1, background: T.bg2, height: 24, borderRadius: 6, display: "flex", alignItems: "center", padding: "0 10px", fontSize: 11, color: T.whiteDim, maxWidth: 380, margin: "0 auto", gap: 6 }}>
            <Ico k="lock" size={9} /> {BASE_URL}/#/f/{activo.id}
          </div>
          <Btn size="sm" onClick={() => window.open(`${BASE_URL}/#/f/${activo.id}`, "_blank")} style={{ fontSize: 11 }}>
            <Ico k="eye" size={11} /> Preview Real
          </Btn>
        </div>

        {/* Form preview */}
        <div style={{ flex: 1, overflowY: "auto", display: "flex", alignItems: "flex-start", justifyContent: "center", padding: 32 }}>
          <div style={{
            background: A.bgColor || "#FFFFFF",
            borderRadius: 20,
            padding: 36,
            width: "100%",
            maxWidth: 460,
            boxShadow: "0 25px 60px -12px rgba(0,0,0,0.25)",
            fontFamily: A.fontFamily || "Inter, system-ui, sans-serif",
            color: A.textColor || "#111827",
          }}>
            {/* Form header */}
            <div style={{ textAlign: "center", marginBottom: 28 }}>
              <div style={{ width: 48, height: 48, borderRadius: 14, background: (A.accentColor || "#06B6D4") + "22", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px", fontSize: 22 }}>📋</div>
              <h2 style={{ margin: "0 0 8px", fontSize: 22, fontWeight: 800, color: A.textColor || "#111827" }}>{activo.nombre}</h2>
              {A.subtitulo && <p style={{ margin: 0, fontSize: 14, color: "#6B7280" }}>{A.subtitulo}</p>}
            </div>

            {/* Fields */}
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              {activo.campos.map((c) => (
                <div key={c.id}>
                  <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: A.textColor || "#374151", marginBottom: 6 }}>
                    {c.etiqueta} {c.req && <span style={{ color: "#EF4444" }}>*</span>}
                  </label>
                  {c.tipo === "textarea" ? (
                    <textarea rows={3} readOnly placeholder={`Ingresa ${c.etiqueta.toLowerCase()}`} style={{ width: "100%", padding: "11px 14px", border: `1.5px solid #E5E7EB`, borderRadius: A.borderRadius || 8, fontSize: 14, fontFamily: A.fontFamily, boxSizing: "border-box", resize: "vertical", color: "#111827" }} />
                  ) : c.tipo === "select" ? (
                    <select disabled style={{ width: "100%", padding: "11px 14px", border: `1.5px solid #E5E7EB`, borderRadius: A.borderRadius || 8, fontSize: 14, fontFamily: A.fontFamily, boxSizing: "border-box", background: "#fff", color: "#6B7280" }}>
                      <option>Selecciona una opción</option>
                      {(c.opciones || "").split(",").filter(Boolean).map((o, i) => <option key={i}>{o.trim()}</option>)}
                    </select>
                  ) : c.tipo === "checkbox" ? (
                    <label style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 14, color: A.textColor || "#374151", cursor: "pointer" }}>
                      <input type="checkbox" style={{ accentColor: A.accentColor, width: 16, height: 16 }} /> Sí, acepto
                    </label>
                  ) : (
                    <input type={c.tipo} readOnly placeholder={`Ingresa ${c.etiqueta.toLowerCase()}`} style={{ width: "100%", padding: "11px 14px", border: `1.5px solid #E5E7EB`, borderRadius: A.borderRadius || 8, fontSize: 14, fontFamily: A.fontFamily, boxSizing: "border-box", color: "#111827" }} />
                  )}
                </div>
              ))}

              <button style={{
                width: "100%", padding: "14px", marginTop: 6,
                background: A.accentColor || "#06B6D4", color: "#fff",
                border: "none", borderRadius: A.borderRadius || 8,
                fontSize: 15, fontWeight: 700, cursor: "pointer",
                boxShadow: `0 6px 20px ${A.accentColor || "#06B6D4"}44`,
                fontFamily: A.fontFamily,
              }}>
                {A.buttonText || "Enviar →"}
              </button>
            </div>

            <p style={{ textAlign: "center", marginTop: 16, fontSize: 12, color: "#9CA3AF" }}>
              🔒 Datos seguros · Nunca los compartiremos
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
