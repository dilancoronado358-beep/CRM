import { useState, useMemo } from "react";
import { T } from "../theme";
import { Ico, Btn, Tarjeta } from "../components/ui";

export const NotificationCenter = ({ db, guardarEnSupa, setModulo }) => {
  const [isOpen, setIsOpen] = useState(false);
  const user = db.usuario;
  
  const notis = useMemo(() => {
    return (db.notificaciones || [])
      .filter(n => n.usuario_id === user?.id || !n.usuario_id)
      .sort((a, b) => new Date(b.creado) - new Date(a.creado));
  }, [db.notificaciones, user?.id]);

  const noLeidas = notis.filter(n => !n.leida).length;

  const marcarLeida = async (id) => {
    const n = notis.find(x => x.id === id);
    if (n) await guardarEnSupa("notificaciones", { ...n, leida: true });
  };

  const marcarTodasLeidas = async () => {
    for (const n of notis.filter(x => !x.leida)) {
      await guardarEnSupa("notificaciones", { ...n, leida: true });
    }
  };

  return (
    <div style={{ position: "relative" }}>
      <button onClick={() => setIsOpen(!isOpen)} 
        style={{ background: "transparent", border: "none", cursor: "pointer", position: "relative", padding: 8, display: "flex", alignItems: "center", color: noLeidas > 0 ? T.teal : T.whiteDim, transition: "transform .2s" }}
        onMouseEnter={e => e.currentTarget.style.transform = "scale(1.1)"}
        onMouseLeave={e => e.currentTarget.style.transform = "scale(1)"}>
        <Ico k="lightning" size={20} />
        {noLeidas > 0 && (
          <div style={{ position: "absolute", top: 4, right: 4, background: T.red, color: "#fff", fontSize: 9, fontWeight: 900, width: 16, height: 16, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", border: `2px solid ${T.bg1}`, boxShadow: "0 2px 4px rgba(0,0,0,0.2)" }}>
            {noLeidas}
          </div>
        )}
      </button>

      {isOpen && (
        <>
          <div onClick={() => setIsOpen(false)} style={{ position: "fixed", inset: 0, zIndex: 9998 }} />
          <div style={{ position: "absolute", top: 48, right: 0, width: 340, background: T.bg1, border: `1px solid ${T.border}`, borderRadius: 12, boxShadow: "0 10px 40px rgba(0,0,0,0.3)", zIndex: 9999, overflow: "hidden", animation: "slide-down 0.2s ease-out" }}>
            <div style={{ padding: "14px 18px", borderBottom: `1px solid ${T.borderHi}`, display: "flex", justifyContent: "space-between", alignItems: "center", background: T.bg1 }}>
              <div style={{ fontWeight: 800, fontSize: 13, color: T.white }}>Notificaciones</div>
              {noLeidas > 0 && <button onClick={marcarTodasLeidas} style={{ background: "none", border: "none", color: T.teal, fontSize: 11, fontWeight: 700, cursor: "pointer" }}>Marcar todas leídas</button>}
            </div>

            <div style={{ maxHeight: 400, overflowY: "auto", background: T.bg2 }}>
              {notis.length === 0 && <div style={{ padding: 40, textAlign: "center", color: T.whiteDim, fontSize: 12 }}>No tienes notificaciones.</div>}
              {notis.map(n => (
                <div key={n.id} onClick={() => { marcarLeida(n.id); if (n.url) setModulo(n.url); setIsOpen(false); }}
                  style={{ padding: "16px 18px", borderBottom: `1px solid ${T.borderHi}`, cursor: "pointer", transition: "all .15s", background: n.leida ? "transparent" : T.tealSoft + "10", borderLeft: `3px solid ${n.leida ? "transparent" : T.teal}` }}
                  onMouseEnter={e => e.currentTarget.style.background = T.bg3}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                    <div style={{ fontWeight: 700, fontSize: 12, color: n.leida ? T.whiteDim : T.white }}>{n.titulo}</div>
                    <div style={{ fontSize: 10, color: T.whiteDim }}>{new Date(n.creado).toLocaleDateString()}</div>
                  </div>
                  <div style={{ fontSize: 12, color: n.leida ? T.whiteDim : T.whiteOff, lineHeight: 1.4 }}>{n.mensaje}</div>
                </div>
              ))}
            </div>

            <div style={{ padding: "10px 18px", borderTop: `1px solid ${T.border}`, textAlign: "center", background: T.bg1 }}>
               <span style={{ fontSize: 11, color: T.whiteDim, fontWeight: 600 }}>Cerrar panel</span>
            </div>
          </div>
        </>
      )}
      <style>{`@keyframes slide-down { from { opacity:0; transform:translateY(-10px); } to { opacity:1; transform:translateY(0); } }`}</style>
    </div>
  );
};
