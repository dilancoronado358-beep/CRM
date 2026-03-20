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
      const { creador, ...act } = { ...editando, ...f };
      setDb(d => ({ ...d, plantillasEmail: d.plantillasEmail.map(p => p.id === editando.id ? act : p) }));
      await guardarEnSupa("plantillasEmail", act);
    } else {
      const nv = { ...f, id: "tpl" + uid() };
      setDb(d => ({ ...d, plantillasEmail: [nv, ...(d.plantillasEmail || [])] }));
      await guardarEnSupa("plantillasEmail", nv);
    }
    setShowForm(false); setEditando(null); setF({ titulo: "", categoria: "prospectacion", asunto: "", cuerpo: "", tipo: "texto" });
  };

  const eliminar = async id => {
    if (!confirm("¿Eliminar plantilla?")) return;
    setDb(d => ({ ...d, plantillasEmail: d.plantillasEmail.filter(p => p.id !== id) }));
    await eliminarDeSupa("plantillasEmail", id);
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

      <Modal open={showForm} onClose={() => { setShowForm(false); setEditando(null); }} title={editando ? "Diseño de Plantilla Premium" : "Crear Nueva Experiencia de Correo"} width={850}>
        <div style={{ position: "relative", padding: "8px 12px 24px" }}>
          
          {/* SECCIÓN DE DATOS (GLASS CARD) */}
          <div style={{ background: T.bg2, backdropFilter: "blur(20px)", borderRadius: 24, padding: "28px 32px", border: `1.5px solid ${T.whiteFade}20`, marginBottom: 24, boxShadow: "0 15px 35px rgba(0,0,0,0.2)" }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 200px", gap: 32 }}>
              <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  <label style={{ fontSize: 10, fontWeight: 800, color: T.teal, textTransform: "uppercase", letterSpacing: "0.1em" }}>Identificación de Plantilla</label>
                  <Inp value={f.titulo} onChange={s("titulo")} placeholder="Escribe un nombre interno que sea fácil de recordar..." style={{ background: "transparent", border: "none", borderBottom: `2px solid ${T.whiteFade}15`, borderRadius: 0, padding: "8px 0", fontSize: 18, fontWeight: 700, color: T.white }} />
                </div>
                
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  <label style={{ fontSize: 10, fontWeight: 800, color: T.whiteDim, textTransform: "uppercase", letterSpacing: "0.1em" }}>Asunto Estratégico</label>
                  <Inp value={f.asunto} onChange={s("asunto")} placeholder="Atrapa la atención con un gran asunto..." style={{ background: T.bg1, border: `1.5px solid ${T.whiteFade}15`, borderRadius: 12, padding: "12px 16px", fontSize: 14 }} />
                </div>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  <label style={{ fontSize: 10, fontWeight: 800, color: T.whiteDim, textTransform: "uppercase", letterSpacing: "0.1em" }}>Propósito / Categoría</label>
                  <Sel value={f.categoria} onChange={s("categoria")} style={{ height: 44, borderRadius: 12 }}>
                    {Object.entries(TPL_CATS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                  </Sel>
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                   <label style={{ fontSize: 10, fontWeight: 800, color: T.whiteDim, textTransform: "uppercase", letterSpacing: "0.1em" }}>Intercambio de Datos</label>
                   <button style={{ height: 44, borderRadius: 12, border: `1.5px dashed ${T.whiteFade}20`, background: "transparent", color: T.whiteDim, fontSize: 12, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }} onMouseEnter={e => e.currentTarget.style.borderColor = T.teal}>
                     <Ico k="refresh" size={14} /> Vincular Variables
                   </button>
                </div>
              </div>
            </div>
          </div>

          {/* EDITOR SECTION */}
          <div style={{ borderRadius: 24, overflow: "hidden", border: `1.5px solid ${T.whiteFade}10`, boxShadow: "0 20px 40px rgba(0,0,0,0.2)" }}>
            {/* TOOLBAR MODERNA */}
            <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "14px 24px", background: "rgba(255,255,255,0.03)", borderBottom: `1.5px solid ${T.whiteFade}08`, backdropFilter: "blur(10px)" }}>
              <div style={{ display: "flex", background: "rgba(0,0,0,0.2)", borderRadius: 10, padding: 3, gap: 2 }}>
                <button onClick={() => setF({ ...f, tipo: "texto" })} style={{ padding: "6px 12px", borderRadius: 8, border: "none", background: f.tipo === "texto" ? T.teal : "transparent", color: f.tipo === "texto" ? "#000" : T.whiteDim, fontSize: 11, fontWeight: 800, cursor: "pointer", transition: "all 0.2s" }}>TEXTO</button>
                <button onClick={() => setF({ ...f, tipo: "html" })} style={{ padding: "6px 12px", borderRadius: 8, border: "none", background: f.tipo === "html" ? T.teal : "transparent", color: f.tipo === "html" ? "#000" : T.whiteDim, fontSize: 11, fontWeight: 800, cursor: "pointer", transition: "all 0.2s" }}>HTML PRO</button>
              </div>

              <div style={{ width: 1.5, height: 20, background: T.whiteFade + "15" }} />

              <div style={{ display: "flex", gap: 6 }}>
                {["bold", "list", "mail"].map(k => (
                  <button key={k} style={{ width: 34, height: 34, borderRadius: 8, border: "none", background: "rgba(255,255,255,0.05)", color: T.whiteOff, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }} onMouseEnter={e => e.currentTarget.style.background = "rgba(255,255,255,0.1)"}>
                    <Ico k={k === "bold" ? "edit" : k} size={15} />
                  </button>
                ))}
              </div>

              <div style={{ marginLeft: "auto", display: "flex", gap: 12 }}>
                {f.tipo === "html" && (
                  <button onClick={() => fileInputRef.current.click()} style={{ background: T.whiteOff, color: "#000", border: "none", borderRadius: 8, padding: "0 16px", height: 34, fontSize: 11, fontWeight: 800, cursor: "pointer", display: "flex", alignItems: "center", gap: 8 }}>
                    <Ico k="paperclip" size={14} /> IMPORTAR HTML
                  </button>
                )}
                <button onClick={() => setShowPreview(true)} style={{ background: "rgba(20,184,166,0.15)", color: T.teal, border: `1px solid ${T.teal}40`, borderRadius: 8, padding: "0 16px", height: 34, fontSize: 11, fontWeight: 800, cursor: "pointer", display: "flex", alignItems: "center", gap: 8 }} onMouseEnter={e => e.currentTarget.style.background = T.teal + "30"}>
                  <Ico k="eye" size={14} /> VISTA PREVIA
                </button>
              </div>
            </div>

            <textarea value={f.cuerpo} onChange={s("cuerpo")} 
               style={{ width: "100%", height: 380, background: "rgba(0,0,0,0.15)", border: "none", color: T.whiteOff, padding: 32, fontSize: 15, outline: "none", resize: "none", lineHeight: 1.7, fontFamily: f.tipo === "html" ? "monospace" : "inherit" }} 
               placeholder={f.tipo === "html" ? "Escribe o pega aquí tu código HTML profesional..." : "Empieza a escribir tu mensaje... Usa {{nombre}} para personalizar."} 
            />
          </div>
          <input type="file" hidden ref={fileInputRef} accept=".html" onChange={handleUploadHtml} />

          {/* ACCIONES FINALES */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 32 }}>
            <div style={{ display: "flex", gap: 24, opacity: 0.6 }}>
               <span style={{ fontSize: 12, fontWeight: 700, color: T.whiteDim, display: "flex", alignItems: "center", gap: 6 }}><Ico k="check" size={14} /> Autoguardado activo</span>
               <span style={{ fontSize: 12, fontWeight: 700, color: T.whiteDim, display: "flex", alignItems: "center", gap: 6 }}><Ico k="bell" size={14} /> Notificar al equipo</span>
            </div>

            <div style={{ display: "flex", gap: 16 }}>
              <button 
                onClick={() => { setShowForm(false); setEditando(null); }} 
                style={{ background: "transparent", border: `1px solid ${T.whiteFade}15`, color: T.whiteDim, borderRadius: 12, padding: "0 24px", height: 48, fontSize: 13, fontWeight: 700, cursor: "pointer", transition: "all 0.2s" }}
                onMouseEnter={e => e.currentTarget.style.color = T.white}
              >
                DESCARTAR
              </button>
              <button 
                onClick={guardar} 
                disabled={!f.titulo.trim() || !f.cuerpo.trim()}
                style={{ background: `linear-gradient(135deg, ${T.teal}, #0D9488)`, color: "#fff", border: "none", borderRadius: 12, padding: "0 40px", height: 48, fontSize: 13, fontWeight: 900, cursor: "pointer", boxShadow: `0 10px 25px ${T.teal}40`, transition: "all 0.3s" }}
                onMouseEnter={e => { e.currentTarget.style.transform = "scale(1.02) translateY(-2px)"; e.currentTarget.style.boxShadow = `0 15px 30px ${T.teal}60`; }}
                onMouseLeave={e => { e.currentTarget.style.transform = "none"; e.currentTarget.style.boxShadow = `0 10px 25px ${T.teal}40`; }}
              >
                GUARDAR PLANTILLA
              </button>
            </div>
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
