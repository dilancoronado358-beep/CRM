import { useState, useRef } from "react";
import { T } from "../theme";
import { uid } from "../utils";
import { Btn, Inp, Tarjeta, EncabezadoSeccion, Ico, Campo, Modal } from "../components/ui";

const ALL_BLOCKS = [
  { id: "hero", title: "Hero Section", icon: "star", desc: "Título principal y CTA" },
  { id: "features", title: "Grid de Beneficios", icon: "grid", desc: "3-4 columnas de características" },
  { id: "pricing", title: "Tabla de Precios", icon: "dollar", desc: "Planes con botón de acción" },
  { id: "testimonials", title: "Testimonios", icon: "user", desc: "Opiniones de clientes" },
  { id: "faq", title: "FAQ", icon: "help-circle", desc: "Preguntas frecuentes" },
  { id: "stats", title: "Estadísticas", icon: "bar-chart", desc: "Números que impactan" },
  { id: "team", title: "Equipo", icon: "users", desc: "Tu equipo o empresa" },
  { id: "form", title: "Formulario Captura", icon: "template", desc: "Lead capture embebido" },
  { id: "video", title: "Video Embed", icon: "video", desc: "YouTube o Vimeo" },
  { id: "cta", title: "Llamada a la Acción", icon: "mail", desc: "Banner final de conversión" },
];

export const Websites = ({ db, setDb }) => {
  const pagesInit = [{
    id: "p1", slug: "landing-2026", titulo: "Campaña Q1 2026", activo: true,
    blocks: ["hero", "features", "cta"],
    heroTitle: "Genera más negocios hoy", heroSub: "La plataforma líder para captar leads y convertirlos en clientes.",
    heroCTA: "Ver Demo", heroCTA2: "Ver Precios",
    accentColor: "#06B6D4", bgDark: false,
    videoUrl: "https://www.youtube.com/embed/dQw4w9WgXcQ",
    faqItems: [
      { q: "¿Cuánto cuesta?", a: "Tenemos planes desde $29/mes con prueba gratuita de 14 días." },
      { q: "¿Es fácil de configurar?", a: "Sí, en menos de 2 horas puedes tener tu CRM listo para usar." },
    ],
    statsItems: [
      { value: "+500", label: "Clientes Activos" },
      { value: "40%", label: "Más Conversiones" },
      { value: "10h", label: "Ahorradas por Semana" },
      { value: "99.9%", label: "Uptime Garantizado" },
    ],
    customFeatures: [
      { icon: "⚡", title: "Automatizaciones IA", desc: "Automatiza seguimientos y tareas con inteligencia artificial." },
      { icon: "🎯", title: "Pipeline Visual", desc: "Gestiona todas tus oportunidades en un tablero Kanban." },
      { icon: "📊", title: "Reportes al Instante", desc: "Métricas de ventas actualizadas en tiempo real." },
      { icon: "📱", title: "WhatsApp Integrado", desc: "Chatbot automático con tu base de contactos." },
    ],
  }];

  const [pages, setPages] = useState(db.websites?.length ? db.websites : pagesInit);
  const [activoId, setActivoId] = useState(pages[0]?.id || null);
  const [editPanel, setEditPanel] = useState("sections"); // sections | edit | design
  const [showNew, setShowNew] = useState(false);
  const [fNew, setFNew] = useState({ titulo: "", slug: "" });
  const [dragBlock, setDragBlock] = useState(null);
  const [dragOverBlock, setDragOverBlock] = useState(null);
  const [expandedBlock, setExpandedBlock] = useState(null);
  const dragRef = useRef(null);

  const activo = pages.find((p) => p.id === activoId) || null;
  const save = (nPages) => { setPages(nPages); setDb((d) => ({ ...d, websites: nPages })); };
  const updateActivo = (upd) => {
    const nPages = pages.map((p) => (p.id === activoId ? { ...p, ...upd } : p));
    save(nPages);
  };

  const toggleBlock = (blockId) => {
    const cur = activo.blocks || [];
    const nBlocks = cur.includes(blockId) ? cur.filter((b) => b !== blockId) : [...cur, blockId];
    updateActivo({ blocks: nBlocks });
  };

  // Drag to reorder blocks
  const handleBlockDragStart = (e, idx) => {
    setDragBlock(idx);
    dragRef.current = e.target;
    setTimeout(() => { if (dragRef.current) dragRef.current.style.opacity = "0.4"; }, 0);
  };
  const handleBlockDragEnd = () => {
    if (dragBlock !== null && dragOverBlock !== null && dragBlock !== dragOverBlock) {
      const newBlocks = [...(activo.blocks || [])];
      const [removed] = newBlocks.splice(dragBlock, 1);
      newBlocks.splice(dragOverBlock, 0, removed);
      updateActivo({ blocks: newBlocks });
    }
    if (dragRef.current) dragRef.current.style.opacity = "1";
    setDragBlock(null);
    setDragOverBlock(null);
    dragRef.current = null;
  };
  const moveBlock = (idx, dir) => {
    const newBlocks = [...(activo.blocks || [])];
    const target = idx + dir;
    if (target < 0 || target >= newBlocks.length) return;
    [newBlocks[idx], newBlocks[target]] = [newBlocks[target], newBlocks[idx]];
    updateActivo({ blocks: newBlocks });
  };

  const nuevaPagina = () => {
    if (!fNew.titulo.trim()) return;
    const id = "p" + uid();
    const slug = fNew.slug.trim() || fNew.titulo.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
    const np = { ...pagesInit[0], id, slug, titulo: fNew.titulo, activo: false, blocks: ["hero", "features", "cta"], heroTitle: fNew.titulo };
    const nPages = [...pages, np];
    save(nPages); setActivoId(np.id); setShowNew(false); setFNew({ titulo: "", slug: "" });
  };

  const copyLink = (p) => {
    const url = `https://crm.ensing.lat/#/sites/${p.id}`;
    navigator.clipboard?.writeText(url);
    alert(`✅ Link copiado!\n\n${url}\n\nCualquier persona puede abrirlo sin login.`);
  };

  const accent = activo?.accentColor || "#06B6D4";

  // Inline block editors
  const BlockEditor = ({ blockId }) => {
    if (!activo) return null;
    switch (blockId) {
      case "hero":
        return (
          <div style={{ display: "flex", flexDirection: "column", gap: 10, padding: 14, background: T.bg2, borderRadius: 10, marginTop: 8 }}>
            <div><label style={ls}>Título Principal</label>
              <Inp value={activo.heroTitle || ""} onChange={(e) => updateActivo({ heroTitle: e.target.value })} /></div>
            <div><label style={ls}>Subtítulo</label>
              <Inp value={activo.heroSub || ""} onChange={(e) => updateActivo({ heroSub: e.target.value })} placeholder="Explica tu propuesta de valor" /></div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              <div><label style={ls}>Botón 1</label><Inp value={activo.heroCTA || ""} onChange={(e) => updateActivo({ heroCTA: e.target.value })} /></div>
              <div><label style={ls}>Botón 2</label><Inp value={activo.heroCTA2 || ""} onChange={(e) => updateActivo({ heroCTA2: e.target.value })} /></div>
            </div>
          </div>
        );
      case "video":
        return (
          <div style={{ padding: 14, background: T.bg2, borderRadius: 10, marginTop: 8 }}>
            <label style={ls}>URL de YouTube/Vimeo (embed)</label>
            <Inp value={activo.videoUrl || ""} onChange={(e) => updateActivo({ videoUrl: e.target.value })} placeholder="https://www.youtube.com/embed/VIDEO_ID" />
          </div>
        );
      case "faq":
        return (
          <div style={{ padding: 14, background: T.bg2, borderRadius: 10, marginTop: 8, display: "flex", flexDirection: "column", gap: 10 }}>
            {(activo.faqItems || []).map((item, i) => (
              <div key={i} style={{ display: "flex", flexDirection: "column", gap: 6, padding: "10px", background: T.bg1, borderRadius: 8, border: `1px solid ${T.borderHi}` }}>
                <Inp value={item.q} onChange={(e) => { const n = [...(activo.faqItems || [])]; n[i] = { ...n[i], q: e.target.value }; updateActivo({ faqItems: n }); }} placeholder="Pregunta..." />
                <textarea value={item.a} onChange={(e) => { const n = [...(activo.faqItems || [])]; n[i] = { ...n[i], a: e.target.value }; updateActivo({ faqItems: n }); }} rows={2} placeholder="Respuesta..." style={{ padding: "8px 10px", background: T.bg2, border: `1px solid ${T.borderHi}`, borderRadius: 6, color: T.white, fontSize: 13, fontFamily: "inherit", resize: "vertical" }} />
                <button onClick={() => updateActivo({ faqItems: (activo.faqItems || []).filter((_, j) => j !== i) })} style={{ alignSelf: "flex-end", background: "transparent", border: "none", color: T.red, cursor: "pointer", fontSize: 11 }}>Eliminar</button>
              </div>
            ))}
            <button onClick={() => updateActivo({ faqItems: [...(activo.faqItems || []), { q: "Nueva pregunta", a: "Respuesta aquí" }] })} style={{ padding: "8px", background: "transparent", border: `1px dashed ${T.borderHi}`, borderRadius: 8, color: T.teal, cursor: "pointer", fontSize: 12 }}>+ Añadir pregunta</button>
          </div>
        );
      case "stats":
        return (
          <div style={{ padding: 14, background: T.bg2, borderRadius: 10, marginTop: 8, display: "flex", flexDirection: "column", gap: 8 }}>
            {(activo.statsItems || []).map((item, i) => (
              <div key={i} style={{ display: "grid", gridTemplateColumns: "1fr 2fr auto", gap: 8, alignItems: "center" }}>
                <Inp value={item.value} onChange={(e) => { const n = [...(activo.statsItems || [])]; n[i] = { ...n[i], value: e.target.value }; updateActivo({ statsItems: n }); }} placeholder="+500" />
                <Inp value={item.label} onChange={(e) => { const n = [...(activo.statsItems || [])]; n[i] = { ...n[i], label: e.target.value }; updateActivo({ statsItems: n }); }} placeholder="Clientes activos" />
                <button onClick={() => updateActivo({ statsItems: (activo.statsItems || []).filter((_, j) => j !== i) })} style={{ background: "transparent", border: "none", color: T.red, cursor: "pointer", fontSize: 14 }}>✕</button>
              </div>
            ))}
            <button onClick={() => updateActivo({ statsItems: [...(activo.statsItems || []), { value: "100+", label: "Nuevo stat" }] })} style={{ padding: "8px", background: "transparent", border: `1px dashed ${T.borderHi}`, borderRadius: 8, color: T.teal, cursor: "pointer", fontSize: 12 }}>+ Añadir estadística</button>
          </div>
        );
      default:
        return null;
    }
  };

  const ls = { fontSize: 11, color: T.whiteDim, display: "block", marginBottom: 4 };

  return (
    <div style={{ display: "flex", gap: 0, height: "calc(100vh - 120px)", overflow: "hidden" }}>
      {/* ── SIDEBAR ── */}
      <div style={{ width: 340, display: "flex", flexDirection: "column", borderRight: `1px solid ${T.borderHi}`, flexShrink: 0 }}>
        {/* Header */}
        <div style={{ padding: "14px 16px", borderBottom: `1px solid ${T.borderHi}` }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div style={{ fontSize: 16, fontWeight: 800, color: T.white }}>🌐 Landing Pages</div>
            <Btn size="sm" onClick={() => setShowNew(true)}><Ico k="plus" size={12} /> Nueva</Btn>
          </div>
          {/* Page list small */}
          <div style={{ marginTop: 10, display: "flex", flexDirection: "column", gap: 5 }}>
            {pages.map((p) => (
              <div key={p.id} onClick={() => setActivoId(p.id)} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 10px", background: activoId === p.id ? T.tealSoft : T.bg2, border: `1px solid ${activoId === p.id ? T.teal : T.borderHi}`, borderRadius: 8, cursor: "pointer", transition: "all .15s" }}>
                <div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: activoId === p.id ? T.teal : T.white }}>{p.titulo}</div>
                  <div style={{ fontSize: 10, color: T.whiteDim, fontFamily: "monospace" }}>/{p.slug}</div>
                </div>
                <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                  <div style={{ width: 7, height: 7, borderRadius: "50%", background: p.activo ? T.green : T.whiteDim }} />
                  <button onClick={(e) => { e.stopPropagation(); copyLink(p); }} style={{ background: "transparent", border: `1px solid ${T.borderHi}`, color: T.whiteDim, borderRadius: 4, padding: "2px 6px", fontSize: 10, cursor: "pointer" }}>🔗</button>
                  <button onClick={(e) => { e.stopPropagation(); updateActivo({ activo: !p.activo }); setActivoId(p.id); }} style={{ background: "transparent", border: `1px solid ${T.borderHi}`, color: p.activo ? T.green : T.whiteDim, borderRadius: 4, padding: "2px 6px", fontSize: 10, cursor: "pointer" }}>{p.activo ? "LIVE" : "OFF"}</button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {activo && (<>
          {/* Tabs */}
          <div style={{ display: "flex", borderBottom: `1px solid ${T.borderHi}` }}>
            {[["sections", "Secciones"], ["edit", "Editar"], ["design", "Diseño"]].map(([k, label]) => (
              <button key={k} onClick={() => setEditPanel(k)} style={{ flex: 1, padding: "9px 0", background: "transparent", border: "none", color: editPanel === k ? T.teal : T.whiteDim, fontWeight: editPanel === k ? 700 : 500, fontSize: 11, cursor: "pointer", borderBottom: `2px solid ${editPanel === k ? T.teal : "transparent"}`, transition: "all .15s" }}>
                {label}
              </button>
            ))}
          </div>

          <div style={{ flex: 1, overflowY: "auto", padding: 14 }}>
            {/* SECCIONES */}
            {editPanel === "sections" && (
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <div style={{ fontSize: 11, color: T.whiteDim, textAlign: "center", marginBottom: 6 }}>Arrastra para reordenar · Activa/desactiva secciones</div>

                {/* Active blocks (reorderable) */}
                {(activo.blocks || []).map((blockId, idx) => {
                  const def = ALL_BLOCKS.find((b) => b.id === blockId);
                  if (!def) return null;
                  return (
                    <div key={blockId}
                      draggable
                      onDragStart={(e) => handleBlockDragStart(e, idx)}
                      onDragEnter={() => setDragOverBlock(idx)}
                      onDragEnd={handleBlockDragEnd}
                      onDragOver={(e) => e.preventDefault()}
                      style={{ background: dragOverBlock === idx ? T.tealSoft : T.tealSoft, border: `1px solid ${T.teal}`, borderRadius: 8, transition: "all .15s" }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "9px 12px", cursor: "grab" }}>
                        <span style={{ color: T.whiteDim, fontSize: 15, userSelect: "none" }}>⠿</span>
                        <Ico k={def.icon} size={13} style={{ color: T.teal, flexShrink: 0 }} />
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: 12, fontWeight: 700, color: T.teal }}>{def.title}</div>
                          <div style={{ fontSize: 10, color: T.whiteDim }}>{def.desc}</div>
                        </div>
                        <div style={{ display: "flex", gap: 3 }}>
                          <button onClick={() => moveBlock(idx, -1)} disabled={idx === 0} style={{ background: "transparent", border: `1px solid ${T.borderHi}`, color: T.whiteDim, cursor: "pointer", borderRadius: 4, padding: "1px 5px", fontSize: 11 }}>↑</button>
                          <button onClick={() => moveBlock(idx, 1)} disabled={idx === (activo.blocks || []).length - 1} style={{ background: "transparent", border: `1px solid ${T.borderHi}`, color: T.whiteDim, cursor: "pointer", borderRadius: 4, padding: "1px 5px", fontSize: 11 }}>↓</button>
                          <button onClick={() => setExpandedBlock(expandedBlock === blockId ? null : blockId)} style={{ background: expandedBlock === blockId ? T.teal : "transparent", border: `1px solid ${T.teal}`, color: expandedBlock === blockId ? "#000" : T.teal, cursor: "pointer", borderRadius: 4, padding: "1px 5px", fontSize: 11 }}>✏️</button>
                          <button onClick={() => toggleBlock(blockId)} style={{ background: "transparent", border: `1px solid ${T.red}40`, color: T.red, cursor: "pointer", borderRadius: 4, padding: "1px 5px", fontSize: 11 }}>✕</button>
                        </div>
                      </div>
                      {expandedBlock === blockId && <BlockEditor blockId={blockId} />}
                    </div>
                  );
                })}

                <div style={{ margin: "10px 0 6px", fontSize: 11, color: T.whiteDim, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".08em" }}>Añadir Sección</div>

                {/* Available blocks */}
                {ALL_BLOCKS.filter((b) => !(activo.blocks || []).includes(b.id)).map((b) => (
                  <div key={b.id} onClick={() => toggleBlock(b.id)} style={{ display: "flex", alignItems: "center", gap: 8, padding: "9px 12px", background: T.bg2, border: `1px solid ${T.borderHi}`, borderRadius: 8, cursor: "pointer", transition: "all .15s" }}>
                    <Ico k={b.icon} size={13} style={{ color: T.whiteDim, flexShrink: 0 }} />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 12, fontWeight: 600, color: T.white }}>{b.title}</div>
                      <div style={{ fontSize: 10, color: T.whiteDim }}>{b.desc}</div>
                    </div>
                    <span style={{ color: T.teal, fontSize: 18, fontWeight: 300 }}>+</span>
                  </div>
                ))}
              </div>
            )}

            {/* EDIT */}
            {editPanel === "edit" && (
              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                <div><label style={ls}>Título / Nombre de Campaña</label><Inp value={activo.titulo} onChange={(e) => updateActivo({ titulo: e.target.value })} style={{ fontWeight: 700 }} /></div>
                <div><label style={ls}>Slug URL</label>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <span style={{ fontSize: 12, color: T.whiteDim, whiteSpace: "nowrap" }}>/</span>
                    <Inp value={activo.slug} onChange={(e) => updateActivo({ slug: e.target.value.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "") })} style={{ fontSize: 13, fontFamily: "monospace" }} />
                  </div>
                </div>
                <div><label style={ls}>Título Principal (Hero)</label><Inp value={activo.heroTitle || ""} onChange={(e) => updateActivo({ heroTitle: e.target.value })} /></div>
                <div><label style={ls}>Subtítulo</label><Inp value={activo.heroSub || ""} onChange={(e) => updateActivo({ heroSub: e.target.value })} /></div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                  <div><label style={ls}>Botón CTA 1</label><Inp value={activo.heroCTA || ""} onChange={(e) => updateActivo({ heroCTA: e.target.value })} /></div>
                  <div><label style={ls}>Botón CTA 2</label><Inp value={activo.heroCTA2 || ""} onChange={(e) => updateActivo({ heroCTA2: e.target.value })} /></div>
                </div>
                <div><label style={ls}>URL Video (YouTube embed)</label><Inp value={activo.videoUrl || ""} onChange={(e) => updateActivo({ videoUrl: e.target.value })} placeholder="https://www.youtube.com/embed/ID" /></div>
              </div>
            )}

            {/* DESIGN */}
            {editPanel === "design" && (
              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                <div><label style={ls}>Color Principal</label>
                  <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                    <input type="color" value={activo.accentColor || "#06B6D4"} onChange={(e) => updateActivo({ accentColor: e.target.value })} style={{ width: 40, height: 36, border: "none", borderRadius: 6, cursor: "pointer", background: "transparent" }} />
                    <span style={{ fontSize: 12, color: T.whiteDim, fontFamily: "monospace" }}>{activo.accentColor}</span>
                  </div>
                </div>
                <div>
                  <label style={ls}>Paletas Rápidas</label>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    {["#06B6D4", "#8B5CF6", "#10B981", "#F59E0B", "#EF4444", "#EC4899", "#3B82F6", "#111827"].map((c) => (
                      <button key={c} onClick={() => updateActivo({ accentColor: c })} style={{ width: 28, height: 28, borderRadius: "50%", background: c, border: activo.accentColor === c ? "3px solid #fff" : "2px solid transparent", cursor: "pointer" }} />
                    ))}
                  </div>
                </div>
                <div>
                  <label style={{ ...ls, marginBottom: 8 }}>Link Público</label>
                  <div style={{ padding: "10px 12px", background: T.bg2, borderRadius: 8, fontFamily: "monospace", fontSize: 11, color: T.teal, wordBreak: "break-all", marginBottom: 8 }}>
                    https://crm.ensing.lat/#/sites/{activo.id}
                  </div>
                  <div style={{ display: "flex", gap: 8 }}>
                    <Btn variant="secundario" size="sm" onClick={() => copyLink(activo)} style={{ flex: 1 }}>Copiar</Btn>
                    <Btn variant="secundario" size="sm" onClick={() => window.open(`https://crm.ensing.lat/#/sites/${activo.id}`, "_blank")} style={{ flex: 1 }}>Abrir</Btn>
                  </div>
                </div>
              </div>
            )}
          </div>
        </>)}
      </div>

      {/* ── CANVAS PREVIEW ── */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
        {activo ? (<>
          {/* Browser bar */}
          <div style={{ height: 44, background: T.bg1, borderBottom: `1px solid ${T.borderHi}`, display: "flex", alignItems: "center", padding: "0 16px", gap: 8, flexShrink: 0 }}>
            <div style={{ display: "flex", gap: 5 }}>
              {["#EF4444", "#F59E0B", "#10B981"].map((c, i) => <div key={i} style={{ width: 11, height: 11, borderRadius: "50%", background: c }} />)}
            </div>
            <div style={{ flex: 1, background: T.bg2, height: 26, borderRadius: 8, display: "flex", alignItems: "center", padding: "0 12px", fontSize: 11, color: T.whiteDim, maxWidth: 420, margin: "0 auto", gap: 6, border: `1px solid ${T.borderHi}` }}>
              <Ico k="lock" size={9} /> crm.ensing.lat/#/sites/{activo.slug}
            </div>
            <Btn size="sm" onClick={() => copyLink(activo)} style={{ fontSize: 11 }}><Ico k="link" size={11} /> Copiar Link</Btn>
            <Btn size="sm" onClick={() => updateActivo({ activo: !activo.activo })} style={{ background: activo.activo ? T.green : T.teal, color: "#fff", border: "none", fontSize: 11 }}>
              {activo.activo ? "● LIVE" : "Publicar"}
            </Btn>
          </div>

          {/* Live render */}
          <div style={{ flex: 1, background: "#fff", overflowY: "auto", display: "flex", flexDirection: "column" }}>
            {(!activo.blocks || activo.blocks.length === 0) && (
              <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", color: "#6B7280", flexDirection: "column", gap: 12 }}>
                <div style={{ fontSize: 40 }}>📄</div>
                <div style={{ fontSize: 15, fontWeight: 600 }}>Activa secciones desde el panel izquierdo</div>
              </div>
            )}

            {(activo.blocks || []).map((blockId) => {
              switch (blockId) {
                case "hero":
                  return (
                    <div key="hero" style={{ padding: "80px 24px", textAlign: "center", background: `linear-gradient(180deg, ${accent}0A 0%, #fff 100%)`, borderBottom: "1px solid #E5E7EB" }}>
                      <div style={{ display: "inline-block", background: accent + "18", color: accent, padding: "5px 16px", borderRadius: 20, fontSize: 11, fontWeight: 700, marginBottom: 20, border: `1px solid ${accent}30`, textTransform: "uppercase", letterSpacing: ".08em" }}>🚀 Plataforma CRM Empresarial</div>
                      <h1 style={{ fontSize: "clamp(32px, 5vw, 56px)", fontWeight: 900, color: "#111827", margin: "0 0 18px", letterSpacing: "-.04em", lineHeight: 1.05 }}>{activo.heroTitle || "Genera más negocios hoy"}</h1>
                      <p style={{ fontSize: 18, color: "#6B7280", margin: "0 auto 36px", maxWidth: 560, lineHeight: 1.7 }}>{activo.heroSub || "La plataforma líder para captar leads y convertirlos en clientes usando automatización inteligente."}</p>
                      <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
                        <button style={{ background: accent, color: "#fff", border: "none", padding: "15px 30px", borderRadius: 12, fontSize: 15, fontWeight: 700, cursor: "pointer", boxShadow: `0 8px 24px ${accent}44` }}>{activo.heroCTA || "Ver Demo"}</button>
                        {activo.heroCTA2 && <button style={{ background: "#F3F4F6", color: "#374151", border: "none", padding: "15px 28px", borderRadius: 12, fontSize: 15, fontWeight: 700, cursor: "pointer" }}>{activo.heroCTA2} →</button>}
                      </div>
                    </div>
                  );

                case "stats":
                  return (
                    <div key="stats" style={{ padding: "50px 24px", background: accent, textAlign: "center" }}>
                      <div style={{ display: "grid", gridTemplateColumns: `repeat(${Math.min((activo.statsItems || []).length, 4)}, 1fr)`, gap: 24, maxWidth: 900, margin: "0 auto" }}>
                        {(activo.statsItems || []).map((s, i) => (
                          <div key={i}>
                            <div style={{ fontSize: 36, fontWeight: 900, color: "#fff" }}>{s.value}</div>
                            <div style={{ fontSize: 13, color: "rgba(255,255,255,.8)", marginTop: 4 }}>{s.label}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );

                case "features":
                  return (
                    <div key="features" style={{ padding: "70px 24px", background: "#F9FAFB" }}>
                      <h2 style={{ fontSize: 30, fontWeight: 800, color: "#111827", textAlign: "center", margin: "0 0 40px", letterSpacing: "-.02em" }}>Todo lo que necesitas para vender más</h2>
                      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 20, maxWidth: 900, margin: "0 auto" }}>
                        {(activo.customFeatures || []).map((f, i) => (
                          <div key={i} style={{ background: "#fff", padding: 26, borderRadius: 14, border: "1px solid #E5E7EB", boxShadow: "0 4px 6px -1px rgba(0,0,0,0.04)" }}>
                            <div style={{ width: 44, height: 44, borderRadius: 12, background: accent + "18", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, marginBottom: 16 }}>{f.icon}</div>
                            <h3 style={{ fontSize: 15, fontWeight: 800, margin: "0 0 8px", color: "#111827" }}>{f.title}</h3>
                            <p style={{ fontSize: 13, color: "#6B7280", margin: 0, lineHeight: 1.6 }}>{f.desc}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  );

                case "pricing":
                  return (
                    <div key="pricing" style={{ padding: "70px 24px", textAlign: "center", background: "#fff" }}>
                      <h2 style={{ fontSize: 30, fontWeight: 800, color: "#111827", margin: "0 0 40px" }}>Planes simples y transparentes</h2>
                      <div style={{ display: "flex", gap: 20, justifyContent: "center", flexWrap: "wrap" }}>
                        {[{ p: "Starter", price: "$29", f: ["5 usuarios", "1 pipeline", "Email básico"], h: false },
                          { p: "Pro", price: "$79", f: ["25 usuarios", "Pipelines ilimitados", "Automatizaciones IA", "API Access"], h: true },
                          { p: "Enterprise", price: "Custom", f: ["Usuarios ilimitados", "SSO", "SLA 99.9%"], h: false }].map((plan, i) => (
                          <div key={i} style={{ background: plan.h ? accent : "#fff", padding: "28px 24px", borderRadius: 16, border: `2px solid ${plan.h ? accent : "#E5E7EB"}`, width: 200, boxShadow: plan.h ? `0 10px 30px ${accent}40` : "none" }}>
                            <div style={{ fontSize: 12, fontWeight: 700, color: plan.h ? "rgba(255,255,255,.8)" : "#6B7280", marginBottom: 8 }}>{plan.p}</div>
                            <div style={{ fontSize: 34, fontWeight: 900, color: plan.h ? "#fff" : "#111827", marginBottom: 16 }}>{plan.price}</div>
                            {plan.f.map((f, j) => <div key={j} style={{ fontSize: 11, color: plan.h ? "rgba(255,255,255,.85)" : "#374151", marginBottom: 5 }}>✓ {f}</div>)}
                          </div>
                        ))}
                      </div>
                    </div>
                  );

                case "testimonials":
                  return (
                    <div key="testimonials" style={{ padding: "70px 24px", background: "#F9FAFB" }}>
                      <h2 style={{ fontSize: 30, fontWeight: 800, color: "#111827", textAlign: "center", margin: "0 0 40px" }}>Lo que dicen nuestros clientes</h2>
                      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 20, maxWidth: 900, margin: "0 auto" }}>
                        {[{ n: "María G.", c: "TechCorp", t: "Incrementamos las ventas en 40% el primer trimestre." },
                          { n: "Carlos R.", c: "Startup SL", t: "La automatización nos ahorra 10h a la semana." },
                          { n: "Ana P.", c: "AgenciaX", t: "El mejor CRM que hemos usado en 5 años." }].map((t, i) => (
                          <div key={i} style={{ background: "#fff", padding: 24, borderRadius: 14, border: "1px solid #E5E7EB" }}>
                            <div style={{ fontSize: 18, marginBottom: 12 }}>⭐⭐⭐⭐⭐</div>
                            <p style={{ fontSize: 14, color: "#374151", lineHeight: 1.7, margin: "0 0 16px", fontStyle: "italic" }}>"{t.t}"</p>
                            <div style={{ fontSize: 13, fontWeight: 700, color: "#111827" }}>{t.n} · <span style={{ color: "#6B7280", fontWeight: 500 }}>{t.c}</span></div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );

                case "faq":
                  return (
                    <div key="faq" style={{ padding: "70px 24px", background: "#fff" }}>
                      <h2 style={{ fontSize: 30, fontWeight: 800, color: "#111827", textAlign: "center", margin: "0 0 40px" }}>Preguntas Frecuentes</h2>
                      <div style={{ maxWidth: 700, margin: "0 auto", display: "flex", flexDirection: "column", gap: 12 }}>
                        {(activo.faqItems || []).map((item, i) => (
                          <div key={i} style={{ background: "#F9FAFB", padding: "20px 24px", borderRadius: 12, border: "1px solid #E5E7EB" }}>
                            <div style={{ fontWeight: 700, fontSize: 15, color: "#111827", marginBottom: 8 }}>❓ {item.q}</div>
                            <div style={{ fontSize: 14, color: "#6B7280", lineHeight: 1.7 }}>{item.a}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );

                case "video":
                  return activo.videoUrl ? (
                    <div key="video" style={{ padding: "60px 24px", background: "#111827", textAlign: "center" }}>
                      <h2 style={{ fontSize: 28, fontWeight: 800, color: "#fff", margin: "0 0 32px" }}>Ve cómo funciona</h2>
                      <div style={{ maxWidth: 800, margin: "0 auto", borderRadius: 16, overflow: "hidden", boxShadow: "0 25px 60px rgba(0,0,0,0.4)" }}>
                        <iframe src={activo.videoUrl} width="100%" height="450" frameBorder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen style={{ display: "block" }} />
                      </div>
                    </div>
                  ) : (
                    <div key="video" style={{ padding: "60px 24px", background: "#111827", textAlign: "center" }}>
                      <div style={{ color: "#6B7280", fontSize: 14 }}>Ingresa una URL de YouTube en el panel de edición</div>
                    </div>
                  );

                case "form":
                  return (
                    <div key="form" id="form-section" style={{ padding: "70px 24px", background: "#F9FAFB", textAlign: "center" }}>
                      <h2 style={{ fontSize: 30, fontWeight: 800, color: "#111827", margin: "0 0 10px" }}>¿Listo para empezar?</h2>
                      <p style={{ color: "#6B7280", marginBottom: 36, fontSize: 15 }}>Un asesor te contactará en menos de 24 horas.</p>
                      <div style={{ maxWidth: 420, margin: "0 auto", background: "#fff", borderRadius: 20, padding: 32, boxShadow: "0 10px 40px rgba(0,0,0,0.08)", border: "1px solid #E5E7EB" }}>
                        {["Nombre completo *", "Email empresarial *", "Empresa / Cargo"].map((pl, i) => (
                          <input key={i} readOnly placeholder={pl} style={{ width: "100%", padding: "12px 14px", border: "1px solid #E5E7EB", borderRadius: 8, fontSize: 14, marginBottom: 12, fontFamily: "inherit", boxSizing: "border-box", color: "#9CA3AF" }} />
                        ))}
                        <button style={{ width: "100%", padding: "14px", background: accent, color: "#fff", border: "none", borderRadius: 10, fontSize: 15, fontWeight: 700, cursor: "pointer", marginTop: 4, boxShadow: `0 8px 20px ${accent}44` }}>Solicitar Demo Gratuita →</button>
                      </div>
                    </div>
                  );

                case "cta":
                  return (
                    <div key="cta" style={{ padding: "70px 24px", background: accent, textAlign: "center" }}>
                      <h2 style={{ fontSize: 34, fontWeight: 900, color: "#fff", margin: "0 0 14px" }}>Empieza hoy. Es gratis.</h2>
                      <p style={{ color: "rgba(255,255,255,.85)", fontSize: 16, marginBottom: 28 }}>Sin tarjeta de crédito · Configuración en 2 minutos</p>
                      <button style={{ background: "#fff", color: accent, border: "none", padding: "16px 36px", borderRadius: 12, fontSize: 16, fontWeight: 800, cursor: "pointer" }}>{activo.heroCTA || "Comenzar Ahora"} →</button>
                    </div>
                  );

                default: return null;
              }
            })}

            {/* Footer */}
            {(activo.blocks || []).length > 0 && (
              <div style={{ padding: "24px", background: "#111827", textAlign: "center", color: "#6B7280", fontSize: 13 }}>
                © {new Date().getFullYear()} · Potenciado por <span style={{ color: accent, fontWeight: 700 }}>ENSING CRM</span>
              </div>
            )}
          </div>
        </>) : (
          <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 16 }}>
            <div style={{ fontSize: 48 }}>🌐</div>
            <div style={{ fontSize: 18, fontWeight: 700, color: T.white }}>Crea tu primera landing page</div>
            <Btn onClick={() => setShowNew(true)}><Ico k="plus" size={14} /> Nueva Landing Page</Btn>
          </div>
        )}
      </div>

      {/* New Page Modal */}
      <Modal open={showNew} onClose={() => setShowNew(false)} title="Nueva Landing Page" width={440}>
        <Campo label="Nombre de la Campaña">
          <Inp value={fNew.titulo} onChange={(e) => setFNew((p) => ({ ...p, titulo: e.target.value }))} placeholder="ej. Campaña Black Friday 2026" autoFocus />
        </Campo>
        <Campo label="Slug URL (opcional)">
          <Inp value={fNew.slug} onChange={(e) => setFNew((p) => ({ ...p, slug: e.target.value.toLowerCase().replace(/\s+/g, "-") }))} placeholder="black-friday-2026" />
        </Campo>
        <div style={{ display: "flex", gap: 12, justifyContent: "flex-end", marginTop: 24 }}>
          <Btn variant="secundario" onClick={() => setShowNew(false)}>Cancelar</Btn>
          <Btn onClick={nuevaPagina} disabled={!fNew.titulo.trim()}>Crear Página</Btn>
        </div>
      </Modal>
    </div>
  );
};
