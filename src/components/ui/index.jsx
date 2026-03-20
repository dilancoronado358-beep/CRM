import React, { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { T } from "../../theme";
import { Ico } from "./Ico";
import { SpotlightSearch } from "./Spotlight";
import { ConfirmModal } from "./ConfirmModal";

export { Ico, SpotlightSearch, ConfirmModal };


export const Av = ({ text = "?", color = T.teal, size = 36, fs }) => (
  <div style={{ 
    width: size, height: size, borderRadius: "50%", 
    background: T.bg3, 
    border: `1.5px solid ${T.borderHi}`, 
    color, fontWeight: 800, fontSize: fs || size * .38, 
    display: "flex", alignItems: "center", justifyContent: "center", 
    flexShrink: 0, overflow: "hidden", 
    boxShadow: "var(--shadow-sm)",
    userSelect: "none"
  }}>
    {(text || "?").slice(0, 1).toUpperCase() + ((text || "").split(" ")[1] || text || "").slice(0, 1).toUpperCase()}
  </div>
);

export const Chip = ({ label, color, bg }) => (
  <span style={{ display: "inline-flex", alignItems: "center", padding: "2px 10px", borderRadius: 20, fontSize: 11, fontWeight: 700, color, background: bg || "rgba(255,255,255,0.05)", border: `1px solid ${color}`, whiteSpace: "nowrap", textTransform: "uppercase", letterSpacing: ".02em" }}>
    {label}
  </span>
);

export const Btn = ({ children, variant = "primario", size = "md", onClick, disabled, style = {}, full }) => {
  const V = {
    primario: { bg: T.teal, color: "#FFF", border: T.teal, shadow: "var(--shadow-sm)" },
    secundario: { bg: T.bg1, color: T.whiteOff, border: T.borderHi, shadow: "var(--shadow-sm)" },
    fantasma: { bg: "transparent", color: T.whiteDim, border: "transparent" },
    peligro: { bg: T.bg2, color: T.red, border: T.red },
    exito: { bg: T.bg2, color: T.green, border: T.green },
    turquesa: { bg: T.bg2, color: T.teal, border: T.teal },
  };
  const S = { sm: { padding: "5px 10px", fontSize: 11 }, md: { padding: "8px 14px", fontSize: 12.5 }, lg: { padding: "11px 22px", fontSize: 14 } };
  const v = V[variant] || V.primario; const s = S[size] || S.md;
  return (
    <button onClick={onClick} disabled={disabled}
      onMouseEnter={e => {
        if (disabled) return;
        e.currentTarget.style.transform = "translateY(-1.5px)";
        e.currentTarget.style.boxShadow = "var(--shadow-md)";
        if (variant === "fantasma") e.currentTarget.style.background = "rgba(255,255,255,0.05)";
      }}
      onMouseLeave={e => {
        e.currentTarget.style.transform = "";
        e.currentTarget.style.boxShadow = v.shadow || "none";
        if (variant === "fantasma") e.currentTarget.style.background = "transparent";
      }}
      style={{ background: v.bg, color: v.color, border: `1px solid ${v.border}`, boxShadow: v.shadow, ...s, borderRadius: 8, cursor: disabled ? "not-allowed" : "pointer", opacity: disabled ? .5 : 1, fontWeight: 600, display: "inline-flex", alignItems: "center", gap: 5, transition: "all .2s cubic-bezier(0.4, 0, 0.2, 1)", width: full ? "100%" : undefined, justifyContent: full ? "center" : undefined, ...style }}>
      {children}
    </button>
  );
};

export const Inp = ({ value, onChange, placeholder, type = "text", style = {}, rows, readOnly, defaultValue, ...props }) => {
  const base = { background: T.bg1, border: `1px solid ${T.borderHi}`, borderRadius: 8, color: T.white, fontSize: 13, outline: "none", width: "100%", boxSizing: "border-box", fontFamily: "inherit", transition: "all 0.2s" };
  const sharedProps = { 
    value, onChange, placeholder, readOnly, defaultValue, 
    onFocus: (e) => {
      e.target.style.borderColor = T.teal;
      e.target.style.boxShadow = "0 0 0 3px rgba(20, 184, 166, 0.1)"; 
      if (props.onFocus) props.onFocus(e);
    },
    onBlur: (e) => {
      e.target.style.borderColor = T.borderHi;
      e.target.style.boxShadow = "none";
      if (props.onBlur) props.onBlur(e);
    },
    ...props 
  };
  if (rows) return <textarea {...sharedProps} rows={rows} style={{ ...base, padding: "10px 12px", resize: "vertical", ...style }} />;
  return <input type={type} {...sharedProps} style={{ ...base, padding: "10px 12px", ...style }} />;
};

// 🛡️ COMPONENTE ANTI-RERENDER: El arma definitiva contra la pérdida de texto.
// Mantiene su propio estado y oculta las actualizaciones externas mientras el usuario escribe.
export const LocalInput = ({ value, onChange, onCommit, type = "text", ...props }) => {
  const [internalVal, setInternalVal] = useState(value || "");
  const [isFocused, setIsFocused] = useState(false);

  // Solo actualizar el estado interno si el prop value cambia
  // Y el usuario NO está escribiendo actualmente
  useEffect(() => {
    if (!isFocused && value !== undefined) {
      setInternalVal(value);
    }
  }, [value, isFocused]);

  const handleChange = (e) => {
    setInternalVal(e.target.value);
    if (onChange) onChange(e);
  };

  const handleBlur = (e) => {
    setIsFocused(false);
    if (onCommit && internalVal !== value) onCommit(internalVal);
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && onCommit && internalVal !== value) {
      e.target.blur(); // Trigger blur to save
    }
    if (props.onKeyDown) props.onKeyDown(e);
  };

  return (
    <Inp
      type={type}
      value={internalVal}
      onChange={handleChange}
      onFocus={() => setIsFocused(true)}
      onBlur={handleBlur}
      onKeyDown={handleKeyDown}
      {...props}
    />
  );
};

export const Sel = ({ value, onChange, children, style = {}, innerStyle = {}, placeholder = "Seleccionar..." }) => {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const clickAfuera = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", clickAfuera);
    return () => document.removeEventListener("mousedown", clickAfuera);
  }, []);

  const options = React.Children.toArray(children).map(c => ({
    val: c.props.value,
    lab: c.props.children
  }));

  const sel = options.find(o => o.val === value) || { lab: placeholder };

  return (
    <div ref={ref} style={{ position: "relative", width: "100%", ...style }}>
      <div onClick={() => setOpen(!open)}
        style={{ background: "rgba(255,255,255,0.03)", border: `1px solid ${T.whiteFade}`, borderRadius: 12, padding: "10px 16px", display: "flex", justifyContent: "space-between", alignItems: "center", cursor: "pointer", backdropFilter: "blur(12px)", transition: "all 0.2s", ...innerStyle }}
        onMouseEnter={e => e.currentTarget.style.borderColor = T.teal}
        onMouseLeave={e => e.currentTarget.style.borderColor = innerStyle.border ? innerStyle.border : T.borderHi}
      >
        <span style={{ fontSize: 13, color: T.whiteOff, fontWeight: 700, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1, marginRight: 8 }}>{sel.lab}</span>
        <Ico k="chevron-down" size={14} style={{ transform: open ? "rotate(180deg)" : "none", transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)", color: open ? T.teal : T.whiteDim, flexShrink: 0 }} />
      </div>
      {open && (
        <div style={{ position: "absolute", top: "calc(100% + 8px)", left: 0, right: 0, background: T.bg1, border: `1px solid ${T.borderHi}`, borderRadius: 12, zIndex: 10000, boxShadow: "var(--shadow-xl)", padding: 6, maxHeight: 220, overflowY: "auto", animation: "slideIn .2s forwards" }}>
          {options.map(o => (
            <div key={o.val} onClick={() => { onChange({ target: { value: o.val } }); setOpen(false); }}
              style={{ padding: "10px 14px", borderRadius: 8, fontSize: 13, color: o.val === value ? T.teal : T.whiteOff, background: o.val === value ? T.bg2 : "transparent", cursor: "pointer", transition: "all 0.2s cubic-bezier(0.4, 0, 0.2, 1)", fontWeight: o.val === value ? 800 : 500 }}
              onMouseEnter={e => { e.currentTarget.style.background = "rgba(255,255,255,0.08)"; }}
              onMouseLeave={e => { e.currentTarget.style.background = o.val === value ? T.bg2 : "transparent"; }}
            >
              {o.lab}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export const Lbl = ({ children }) => <label style={{ fontSize: 10.5, fontWeight: 700, color: T.whiteDim, textTransform: "uppercase", letterSpacing: ".05em", display: "block", marginBottom: 5 }}>{children}</label>;

export const Campo = ({ label, children, col = 1, style = {} }) => (
  <div style={{ gridColumn: `span ${col}`, ...style }}>
    <Lbl>{label}</Lbl>
    {children}
  </div>
);

export const Modal = ({ open, onClose, title, children, width = 640 }) => {
  if (open) console.log("🔘 [DEBUG] Abriendo Modal:", title);
  if (!open) return null;
  return createPortal(
    <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(17,24,39,.7)", backdropFilter: "blur(12px)", zIndex: 90000, display: "flex", alignItems: "center", justifyContent: "center", padding: 20, animation: "fadeIn .3s" }}>
      <div onClick={e => e.stopPropagation()} style={{ background: T.bg1, border: `1px solid ${T.borderHi}`, borderRadius: 20, width: "100%", maxWidth: `min(${width}px, 94vw)`, maxHeight: "92vh", display: "flex", flexDirection: "column", boxShadow: "var(--shadow-premium)", animation: "slideIn .3s cubic-bezier(0.16, 1, 0.3, 1)" }}>
        <div style={{ padding: "20px 28px", borderBottom: `1px solid ${T.border}`, display: "flex", justifyContent: "space-between", alignItems: "center", flexShrink: 0 }}>
          <span style={{ fontWeight: 800, fontSize: 18, color: T.white, letterSpacing: "-.02em" }}>{title}</span>
          <button onClick={onClose} style={{ background: "rgba(255,255,255,0.05)", border: "none", color: T.whiteDim, cursor: "pointer", padding: 8, borderRadius: 10, display: "flex", transition: "all .2s" }} onMouseEnter={e => { e.currentTarget.style.background = "rgba(255,255,255,0.1)"; e.currentTarget.style.color = T.white; }} onMouseLeave={e => { e.currentTarget.style.background = "rgba(255,255,255,0.05)"; e.currentTarget.style.color = T.whiteDim; }}><Ico k="x" size={20} /></button>
        </div>
        <div style={{ padding: 28, overflowY: "auto", flex: 1 }}>{children}</div>
      </div>
    </div>,
    document.body
  );
};

export const Tarjeta = ({ children, style = {}, onClick, brillo }) => (
  <div onClick={onClick} 
    onMouseEnter={e => { 
      e.currentTarget.style.transform = onClick ? "translateY(-4px)" : "translateY(-2px)"; 
      e.currentTarget.style.boxShadow = "var(--shadow-premium)"; 
      e.currentTarget.style.borderColor = T.teal; 
    }}
    onMouseLeave={e => { 
      e.currentTarget.style.transform = ""; 
      e.currentTarget.style.boxShadow = brillo ? "0 4px 20px rgba(20, 184, 166, 0.1)" : "var(--shadow-sm)"; 
      e.currentTarget.style.borderColor = T.border; 
    }}
    style={{ 
      background: T.bg1, 
      border: `1px solid ${T.border}`, 
      borderRadius: 20, 
      boxShadow: brillo ? "0 4px 20px rgba(20, 184, 166, 0.1)" : "var(--shadow-sm)", 
      ...style, 
      cursor: onClick ? "pointer" : undefined, 
      transition: "all 0.5s cubic-bezier(0.16, 1, 0.3, 1)", 
      position: "relative", 
      overflow: "hidden" 
    }}>
    {children}
  </div>
);

export const KPI = ({ label, value, sub, color = T.teal, icon, style = {} }) => (
  <Tarjeta style={{ padding: "20px 22px", flex: 1, minWidth: 160, overflow: "hidden", ...style }}>
    {/* Patrón de fondo sutil */}
    <div style={{ position: "absolute", inset: 0, opacity: 0.03, pointerEvents: "none", backgroundImage: `radial-gradient(${T.white} 1px, transparent 1px)`, backgroundSize: "16px 16px" }} />
    
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", position: "relative", zIndex: 1 }}>
      <div style={{ minWidth: 0, flex: 1 }}>
        <div style={{ fontSize: 11, fontWeight: 800, color: T.whiteDim, textTransform: "uppercase", letterSpacing: ".1em", marginBottom: 10, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{label}</div>
        <div style={{ fontSize: 30, fontWeight: 900, color: T.white, lineHeight: 1, marginBottom: 6, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", letterSpacing: "-.03em" }} title={value}>{value}</div>
        {sub && <div style={{ fontSize: 13, color: color, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={sub}>{sub}</div>}
      </div>
      {icon && (
        <div style={{ position: "relative", marginLeft: 12 }}>
          {/* Aura / Glow */}
          <div style={{ position: "absolute", inset: -8, background: color, borderRadius: 12, opacity: 0.15, filter: "blur(12px)" }} />
          <div style={{ width: 44, height: 44, borderRadius: 12, background: `linear-gradient(135deg, ${color}22, ${color}11)`, border: `1px solid ${color}33`, color, display: "flex", alignItems: "center", justifyContent: "center", position: "relative", zIndex: 1 }}><Ico k={icon} size={22} /></div>
        </div>
      )}
    </div>
  </Tarjeta>
);

export const CabeceraTabla = ({ cols }) => (
  <thead>
    <tr>
      {cols.map((c, i) => <th key={i} style={{ padding: "12px 16px", textAlign: "left", fontSize: 11, fontWeight: 600, color: T.whiteDim, textTransform: "uppercase", letterSpacing: ".05em", borderBottom: `1px solid ${T.border}`, whiteSpace: "nowrap", background: T.bg2 }}>{c}</th>)}
    </tr>
  </thead>
);

export const FilaTabla = ({ children, onClick }) => (
  <tr onClick={onClick} style={{ cursor: onClick ? "pointer" : undefined, transition: "all .2s cubic-bezier(0.4, 0, 0.2, 1)", position: "relative" }}
    onMouseEnter={e => { 
      if (onClick) {
        e.currentTarget.style.background = T.bg2;
        e.currentTarget.style.boxShadow = "inset 4px 0 0 " + T.teal;
      } 
    }}
    onMouseLeave={e => { 
      e.currentTarget.style.background = ""; 
      e.currentTarget.style.boxShadow = "none";
    }}>
    {children}
  </tr>
);

export const Celda = ({ children, style = {} }) => (
  <td style={{ padding: "12px 16px", borderBottom: `1px solid ${T.border}`, fontSize: 13, color: T.whiteOff, ...style }}>{children}</td>
);

export const Barra = ({ value, color = T.teal, h = 5 }) => (
  <div style={{ background: T.bg3, borderRadius: 99, height: h, overflow: "hidden", width: "100%" }}>
    <div style={{ background: color, height: "100%", width: `${Math.min(100, Math.max(0, value))}%`, borderRadius: 99 }} />
  </div>
);

export const AnilloScore = ({ score, size = 40 }) => {
  const color = score >= 80 ? T.green : score >= 50 ? T.amber : T.red;
  const r = (size / 2) - 4; const c = 2 * Math.PI * r; const d = (score / 100) * c;
  return (
    <div style={{ position: "relative", width: size, height: size, flexShrink: 0 }}>
      <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={T.bg3} strokeWidth={3} />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={3} strokeDasharray={`${d} ${c - d}`} strokeLinecap="round" />
      </svg>
      <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 800, color }}>{score}</div>
    </div>
  );
};

export const SelColor = ({ value, onChange }) => {
  const pal = [T.teal, "#60A5FA", "#A78BFA", "#F472B6", T.green, T.amber, "#FB923C", "#F87171", "#34D399", "#38BDF8"];
  return (
    <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
      {pal.map(c => <div key={c} onClick={() => onChange(c)} style={{ width: 26, height: 26, borderRadius: "50%", background: c, cursor: "pointer", border: value === c ? `2.5px solid ${T.bg1}` : "2.5px solid transparent", boxShadow: value === c ? `0 0 0 2px ${c}` : undefined, transition: "transform .1s" }} onMouseEnter={e => e.currentTarget.style.transform = "scale(1.1)"} onMouseLeave={e => e.currentTarget.style.transform = "scale(1)"} />)}
    </div>
  );
};

export const BuscadorBar = ({ value, onChange, placeholder = "Buscar..." }) => (
  <div style={{ position: "relative", flex: 1 }}>
    <div style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: T.whiteDim, pointerEvents: "none" }}><Ico k="search" size={15} /></div>
    <Inp value={value} onChange={onChange} placeholder={placeholder} style={{ paddingLeft: 34, background: T.bg1, boxShadow: "0 1px 2px rgba(0,0,0,0.05)" }} />
  </div>
);

export const Vacio = ({ text = "Sin datos" }) => (
  <div style={{ padding: "40px 20px", textAlign: "center", color: T.whiteDim, fontSize: 13, background: T.bg2, borderRadius: 12, border: `1px dashed ${T.borderHi}` }}>{text}</div>
);

export const EncabezadoSeccion = ({ title, sub, actions }) => (
  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 24, gap: 12, flexWrap: "wrap" }}>
    <div>
      <h2 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: T.white, letterSpacing: "-.02em" }}>{title}</h2>
      {sub && <p style={{ margin: "4px 0 0", fontSize: 13, color: T.whiteDim }}>{sub}</p>}
    </div>
    {actions && <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>{actions}</div>}
  </div>
);

export const ControlSegmentado = ({ options, value, onChange }) => (
  <div style={{ display: "flex", background: T.bg3, borderRadius: 8, padding: 3, gap: 2 }}>
    {options.map(o => (
      <button key={o.value} onClick={() => onChange(o.value)}
        style={{ background: value === o.value ? T.bg1 : "transparent", color: value === o.value ? T.white : T.whiteDim, border: "none", boxShadow: value === o.value ? "0 1px 2px rgba(0,0,0,0.05)" : "none", borderRadius: 6, padding: "6px 14px", fontSize: 12, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: 5, fontFamily: "inherit", transition: "all .15s" }}>
        {o.icon && <Ico k={o.icon} size={14} style={{ color: value === o.value ? T.teal : "inherit" }} />}{o.label}
      </button>
    ))}
  </div>
);

export const IndSupa = ({ estado }) => {
  const cfg = {
    conectando: { color: T.amber, texto: "Conectando..." },
    conectado: { color: T.green, texto: "Conectado" },
    error: { color: T.red, texto: "Sin conexión" },
    local: { color: T.whiteDim, texto: "Modo local" },
  };
  const c = cfg[estado] || cfg.local;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6, background: "rgba(255,255,255,0.05)", border: `1px solid ${c.color}`, borderRadius: 6, padding: "4px 10px", fontSize: 11, fontWeight: 600, color: c.color }}>
      <div style={{ width: 6, height: 6, borderRadius: "50%", background: c.color, animation: estado === "conectando" ? "pulse 1s infinite" : undefined }} />
      {c.texto}
    </div>
  );
};
