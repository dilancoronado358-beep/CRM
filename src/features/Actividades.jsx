import { useState } from "react";
import { T } from "../theme";
import { uid, fdtm, ACT_CFG } from "../utils";
import { Chip, Btn, Inp, Sel, Campo, Modal, Tarjeta, Vacio, EncabezadoSeccion, Ico } from "../components/ui";

export const Actividades = ({ db, setDb, guardarEnSupa, eliminarDeSupa }) => {
  const [showForm, setShowForm] = useState(false);
  const [f, setF] = useState({ tipo: "llamada", titulo: "", contactoId: "", dealId: "", fecha: "", duracion: 30, responsable: db.usuario?.name || "", notas: "", hecho: false });
  const s = k => e => setF(p => ({ ...p, [k]: e.target.value }));

  const guardar = async () => {
    if (!f.titulo.trim()) return;
    const nueva = { ...f, id: "a" + uid(), contactoId: f.contactoId || null, dealId: f.dealId || null, duracion: +f.duracion };
    setDb(d => ({ ...d, actividades: [nueva, ...d.actividades] }));
    await guardarEnSupa("actividades", nueva);
    setShowForm(false);
    setF({ tipo: "llamada", titulo: "", contactoId: "", dealId: "", fecha: "", duracion: 30, responsable: db.usuario?.name || "", notas: "", hecho: false });
  };
  
  const toggle = async id => {
    const act = db.actividades.find(a => a.id === id);
    if (!act) return;
    const actualizada = { ...act, hecho: !act.hecho };
    setDb(d => ({ ...d, actividades: d.actividades.map(a => a.id === id ? actualizada : a) }));
    await guardarEnSupa("actividades", actualizada);
  };
  
  const eliminar = async id => {
    setDb(d => ({ ...d, actividades: d.actividades.filter(a => a.id !== id) }));
    await eliminarDeSupa("actividades", id);
  };

  const pendientes = db.actividades.filter(a => !a.hecho).sort((a, b) => new Date(a.fecha) - new Date(b.fecha));
  const completadas = db.actividades.filter(a => a.hecho).sort((a, b) => new Date(b.fecha) - new Date(a.fecha));

  const Fila = ({ act }) => {
    const contacto = db.contactos.find(c => c.id === act.contactoId);
    const cfg = ACT_CFG[act.tipo] || ACT_CFG.tarea;
    return (
      <div style={{ display: "flex", gap: 14, padding: "16px 20px", borderBottom: `1px solid ${T.borderHi}`, alignItems: "center", opacity: act.hecho ? .6 : 1, transition: "background .2s" }}
        onMouseEnter={e => e.currentTarget.style.background = T.bg2}
        onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
        <button onClick={() => toggle(act.id)} style={{ width: 24, height: 24, borderRadius: "50%", border: `2px solid ${act.hecho ? T.green : cfg.color}`, background: act.hecho ? T.green : "transparent", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, transition: "all .15s" }}>
          {act.hecho && <Ico k="check" size={14} style={{ color: "#FFF" }} />}
        </button>
        <span style={{ fontSize: 20, flexShrink: 0 }}>{cfg.icon}</span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: act.hecho ? T.whiteDim : T.white, textDecoration: act.hecho ? "line-through" : "none", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", marginBottom: 2 }}>{act.titulo}</div>
          <div style={{ fontSize: 12, color: T.whiteDim, fontWeight: 500 }}>{contacto && <span style={{ color: T.teal }}>{contacto.nombre} · </span>}{fdtm(act.fecha)}{act.duracion > 0 && ` · ${act.duracion}min`}</div>
          {act.notas && <div style={{ fontSize: 11, color: T.whiteOff, marginTop: 4, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{act.notas}</div>}
        </div>
        <Chip label={cfg.label} color={cfg.color} />
        <Btn variant="fantasma" size="sm" onClick={() => eliminar(act.id)}><Ico k="trash" size={13} style={{ color: T.red }} /></Btn>
      </div>
    );
  };

  return (
    <div>
      <EncabezadoSeccion title="Registro de Actividades" sub={`${pendientes.length} por hacer · ${completadas.length} completadas`}
        actions={<Btn onClick={() => setShowForm(true)}><Ico k="plus" size={14} />Nueva Actividad</Btn>} />
      
      <div style={{ display: "flex", gap: 12, marginBottom: 24, flexWrap: "wrap" }}>
        {Object.entries(ACT_CFG).map(([k, v]) => (
          <div key={k} style={{ display: "flex", gap: 8, alignItems: "center", background: T.bg1, border: `1px solid ${T.borderHi}`, borderRadius: 8, padding: "8px 16px", boxShadow: "0 1px 3px rgba(0,0,0,0.02)" }}>
            <span style={{ fontSize: 16 }}>{v.icon}</span>
            <span style={{ fontSize: 12, color: T.whiteDim, fontWeight: 600 }}>{v.label}:</span>
            <span style={{ fontSize: 14, fontWeight: 800, color: v.color }}>{db.actividades.filter(a => a.tipo === k).length}</span>
          </div>
        ))}
      </div>
      
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(400px, 1fr))", gap: 20 }}>
        <div>
          <div style={{ fontWeight: 800, fontSize: 13, color: T.whiteDim, marginBottom: 12, textTransform: "uppercase", letterSpacing: ".05em" }}>Actividades Pendientes ({pendientes.length})</div>
          <Tarjeta style={{ overflow: "hidden", padding: 0 }}>
            {pendientes.length === 0 ? <Vacio text="¡Todo al día! No tienes actividades pendientes 🎉" /> : pendientes.map(a => <Fila key={a.id} act={a} />)}
          </Tarjeta>
        </div>
        <div>
          <div style={{ fontWeight: 800, fontSize: 13, color: T.whiteDim, marginBottom: 12, textTransform: "uppercase", letterSpacing: ".05em" }}>Actividades Completadas ({completadas.length})</div>
          <Tarjeta style={{ overflow: "hidden", padding: 0 }}>
            {completadas.length === 0 ? <Vacio text="Aún no has completado actividades." /> : completadas.map(a => <Fila key={a.id} act={a} />)}
          </Tarjeta>
        </div>
      </div>
      
      <Modal open={showForm} onClose={() => setShowForm(false)} title="Agendar Nueva Actividad" width={600}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          <Campo label="Tipo de Actividad"><Sel value={f.tipo} onChange={s("tipo")}><option value="llamada">📞 Llamada</option><option value="reunion">📅 Reunión</option><option value="email">✉️ Email</option><option value="tarea">✅ Tarea general</option></Sel></Campo>
          <Campo label="Título de actividad *"><Inp value={f.titulo} onChange={s("titulo")} placeholder="Descripción breve..." /></Campo>
          <Campo label="Contacto relacionado"><Sel value={f.contactoId} onChange={s("contactoId")}><option value="">— Ninguno —</option>{db.contactos.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}</Sel></Campo>
          <Campo label="Deal relacionado"><Sel value={f.dealId} onChange={s("dealId")}><option value="">— Ninguno —</option>{db.deals.map(d => <option key={d.id} value={d.id}>{d.titulo.slice(0, 28)}</option>)}</Sel></Campo>
          <Campo label="Fecha y hora inicial"><Inp type="datetime-local" value={f.fecha} onChange={s("fecha")} /></Campo>
          <Campo label="Duración estimada (min)"><Inp type="number" value={f.duracion} onChange={s("duracion")} /></Campo>
          <Campo label="Asignado a" col={2}><Inp value={f.responsable} onChange={s("responsable")} placeholder="Nombre del responsable..." /></Campo>
          <Campo label="Notas adicionales" col={2}><Inp value={f.notas} onChange={s("notas")} rows={3} placeholder="Detalles a recordar..." /></Campo>
        </div>
        <div style={{ display: "flex", gap: 12, justifyContent: "flex-end", marginTop: 20 }}>
          <Btn variant="secundario" onClick={() => setShowForm(false)}>Cancelar</Btn>
          <Btn onClick={guardar} disabled={!f.titulo.trim()}>Guardar Actividad</Btn>
        </div>
      </Modal>
    </div>
  );
};
