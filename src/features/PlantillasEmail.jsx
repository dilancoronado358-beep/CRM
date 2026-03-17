import { useState } from "react";
import { T } from "../theme";
import { uid, TPL_CATS } from "../utils";
import { Chip, Btn, Inp, Sel, Campo, Modal, Tarjeta, Vacio, EncabezadoSeccion, BuscadorBar, Ico } from "../components/ui";

export const PlantillasEmail = ({ db, setDb, guardarEnSupa, eliminarDeSupa }) => {
  const [showForm, setShowForm] = useState(false);
  const [f, setF] = useState({ titulo: "", categoria: "prospectacion", asunto: "", cuerpo: "" });
  const [editando, setEditando] = useState(null);
  const [busqueda, setBusqueda] = useState("");
  const s = k => e => setF(p => ({ ...p, [k]: e.target.value }));

  const filtradas = db.plantillasEmail?.filter(p => [p.titulo, p.asunto, p.cuerpo].some(v => v?.toLowerCase().includes(busqueda.toLowerCase()))) || [];

  const guardar = async () => {
    if (!f.titulo.trim() || !f.cuerpo.trim()) return;
    if (editando) {
      const act = { ...editando, ...f };
      setDb(d => ({ ...d, plantillasEmail: d.plantillasEmail.map(p => p.id === editando.id ? act : p) }));
      await guardarEnSupa("plantillas", act);
    } else {
      const nv = { ...f, id: "tpl" + uid(), creador: db.usuario?.name || "Usuario" };
      setDb(d => ({ ...d, plantillasEmail: [nv, ...(d.plantillasEmail || [])] }));
      await guardarEnSupa("plantillas", nv);
    }
    setShowForm(false); setEditando(null); setF({ titulo: "", categoria: "prospectacion", asunto: "", cuerpo: "" });
  };

  const eliminar = async id => {
    if (!confirm("¿Eliminar plantilla?")) return;
    setDb(d => ({ ...d, plantillasEmail: d.plantillasEmail.filter(p => p.id !== id) }));
    await eliminarDeSupa("plantillas", id);
  };

  return (
    <div>
      <EncabezadoSeccion title="Plantillas de Correo" sub={`${filtradas.length} plantillas creadas listas para usar`}
        actions={<Btn onClick={() => { setEditando(null); setShowForm(true); }}><Ico k="plus" size={14} />Nueva Plantilla</Btn>} />

      <div style={{ marginBottom: 24, maxWidth: 500 }}><BuscadorBar value={busqueda} onChange={e => setBusqueda(e.target.value)} placeholder="Buscar plantillas..." /></div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(350px, 1fr))", gap: 20 }}>
        {filtradas.map(p => {
          const cinfo = TPL_CATS[p.categoria] || TPL_CATS.prospectacion;
          return (
            <Tarjeta key={p.id} style={{ padding: 24, display: "flex", flexDirection: "column" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
                <Chip label={cinfo.label || p.categoria} color={cinfo.color} />
                <div style={{ display: "flex", gap: 6 }}>
                  <Btn variant="fantasma" size="sm" onClick={() => { setEditando(p); setF({ titulo: p.titulo, categoria: p.categoria, asunto: p.asunto, cuerpo: p.cuerpo }); setShowForm(true); }}><Ico k="edit" size={14} /></Btn>
                  <Btn variant="fantasma" size="sm" onClick={() => eliminar(p.id)}><Ico k="trash" size={14} style={{ color: T.red }} /></Btn>
                </div>
              </div>
              <div style={{ fontSize: 16, fontWeight: 800, color: T.white, marginBottom: 8 }}>{p.titulo}</div>
              <div style={{ fontSize: 13, fontWeight: 700, color: T.whiteDim, marginBottom: 12 }}>Asunto: <span style={{ color: T.teal }}>{p.asunto}</span></div>
              <div style={{ background: T.bg2, borderRadius: 8, padding: 16, fontSize: 13, color: T.whiteOff, whiteSpace: "pre-wrap", flex: 1, fontFamily: "monospace", overflow: "hidden", textOverflow: "ellipsis", display: "-webkit-box", WebkitLineClamp: 4, WebkitBoxOrient: "vertical" }}>
                {p.cuerpo}
              </div>
            </Tarjeta>
          );
        })}
      </div>
      {filtradas.length === 0 && <Vacio text="No hay plantillas." />}

      <Modal open={showForm} onClose={() => { setShowForm(false); setEditando(null); }} title={editando ? "Editar Plantilla" : "Nueva Plantilla"} width={640}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          <Campo label="Título Interno *"><Inp value={f.titulo} onChange={s("titulo")} placeholder="Ej. Intro Saas B2B" /></Campo>
          <Campo label="Categoría">
            <Sel value={f.categoria} onChange={s("categoria")}>
              {Object.entries(TPL_CATS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
            </Sel>
          </Campo>
          <Campo label="Asunto del Correo" col={2}><Inp value={f.asunto} onChange={s("asunto")} placeholder="Propuesta de valor para {{empresa}}" /></Campo>
          <Campo label="Cuerpo del Correo *" col={2}><Inp value={f.cuerpo} onChange={s("cuerpo")} rows={10} placeholder="Usa variables como {{nombre}}, {{empresa}}..." style={{ fontFamily: "monospace", fontSize: 13, background: T.bg1 }} /></Campo>
        </div>
        <div style={{ fontSize: 11, color: T.teal, marginTop: 16, background: T.tealSoft, padding: "8px 12px", borderRadius: 8 }}>💡 Puedes usar `{'{{nombre}}'}` o `{'{{empresa}}'}` para que se reemplacen automáticamente al enviar.</div>
        <div style={{ display: "flex", gap: 12, justifyContent: "flex-end", marginTop: 24 }}>
          <Btn variant="secundario" onClick={() => { setShowForm(false); setEditando(null); }}>Cancelar</Btn>
          <Btn onClick={guardar} disabled={!f.titulo.trim() || !f.cuerpo.trim()}>Guardar Plantilla</Btn>
        </div>
      </Modal>
    </div>
  );
};
