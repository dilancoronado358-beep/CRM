import React, { useEffect, useState } from 'react';
import { useSupaState } from '../hooks/useSupaState';
import { T } from '../theme';

export const LandingPagePublica = ({ siteSlug }) => {
  const { db } = useSupaState();
  const [site, setSite] = useState(null);

  useEffect(() => {
    if (db.websites) {
      // Intentamos buscar por slug (id)
      const s = db.websites.find(w => w.id === siteSlug || w.slug === siteSlug);
      if (s) setSite(s);
    }
  }, [db.websites, siteSlug]);

  if (!db.websites) return <div style={{height: "100vh", display: "flex", justifyContent: "center", alignItems: "center", background: T.bg0, color: T.white}}>Cargando...</div>;
  if (!site) return <div style={{height: "100vh", display: "flex", justifyContent: "center", alignItems: "center", background: T.bg0, color: T.white}}>404 - Landing Page No Encontrada</div>;

  return (
    <div style={{ minHeight: "100vh", background: T.bg0, color: T.white, fontFamily: "'Inter', sans-serif" }}>
      {site.componentes.map((c, i) => {
        if (c.tipo === "hero") {
          return (
            <div key={i} style={{ padding: "100px 32px", textAlign: "center", background: `linear-gradient(to bottom, ${T.bg1}, ${T.bg0})`, borderBottom: `1px solid ${T.borderHi}` }}>
              <div style={{ maxWidth: 900, margin: "0 auto" }}>
                <h1 style={{ fontSize: 52, fontWeight: 800, margin: "0 0 24px 0", letterSpacing: "-.02em", color: T.white }}>{c.props.titulo}</h1>
                <p style={{ fontSize: 20, color: T.whiteDim, margin: "0 0 40px 0", lineHeight: 1.6 }}>{c.props.subtitulo}</p>
                <div style={{ display: "flex", gap: 16, justifyContent: "center" }}>
                   {c.props.ctaPrincipal && <button style={{ background: T.grad, color: "#fff", border: "none", borderRadius: 8, padding: "14px 32px", fontSize: 16, fontWeight: 700, cursor: "pointer" }}>{c.props.ctaPrincipal}</button>}
                   {c.props.ctaSecundario && <button style={{ background: "transparent", color: T.white, border: `1px solid ${T.borderHi}`, borderRadius: 8, padding: "14px 32px", fontSize: 16, fontWeight: 700, cursor: "pointer" }}>{c.props.ctaSecundario}</button>}
                </div>
              </div>
            </div>
          );
        }
        if (c.tipo === "features") {
          return (
            <div key={i} style={{ padding: "80px 32px", background: T.bg0 }}>
               <div style={{ maxWidth: 1200, margin: "0 auto", display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 40 }}>
                 {[1,2,3].map(n => (
                   <div key={n} style={{ background: T.bg1, padding: 32, borderRadius: 16, border: `1px solid ${T.borderHi}` }}>
                     <div style={{ width: 48, height: 48, borderRadius: 12, background: T.bg2, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, marginBottom: 20 }}>🚀</div>
                     <h3 style={{ fontSize: 20, fontWeight: 700, margin: "0 0 12px 0", color: T.white }}>Característica Opcional {n}</h3>
                     <p style={{ margin: 0, color: T.whiteDim, lineHeight: 1.6, fontSize: 15 }}>Descripción de valor agregado que ofrece tu producto a la industria.</p>
                   </div>
                 ))}
               </div>
            </div>
          );
        }
        return <div key={i} style={{ padding: 20, color: T.whiteDim }}>Componente {c.tipo} no implementado en render público.</div>;
      })}
      
      <div style={{ padding: 40, textAlign: "center", borderTop: `1px solid ${T.borderHi}`, background: T.bg1, color: T.whiteDim, fontSize: 13 }}>
        © {new Date().getFullYear()} {site.nombre}. Todos los derechos reservados.
      </div>
    </div>
  );
};
