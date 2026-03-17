import { useState, useEffect, useRef } from "react";
import { T } from "../../theme";
import { Ico } from "./Ico";
import { Av, Chip } from "./index";

export const SpotlightSearch = ({ db, open, onClose, onNavigate }) => {
  const [q, setQ] = useState("");
  const inputRef = useRef(null);

  useEffect(() => {
    if (open) {
      setQ("");
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [open]);

  if (!open) return null;

  // Realizar búsqueda
  const results = [];
  const searchLow = q.toLowerCase();

  // 1. Deals
  db.deals?.forEach(d => {
    if (d.titulo.toLowerCase().includes(searchLow)) {
      results.push({ id: d.id, type: "Deal", title: d.titulo, sub: `$${d.valor.toLocaleString()}`, icon: "dollar", color: T.green, action: () => onNavigate("deals") });
    }
  });

  // 2. Contactos
  db.contactos?.forEach(c => {
    if ((c.nombre || "").toLowerCase().includes(searchLow) || (c.email || "").toLowerCase().includes(searchLow) || (c.empresa || "").toLowerCase().includes(searchLow)) {
      results.push({ id: c.id, type: "Contacto", title: c.nombre, sub: c.empresa, icon: "users", color: T.teal, action: () => onNavigate("contactos") });
    }
  });

  // 3. Empresas
  db.empresas?.forEach(e => {
    if ((e.nombre || "").toLowerCase().includes(searchLow) || (e.sector || "").toLowerCase().includes(searchLow)) {
      results.push({ id: e.id, type: "Empresa", title: e.nombre, sub: e.sector || "Empresa B2B", icon: "building", color: T.amber, action: () => onNavigate("empresas") });
    }
  });

  // 4. Tareas
  db.tareas?.forEach(t => {
    if ((t.titulo || "").toLowerCase().includes(searchLow)) {
      results.push({ id: t.id, type: "Tarea", title: t.titulo, sub: `Vence: ${t.vencimiento}`, icon: "check", color: T.red, action: () => onNavigate("tareas") });
    }
  });

  // 3. Menús
  const menus = [
    { label: "Ir a Dashboard", mod: "dashboard", icon: "board" },
    { label: "Ir a Configuración", mod: "config", icon: "cog" },
    { label: "Ir a Reportes", mod: "reportes", icon: "chart" },
    { label: "Redactar Email", mod: "email", icon: "mail" },
    { label: "Catálogo General", mod: "catalogo", icon: "grid" }
  ];
  menus.forEach(m => {
    if (m.label.toLowerCase().includes(searchLow) || m.mod.toLowerCase().includes(searchLow)) {
      results.push({ id: `nav_${m.mod}`, type: "Navegación", title: m.label, sub: `Módulo: ${m.mod}`, icon: m.icon, color: T.whiteDim, action: () => onNavigate(m.mod) });
    }
  });

  // Tomar hasta 8 resultados
  const filtered = q.trim() ? results.slice(0, 8) : results.filter(r => r.type === "Navegación");

  return (
    <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0,0,0,0.6)", backdropFilter: "blur(6px)", zIndex: 9999, display: "flex", justifyContent: "center", paddingTop: "12vh", opacity: 1, animation: "fadeIn .2s ease" }}
      onClick={onClose}>
      
      <div style={{ width: 640, background: T.bg1, borderRadius: 16, border: `1px solid ${T.borderHi}`, boxShadow: "0 25px 50px -12px rgba(0,0,0,0.5)", overflow: "hidden", display: "flex", flexDirection: "column", maxHeight: "70vh", animation: "slideDown .3s cubic-bezier(0.16, 1, 0.3, 1)" }}
        onClick={e => e.stopPropagation()}>
        
        {/* OMNIBAR INPUT */}
        <div style={{ display: "flex", alignItems: "center", padding: "16px 24px", borderBottom: `1px solid ${T.borderHi}` }}>
          <Ico k="search" size={24} style={{ color: T.teal, marginRight: 16 }} />
          <input 
            ref={inputRef}
            value={q}
            onChange={e => setQ(e.target.value)}
            placeholder="Buscar leads, tratos o acciones (Cmd+K)"
            style={{ flex: 1, border: "none", background: "transparent", color: T.white, fontSize: 20, fontWeight: 600, outline: "none", fontFamily: "inherit" }}
          />
          <div style={{ fontSize: 11, fontWeight: 700, color: T.whiteDim, background: T.bg2, padding: "4px 8px", borderRadius: 6, border: `1px solid ${T.border}` }}>ESC</div>
        </div>

        {/* RESULTADOS */}
        <div style={{ flex: 1, overflowY: "auto", padding: 12 }}>
          {filtered.length === 0 ? (
            <div style={{ padding: 40, textAlign: "center", color: T.whiteDim, fontSize: 14 }}>
              No se encontraron resultados para "{q}"
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              {filtered.map((r, i) => (
                <div key={r.id + i} onClick={() => { r.action(); onClose(); }}
                  style={{ display: "flex", alignItems: "center", gap: 16, padding: "12px 16px", borderRadius: 10, cursor: "pointer", transition: "all .15s", background: "transparent" }}
                  onMouseEnter={e => { e.currentTarget.style.background = T.teal + "1A"; e.currentTarget.style.boxShadow = `inset 2px 0 0 ${T.teal}`; }}
                  onMouseLeave={e => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.boxShadow = "none"; }}>
                  <div style={{ width: 32, height: 32, borderRadius: 8, background: r.color + "1A", color: r.color, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    <Ico k={r.icon} size={16} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={{ fontSize: 15, fontWeight: 700, color: T.white, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.title}</span>
                    </div>
                    <div style={{ fontSize: 12, color: T.whiteDim, marginTop: 2 }}>{r.sub}</div>
                  </div>
                  <Chip label={r.type} color={r.type === "Navegación" ? T.whiteDim : T.whiteOff} />
                  <div style={{ color: T.whiteDim }}><Ico k="arrow" size={14} style={{ opacity: 0.5 }}/></div>
                </div>
              ))}
            </div>
          )}
        </div>
        
        {/* OMNIBAR FOOTER */}
        <div style={{ padding: "10px 24px", background: T.bg2, borderTop: `1px solid ${T.borderHi}`, display: "flex", alignItems: "center", gap: 16, fontSize: 11, color: T.whiteDim, fontWeight: 600 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ background: T.bg1, padding: "2px 6px", borderRadius: 4, border: `1px solid ${T.border}` }}>↑↓</span> para navegar
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ background: T.bg1, padding: "2px 6px", borderRadius: 4, border: `1px solid ${T.border}` }}>↵</span> para seleccionar
          </div>
        </div>

      </div>
    </div>
  );
};
