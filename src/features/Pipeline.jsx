import { useState } from "react";
import { T } from "../theme";
import { uid, money, fdate } from "../utils";
import { Chip, Btn, Inp, Sel } from "../components/ui";
import { Campo, Modal, Tarjeta, SelColor, EncabezadoSeccion, ControlSegmentado, Ico, Barra } from "../components/ui";
import { WhatsAppHistoryLead } from "./WhatsAppHistoryLead";

export const Pipeline = ({ db, setDb, guardarEnSupa, eliminarDeSupa, t }) => {
  const [plActivo, setPlActivo] = useState(db.pipelines[0]?.id || "");
  const [tab, setTab] = useState("kanban");
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

  const pipeline = db.pipelines.find(p => p.id === plActivo);
  const plDeals = db.deals.filter(d => d.pipelineId === plActivo);

  const actPipeline = up => setDb(d => ({ ...d, pipelines: d.pipelines.map(p => p.id === up.id ? up : p) }));

  const crearPipeline = () => {
    if (!nuevoPL.nombre.trim()) return;
    const np = {
      id: "pl" + uid(), nombre: nuevoPL.nombre, color: nuevoPL.color, esPrincipal: false, etapas: [
        { id: "e" + uid(), nombre: "Nuevo Lead", color: T.whiteDim, orden: 0, probabilidad: 10 },
        { id: "e" + uid(), nombre: "En Proceso", color: "#60A5FA", orden: 1, probabilidad: 40 },
        { id: "e" + uid(), nombre: "Propuesta", color: "#A78BFA", orden: 2, probabilidad: 60 },
        { id: "e" + uid(), nombre: "Ganado", color: T.green, orden: 3, probabilidad: 100, esGanado: true },
        { id: "e" + uid(), nombre: "Perdido", color: T.red, orden: 4, probabilidad: 0, esPerdido: true },
      ]
    };
    setDb(d => ({ ...d, pipelines: [...d.pipelines, np] }));
    setPlActivo(np.id); setShowNuevoPL(false); setNuevoPL({ nombre: "", color: T.teal });
  };

  const agregarEtapa = () => {
    if (!nuevaEt.nombre.trim()) return;
    const et = { id: "e" + uid(), nombre: nuevaEt.nombre, color: nuevaEt.color, probabilidad: +nuevaEt.probabilidad, orden: pipeline.etapas.length };
    actPipeline({ ...pipeline, etapas: [...pipeline.etapas, et] });
    setShowNuevaEt(false); setNuevaEt({ nombre: "", color: T.teal, probabilidad: 50 });
  };

  const FormDeal = ({ init = {}, onGuardar, onCancelar }) => {
    const [f, setF] = useState({ titulo: "", contactoId: "", empresaId: "", pipelineId: plActivo, etapaId: pipeline?.etapas[0]?.id || "", valor: 0, prob: 50, fechaCierre: "", responsable: db.usuario?.name || "", etiquetas: "", notas: "", archivos: [], customFields: [], ...init, etiquetas: (init.etiquetas || []).join(", ") });
    const [dragActive, setDragActive] = useState(false);

    const s = k => e => setF(p => ({ ...p, [k]: e.target.value }));
    const plActual = db.pipelines.find(p => p.id === f.pipelineId);

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
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
        <Campo label="Título del Deal *" col={2}><Inp value={f.titulo} onChange={s("titulo")} placeholder="ej. Acme — Plan Enterprise" style={{ fontSize: 15, fontWeight: 700 }} /></Campo>

        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <Campo label="Pipeline"><Sel value={f.pipelineId} onChange={e => setF(p => ({ ...p, pipelineId: e.target.value, etapaId: db.pipelines.find(pl => pl.id === e.target.value)?.etapas[0]?.id || "" }))}>{db.pipelines.map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}</Sel></Campo>
          <Campo label="Etapa"><Sel value={f.etapaId} onChange={s("etapaId")}>{plActual?.etapas.map(e => <option key={e.id} value={e.id}>{e.nombre}</option>)}</Sel></Campo>
          <Campo label="Contacto Asociado"><Sel value={f.contactoId} onChange={s("contactoId")}><option value="">— Ninguno —</option>{db.contactos.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}</Sel></Campo>
          <Campo label="Empresa (B2B)"><Sel value={f.empresaId} onChange={s("empresaId")}><option value="">— Ninguna —</option>{db.empresas.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}</Sel></Campo>
          <Campo label="Responsable"><Inp value={f.responsable} onChange={s("responsable")} placeholder="Propietario del deal" /></Campo>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <Campo label="Monto Estimado ($)"><Inp type="number" value={f.valor} onChange={s("valor")} style={{ fontWeight: 800, color: T.green }} /></Campo>
            <Campo label="Probabilidad (%)"><Inp type="number" value={f.prob} onChange={s("prob")} style={{ fontWeight: 800 }} /></Campo>
          </div>
          <Campo label="Fecha de Cierre"><Inp type="date" value={f.fechaCierre} onChange={s("fechaCierre")} /></Campo>
          <Campo label="Etiquetas (separadas por coma)"><Inp value={f.etiquetas} onChange={s("etiquetas")} placeholder="urgente, demo, renovar" /></Campo>
          <Campo label="Contexto / Notas del Deal"><Inp value={f.notas} onChange={s("notas")} rows={3} placeholder="Detalles de la oportunidad..." /></Campo>
        </div>

        <div style={{ gridColumn: "span 2", display: "flex", flexDirection: "column", gap: 12 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: `1px solid ${T.borderHi}`, paddingBottom: 8, marginTop: 10 }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: T.whiteDim, textTransform: "uppercase", letterSpacing: ".05em" }}>Campos Personalizados / Info Form</span>
            <Btn variant="fantasma" size="sm" onClick={() => setF(p => ({ ...p, customFields: [...(p.customFields || []), { nombre: "", valor: "" }] }))}><Ico k="plus" size={14} style={{ color: T.teal }} /> Agregar Campo Extra</Btn>
          </div>
          {f.customFields?.map((cf, i) => (
            <div key={i} style={{ display: "flex", gap: 12, alignItems: "center", background: T.bg2, padding: "8px 12px", borderRadius: 8, border: `1px solid ${T.borderHi}` }}>
              <Inp value={cf.nombre} onChange={e => setF(p => ({ ...p, customFields: p.customFields.map((c, idx) => idx === i ? { ...c, nombre: e.target.value } : c) }))} placeholder="Atributo (ej. Region)" style={{ flex: 1, fontWeight: 700 }} />
              <Inp value={cf.valor} onChange={e => setF(p => ({ ...p, customFields: p.customFields.map((c, idx) => idx === i ? { ...c, valor: e.target.value } : c) }))} placeholder="Valor (ej. LATAM)" style={{ flex: 2 }} />
              <button onClick={() => setF(p => ({ ...p, customFields: p.customFields.filter((_, idx) => idx !== i) }))} style={{ background: "transparent", border: "none", color: T.red, cursor: "pointer", padding: 4 }}><Ico k="trash" size={14} /></button>
            </div>
          ))}
          {(!f.customFields || f.customFields.length === 0) && <div style={{ fontSize: 12, color: T.whiteDim, fontStyle: "italic" }}>No se han agregado variables dinámicas.</div>}
        </div>

        <Campo label="Archivos y Documentos Adjuntos (Contratos, Imágenes)" col={2}>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <div onDragEnter={e => { e.preventDefault(); setDragActive(true); }} onDragLeave={e => { e.preventDefault(); setDragActive(false); }} onDragOver={e => e.preventDefault()} onDrop={handleDrop}
              style={{ border: `2px dashed ${dragActive ? T.teal : T.borderHi}`, borderRadius: 12, padding: "30px 20px", textAlign: "center", background: dragActive ? T.teal + "10" : T.bg2, transition: "all .2s", cursor: "pointer" }}>
              <Ico k="document" size={24} style={{ color: dragActive ? T.teal : T.whiteDim, marginBottom: 8 }} />
              <div style={{ fontSize: 13, fontWeight: 700, color: dragActive ? T.teal : T.whiteOff }}>{dragActive ? "Suelta los archivos aquí..." : "Arrastra y suelta imágenes o documentos aquí"}</div>
              <div style={{ fontSize: 11, color: T.whiteDim, marginTop: 4 }}>Soporta JPG, PNG, PDF, DOCX (Máx 20MB)</div>
            </div>
            {f.archivos?.length > 0 && (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: 12, marginTop: 8 }}>
                {f.archivos.map(a => (
                  <div key={a.id} style={{ border: `1px solid ${T.borderHi}`, borderRadius: 8, padding: 8, display: "flex", gap: 10, alignItems: "center", background: T.bg1, position: "relative", overflow: "hidden" }}>
                    {a.tipo === "img" && a.url ? (
                      <div style={{ width: 40, height: 40, borderRadius: 6, backgroundImage: `url(${a.url})`, backgroundSize: "cover", backgroundPosition: "center", flexShrink: 0 }} />
                    ) : (
                      <div style={{ width: 40, height: 40, borderRadius: 6, background: T.teal + "15", color: T.teal, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}><Ico k="document" size={18} /></div>
                    )}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 12, fontWeight: 700, color: T.white, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{a.nombre}</div>
                      <div style={{ fontSize: 10, color: T.whiteDim }}>{a.size}</div>
                    </div>
                    <button onClick={() => quitarArchivo(a.id)} style={{ background: "transparent", border: "none", color: T.red, cursor: "pointer", padding: 4 }} title="Eliminar archivo"><Ico k="x" size={14} /></button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </Campo>

        {f.contactoId && (
          <div style={{ gridColumn: "span 2", borderTop: `1px solid ${T.border}`, paddingTop: 20 }}>
            <WhatsAppHistoryLead telefono={db.contactos.find(c => c.id === f.contactoId)?.telefono} />
          </div>
        )}

        <div style={{ gridColumn: "span 2", display: "flex", gap: 12, justifyContent: "flex-end", paddingTop: 20, borderTop: `1px solid ${T.border}` }}>
          <Btn variant="secundario" onClick={onCancelar}>No Guardar</Btn>
          <Btn onClick={() => { if (!f.titulo.trim()) return; onGuardar({ ...f, valor: +f.valor, prob: +f.prob, etiquetas: f.etiquetas.split(",").map(t => t.trim()).filter(Boolean) }); }} style={{ padding: "10px 24px" }}><Ico k="check" size={16} /> Guardar Deal</Btn>
        </div>
      </div>
    );
  };

  const guardarDeal = async (form) => {
    if (editDeal) {
      const act = { ...editDeal, ...form };
      setDb(d => ({ ...d, deals: d.deals.map(deal => deal.id === editDeal.id ? act : deal) }));
      await guardarEnSupa("deals", act);
    } else {
      const nv = { ...form, id: "d" + uid(), creado: new Date().toISOString().slice(0, 10) };
      setDb(d => ({ ...d, deals: [nv, ...d.deals] }));
      await guardarEnSupa("deals", nv);
    }
    setShowDealForm(false); setEditDeal(null); setPreEtapa(null);
  };

  const eliminarDeal = async (id) => {
    if (!confirm("¿Eliminar deal?")) return;
    setDb(d => ({ ...d, deals: d.deals.filter(deal => deal.id !== id) }));
    await eliminarDeSupa("deals", id);
  };

  return (
    <div>
      <EncabezadoSeccion title="Pipeline CRM" sub="Gestiona tus oportunidades en etapas visuales"
        actions={
          <div style={{ display: "flex", gap: 12 }}>
            <ControlSegmentado value={tab} onChange={setTab} options={[{ value: "kanban", label: "Kanban", icon: "board" }, { value: "configurar", label: "Configurar", icon: "cog" }]} />
            <Btn onClick={() => { setEditDeal(null); setPreEtapa(null); setShowDealForm(true); }}><Ico k="plus" size={14} />Nuevo Deal</Btn>
          </div>
        } />

      <div style={{ display: "flex", gap: 16, marginBottom: 24, alignItems: "center", flexWrap: "wrap" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, background: T.bg1, border: `1px solid ${T.borderHi}`, borderRadius: 10, padding: "6px 16px", boxShadow: "0 2px 4px rgba(0,0,0,0.02)" }}>
          <span style={{ fontSize: 13, fontWeight: 700, color: T.whiteDim }}>Pipeline Activo:</span>
          <select value={plActivo} onChange={e => setPlActivo(e.target.value)}
            style={{ border: "none", background: "transparent", fontSize: 15, fontWeight: 800, color: T.teal, outline: "none", cursor: "pointer", paddingRight: 8, fontFamily: "inherit" }}>
            {db.pipelines.map(pl => <option key={pl.id} value={pl.id}>{pl.nombre} ({db.deals.filter(d => d.pipelineId === pl.id).length})</option>)}
          </select>
        </div>
        <Btn variant="fantasma" size="sm" onClick={() => setShowNuevoPL(true)}><Ico k="plus" size={14} />Nuevo Pipeline</Btn>
      </div>

      {/* KANBAN */}
      {tab === "kanban" && pipeline && (
        <div style={{ display: "flex", gap: 16, overflowX: "auto", paddingBottom: 20, minHeight: "60vh", alignItems: "flex-start" }}>
          {pipeline.etapas.map(etapa => {
            const etDeals = plDeals.filter(d => d.etapaId === etapa.id);
            const isOver = dragSobre === etapa.id;
            return (
              <div key={etapa.id} style={{ minWidth: 280, maxWidth: 280, display: "flex", flexDirection: "column", gap: 12, flexShrink: 0, paddingBottom: 20 }}
                onDragOver={e => { e.preventDefault(); setDragSobre(etapa.id); }}
                onDrop={e => { e.preventDefault(); if (dragDeal) setDb(d => ({ ...d, deals: d.deals.map(deal => deal.id === dragDeal.id ? { ...deal, etapaId: etapa.id } : deal) })); setDragDeal(null); setDragSobre(null); }}
                onDragLeave={() => setDragSobre(null)}>
                <div style={{ background: isOver ? etapa.color + "12" : T.bg1, borderTop: `4px solid ${etapa.color}`, borderRight: `1px solid ${T.borderHi}`, borderBottom: `1px solid ${T.borderHi}`, borderLeft: `1px solid ${T.borderHi}`, borderRadius: 10, padding: "14px 16px", boxShadow: "0 2px 4px rgba(0,0,0,0.02)" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                    <span style={{ fontSize: 14, fontWeight: 800, color: T.white, flex: 1 }}>{etapa.nombre}</span>
                    <span style={{ background: etapa.color + "20", color: etapa.color, borderRadius: 10, padding: "2px 8px", fontSize: 11, fontWeight: 800 }}>{etDeals.length}</span>
                  </div>
                  <div style={{ fontSize: 13, fontWeight: 800, color: T.teal, marginBottom: 4 }}>{money(etDeals.reduce((s, d) => s + d.valor, 0))}</div>
                  <div style={{ fontSize: 11, color: T.whiteDim, fontWeight: 600 }}>Probabilidad: {etapa.probabilidad}%</div>
                </div>

                {etDeals.map(deal => {
                  const contacto = db.contactos.find(c => c.id === deal.contactoId);
                  const pc = deal.prob >= 70 ? T.green : deal.prob >= 40 ? T.amber : T.red;
                  return (
                    <div key={deal.id} draggable onDragStart={() => setDragDeal(deal)}
                      style={{ background: T.bg1, border: `1px solid ${T.borderHi}`, borderRadius: 10, padding: 14, cursor: "grab", userSelect: "none", transition: "all .2s", boxShadow: "0 2px 5px rgba(0,0,0,0.03)" }}
                      onMouseEnter={e => { e.currentTarget.style.borderColor = etapa.color + "70"; e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.boxShadow = "0 8px 20px rgba(0,0,0,0.06)"; }}
                      onMouseLeave={e => { e.currentTarget.style.borderColor = T.borderHi; e.currentTarget.style.transform = ""; e.currentTarget.style.boxShadow = "0 2px 5px rgba(0,0,0,0.03)"; }}>
                      <div style={{ fontSize: 14, fontWeight: 700, color: T.white, marginBottom: 10, lineHeight: 1.4 }}>{deal.titulo}</div>
                      {contacto && <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 10 }}><div style={{ width: 24, height: 24, borderRadius: "50%", background: contacto.color + "20", color: contacto.color, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 9, fontWeight: 700 }}>{contacto.avatar}</div><span style={{ fontSize: 12, color: T.whiteOff, fontWeight: 600 }}>{contacto.nombre}</span></div>}
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8, alignItems: "center" }}>
                        <span style={{ fontSize: 15, fontWeight: 800, color: T.green }}>{money(deal.valor)}</span>
                        <span style={{ fontSize: 11, fontWeight: 800, color: pc, background: pc + "15", padding: "2px 8px", borderRadius: 10 }}>{deal.prob}%</span>
                      </div>
                      <Barra value={deal.prob} color={pc} h={5} />
                      {deal.fechaCierre && <div style={{ fontSize: 11, color: T.whiteDim, marginTop: 10, fontWeight: 500 }}>📅 Cierra {fdate(deal.fechaCierre)}</div>}
                      <div style={{ display: "flex", gap: 6, marginTop: 12, justifyContent: "flex-end" }} onClick={e => e.stopPropagation()}>
                        <Btn variant="secundario" size="sm" onClick={() => { setEditDeal(deal); setShowDealForm(true); }}><Ico k="edit" size={12} /></Btn>
                        <Btn variant="fantasma" size="sm" onClick={() => eliminarDeal(deal.id)}><Ico k="trash" size={12} style={{ color: T.red }} /></Btn>
                      </div>
                    </div>
                  );
                })}

                <button onClick={() => { setEditDeal(null); setPreEtapa(etapa.id); setShowDealForm(true); }}
                  style={{ background: "transparent", border: `2px dashed ${T.borderHi}`, borderRadius: 10, padding: "12px", color: T.whiteDim, cursor: "pointer", fontSize: 12, fontWeight: 600, display: "flex", alignItems: "center", gap: 6, justifyContent: "center", fontFamily: "inherit", transition: "all .2s" }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = etapa.color; e.currentTarget.style.color = etapa.color; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = T.borderHi; e.currentTarget.style.color = T.whiteDim; }}>
                  <Ico k="plus" size={14} />Agregar deal
                </button>
              </div>
            );
          })}
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
                {pl.esPrincipal && <Chip label="Principal" color={T.teal} />}
                <span style={{ fontSize: 13, color: T.whiteDim, fontWeight: 600 }}>{db.deals.filter(d => d.pipelineId === pl.id).length} deals</span>
                {!pl.esPrincipal && <Btn variant="peligro" size="sm" onClick={() => { if (confirm("¿Eliminar pipeline?")) setDb(d => ({ ...d, pipelines: d.pipelines.filter(p => p.id !== pl.id) })); }}><Ico k="trash" size={12} />Eliminar</Btn>}
              </div>
              <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 16 }}>
                {pl.etapas.map((et, idx) => (
                  <div key={et.id}>
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
                          {!et.esGanado && !et.esPerdido && <Btn variant="peligro" size="sm" onClick={() => { actPipeline({ ...pl, etapas: pl.etapas.filter(s => s.id !== et.id) }); setEtEditando(null); }}>Del</Btn>}
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
              <div style={{ fontSize: 11, color: T.teal, fontWeight: 600, background: T.tealSoft, padding: "8px 12px", borderRadius: 6, display: "inline-block" }}>💡 Haz click en una etapa para editarla · Arrastra deals en el Kanban</div>
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

      <Modal open={showDealForm} onClose={() => { setShowDealForm(false); setEditDeal(null); }} title={editDeal ? "Editar Deal" : "Nuevo Deal"} width={720}>
        <FormDeal init={editDeal || (preEtapa ? { pipelineId: plActivo, etapaId: preEtapa } : { pipelineId: plActivo, etapaId: pipeline?.etapas[0]?.id })} onGuardar={guardarDeal} onCancelar={() => { setShowDealForm(false); setEditDeal(null); }} />
      </Modal>
    </div>
  );
};
