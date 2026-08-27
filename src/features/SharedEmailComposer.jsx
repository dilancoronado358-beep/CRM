import { useState, useRef, useEffect } from "react";
import { T } from "../theme";
import { Inp, Sel, Btn, Ico, Campo } from "../components/ui";
import { sb } from "../hooks/useSupaState";
import { sileo as toast } from "../utils/sileo";

export const VisualEditor = ({ html, onChange, style, onSelectionChange }) => {
  const ref = useRef(null);
  const [isFocused, setIsFocused] = useState(false);

  useEffect(() => {
    if (ref.current && !isFocused && ref.current.innerHTML !== html) {
      ref.current.innerHTML = html || "";
    }
  }, [html, isFocused]);

  const handleSelection = () => {
    if (onSelectionChange) onSelectionChange();
  };

  return (
    <div 
      ref={ref}
      contentEditable
      onFocus={() => setIsFocused(true)}
      onBlur={(e) => {
        setIsFocused(false);
        if (onChange) onChange(e.target.innerHTML);
      }}
      onKeyUp={handleSelection}
      onMouseUp={handleSelection}
      style={{ 
        outline: "none", 
        minHeight: "100%", 
        padding: "20px", 
        background: "#fff", 
        color: "#1e293b", 
        fontSize: 14, 
        lineHeight: 1.6, 
        cursor: "text",
        ...style 
      }}
    />
  );
};

export const SharedEmailComposer = ({ 
  db, 
  defaultTo = "", 
  onSend, 
  onDiscard, 
  simulandoEnvio = false,
  isModal = false
}) => {
  const [f, setF] = useState({ para: defaultTo, cc: "", bcc: "", asunto: "", cuerpo: "", plantillaId: "", tipo: "texto" });
  const [showCC, setShowCC] = useState(false);
  const [showBCC, setShowBCC] = useState(false);
  const [activeStyles, setActiveStyles] = useState({});
  const [adjuntosSubiendo, setAdjuntosSubiendo] = useState(false);
  const [adjuntosLocal, setAdjuntosLocal] = useState([]);
  const [showPreviewCompose, setShowPreviewCompose] = useState(false);

  useEffect(() => {
    if (defaultTo && !f.para) {
      setF(prev => ({ ...prev, para: defaultTo }));
    }
  }, [defaultTo, f.para]);

  const checkStyles = () => {
    if (f.tipo !== "texto") return;
    setActiveStyles({
      bold: document.queryCommandState("bold"),
      italic: document.queryCommandState("italic"),
      underline: document.queryCommandState("underline"),
      "align-left": document.queryCommandState("justifyLeft"),
      "align-center": document.queryCommandState("justifyCenter"),
      "align-right": document.queryCommandState("justifyRight"),
    });
  };

  const s = k => e => setF(p => ({ ...p, [k]: e.target.value }));

  const aplicarTpl = e => {
    const id = e.target.value;
    const tpl = db.plantillasEmail?.find(p => p.id === id);
    if (tpl) setF({ ...f, asunto: tpl.asunto || tpl.titulo, cuerpo: tpl.cuerpo || tpl.contenido, plantillaId: id, tipo: tpl.vars?.tipo || "texto" });
    else setF({ ...f, plantillaId: "", tipo: "texto" });
  };

  const redactarIA = () => {
    setF({ ...f, cuerpo: "Redactando con IA...\n\n" });
    setTimeout(() => {
      setF({ ...f, cuerpo: `Hola ${f.para.split("@")[0] || "cliente"},\n\nHe revisado nuestra última conversación y me gustaría dar el siguiente paso.\n\n¿Tienes disponibilidad para una breve reunión esta semana?\n\nSaludos,\n${db.usuario?.name || "Ejecutivo"}` });
    }, 1200);
  };

  const handleFileChange = async (e) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    setAdjuntosSubiendo(true);
    const nuevosAdjuntos = [...adjuntosLocal];
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const safeName = `att_${Date.now()}_${file.name.replace(/[^a-z0-9.]/gi, '_')}`;
      try {
        const { error } = await sb.storage.from('email-attachments').upload(safeName, file, { upsert: true });
        if (error) throw error;
        const { data: { publicUrl } } = sb.storage.from('email-attachments').getPublicUrl(safeName);
        nuevosAdjuntos.push({ name: file.name, url: publicUrl, type: file.type, size: file.size });
      } catch (err) { toast.error(`Error subiendo ${file.name}`); }
    }
    setAdjuntosLocal(nuevosAdjuntos);
    setAdjuntosSubiendo(false);
    e.target.value = "";
  };

  const confirmarEnvio = () => {
    if (!f.para.trim() || !f.cuerpo.trim()) {
      toast.error("El destinatario y el cuerpo del correo son requeridos.");
      return;
    }
    onSend({
      to: f.para,
      cc: f.cc,
      bcc: f.bcc,
      subject: f.asunto,
      body: f.cuerpo,
      attachments: adjuntosLocal
    });
  };

  // Tema blanco para el componente (como se muestra en la foto)
  const bgMain = "#ffffff";
  const bgInp = "rgba(0,0,0,0.02)";
  const borderCol = "rgba(0,0,0,0.1)";
  const textTitle = "#1e293b";
  const textSub = "#64748b";

  return (
    <div style={{ background: bgMain, borderRadius: isModal ? 0 : 16, padding: isModal ? "0" : "20px", color: textTitle, overflow: "hidden", display: "flex", flexDirection: "column" }}>
      <div style={{ display: "flex", flexDirection: "column", gap: 16, marginBottom: 20 }}>
        
        {/* TO / CC / BCC */}
        <div style={{ display: "flex", gap: 12, alignItems: "flex-end" }}>
          <div style={{ flex: 1 }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: textSub, marginBottom: 4, display: "block" }}>PARA</span>
            <Inp value={f.para} onChange={s("para")} placeholder="ej@ejemplo.com" style={{ background: "transparent", borderBottom: `1px solid ${borderCol}`, borderTop: "none", borderLeft: "none", borderRight: "none", borderRadius: 0, paddingLeft: 0, color: textTitle, fontWeight: 600 }} />
          </div>
          <div style={{ display: "flex", gap: 6, paddingBottom: 6 }}>
            <button onClick={() => setShowCC(!showCC)} style={{ background: "transparent", border: `1px solid ${showCC ? T.teal : borderCol}`, borderRadius: 100, padding: "4px 10px", color: showCC ? T.teal : textSub, fontSize: 10, fontWeight: 700, cursor: "pointer", transition: "all 0.2s" }}>CC</button>
            <button onClick={() => setShowBCC(!showBCC)} style={{ background: "transparent", border: `1px solid ${showBCC ? T.teal : borderCol}`, borderRadius: 100, padding: "4px 10px", color: showBCC ? T.teal : textSub, fontSize: 10, fontWeight: 700, cursor: "pointer", transition: "all 0.2s" }}>BCC</button>
          </div>
        </div>

        {showCC && <div style={{ animation: "fadeIn 0.2s" }}>
          <span style={{ fontSize: 11, fontWeight: 700, color: textSub, marginBottom: 4, display: "block" }}>CC (COPIA)</span>
          <Inp value={f.cc} onChange={s("cc")} placeholder="cc@ejemplo.com" style={{ background: "transparent", borderBottom: `1px solid ${borderCol}`, borderTop: "none", borderLeft: "none", borderRight: "none", borderRadius: 0, paddingLeft: 0, color: textTitle }} />
        </div>}

        {showBCC && <div style={{ animation: "fadeIn 0.2s" }}>
          <span style={{ fontSize: 11, fontWeight: 700, color: textSub, marginBottom: 4, display: "block" }}>BCC (COPIA OCULTA)</span>
          <Inp value={f.bcc} onChange={s("bcc")} placeholder="bcc@ejemplo.com" style={{ background: "transparent", borderBottom: `1px solid ${borderCol}`, borderTop: "none", borderLeft: "none", borderRight: "none", borderRadius: 0, paddingLeft: 0, color: textTitle }} />
        </div>}

        {/* ASUNTO */}
        <div>
          <span style={{ fontSize: 11, fontWeight: 700, color: textSub, marginBottom: 4, display: "block" }}>ASUNTO</span>
          <Inp value={f.asunto} onChange={s("asunto")} placeholder="Propuesta comercial..." style={{ background: "transparent", borderBottom: `1px solid ${borderCol}`, borderTop: "none", borderLeft: "none", borderRight: "none", borderRadius: 0, paddingLeft: 0, color: textTitle, fontWeight: 600, fontSize: 15 }} />
        </div>

      </div>

      {/* TOOLBAR SUPERIOR AL EDITOR */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <div style={{ display: "flex", gap: 12, alignItems: "center", flex: 1 }}>
          <div style={{ width: 140 }}>
            <Sel value={f.plantillaId} onChange={aplicarTpl} style={{ height: 32, fontSize: 11, background: bgInp, border: `1px solid ${borderCol}`, color: textTitle, borderRadius: 100, padding: "0 12px" }}>
              <option value="">— Plantilla... —</option>
              {(db.plantillasEmail || []).filter(p => p).map(p => <option key={p.id} value={p.id}>{p.nombre || p.titulo || p.asunto}</option>)}
            </Sel>
          </div>
          <button 
            onClick={() => document.getElementById('shared-attach').click()}
            style={{ background: "transparent", border: "none", borderRadius: 8, padding: "6px 12px", color: textTitle, fontSize: 11, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}
          >
            <Ico k="paperclip" size={14} /> Adjuntar
          </button>
          <input type="file" id="shared-attach" multiple style={{ display: "none" }} onChange={handleFileChange} />
        </div>
      </div>

      {/* CONTENEDOR DEL EDITOR CON SUS CONTROLES */}
      <div style={{ borderRadius: 12, overflow: "hidden", border: `1px solid ${borderCol}`, position: "relative", display: "flex", flexDirection: "column", flex: 1, minHeight: 300 }}>
         {/* TOOLBAR DEL EDITOR */}
         <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 16px", background: "#f8fafc", borderBottom: `1px solid ${borderCol}`, flexWrap: "wrap", flexShrink: 0 }}>
           <div style={{ display: "flex", background: "rgba(0,0,0,0.05)", borderRadius: 8, padding: 2, gap: 1 }}>
             <button onMouseDown={e => e.preventDefault()} onClick={() => setF({ ...f, tipo: "texto" })} style={{ padding: "4px 8px", borderRadius: 6, border: "none", background: f.tipo === "texto" ? T.teal : "transparent", color: f.tipo === "texto" ? "#fff" : textSub, fontSize: 10, fontWeight: 800, cursor: "pointer" }}>VISUAL</button>
             <button onMouseDown={e => e.preventDefault()} onClick={() => setF({ ...f, tipo: "html" })} style={{ padding: "4px 8px", borderRadius: 6, border: "none", background: f.tipo === "html" ? "#e2e8f0" : "transparent", color: f.tipo === "html" ? textTitle : textSub, fontSize: 10, fontWeight: 800, cursor: "pointer" }}>CODE</button>
           </div>

           <div style={{ width: 1, height: 16, background: borderCol }} />

           <div style={{ display: "flex", gap: 2 }}>
             {[
               { k: "bold", cmd: "bold" },
               { k: "italic", cmd: "italic" },
               { k: "underline", cmd: "underline" },
             ].map(b => (
               <button key={b.k} onMouseDown={e => e.preventDefault()} onClick={() => { if (f.tipo === "texto") { document.execCommand(b.cmd, false, null); checkStyles(); } }} style={{ width: 28, height: 28, borderRadius: 6, border: "none", background: activeStyles[b.k] ? "rgba(0,0,0,0.1)" : "transparent", color: textTitle, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}><Ico k={b.k} size={13} /></button>
             ))}
           </div>

           <div style={{ width: 1, height: 16, background: borderCol }} />

           <div style={{ display: "flex", gap: 2 }}>
             {[
               { k: "align-left", cmd: "justifyLeft" },
               { k: "align-center", cmd: "justifyCenter" },
               { k: "align-right", cmd: "justifyRight" },
             ].map(b => (
               <button key={b.k} onMouseDown={e => e.preventDefault()} onClick={() => { if (f.tipo === "texto") { document.execCommand(b.cmd, false, null); checkStyles(); } }} style={{ width: 28, height: 28, borderRadius: 6, border: "none", background: activeStyles[b.k] ? "rgba(0,0,0,0.1)" : "transparent", color: textTitle, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}><Ico k={b.k} size={13} /></button>
             ))}
           </div>
           
           <div style={{ marginLeft: "auto", display: "flex", gap: 6, alignItems: "center" }}>
              {[
                { k: "link", cmd: "createLink", prompt: "URL:" },
                { k: "image", cmd: "insertImage", prompt: "URL (Imagen):" },
                { k: "table", cmd: "insertHTML", val: `<table style="width:100%; border-collapse: collapse; margin: 12px 0; border: 1px solid #e2e8f0;"><tr><td style="border: 1px solid #e2e8f0; padding: 8px;">Col 1</td><td style="border: 1px solid #e2e8f0; padding: 8px;">Col 2</td></tr></table><p><br></p>` },
                { k: "code", cmd: "insertHTML", val: `<pre style="background: #1e293b; color: #f8fafc; padding: 12px; border-radius: 6px; font-size: 12px; margin: 12px 0;"><code>// Código</code></pre><p><br></p>` },
              ].map(b => (
                <button key={b.k} onMouseDown={e => e.preventDefault()} onClick={() => { if (f.tipo === "texto") { let v = b.val || null; if (b.prompt) v = prompt(b.prompt); if (v || !b.prompt) { document.execCommand(b.cmd, false, v); checkStyles(); } } }} style={{ width: 28, height: 28, borderRadius: 6, border: "none", background: "transparent", color: textSub, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", opacity: 0.7 }} onMouseEnter={e=>e.currentTarget.style.opacity=1} onMouseLeave={e=>e.currentTarget.style.opacity=0.7}><Ico k={b.k} size={13} /></button>
              ))}
              <div style={{ width: 1, height: 16, background: borderCol, margin: "0 4px" }} />
              <button onMouseDown={e => e.preventDefault()} onClick={redactarIA} style={{ background: "#e0f2fe", color: "#0284c7", border: "none", borderRadius: 8, height: 26, padding: "0 10px", fontSize: 10, fontWeight: 800, cursor: "pointer", display: "flex", alignItems: "center", gap: 4 }}><Ico k="lightning" size={12} /> IA</button>
           </div>
         </div>

         {/* ÁREA DE EDICIÓN */}
         <div style={{ position: "relative", flex: 1, display: "flex", flexDirection: "column" }}>
           {f.tipo === "html" ? (
             <textarea value={f.cuerpo} onChange={s("cuerpo")} 
               style={{ flex: 1, background: "#f8fafc", border: "none", color: textTitle, padding: 20, fontSize: 13, outline: "none", resize: "none", lineHeight: 1.6, fontFamily: "monospace" }} 
               placeholder="Código HTML del mensaje..." 
             />
           ) : (
             <div style={{ flex: 1, background: "#fff", overflowY: "auto" }}>
               <VisualEditor html={f.cuerpo} onChange={(html) => setF({ ...f, cuerpo: html })} onSelectionChange={checkStyles} style={{ fontSize: 14 }} />
             </div>
           )}
           {adjuntosSubiendo && <div style={{ position: "absolute", bottom: 12, right: 12, fontSize: 10, color: T.teal, fontWeight: 700 }}>Subiendo archivos...</div>}
         </div>
         
         {/* ADJUNTOS VISIBLES EN EL EDITOR */}
         {adjuntosLocal.length > 0 && (
          <div style={{ borderTop: `1px solid ${borderCol}`, padding: "8px 16px", background: "#f8fafc", display: "flex", gap: 8, flexWrap: "wrap", flexShrink: 0 }}>
            {adjuntosLocal.map((at, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 6, background: "#fff", padding: "4px 10px", borderRadius: 100, border: `1px solid ${borderCol}`, boxShadow: "0 1px 2px rgba(0,0,0,0.05)" }}>
                <Ico k="paperclip" size={12} style={{ color: textSub }} />
                <span style={{ fontSize: 11, color: textSub, fontWeight: 600 }}>{at.name}</span>
                <button onClick={() => setAdjuntosLocal(p => p.filter((_, idx) => idx !== i))} style={{ background: "none", border: "none", color: T.red, cursor: "pointer", padding: 0, marginLeft: 4, display: "flex" }}><Ico k="x" size={12} /></button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* BOTONES DE ACCIÓN */}
      <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 24, gap: 12 }}>
        {onDiscard && (
          <button onClick={onDiscard} style={{ background: "transparent", color: textSub, border: `1px solid ${borderCol}`, borderRadius: 8, padding: "0 20px", height: 44, fontWeight: 700, fontSize: 13, cursor: "pointer" }}>Descartar</button>
        )}
        <Btn onClick={confirmarEnvio} disabled={simulandoEnvio || adjuntosSubiendo} style={{ padding: "0 24px", height: 44, borderRadius: 8, display: "flex", alignItems: "center", gap: 8, background: T.teal }}>
          {simulandoEnvio ? "Enviando..." : <><Ico k="send" size={16} /> Enviar Ahora</>}
        </Btn>
      </div>

    </div>
  );
};
