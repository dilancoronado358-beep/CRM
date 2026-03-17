import React, { useEffect, useState } from 'react';
import { useSupaState } from '../hooks/useSupaState';
import { T } from '../theme';

export const FormularioPublico = ({ formId }) => {
  const { db, guardarEnSupa } = useSupaState();
  const [form, setForm] = useState(null);
  const [data, setData] = useState({});
  const [enviado, setEnviado] = useState(false);

  useEffect(() => {
    if (db.formularios) {
      const formEncontrado = db.formularios.find(f => f.id === formId);
      if (formEncontrado) setForm(formEncontrado);
    }
  }, [db.formularios, formId]);

  if (!db.formularios) return <div style={{height: "100vh", display: "flex", justifyContent: "center", alignItems: "center", background: T.bg0, color: T.white}}>Cargando...</div>;
  if (!form) return <div style={{height: "100vh", display: "flex", justifyContent: "center", alignItems: "center", background: T.bg0, color: T.white}}>404 - Formulario No Encontrado</div>;

  const handleSubmit = (e) => {
    e.preventDefault();
    const dealStr = Object.entries(data).map(([k,v]) => `${k}: ${v}`).join(", ");
    guardarEnSupa("deals", { titulo: `Lead (${form.titulo}): ${data.nombre?data.nombre:'Nuevo Prospecto'}`, pipelineId: "pl_1", etapaId: "et_1", valor: 0, prob: 20, notas: dealStr, custom_fields: Object.entries(data).map(([k,v]) => ({nombre: k, valor: v})) });
    setEnviado(true);
  };

  if (enviado) {
    return (
      <div style={{ height: "100vh", display: "flex", justifyContent: "center", alignItems: "center", background: T.bg1, color: T.white, padding: 20 }}>
        <div style={{ background: T.bg2, padding: 40, borderRadius: 12, border: `1px solid ${T.borderHi}`, textAlign: "center", maxWidth: 400 }}>
          <div style={{ fontSize: 40, marginBottom: 10 }}>🎉</div>
          <h2 style={{ margin: "0 0 10px 0", color: T.teal }}>¡Gracias!</h2>
          <p style={{ margin: 0, color: T.whiteDim, lineHeight: 1.5 }}>Hemos recibido tus datos correctamente. Nuestro equipo te contactará en breve.</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", display: "flex", justifyContent: "center", padding: "50px 20px", background: T.bg0 }}>
      <div style={{ maxWidth: 600, width: "100%" }}>
        <div style={{ background: T.bg1, borderRadius: 16, padding: 40, border: `1px solid ${T.borderHi}`, boxShadow: "0 20px 40px rgba(0,0,0,0.2)" }}>
           <h1 style={{ fontSize: 28, margin: "0 0 8px 0", color: T.white, fontWeight: 800 }}>{form.titulo}</h1>
           {form.desc && <p style={{ fontSize: 15, color: T.whiteDim, margin: "0 0 32px 0" }}>{form.desc}</p>}

           <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 20 }}>
              {form.campos.map(c => (
                <div key={c.id} style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  <label style={{ fontSize: 13, fontWeight: 700, color: T.whiteOff }}>{c.label} {c.req && <span style={{color: T.red}}>*</span>}</label>
                  {c.tipo === "textarea" ? (
                     <textarea required={c.req} value={data[c.label] || ""} onChange={e => setData({...data, [c.label]: e.target.value})} rows={4} style={{ background: T.bg2, border: `1px solid ${T.border}`, borderRadius: 8, padding: 12, color: T.white, fontSize: 14, outline: "none", resize: "vertical", fontFamily: "inherit" }} onFocus={e => e.target.style.borderColor = T.teal} onBlur={e => e.target.style.borderColor = T.border} />
                  ) : (
                     <input type={c.tipo} required={c.req} value={data[c.label] || ""} onChange={e => setData({...data, [c.label]: e.target.value})} style={{ background: T.bg2, border: `1px solid ${T.border}`, borderRadius: 8, padding: "12px 16px", color: T.white, fontSize: 14, outline: "none", transition: "border-color .2s", width: "100%", boxSizing: "border-box" }} onFocus={e => e.target.style.borderColor = T.teal} onBlur={e => e.target.style.borderColor = T.border} />
                  )}
                </div>
              ))}
              <div style={{ marginTop: 12 }}>
                 <button type="submit" style={{ background: T.grad, color: "#fff", border: "none", borderRadius: 8, padding: "14px 24px", fontSize: 15, fontWeight: 700, cursor: "pointer", width: "100%", transition: "opacity .2s" }} onMouseEnter={e => e.target.style.opacity=0.9} onMouseLeave={e => e.target.style.opacity=1}>
                   Enviar Datos
                 </button>
              </div>
           </form>
           <div style={{ textAlign: "center", marginTop: 40, fontSize: 12, color: T.whiteDim }}>
             Impulsado por <span style={{fontWeight: 700, color: T.white}}>NexusCRM</span>
           </div>
        </div>
      </div>
    </div>
  );
};
