import { T } from "../../theme";
import { Ico } from "./Ico";
import { SpotlightSearch } from "./Spotlight";

export { Ico, SpotlightSearch };

export const Toasts = ({ items = [], onRemove }) => (
  <div style={{ position: "fixed", bottom: 24, right: 24, zIndex: 10000, display: "flex", flexDirection: "column", gap: 10, pointerEvents: "none" }}>
    {items.map((it, i) => (
      <div key={it.id || i} 
        style={{ 
          background: T.bg1, border: `1px solid ${it.color || T.teal}50`, borderRadius: 10, padding: "12px 16px", color: T.white, 
          boxShadow: "0 10px 15px -3px rgba(0,0,0,0.3)", display: "flex", alignItems: "center", gap: 12, pointerEvents: "auto",
          animation: "slideInRight .3s ease", minWidth: 280, maxWidth: 350
        }}>
        <div style={{ width: 8, height: 8, borderRadius: "50%", background: it.color || T.teal, boxShadow: `0 0 8px ${it.color || T.teal}` }} />
        <div style={{ flex: 1 }}>
          {it.title && <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 2 }}>{it.title}</div>}
          <div style={{ fontSize: 12, color: T.whiteOff }}>{it.body}</div>
        </div>
        <button onClick={() => onRemove(it.id)} style={{ background: "none", border: "none", color: T.whiteDim, cursor: "pointer", padding: 4 }}><Ico k="x" size={14} /></button>
        <style>{`
          @keyframes slideInRight { 
            from { transform: translateX(100%); opacity: 0; } 
            to { transform: translateX(0); opacity: 1; } 
          }
        `}</style>
      </div>
    ))}
  </div>
);

export const Av = ({ text = "?", color = T.teal, size = 36, fs }) => (
  <div style={{ width: size, height: size, borderRadius: "50%", background: color + "18", border: `1.5px solid ${color}40`, color, fontWeight: 700, fontSize: fs || size * .36, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
    {(text || "?").slice(0, 2).toUpperCase()}
  </div>
);

export const Chip = ({ label, color, bg }) => (
  <span style={{ display: "inline-flex", alignItems: "center", padding: "2px 8px", borderRadius: 20, fontSize: 11, fontWeight: 600, color, background: bg || color + "18", border: `1px solid ${color}28`, whiteSpace: "nowrap" }}>
    {label}
  </span>
);

export const Btn = ({ children, variant = "primario", size = "md", onClick, disabled, style = {}, full }) => {
  const V = {
    primario: { bg: T.teal, color: "#FFF", border: T.teal, shadow: "0 2px 5px rgba(37,99,235,0.2)" },
    secundario: { bg: T.bg1, color: T.whiteOff, border: T.borderHi, shadow: "0 1px 2px rgba(0,0,0,0.05)" },
    fantasma: { bg: "transparent", color: T.whiteDim, border: "transparent" },
    peligro: { bg: T.redS, color: T.red, border: T.red + "30" },
    exito: { bg: T.greenS, color: T.green, border: T.green + "30" },
    turquesa: { bg: T.tealSoft, color: T.teal, border: T.teal + "30" },
  };
  const S = { sm: { padding: "5px 10px", fontSize: 11 }, md: { padding: "8px 14px", fontSize: 12.5 }, lg: { padding: "11px 22px", fontSize: 14 } };
  const v = V[variant] || V.primario; const s = S[size] || S.md;
  return (
    <button onClick={onClick} disabled={disabled}
      style={{ background: v.bg, color: v.color, border: `1px solid ${v.border}`, boxShadow: v.shadow, ...s, borderRadius: 7, cursor: disabled ? "not-allowed" : "pointer", opacity: disabled ? .5 : 1, fontWeight: 600, display: "inline-flex", alignItems: "center", gap: 5, transition: "all .15s", width: full ? "100%" : undefined, justifyContent: full ? "center" : undefined, ...style }}>
      {children}
    </button>
  );
};

export const Inp = ({ value, onChange, placeholder, type = "text", style = {}, rows, readOnly, defaultValue, ...props }) => {
  const base = { background: T.bg1, border: `1px solid ${T.borderHi}`, borderRadius: 7, color: T.white, fontSize: 13, outline: "none", width: "100%", boxSizing: "border-box", fontFamily: "inherit", transition: "border .2s, box-shadow .2s" };
  const sharedProps = { value, onChange, placeholder, readOnly, defaultValue, ...props };
  if (rows) return <textarea {...sharedProps} rows={rows} style={{ ...base, padding: "9px 11px", resize: "vertical", ...style }} />;
  return <input type={type} {...sharedProps} style={{ ...base, padding: "9px 11px", ...style }} />;
};

export const Sel = ({ value, onChange, children, style = {}, defaultValue, ...props }) => (
  <select value={value} defaultValue={defaultValue} onChange={onChange} {...props} style={{ background: T.bg1, border: `1px solid ${T.borderHi}`, borderRadius: 7, color: T.white, fontSize: 13, padding: "9px 11px", outline: "none", width: "100%", boxSizing: "border-box", fontFamily: "inherit", ...style }}>
    {children}
  </select>
);

export const Lbl = ({ children }) => <label style={{ fontSize: 10.5, fontWeight: 700, color: T.whiteDim, textTransform: "uppercase", letterSpacing: ".05em", display: "block", marginBottom: 5 }}>{children}</label>;

export const Campo = ({ label, children, col = 1, style = {} }) => (
  <div style={{ gridColumn: `span ${col}`, ...style }}>
    <Lbl>{label}</Lbl>
    {children}
  </div>
);

export const Modal = ({ open, onClose, title, children, width = 640 }) => {
  if (!open) return null;
  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(17,24,39,.6)", backdropFilter: "blur(4px)", zIndex: 9000, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
      <div onClick={e => e.stopPropagation()} style={{ background: T.bg1, border: `1px solid ${T.border}`, borderRadius: 14, width: "100%", maxWidth: width, maxHeight: "92vh", display: "flex", flexDirection: "column", boxShadow: "0 25px 50px -12px rgba(0,0,0,0.25)" }}>
        <div style={{ padding: "16px 22px", borderBottom: `1px solid ${T.border}`, display: "flex", justifyContent: "space-between", alignItems: "center", flexShrink: 0 }}>
          <span style={{ fontWeight: 700, fontSize: 16, color: T.white }}>{title}</span>
          <button onClick={onClose} style={{ background: "none", border: "none", color: T.whiteDim, cursor: "pointer", padding: 4, borderRadius: 5, display: "flex" }}><Ico k="x" size={17} /></button>
        </div>
        <div style={{ padding: 22, overflowY: "auto", flex: 1 }}>{children}</div>
      </div>
    </div>
  );
};

export const Tarjeta = ({ children, style = {}, onClick, brillo }) => (
  <div onClick={onClick} style={{ background: T.bg1, border: `1px solid ${T.border}`, borderRadius: 12, boxShadow: brillo ? "0 4px 15px rgba(37,99,235,0.08)" : "0 1px 3px rgba(0,0,0,0.05)", ...style, cursor: onClick ? "pointer" : undefined, transition: "box-shadow .2s, transform .2s" }}>
    {children}
  </div>
);

export const KPI = ({ label, value, sub, color = T.teal, icon }) => (
  <Tarjeta style={{ padding: "17px 19px", flex: 1, minWidth: 140 }}>
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
      <div style={{ minWidth: 0, flex: 1 }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: T.whiteDim, textTransform: "uppercase", letterSpacing: ".05em", marginBottom: 7, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{label}</div>
        <div style={{ fontSize: 26, fontWeight: 800, color: T.white, lineHeight: 1, marginBottom: 4, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={value}>{value}</div>
        {sub && <div style={{ fontSize: 12, color: T.whiteDim, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={sub}>{sub}</div>}
      </div>
      {icon && <div style={{ width: 36, height: 36, borderRadius: 8, background: color + "1A", color, display: "flex", alignItems: "center", justifyContent: "center", marginLeft: 12, flexShrink: 0 }}><Ico k={icon} size={18} /></div>}
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
  <tr onClick={onClick} style={{ cursor: onClick ? "pointer" : undefined, transition: "background .15s" }}
    onMouseEnter={e => { if (onClick) e.currentTarget.style.background = T.bg3; }}
    onMouseLeave={e => { e.currentTarget.style.background = ""; }}>
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
    <div style={{ display: "flex", alignItems: "center", gap: 6, background: c.color + "15", border: `1px solid ${c.color}30`, borderRadius: 6, padding: "4px 10px", fontSize: 11, fontWeight: 600, color: c.color }}>
      <div style={{ width: 6, height: 6, borderRadius: "50%", background: c.color, animation: estado === "conectando" ? "pulse 1s infinite" : undefined }} />
      {c.texto}
    </div>
  );
};
