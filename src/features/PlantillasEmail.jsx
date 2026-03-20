import { useState, useRef } from "react";
import { T } from "../theme";
import { uid, TPL_CATS } from "../utils";
import { Chip, Btn, Inp, Sel, Campo, Modal, Tarjeta, Vacio, EncabezadoSeccion, BuscadorBar, Ico } from "../components/ui";

export const PlantillasEmail = ({ db, setDb, guardarEnSupa, eliminarDeSupa }) => {
  const [showForm, setShowForm] = useState(false);
  const [f, setF] = useState({ titulo: "", categoria: "prospectacion", asunto: "", cuerpo: "", tipo: "texto" });
  const [editando, setEditando] = useState(null);
  const [busqueda, setBusqueda] = useState("");
  const [showPreview, setShowPreview] = useState(false);
  const fileInputRef = useRef(null);
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
    setShowForm(false); setEditando(null); setF({ titulo: "", categoria: "prospectacion", asunto: "", cuerpo: "", tipo: "texto" });
  };

  const eliminar = async id => {
    if (!confirm("¿Eliminar plantilla?")) return;
    setDb(d => ({ ...d, plantillasEmail: d.plantillasEmail.filter(p => p.id !== id) }));
    await eliminarDeSupa("plantillas", id);
  };
  
  const handleUploadHtml = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      setF(p => ({ ...p, cuerpo: ev.target.result, tipo: "html" }));
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  return (
    <div>
      <EncabezadoSeccion title="Plantillas de Correo" sub={`${filtradas.length} plantillas creadas listas para usar`}
        actions={<Btn onClick={() => { setEditando(null); setF({ titulo: "", categoria: "prospectacion", asunto: "", cuerpo: "", tipo: "texto" }); setShowForm(true); }}><Ico k="plus" size={14} />Nueva Plantilla</Btn>} />

      <div style={{ marginBottom: 24, maxWidth: 500 }}><BuscadorBar value={busqueda} onChange={e => setBusqueda(e.target.value)} placeholder="Buscar plantillas..." /></div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(350px, 1fr))", gap: 20 }}>
        {filtradas.map(p => {
          const cinfo = TPL_CATS[p.categoria] || TPL_CATS.prospectacion;
          return (
            <Tarjeta key={p.id} style={{ padding: 24, display: "flex", flexDirection: "column" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
                <div style={{ display: "flex", gap: 8 }}>
                  <Chip label={cinfo.label || p.categoria} color={cinfo.color} />
                  {p.tipo === "html" && <Chip label="HTML" color={T.teal} variant="turquesa" />}
                </div>
                <div style={{ display: "flex", gap: 6 }}>
                  <Btn variant="fantasma" size="sm" onClick={() => { setEditando(p); setF({ titulo: p.titulo, categoria: p.categoria, asunto: p.asunto, cuerpo: p.cuerpo, tipo: p.tipo || "texto" }); setShowForm(true); }}><Ico k="edit" size={14} /></Btn>
                  <Btn variant="fantasma" size="sm" onClick={() => eliminar(p.id)}><Ico k="trash" size={14} style={{ color: T.red }} /></Btn>
                </div>
              </div>
              <div style={{ fontSize: 16, fontWeight: 800, color: T.white, marginBottom: 8 }}>{p.titulo}</div>
              <div style={{ fontSize: 13, fontWeight: 700, color: T.whiteDim, marginBottom: 12 }}>Asunto: <span style={{ color: T.teal }}>{p.asunto}</span></div>
              <div style={{ background: T.bg2, borderRadius: 8, padding: 16, fontSize: 13, color: T.whiteOff, whiteSpace: "pre-wrap", flex: 1, fontFamily: "monospace", overflow: "hidden", textOverflow: "ellipsis", display: "-webkit-box", WebkitLineClamp: 4, WebkitBoxOrient: "vertical", opacity: p.tipo === "html" ? 0.7 : 1 }}>
                {p.tipo === "html" ? "<!-- Código HTML -->\n" + p.cuerpo : p.cuerpo}
              </div>
            </Tarjeta>
          );
        })}
      </div>
      {filtradas.length === 0 && <Vacio text="No hay plantillas." />}

      <Modal open={showForm} onClose={() => { setShowForm(false); setEditando(null); }} title={editando ? "Editar Plantilla de correo electrónico" : "Nueva Plantilla de correo electrónico"} width={800}>
        <div style={{ background: "rgba(255,255,255,0.02)", borderRadius: 12, padding: 24, border: `1px solid ${T.whiteFade}10` }}>
          
          {/* Fila 1: Nombre */}
          <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 16 }}>
            <div style={{ width: 80, fontSize: 13, fontWeight: 700, color: T.whiteDim, textAlign: "right" }}>Nombre:</div>
            <div style={{ flex: 1 }}><Inp value={f.titulo} onChange={s("titulo")} placeholder="Ingrese su nombre" style={{ background: "rgba(255,255,255,0.03)", border: `1px solid ${T.whiteFade}15`, height: 38 }} /></div>
          </div>

          {/* Fila 2: Unión */}
          <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 16 }}>
            <div style={{ width: 80, fontSize: 13, fontWeight: 700, color: T.whiteDim, textAlign: "right" }}>Unión:</div>
            <div style={{ width: 120 }}>
              <Sel value={f.categoria} onChange={s("categoria")} style={{ height: 32, background: "transparent" }}>
                {Object.entries(TPL_CATS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
              </Sel>
            </div>
          </div>

          {/* Fila 3: Compartir */}
          <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 16 }}>
            <div style={{ width: 80, fontSize: 13, fontWeight: 700, color: T.whiteDim, textAlign: "right" }}>Compartir:</div>
            <div style={{ flex: 1, height: 38, border: `1px solid ${T.whiteFade}15`, borderRadius: 8, background: "rgba(255,255,255,0.02)", display: "flex", alignItems: "center", padding: "0 12px" }}>
              <button style={{ background: "none", border: "none", color: T.teal, fontSize: 13, fontWeight: 800, cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}>
                <Ico k="plus" size={14} /> Agregar
              </button>
            </div>
          </div>

          <div style={{ height: 1.5, background: T.whiteFade + "08", margin: "24px 0" }} />

          {/* Fila 4: De (Remitente) */}
          <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 16 }}>
            <div style={{ width: 80, fontSize: 13, fontWeight: 700, color: T.whiteDim, textAlign: "right" }}>De:</div>
            <div style={{ flex: 1, display: "flex", alignItems: "center", gap: 8, color: T.whiteOff, fontSize: 13 }}>
              <div style={{ width: 24, height: 24, borderRadius: "50%", background: T.whiteFade + "15", display: "flex", alignItems: "center", justifyContent: "center" }}><Ico k="user" size={14} /></div>
              <span>Remitente predeterminado ("De")</span>
              <Ico k="chevron-down" size={12} style={{ color: T.whiteDim, marginLeft: 4 }} />
            </div>
          </div>

          {/* Fila 5: Asunto */}
          <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 24 }}>
            <div style={{ width: 80, fontSize: 13, fontWeight: 700, color: T.whiteDim, textAlign: "right" }}>Asunto:</div>
            <div style={{ flex: 1, display: "flex", gap: 12 }}>
              <Inp value={f.asunto} onChange={s("asunto")} placeholder="Ingrese el asunto del mensaje" style={{ background: "rgba(255,255,255,0.03)", border: `1px solid ${T.whiteFade}15`, height: 38 }} />
              <button style={{ width: 38, height: 38, borderRadius: 8, background: "rgba(255,255,255,0.05)", border: "none", color: T.whiteDim, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Ico k="refresh" size={14} />
              </button>
            </div>
          </div>

          {/* TOOLBAR */}
          <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 16px", background: "rgba(255,255,255,0.02)", border: `1px solid ${T.whiteFade}15`, borderBottom: "none", borderTopLeftRadius: 12, borderTopRightRadius: 12 }}>
            <div style={{ display: "flex", gap: 4 }}>
              {["B", "I", "U", "S"].map(t => <button key={t} style={{ width: 32, height: 32, borderRadius: 6, background: "transparent", border: "none", color: T.whiteOff, fontWeight: 800, fontSize: 14, cursor: "pointer" }}>{t}</button>)}
              <button style={{ width: 32, height: 32, borderRadius: 6, background: "transparent", border: "none", color: T.whiteOff, cursor: "pointer" }}><Ico k="edit" size={16} /></button>
            </div>
            <div style={{ width: 1.5, height: 20, background: T.whiteFade + "15" }} />
            <div style={{ display: "flex", gap: 4 }}>
              <button style={{ padding: "0 10px", height: 32, borderRadius: 6, background: "rgba(255,255,255,0.05)", border: `1px solid ${T.whiteFade}15`, color: T.whiteOff, fontSize: 12, display: "flex", alignItems: "center", gap: 6, cursor: "pointer" }}>
                Fuente <Ico k="chevron-down" size={10} />
              </button>
            </div>
            <div style={{ width: 1.5, height: 20, background: T.whiteFade + "15" }} />
            <div style={{ display: "flex", gap: 4 }}>
               <button style={{ width: 32, height: 32, borderRadius: 6, background: "transparent", border: "none", color: T.whiteOff, cursor: "pointer" }}><Ico k="list" size={16} /></button>
               <button style={{ width: 32, height: 32, borderRadius: 6, background: "transparent", border: "none", color: T.whiteOff, cursor: "pointer" }}><Ico k="list" size={16} /></button>
               <button style={{ width: 32, height: 32, borderRadius: 6, background: "transparent", border: "none", color: T.whiteOff, cursor: "pointer" }}><Ico k="funnel" size={16} /></button>
            </div>
            <div style={{ width: 1.5, height: 20, background: T.whiteFade + "15" }} />
            <div style={{ display: "flex", gap: 8, ml: "auto", flex: 1, justifyContent: "flex-end" }}>
               <button onClick={() => fileInputRef.current.click()} style={{ width: 32, height: 32, borderRadius: 6, background: "transparent", border: "none", color: T.whiteDim, cursor: "pointer" }} title="Subir HTML"><Ico k="phone" size={16} /></button>
               <button onClick={() => setShowPreview(true)} style={{ width: 32, height: 32, borderRadius: 6, background: "transparent", border: "none", color: T.teal, cursor: "pointer" }} title="Vista Previa"><Ico k="eye" size={16} /></button>
            </div>
          </div>

          <textarea value={f.cuerpo} onChange={s("cuerpo")} 
               style={{ width: "100%", height: 350, background: "rgba(0,0,0,0.1)", border: `1px solid ${T.whiteFade}15`, borderBottomLeftRadius: 12, borderBottomRightRadius: 12, color: T.whiteOff, padding: 24, fontSize: 14, outline: "none", resize: "none", lineHeight: 1.6, fontFamily: "inherit" }} 
               placeholder="Escribe tu mensaje aquí o sube un archivo HTML..." 
          />
          <input type="file" hidden ref={fileInputRef} accept=".html" onChange={handleUploadHtml} />

          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 20, padding: "0 8px" }}>
            <div style={{ display: "flex", gap: 24 }}>
               <button style={{ background: "none", border: "none", color: T.whiteFade, fontSize: 13, display: "flex", alignItems: "center", gap: 8, cursor: "pointer", opacity: 0.6 }}><Ico k="paperclip" size={16} /> Archivo</button>
               <button style={{ background: "none", border: "none", color: T.whiteFade, fontSize: 13, display: "flex", alignItems: "center", gap: 8, cursor: "pointer", opacity: 0.6 }}><Ico k="note" size={16} /> Crear documento</button>
            </div>
            <div style={{ color: T.teal, fontWeight: 800, fontSize: 24, opacity: 0.2 }}>A</div>
          </div>

          <div style={{ height: 1.5, background: T.whiteFade + "08", margin: "24px 0" }} />

          <div style={{ display: "flex", gap: 24, alignItems: "center" }}>
            <button onClick={guardar} 
              style={{ background: "#A3E635", color: "#000", border: "none", borderRadius: 8, padding: "12px 32px", fontSize: 13, fontWeight: 900, cursor: "pointer", textTransform: "uppercase", letterSpacing: "0.05em", boxShadow: "0 8px 20px rgba(163,230,53,0.3)" }}>
              GUARDAR
            </button>
            <button onClick={() => { setShowForm(false); setEditando(null); }} style={{ background: "none", border: "none", color: T.whiteDim, fontSize: 13, fontWeight: 800, cursor: "pointer", textTransform: "uppercase" }}>
              CANCELAR
            </button>
          </div>
        </div>
      </Modal>
      <Modal open={showPreview} onClose={() => setShowPreview(false)} title="Vista Previa de Plantilla" width={800}>
        <div style={{ background: "#fff", borderRadius: 12, padding: 0, overflow: "hidden", border: `1px solid ${T.border}` }}>
          {f.tipo === "html" ? (
             <iframe
               title="Preview"
               srcDoc={f.cuerpo}
               style={{ width: "100%", height: "500px", border: "none" }}
             />
          ) : (
            <div style={{ padding: 40, color: "#1e293b", whiteSpace: "pre-wrap", minHeight: 300, fontFamily: "sans-serif" }}>
              {f.cuerpo}
            </div>
          )}
        </div>
        <Btn onClick={() => setShowPreview(false)} style={{ marginTop: 20 }} full>Cerrar Vista Previa</Btn>
      </Modal>
    </div>
  );
};
