import { useState } from "react";
import { T } from "../theme";
import { uid, fdtm } from "../utils";
import { Av, Chip, Btn, Inp, Sel, Campo, Modal, Tarjeta, KPI, BuscadorBar, Vacio, EncabezadoSeccion, Ico } from "../components/ui";

export const Notas = ({ db, setDb, guardarEnSupa, eliminarDeSupa }) => {
  const [busqueda, setBusqueda] = useState("");
  const [fCont, setFCont] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [f, setF] = useState({ texto: "", contactoId: "", dealId: "", fijada: false, fecha: "" });

  const s = k => e => setF(p => ({ ...p, [k]: e.target.type === "checkbox" ? e.target.checked : e.target.value }));

  const filtradas = db.notas.filter(n =>
    (fCont === "" || n.contactoId === fCont) &&
    n.texto.toLowerCase().includes(busqueda.toLowerCase())
  ).sort((a, b) => (b.fijada === a.fijada) ? new Date(b.fecha) - new Date(a.fecha) : (b.fijada ? 1 : -1));

  const guardar = async () => {
    if (!f.texto.trim()) return;
    const nueva = { ...f, id: "n" + uid(), autor: db.usuario?.name || "Usuario", fecha: f.fecha || new Date().toISOString() };
    setDb(d => ({ ...d, notas: [nueva, ...d.notas] }));
    await guardarEnSupa("notas", nueva);
    setShowForm(false); setF({ texto: "", contactoId: "", dealId: "", fijada: false, fecha: "" });
  };
  
  const toggleFijada = async id => {
    const nota = db.notas.find(n => n.id === id);
    if (!nota) return;
    const act = { ...nota, fijada: !nota.fijada };
    setDb(d => ({ ...d, notas: d.notas.map(n => n.id === id ? act : n) }));
    await guardarEnSupa("notas", act);
  };
  
  const eliminar = async id => {
    if (!confirm("¿Eliminar nota?")) return;
    setDb(d => ({ ...d, notas: d.notas.filter(n => n.id !== id) }));
    await eliminarDeSupa("notas", id);
  };

  return (
    <div>
      <EncabezadoSeccion title="Mis Notas" sub={`${db.notas.length} notas en total`}
        actions={<Btn onClick={() => setShowForm(true)}><Ico k="plus" size={14} />Nueva Nota</Btn>} />
      
      <div style={{ display: "flex", gap: 12, marginBottom: 24, flexWrap: "wrap", alignItems: "center" }}>
        <BuscadorBar value={busqueda} onChange={e => setBusqueda(e.target.value)} placeholder="Buscar en notas..." />
        <Sel value={fCont} onChange={e => setFCont(e.target.value)} style={{ width: 250 }}>
          <option value="">Todos los contactos</option>
          {db.contactos.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
        </Sel>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: 20 }}>
        {filtradas.map(n => {
          const contacto = db.contactos.find(c => c.id === n.contactoId);
          const deal = db.deals.find(d => d.id === n.dealId);
          return (
            <Tarjeta key={n.id} style={{ padding: 20, borderTop: n.fijada ? `3px solid ${T.amber}` : `1px solid ${T.border}`, background: n.fijada ? "rgba(245, 158, 11, 0.05)" : T.bg1 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <Av text={n.autor} color={T.teal} size={28} fs={11} />
                  <div><div style={{ fontSize: 13, fontWeight: 700, color: T.white }}>{n.autor}</div><div style={{ fontSize: 11, color: T.whiteDim }}>{fdtm(n.fecha)}</div></div>
                </div>
                <div style={{ display: "flex", gap: 6 }}>
                  <Btn variant="fantasma" size="sm" onClick={() => toggleFijada(n.id)}><Ico k="star" size={14} style={{ color: n.fijada ? T.amber : T.whiteDim, fill: n.fijada ? T.amber : "none" }} /></Btn>
                  <Btn variant="fantasma" size="sm" onClick={() => eliminar(n.id)}><Ico k="trash" size={14} style={{ color: T.red }} /></Btn>
                </div>
              </div>
              
              <div style={{ fontSize: 14, color: T.white, lineHeight: 1.6, whiteSpace: "pre-wrap", marginBottom: 16 }}>{n.texto}</div>
              
              {(contacto || deal) && (
                <div style={{ background: T.bg2, borderRadius: 8, padding: 12, display: "flex", flexDirection: "column", gap: 6 }}>
                  {contacto && <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: T.whiteOff }}><Ico k="users" size={13} style={{ color: T.teal }} /> {contacto.nombre}</div>}
                  {deal && <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: T.whiteOff }}><Ico k="dollar" size={13} style={{ color: T.green }} /> {deal.titulo}</div>}
                </div>
              )}
            </Tarjeta>
          );
        })}
      </div>
      {filtradas.length === 0 && <Vacio text="No hay notas que coincidan." />}

      <Modal open={showForm} onClose={() => setShowForm(false)} title="Agregar Nota" width={500}>
        <Campo label="Contenido de la nota"><Inp value={f.texto} onChange={s("texto")} rows={5} placeholder="Escribe aquí..." /></Campo>
        <div style={{ marginTop: 16, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <Campo label="Contacto (Opcional)"><Sel value={f.contactoId} onChange={s("contactoId")}><option value="">—</option>{db.contactos.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}</Sel></Campo>
          <Campo label="Deal (Opcional)"><Sel value={f.dealId} onChange={s("dealId")}><option value="">—</option>{db.deals.map(d => <option key={d.id} value={d.id}>{d.titulo}</option>)}</Sel></Campo>
        </div>
        <div style={{ marginTop: 16, display: "flex", alignItems: "center", gap: 8 }}>
          <input type="checkbox" id="fijar" checked={f.fijada} onChange={s("fijada")} style={{ accentColor: T.amber }} />
          <label htmlFor="fijar" style={{ fontSize: 13, color: T.whiteOff, cursor: "pointer" }}>Fijar nota (destacada)</label>
        </div>
        <div style={{ display: "flex", gap: 12, justifyContent: "flex-end", marginTop: 24 }}>
          <Btn variant="secundario" onClick={() => setShowForm(false)}>Cancelar</Btn>
          <Btn onClick={guardar} disabled={!f.texto.trim()}>Guardar</Btn>
        </div>
      </Modal>
    </div>
  );
};
