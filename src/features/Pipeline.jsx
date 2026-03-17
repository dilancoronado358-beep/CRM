import { useState } from "react";
import { T } from "../theme";
import { uid, money, fdate } from "../utils";
import { Chip, Btn, Inp, Sel } from "../components/ui";
import { Campo, Modal, Tarjeta, SelColor, EncabezadoSeccion, ControlSegmentado, Ico, Barra, Vacio } from "../components/ui";
import { LeadTimeline } from "./LeadTimeline";

export const Pipeline = ({ db, setDb, guardarEnSupa, eliminarDeSupa, t, setModulo }) => {
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
  const [showConfigCampos, setShowConfigCampos] = useState(false);
  const [nuevoCampo, setNuevoCampo] = useState({ nombre: "", tipo: "cadena", opciones: "" });

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
    const customFieldsDef = db.campos_personalizados || [];
    const [f, setF] = useState({
      titulo: "", contactoId: "", empresaId: "", pipelineId: plActivo, etapaId: pipeline?.etapas[0]?.id || "",
      valor: 0, prob: 50, fechaCierre: "", responsable: db.usuario?.name || "", etiquetas: "", notas: "",
      archivos: [], custom_fields: {}, ...init, etiquetas: (init.etiquetas || []).join(", ")
    });
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

    const stages = plActual?.etapas || [];
    const currentEtIdx = stages.findIndex(s => s.id === f.etapaId);

    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 24, minHeight: 600 }}>
        {/* STAGE SELECTOR (BITRIX STYLE) */}
        <div style={{ display: "flex", width: "100%", gap: 4, paddingBottom: 10 }}>
          {stages.map((st, idx) => {
            const isActive = st.id === f.etapaId;
            const isPast = idx < currentEtIdx;
            const isFuture = idx > currentEtIdx;

            let bg = "#eef2f4";
            let color = "#666";
            let borderColor = "#d4dde1";

            if (isActive) {
              bg = st.color || T.teal;
              color = "#fff";
              borderColor = st.color || T.teal;
            } else if (isPast) {
              bg = (st.color || T.teal) + "30";
              color = st.color || T.teal;
              borderColor = (st.color || T.teal) + "60";
            }

            return (
              <div
                key={st.id}
                onClick={() => setF(p => ({ ...p, etapaId: st.id, prob: st.probabilidad }))}
                style={{
                  flex: 1,
                  height: 32,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 11,
                  fontWeight: 700,
                  cursor: "pointer",
                  background: bg,
                  color: color,
                  border: `1px solid ${borderColor}`,
                  borderRadius: 4,
                  transition: "all .2s",
                  textAlign: "center",
                  padding: "0 4px",
                  textTransform: "uppercase",
                  letterSpacing: ".02em",
                  boxShadow: isActive ? `0 2px 8px ${bg}40` : "none"
                }}
                onMouseEnter={e => { if (!isActive) e.currentTarget.style.borderColor = st.color || T.teal; }}
                onMouseLeave={e => { if (!isActive) e.currentTarget.style.borderColor = borderColor; }}
              >
                {st.nombre}
              </div>
            );
          })}
        </div>

        <div style={{ display: "flex", gap: 32 }}>
          {/* COLUMNA IZQUIERDA: INFORMACIÓN Y CAMPOS */}
          <div style={{ width: 440, display: "flex", flexDirection: "column", gap: 20, flexShrink: 0 }}>
            <div style={{ background: T.bg1, border: `1px solid ${T.border}`, borderRadius: 16, padding: 24 }}>
              <Campo label="Título del Deal *" style={{ marginBottom: 20 }}><Inp value={f.titulo} onChange={s("titulo")} placeholder="ej. Acme — Plan Enterprise" style={{ fontSize: 16, fontWeight: 800 }} /></Campo>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 20 }}>
                <Campo label="Monto ($)"><Inp type="number" value={f.valor} onChange={s("valor")} style={{ fontWeight: 800, color: T.green }} /></Campo>
                <Campo label="Probabilidad (%)"><Inp type="number" value={f.prob} onChange={s("prob")} style={{ fontWeight: 800 }} /></Campo>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                <Campo label="Pipeline"><Sel value={f.pipelineId} onChange={e => setF(p => ({ ...p, pipelineId: e.target.value, etapaId: db.pipelines.find(pl => pl.id === e.target.value)?.etapas[0]?.id || "" }))}>{db.pipelines.map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}</Sel></Campo>
                <Campo label="Etapa"><Sel value={f.etapaId} onChange={s("etapaId")}>{plActual?.etapas.map(e => <option key={e.id} value={e.id}>{e.nombre}</option>)}</Sel></Campo>
                <Campo label="Contacto Asociado"><Sel value={f.contactoId} onChange={s("contactoId")}><option value="">— Ninguno —</option>{db.contactos.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}</Sel></Campo>
                <Campo label="Empresa (B2B)"><Sel value={f.empresaId} onChange={s("empresaId")}><option value="">— Ninguna —</option>{db.empresas.map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}</Sel></Campo>
                <Campo label="Fecha de Cierre"><Inp type="date" value={f.fechaCierre} onChange={s("fechaCierre")} /></Campo>
                <Campo label="Responsable">
                  <Sel value={f.responsable} onChange={s("responsable")}>
                    {db.usuariosApp?.map(u => <option key={u.id} value={u.name}>{u.name}</option>)}
                  </Sel>
                </Campo>
              </div>
            </div>

            <div style={{ background: T.bg1, border: `1px solid ${T.border}`, borderRadius: 16, padding: 24 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: T.whiteDim, textTransform: "uppercase" }}>Campos Personalizados</span>
                <Btn variant="fantasma" size="sm" onClick={() => setShowConfigCampos(true)}><Ico k="plus" size={12} /> Configurar</Btn>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                {customFieldsDef.map(cf => {
                  const val = f.custom_fields?.[cf.id] || "";
                  const setVal = async (v) => {
                    const nextF = { ...f, custom_fields: { ...f.custom_fields, [cf.id]: v } };
                    setF(nextF);
                    // AUTO-SAVE: Si es un deal existente, guardar al momento
                    if (editDeal) {
                      await guardarEnSupa("deals", { ...editDeal, custom_fields: nextF.custom_fields });
                    }
                  };

                  return (
                    <Campo key={cf.id} label={cf.nombre}>
                      {cf.tipo === "lista" ? (
                        <Sel value={val} onChange={e => setVal(e.target.value)}>
                          <option value="">— Seleccionar —</option>
                          {cf.opciones?.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                        </Sel>
                      ) : cf.tipo === "fecha" ? (
                        <Inp type="date" value={val} onChange={e => setVal(e.target.value)} />
                      ) : cf.tipo === "dinero" ? (
                        <div style={{ position: "relative" }}>
                          <span style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: T.green, fontWeight: 800 }}>$</span>
                          <Inp type="number" value={val} onChange={e => setVal(e.target.value)} style={{ paddingLeft: 24 }} />
                        </div>
                      ) : (
                        <Inp value={val} onChange={e => setVal(e.target.value)} placeholder={`Ingresar ${cf.nombre.toLowerCase()}...`} />
                      )}
                    </Campo>
                  );
                })}
                {customFieldsDef.length === 0 && <div style={{ fontSize: 11, color: T.whiteDim, textAlign: "center", fontStyle: "italic" }}>No hay campos adicionales configurados.</div>}
              </div>
            </div>

            <div style={{ display: "flex", gap: 12 }}>
              <Btn variant="secundario" onClick={onCancelar} full>Cerrar</Btn>
              <Btn onClick={() => { if (!f.titulo.trim()) return; onGuardar({ ...f, valor: +f.valor, prob: +f.prob, etiquetas: f.etiquetas.split(",").map(t => t.trim()).filter(Boolean) }); }} full style={{ background: T.teal, color: "#000" }}>Guardar Deal</Btn>
            </div>
          </div>

          {/* COLUMNA DERECHA: TIMELINE (BITRIX STYLE) */}
          <div style={{ flex: 1, minWidth: 400 }}>
            <LeadTimeline
              deal={f}
              contacto={db.contactos.find(c => c.id === f.contactoId)}
              db={db}
              setDb={setDb}
              guardarEnSupa={guardarEnSupa}
              setModulo={setModulo}
            />
          </div>
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

      <Modal open={showDealForm} onClose={() => { setShowDealForm(false); setEditDeal(null); }} title={editDeal ? "Editar Deal" : "Nuevo Deal"} width={editDeal ? 1300 : 720}>
        <FormDeal init={editDeal || (preEtapa ? { pipelineId: plActivo, etapaId: preEtapa } : { pipelineId: plActivo, etapaId: pipeline?.etapas[0]?.id })} onGuardar={guardarDeal} onCancelar={() => { setShowDealForm(false); setEditDeal(null); }} />
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
                  <div style={{ fontSize: 11, color: T.teal, textTransform: "uppercase", fontWeight: 700 }}>{cf.tipo}</div>
                </div>
                <button onClick={() => eliminarCampo(cf.id)} style={{ color: T.red, background: "none", border: "none", cursor: "pointer" }}><Ico k="trash" size={14} /></button>
              </div>
            ))}
            {(!db.campos_personalizados || db.campos_personalizados.length === 0) && <Vacio text="No hay campos personalizados." />}
          </div>
        </div>
      </Modal>
    </div>
  );
};
