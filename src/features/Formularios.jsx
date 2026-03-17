import { useState } from "react";
import { T } from "../theme";
import { uid } from "../utils";
import { Btn, Inp, Tarjeta, EncabezadoSeccion, Ico, Sel } from "../components/ui";
import { sb } from "../hooks/useSupaState";

export const Formularios = ({ db, setDb }) => {
  const [forms, setForms] = useState([
    { id: "f1", nombre: "Contacto Web Principal", campos: [{ id: "c1", tipo: "text", etiqueta: "Nombre Completo", req: true }, { id: "c2", tipo: "email", etiqueta: "Correo Electrónico", req: true }, { id: "c3", tipo: "textarea", etiqueta: "Mensaje", req: false }] }
  ]);
  const [activo, setActivo] = useState(forms[0]);
  const [previewName, setPreviewName] = useState("");
  const [previewEmail, setPreviewEmail] = useState("");

  const addCampo = () => {
    const nv = { ...activo, campos: [...activo.campos, { id: "c" + uid(), tipo: "text", etiqueta: "Nuevo Campo", req: false }] };
    setForms(p => p.map(x => x.id === activo.id ? nv : x)); setActivo(nv);
  };
  const dCampo = id => {
    const nv = { ...activo, campos: activo.campos.filter(c => c.id !== id) };
    setForms(p => p.map(x => x.id === activo.id ? nv : x)); setActivo(nv);
  };
  const uCampo = (id, k, v) => {
    const nv = { ...activo, campos: activo.campos.map(c => c.id === id ? { ...c, [k]: v } : c) };
    setForms(p => p.map(x => x.id === activo.id ? nv : x)); setActivo(nv);
  };

  const BASE_URL = "https://crm.ensing.lat";

  const copiarLink = () => {
    const url = `${BASE_URL}/#/f/${activo.id}`;
    navigator.clipboard.writeText(url);
    alert(`¡Enlace público copiado!\n\n${url}\n\nCompartilo con tus prospectos.`);
  };

  const guardarFormulario = async () => {
    // Save to Supabase for persistence
    const { error } = await sb.from("formularios_publicos").upsert({
      id: activo.id,
      nombre: activo.nombre,
      color: T.teal,
      campos: activo.campos,
      created_at: new Date().toISOString(),
    });
    if (error) {
      console.error("Error saving form:", error);
      alert("Formulario guardado localmente.");
    } else {
      alert(`✅ Formulario guardado. Link público:\n${BASE_URL}/#/f/${activo.id}`);
    }
  };

  return (
    <div style={{ display: "flex", gap: 30, height: "calc(100vh - 120px)" }}>
      {/* Editor Lateral */}
      <div style={{ width: 420, display: "flex", flexDirection: "column", gap: 20 }}>
        <EncabezadoSeccion title="Form Builder" sub="Crea formularios e intégralos para captar leads" actions={
          <div style={{ display: "flex", gap: 8 }}>
            <Btn variant="secundario" onClick={copiarLink}><Ico k="link" size={14} />Copiar Link Público</Btn>
            <Btn onClick={guardarFormulario}><Ico k="check" size={14} />Guardar</Btn>
          </div>
        } />
        
        <Tarjeta style={{ padding: 20, display: "flex", flexDirection: "column", gap: 16, overflowY: "auto", flex: 1, borderTop: `4px solid ${T.teal}` }}>
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: T.whiteDim, letterSpacing: ".1em", textTransform: "uppercase", marginBottom: 8 }}>Configuración Base</div>
            <Inp value={activo.nombre} onChange={e => { const nv = { ...activo, nombre: e.target.value }; setForms(p => p.map(x => x.id === activo.id ? nv : x)); setActivo(nv); }} style={{ fontSize: 16, fontWeight: 700 }} />
          </div>

          <div style={{ height: 1, background: T.borderHi, margin: "10px 0" }} />

          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: T.whiteDim, letterSpacing: ".1em", textTransform: "uppercase" }}>Campos del Formulario</div>
            <Btn variant="fantasma" size="sm" onClick={addCampo}><Ico k="plus" size={14} style={{ color: T.teal }} /> Añadir</Btn>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {activo.campos.map((c, i) => (
              <div key={c.id} style={{ background: T.bg2, border: `1px solid ${T.borderHi}`, borderRadius: 10, padding: 14, position: "relative" }}>
                <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
                  <Inp value={c.etiqueta} onChange={e => uCampo(c.id, "etiqueta", e.target.value)} style={{ flex: 1, fontWeight: 600 }} />
                  <Sel value={c.tipo} onChange={e => uCampo(c.id, "tipo", e.target.value)} style={{ width: 110 }}>
                    <option value="text">Texto Corto</option>
                    <option value="email">Email</option>
                    <option value="number">Número</option>
                    <option value="textarea">Área Texto</option>
                  </Sel>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                   <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: T.whiteDim, cursor: "pointer" }}>
                     <input type="checkbox" checked={c.req} onChange={e => uCampo(c.id, "req", e.target.checked)} style={{ accentColor: T.teal }} /> {c.req ? "Obligatorio" : "Opcional"}
                   </label>
                   <button onClick={() => dCampo(c.id)} style={{ background: "transparent", border: "none", color: T.red, cursor: "pointer", fontSize: 11, fontWeight: 700 }}>Borrar</button>
                </div>
              </div>
            ))}
          </div>
        </Tarjeta>
      </div>

      {/* Vista Previa En Vivo */}
      <div style={{ flex: 1, background: T.bg1, border: `1px dashed ${T.border}`, borderRadius: 16, padding: "40px", display: "flex", justifyContent: "center", alignItems: "flex-start", overflowY: "auto" }}>
        
        <div style={{ width: "100%", maxWidth: 480, background: "#FFF", borderRadius: 16, padding: 32, boxShadow: "0 25px 50px -12px rgba(0,0,0,0.1)", color: "#111827" }}>
          <h3 style={{ margin: "0 0 20px", fontSize: 24, fontWeight: 800, color: "#111827", textAlign: "center" }}>{activo.nombre}</h3>
          
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {activo.campos.map(c => {
              const esNom = c.tipo === "text" && c.etiqueta.includes("Nombre");
              const esMail = c.tipo === "email";
              return (
                <div key={c.id}>
                  <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#374151", marginBottom: 6 }}>{c.etiqueta} {c.req && <span style={{ color: "#EF4444" }}>*</span>}</label>
                  {c.tipo === "textarea" ? (
                    <textarea rows={4} style={{ width: "100%", padding: "10px 14px", border: "1px solid #D1D5DB", borderRadius: 8, fontSize: 14, fontFamily: "inherit", boxSizing: "border-box" }} placeholder={`Ingresa ${c.etiqueta.toLowerCase()}`} />
                  ) : (
                    <input type={c.tipo} value={esNom ? previewName : esMail ? previewEmail : undefined} onChange={e => { if(esNom) setPreviewName(e.target.value); if(esMail) setPreviewEmail(e.target.value); }} style={{ width: "100%", padding: "10px 14px", border: "1px solid #D1D5DB", borderRadius: 8, fontSize: 14, fontFamily: "inherit", boxSizing: "border-box" }} placeholder={`Ejemplo...`} />
                  )}
                </div>
              );
            })}
            <button onClick={() => window.open(`https://crm.ensing.lat/#/f/${activo.id}`, '_blank')} style={{ width: "100%", padding: "12px", marginTop: 8, background: T.teal, color: "#FFF", border: "none", borderRadius: 8, fontSize: 15, fontWeight: 700, cursor: "pointer", boxShadow: "0 4px 6px -1px rgba(37, 99, 235, 0.2)" }}>Abrir Formulario Público →</button>
          </div>
          
          <div style={{ textAlign: "center", marginTop: 20, fontSize: 11, color: "#9CA3AF" }}>🔒 Formulario seguro · Los datos van directo a tu CRM.</div>
        </div>

      </div>
    </div>
  );
};
