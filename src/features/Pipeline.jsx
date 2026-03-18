import { useState, useEffect } from "react";
import { T } from "../theme";
import { uid, money, fdate } from "../utils";
import { Chip, Btn, Inp, Sel, LocalInput } from "../components/ui";
import { Campo, Modal, Tarjeta, SelColor, EncabezadoSeccion, ControlSegmentado, Ico, Barra, Vacio } from "../components/ui";
import { LeadTimeline } from "./LeadTimeline";
import { Cotizaciones } from "./Cotizaciones";

export const Pipeline = ({ db, setDb, guardarEnSupa, eliminarDeSupa, t, setModulo }) => {
  const [plActivo, setPlActivo] = useState(db.pipelines[0]?.id || "");
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

  const calculateLeadScore = (deal) => {
    let score = 0;
    const contacto = db.contactos.find(c => c.id === deal.contacto_id);
    const empresa = db.empresas.find(e => e.id === deal.empresa_id);
    
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
    const pl = db.pipelines.find(p => p.id === deal.pipeline_id);
    const et = pl?.etapas.find(e => e.id === nuevaEtapaId);
    if (!et) return;

    const n = et.nombre.toLowerCase();
    
    // 1. Trigger por Flag: GANADO
    if (et.es_ganado) {
      const t = { 
        id: "t" + uid(), 
        titulo: `🎉 Seguimiento Post-Venta: ${deal.titulo}`, 
        prioridad: "alta", 
        estado: "pendiente", 
        asignado: deal.responsable, 
        vencimiento: new Date(Date.now() + 86400000 * 2).toISOString().slice(0, 10), 
        contacto_id: deal.contacto_id, 
        deal_id: deal.id, 
        descripcion: "Felicidades por el cierre. No olvides contactar al cliente para el onboarding.",
        creado: new Date().toISOString() 
      };
      setDb(prev => ({ ...prev, tareas: [t, ...(prev.tareas || [])] }));
      await guardarEnSupa("tareas", t);
    }

    // 2. Trigger por Nombre: Propuesta / Envío
    if (n.includes("propuesta") || n.includes("envio") || n.includes("enviado")) {
      const t = { 
        id: "t" + uid(), 
        titulo: "📞 Seguimiento Propuesta: " + deal.titulo, 
        prioridad: "alta", 
        estado: "pendiente", 
        asignado: deal.responsable, 
        vencimiento: new Date(Date.now() + 86400000 * 2).toISOString().slice(0, 10), 
        contacto_id: deal.contacto_id, 
        deal_id: deal.id, 
        creado: new Date().toISOString() 
      };
      setDb(prev => ({ ...prev, tareas: [t, ...(prev.tareas || [])] }));
      await guardarEnSupa("tareas", t);
    }

    // 3. Trigger por Nombre: Nuevo / Contacto
    if (n.includes("nuevo") || n.includes("contacto") || n.includes("primero")) {
      const t = { 
        id: "t" + uid(), 
        titulo: "⚡ Primer Contacto: " + deal.titulo, 
        prioridad: "media", 
        estado: "pendiente", 
        asignado: deal.responsable, 
        vencimiento: new Date(Date.now() + 86400000).toISOString().slice(0, 10), 
        contacto_id: deal.contacto_id, 
        deal_id: deal.id, 
        creado: new Date().toISOString() 
      };
      setDb(prev => ({ ...prev, tareas: [t, ...(prev.tareas || [])] }));
      await guardarEnSupa("tareas", t);
    }

    // 4. Trigger por Nombre: Negociación
    if (n.includes("negociación") || n.includes("negociacion")) {
      const t = { 
        id: "t" + uid(), 
        titulo: `📑 Revisar términos: ${deal.titulo}`, 
        prioridad: "media", 
        estado: "pendiente", 
        asignado: deal.responsable, 
        vencimiento: new Date(Date.now() + 86400000).toISOString().slice(0, 10), 
        contacto_id: deal.contacto_id, 
        deal_id: deal.id, 
        creado: new Date().toISOString() 
      };
      setDb(prev => ({ ...prev, tareas: [t, ...(prev.tareas || [])] }));
      await guardarEnSupa("tareas", t);
    }
  };


  // Estado del formulario de Deal elevado al nivel de Pipeline para sobrevivir re-renders de Supabase Realtime.
  const defaultF = () => ({
    titulo: "", contacto_id: "", empresa_id: "",
    pipeline_id: db.pipelines[0]?.id || "",
    etapa_id: db.pipelines[0]?.etapas?.[0]?.id || "",
    valor: 0, prob: 50, fecha_cierre: "",
    responsable: db.usuario?.name || "",
    etiquetas: "", notas: "", archivos: [], custom_fields: {}
  });
  const [f, setF] = useState(defaultF);
  const [dragActive, setDragActive] = useState(false);


  const pipeline = db.pipelines.find(p => p.id === plActivo);
  
  const plDeals = db.deals.filter(d => {
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
      const contacto = db.contactos.find(c => c.id === d.contacto_id);
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

    // El estado f y setF y el useEffect ya viven en Pipeline (ver arriba).
    // FormDeal accede a ellos desde el closure.

    const s = k => e => {
      const val = e.target.value;
      setF(prev => ({ ...prev, [k]: val }));
    };

    const guardarCambios = async () => {
      if (editDeal) {
        await guardarEnSupa("deals", { ...editDeal, ...f });
      }
    };

    const plActual = db.pipelines.find(p => p.id === f.pipeline_id);

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

    const [leadTab, setLeadTab] = useState("timeline"); // timeline, info, tareas, whatsapp, cotizacion, historial
    
    const stages = plActual?.etapas || [];
    const currentEtIdx = stages.findIndex(s => s.id === f.etapa_id);

    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 24, minHeight: 600 }}>
        {/* STAGE SELECTOR (BITRIX STYLE) */}
        <div style={{ display: "flex", width: "100%", gap: 4, paddingBottom: 10 }}>
          {stages.map((st, idx) => {
            const isActive = st.id === f.etapa_id;
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
                onClick={async () => {
                  const nextF = { ...f, etapa_id: st.id, prob: st.probabilidad };
                  setF(nextF);
                  if (editDeal) {
                    await guardarEnSupa("deals", { ...editDeal, ...nextF });
                    if (st.id !== f.etapa_id) await ejecutarAutomaciones(editDeal, st.id);
                  }
                }}
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

        <div style={{ display: "flex", gap: 12, borderBottom: `1px solid ${T.borderHi}`, paddingBottom: 16 }}>
          <Btn variant={leadTab === "timeline" ? "primario" : "fantasma"} size="sm" onClick={() => setLeadTab("timeline")}><Ico k="lightning" size={14} /> Timeline</Btn>
          <Btn variant={leadTab === "whatsapp" ? "primario" : "fantasma"} size="sm" onClick={() => setLeadTab("whatsapp")}><Ico k="phone" size={14} /> WhatsApp</Btn>
          <Btn variant={leadTab === "cotizacion" ? "primario" : "fantasma"} size="sm" onClick={() => setLeadTab("cotizacion")}><Ico k="dollar" size={14} /> Cotización</Btn>
          <Btn variant={leadTab === "finanzas" ? "primario" : "fantasma"} size="sm" onClick={() => setLeadTab("finanzas")}><Ico k="trend" size={14} /> Finanzas</Btn>
          <Btn variant={leadTab === "historial" ? "primario" : "fantasma"} size="sm" onClick={() => setLeadTab("historial")}><Ico k="history" size={14} /> Historial</Btn>
        </div>

        <div style={{ display: "flex", gap: 32 }}>
          {/* COLUMNA IZQUIERDA: INFORMACIÓN Y CAMPOS */}
          <div style={{ width: 440, display: "flex", flexDirection: "column", gap: 20, flexShrink: 0 }}>
            <div style={{ background: T.bg1, border: `1px solid ${T.border}`, borderRadius: 16, padding: 24 }}>
              <Campo label="Título del Deal *" style={{ marginBottom: 20 }}>
                <LocalInput value={f.titulo} onCommit={v => {
                  const nf = { ...f, titulo: v };
                  setF(nf);
                  if (editDeal) guardarEnSupa("deals", { ...editDeal, ...nf });
                }} placeholder="ej. Acme — Plan Enterprise" style={{ fontSize: 16, fontWeight: 800 }} />
              </Campo>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 20 }}>
                <Campo label="Monto ($)">
                  <LocalInput type="number" value={f.valor} onCommit={v => {
                    const nf = { ...f, valor: v };
                    setF(nf);
                    if (editDeal) guardarEnSupa("deals", { ...editDeal, ...nf });
                  }} style={{ fontWeight: 800, color: T.green }} />
                </Campo>
                <Campo label="Probabilidad (%)">
                  <LocalInput type="number" value={f.prob} onCommit={v => {
                    const nf = { ...f, prob: v };
                    setF(nf);
                    if (editDeal) guardarEnSupa("deals", { ...editDeal, ...nf });
                  }} style={{ fontWeight: 800 }} />
                </Campo>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                <Campo label="Pipeline"><Sel value={f.pipeline_id} onChange={async e => {
                  const plId = e.target.value;
                  const pl = db.pipelines.find(p => p.id === plId);
                  const nextF = { ...f, pipeline_id: plId, etapa_id: pl?.etapas[0]?.id || "" };
                  setF(nextF);
                  if (editDeal) {
                    await guardarEnSupa("deals", { ...editDeal, ...nextF });
                    if (editDeal.etapa_id !== (pl?.etapas[0]?.id || "")) {
                      await ejecutarAutomaciones(editDeal, pl?.etapas[0]?.id || "");
                    }
                  }
                }}>{db.pipelines.map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}</Sel></Campo>
                <Campo label="Etapa"><Sel value={f.etapa_id} onChange={async e => {
                  const val = e.target.value;
                  const nextF = { ...f, etapa_id: val };
                  setF(nextF);
                  if (editDeal) {
                    await guardarEnSupa("deals", { ...editDeal, ...nextF });
                    if (val !== f.etapa_id) await ejecutarAutomaciones(editDeal, val);
                  }
                }}>{plActual?.etapas.map(e => <option key={e.id} value={e.id}>{e.nombre}</option>)}</Sel></Campo>
                <Campo label="Contacto Asociado"><Sel value={f.contacto_id} onChange={async e => {
                  const val = e.target.value;
                  const nextF = { ...f, contacto_id: val };
                  setF(nextF);
                  if (editDeal) await guardarEnSupa("deals", { ...editDeal, ...nextF });
                }}><option value="">— Ninguno —</option>{db.contactos.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}</Sel></Campo>
                <Campo label="Empresa (B2B)"><Sel value={f.empresa_id} onChange={async e => {
                  const val = e.target.value;
                  const nextF = { ...f, empresa_id: val };
                  setF(nextF);
                  if (editDeal) await guardarEnSupa("deals", { ...editDeal, ...nextF });
                }}><option value="">— Ninguna —</option>{db.empresas.map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}</Sel></Campo>
                <Campo label="Fecha de Cierre"><LocalInput type="date" value={f.fecha_cierre} onCommit={v => {
                  const nf = { ...f, fecha_cierre: v };
                  setF(nf);
                  if (editDeal) guardarEnSupa("deals", { ...editDeal, ...nf });
                }} /></Campo>
                <Campo label="Responsable">
                  <Sel value={f.responsable} onChange={async e => {
                    const val = e.target.value;
                    const nextF = { ...f, responsable: val };
                    setF(nextF);
                    if (editDeal) await guardarEnSupa("deals", { ...editDeal, ...nextF });
                  }}>
                    {db.usuariosApp?.map(u => <option key={u.id} value={u.name}>{u.name}</option>)}
                  </Sel>
                </Campo>
              </div>

              {/* Lead Scoring Breakdown */}
              <div style={{ background: `linear-gradient(135deg, ${T.bg1}, ${T.bg2})`, border: `1px solid ${T.teal}30`, borderRadius: 16, padding: 18, marginBottom: 20 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <div style={{ fontSize: 18 }}>{calculateLeadScore(f) >= 80 ? "🔥" : "📊"}</div>
                    <span style={{ fontSize: 12, fontWeight: 700, color: T.white }}>Lead Intelligence Score</span>
                  </div>
                  <div style={{ fontSize: 24, fontWeight: 900, color: calculateLeadScore(f) >= 80 ? T.amber : T.teal }}>{calculateLeadScore(f)}<span style={{ fontSize: 12, color: T.whiteDim, fontWeight: 500 }}>/100</span></div>
                </div>
                <Barra value={calculateLeadScore(f)} color={calculateLeadScore(f) >= 80 ? T.amber : T.teal} height={6} />
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginTop: 12 }}>
                  {[
                    { l: "Perfil Completo", v: (db.contactos.find(c => c.id === f.contacto_id)?.telefono && f.valor > 0), p: "+35" },
                    { l: "Empresa B2B", v: !!f.empresa_id || !!f.empresa, p: "+15" },
                    { l: "Actividad", v: (db.actividades || []).some(a => a.deal_id === editDeal?.id), p: "+30" },
                    { l: "Interacción WA", v: (db.whatsapp_messages || []).some(m => m.deal_id === editDeal?.id), p: "+20" }
                  ].map((it, i) => (
                    <div key={i} style={{ fontSize: 10, color: it.v ? T.white : T.whiteDim, display: "flex", alignItems: "center", gap: 5 }}>
                      <div style={{ width: 6, height: 6, borderRadius: "50%", background: it.v ? T.green : T.whiteDim + "30" }} />
                      {it.l} <span style={{ color: it.v ? T.green : T.whiteDim, fontWeight: 700 }}>{it.p}</span>
                    </div>
                  ))}
                </div>
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

                  // Actualiza solo el estado local para fluidez total al escribir
                  const handleChange = (v) => {
                    setF(prev => ({ ...prev, custom_fields: { ...(prev.custom_fields || {}), [cf.id]: v } }));
                  };

                  // Guarda en Supabase solo al salir del campo (onBlur)
                  const handleBlur = async () => {
                    if (editDeal) {
                      await guardarEnSupa("deals", { ...editDeal, custom_fields: f.custom_fields });
                    }
                  };

                  return (
                    <Campo key={cf.id} label={cf.nombre}>
                      {cf.tipo === "lista" ? (
                        <Sel value={val} onChange={e => handleChange(e.target.value)} onBlur={handleBlur}>
                          <option value="">— Seleccionar —</option>
                          {cf.opciones?.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                        </Sel>
                      ) : cf.tipo === "fecha" ? (
                        <LocalInput type="date" value={val} onCommit={v => { handleChange(v); handleBlur(); }} />
                      ) : cf.tipo === "dinero" ? (
                        <div style={{ position: "relative" }}>
                          <span style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: T.green, fontWeight: 800 }}>$</span>
                          <LocalInput type="number" value={val} onCommit={v => { handleChange(v); handleBlur(); }} style={{ paddingLeft: 24, color: T.green, fontWeight: 700 }} />
                        </div>
                      ) : cf.tipo === "numero" ? (
                        <LocalInput type="number" value={val} onCommit={v => { handleChange(v); handleBlur(); }} />
                      ) : cf.tipo === "si_no" ? (
                        <Sel value={val} onChange={e => handleChange(e.target.value)} onBlur={handleBlur}>
                          <option value="">— Seleccionar —</option>
                          <option value="Si">Sí</option>
                          <option value="No">No</option>
                        </Sel>
                      ) : (
                        <LocalInput value={val} onCommit={v => { handleChange(v); handleBlur(); }} placeholder={`Ingresar ${cf.nombre.toLowerCase()}...`} />
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

          {/* SECCIÓN DERECHA: TIMELINE / WHATSAPP / COTIZACIONES */}
          <div style={{ flex: 1.2, borderLeft: `1px solid ${T.borderHi}`, minHeight: "65vh" }}>
            {leadTab === "timeline" && (
              <LeadTimeline
                deal={editDeal}
                contacto={db.contactos.find(c => c.id === f.contacto_id) || {}}
                db={db}
                setDb={setDb}
                guardarEnSupa={guardarEnSupa}
                setModulo={setModulo}
              />
            )}
            {leadTab === "cotizacion" && (
              <Cotizaciones 
                db={db} 
                deal={editDeal} 
                onCerrar={() => setLeadTab("timeline")} 
                guardarEnSupa={guardarEnSupa} 
              />
            )}
            {leadTab === "finanzas" && (
              <div style={{ padding: 24, display: "flex", flexDirection: "column", gap: 20 }}>
                <div style={{ fontSize: 18, fontWeight: 800, color: T.white }}>Resumen Financiero del Deal</div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                  <div style={{ background: T.bg2, padding: 16, borderRadius: 12, border: `1px solid ${T.borderHi}` }}>
                    <div style={{ fontSize: 11, color: T.whiteDim }}>VALOR BRUTO</div>
                    <div style={{ fontSize: 20, fontWeight: 800, color: T.teal }}>{money(editDeal.valor)}</div>
                  </div>
                  <div style={{ background: T.bg2, padding: 16, borderRadius: 12, border: `1px solid ${T.borderHi}` }}>
                    <div style={{ fontSize: 11, color: T.whiteDim }}>COMISIÓN (PROYECTADA)</div>
                    <div style={{ fontSize: 20, fontWeight: 800, color: T.amber }}>{money(editDeal.valor * 0.05)}</div>
                  </div>
                </div>
                
                <Tarjeta title="Gastos Asociados" style={{ padding: 16 }}>
                  <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    {(db.finanzas_gastos || []).filter(g => g.deal_id === editDeal.id).map(g => (
                      <div key={g.id} style={{ display: "flex", justifyContent: "space-between", fontSize: 13, background: T.bg1, padding: 10, borderRadius: 8 }}>
                        <span style={{ color: T.whiteOff }}>{g.descripcion || g.categoria}</span>
                        <span style={{ color: T.red, fontWeight: 700 }}>-{money(g.monto)}</span>
                      </div>
                    ))}
                    {(db.finanzas_gastos || []).filter(g => g.deal_id === editDeal.id).length === 0 && <div style={{ fontSize: 11, color: T.whiteDim, fontStyle: "italic" }}>No hay gastos registrados para este deal.</div>}
                  </div>
                </Tarjeta>
                <Btn variant="secundario" onClick={() => setModulo({ id: "finanzas" })} full><Ico k="cog" size={14} /> Gestionar en Módulo de Finanzas</Btn>
              </div>
            )}
            {leadTab === "whatsapp" && (
              <div style={{ padding: 40, color: T.whiteDim, textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center", gap: 20 }}>
                <div style={{ width: 64, height: 64, borderRadius: "50%", background: T.teal + "10", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <Ico k="phone" size={32} style={{ color: T.teal }} />
                </div>
                <div>
                  <div style={{ fontWeight: 800, color: T.white, fontSize: 16 }}>WhatsApp Integrado</div>
                  <div style={{ fontSize: 13, marginTop: 8, maxWidth: 300 }}>La mensajería de WhatsApp móvil está sincronizada en tu <strong>Timeline</strong> principal para mayor comodidad.</div>
                </div>
              </div>
            )}
            {leadTab === "historial" && (
              <div style={{ padding: 20 }}>
                {(db.auditoria || [])
                  .filter(a => a.entidad_id === editDeal.id)
                  .sort((a,b) => new Date(b.creado) - new Date(a.creado))
                  .map(a => (
                    <div key={a.id} style={{ padding: "12px 16px", borderBottom: `1px solid ${T.borderHi}`, display: "flex", gap: 12 }}>
                      <div style={{ width: 8, height: 8, borderRadius: "50%", background: T.teal, marginTop: 4 }} />
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 13, color: T.white }}>
                          <strong>{a.usuario_nombre}</strong> cambió <strong>{a.campo}</strong> de <span style={{ color: T.whiteDim }}>"{a.valor_anterior || 'vacío'}"</span> a <span style={{ color: T.teal }}>"{a.valor_nuevo}"</span>
                        </div>
                        <div style={{ fontSize: 11, color: T.whiteDim, marginTop: 4 }}>{new Date(a.creado).toLocaleString()}</div>
                      </div>
                    </div>
                  ))}
                {(!db.auditoria || db.auditoria.filter(a => a.entidad_id === editDeal.id).length === 0) && (
                  <div style={{ padding: 40, textAlign: "center", color: T.whiteDim }}>No hay historial registrado para este negocio.</div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

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
            const pl = db.pipelines.find(p => p.id === editDeal.pipeline_id);
            log.valor_anterior = pl?.etapas.find(e => e.id === editDeal[c])?.nombre || editDeal[c];
            log.valor_nuevo = pl?.etapas.find(e => e.id === form[c])?.nombre || form[c];
          }
          await guardarEnSupa("auditoria", log);
        }
      }

      // 4. NOTIFICACIONES & WEBHOOKS (Phase 40 & 42)
      // DISPARAR WEBHOOKS SEGÚN ETAPA (Phase 42)
      const pl = db.pipelines.find(p => p.id === form.pipeline_id);
      const etapa = pl?.etapas.find(e => e.id === form.etapa_id);
      
      if (etapa && etapa.id !== editDeal.etapa_id) {
        let event = null;
        if (etapa.es_ganado || etapa.es_ganado === true) event = 'deal.ganado';
        else if (etapa.es_perdido || etapa.es_perdido === true) event = 'deal.perdido';
        
        if (event) {
          const API_URL = `http://${window.location.hostname}:3001`;
          import("axios").then(axios => {
            axios.default.post(`${API_URL}/api/internal/trigger-webhook`, {
              event,
              payload: { deal: act, pipeline: pl.nombre, etapa: etapa.nombre, user: db.usuario?.name }
            }).catch(() => {});
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
      const nv = { ...form, id: "d" + uid(), creado: new Date().toISOString().slice(0, 10) };
      
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
      const d = db.deals.find(x => x.id === id);
      await guardarEnSupa("deals", { ...d, etapa_id: newEtapaId });
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

  return (
    <div>
      <EncabezadoSeccion title="Pipeline CRM" sub="Gestiona tus oportunidades en etapas visuales"
        actions={
          <div style={{ display: "flex", gap: 12 }}>
            <ControlSegmentado value={tab} onChange={setTab} options={[{ value: "kanban", label: "Kanban", icon: "board" }, { value: "configurar", label: "Configurar", icon: "cog" }]} />
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
           <div style={{ background: "rgba(0,0,0,0.8)", padding: "20px 40px", borderRadius: 20, border: `2px solid ${T.green}`, color: "#fff", fontSize: 24, fontWeight: 900, boxShadow: `0 0 30px ${T.green}40`, animation: "pop-in 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275)" }}>
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
        <div style={{ display: "flex", alignItems: "center", gap: 12, background: T.bg1, border: `1px solid ${T.borderHi}`, borderRadius: 10, padding: "6px 16px", boxShadow: "0 2px 4px rgba(0,0,0,0.02)" }}>
          <span style={{ fontSize: 13, fontWeight: 700, color: T.whiteDim }}>Pipeline Activo:</span>
          <select value={plActivo} onChange={e => setPlActivo(e.target.value)}
            style={{ border: "none", background: "transparent", fontSize: 15, fontWeight: 800, color: T.teal, outline: "none", cursor: "pointer", paddingRight: 8, fontFamily: "inherit" }}>
            {db.pipelines.map(pl => <option key={pl.id} value={pl.id}>{pl.nombre} ({db.deals.filter(d => d.pipeline_id === pl.id).length})</option>)}
          </select>
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
              {db.empresas.map(emp => <option key={emp.id} value={emp.id}>{emp.nombre}</option>)}
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
          {pipeline.etapas.map((etapa, etapaIdx) => {
            const etDeals = plDeals.filter(d => d.etapa_id === etapa.id);
            const isOver = dragSobre === etapa.id;
            const totalEtapa = etDeals.reduce((s, d) => s + (d.valor || 0), 0);
            const colBg = isOver ? etapa.color + "15" : T.bg2;
            return (
              <div key={etapa.id}
                style={{ minWidth: 220, maxWidth: 220, display: "flex", flexDirection: "column", flexShrink: 0, borderRadius: 12, background: colBg, border: `1px solid ${isOver ? etapa.color + "60" : T.borderHi}`, transition: "all .2s", overflow: "hidden" }}
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
                  onMouseEnter={e => e.currentTarget.style.background = etapa.color + "12"}
                  onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                  <span style={{ fontSize: 18, lineHeight: 1, fontWeight: 900 }}>+</span> Agregar
                </button>

                {/* LISTA DE TARJETAS */}
                <div style={{ display: "flex", flexDirection: "column", gap: 8, padding: "10px 8px", flex: 1 }}>
                  {etDeals.map(deal => {
                    const contacto = db.contactos.find(c => c.id === deal.contacto_id);
                    const fechaCreacion = deal.creado ? new Date(deal.creado).toLocaleDateString("es-ES", { day: "numeric", month: "short", year: "2-digit" }) : null;
                    const dealIdCorto = (deal.id || "").toString().slice(-5);
                    const avatarLetras = (deal.responsable || "?").trim().split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase();
                    const colAvatar = etapa.color;

                    const isSelected = selectedIds.includes(deal.id);

                    const dStat = getDealStatus(deal);

                    return (
                      <div key={deal.id} draggable onDragStart={() => setDragDeal(deal)}
                        style={{ 
                          background: T.bg1, 
                          border: `1px solid ${isSelected ? T.teal : T.borderHi}`, 
                          borderLeft: `3px solid ${etapa.color}`, 
                          borderRadius: 8, 
                          padding: "11px 12px", 
                          cursor: "pointer", 
                          userSelect: "none", 
                          transition: "all .2s cubic-bezier(0.4, 0, 0.2, 1)", 
                          position: "relative",
                          boxShadow: dStat.glow,
                          filter: dStat.cold ? "grayscale(0.6) opacity(0.8)" : "none"
                        }}
                        onClick={(e) => {
                          if (e.target.type === "checkbox") return;
                          setEditDeal(deal); setShowDealForm(true);
                        }}
                        onMouseEnter={e => { 
                          e.currentTarget.style.boxShadow = dStat.glow !== "none" ? `0 8px 24px rgba(0,0,0,0.2), ${dStat.glow}` : `0 4px 18px rgba(0,0,0,0.18)`; 
                          e.currentTarget.style.transform = "translateY(-2px)";
                          e.currentTarget.style.filter = "none";
                          const actions = e.currentTarget.querySelector(".card-actions");
                          if (actions) actions.style.opacity = "1";
                        }}
                        onMouseLeave={e => { 
                          e.currentTarget.style.boxShadow = dStat.glow; 
                          e.currentTarget.style.transform = ""; 
                          e.currentTarget.style.filter = dStat.cold ? "grayscale(0.6) opacity(0.8)" : "none";
                          const actions = e.currentTarget.querySelector(".card-actions");
                          if (actions) actions.style.opacity = "0";
                        }}>
                        
                        <input type="checkbox" checked={isSelected} 
                          onChange={(e) => {
                            e.stopPropagation();
                            setSelectedIds(prev => e.target.checked ? [...prev, deal.id] : prev.filter(id => id !== deal.id));
                          }}
                          style={{ position: "absolute", top: 10, right: 10, cursor: "pointer", zIndex: 10 }} 
                        />

                        {/* INDICADOR SCORE */}
                         {/* Título + botones acción */}
                         <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 8 }}>
                           <div style={{ fontSize: 13, fontWeight: 700, color: T.white, lineHeight: 1.35, flex: 1, display: "flex", alignItems: "center", gap: 6 }}>
                             {/* Indicador de Temperatura */}
                             <div title={dStat.desc} style={{ display: "flex", alignItems: "center", gap: 4 }}>
                               <div style={{ width: 8, height: 8, borderRadius: "50%", background: dStat.color, boxShadow: `0 0 6px ${dStat.color}80` }} />
                               <span style={{ fontSize: 14 }}>{dStat.icon}</span>
                             </div>

                             {deal.titulo}

                             {calculateLeadScore(deal) >= 80 && (
                               <div title={`Lead Caliente (${calculateLeadScore(deal)} pts)`} style={{ animation: "flicker 1.5s infinite alternate" }}>
                                 🔥
                               </div>
                             )}
                             <style>{`
                               @keyframes flicker {
                                 from { transform: scale(1); filter: drop-shadow(0 0 2px orange); }
                                 to { transform: scale(1.15); filter: drop-shadow(0 0 5px red); }
                               }
                             `}</style>
                           </div>
                           <div className="card-actions" style={{ display: "flex", gap: 3, marginLeft: 6, flexShrink: 0, opacity: 0, transition: "opacity .2s" }}>
                             <button title="Marcar Ganado" onClick={async e => { 
                               e.stopPropagation(); 
                               const ets = pipeline.etapas || [];
                               const etGanada = ets.find(et => et.es_ganado) || 
                                              ets.find(et => ["ganado", "venta", "exito", "éxito", "cerrado"].some(k => (et.nombre || "").toLowerCase().includes(k))) ||
                                              ets[ets.length - 1];
                               
                               if (etGanada) {
                                  const act = { ...deal, etapa_id: etGanada.id, prob: 100 };
                                  setDb(d => ({ ...d, deals: d.deals.map(dl => dl.id === deal.id ? act : dl) }));
                                   await guardarEnSupa("deals", act);
                                  await ejecutarAutomaciones(deal, etGanada.id);
                                  await chequearComision(deal.id, etGanada.id, deal.valor);
                                  setShowConfetti(true);
                                  setTimeout(() => setShowConfetti(false), 4000);
                               }
                             }}
                               style={{ background: T.bg2, border: `1px solid ${T.green}40`, borderRadius: 4, padding: "3px 6px", cursor: "pointer", fontSize: 10 }}>✅</button>
                             <button title="Marcar Perdido" onClick={async e => { 
                               e.stopPropagation(); 
                               const ets = pipeline.etapas || [];
                               const etPerdida = ets.find(et => et.es_perdido) || 
                                               ets.find(et => ["perdido", "rechazado", "cancelado", "no interesado"].some(k => (et.nombre || "").toLowerCase().includes(k))) ||
                                               (ets.length > 1 ? ets[ets.length - 2] : ets[0]);
                               
                               if (etPerdida) {
                                  const act = { ...deal, etapa_id: etPerdida.id, prob: 0 };
                                  setDb(d => ({ ...d, deals: d.deals.map(dl => dl.id === deal.id ? act : dl) }));
                                  await guardarEnSupa("deals", act);
                               }
                             }}
                               style={{ background: T.bg2, border: `1px solid ${T.red}40`, borderRadius: 4, padding: "3px 6px", cursor: "pointer", fontSize: 10 }}>❌</button>
                             <button title="Editar" onClick={e => { e.stopPropagation(); setEditDeal(deal); setShowDealForm(true); }}
                               style={{ background: T.bg2, border: `1px solid ${T.borderHi}`, borderRadius: 4, padding: "3px 6px", cursor: "pointer", fontSize: 10, color: T.whiteDim, lineHeight: 1 }}>✏️</button>
                           </div>
                         </div>

                        {/* Monto */}
                        <div style={{ fontSize: 16, fontWeight: 900, color: T.green, marginBottom: 8, letterSpacing: "-0.01em" }}>{money(deal.valor)}</div>

                        {/* Meta-data: ID y nombre */}
                        <div style={{ display: "flex", flexDirection: "column", gap: 3, marginBottom: 8, borderTop: `1px solid ${T.borderHi}`, paddingTop: 8 }}>
                          <div style={{ display: "flex", gap: 6, fontSize: 11, color: T.whiteDim }}>
                            <span style={{ color: T.whiteDim, fontWeight: 700, minWidth: 42 }}>ID</span>
                            <span style={{ color: T.whiteOff, fontWeight: 600 }}>{dealIdCorto}</span>
                          </div>
                          {contacto && (
                            <div style={{ display: "flex", gap: 6, fontSize: 11, color: T.whiteDim }}>
                              <span style={{ fontWeight: 700, minWidth: 42 }}>Nombre</span>
                              <span style={{ color: T.whiteOff, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 120 }}>{contacto.nombre}</span>
                            </div>
                          )}
                        </div>

                        {/* Responsable con avatar */}
                        <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 8 }}>
                          <div style={{ width: 22, height: 22, borderRadius: "50%", background: colAvatar, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 9, fontWeight: 900, flexShrink: 0, boxShadow: `0 0 0 2px ${colAvatar}40` }}>
                            {avatarLetras}
                          </div>
                          <span style={{ fontSize: 11, color: T.whiteDim, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{deal.responsable || "Sin asignar"}</span>
                        </div>

                        {/* Footer */}
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", borderTop: `1px solid ${T.borderHi}`, paddingTop: 8 }}>
                          <button onClick={e => { e.stopPropagation(); setEditDeal(deal); setShowDealForm(true); }}
                            style={{ background: "none", border: "none", color: etapa.color, fontSize: 11, fontWeight: 700, cursor: "pointer", padding: 0, fontFamily: "inherit" }}>
                            + Actividad
                          </button>
                          {fechaCreacion && <span style={{ fontSize: 10, color: T.whiteDim, opacity: 0.7 }}>{fechaCreacion}</span>}
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

      <Modal open={showDealForm} onClose={() => { setShowDealForm(false); setEditDeal(null); }} title={editDeal ? "Editar Deal" : "Nuevo Deal"} width={editDeal ? 1300 : 720}>
        <FormDeal init={editDeal || (preEtapa ? { pipeline_id: plActivo, etapa_id: preEtapa } : { pipeline_id: plActivo, etapa_id: pipeline?.etapas[0]?.id })} onGuardar={guardarDeal} onCancelar={() => { setShowDealForm(false); setEditDeal(null); }} />
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
              {pipeline.etapas.map(et => <option key={et.id} value={et.id}>{et.nombre}</option>)}
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
    </div>
  );
};
