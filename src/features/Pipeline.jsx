import { useState, useEffect } from "react";
import { T } from "../theme";
import { uid, money, fdate, getApiUrl } from "../utils";
import { Chip, Btn, Inp, Sel, LocalInput } from "../components/ui";
import { Campo, Modal, Tarjeta, SelColor, EncabezadoSeccion, ControlSegmentado, Ico, Barra, Vacio, MenuDatos } from "../components/ui";
import { BulkImport } from "../components/BulkImport";
import { sileo } from "../utils/sileo";
import { exportToExcel } from "../utils/export";
import { LeadTimeline } from "./LeadTimeline";
import { Cotizaciones } from "./Cotizaciones";

import { executeRules } from "../automationRunner";

const calculateLeadScore = (db, deal) => {
  let score = 0;
  if (!db || !deal) return 0;
  const contacto = db.contactos?.find(c => c.id === deal.contacto_id);

  if (deal.valor > 0) score += 20;
  if (contacto?.telefono) score += 15;
  if (contacto?.email) score += 10;
  if (deal.empresa_id || deal.empresa) score += 15;

  const acts = (db.actividades || []).filter(a => a.deal_id === deal.id);
  if (acts.length > 0) score += 20;
  if (acts.length > 2) score += 10;

  const waMsgs = (db.whatsapp_messages || []).filter(m => m.deal_id === deal.id);
  if (waMsgs.length > 0) score += 10;

  return Math.min(100, score);
};

const FormDeal = ({ db, setDb, f, setF, editDeal, onGuardar, onCancelar, guardarEnSupa, ejecutarAutomaciones, setModulo, setShowConfigCampos, focusEmailId, setFocusEmailId }) => {
  const customFieldsDef = db.campos_personalizados || [];
  const [rightTab, setRightTab] = useState("timeline");
  const [dragActive, setDragActive] = useState(false);

  const plActual = db.pipelines?.find(p => p.id === f.pipeline_id);
  const stages = plActual?.etapas || [];
  const currentEtIdx = stages.findIndex(s => s.id === f.etapa_id);

  const selContacto = db.contactos?.find(c => c.id === f.contacto_id);

  const handleDrop = e => {
    e.preventDefault(); setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const nuevos = Array.from(e.dataTransfer.files).map(file => ({
        id: "f" + uid(), nombre: file.name, size: (file.size / 1024).toFixed(1) + " KB", tipo: file.type.includes("image") ? "img" : "doc", url: file.type.includes("image") ? URL.createObjectURL(file) : null
      }));
      setF(p => ({ ...p, archivos: [...(p.archivos || []), ...nuevos] }));
    }
  };

  const quitarArchivo = id => setF(p => ({ ...p, archivos: p.archivos.filter(a => a.id !== id) }));

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 32, minHeight: 850, padding: 24, background: T.bg0, borderRadius: 28, color: T.white }}>
      {/* ENSING "LIQUID-RIBBON" COMPACT */}
      <div style={{ position: "relative", marginBottom: 12 }}>
        <div style={{ display: "flex", background: "rgba(255,255,255,0.03)", padding: 4, borderRadius: 16, border: `1px solid ${T.white}08`, position: "relative", overflow: "hidden" }}>
          {stages.map((st, idx) => {
            const isActive = st.id === f.etapa_id;
            const isPast = idx < currentEtIdx;
            return (
              <div key={st.id} onClick={async () => {
                  const nextF = { ...f, etapa_id: st.id, prob: st.probabilidad };
                  setF(nextF);
                  if (editDeal) {
                    await guardarEnSupa("deals", { ...editDeal, ...nextF });
                    if (st.id !== f.etapa_id) await ejecutarAutomaciones(editDeal, st.id);
                  }
                }}
                style={{ flex: 1, padding: "10px 8px", textAlign: "center", cursor: "pointer", position: "relative", zIndex: 1, transition: "all .4s ease" }}
              >
                {isActive && (
                   <div style={{ position: "absolute", inset: 0, background: T.teal, borderRadius: 12, boxShadow: `0 0 20px ${T.teal}40`, zIndex: -1, animation: "liquid-pop .4s ease-out" }} />
                )}
                <div style={{ fontSize: 9, fontWeight: 900, color: isActive ? "#000" : isPast ? T.teal : T.whiteFade, letterSpacing: ".05em", textTransform: "uppercase", display: "flex", alignItems: "center", justifyContent: "center", gap: 4 }}>
                  {isPast && <Ico k="check" size={8} />}
                  {st.nombre}
                </div>
              </div>
            );
          })}
        </div>
        <style>{` @keyframes liquid-pop { 0% { transform: scaleX(0.8); opacity: 0; } 100% { transform: scaleX(1); opacity: 1; } } `}</style>
      </div>

      <div style={{ display: "flex", gap: 40, flexWrap: "wrap" }}>
        
        {/* COLUMNA IZQUIERDA: FULL INFO (SCROLLABLE AREA) */}
        <div className="custom-scrollbar" style={{ flex: "1 1 480px", display: "flex", flexDirection: "column", gap: 24, maxHeight: "82vh", overflowY: "auto", paddingRight: 12 }}>
          
          <style>{`
            .custom-scrollbar::-webkit-scrollbar { width: 4px; }
            .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
            .custom-scrollbar::-webkit-scrollbar-thumb { background: ${T.white}10; borderRadius: 10px; }
            .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: ${T.teal}40; }
          `}</style>

          {/* SECTION 1: CABECERA PREMIUM */}
          <div style={{ background: `linear-gradient(135deg, ${T.bg1}, ${T.bg2}60)`, border: `1px solid ${T.white}08`, borderRadius: 24, padding: 32, boxShadow: "0 10px 40px rgba(0,0,0,0.1)" }}>
             <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 28 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <div style={{ width: 32, height: 32, borderRadius: 10, background: T.tealSoft, display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <Ico k="board" size={16} style={{ color: T.teal }} />
                  </div>
                  <div style={{ fontSize: 13, fontWeight: 900, color: T.teal, letterSpacing: ".15em", textTransform: "uppercase" }}>Información Central</div>
                </div>
                <div style={{ background: "rgba(255,255,255,0.05)", padding: "6px 14px", borderRadius: 12, fontSize: 10, fontWeight: 900, color: T.whiteDim, border: `1px solid ${T.white}10` }}>AI SCORE: {calculateLeadScore(db, f)}</div>
             </div>

             <div style={{ display: "flex", flexDirection: "column", gap: 28 }}>
               <Campo label="TÍTULO DEL NEGOCIO">
                 <LocalInput value={f.titulo} onCommit={v => {
                   const nf = { ...f, titulo: v }; setF(nf);
                   if (editDeal) guardarEnSupa("deals", { ...editDeal, ...nf });
                 }} style={{ fontSize: 24, fontWeight: 900, background: "transparent", border: "none", borderBottom: `2px solid ${T.white}10`, borderRadius: 0, height: 50, padding: "0 0 8px 0", color: T.white }} placeholder="Ej: Proyecto Expansión Q2" />
               </Campo>

               <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 32 }}>
                 <Campo label="VALOR PROYECTADO">
                   <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                     <span style={{ fontSize: 20, fontWeight: 900, color: T.teal }}>$</span>
                     <LocalInput type="number" value={f.valor} onCommit={v => {
                       const nf = { ...f, valor: v }; setF(nf);
                       if (editDeal) guardarEnSupa("deals", { ...editDeal, ...nf });
                     }} style={{ color: T.white, fontSize: 32, fontWeight: 900, background: "transparent", border: "none", padding: 0, width: "100%" }} />
                   </div>
                 </Campo>
                 <Campo label="CONFIANZA DEL CIERRE">
                   <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                     <LocalInput type="number" value={f.prob} onCommit={v => {
                       const nf = { ...f, prob: v }; setF(nf);
                       if (editDeal) guardarEnSupa("deals", { ...editDeal, ...nf });
                     }} style={{ fontWeight: 900, fontSize: 32, background: "transparent", border: "none", padding: 0, textAlign: "right", width: "100%", color: T.whiteOff }} />
                     <span style={{ fontSize: 20, fontWeight: 900, color: T.whiteFade }}>%</span>
                   </div>
                 </Campo>
               </div>

               <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 32, paddingTop: 12, borderTop: `1px solid ${T.white}05` }}>
                 <Campo label="FECHA ESTIMADA CIERRE"><LocalInput type="date" value={f.fecha_cierre || ""} onCommit={v => {
                   const nf = { ...f, fecha_cierre: v }; setF(nf);
                   if (editDeal) guardarEnSupa("deals", { ...editDeal, ...nf });
                 }} style={{ background: "rgba(255,255,255,0.03)", border: `1px solid ${T.white}10`, borderRadius: 14, height: 44, padding: "0 14px", fontSize: 13, fontWeight: 700 }} /></Campo>
                 <Campo label="ETIQUETAS"><LocalInput value={Array.isArray(f.etiquetas) ? f.etiquetas.join(", ") : (f.etiquetas || "")} onCommit={v => {
                   const tags = typeof v === "string" ? v.split(",").map(t => t.trim()).filter(Boolean) : [];
                   const nf = { ...f, etiquetas: tags }; setF(nf);
                   if (editDeal) guardarEnSupa("deals", { ...editDeal, ...nf });
                 }} style={{ background: "rgba(255,255,255,0.03)", border: `1px solid ${T.white}10`, borderRadius: 14, height: 44, padding: "0 14px", fontSize: 13, fontWeight: 700 }} placeholder="vip, prospecto, urgente" /></Campo>
               </div>
             </div>
          </div>

          {/* SECTION 2: RELACIONES & STAFF */}
          <div style={{ background: T.bg1, border: `1px solid ${T.white}08`, borderRadius: 24, padding: 32 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 24 }}>
               <Ico k="users" size={14} style={{ color: T.whiteFade }} />
               <div style={{ fontSize: 11, fontWeight: 900, color: T.whiteFade, letterSpacing: ".15em", textTransform: "uppercase" }}>Relaciones & Staff</div>
            </div>
            
            <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
                 <Campo label="CONTACTO PRINCIPAL"><Sel value={f.contacto_id} onChange={async e => {
                   const val = e.target.value; const nextF = { ...f, contacto_id: val }; setF(nextF);
                   if (editDeal) await guardarEnSupa("deals", { ...editDeal, ...nextF });
                 }} style={{ background: "rgba(255,255,255,0.03)", border: `1px solid ${T.white}15`, borderRadius: 14, height: 48 }}><option value="">— Sin Asignar —</option>{db.contactos?.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}</Sel></Campo>
                 <Campo label="EMPRESA ASOCIADA"><Sel value={f.empresa_id} onChange={async e => {
                   const val = e.target.value; const nextF = { ...f, empresa_id: val }; setF(nextF);
                   if (editDeal) await guardarEnSupa("deals", { ...editDeal, ...nextF });
                 }} style={{ background: "rgba(255,255,255,0.03)", border: `1px solid ${T.white}15`, borderRadius: 14, height: 48 }}><option value="">— Independiente —</option>{db.empresas?.map(e => <option key={e.id} value={e.id}>{e.nombre}</option>)}</Sel></Campo>
              </div>

              {selContacto && (
                <div style={{ background: "rgba(255,255,255,0.02)", padding: 20, borderRadius: 20, border: `1px solid ${T.white}05`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                   <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                     <div style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 13, color: T.whiteOff, fontWeight: 600 }}>
                       <Ico k="mail" size={12} style={{ color: T.teal }} /> {selContacto.email || "Sin email"}
                     </div>
                     <div style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 13, color: T.whiteOff, fontWeight: 600 }}>
                       <Ico k="phone" size={12} style={{ color: T.teal }} /> {selContacto.telefono || "Sin teléfono"}
                     </div>
                   </div>
                   <Btn variant="fantasma" size="xs" style={{ color: T.teal }}>Ver ficha</Btn>
                </div>
              )}
              
              <Campo label="RESPONSABLE DEL CIERRE"><Sel value={f.responsable} onChange={async e => {
                const val = e.target.value; const nextF = { ...f, responsable: val }; setF(nextF);
                if (editDeal) await guardarEnSupa("deals", { ...editDeal, ...nextF });
              }} style={{ background: "rgba(255,255,255,0.03)", border: `1px solid ${T.white}15`, borderRadius: 14, height: 48 }}>{db.usuariosApp?.map(u => <option key={u.id} value={u.name}>{u.name}</option>)}</Sel></Campo>
            </div>
          </div>

          {/* SECTION 3: ATRIBUTOS AVANZADOS */}
          <div style={{ background: T.bg1, border: `1px solid ${T.white}08`, borderRadius: 24, padding: 32 }}>
             <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 28 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                   <Ico k="cog" size={14} style={{ color: T.whiteFade }} />
                   <div style={{ fontSize: 11, fontWeight: 900, color: T.whiteFade, letterSpacing: ".15em", textTransform: "uppercase" }}>Atributos Avanzados</div>
                </div>
                <Btn variant="fantasma" size="xs" onClick={() => setShowConfigCampos(true)} style={{ color: T.teal }}><Ico k="plus" size={12} /></Btn>
             </div>
             <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
                {customFieldsDef.map(cf => {
                  const val = f.custom_fields?.[cf.id] || "";
                  const handleChange = (v) => setF(prev => ({ ...prev, custom_fields: { ...(prev.custom_fields || {}), [cf.id]: v } }));
                  const handleBlur = async () => { if (editDeal) await guardarEnSupa("deals", { ...editDeal, custom_fields: f.custom_fields }); };

                  return (
                    <Campo key={cf.id} label={cf.nombre.toUpperCase()}>
                      {cf.tipo === "lista" ? (
                        <Sel value={val} onChange={e => handleChange(e.target.value)} onBlur={handleBlur} style={{ background: "rgba(255,255,255,0.03)", border: `1px solid ${T.white}15`, borderRadius: 14 }}>
                          <option value="">— Seleccionar —</option>
                          {cf.opciones?.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                        </Sel>
                      ) : (
                        <LocalInput value={val} onCommit={v => { handleChange(v); handleBlur(); }} style={{ background: "rgba(255,255,255,0.03)", border: `1px solid ${T.white}15`, borderRadius: 14, color: T.white, height: 44, fontSize: 13, fontWeight: 600 }} />
                      )}
                    </Campo>
                  );
                })}
             </div>
          </div>

          {/* SECTION 4: NOTAS ESTRATÉGICAS */}
          <div style={{ background: T.bg1, border: `1px solid ${T.white}08`, borderRadius: 24, padding: 32 }}>
             <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 24 }}>
                <Ico k="file" size={14} style={{ color: T.whiteFade }} />
                <div style={{ fontSize: 11, fontWeight: 900, color: T.whiteFade, letterSpacing: ".15em", textTransform: "uppercase" }}>Notas Estratégicas</div>
             </div>
             <textarea 
                value={f.notas || ""} 
                onChange={e => setF(prev => ({ ...prev, notas: e.target.value }))}
                onBlur={async () => { if (editDeal) await guardarEnSupa("deals", { ...editDeal, notas: f.notas }); }}
                placeholder="Describa aquí el plan de acción, puntos de dolor detectados o próximos pasos críticos del negocio..."
                style={{ width: "100%", minHeight: 140, background: "rgba(255,255,255,0.03)", border: `1px solid ${T.white}10`, borderRadius: 18, padding: 20, color: T.white, fontSize: 14, fontFamily: "inherit", resize: "none", outline: "none", lineHeight: 1.6 }}
             />
          </div>

          {/* SECTION 5: VAULT DE DOCUMENTOS */}
          <div style={{ background: T.bg1, border: `1px solid ${T.white}08`, borderRadius: 24, padding: 32 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 24 }}>
                <Ico k="upload" size={14} style={{ color: T.whiteFade }} />
                <div style={{ fontSize: 11, fontWeight: 900, color: T.whiteFade, letterSpacing: ".15em", textTransform: "uppercase" }}>Vault de Documentos</div>
            </div>
            <div style={{ flex: 1, border: `2px dashed ${dragActive ? T.teal : T.white + "10"}`, borderRadius: 20, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 14, padding: 40, background: dragActive ? T.teal + "05" : "rgba(255,255,255,0.01)", transition: "all .3s" }} 
                 onDragOver={e => { e.preventDefault(); setDragActive(true); }} onDragLeave={() => setDragActive(false)} onDrop={handleDrop}>
               <Ico k="upload" size={32} style={{ color: T.whiteFade, opacity: 0.5 }} />
               <div style={{ fontSize: 13, color: T.whiteFade, textAlign: "center", fontWeight: 600 }}>Suelte archivos aquí para adjuntar al negocio.</div>
            </div>
            {f.archivos?.length > 0 && (
              <div style={{ marginTop: 24, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                {(f.archivos || []).map(a => (
                  <div key={a.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: "rgba(255,255,255,0.03)", padding: "12px 16px", borderRadius: 16, border: `1px solid ${T.white}08` }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 12, overflow: "hidden" }}>
                      <Ico k={a.tipo === "img" ? "image" : "file"} size={16} style={{ color: T.teal }} />
                      <div style={{ display: "flex", flexDirection: "column", overflow: "hidden" }}>
                        <span style={{ fontSize: 12, color: T.whiteOff, fontWeight: 700, whiteSpace: "nowrap", textOverflow: "ellipsis", overflow: "hidden" }}>{a.nombre}</span>
                        <span style={{ fontSize: 9, color: T.whiteFade, fontWeight: 700 }}>{a.size}</span>
                      </div>
                    </div>
                    <Btn variant="fantasma" size="xs" onClick={() => quitarArchivo(a.id)} style={{ color: T.red, opacity: 0.6 }}><Ico k="trash" size={14} /></Btn>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div style={{ display: "flex", gap: 20, marginTop: 12 }}>
            <Btn variant="fantasma" onClick={onCancelar} full style={{ height: 56, borderRadius: 18, fontWeight: 800 }}>Descartar</Btn>
            <Btn onClick={() => onGuardar(f)} full style={{ height: 56, borderRadius: 18, background: T.teal, color: "#000", border: "none", fontWeight: 900, boxShadow: `0 10px 20px ${T.teal}40` }}>GUARDAR CAMBIOS</Btn>
          </div>
        </div>

        {/* COLUMNA DERECHA: ACTIVITY FEED & MATRIX */}
        <div style={{ flex: "1.2 1 540px", minHeight: "78vh", background: "rgba(255,255,255,0.01)", borderRadius: 32, border: `1px solid ${T.white}05`, overflow: "hidden", display: "flex", flexDirection: "column" }}>
          
          <div style={{ display: "flex", background: "rgba(255,255,255,0.02)", padding: 4, gap: 4 }}>
             {["timeline", "whatsapp", "finanzas", "historial"].map(tk => (
               <div key={tk} onClick={() => setRightTab(tk)} style={{ flex: 1, padding: "10px 4px", textAlign: "center", fontSize: 10, fontWeight: 900, textTransform: "uppercase", cursor: "pointer", background: rightTab === tk ? T.bg2 : "transparent", color: rightTab === tk ? T.teal : T.whiteFade, borderRadius: 12, transition: "all .3s" }}>
                 {tk === "timeline" ? "Feed" : tk}
               </div>
             ))}
          </div>

          <div style={{ flex: 1, overflowY: "auto" }}>
            {rightTab === "timeline" && (
              <LeadTimeline
                deal={editDeal}
                contacto={db.contactos?.find(c => c.id === f.contacto_id) || {}}
                db={db} setDb={setDb} guardarEnSupa={guardarEnSupa} setModulo={setModulo}
                focusEmailId={focusEmailId} setFocusEmailId={setFocusEmailId}
              />
            )}

            {rightTab === "whatsapp" && <div style={{ padding: 60, textAlign: "center", color: T.whiteFade, fontSize: 13 }}>Sincronización de WhatsApp pendiente.</div>}
            
            {rightTab === "finanzas" && (
              <div style={{ padding: 40 }}>
                 <div style={{ fontSize: 20, fontWeight: 900, color: T.white, marginBottom: 32 }}>Financial Matrix</div>
                 <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
                   <div style={{ padding: 32, background: "rgba(255,255,255,0.02)", borderRadius: 24, border: `1px solid ${T.white}08` }}>
                     <div style={{ fontSize: 10, color: T.whiteFade, fontWeight: 900, letterSpacing: ".1em" }}>REVENUE</div>
                     <div style={{ fontSize: 32, fontWeight: 900, color: T.teal }}>{money(editDeal?.valor || 0)}</div>
                   </div>
                   <div style={{ padding: 32, background: "rgba(255,255,255,0.02)", borderRadius: 24, border: `1px solid ${T.white}08` }}>
                     <div style={{ fontSize: 10, color: T.whiteFade, fontWeight: 900, letterSpacing: ".1em" }}>COSTS</div>
                     <div style={{ fontSize: 32, fontWeight: 900, color: T.red, opacity: 0.8 }}>{money((db.finanzas_gastos || []).filter(g => g.deal_id === editDeal?.id).reduce((acc, g) => acc + g.monto, 0))}</div>
                   </div>
                 </div>
              </div>
            )}

            {rightTab === "historial" && (
              <div style={{ padding: 32, display: "flex", flexDirection: "column", gap: 12 }}>
                {(db.auditoria || []).filter(a => a.entidad_id === editDeal?.id).sort((a,b) => new Date(b.creado) - new Date(a.creado)).map(a => (
                  <div key={a.id} style={{ display: "flex", gap: 16, padding: "16px 20px", background: "rgba(255,255,255,0.02)", borderRadius: 16, border: `1px solid ${T.white}05` }}>
                     <div style={{ width: 4, background: T.teal, borderRadius: 2, height: 16, marginTop: 4 }} />
                     <div style={{ fontSize: 13, color: T.whiteOff }}>
                       <span style={{ fontWeight: 800, color: T.white }}>{a.usuario_nombre}</span> actualizó {a.campo} a <span style={{ color: T.teal }}>{a.valor_nuevo}</span>
                     </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export const Pipeline = ({ db, setDb, guardarEnSupa, eliminarDeSupa, t, setModulo, focusEmailId, setFocusEmailId }) => {
  const [plActivo, setPlActivo] = useState(localStorage.getItem("crm_active_pipeline") || db.pipelines?.[0]?.id || "");
  useEffect(() => { if (plActivo) localStorage.setItem("crm_active_pipeline", plActivo); }, [plActivo]);

  // Si db.pipelines carga después y plActivo está vacío, inicializar con el primero
  useEffect(() => {
    if (!plActivo && db.pipelines?.length > 0) {
      setPlActivo(db.pipelines[0].id);
    }
  }, [db.pipelines, plActivo]);

  const [tab, setTab] = useState("kanban");
  const [showConfetti, setShowConfetti] = useState(false);

  const [showNuevoPL, setShowNuevoPL] = useState(false);
  const [nuevoPL, setNuevoPL] = useState({ nombre: "", color: T.teal });
  const [showDealForm, setShowDealForm] = useState(false);
  const [editDeal, setEditDeal] = useState(null);
  const [preEtapa, setPreEtapa] = useState(null);
  const [dragDeal, setDragDeal] = useState(null);
  const [dragSobre, setDragSobre] = useState(null);
  const [etEditando, setEtEditando] = useState(null);
  const [showNuevaEt, setShowNuevaEt] = useState(false);
  const [nuevaEt, setNuevaEt] = useState({ nombre: "", color: T.teal, probabilidad: 50 });
  const [showConfigCampos, setShowConfigCampos] = useState(false);
  const [nuevoCampo, setNuevoCampo] = useState({ nombre: "", tipo: "cadena", opciones: "" });
  const [dragEtapa, setDragEtapa] = useState(null); // para reordenar etapas
  const [filtroRapido, setFiltroRapido] = useState("todos");
  const [selectedIds, setSelectedIds] = useState([]); // Acciones masivas

  // Filtros Avanzados
  const [busqueda, setBusqueda] = useState("");
  const [fResp, setFResp] = useState("todos");
  const [fFecha, setFFecha] = useState("todas");
  const [fEmpresa, setFEmpresa] = useState("todas");
  const [showFiltros, setShowFiltros] = useState(false);
  const [showImport, setShowImport] = useState(false);

  // MOVE OUTSIDE LATER

  const getDealStatus = (deal) => {
    const acts = (db.actividades || []).filter(a => a.deal_id === deal.id);
    const tareas = (db.tareas || []).filter(t => t.deal_id === deal.id && t.estado !== "completada");

    const now = Date.now();
    const lastAct = acts.length > 0 ? Math.max(...acts.map(a => new Date(a.fecha).getTime())) : new Date(deal.creado).getTime();
    const diff = now - lastAct;

    // TODO: Considerar mensajes de WhatsApp si estuvieran en db.whatsapp_messages

    if (diff <= 86400000) return { label: "Hot", color: "#FF4500", icon: "🔥", glow: "0 0 12px #FF450060", desc: "Actividad en las últimas 24h" };
    if (diff <= 86400000 * 3) return { label: "Warm", color: T.amber, icon: "⚡", glow: "none", desc: "Actividad en los últimos 3 días" };
    if (diff >= 86400000 * 5) return { label: "Cold", color: T.whiteDim, icon: "❄️", glow: "none", desc: "Sin actividad por más de 5 días", cold: true };
    return { label: "Normal", color: T.green, icon: "🌱", glow: "none", desc: "Actividad regular" };
  };

  const chequearComision = async (dealId, etapaId, valor) => {
    const pl = db.pipelines.find(p => p.id === plActivo);
    const etapa = pl?.etapas.find(e => e.id === etapaId);
    if (etapa && (etapa.es_ganado || ["ganado", "venta", "exito", "éxito", "cerrado"].some(k => (etapa.nombre || "").toLowerCase().includes(k)))) {
      const yaExiste = (db.finanzas_comisiones || []).some(c => c.deal_id === dealId);
      if (!yaExiste) {
        const comision = {
          id: "com" + uid(),
          deal_id: dealId,
          vendedor_id: db.usuario?.id,
          monto: Number(valor) * 0.05,
          porcentaje: 5,
          status: "pendiente",
          creado: new Date().toISOString()
        };
        await guardarEnSupa("finanzas_comisiones", comision);
      }
    }
  };

  const ejecutarAutomaciones = async (deal, nuevaEtapaId) => {
    try {
      await executeRules(db, deal, nuevaEtapaId, { guardarEnSupa });
    } catch (err) {
      console.error("Error al ejecutar automatizaciones dinámicas:", err);
    }
  };



  // Estado del formulario de Deal elevado al nivel de Pipeline para sobrevivir re-renders de Supabase Realtime.
  const defaultF = () => ({
    titulo: "", contacto_id: "", empresa_id: "",
    pipeline_id: db.pipelines?.[0]?.id || "",
    etapa_id: db.pipelines?.[0]?.etapas?.[0]?.id || "",
    valor: 0, prob: 50, fecha_cierre: "",
    responsable: db.usuario?.name || "",
    etiquetas: "", notas: "", archivos: [], custom_fields: {}
  });
  const [f, setF] = useState(defaultF);
  const [dragActive, setDragActive] = useState(false);


  const pipeline = db.pipelines?.find(p => p.id === plActivo);

  const plDeals = db.deals?.filter(d => {
    if (d.pipeline_id !== plActivo) return false;

    // RBAC: Los vendedores solo ven sus propios leads
    if (db.usuario?.role !== "admin" && d.responsable !== db.usuario?.name) return false;

    // Filtro Rápido
    if (filtroRapido === "mios") { if (d.responsable !== db.usuario?.name) return false; }
    else if (filtroRapido === "frios") {
      const acts = (db.actividades || []).filter(a => a.deal_id === d.id);
      if (acts.length > 0) {
        const ultimaAct = Math.max(...acts.map(a => new Date(a.fecha).getTime()));
        if ((Date.now() - ultimaAct) <= (86400000 * 2)) return false;
      }
    }
    else if (filtroRapido === "cierre") {
      if (!d.fecha_cierre) return false;
      const hoy = new Date();
      const cierre = new Date(d.fecha_cierre);
      if (cierre.getMonth() !== hoy.getMonth() || cierre.getFullYear() !== hoy.getFullYear()) return false;
    }

    // Filtros Avanzados
    if (busqueda && !d.titulo.toLowerCase().includes(busqueda.toLowerCase())) {
      const contacto = db.contactos?.find(c => c.id === d.contacto_id);
      if (!contacto?.nombre?.toLowerCase().includes(busqueda.toLowerCase())) return false;
    }
    if (fResp !== "todos" && d.responsable !== fResp) return false;
    if (fEmpresa !== "todas" && d.empresa_id !== fEmpresa) return false;
    if (fFecha !== "todas") {
      const creado = new Date(d.creado);
      const hoy = new Date();
      if (fFecha === "hoy" && creado.toDateString() !== hoy.toDateString()) return false;
      if (fFecha === "semana") {
        const haceUnaSemana = new Date(hoy.getTime() - 7 * 86400000);
        if (creado < haceUnaSemana) return false;
      }
      if (fFecha === "mes" && (creado.getMonth() !== hoy.getMonth() || creado.getFullYear() !== hoy.getFullYear())) return false;
    }

    return true;
  });


  // Inicializar el formulario cuando se abre el modal (editDeal cambia o showDealForm se activa)
  useEffect(() => {
    if (showDealForm) {
      const init = editDeal || {};
      setF({
        ...defaultF(),
        pipeline_id: plActivo,
        etapa_id: pipeline?.etapas?.[0]?.id || "",
        ...init,
        etiquetas: Array.isArray(init.etiquetas)
          ? init.etiquetas.join(", ")
          : (init.etiquetas || "")
      });
    }
  }, [editDeal?.id, showDealForm]);


  const actPipeline = up => setDb(d => ({ ...d, pipelines: d.pipelines.map(p => p.id === up.id ? up : p) }));


  const crearPipeline = () => {
    if (!nuevoPL.nombre.trim()) return;
    const np = {
      id: "pl" + uid(), nombre: nuevoPL.nombre, color: nuevoPL.color, es_principal: false, etapas: [
        { id: "e" + uid(), nombre: "Nuevo Lead", color: T.whiteDim, orden: 0, probabilidad: 10 },
        { id: "e" + uid(), nombre: "En Proceso", color: "#60A5FA", orden: 1, probabilidad: 40 },
        { id: "e" + uid(), nombre: "Propuesta", color: "#A78BFA", orden: 2, probabilidad: 60 },
        { id: "e" + uid(), nombre: "Ganado", color: T.green, orden: 3, probabilidad: 100, es_ganado: true },
        { id: "e" + uid(), nombre: "Perdido", color: T.red, orden: 4, probabilidad: 0, es_perdido: true },
      ]
    };
    setDb(d => ({ ...d, pipelines: [...d.pipelines, np] }));
    await guardarEnSupa("pipelines", np);
    setPlActivo(np.id); setShowNuevoPL(false); setNuevoPL({ nombre: "", color: T.teal });
  };

  const agregarEtapa = () => {
    if (!nuevaEt.nombre.trim()) return;
    const et = { id: "e" + uid(), nombre: nuevaEt.nombre, color: nuevaEt.color, probabilidad: +nuevaEt.probabilidad, orden: pipeline?.etapas?.length || 0 };
    if (pipeline) {
      const updated = { ...pipeline, etapas: [...(pipeline.etapas || []), et] };
      actPipeline(updated);
      await guardarEnSupa("pipelines", updated);
    }
    setShowNuevaEt(false); setNuevaEt({ nombre: "", color: T.teal, probabilidad: 50 });
  };

  // MOVE OUTSIDE LATER

  const guardarDeal = async (form) => {
    if (editDeal) {
      const act = { ...editDeal, ...form };

      // --- LOGICA DE AUDITORIA ---
      const camposAObservar = ["titulo", "valor", "responsable", "etapa_id"];
      for (const c of camposAObservar) {
        if (form[c] !== undefined && String(form[c]) !== String(editDeal[c])) {
          const log = {
            id: "aud" + uid(),
            usuario_id: db.usuario?.id,
            usuario_nombre: db.usuario?.name,
            entidad_tipo: "deal",
            entidad_id: editDeal.id,
            campo: c === "etapa_id" ? "Etapa" : (c.charAt(0).toUpperCase() + c.slice(1)),
            valor_anterior: String(editDeal[c] === undefined ? "" : editDeal[c]),
            valor_nuevo: String(form[c]),
            creado: new Date().toISOString()
          };
          // Si es etapa_id, intentamos poner el nombre de la etapa para que sea humano
          if (c === "etapa_id") {
            const pl = db.pipelines?.find(p => p.id === editDeal.pipeline_id);
            log.valor_anterior = pl?.etapas?.find(e => e.id === editDeal[c])?.nombre || editDeal[c];
            log.valor_nuevo = pl?.etapas?.find(e => e.id === form[c])?.nombre || form[c];
          }
          await guardarEnSupa("auditoria", log);
        }
      }

      // 4. NOTIFICACIONES & WEBHOOKS (Phase 40 & 42)
      // DISPARAR WEBHOOKS SEGÚN ETAPA (Phase 42)
      const pl = db.pipelines?.find(p => p.id === form.pipeline_id);
      const etapa = pl?.etapas?.find(e => e.id === form.etapa_id);

      if (etapa && etapa.id !== editDeal.etapa_id) {
        let event = null;
        if (etapa.es_ganado || etapa.es_ganado === true) event = 'deal.ganado';
        else if (etapa.es_perdido || etapa.es_perdido === true) event = 'deal.perdido';

        if (event) {
          const API_URL = getApiUrl(db);
          import("axios").then(axios => {
            axios.default.post(`${API_URL}/api/internal/trigger-webhook`, {
              event,
              payload: { deal: act, pipeline: pl.nombre, etapa: etapa.nombre, user: db.usuario?.name }
            }).catch(() => { });
          });
        }
      }

      // Notificación si cambia el responsable
      if (form.responsable && form.responsable !== editDeal.responsable) {
        const targetUser = db.usuariosApp?.find(u => u.name === form.responsable);
        if (targetUser && targetUser.id !== db.usuario?.id) {
          const noti = {
            id: "not" + uid(),
            usuario_id: targetUser.id,
            titulo: "🤝 Nuevo Lead Asignado",
            mensaje: `Se te ha asignado el lead: ${form.titulo || editDeal.titulo}`,
            tipo: "success",
            url: "pipeline",
            leida: false,
            creado: new Date().toISOString()
          };
          guardarEnSupa("notificaciones", noti);
        }
      }

      setDb(d => ({ ...d, deals: d.deals.map(deal => deal.id === editDeal.id ? act : deal) }));
      await guardarEnSupa("deals", act);
    } else {
      const nv = { 
        ...form, 
        id: "d" + uid(), 
        creado: new Date().toISOString().slice(0, 10),
        pipeline_id: form.pipeline_id || plActivo || db.pipelines?.[0]?.id,
        etapa_id: form.etapa_id || db.pipelines?.find(p => p.id === (form.pipeline_id || plActivo))?.etapas?.[0]?.id
      };

      // Notificación si se asigna a otro al crear
      if (nv.responsable && nv.responsable !== db.usuario?.name) {
        const targetUser = db.usuariosApp?.find(u => u.name === nv.responsable);
        if (targetUser) {
          const noti = {
            id: "not" + uid(),
            usuario_id: targetUser.id,
            titulo: "🆕 Nuevo Lead",
            mensaje: `Tienes un nuevo lead asignado: ${nv.titulo}`,
            tipo: "info",
            url: "pipeline",
            leida: false,
            creado: new Date().toISOString()
          };
          await guardarEnSupa("notificaciones", noti);
        }
      }

      setDb(d => ({ ...d, deals: [nv, ...d.deals] }));
      await guardarEnSupa("deals", nv);
      await ejecutarAutomaciones(nv, nv.etapa_id);
    }
    setShowDealForm(false); setEditDeal(null); setPreEtapa(null);
  };

  const crearCampo = async () => {
    if (!nuevoCampo.nombre.trim()) return;
    const campo = {
      id: "cf" + uid(),
      nombre: nuevoCampo.nombre,
      tipo: nuevoCampo.tipo,
      opciones: nuevoCampo.tipo === "lista" ? nuevoCampo.opciones.split(",").map(o => o.trim()).filter(Boolean) : [],
      entidad: "deal"
    };

    // Sincronizar con Supabase y estado local
    setDb(d => ({ ...d, campos_personalizados: [...(d.campos_personalizados || []), campo] }));
    await guardarEnSupa("campos_personalizados", campo);

    setNuevoCampo({ nombre: "", tipo: "cadena", opciones: "" });
    setShowConfigCampos(false); // Cerrar para feedback visual claro
  };

  const eliminarCampo = async (id) => {
    if (!confirm("¿Eliminar este campo global? Se borrarán sus valores en todos los deals.")) return;
    setDb(d => ({ ...d, campos_personalizados: d.campos_personalizados.filter(c => c.id !== id) }));
    await eliminarDeSupa("campos_personalizados", id);
  };

  const eliminarDeal = async (id) => {
    if (!confirm("¿Eliminar deal?")) return;
    setDb(d => ({ ...d, deals: d.deals.filter(deal => deal.id !== id) }));
    await eliminarDeSupa("deals", id);
  };

  // --- ACCIONES MASIVAS ---
  const handleBulkStage = async (newEtapaId) => {
    if (!selectedIds.length) return;
    setDb(prev => ({
      ...prev,
      deals: prev.deals.map(d => selectedIds.includes(d.id) ? { ...d, etapa_id: newEtapaId } : d)
    }));
    for (const id of selectedIds) {
      const d = db.deals?.find(x => x.id === id);
      if (d) {
        await guardarEnSupa("deals", { ...d, etapa_id: newEtapaId });
        await ejecutarAutomaciones(d, newEtapaId);
      }
    }
    setSelectedIds([]);
  };

  const handleBulkResp = async (newResp) => {
    if (!selectedIds.length) return;
    setDb(prev => ({
      ...prev,
      deals: prev.deals.map(d => selectedIds.includes(d.id) ? { ...d, responsable: newResp } : d)
    }));
    for (const id of selectedIds) {
      const d = db.deals.find(x => x.id === id);
      await guardarEnSupa("deals", { ...d, responsable: newResp });
    }
    setSelectedIds([]);
  };

  const handleBulkDelete = async () => {
    if (!selectedIds.length || !confirm(`¿Eliminar ${selectedIds.length} negocios seleccionados?`)) return;
    setDb(prev => ({
      ...prev,
      deals: prev.deals.filter(d => !selectedIds.includes(d.id))
    }));
    for (const id of selectedIds) {
      await eliminarDeSupa("deals", id);
    }
    setSelectedIds([]);
  };

  const handleBulkImport = async (data) => {
    const nuevosDeals = data.map(item => {
      const titulo = item.titulo || item.title || "Negocio Sin Título";
      
      // Resolve Contact ID
      const contactoNombre = item.contacto || item.contact || "";
      const contacto = db.contactos?.find(c => c.nombre.toLowerCase() === contactoNombre.toLowerCase());
      
      // Resolve Company ID
      const empresaNombre = item.empresa || item.company || "";
      const empresa = db.empresas?.find(e => e.nombre.toLowerCase() === empresaNombre.toLowerCase());

      return {
        id: "d" + uid(),
        titulo,
        valor: Number(item.valor || item.value || 0),
        prob: Number(item.probabilidad || item.probability || 50),
        fecha_cierre: item.fecha_cierre || item.closing_date || "",
        contacto_id: contacto?.id || "",
        empresa_id: empresa?.id || "",
        pipeline_id: plActivo,
        etapa_id: pipeline?.etapas?.[0]?.id || "",
        responsable: item.responsable || item.owner || db.usuario?.name || "",
        etiquetas: (item.etiquetas || item.tags || "").split(",").map(t => t.trim()).filter(Boolean),
        notas: item.notas || item.notes || "",
        creado: new Date().toISOString().slice(0, 10),
        archivos: [],
        custom_fields: {}
      };
    });

    setDb(d => ({ ...d, deals: [...nuevosDeals, ...d.deals] }));
    await guardarEnSupa("deals", nuevosDeals);
    sileo.success(`${nuevosDeals.length} negocios importados correctamente`);
  };

  const handleExport = () => {
    // Flatten deals and map Contact/Company names
    const data = (db.deals || []).filter(d => d.pipeline_id === plActivo).map(d => {
      const contacto = (db.contactos || []).find(c => c.id === d.contacto_id);
      const empresa = (db.empresas || []).find(e => e.id === d.empresa_id);
      const etapa = (pipeline?.etapas || []).find(et => et.id === d.etapa_id);

      return {
        Título: d.titulo || "Sin título",
        Valor: d.valor || 0,
        Probabilidad: (d.prob || 0) + "%",
        Etapa: etapa?.nombre || "N/A",
        Contacto: contacto?.nombre || "N/A",
        Empresa: empresa?.nombre || "N/A",
        Responsable: d.responsable || "Sin asignar",
        "Fecha Cierre": d.fecha_cierre || "N/A",
        Creado: d.creado || "N/A",
        Etiquetas: Array.isArray(d.etiquetas) ? d.etiquetas.join(", ") : "",
        Notas: d.notas || ""
      };
    });
    exportToExcel(data, `pipeline_${pipeline?.nombre || "ventas"}`, "Negocios");
  };

  return (
    <div>
      <EncabezadoSeccion title="Pipeline CRM" sub="Gestiona tus oportunidades en etapas visuales"
        actions={
          <div style={{ display: "flex", gap: 12 }}>
            <ControlSegmentado value={tab} onChange={setTab} options={[{ value: "kanban", label: "Kanban", icon: "board" }, { value: "lista", label: "Lista", icon: "list" }, { value: "configurar", label: "Configurar", icon: "cog" }]} />
            <MenuDatos onImport={() => setShowImport(true)} onExport={handleExport} />
            <Btn onClick={() => { setEditDeal(null); setPreEtapa(null); setShowDealForm(true); }}><Ico k="plus" size={14} />Nuevo Deal</Btn>
          </div>
        } />

      {showConfetti && (
        <div style={{ position: "fixed", inset: 0, zIndex: 9999, pointerEvents: "none", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
          {[...Array(50)].map((_, i) => (
            <div key={i} style={{
              position: "absolute",
              width: 10,
              height: 10,
              background: [T.teal, T.green, "#FFD700", "#FF4500", "#1E90FF"][i % 5],
              borderRadius: i % 2 === 0 ? "50%" : "0",
              top: "-10%",
              left: `${Math.random() * 100}%`,
              opacity: 0.8,
              animation: `confetti-fall ${1 + Math.random() * 2}s linear forwards`,
              animationDelay: `${Math.random() * 2}s`
            }} />
          ))}
          <style>{`
             @keyframes confetti-fall {
               0% { transform: translateY(0) rotate(0deg); opacity: 1; }
               100% { transform: translateY(110vh) rotate(720deg); opacity: 0; }
             }
           `}</style>
          <div style={{ background: "rgba(0,0,0,0.8)", padding: "20px 40px", borderRadius: 20, border: `2px solid ${T.green}`, color: "#fff", fontSize: 24, fontWeight: 900, boxShadow: "var(--shadow-xl)", animation: "pop-in 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275)" }}>
            🎉 ¡DEAL GANADO! 🚀
          </div>
          <style>{`
             @keyframes pop-in {
               0% { transform: scale(0.5); opacity: 0; }
               100% { transform: scale(1); opacity: 1; }
             }
           `}</style>
        </div>
      )}


      <div style={{ display: "flex", gap: 16, marginBottom: 24, alignItems: "center", flexWrap: "wrap" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, background: T.bg1, border: `1px solid ${T.borderHi}`, borderRadius: 10, padding: "2px 14px", boxShadow: "0 2px 4px rgba(0,0,0,0.02)", minWidth: 220 }}>
          <span style={{ fontSize: 13, fontWeight: 700, color: T.whiteDim, whiteSpace: "nowrap" }}>Pipeline Activo:</span>
          <Sel
            value={plActivo}
            onChange={e => setPlActivo(e.target.value)}
            style={{ flex: 1 }}
            innerStyle={{ background: "transparent", border: "none", padding: "6px 0", height: "auto" }}
          >
            {db.pipelines?.map(pl => <option key={pl.id} value={pl.id}>{pl.nombre} ({db.deals?.filter(d => d.pipeline_id === pl.id).length})</option>)}
          </Sel>
        </div>

        <div style={{ background: T.bg1, border: `1px solid ${T.borderHi}`, borderRadius: 10, padding: "2px 8px" }}>
          <ControlSegmentado
            value={filtroRapido}
            onChange={setFiltroRapido}
            options={[
              { value: "todos", label: "Todos", icon: "board" },
              { value: "mios", label: "Mis Leads", icon: "users" },
              { value: "frios", label: "Fríos", icon: "clock" },
              { value: "cierre", label: "Cierre Próximo", icon: "calendar" }
            ]}
          />
        </div>

        <div style={{ display: "flex", alignItems: "center", background: T.bg1, border: `1px solid ${T.borderHi}`, borderRadius: 10, padding: "4px 12px", gap: 10, flex: 1, minWidth: 250 }}>
          <Ico k="search" size={16} style={{ color: T.whiteDim }} />
          <input
            type="text"
            placeholder="Buscar por título o contacto..."
            value={busqueda}
            onChange={e => setBusqueda(e.target.value)}
            style={{ border: "none", background: "transparent", color: T.white, fontSize: 13, outline: "none", width: "100%", fontFamily: "inherit" }}
          />
          <Btn variant="fantasma" size="xs" onClick={() => setShowFiltros(!showFiltros)} style={{ borderLeft: `1px solid ${T.borderHi}`, borderRadius: 0, paddingLeft: 12 }}>
            <Ico k="filter" size={14} style={{ color: showFiltros ? T.teal : T.whiteDim }} />
          </Btn>
        </div>

        <Btn variant="fantasma" size="sm" onClick={() => setShowNuevoPL(true)}><Ico k="plus" size={14} />Nuevo Pipeline</Btn>
      </div>

      {showFiltros && (
        <div style={{ background: T.bg1, border: `1px solid ${T.borderHi}`, borderRadius: 12, padding: 16, marginBottom: 20, display: "flex", gap: 20, flexWrap: "wrap", alignItems: "flex-end", animation: "slide-down 0.2s ease-out" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: T.whiteDim, textTransform: "uppercase" }}>Responsable</span>
            <select value={fResp} onChange={e => setFResp(e.target.value)} style={{ background: T.bg2, color: T.white, border: `1px solid ${T.borderHi}`, borderRadius: 8, padding: "6px 12px", fontSize: 13, cursor: "pointer", outline: "none" }}>
              <option value="todos">Todos los responsables</option>
              {(db.usuariosApp || []).map(u => <option key={u.id} value={u.name}>{u.name}</option>)}
            </select>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: T.whiteDim, textTransform: "uppercase" }}>Empresa</span>
            <select value={fEmpresa} onChange={e => setFEmpresa(e.target.value)} style={{ background: T.bg2, color: T.white, border: `1px solid ${T.borderHi}`, borderRadius: 8, padding: "6px 12px", fontSize: 13, cursor: "pointer", outline: "none" }}>
              <option value="todas">Todas las empresas</option>
              {db.empresas?.map(emp => <option key={emp.id} value={emp.id}>{emp.nombre}</option>)}
            </select>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: T.whiteDim, textTransform: "uppercase" }}>Fecha Creación</span>
            <select value={fFecha} onChange={e => setFFecha(e.target.value)} style={{ background: T.bg2, color: T.white, border: `1px solid ${T.borderHi}`, borderRadius: 8, padding: "6px 12px", fontSize: 13, cursor: "pointer", outline: "none" }}>
              <option value="todas">Cualquier fecha</option>
              <option value="hoy">Creados Hoy</option>
              <option value="semana">Últimos 7 días</option>
              <option value="mes">Este mes</option>
            </select>
          </div>
          <Btn variant="fantasma" size="sm" onClick={() => { setBusqueda(""); setFResp("todos"); setFFecha("todas"); setFEmpresa("todas"); }} style={{ color: T.red }}>Limpiar</Btn>
          <style>{`@keyframes slide-down { from { opacity:0; transform:translateY(-10px); } to { opacity:1; transform:translateY(0); } }`}</style>
        </div>
      )}

      {/* KANBAN — ESTILO BITRIX24 DARK */}
      {tab === "kanban" && pipeline && (
        <div style={{ display: "flex", gap: 10, overflowX: "auto", paddingBottom: 20, minHeight: "70vh", alignItems: "flex-start" }}>
          {pipeline.etapas?.map((etapa, etapaIdx) => {
            const etDeals = plDeals.filter(d => d.etapa_id === etapa.id);
            const isOver = dragSobre === etapa.id;
            const totalEtapa = etDeals.reduce((s, d) => s + (d.valor || 0), 0);
            const colBg = isOver ? "rgba(255,255,255,0.05)" : T.bg2;
            return (
              <div key={etapa.id}
                style={{ minWidth: 220, maxWidth: 220, display: "flex", flexDirection: "column", flexShrink: 0, borderRadius: 12, background: colBg, border: `1px solid ${isOver ? etapa.color : T.borderHi}`, transition: "all .2s", overflow: "hidden" }}
                onDragOver={e => { e.preventDefault(); setDragSobre(etapa.id); }}
                onDrop={async e => {
                  e.preventDefault();
                  if (dragDeal) {
                    const updated = { ...dragDeal, etapa_id: etapa.id };
                    setDb(d => ({ ...d, deals: d.deals.map(deal => deal.id === dragDeal.id ? updated : deal) }));
                    await guardarEnSupa("deals", updated);
                    if (dragDeal.etapa_id !== etapa.id) {
                      await ejecutarAutomaciones(dragDeal, etapa.id);
                      await chequearComision(dragDeal.id, etapa.id, dragDeal.valor);
                    }
                  }
                  setDragDeal(null); setDragSobre(null);
                }}
                onDragLeave={() => setDragSobre(null)}>

                {/* CABECERA SÓLIDA DE COLOR — compacta como Bitrix24 */}
                <div style={{ background: etapa.color, padding: "7px 10px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 6 }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 10, fontWeight: 800, color: "#fff", textTransform: "uppercase", letterSpacing: ".08em", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{etapa.nombre}</div>
                    <div style={{ fontSize: 13, fontWeight: 900, color: "#fff", opacity: 0.95 }}>{money(totalEtapa)}</div>
                  </div>
                  <span style={{ background: "rgba(0,0,0,0.25)", color: "#fff", borderRadius: 20, padding: "1px 8px", fontSize: 10, fontWeight: 800, flexShrink: 0 }}>{etDeals.length}</span>
                </div>

                {/* BOTÓN AGREGAR */}
                <button onClick={() => { setEditDeal(null); setPreEtapa(etapa.id); setShowDealForm(true); }}
                  style={{ background: "transparent", border: "none", borderBottom: `1px solid ${T.borderHi}`, padding: "9px 14px", color: etapa.color, cursor: "pointer", fontSize: 12, fontWeight: 700, display: "flex", alignItems: "center", gap: 5, fontFamily: "inherit", textAlign: "left", width: "100%", transition: "background .15s" }}
                  onMouseEnter={e => e.currentTarget.style.background = etapa.color.startsWith("#") ? etapa.color + "12" : etapa.color}
                  onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                  <span style={{ fontSize: 18, lineHeight: 1, fontWeight: 900 }}>+</span> Agregar
                </button>

                {/* LISTA DE TARJETAS */}
                <div style={{ display: "flex", flexDirection: "column", gap: 8, padding: "10px 8px", flex: 1 }}>
                  {etDeals.map(deal => {
                    const contacto = db.contactos?.find(c => c.id === deal.contacto_id);
                    const fechaCreacion = deal.creado ? new Date(deal.creado).toLocaleDateString("es-ES", { day: "numeric", month: "short", year: "2-digit" }) : null;
                    const dealIdCorto = (deal.id || "").toString().slice(-5);
                    const avatarLetras = (deal.responsable || "?").trim().split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase();
                    const colAvatar = etapa.color;

                    const isSelected = selectedIds.includes(deal.id);
                    const dStat = getDealStatus(deal);

                    return (
                      <div key={deal.id} draggable onDragStart={() => setDragDeal(deal)}
                        style={{
                          background: "rgba(255,255,255,0.02)",
                          backdropFilter: "blur(12px)",
                          border: `1px solid ${isSelected ? T.teal : T.white + "08"}`,
                          borderRadius: 20,
                          padding: "16px 20px",
                          cursor: "pointer",
                          userSelect: "none",
                          transition: "all .3s cubic-bezier(0.4, 0, 0.2, 1)",
                          position: "relative",
                          boxShadow: isSelected ? `0 10px 30px ${T.teal}20` : "0 4px 20px rgba(0,0,0,0.1)",
                          filter: dStat.cold ? "grayscale(0.6) opacity(0.7)" : "none",
                          marginBottom: 16
                        }}
                        onClick={(e) => {
                          if (e.target.type === "checkbox") return;
                          setEditDeal(deal); setShowDealForm(true);
                        }}
                        onMouseEnter={e => {
                          e.currentTarget.style.background = "rgba(255,255,255,0.04)";
                          e.currentTarget.style.borderColor = isSelected ? T.teal : T.white + "15";
                          e.currentTarget.style.transform = "translateY(-4px)";
                          e.currentTarget.style.boxShadow = "0 20px 40px rgba(0,0,0,0.3)";
                          const actions = e.currentTarget.querySelector(".card-actions");
                          if (actions) actions.style.opacity = "1";
                        }}
                        onMouseLeave={e => {
                          e.currentTarget.style.background = "rgba(255,255,255,0.02)";
                          e.currentTarget.style.borderColor = isSelected ? T.teal : T.white + "08";
                          e.currentTarget.style.transform = "translateY(0)";
                          e.currentTarget.style.boxShadow = isSelected ? `0 10px 30px ${T.teal}20` : "0 4px 20px rgba(0,0,0,0.1)";
                          const actions = e.currentTarget.querySelector(".card-actions");
                          if (actions) actions.style.opacity = "0";
                        }}
                      >
                        <input type="checkbox" checked={isSelected}
                          onChange={(e) => {
                            e.stopPropagation();
                            setSelectedIds(prev => e.target.checked ? [...prev, deal.id] : prev.filter(id => id !== deal.id));
                          }}
                          style={{ position: "absolute", top: 16, right: 16, cursor: "pointer", zIndex: 10, opacity: isSelected ? 1 : 0.3 }}
                        />

                        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 12 }}>
                          <div style={{ flex: 1 }}>
                             <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                               <div style={{ width: 6, height: 6, borderRadius: "50%", background: dStat.color, boxShadow: `0 0 10px ${dStat.color}` }} />
                               <span style={{ fontSize: 10, fontWeight: 900, color: T.whiteFade, letterSpacing: ".1em", textTransform: "uppercase" }}>{dStat.label}</span>
                             </div>
                             <div style={{ fontSize: 14, fontWeight: 700, color: T.white, lineHeight: 1.4 }}>{deal.titulo}</div>
                          </div>
                          
                          <div className="card-actions" style={{ display: "flex", gap: 6, opacity: 0, transition: "opacity .3s" }}>
                             <button onClick={async e => {
                               e.stopPropagation();
                               const ets = pipeline?.etapas || [];
                               const etGanada = ets.find(et => et.es_ganado) || ets[ets.length - 1];
                               const act = { ...deal, etapa_id: etGanada?.id, prob: 100 };
                               setDb(d => ({ ...d, deals: d.deals?.map(dl => dl.id === deal.id ? act : dl) }));
                               await guardarEnSupa("deals", act);
                               setShowConfetti(true);
                               setTimeout(() => setShowConfetti(false), 4000);
                             }} style={{ background: "rgba(16,185,129,0.1)", border: `1px solid ${T.green}40`, borderRadius: 8, padding: "4px 8px", cursor: "pointer", color: T.green, fontSize: 11 }}>Win</button>
                             <button onClick={e => { e.stopPropagation(); setEditDeal(deal); setShowDealForm(true); }} style={{ background: "rgba(255,255,255,0.05)", border: `1px solid ${T.white}10`, borderRadius: 8, padding: "4px 8px", cursor: "pointer", color: T.whiteDim, fontSize: 11 }}>Edit</button>
                          </div>
                        </div>

                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 14 }}>
                           <div style={{ fontSize: 18, fontWeight: 900, color: T.teal }}>{money(deal.valor)}</div>
                           <div style={{ fontSize: 10, color: T.whiteFade, fontWeight: 600 }}>{fdate(deal.creado)}</div>
                        </div>

                        {/* INFO DENSITY: ALWAYS VISIBLE */}
                        <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 12, paddingTop: 12, borderTop: `1px solid ${T.white}08` }}>
                           {contacto && (
                             <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                               <Ico k="user" size={10} style={{ color: T.teal, opacity: 0.7 }} />
                               <span style={{ fontSize: 11, color: T.whiteOff, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{contacto.nombre}</span>
                             </div>
                           )}
                           <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                              <div style={{ width: 18, height: 18, borderRadius: "50%", background: T.bg3, border: `1px solid ${T.white}10`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 9, fontWeight: 900, color: T.teal }}>
                                {deal.responsable?.[0] || "?"}
                              </div>
                              <span style={{ fontSize: 11, color: T.whiteDim }}>{deal.responsable}</span>
                           </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* VISTA DE LISTA — TABULAR */}
      {tab === "lista" && pipeline && (
        <div style={{ background: T.bg1, border: `1px solid ${T.borderHi}`, borderRadius: 16, overflow: "hidden" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr style={{ background: "rgba(255,255,255,0.02)", borderBottom: `1px solid ${T.borderHi}` }}>
                <th style={{ padding: "12px 16px", textAlign: "left", width: 40 }}>
                  <input type="checkbox"
                    checked={selectedIds.length === plDeals.length && plDeals.length > 0}
                    onChange={e => setSelectedIds(e.target.checked ? plDeals.map(d => d.id) : [])}
                    style={{ cursor: "pointer" }}
                  />
                </th>
                <th style={{ padding: "12px 16px", textAlign: "left", color: T.whiteDim, fontWeight: 700, fontSize: 11, textTransform: "uppercase" }}>Estado</th>
                <th style={{ padding: "12px 16px", textAlign: "left", color: T.whiteDim, fontWeight: 700, fontSize: 11, textTransform: "uppercase" }}>Negocio</th>
                <th style={{ padding: "12px 16px", textAlign: "left", color: T.whiteDim, fontWeight: 700, fontSize: 11, textTransform: "uppercase" }}>Contacto</th>
                <th style={{ padding: "12px 16px", textAlign: "left", color: T.whiteDim, fontWeight: 700, fontSize: 11, textTransform: "uppercase" }}>Monto</th>
                <th style={{ padding: "12px 16px", textAlign: "left", color: T.whiteDim, fontWeight: 700, fontSize: 11, textTransform: "uppercase" }}>Etapa</th>
                <th style={{ padding: "12px 16px", textAlign: "left", color: T.whiteDim, fontWeight: 700, fontSize: 11, textTransform: "uppercase" }}>Responsable</th>
                <th style={{ padding: "12px 16px", textAlign: "left", color: T.whiteDim, fontWeight: 700, fontSize: 11, textTransform: "uppercase" }}>Fecha</th>
              </tr>
            </thead>
            <tbody>
              {plDeals.map(deal => {
                const etapa = pipeline?.etapas?.find(e => e.id === deal.etapa_id) || {};
                const contacto = db.contactos?.find(c => c.id === deal.contacto_id);
                const dStat = getDealStatus(deal);
                const isSelected = selectedIds.includes(deal.id);

                return (
                  <tr key={deal.id}
                    onClick={() => { setEditDeal(deal); setShowDealForm(true); }}
                    style={{ borderBottom: `1px solid ${T.borderHi}`, cursor: "pointer", transition: "background 0.2s", background: isSelected ? T.tealGlow : "transparent" }}
                    onMouseEnter={e => e.currentTarget.style.background = "rgba(255,255,255,0.03)"}
                    onMouseLeave={e => e.currentTarget.style.background = isSelected ? T.tealGlow : "transparent"}
                  >
                    <td style={{ padding: "12px 16px" }} onClick={e => e.stopPropagation()}>
                      <input type="checkbox"
                        checked={isSelected}
                        onChange={e => setSelectedIds(prev => e.target.checked ? [...prev, deal.id] : prev.filter(id => id !== deal.id))}
                        style={{ cursor: "pointer" }}
                      />
                    </td>
                    <td style={{ padding: "12px 16px" }}>
                      <div title={dStat.desc} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <div style={{ width: 8, height: 8, borderRadius: "50%", background: dStat.color }} />
                        <span style={{ fontSize: 16 }}>{dStat.icon}</span>
                      </div>
                    </td>
                    <td style={{ padding: "12px 16px", fontWeight: 700, color: T.white }}>{deal.titulo}</td>
                    <td style={{ padding: "12px 16px", color: T.whiteOff }}>{contacto?.nombre || "—"}</td>
                    <td style={{ padding: "12px 16px", fontWeight: 800, color: T.green }}>{money(deal.valor)}</td>
                    <td style={{ padding: "12px 16px" }}>
                      <div style={{ display: "inline-block", background: etapa.color.startsWith("#") ? etapa.color + "20" : etapa.color, color: etapa.color, border: `1px solid ${etapa.color}`, padding: "2px 8px", borderRadius: 12, fontSize: 10, fontWeight: 800, textTransform: "uppercase" }}>
                        {etapa.nombre}
                      </div>
                    </td>
                    <td style={{ padding: "12px 16px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <div style={{ width: 20, height: 20, borderRadius: "50%", background: etapa.color, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 9, fontWeight: 900 }}>
                          {(deal.responsable || "?")[0].toUpperCase()}
                        </div>
                        <span style={{ fontSize: 12, color: T.whiteDim }}>{deal.responsable || "Sin asignar"}</span>
                      </div>
                    </td>
                    <td style={{ padding: "12px 16px", color: T.whiteDim, fontSize: 11 }}>{fdate(deal.creado)}</td>
                  </tr>
                );
              })}
              {plDeals.length === 0 && (
                <tr>
                  <td colSpan="8" style={{ padding: 40, textAlign: "center" }}>
                    <Vacio text="No hay deals en esta vista." />
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* CONFIGURADOR */}
      {tab === "configurar" && (
        <div style={{ maxWidth: 800 }}>
          {db.pipelines.map(pl => (
            <Tarjeta key={pl.id} style={{ padding: 24, marginBottom: 20 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 20 }}>
                <div style={{ width: 14, height: 14, borderRadius: "50%", background: pl.color }} />
                <span style={{ fontWeight: 800, fontSize: 16, color: T.white, flex: 1 }}>{pl.nombre}</span>
                {pl.es_principal && <Chip label="Principal" color={T.teal} />}
                <span style={{ fontSize: 13, color: T.whiteDim, fontWeight: 600 }}>{db.deals.filter(d => d.pipeline_id === pl.id).length} deals</span>
                {!pl.es_principal && <Btn variant="peligro" size="sm" onClick={() => { if (confirm("¿Eliminar pipeline?")) setDb(d => ({ ...d, pipelines: d.pipelines.filter(p => p.id !== pl.id) })); }}><Ico k="trash" size={12} />Eliminar</Btn>}
              </div>
              <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 16 }}>
                {pl.etapas.map((et, idx) => (
                  <div key={et.id}
                    draggable
                    onDragStart={() => setDragEtapa({ et, plId: pl.id })}
                    onDragEnd={() => setDragEtapa(null)}
                    onDragOver={e => e.preventDefault()}
                    onDrop={() => {
                      if (!dragEtapa || dragEtapa.plId !== pl.id || dragEtapa.et.id === et.id) return;
                      const etapas = [...pl.etapas];
                      const fromIdx = etapas.findIndex(e => e.id === dragEtapa.et.id);
                      const toIdx = etapas.findIndex(e => e.id === et.id);
                      const [moved] = etapas.splice(fromIdx, 1);
                      etapas.splice(toIdx, 0, moved);
                      actPipeline({ ...pl, etapas: etapas.map((e, i) => ({ ...e, orden: i })) });
                      setDragEtapa(null);
                    }}
                    style={{ cursor: "grab" }}>
                    {etEditando === et.id ? (
                      <div style={{ background: T.bg2, border: `1px solid ${T.borderHi}`, borderRadius: 10, padding: 16, minWidth: 200, boxShadow: "0 4px 15px rgba(0,0,0,0.05)" }}>
                        <Inp value={et.nombre} onChange={e => actPipeline({ ...pl, etapas: pl.etapas.map(s => s.id === et.id ? { ...s, nombre: e.target.value } : s) })} style={{ marginBottom: 12 }} />
                        <div style={{ marginBottom: 12 }}><SelColor value={et.color} onChange={c => actPipeline({ ...pl, etapas: pl.etapas.map(s => s.id === et.id ? { ...s, color: c } : s) })} /></div>
                        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
                          <span style={{ fontSize: 11, color: T.whiteDim, fontWeight: 700 }}>Prob %</span>
                          <Inp type="number" value={et.probabilidad} onChange={e => actPipeline({ ...pl, etapas: pl.etapas.map(s => s.id === et.id ? { ...s, probabilidad: +e.target.value } : s) })} style={{ flex: 1 }} />
                        </div>
                        <div style={{ display: "flex", gap: 8 }}>
                          <Btn variant="exito" size="sm" onClick={() => setEtEditando(null)}>OK</Btn>
                          {!et.es_ganado && !et.es_perdido && <Btn variant="peligro" size="sm" onClick={() => { actPipeline({ ...pl, etapas: pl.etapas.filter(s => s.id !== et.id) }); setEtEditando(null); }}>Del</Btn>}
                        </div>
                      </div>
                    ) : (
                      <div style={{ display: "flex", gap: 8, alignItems: "center", background: T.bg1, border: `1px solid ${T.borderHi}`, borderLeft: `3px solid ${et.color}`, borderRadius: 8, padding: "8px 14px", cursor: "pointer", transition: "all .2s", boxShadow: "0 1px 3px rgba(0,0,0,0.02)" }}
                        onClick={() => setEtEditando(etEditando === et.id ? null : et.id)}
                        onMouseEnter={e => e.currentTarget.style.transform = "translateY(-1px)"}
                        onMouseLeave={e => e.currentTarget.style.transform = ""}>
                        <span style={{ fontSize: 13, fontWeight: 700, color: T.white, whiteSpace: "nowrap" }}>{et.nombre}</span>
                        <span style={{ fontSize: 11, color: T.whiteDim, fontWeight: 600 }}>{et.probabilidad}%</span>
                        <Ico k="edit" size={12} style={{ color: T.whiteDim }} />
                      </div>
                    )}
                  </div>
                ))}
                {pl.id === plActivo && (showNuevaEt ? (
                  <div style={{ background: T.bg2, border: `1px solid ${T.borderHi}`, borderRadius: 10, padding: 16, minWidth: 200, boxShadow: "0 4px 15px rgba(0,0,0,0.05)" }}>
                    <Inp value={nuevaEt.nombre} onChange={e => setNuevaEt(p => ({ ...p, nombre: e.target.value }))} placeholder="Nombre etapa" style={{ marginBottom: 12 }} />
                    <div style={{ marginBottom: 12 }}><SelColor value={nuevaEt.color} onChange={c => setNuevaEt(p => ({ ...p, color: c }))} /></div>
                    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
                      <span style={{ fontSize: 11, color: T.whiteDim, fontWeight: 700 }}>Prob %</span>
                      <Inp type="number" value={nuevaEt.probabilidad} onChange={e => setNuevaEt(p => ({ ...p, probabilidad: e.target.value }))} style={{ flex: 1 }} />
                    </div>
                    <div style={{ display: "flex", gap: 8 }}>
                      <Btn onClick={agregarEtapa} disabled={!nuevaEt.nombre.trim()} size="sm">Agregar</Btn>
                      <Btn variant="secundario" size="sm" onClick={() => setShowNuevaEt(false)}>Cancelar</Btn>
                    </div>
                  </div>
                ) : (
                  <button onClick={() => setShowNuevaEt(true)} style={{ display: "flex", alignItems: "center", gap: 6, background: "transparent", border: `2px dashed ${T.borderHi}`, borderRadius: 8, padding: "8px 14px", color: T.whiteDim, cursor: "pointer", fontSize: 13, fontWeight: 600, fontFamily: "inherit" }}>
                    <Ico k="plus" size={14} />Etapa
                  </button>
                ))}
              </div>
              <div style={{ fontSize: 11, color: T.teal, fontWeight: 600, background: T.tealSoft, padding: "8px 12px", borderRadius: 6, display: "inline-block" }}>💡 Haz click en una etapa para editarla · <strong>Arrastra las etapas para reordenarlas</strong></div>
            </Tarjeta>
          ))}
        </div>
      )}

      <Modal open={showNuevoPL} onClose={() => setShowNuevoPL(false)} title="Nuevo Pipeline" width={460}>
        <Campo label="Nombre del Pipeline"><Inp value={nuevoPL.nombre} onChange={e => setNuevoPL(p => ({ ...p, nombre: e.target.value }))} placeholder="ej. Partnerships" /></Campo>
        <div style={{ marginTop: 16 }}><span style={{ fontSize: 11, fontWeight: 700, color: T.whiteDim, textTransform: "uppercase", letterSpacing: ".05em", display: "block", marginBottom: 8 }}>Color</span><SelColor value={nuevoPL.color} onChange={c => setNuevoPL(p => ({ ...p, color: c }))} /></div>
        <div style={{ display: "flex", gap: 12, justifyContent: "flex-end", marginTop: 24 }}>
          <Btn variant="secundario" onClick={() => setShowNuevoPL(false)}>Cancelar</Btn>
          <Btn onClick={crearPipeline} disabled={!nuevoPL.nombre.trim()}>Crear Pipeline</Btn>
        </div>
      </Modal>

      <Modal open={showDealForm} onClose={() => { setShowDealForm(false); setEditDeal(null); }} title={editDeal ? "Editar Deal" : "Nuevo Deal"} width={editDeal ? 1200 : 680}>
        <FormDeal
          db={db}
          setDb={setDb}
          f={f}
          setF={setF}
          editDeal={editDeal}
          onGuardar={guardarDeal}
          onCancelar={() => { setShowDealForm(false); setEditDeal(null); }}
          guardarEnSupa={guardarEnSupa}
          ejecutarAutomaciones={ejecutarAutomaciones}
          setModulo={setModulo}
          setShowConfigCampos={setShowConfigCampos}
          focusEmailId={focusEmailId}
          setFocusEmailId={setFocusEmailId}
        />
      </Modal>
      {/* CONFIGURACIÓN DE CAMPOS PERSONALIZADOS */}
      <Modal open={showConfigCampos} onClose={() => setShowConfigCampos(false)} title="Configurar Campos Globales" width={500}>
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          <div style={{ background: T.bg2, padding: 16, borderRadius: 10, border: `1px solid ${T.border}` }}>
            <h4 style={{ margin: "0 0 12px", fontSize: 13, color: T.white }}>Crear Nuevo Campo</h4>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <Campo label="Nombre del Campo"><Inp value={nuevoCampo.nombre} onChange={e => setNuevoCampo(p => ({ ...p, nombre: e.target.value }))} placeholder="Eje: Canal de Origen" /></Campo>
              <Campo label="Tipo de Dato">
                <Sel value={nuevoCampo.tipo} onChange={e => setNuevoCampo(p => ({ ...p, tipo: e.target.value }))}>
                  <option value="cadena">Cadena (Texto)</option>
                  <option value="lista">Lista (Selección)</option>
                  <option value="fecha">Fecha</option>
                  <option value="dinero">Dinero</option>
                  <option value="numero">Número</option>
                  <option value="si_no">Sí/No</option>
                </Sel>
              </Campo>
              {nuevoCampo.tipo === "lista" && (
                <Campo label="Opciones (separadas por coma)"><Inp value={nuevoCampo.opciones} onChange={e => setNuevoCampo(p => ({ ...p, opciones: e.target.value }))} placeholder="Opción 1, Opción 2..." /></Campo>
              )}
              <Btn onClick={crearCampo} disabled={!nuevoCampo.nombre.trim()} style={{ marginTop: 8 }}>Crear campo global</Btn>
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <h4 style={{ margin: 0, fontSize: 13, color: T.whiteDim }}>Campos Existentes</h4>
            {db.campos_personalizados?.map(cf => (
              <div key={cf.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: T.bg1, padding: "10px 14px", borderRadius: 8, border: `1px solid ${T.borderHi}` }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: T.white }}>{cf.nombre}</div>
                  <div style={{ fontSize: 11, color: T.whiteDim }}>Tipo: {cf.tipo}</div>
                </div>
                <Btn variant="fantasma" size="sm" onClick={() => eliminarCampo(cf.id)} style={{ color: T.red }}><Ico k="trash" size={12} /></Btn>
              </div>
            ))}
            {(!db.campos_personalizados || db.campos_personalizados.length === 0) && <Vacio text="No hay campos personalizados." />}
          </div>
        </div>
      </Modal>

      {/* BARRA DE ACCIONES MASIVAS */}
      {selectedIds.length > 0 && (
        <div style={{ position: "fixed", bottom: 24, left: "50%", transform: "translateX(-50%)", background: T.bg1, border: `1px solid ${T.teal}`, borderRadius: 12, padding: "12px 24px", display: "flex", alignItems: "center", gap: 24, boxShadow: "0 20px 25px -5px rgba(0,0,0,0.5)", zIndex: 10000, animation: "pop-up 0.3s cubic-bezier(0.18, 0.89, 0.32, 1.28)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <span style={{ fontSize: 13, fontWeight: 800, color: T.teal }}>{selectedIds.length} seleccionados</span>
            <Btn variant="fantasma" size="xs" onClick={() => setSelectedIds([])} style={{ color: T.whiteDim }}>Deseleccionar</Btn>
          </div>

          <div style={{ height: 24, width: 1, background: T.border }} />

          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <span style={{ fontSize: 11, color: T.whiteDim, fontWeight: 700 }}>ACCIONES:</span>

            <Sel value="" onChange={e => handleBulkStage(e.target.value)} style={{ width: 140, fontSize: 11, padding: "6px 10px" }}>
              <option value="">Cambiar Etapa...</option>
              {pipeline?.etapas?.map(et => <option key={et.id} value={et.id}>{et.nombre}</option>)}
            </Sel>

            <Sel value="" onChange={e => handleBulkResp(e.target.value)} style={{ width: 140, fontSize: 11, padding: "6px 10px" }}>
              <option value="">Cambiar Responsable...</option>
              {db.usuariosApp?.map(u => <option key={u.id} value={u.name}>{u.name}</option>)}
            </Sel>

            <Btn variant="peligro" size="sm" onClick={handleBulkDelete}><Ico k="trash" size={14} /> Eliminar</Btn>
          </div>
          <style>{`@keyframes pop-up { from { opacity:0; transform:translate(-50%, 20px); } to { opacity:1; transform:translate(-50%, 0); } }`}</style>
        </div>
      )}

      <BulkImport open={showImport} onClose={() => setShowImport(false)} onImport={handleBulkImport} type="deals" />
    </div>
  );
};
