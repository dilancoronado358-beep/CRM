import { useState } from "react";
import { T } from "../theme";
import { uid, PRIO_CFG, fdate } from "../utils";
import { Chip, Btn, Inp, Sel, Campo, Modal, Tarjeta, Vacio, EncabezadoSeccion, Ico } from "../components/ui";

export const Tareas = ({ db, setDb, guardarEnSupa, eliminarDeSupa }) => {
  const [showForm, setShowForm] = useState(false);
  const [f, setF] = useState({ titulo: "", prioridad: "media", vencimiento: "", asignado: db.usuario?.name || "", descripcion: "", contactoId: "", dealId: "", estado: "pendiente" });
  const s = k => e => setF(p => ({ ...p, [k]: e.target.value }));

  const guardar = async () => {
    if (!f.titulo.trim()) return;
    const nueva = { ...f, id: "t" + uid(), contactoId: f.contactoId || null, dealId: f.dealId || null };
    setDb(d => ({ ...d, tareas: [nueva, ...d.tareas] }));
    await guardarEnSupa("tareas", nueva);
    setShowForm(false); setF({ titulo: "", prioridad: "media", vencimiento: "", asignado: db.usuario?.name || "", descripcion: "", contactoId: "", dealId: "", estado: "pendiente" });
  };
  
  const move = async (id, st) => {
    const act = db.tareas.find(t => t.id === id);
    if (!act) return;
    const actualizada = { ...act, estado: st };
    setDb(d => ({ ...d, tareas: d.tareas.map(t => t.id === id ? actualizada : t) }));
    await guardarEnSupa("tareas", actualizada);
  };
  
  const eliminar = async id => {
    setDb(d => ({ ...d, tareas: d.tareas.filter(t => t.id !== id) }));
    await eliminarDeSupa("tareas", id);
  };

  const cols = [
    { id: "pendiente", label: "Pendientes", color: T.whiteDim, bg: T.bg2 },
    { id: "en_progreso", label: "En Progreso", color: T.teal, bg: T.bg2 },
    { id: "completado", label: "Completadas", color: T.green, bg: T.bg2 }
  ];

  return (
    <div>
      <EncabezadoSeccion title="Mis Tareas" sub={`${db.tareas.filter(t => t.estado !== "completado").length} tareas abiertas`}
        actions={<Btn onClick={() => setShowForm(true)}><Ico k="plus" size={14} />Nueva Tarea</Btn>} />
      
      <div style={{ display: "flex", gap: 16, overflowX: "auto", paddingBottom: 20 }}>
        {cols.map(c => {
          const tareas = db.tareas.filter(t => t.estado === c.id);
          return (
            <div key={c.id} style={{ minWidth: 300, maxWidth: 300, flexShrink: 0, display: "flex", flexDirection: "column", gap: 12 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: c.bg, padding: "12px 16px", borderRadius: 8, border: `1px solid ${T.borderHi}` }}>
                <span style={{ fontSize: 13, fontWeight: 800, color: T.white, textTransform: "uppercase", letterSpacing: ".05em" }}>{c.label}</span>
                <span style={{ background: c.color + "20", color: c.color, borderRadius: 10, padding: "2px 8px", fontSize: 11, fontWeight: 800 }}>{tareas.length}</span>
              </div>
              
              {tareas.map(t => {
                const pc = PRIO_CFG[t.prioridad] || PRIO_CFG.media;
                const reqAt = t.estado !== "completado" && t.vencimiento && new Date(t.vencimiento) < new Date();
                return (
                  <Tarjeta key={t.id} style={{ padding: 16, borderLeft: `3px solid ${pc.color}`, opacity: c.id === "completado" ? 0.7 : 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: c.id === "completado" ? T.whiteDim : T.white, textDecoration: c.id === "completado" ? "line-through" : "none", marginBottom: 8, lineHeight: 1.4 }}>{t.titulo}</div>
                    {t.descripcion && <div style={{ fontSize: 12, color: T.whiteDim, marginBottom: 12, maxHeight: 40, overflow: "hidden", textOverflow: "ellipsis" }}>{t.descripcion}</div>}
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginTop: 16 }}>
                      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                        <span style={{ fontSize: 11, fontWeight: 800, color: pc.color }}>Prio. {t.prioridad}</span>
                        {t.vencimiento && <span style={{ fontSize: 11, fontWeight: 600, color: reqAt ? T.red : T.whiteDim }}><Ico k="calendar" size={10} style={{ marginRight: 4 }} />Vence {fdate(t.vencimiento)}</span>}
                      </div>
                      <div style={{ display: "flex", gap: 6, opacity: 0.8 }} onMouseEnter={e => e.currentTarget.style.opacity = 1} onMouseLeave={e => e.currentTarget.style.opacity = 0.8}>
                        {c.id !== "pendiente" && <Btn variant="fantasma" size="sm" onClick={() => move(t.id, "pendiente")}><Ico k="arrow" size={14} style={{ transform: "rotate(180deg)" }} /></Btn>}
                        {c.id !== "completado" && <Btn variant="secundario" size="sm" onClick={() => move(t.id, c.id === "pendiente" ? "en_progreso" : "completado")}><Ico k={c.id === "pendiente" ? "trend" : "check"} size={14} style={{ color: c.id === "pendiente" ? T.teal : T.green }} /></Btn>}
                        <Btn variant="fantasma" size="sm" onClick={() => eliminar(t.id)}><Ico k="trash" size={14} style={{ color: T.red }} /></Btn>
                      </div>
                    </div>
                  </Tarjeta>
                );
              })}
              {tareas.length === 0 && <Vacio text={`Sin tareas ${c.label.toLowerCase()}`} />}
            </div>
          );
        })}
      </div>
      
      <Modal open={showForm} onClose={() => setShowForm(false)} title="Nueva Tarea">
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          <Campo label="Título de tarea *" col={2}><Inp value={f.titulo} onChange={s("titulo")} placeholder="Ej. Revisar contrato..." /></Campo>
          <Campo label="Prioridad"><Sel value={f.prioridad} onChange={s("prioridad")}><option value="alta">🔴 Alta</option><option value="media">🟡 Media</option><option value="baja">🟢 Baja</option></Sel></Campo>
          <Campo label="Vencimiento"><Inp type="date" value={f.vencimiento} onChange={s("vencimiento")} /></Campo>
          <Campo label="Contacto relacionado"><Sel value={f.contactoId} onChange={s("contactoId")}><option value="">— Ninguno —</option>{db.contactos.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}</Sel></Campo>
          <Campo label="Deal relacionado"><Sel value={f.dealId} onChange={s("dealId")}><option value="">— Ninguno —</option>{db.deals.map(d => <option key={d.id} value={d.id}>{d.titulo}</option>)}</Sel></Campo>
          <Campo label="Descripción" col={2}><Inp value={f.descripcion} onChange={s("descripcion")} rows={3} placeholder="Detalles de la tarea..." /></Campo>
          <Campo label="Asignar a" col={2}><Inp value={f.asignado} onChange={s("asignado")} placeholder="Nombre..." /></Campo>
        </div>
        <div style={{ display: "flex", gap: 12, justifyContent: "flex-end", marginTop: 24 }}>
          <Btn variant="secundario" onClick={() => setShowForm(false)}>Cancelar</Btn>
          <Btn onClick={guardar} disabled={!f.titulo.trim()}>Crear Tarea</Btn>
        </div>
      </Modal>
    </div>
  );
};
