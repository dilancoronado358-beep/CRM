import { useState } from "react";
import { T } from "../theme";
import { uid, fdate } from "../utils";
import { Btn, Ico, Tarjeta, Modal, Inp } from "../components/ui";

export const EmailSequences = ({ db, guardarEnSupa, eliminarDeSupa, t }) => {
  const [showEditor, setShowEditor] = useState(false);
  const [seqEdit, setSeqEdit] = useState(null);
  const [form, setForm] = useState({ nombre: "", pasos: [{ delay: 1, subject: "", body: "" }] });

  const sequences = db.email_sequences || [];

  const abrirNuevo = () => {
    setForm({ nombre: "", pasos: [{ delay: 1, subject: "", body: "" }] });
    setSeqEdit(null);
    setShowEditor(true);
  };

  const abrirEditar = (s) => {
    setForm(s);
    setSeqEdit(s);
    setShowEditor(true);
  };

  const agregarPaso = () => {
    setForm(prev => ({ ...prev, pasos: [...prev.pasos, { delay: 2, subject: "", body: "" }] }));
  };

  const updatePaso = (idx, key, val) => {
    const next = [...form.pasos];
    next[idx][key] = val;
    setForm(prev => ({ ...prev, pasos: next }));
  };

  const guardar = async () => {
    const final = {
      ...form,
      id: seqEdit?.id || "sq" + uid(),
      creado: seqEdit?.creado || new Date().toISOString()
    };
    await guardarEnSupa("email_sequences", final);
    setShowEditor(false);
  };

  const delSeq = async (id) => {
    if (confirm("¿Eliminar secuencia?")) await eliminarDeSupa("email_sequences", id);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <div style={{ fontSize: 20, fontWeight: 800, color: T.white }}>Secuencias de Email (Drip Marketing)</div>
          <div style={{ fontSize: 13, color: T.whiteDim, marginTop: 4 }}>Automatiza tus seguimientos con hilos de correos programados.</div>
        </div>
        <Btn onClick={abrirNuevo}><Ico k="plus" size={14} /> Crear Secuencia</Btn>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 20 }}>
        {sequences.map(s => (
          <Tarjeta key={s.id} style={{ padding: 24, display: "flex", flexDirection: "column", gap: 16 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <div>
                <div style={{ fontWeight: 800, color: T.white, fontSize: 16 }}>{s.nombre}</div>
                <div style={{ fontSize: 12, color: T.teal, fontWeight: 700, marginTop: 4 }}>{s.pasos.length} PASOS</div>
              </div>
              <div style={{ display: "flex", gap: 4 }}>
                <Btn variant="fantasma" size="xs" onClick={() => abrirEditar(s)}><Ico k="edit" size={14} /></Btn>
                <Btn variant="fantasma" size="xs" onClick={() => delSeq(s.id)} style={{ color: T.red }}><Ico k="trash" size={14} /></Btn>
              </div>
            </div>
            
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {s.pasos.slice(0, 2).map((p, i) => (
                <div key={i} style={{ fontSize: 12, color: T.whiteDim, background: T.bg2, padding: "8px 12px", borderRadius: 8, border: `1px solid ${T.border}` }}>
                  Día {p.delay}: {p.subject}
                </div>
              ))}
              {s.pasos.length > 2 && <div style={{ fontSize: 11, color: T.whiteDim, textAlign: "center" }}>+ {s.pasos.length - 2} pasos más...</div>}
            </div>

            <div style={{ marginTop: "auto", paddingTop: 16, borderTop: `1px solid ${T.border}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ fontSize: 11, color: T.whiteDim }}>Suscritos: 0</div>
              <Btn variant="secundario" size="sm">Ver Leads</Btn>
            </div>
          </Tarjeta>
        ))}
        {sequences.length === 0 && <div style={{ gridColumn: "1/-1", padding: 60, textAlign: "center", color: T.whiteDim, border: `1px dashed ${T.border}`, borderRadius: 16 }}>No hay secuencias creadas. Comienza creando tu primera automatización.</div>}
      </div>

      {showEditor && (
        <Modal title={seqEdit ? "Editar Secuencia" : "Nueva Secuencia de Seguimiento"} onClose={() => setShowEditor(false)}>
          <div style={{ display: "flex", flexDirection: "column", gap: 24, maxHeight: "80vh", overflowY: "auto", paddingRight: 8 }}>
            <Campo label="Nombre de la Secuencia">
              <Inp value={form.nombre} onChange={e => setForm({ ...form, nombre: e.target.value })} placeholder="ej. Nutrición de Leads Fríos" />
            </Campo>

            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: T.whiteDim, textTransform: "uppercase" }}>Pasos de la Secuencia</div>
              {form.pasos.map((p, i) => (
                <div key={i} style={{ background: T.bg2, padding: 20, borderRadius: 16, border: `1px solid ${T.border}`, display: "flex", flexDirection: "column", gap: 12, position: "relative" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <div style={{ width: 24, height: 24, borderRadius: "50%", background: T.teal, color: "#000", fontSize: 12, fontWeight: 900, display: "flex", alignItems: "center", justifyContent: "center" }}>{i + 1}</div>
                      <span style={{ fontWeight: 800 }}>Paso {i + 1}</span>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={{ fontSize: 11, color: T.whiteDim }}>Delay:</span>
                      <input type="number" style={{ width: 40, background: T.bg1, border: `1px solid ${T.border}`, color: T.white, padding: 4, borderRadius: 6, textAlign: "center" }} value={p.delay} onChange={e => updatePaso(i, "delay", +e.target.value)} />
                      <span style={{ fontSize: 11, color: T.whiteDim }}>días</span>
                      <Btn variant="fantasma" size="xs" onClick={() => setForm(prev => ({ ...prev, pasos: prev.pasos.filter((_, idx) => idx !== i) }))} style={{ color: T.red, marginLeft: 8 }}><Ico k="trash" size={14} /></Btn>
                    </div>
                  </div>
                  
                  <Inp placeholder="Asunto del correo" value={p.subject} onChange={e => updatePaso(i, "subject", e.target.value)} />
                  <textarea 
                    placeholder="Cuerpo del correo..."
                    value={p.body}
                    onChange={e => updatePaso(i, "body", e.target.value)}
                    style={{ background: T.bg1, color: T.white, border: `1px solid ${T.border}`, borderRadius: 10, padding: 12, minHeight: 100, fontFamily: "inherit", fontSize: 13 }}
                  />
                </div>
              ))}
              <Btn variant="fantasma" onClick={agregarPaso} full><Ico k="plus" size={12} /> Agregar Paso</Btn>
            </div>

            <div style={{ display: "flex", gap: 12, marginTop: 12 }}>
              <Btn variant="secundario" onClick={() => setShowEditor(false)} full>Cancelar</Btn>
              <Btn onClick={guardar} full style={{ background: T.teal, color: "#000" }}>Guardar Secuencia</Btn>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

const Campo = ({ label, children }) => (
  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
    <label style={{ fontSize: 11, color: T.whiteDim, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".05em" }}>{label}</label>
    {children}
  </div>
);
