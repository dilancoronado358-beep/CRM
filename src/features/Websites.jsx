import { useState } from "react";
import { T } from "../theme";
import { uid } from "../utils";
import { Btn, Inp, Tarjeta, EncabezadoSeccion, Ico, Campo, Modal } from "../components/ui";

const THEMES = {
  dark: {
    label: "Dark Pro", icon: "🌑",
    bg0: "#0A0E1A", bg1: "#111827", bg2: "#1A2236", bg3: "#1F2937", bg4: "#374151",
    border: "#1F2937", borderHi: "#374151",
    white: "#F9FAFB", whiteOff: "#E5E7EB", whiteDim: "#9CA3AF", whiteFade: "#6B7280",
    teal: "#06B6D4", tealDark: "#0891B2", tealSoft: "rgba(6,182,212,0.10)", tealGlow: "rgba(6,182,212,0.05)",
    green: "#10B981", greenS: "rgba(16,185,129,0.12)",
    amber: "#F59E0B", amberS: "rgba(245,158,11,0.12)",
    red: "#EF4444", redS: "rgba(239,68,68,0.12)",
    grad: "linear-gradient(135deg,#06B6D4,#3B82F6)",
  },
  light: {
    label: "Light", icon: "☀️",
    bg0: "#F4F7FE", bg1: "#FFFFFF", bg2: "#F9FAFB", bg3: "#F3F4F6", bg4: "#E5E7EB",
    border: "#E5E7EB", borderHi: "#D1D5DB",
    white: "#111827", whiteOff: "#374151", whiteDim: "#6B7280", whiteFade: "#9CA3AF",
    teal: "#06B6D4", tealDark: "#0891B2", tealSoft: "rgba(6,182,212,0.08)", tealGlow: "rgba(6,182,212,0.04)",
    green: "#10B981", greenS: "rgba(16,185,129,0.12)",
    amber: "#F59E0B", amberS: "rgba(245,158,11,0.12)",
    red: "#EF4444", redS: "rgba(239,68,68,0.12)",
    grad: "linear-gradient(135deg,#06B6D4,#3B82F6)",
  },
  midnight: {
    label: "Midnight", icon: "🌌",
    bg0: "#02040F", bg1: "#070D1A", bg2: "#0C1527", bg3: "#121E34", bg4: "#1B2C4A",
    border: "#162035", borderHi: "#1E3050",
    white: "#E8F0FE", whiteOff: "#C5D5F0", whiteDim: "#7B9FCC", whiteFade: "#4D6F99",
    teal: "#38BDF8", tealDark: "#0EA5E9", tealSoft: "rgba(56,189,248,0.10)", tealGlow: "rgba(56,189,248,0.05)",
    green: "#34D399", greenS: "rgba(52,211,153,0.12)",
    amber: "#FBBF24", amberS: "rgba(251,191,36,0.12)",
    red: "#F87171", redS: "rgba(248,113,113,0.12)",
    grad: "linear-gradient(135deg,#38BDF8,#818CF8)",
  },
  violet: {
    label: "Violet Dusk", icon: "🟣",
    bg0: "#0D0321", bg1: "#130630", bg2: "#1A0A3E", bg3: "#200E4F", bg4: "#2D1570",
    border: "#1F0E45", borderHi: "#2D1570",
    white: "#EDE9FE", whiteOff: "#C4B5FD", whiteDim: "#8B5CF6", whiteFade: "#6D28D9",
    teal: "#A78BFA", tealDark: "#7C3AED", tealSoft: "rgba(167,139,250,0.12)", tealGlow: "rgba(167,139,250,0.05)",
    green: "#34D399", greenS: "rgba(52,211,153,0.12)",
    amber: "#FBBF24", amberS: "rgba(251,191,36,0.12)",
    red: "#F87171", redS: "rgba(248,113,113,0.12)",
    grad: "linear-gradient(135deg,#7C3AED,#EC4899)",
  },
};

// Landing page block definitions
const BLOCK_DEFS = [
  { id: "hero", title: "Hero Section", icon: "star", desc: "Headline, sub, and CTA buttons" },
  { id: "features", title: "Features Grid", icon: "grid", desc: "3-column feature highlights" },
  { id: "pricing", title: "Pricing Table", icon: "dollar", desc: "Plans with CTA buttons" },
  { id: "testimonials", title: "Testimonials", icon: "user", desc: "Social proof quotes" },
  { id: "form", title: "Lead Capture Form", icon: "template", desc: "Embedded CRM form" },
  { id: "cta", title: "Footer CTA", icon: "mail", desc: "Final conversion block" },
];

export const Websites = ({ db, setDb }) => {
  const pagesInit = [{ id: "p1", slug: "landing-2026", titulo: "Campaña Q1 2026", activo: true, blocks: ["hero","features","cta"], heroTitle: "Genera más negocios hoy", heroCTA: "Ver Demo", accentColor: "#06B6D4" }];
  const [pages, setPages] = useState(db.websites?.length ? db.websites : pagesInit);
  const [activoId, setActivoId] = useState(pages[0]?.id || null);
  const [editando, setEditando] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [fNew, setFNew] = useState({ titulo: "", slug: "" });

  const activo = pages.find(p => p.id === activoId) || null;

  const save = (nPages) => { setPages(nPages); setDb(d => ({ ...d, websites: nPages })); };

  const nuevaPagina = () => {
    if (!fNew.titulo.trim()) return;
    const id = "p" + uid();
    const slug = fNew.slug.trim() || fNew.titulo.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
    const np = { id, slug, titulo: fNew.titulo, activo: false, blocks: ["hero","features","cta"], heroTitle: fNew.titulo, heroCTA: "Empieza Ahora", accentColor: "#06B6D4" };
    const nPages = [...pages, np];
    save(nPages); setActivoId(np.id); setShowNew(false); setFNew({ titulo: "", slug: "" });
  };

  const eliminarPagina = (id) => {
    if (!confirm("¿Eliminar esta página?")) return;
    const nPages = pages.filter(p => p.id !== id);
    save(nPages);
    setActivoId(nPages[0]?.id || null);
  };

  const updateActivo = (upd) => {
    const nPages = pages.map(p => p.id === activoId ? { ...p, ...upd } : p);
    save(nPages);
  };

  const toggleBlock = (blockId) => {
    const cur = activo.blocks || [];
    const nBlocks = cur.includes(blockId) ? cur.filter(b => b !== blockId) : [...cur, blockId];
    updateActivo({ blocks: nBlocks });
  };

  return (
    <div style={{ display: "flex", gap: 24, height: "calc(100vh - 120px)" }}>
      {/* ── Sidebar ── */}
      <div style={{ width: 340, display: "flex", flexDirection: "column", gap: 16, flexShrink: 0 }}>
        <EncabezadoSeccion title="Landing Pages" sub="CMS Visual Builder" />

        {/* Page List */}
        <div style={{ background: T.bg1, border: `1px solid ${T.borderHi}`, borderRadius: 12, padding: 16 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: T.whiteDim, textTransform: "uppercase", letterSpacing: ".1em" }}>Tus Páginas</span>
            <Btn size="sm" onClick={() => setShowNew(true)}><Ico k="plus" size={12} /> Nueva</Btn>
          </div>

          {pages.length === 0 && (
            <div style={{ textAlign: "center", color: T.whiteDim, fontSize: 13, padding: 20 }}>
              No hay páginas aún.<br />
              <Btn style={{ marginTop: 10 }} onClick={() => setShowNew(true)}><Ico k="plus" size={14} /> Crear Primera Página</Btn>
            </div>
          )}

          {pages.map(p => (
            <div key={p.id} onClick={() => { setActivoId(p.id); setEditando(false); }}
              style={{ padding: 12, marginBottom: 6, background: activoId === p.id ? T.tealSoft : "transparent", border: `1px solid ${activoId === p.id ? T.teal : "transparent"}`, borderRadius: 8, cursor: "pointer", transition: "all .15s" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: activoId === p.id ? T.teal : T.white, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.titulo}</div>
                  <div style={{ fontSize: 11, color: T.whiteDim, fontFamily: "monospace", marginTop: 2 }}>/{p.slug}</div>
                </div>
                <div style={{ width: 8, height: 8, borderRadius: "50%", background: p.activo ? T.green : T.whiteDim, boxShadow: p.activo ? `0 0 8px ${T.green}` : "none", flexShrink: 0, marginTop: 4 }} />
              </div>
              {activoId === p.id && (
                <div style={{ display: "flex", gap: 6, marginTop: 10 }}>
                  <Btn variant="fantasma" size="sm" onClick={e => { e.stopPropagation(); setEditando(!editando); }}><Ico k="edit" size={12} /> Editar</Btn>
                  <Btn variant="fantasma" size="sm" onClick={e => { e.stopPropagation(); const url = `${window.location.origin}${window.location.pathname}#/sites/${p.id}`; navigator.clipboard?.writeText(url); window.open(url, "_blank"); }}><Ico k="link" size={12} /> Link</Btn>
                  <Btn variant="fantasma" size="sm" onClick={e => { e.stopPropagation(); updateActivo({ activo: !p.activo }); }}><Ico k={p.activo ? "eye" : "eye"} size={12} />{p.activo ? " Pausar" : " Publicar"}</Btn>
                  <Btn variant="fantasma" size="sm" onClick={e => { e.stopPropagation(); eliminarPagina(p.id); }}><Ico k="trash" size={12} style={{ color: T.red }} /></Btn>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Block Editor - only when a page is selected */}
        {activo && (
          <Tarjeta style={{ padding: 16, flex: 1, overflowY: "auto" }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: T.whiteDim, textTransform: "uppercase", letterSpacing: ".1em", marginBottom: 12 }}>Secciones</div>
            {BLOCK_DEFS.map(b => {
              const active = activo.blocks?.includes(b.id);
              return (
                <div key={b.id} onClick={() => toggleBlock(b.id)}
                  style={{ display: "flex", alignItems: "center", gap: 10, background: active ? T.tealSoft : T.bg2, border: `1px solid ${active ? T.teal : T.borderHi}`, padding: "10px 12px", borderRadius: 8, cursor: "pointer", marginBottom: 6, transition: "all .15s" }}>
                  <Ico k={b.icon} size={14} style={{ color: active ? T.teal : T.whiteDim }} />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: active ? T.teal : T.white }}>{b.title}</div>
                    <div style={{ fontSize: 10, color: T.whiteDim }}>{b.desc}</div>
                  </div>
                  <div style={{ width: 14, height: 14, borderRadius: 3, background: active ? T.teal : "transparent", border: `2px solid ${active ? T.teal : T.borderHi}`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, transition: "all .15s" }}>
                    {active && <span style={{ fontSize: 9, color: "#fff", fontWeight: 900 }}>✓</span>}
                  </div>
                </div>
              );
            })}

            {/* Quick page settings */}
            <div style={{ marginTop: 16, paddingTop: 16, borderTop: `1px solid ${T.borderHi}` }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: T.whiteDim, textTransform: "uppercase", letterSpacing: ".1em", marginBottom: 10 }}>Personalizar</div>
              <Campo label="Título Principal">
                <Inp value={activo.heroTitle || ""} onChange={e => updateActivo({ heroTitle: e.target.value })} placeholder="Genera más negocios" />
              </Campo>
              <Campo label="Texto CTA">
                <Inp value={activo.heroCTA || ""} onChange={e => updateActivo({ heroCTA: e.target.value })} placeholder="Ver Demo" />
              </Campo>
              <Campo label="Color Acento">
                <input type="color" value={activo.accentColor || "#06B6D4"} onChange={e => updateActivo({ accentColor: e.target.value })}
                  style={{ width: "100%", height: 36, border: "none", borderRadius: 6, cursor: "pointer", background: "transparent" }} />
              </Campo>
            </div>
          </Tarjeta>
        )}
      </div>

      {/* ── Canvas Preview ── */}
      <div style={{ flex: 1, background: T.bg0, backgroundImage: `radial-gradient(${T.border} 1px, transparent 1px)`, backgroundSize: "20px 20px", borderRadius: 16, border: `1px solid ${T.borderHi}`, display: "flex", flexDirection: "column", overflow: "hidden" }}>
        {activo ? (<>
          {/* Browser chrome */}
          <div style={{ height: 44, background: T.bg1, borderBottom: `1px solid ${T.borderHi}`, display: "flex", alignItems: "center", padding: "0 16px", gap: 8, flexShrink: 0 }}>
            <div style={{ display: "flex", gap: 6 }}>
              {[T.red, T.amber, T.green].map((c, i) => <div key={i} style={{ width: 12, height: 12, borderRadius: "50%", background: c }} />)}
            </div>
            <div style={{ flex: 1, background: T.bg2, height: 26, borderRadius: 8, display: "flex", alignItems: "center", padding: "0 12px", fontSize: 11, color: T.whiteDim, border: `1px solid ${T.borderHi}`, gap: 6, maxWidth: 420, margin: "0 auto" }}>
              <Ico k="lock" size={10} /> nexuscrm.app/sites/{activo.slug}
            </div>
            <Btn size="sm" onClick={() => updateActivo({ activo: !activo.activo })} style={{ background: activo.activo ? T.green : T.teal, color: "#fff", border: "none" }}>
              {activo.activo ? "● Live" : "Publicar"}
            </Btn>
          </div>

          {/* Live render */}
          <div style={{ flex: 1, background: "#fff", overflowY: "auto", display: "flex", flexDirection: "column" }}>
            {(!activo.blocks || activo.blocks.length === 0) && (
              <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", color: "#6B7280", flexDirection: "column", gap: 12 }}>
                <div style={{ fontSize: 32 }}>📄</div>
                <div style={{ fontSize: 16, fontWeight: 600 }}>Activa secciones en el panel izquierdo</div>
              </div>
            )}

            {activo.blocks?.includes("hero") && (
              <div style={{ padding: "70px 24px", textAlign: "center", borderBottom: "1px solid #E5E7EB", background: "linear-gradient(180deg, #f0f9ff 0%, #fff 100%)" }}>
                <div style={{ display: "inline-block", background: (activo.accentColor || "#06B6D4") + "15", color: activo.accentColor || "#06B6D4", padding: "4px 14px", borderRadius: 20, fontSize: 12, fontWeight: 700, marginBottom: 20, border: `1px solid ${activo.accentColor || "#06B6D4"}30` }}>🚀 Plataforma CRM #1</div>
                <h1 style={{ fontSize: 48, fontWeight: 900, color: "#111827", margin: "0 0 16px", letterSpacing: "-.03em", lineHeight: 1.1 }}>{activo.heroTitle || "Genera más negocios hoy"}</h1>
                <p style={{ fontSize: 18, color: "#6B7280", margin: "0 auto 32px", maxWidth: 560, lineHeight: 1.7 }}>La plataforma líder para captar leads y convertirlos en clientes usando automatización inteligente.</p>
                <div style={{ display: "flex", gap: 12, justifyContent: "center" }}>
                  <button style={{ background: activo.accentColor || "#06B6D4", color: "#fff", border: "none", padding: "14px 28px", borderRadius: 10, fontSize: 15, fontWeight: 700, cursor: "pointer", boxShadow: `0 8px 20px ${activo.accentColor || "#06B6D4"}40` }}>{activo.heroCTA || "Ver Demo"}</button>
                  <button style={{ background: "#F3F4F6", color: "#374151", border: "none", padding: "14px 28px", borderRadius: 10, fontSize: 15, fontWeight: 700, cursor: "pointer" }}>Ver Precios →</button>
                </div>
                <div style={{ marginTop: 48, width: "100%", maxWidth: 700, height: 280, background: "linear-gradient(135deg, #f1f5f9, #e2e8f0)", border: "1px solid #E2E8F0", borderRadius: 16, margin: "48px auto 0", boxShadow: "0 25px 60px -12px rgba(0,0,0,0.12)", display: "flex", alignItems: "center", justifyContent: "center", color: "#94A3B8", fontSize: 14 }}>[ Dashboard Preview ]</div>
              </div>
            )}

            {activo.blocks?.includes("features") && (
              <div style={{ padding: "70px 24px", background: "#F9FAFB" }}>
                <h2 style={{ fontSize: 30, fontWeight: 800, color: "#111827", textAlign: "center", margin: "0 0 40px" }}>Todo lo que necesitas</h2>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 24, maxWidth: 900, margin: "0 auto" }}>
                  {["Automatizaciones IA", "Pipeline Visual", "Reportes en Tiempo Real"].map((ft, i) => (
                    <div key={i} style={{ background: "#fff", padding: 28, borderRadius: 14, border: "1px solid #E5E7EB", boxShadow: "0 4px 6px -1px rgba(0,0,0,0.04)" }}>
                      <div style={{ width: 44, height: 44, borderRadius: 12, background: (activo.accentColor || "#06B6D4") + "18", color: activo.accentColor || "#06B6D4", marginBottom: 16, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22 }}>{["⚡", "🎯", "📊"][i]}</div>
                      <h3 style={{ fontSize: 16, fontWeight: 800, margin: "0 0 8px", color: "#111827" }}>{ft}</h3>
                      <p style={{ fontSize: 13, color: "#6B7280", margin: 0, lineHeight: 1.6 }}>Diseñado para equipos de ventas que quieren cerrar más negocios con menos esfuerzo.</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activo.blocks?.includes("pricing") && (
              <div style={{ padding: "70px 24px", textAlign: "center" }}>
                <h2 style={{ fontSize: 30, fontWeight: 800, color: "#111827", margin: "0 0 40px" }}>Planes Simples</h2>
                <div style={{ display: "flex", gap: 20, justifyContent: "center", flexWrap: "wrap" }}>
                  {[{ plan: "Starter", price: "$29", features: ["5 usuarios", "1 pipeline", "Email básico"] }, { plan: "Pro", price: "$79", features: ["25 usuarios", "Pipelines ilimitados", "Automatizaciones", "API Access"], highlight: true }, { plan: "Enterprise", price: "Custom", features: ["Usuarios ilimitados", "SSO", "SLA 99.9%"] }].map((p, i) => (
                    <div key={i} style={{ background: p.highlight ? activo.accentColor || "#06B6D4" : "#fff", padding: 28, borderRadius: 14, border: `2px solid ${p.highlight ? "transparent" : "#E5E7EB"}`, width: 200, boxShadow: p.highlight ? `0 10px 30px ${activo.accentColor || "#06B6D4"}40` : "none" }}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: p.highlight ? "rgba(255,255,255,.8)" : "#6B7280", marginBottom: 8 }}>{p.plan}</div>
                      <div style={{ fontSize: 32, fontWeight: 900, color: p.highlight ? "#fff" : "#111827", marginBottom: 16 }}>{p.price}</div>
                      {p.features.map((f, j) => <div key={j} style={{ fontSize: 12, color: p.highlight ? "rgba(255,255,255,.85)" : "#374151", marginBottom: 6 }}>✓ {f}</div>)}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activo.blocks?.includes("testimonials") && (
              <div style={{ padding: "70px 24px", background: "#F9FAFB" }}>
                <h2 style={{ fontSize: 30, fontWeight: 800, color: "#111827", textAlign: "center", margin: "0 0 40px" }}>Lo que dicen nuestros clientes</h2>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 20, maxWidth: 900, margin: "0 auto" }}>
                  {[{ name: "María G.", company: "TechCorp", text: "Incrementamos las ventas en 40% el primer trimestre." }, { name: "Carlos R.", company: "Startup SL", text: "La automatización nos ahorra 10h a la semana." }, { name: "Ana P.", company: "AgenciaX", text: "El mejor CRM que hemos usado en 5 años." }].map((t, i) => (
                    <div key={i} style={{ background: "#fff", padding: 24, borderRadius: 14, border: "1px solid #E5E7EB" }}>
                      <div style={{ fontSize: 20, marginBottom: 12 }}>⭐⭐⭐⭐⭐</div>
                      <p style={{ fontSize: 14, color: "#374151", lineHeight: 1.7, margin: "0 0 16px", fontStyle: "italic" }}>"{t.text}"</p>
                      <div style={{ fontSize: 13, fontWeight: 700, color: "#111827" }}>{t.name} · <span style={{ color: "#6B7280", fontWeight: 500 }}>{t.company}</span></div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activo.blocks?.includes("form") && (
              <div style={{ padding: "70px 24px", textAlign: "center", background: "#fff" }}>
                <h2 style={{ fontSize: 30, fontWeight: 800, color: "#111827", margin: "0 0 8px" }}>¿Listo para empezar?</h2>
                <p style={{ color: "#6B7280", marginBottom: 32 }}>Ingresa tus datos y un asesor te contactará en menos de 24 horas.</p>
                <div style={{ maxWidth: 400, margin: "0 auto", display: "flex", flexDirection: "column", gap: 12 }}>
                  {["Nombre completo", "Email empresarial", "Empresa / Cargo"].map((pl, i) => (
                    <input key={i} placeholder={pl} style={{ width: "100%", padding: "12px 16px", border: "1px solid #D1D5DB", borderRadius: 8, fontSize: 14, fontFamily: "inherit", outline: "none", boxSizing: "border-box" }} readOnly />
                  ))}
                  <button style={{ background: activo.accentColor || "#06B6D4", color: "#fff", border: "none", padding: "14px", borderRadius: 10, fontSize: 15, fontWeight: 700, cursor: "pointer", marginTop: 4 }}>Solicitar Demo Gratuita</button>
                </div>
              </div>
            )}

            {activo.blocks?.includes("cta") && (
              <div style={{ padding: "60px 24px", background: activo.accentColor || "#06B6D4", textAlign: "center" }}>
                <h2 style={{ fontSize: 32, fontWeight: 900, color: "#fff", margin: "0 0 16px" }}>Empieza hoy. Es gratis.</h2>
                <p style={{ color: "rgba(255,255,255,.85)", fontSize: 16, marginBottom: 28 }}>Sin tarjeta de crédito · Configuración en 2 minutos</p>
                <button style={{ background: "#fff", color: activo.accentColor || "#06B6D4", border: "none", padding: "14px 32px", borderRadius: 10, fontSize: 15, fontWeight: 800, cursor: "pointer" }}>{activo.heroCTA || "Comenzar Ahora"} →</button>
              </div>
            )}
          </div>
        </>) : (
          <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 16 }}>
            <div style={{ fontSize: 48 }}>🌐</div>
            <div style={{ fontSize: 18, fontWeight: 700, color: T.white }}>Crea tu primera landing page</div>
            <div style={{ fontSize: 14, color: T.whiteDim }}>Usa el botón "Nueva" para comenzar</div>
            <Btn onClick={() => setShowNew(true)}><Ico k="plus" size={14} /> Nueva Landing Page</Btn>
          </div>
        )}
      </div>

      {/* ── New Page Modal ── */}
      <Modal open={showNew} onClose={() => setShowNew(false)} title="Nueva Landing Page" width={440}>
        <Campo label="Nombre de la Campaña">
          <Inp value={fNew.titulo} onChange={e => setFNew(p => ({ ...p, titulo: e.target.value }))} placeholder="ej. Campaña Black Friday 2026" autoFocus />
        </Campo>
        <Campo label="Slug URL (opcional)">
          <Inp value={fNew.slug} onChange={e => setFNew(p => ({ ...p, slug: e.target.value.toLowerCase().replace(/\s+/g, "-") }))} placeholder="black-friday-2026" />
        </Campo>
        <div style={{ display: "flex", gap: 12, justifyContent: "flex-end", marginTop: 24 }}>
          <Btn variant="secundario" onClick={() => setShowNew(false)}>Cancelar</Btn>
          <Btn onClick={nuevaPagina} disabled={!fNew.titulo.trim()}>Crear Página</Btn>
        </div>
      </Modal>
    </div>
  );
};

// Export THEMES for use in Configuracion
export { THEMES };
