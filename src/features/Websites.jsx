import { useState, useEffect, useRef } from "react";
import { T } from "../theme";
import { uid } from "../utils";
import { Btn, Inp, Modal, Ico, Campo } from "../components/ui";
import { sb } from "../hooks/useSupaState";

const BASE_URL = "https://crm.ensing.lat";

const ALL_BLOCKS = [
  { id: "hero", title: "Hero Section", icon: "star", desc: "Título principal y CTA" },
  { id: "buttons", title: "Botones Personalizados", icon: "link", desc: "Agrega botones con URL" },
  { id: "stats", title: "Estadísticas", icon: "bar-chart", desc: "Números de impacto" },
  { id: "features", title: "Grid de Beneficios", icon: "grid", desc: "Características en columnas" },
  { id: "pricing", title: "Tabla de Precios", icon: "dollar", desc: "Planes con CTA" },
  { id: "testimonials", title: "Testimonios", icon: "user", desc: "Opiniones de clientes" },
  { id: "text", title: "Texto Libre", icon: "file-text", desc: "Agrega párrafos personalizados" },
  { id: "image", title: "Imagen", icon: "image", desc: "Sube o enlaza una imagen" },
  { id: "faq", title: "Preguntas Frecuentes", icon: "help-circle", desc: "FAQ interactivo" },
  { id: "video", title: "Video Embed", icon: "video", desc: "YouTube o Vimeo" },
  { id: "form", title: "Formulario Captura", icon: "template", desc: "Lead capture en vivo" },
  { id: "cta", title: "Llamada a la Acción", icon: "mail", desc: "Banner de conversión final" },
];

const DEFAULT_PAGE = (id, titulo, slug) => ({
  id: id || "p" + uid(),
  slug: slug || "landing-" + Date.now(),
  titulo: titulo || "Nueva Landing Page",
  activo: false,
  blocks: ["hero", "features", "cta"],
  heroTitle: titulo || "Genera más negocios hoy",
  heroSub: "La plataforma líder para captar leads y convertirlos en clientes.",
  heroCTA: "Ver Demo",
  heroCTAUrl: "#form-section",
  heroCTA2: "Ver Precios",
  heroCTA2Url: "#pricing",
  accentColor: "#06B6D4",
  videoUrl: "",
  ctaTitle: "Empieza hoy. Es gratis.",
  ctaSub: "Sin tarjeta de crédito · Configuración en 2 minutos",
  ctaBtn: "Comenzar Ahora",
  ctaBtnUrl: "#form-section",
  customText: "Escribe aquí tu contenido libre o mensaje personalizado...",
  ctaBtnUrl: "#form-section",
  customText: "Escribe aquí tu contenido libre o mensaje personalizado...",
  imageUrl: "",
  buttons: [],
  floatingElements: [],
  faqItems: [
    { q: "¿Cuánto cuesta?", a: "Planes desde $29/mes con 14 días de prueba gratuita." },
    { q: "¿Es fácil de configurar?", a: "En menos de 2 horas puedes tener tu CRM listo." },
  ],
  statsItems: [
    { value: "+500", label: "Clientes Activos" },
    { value: "40%", label: "Más Conversiones" },
    { value: "10h", label: "Ahorradas/Semana" },
    { value: "99.9%", label: "Uptime" },
  ],
  features: [
    { icon: "⚡", title: "Automatizaciones IA", desc: "Automatiza seguimientos y respuestas con IA." },
    { icon: "🎯", title: "Pipeline Visual", desc: "Gestiona oportunidades en tablero Kanban." },
    { icon: "📊", title: "Reportes Reales", desc: "Métricas de ventas actualizadas al instante." },
    { icon: "📱", title: "WhatsApp Integrado", desc: "Chatbot automático conectado al CRM." },
  ],
});

export const Websites = ({ db, setDb }) => {
  const [pages, setPages] = useState([]);
  const [activoId, setActivoId] = useState(null);
  const [panel, setPanel] = useState("sections");
  const [showNew, setShowNew] = useState(false);
  const [fNew, setFNew] = useState({ titulo: "", slug: "" });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [expandedBlock, setExpandedBlock] = useState(null);
  const [dragBlock, setDragBlock] = useState(null);
  const [dragOverBlock, setDragOverBlock] = useState(null);
  const dragRef = useRef(null);

  // Drag floating
  const [activeFl, setActiveFl] = useState(null);
  const [dragFl, setDragFl] = useState(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const canvasRef = useRef(null);

  // ── Load from Supabase ────────────────────────────────────────────────────
  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const { data, error } = await sb.from("landing_pages").select("*").order("created_at", { ascending: true });
      if (data && data.length > 0) {
        const parsed = data.map((p) => ({
          ...DEFAULT_PAGE(p.id, p.titulo, p.slug),
          ...p,
          blocks: Array.isArray(p.blocks) ? p.blocks : JSON.parse(p.blocks || '["hero","features","cta"]'),
          faqItems: Array.isArray(p.faq_items) ? p.faq_items : (p.faqItems || []),
          statsItems: Array.isArray(p.stats_items) ? p.stats_items : (p.statsItems || []),
          features: Array.isArray(p.features) ? p.features : (p.features || []),
          buttons: Array.isArray(p.buttons) ? p.buttons : (p.buttons || []),
          // camelCase mapping from DB snake_case
          heroTitle: p.hero_title || p.heroTitle,
          heroSub: p.hero_sub || p.heroSub,
          heroCTA: p.hero_cta || p.heroCTA,
          heroCTAUrl: p.hero_cta_url || p.heroCTAUrl || "#form-section",
          heroCTA2: p.hero_cta2 || p.heroCTA2,
          heroCTA2Url: p.hero_cta2_url || p.heroCTA2Url || "#pricing",
          accentColor: p.accent_color || p.accentColor || "#06B6D4",
          videoUrl: p.video_url || p.videoUrl || "",
          ctaTitle: p.cta_title || p.ctaTitle || "Empieza hoy. Es gratis.",
          ctaSub: p.cta_sub || p.ctaSub || "Sin tarjeta de crédito · Configuración en 2 minutos",
          ctaBtn: p.cta_btn || p.ctaBtn || "Comenzar Ahora",
          ctaBtnUrl: p.cta_btn_url || p.ctaBtnUrl || "#form-section",
          customText: p.custom_text || p.customText || "Escribe aquí tu contenido libre...",
          imageUrl: p.image_url || p.imageUrl || "",
          floatingElements: Array.isArray(p.floating_elements) ? p.floating_elements : (p.floatingElements || []),
        }));
        setPages(parsed);
        setActivoId(parsed[0].id);
      } else {
        const def = DEFAULT_PAGE("p1", "Campaña Q1 2026", "landing-2026");
        def.activo = true;
        setPages([def]);
        setActivoId(def.id);
      }
      setLoading(false);
    };
    load();
  }, []);

  const activo = pages.find((p) => p.id === activoId) || null;

  const updateActivo = (upd) => {
    setPages((prev) => prev.map((p) => p.id === activoId ? { ...p, ...upd } : p));
  };

  // ── Save to Supabase ──────────────────────────────────────────────────────
  const guardar = async (overrideActivo = null) => {
    const pg = overrideActivo || activo;
    if (!pg) return;
    setSaving(true);
    const payload = {
      id: pg.id,
      slug: pg.slug,
      titulo: pg.titulo,
      activo: pg.activo,
      blocks: pg.blocks || [],
      hero_title: pg.heroTitle || null,
      hero_sub: pg.heroSub || null,
      hero_cta: pg.heroCTA || null,
      hero_cta_url: pg.heroCTAUrl || null,
      hero_cta2: pg.heroCTA2 || null,
      hero_cta2_url: pg.heroCTA2Url || null,
      accent_color: pg.accentColor || "#06B6D4",
      video_url: pg.videoUrl || null,
      cta_title: pg.ctaTitle || null,
      cta_sub: pg.ctaSub || null,
      cta_btn: pg.ctaBtn || null,
      cta_btn_url: pg.ctaBtnUrl || null,
      custom_text: pg.customText || null,
      image_url: pg.imageUrl || null,
      floating_elements: pg.floatingElements || [],
      buttons: pg.buttons || [],
      faq_items: pg.faqItems || [],
      stats_items: pg.statsItems || [],
      features: pg.features || [],
    };
    const { error } = await sb.from("landing_pages").upsert(payload);
    setSaving(false);
    if (error) {
      alert("❌ Error al guardar: " + error.message);
    } else {
      alert(`✅ Landing page guardada!\n\nLink público:\n${BASE_URL}/#/sites/${pg.id}`);
    }
  };

  const nuevaPagina = async () => {
    if (!fNew.titulo.trim()) return;
    const slug = fNew.slug.trim() || fNew.titulo.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
    const np = DEFAULT_PAGE(null, fNew.titulo, slug);
    const { error } = await sb.from("landing_pages").insert({
      id: np.id, slug: np.slug, titulo: np.titulo, activo: false, blocks: np.blocks,
      hero_title: np.heroTitle, hero_sub: np.heroSub, hero_cta: np.heroCTA, accent_color: np.accentColor,
      hero_cta_url: np.heroCTAUrl, hero_cta2: np.heroCTA2, hero_cta2_url: np.heroCTA2Url,
      cta_title: np.ctaTitle, cta_sub: np.ctaSub, cta_btn: np.ctaBtn, cta_btn_url: np.ctaBtnUrl,
      custom_text: np.customText, image_url: np.imageUrl,
      floating_elements: np.floatingElements,
      buttons: np.buttons,
      faq_items: np.faqItems, stats_items: np.statsItems, features: np.features,
    });
    if (!error) {
      setPages((p) => [...p, np]);
      setActivoId(np.id);
    }
    setShowNew(false); setFNew({ titulo: "", slug: "" });
  };

  const eliminarPagina = async (id) => {
    if (!confirm("¿Eliminar esta landing page?")) return;
    await sb.from("landing_pages").delete().eq("id", id);
    const rem = pages.filter((p) => p.id !== id);
    setPages(rem);
    setActivoId(rem[0]?.id || null);
  };

  const toggleBloque = (blockId) => {
    const cur = activo?.blocks || [];
    updateActivo({ blocks: cur.includes(blockId) ? cur.filter((b) => b !== blockId) : [...cur, blockId] });
  };

  // Drag reorder
  const onBlockDragStart = (e, idx) => {
    setDragBlock(idx);
    dragRef.current = e.currentTarget;
    requestAnimationFrame(() => { if (dragRef.current) dragRef.current.style.opacity = "0.4"; });
  };
  const onBlockDragEnd = () => {
    if (dragBlock !== null && dragOverBlock !== null && dragBlock !== dragOverBlock) {
      const arr = [...(activo?.blocks || [])];
      const [r] = arr.splice(dragBlock, 1);
      arr.splice(dragOverBlock, 0, r);
      updateActivo({ blocks: arr });
    }
    if (dragRef.current) dragRef.current.style.opacity = "1";
    setDragBlock(null); setDragOverBlock(null); dragRef.current = null;
  };
  const moveBlock = (idx, dir) => {
    const arr = [...(activo?.blocks || [])];
    const t = idx + dir;
    if (t < 0 || t >= arr.length) return;
    [arr[idx], arr[t]] = [arr[t], arr[idx]];
    updateActivo({ blocks: arr });
  };

  const onFlDown = (e, id) => {
    e.stopPropagation();
    setActiveFl(id);
    setDragFl(id);
    const rect = e.currentTarget.getBoundingClientRect();
    setDragOffset({ x: e.clientX - rect.left, y: e.clientY - rect.top });
  };
  const handleCanvasMove = (e) => {
    if (!dragFl || !canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left - dragOffset.x + canvasRef.current.scrollLeft;
    const y = e.clientY - rect.top - dragOffset.y + canvasRef.current.scrollTop;
    updateActivo({
      floatingElements: activo.floatingElements.map((f) => f.id === dragFl ? { ...f, x, y } : f)
    });
  };
  const handleCanvasUp = () => setDragFl(null);

  const copyLink = (pg) => {
    const url = `${BASE_URL}/#/sites/${pg.id}`;
    navigator.clipboard?.writeText(url);
    alert(`✅ Link copiado!\n\n${url}\n\nCualquier persona puede abrirlo sin login.`);
  };

  // Inline editors per block type
  const renderBlockEditor = (blockId) => {
    if (!activo) return null;
    const upd = (k, v) => updateActivo({ [k]: v });
    const updArr = (arrKey, idx, partial) => {
      const arr = [...(activo[arrKey] || [])];
      arr[idx] = { ...arr[idx], ...partial };
      updateActivo({ [arrKey]: arr });
    };
    const rmArr = (arrKey, idx) => updateActivo({ [arrKey]: (activo[arrKey] || []).filter((_, i) => i !== idx) });
    const addArr = (arrKey, item) => updateActivo({ [arrKey]: [...(activo[arrKey] || []), item] });

    const base = { padding: 12, background: T.bg1, borderRadius: "0 0 8px 8px", borderTop: `1px solid ${T.borderHi}`, display: "flex", flexDirection: "column", gap: 8 };

    switch (blockId) {
      case "hero": return (
        <div style={base}>
          <IE label="Título" value={activo.heroTitle || ""} onChange={(v) => upd("heroTitle", v)} />
          <IE label="Subtítulo" value={activo.heroSub || ""} onChange={(v) => upd("heroSub", v)} />
          <div style={{ borderTop: `1px dashed ${T.borderHi}`, paddingTop: 8, marginTop: 4 }}>
            <div style={{ fontSize: 10, color: T.whiteDim, marginBottom: 6, fontWeight: 700 }}>BOTÓN 1</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
              <IE label="Texto" value={activo.heroCTA || ""} onChange={(v) => upd("heroCTA", v)} />
              <IE label="URL / Link" value={activo.heroCTAUrl || ""} onChange={(v) => upd("heroCTAUrl", v)} placeholder="https://... o #seccion" />
            </div>
          </div>
          <div style={{ borderTop: `1px dashed ${T.borderHi}`, paddingTop: 8, marginTop: 4 }}>
            <div style={{ fontSize: 10, color: T.whiteDim, marginBottom: 6, fontWeight: 700 }}>BOTÓN 2 (opcional)</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
              <IE label="Texto" value={activo.heroCTA2 || ""} onChange={(v) => upd("heroCTA2", v)} />
              <IE label="URL / Link" value={activo.heroCTA2Url || ""} onChange={(v) => upd("heroCTA2Url", v)} placeholder="https://... o #seccion" />
            </div>
          </div>
        </div>
      );
      case "cta": return (
        <div style={base}>
          <IE label="Título" value={activo.ctaTitle || ""} onChange={(v) => upd("ctaTitle", v)} />
          <IE label="Subtítulo" value={activo.ctaSub || ""} onChange={(v) => upd("ctaSub", v)} />
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
            <IE label="Texto del Botón" value={activo.ctaBtn || ""} onChange={(v) => upd("ctaBtn", v)} />
            <IE label="URL del Botón" value={activo.ctaBtnUrl || ""} onChange={(v) => upd("ctaBtnUrl", v)} placeholder="https://... o #seccion" />
          </div>
        </div>
      );
      case "text": return (
        <div style={base}>
          <div style={{ fontSize: 10, color: T.whiteDim, marginBottom: 4 }}>Contenido de texto (puedes usar salto de línea)</div>
          <textarea value={activo.customText || ""} onChange={(e) => upd("customText", e.target.value)} rows={6} style={{ padding: "8px 10px", background: T.bg2, border: `1px solid ${T.borderHi}`, borderRadius: 6, color: T.white, fontSize: 12, fontFamily: "inherit", resize: "vertical", outline: "none" }} placeholder="Escribe tu texto..." />
        </div>
      );
      case "image": return (
        <div style={base}>
          <IE label="URL de la Imagen" value={activo.imageUrl || ""} onChange={(v) => upd("imageUrl", v)} placeholder="https://ejemplo.com/imagen.jpg" />
        </div>
      );
      case "buttons": return (
        <div style={base}>
          <div style={{ fontSize: 10, color: T.whiteDim, marginBottom: 4 }}>Agrega botones personalizados. Cada uno tiene su URL.</div>
          {(activo.buttons || []).map((btn, i) => (
            <div key={i} style={{ background: T.bg2, borderRadius: 8, padding: 10, display: "flex", flexDirection: "column", gap: 6, border: `1px solid ${T.borderHi}` }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr auto", gap: 6, alignItems: "end" }}>
                <IE label="Texto del botón" value={btn.label} onChange={(v) => updArr("buttons", i, { label: v })} placeholder="Ej: Contáctanos" />
                <IE label="URL" value={btn.url} onChange={(v) => updArr("buttons", i, { url: v })} placeholder="https://... o #form-section" />
                <button onClick={() => rmArr("buttons", i)} style={delBtn}>✕</button>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
                <div>
                  <div style={{ fontSize: 10, color: T.whiteDim, marginBottom: 3 }}>Color fondo</div>
                  <input type="color" value={btn.bg || activo.accentColor || "#06B6D4"} onChange={(e) => updArr("buttons", i, { bg: e.target.value })} style={{ width: "100%", height: 30, border: "none", borderRadius: 6, cursor: "pointer" }} />
                </div>
                <div>
                  <div style={{ fontSize: 10, color: T.whiteDim, marginBottom: 3 }}>Estilo</div>
                  <select value={btn.variant || "solid"} onChange={(e) => updArr("buttons", i, { variant: e.target.value })} style={{ width: "100%", height: 30, background: T.bg1, border: `1px solid ${T.borderHi}`, borderRadius: 6, color: T.white, padding: "0 8px", fontSize: 11 }}>
                    <option value="solid">Relleno</option>
                    <option value="outline">Contorno</option>
                    <option value="ghost">Fantasma</option>
                  </select>
                </div>
              </div>
            </div>
          ))}
          <button onClick={() => addArr("buttons", { label: "Nuevo Botón", url: "https://", bg: activo.accentColor || "#06B6D4", variant: "solid" })} style={addBtn}>+ Agregar Botón</button>
        </div>
      );
      case "video": return (
        <div style={base}>
          <IE label="URL Embed (YouTube/Vimeo)" value={activo.videoUrl || ""} onChange={(v) => upd("videoUrl", v)} placeholder="https://www.youtube.com/embed/VIDEO_ID" />
        </div>
      );
      case "faq": return (
        <div style={base}>
          {(activo.faqItems || []).map((item, i) => (
            <div key={i} style={{ background: T.bg2, borderRadius: 8, padding: 10, display: "flex", flexDirection: "column", gap: 6 }}>
              <Inp value={item.q} onChange={(e) => updArr("faqItems", i, { q: e.target.value })} placeholder="Pregunta..." style={{ fontSize: 12 }} />
              <textarea value={item.a} onChange={(e) => updArr("faqItems", i, { a: e.target.value })} rows={2} placeholder="Respuesta..." style={{ padding: "7px 10px", background: T.bg1, border: `1px solid ${T.borderHi}`, borderRadius: 6, color: T.white, fontSize: 12, fontFamily: "inherit", resize: "vertical", outline: "none" }} />
              <button onClick={() => rmArr("faqItems", i)} style={delBtn}>✕ Eliminar</button>
            </div>
          ))}
          <button onClick={() => addArr("faqItems", { q: "Nueva pregunta", a: "Respuesta aquí" })} style={addBtn}>+ Añadir pregunta</button>
        </div>
      );
      case "stats": return (
        <div style={base}>
          {(activo.statsItems || []).map((s, i) => (
            <div key={i} style={{ display: "grid", gridTemplateColumns: "1fr 2fr auto", gap: 6, alignItems: "center" }}>
              <Inp value={s.value} onChange={(e) => updArr("statsItems", i, { value: e.target.value })} placeholder="+500" style={{ fontSize: 12 }} />
              <Inp value={s.label} onChange={(e) => updArr("statsItems", i, { label: e.target.value })} placeholder="Clientes activos" style={{ fontSize: 12 }} />
              <button onClick={() => rmArr("statsItems", i)} style={delBtn}>✕</button>
            </div>
          ))}
          <button onClick={() => addArr("statsItems", { value: "100+", label: "Nuevo stat" })} style={addBtn}>+ Añadir stat</button>
        </div>
      );
      case "features": return (
        <div style={base}>
          {(activo.features || []).map((f, i) => (
            <div key={i} style={{ background: T.bg2, borderRadius: 8, padding: 10, display: "flex", flexDirection: "column", gap: 6 }}>
              <div style={{ display: "grid", gridTemplateColumns: "50px 1fr 1fr", gap: 6 }}>
                <Inp value={f.icon} onChange={(e) => updArr("features", i, { icon: e.target.value })} placeholder="⚡" style={{ fontSize: 20, textAlign: "center" }} />
                <Inp value={f.title} onChange={(e) => updArr("features", i, { title: e.target.value })} placeholder="Título" style={{ fontSize: 12 }} />
                <button onClick={() => rmArr("features", i)} style={delBtn}>✕</button>
              </div>
              <textarea value={f.desc} onChange={(e) => updArr("features", i, { desc: e.target.value })} rows={2} placeholder="Descripción..." style={{ padding: "7px 10px", background: T.bg1, border: `1px solid ${T.borderHi}`, borderRadius: 6, color: T.white, fontSize: 12, fontFamily: "inherit", resize: "vertical", outline: "none" }} />
            </div>
          ))}
          <button onClick={() => addArr("features", { icon: "⭐", title: "Nueva función", desc: "Describir beneficio." })} style={addBtn}>+ Añadir característica</button>
        </div>
      );
      default: return null;
    }
  };

  const accent = activo?.accentColor || "#06B6D4";

  if (loading) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", gap: 16, color: T.whiteDim }}>
      <div style={{ width: 24, height: 24, border: `2px solid ${T.tealSoft}`, borderTopColor: T.teal, borderRadius: "50%", animation: "spin 1s linear infinite" }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      Cargando páginas...
    </div>
  );

  return (
    <div style={{ display: "flex", height: "calc(100vh - 120px)", overflow: "hidden" }}>
      {/* ── SIDEBAR ── */}
      <div style={{ width: 340, display: "flex", flexDirection: "column", borderRight: `1px solid ${T.borderHi}`, flexShrink: 0, overflow: "hidden" }}>
        {/* Header + page list */}
        <div style={{ padding: "12px 14px", borderBottom: `1px solid ${T.borderHi}`, flexShrink: 0 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
            <div style={{ fontSize: 15, fontWeight: 800, color: T.white }}>🌐 Landing Pages</div>
            <Btn size="sm" onClick={() => setShowNew(true)}><Ico k="plus" size={12} /> Nueva</Btn>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
            {pages.map((p) => (
              <div key={p.id} onClick={() => setActivoId(p.id)} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 10px", background: activoId === p.id ? T.tealSoft : T.bg2, border: `1px solid ${activoId === p.id ? T.teal : T.borderHi}`, borderRadius: 8, cursor: "pointer", transition: "all .1s" }}>
                <div style={{ overflow: "hidden" }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: activoId === p.id ? T.teal : T.white, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.titulo}</div>
                  <div style={{ fontSize: 10, color: T.whiteDim, fontFamily: "monospace" }}>/{p.slug}</div>
                </div>
                <div style={{ display: "flex", gap: 5, alignItems: "center", flexShrink: 0, marginLeft: 8 }}>
                  <div style={{ width: 7, height: 7, borderRadius: "50%", background: p.activo ? T.green : T.whiteDim }} title={p.activo ? "Live" : "Sin publicar"} />
                  <button onClick={(e) => { e.stopPropagation(); copyLink(p); }} style={{ ...smBtn }}>🔗</button>
                  <button onClick={(e) => { e.stopPropagation(); eliminarPagina(p.id); }} style={{ ...smBtn, color: T.red }}>🗑</button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {activo && (<>
          {/* Tabs */}
          <div style={{ display: "flex", borderBottom: `1px solid ${T.borderHi}`, flexShrink: 0, flexWrap: "wrap" }}>
            {[["sections", "Secciones"], ["free", "Libre"], ["edit", "Hero+CTA"], ["design", "Diseño"]].map(([k, lbl]) => (
              <button key={k} onClick={() => setPanel(k)} style={{ flex: "1 1 auto", padding: "8px 0", background: "transparent", border: "none", color: panel === k ? T.teal : T.whiteDim, fontWeight: panel === k ? 700 : 400, fontSize: 11, cursor: "pointer", borderBottom: `2px solid ${panel === k ? T.teal : "transparent"}` }}>
                {lbl}
              </button>
            ))}
          </div>

          <div style={{ flex: 1, overflowY: "auto", padding: 12 }}>
            {/* SECCIONES */}
            {panel === "sections" && (
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <div style={{ fontSize: 10, color: T.whiteDim, textAlign: "center", marginBottom: 4 }}>Arrastra ⠿ para reordenar</div>

                {/* Active blocks */}
                {(activo.blocks || []).map((blockId, idx) => {
                  const def = ALL_BLOCKS.find((b) => b.id === blockId);
                  if (!def) return null;
                  const isExp = expandedBlock === blockId;
                  return (
                    <div key={blockId} draggable onDragStart={(e) => onBlockDragStart(e, idx)} onDragEnter={() => setDragOverBlock(idx)} onDragEnd={onBlockDragEnd} onDragOver={(e) => e.preventDefault()}>
                      <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 10px", background: dragOverBlock === idx ? T.tealSoft : T.tealSoft, border: `1px solid ${T.teal}`, borderRadius: isExp ? "8px 8px 0 0" : 8, cursor: "grab", transition: "all .1s" }}>
                        <span style={{ color: T.whiteDim, userSelect: "none", fontSize: 14 }}>⠿</span>
                        <Ico k={def.icon} size={12} style={{ color: T.teal, flexShrink: 0 }} />
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: 11, fontWeight: 700, color: T.teal }}>{def.title}</div>
                        </div>
                        <div style={{ display: "flex", gap: 3, flexShrink: 0 }}>
                          <button onClick={() => moveBlock(idx, -1)} disabled={idx === 0} style={smBtn}>↑</button>
                          <button onClick={() => moveBlock(idx, 1)} disabled={idx === (activo.blocks || []).length - 1} style={smBtn}>↓</button>
                          <button onClick={() => setExpandedBlock(isExp ? null : blockId)} style={{ ...smBtn, background: isExp ? T.teal : "transparent", color: isExp ? "#000" : T.teal, border: `1px solid ${T.teal}` }}>✏️</button>
                          <button onClick={() => toggleBloque(blockId)} style={{ ...smBtn, color: T.red, borderColor: T.red + "40" }}>✕</button>
                        </div>
                      </div>
                      {isExp && renderBlockEditor(blockId)}
                    </div>
                  );
                })}

                <div style={{ fontSize: 10, color: T.whiteDim, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".1em", marginTop: 10, marginBottom: 4 }}>+ Agregar Sección</div>
                {ALL_BLOCKS.filter((b) => !(activo.blocks || []).includes(b.id)).map((b) => (
                  <div key={b.id} onClick={() => toggleBloque(b.id)} style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 10px", background: T.bg2, border: `1px solid ${T.borderHi}`, borderRadius: 8, cursor: "pointer", transition: "all .1s" }}>
                    <Ico k={b.icon} size={12} style={{ color: T.whiteDim }} />
                    <div style={{ flex: 1, fontSize: 12, fontWeight: 600, color: T.white }}>{b.title}</div>
                    <span style={{ color: T.teal, fontSize: 16, fontWeight: 300 }}>+</span>
                  </div>
                ))}
              </div>
            )}

            {/* LIBRE (Elementos flotantes) */}
            {panel === "free" && (
              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 6 }}>
                  <Btn size="sm" variant="secundario" onClick={() => updateActivo({ floatingElements: [...(activo.floatingElements || []), { id: uid(), type: "text", content: "Texto Libre", x: 100, y: 100, fontSize: 16, color: "#111827", fontWeight: "normal" }] })}>+ Texto</Btn>
                  <Btn size="sm" variant="secundario" onClick={() => updateActivo({ floatingElements: [...(activo.floatingElements || []), { id: uid(), type: "image", content: "https://via.placeholder.com/150", width: 150, x: 150, y: 150 }] })}>+ Imagen</Btn>
                  <Btn size="sm" variant="secundario" onClick={() => updateActivo({ floatingElements: [...(activo.floatingElements || []), { id: uid(), type: "button", content: "Botón", url: "#", x: 200, y: 200, bg: activo.accentColor || "#06B6D4" }] })}>+ Botón</Btn>
                </div>
                {(activo.floatingElements || []).length > 0 && <div style={{ fontSize: 10, color: T.whiteDim }}>Arrastra los elementos directamente en la vista derecha ➡️</div>}
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {(activo.floatingElements || []).map((f) => (
                    <div key={f.id} onClick={() => setActiveFl(f.id)} style={{ padding: 10, background: activeFl === f.id ? T.tealSoft : T.bg2, border: `1px solid ${activeFl === f.id ? T.teal : T.borderHi}`, borderRadius: 8 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                        <div style={{ fontSize: 11, fontWeight: 700, color: T.white }}>{f.type === "text" ? "✍️ Texto" : f.type === "image" ? "🖼️ Imagen" : "🔗 Botón"}</div>
                        <button onClick={(e) => { e.stopPropagation(); updateActivo({ floatingElements: activo.floatingElements.filter(x => x.id !== f.id) }) }} style={delBtn}>Eliminar</button>
                      </div>

                      {f.type === "text" && (
                        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                          <textarea value={f.content} onChange={(e) => updateActivo({ floatingElements: activo.floatingElements.map(x => x.id === f.id ? { ...x, content: e.target.value } : x) })} rows={2} style={{ width: "100%", padding: "6px", background: T.bg1, border: `1px solid ${T.borderHi}`, color: T.white, borderRadius: 4, outline: "none", fontSize: 12, resize: "vertical" }} />
                          <div style={{ display: "flex", gap: 6 }}>
                            <input type="number" value={f.fontSize || 16} onChange={(e) => updateActivo({ floatingElements: activo.floatingElements.map(x => x.id === f.id ? { ...x, fontSize: Number(e.target.value) } : x) })} placeholder="Tam." style={{ width: 50, padding: 4, background: T.bg1, border: `1px solid ${T.borderHi}`, color: T.white, borderRadius: 4, fontSize: 11 }} />
                            <input type="color" value={f.color || "#111827"} onChange={(e) => updateActivo({ floatingElements: activo.floatingElements.map(x => x.id === f.id ? { ...x, color: e.target.value } : x) })} style={{ width: 30, height: 26, border: "none", cursor: "pointer" }} />
                            <select value={f.fontWeight} onChange={(e) => updateActivo({ floatingElements: activo.floatingElements.map(x => x.id === f.id ? { ...x, fontWeight: e.target.value } : x) })} style={{ flex: 1, padding: 4, background: T.bg1, border: `1px solid ${T.borderHi}`, color: T.white, borderRadius: 4, fontSize: 11 }}>
                              <option value="normal">Normal</option>
                              <option value="bold">Bold</option>
                              <option value="900">Heavy</option>
                            </select>
                          </div>
                        </div>
                      )}
                      {f.type === "image" && (
                        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                          <input type="text" value={f.content} onChange={(e) => updateActivo({ floatingElements: activo.floatingElements.map(x => x.id === f.id ? { ...x, content: e.target.value } : x) })} placeholder="URL de la imagen" style={{ width: "100%", padding: "6px", background: T.bg1, border: `1px solid ${T.borderHi}`, color: T.white, borderRadius: 4, outline: "none", fontSize: 12 }} />
                          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                            <span style={{ fontSize: 10, color: T.whiteDim }}>Ancho:</span>
                            <input type="number" value={f.width || 150} onChange={(e) => updateActivo({ floatingElements: activo.floatingElements.map(x => x.id === f.id ? { ...x, width: Number(e.target.value) } : x) })} placeholder="Ancho (px)" style={{ width: 60, padding: 4, background: T.bg1, border: `1px solid ${T.borderHi}`, color: T.white, borderRadius: 4, fontSize: 11 }} />
                          </div>
                        </div>
                      )}
                      {f.type === "button" && (
                        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                          <input type="text" value={f.content} onChange={(e) => updateActivo({ floatingElements: activo.floatingElements.map(x => x.id === f.id ? { ...x, content: e.target.value } : x) })} placeholder="Texto" style={{ width: "100%", padding: "6px", background: T.bg1, border: `1px solid ${T.borderHi}`, color: T.white, borderRadius: 4, outline: "none", fontSize: 12 }} />
                          <input type="text" value={f.url} onChange={(e) => updateActivo({ floatingElements: activo.floatingElements.map(x => x.id === f.id ? { ...x, url: e.target.value } : x) })} placeholder="URL destino" style={{ width: "100%", padding: "6px", background: T.bg1, border: `1px solid ${T.borderHi}`, color: T.white, borderRadius: 4, outline: "none", fontSize: 12 }} />
                          <input type="color" value={f.bg || activo.accentColor || "#06B6D4"} onChange={(e) => updateActivo({ floatingElements: activo.floatingElements.map(x => x.id === f.id ? { ...x, bg: e.target.value } : x) })} style={{ width: 30, height: 26, border: "none", cursor: "pointer" }} />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* EDITAR */}
            {panel === "edit" && (
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                <IE label="Nombre de campaña" value={activo.titulo} onChange={(v) => updateActivo({ titulo: v })} />
                <IE label="Slug URL" value={activo.slug} onChange={(v) => updateActivo({ slug: v.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "") })} />
                <div style={{ borderTop: `1px solid ${T.borderHi}`, paddingTop: 10, marginTop: 4 }}>
                  <div style={{ fontSize: 10, fontWeight: 700, color: T.whiteDim, marginBottom: 8, textTransform: "uppercase" }}>Hero</div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    <IE label="Título Hero" value={activo.heroTitle || ""} onChange={(v) => updateActivo({ heroTitle: v })} />
                    <IE label="Subtítulo" value={activo.heroSub || ""} onChange={(v) => updateActivo({ heroSub: v })} />
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                      <IE label="Botón 1 Texto" value={activo.heroCTA || ""} onChange={(v) => updateActivo({ heroCTA: v })} />
                      <IE label="Botón 1 URL" value={activo.heroCTAUrl || ""} onChange={(v) => updateActivo({ heroCTAUrl: v })} placeholder="https:// o #seccion" />
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                      <IE label="Botón 2 Texto" value={activo.heroCTA2 || ""} onChange={(v) => updateActivo({ heroCTA2: v })} />
                      <IE label="Botón 2 URL" value={activo.heroCTA2Url || ""} onChange={(v) => updateActivo({ heroCTA2Url: v })} placeholder="https:// o #seccion" />
                    </div>
                  </div>
                </div>
                <div style={{ borderTop: `1px solid ${T.borderHi}`, paddingTop: 10 }}>
                  <div style={{ fontSize: 10, fontWeight: 700, color: T.whiteDim, marginBottom: 8, textTransform: "uppercase" }}>Sección CTA (Banner Final)</div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    <IE label="Título" value={activo.ctaTitle || ""} onChange={(v) => updateActivo({ ctaTitle: v })} />
                    <IE label="Subtítulo" value={activo.ctaSub || ""} onChange={(v) => updateActivo({ ctaSub: v })} />
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                      <IE label="Texto Botón" value={activo.ctaBtn || ""} onChange={(v) => updateActivo({ ctaBtn: v })} />
                      <IE label="URL Botón" value={activo.ctaBtnUrl || ""} onChange={(v) => updateActivo({ ctaBtnUrl: v })} placeholder="https:// o #seccion" />
                    </div>
                  </div>
                </div>
                <IE label="URL Video (embed)" value={activo.videoUrl || ""} onChange={(v) => updateActivo({ videoUrl: v })} placeholder="https://www.youtube.com/embed/ID" />
              </div>
            )}

            {/* DISEÑO */}
            {panel === "design" && (
              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                <div>
                  <div style={{ fontSize: 10, color: T.whiteDim, marginBottom: 6 }}>Color Principal</div>
                  <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                    <input type="color" value={activo.accentColor || "#06B6D4"} onChange={(e) => updateActivo({ accentColor: e.target.value })} style={{ width: 38, height: 34, border: "none", borderRadius: 6, cursor: "pointer", background: "transparent" }} />
                    <span style={{ fontSize: 12, color: T.whiteDim, fontFamily: "monospace" }}>{activo.accentColor}</span>
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: 10, color: T.whiteDim, marginBottom: 6 }}>Paleta Rápida</div>
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                    {["#06B6D4", "#8B5CF6", "#10B981", "#F59E0B", "#EF4444", "#EC4899", "#3B82F6", "#111827"].map((c) => (
                      <button key={c} onClick={() => updateActivo({ accentColor: c })} style={{ width: 26, height: 26, borderRadius: "50%", background: c, border: activo.accentColor === c ? "3px solid #fff" : "2px solid transparent", cursor: "pointer" }} />
                    ))}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: 10, color: T.whiteDim, marginBottom: 6 }}>Link Público</div>
                  <div style={{ padding: "9px 10px", background: T.bg2, borderRadius: 8, fontFamily: "monospace", fontSize: 11, color: T.teal, wordBreak: "break-all", marginBottom: 6 }}>
                    {BASE_URL}/#/sites/{activo.id}
                  </div>
                  <div style={{ display: "flex", gap: 6 }}>
                    <Btn variant="secundario" size="sm" onClick={() => copyLink(activo)} style={{ flex: 1 }}>Copiar</Btn>
                    <Btn variant="secundario" size="sm" onClick={() => window.open(`${BASE_URL}/#/sites/${activo.id}`, "_blank")} style={{ flex: 1 }}>Abrir ↗</Btn>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Save bar */}
          <div style={{ padding: "10px 14px", borderTop: `1px solid ${T.borderHi}`, flexShrink: 0, display: "flex", gap: 8 }}>
            <Btn onClick={() => guardar()} disabled={saving} style={{ flex: 1, background: T.teal, color: "#000" }}>
              {saving ? "Guardando..." : "💾 Guardar"}
            </Btn>
            <Btn variant="secundario" onClick={async () => {
              const nuevoEstado = { ...activo, activo: !activo.activo };
              updateActivo({ activo: !activo.activo });
              await guardar(nuevoEstado);
            }} style={{ fontSize: 12, background: activo.activo ? T.green + "22" : "transparent", color: activo.activo ? T.green : T.whiteDim, border: `1px solid ${activo.activo ? T.green : T.borderHi}` }}>
              {activo.activo ? "● LIVE" : "Publicar"}
            </Btn>
          </div>
        </>)}
      </div>

      {/* ── CANVAS ── */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
        {activo ? (<>
          {/* Address bar */}
          <div style={{ height: 40, background: T.bg1, borderBottom: `1px solid ${T.borderHi}`, display: "flex", alignItems: "center", padding: "0 14px", gap: 8, flexShrink: 0 }}>
            <div style={{ display: "flex", gap: 5 }}>{["#EF4444", "#F59E0B", "#10B981"].map((c, i) => <div key={i} style={{ width: 10, height: 10, borderRadius: "50%", background: c }} />)}</div>
            <div style={{ flex: 1, background: T.bg2, height: 24, borderRadius: 6, display: "flex", alignItems: "center", padding: "0 10px", fontSize: 10, color: T.whiteDim, maxWidth: 380, margin: "0 auto", gap: 4, border: `1px solid ${T.borderHi}` }}>
              <Ico k="lock" size={8} /> {BASE_URL}/#/sites/{activo.slug}
            </div>
            <Btn size="sm" onClick={() => copyLink(activo)} style={{ fontSize: 10 }}>🔗 Link</Btn>
            <Btn size="sm" onClick={() => window.open(`${BASE_URL}/#/sites/${activo.id}`, "_blank")} style={{ fontSize: 10 }}>↗ Ver</Btn>
          </div>

          {/* Scrollable canvas */}
          <div ref={canvasRef} onMouseMove={handleCanvasMove} onMouseUp={handleCanvasUp} onMouseLeave={handleCanvasUp} style={{ flex: 1, overflowY: "auto", background: "#fff", position: "relative" }}>
            {(!activo.blocks || activo.blocks.length === 0) && (
              <div style={{ height: "100%", display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 12, color: "#9CA3AF" }}>
                <div style={{ fontSize: 40 }}>📄</div>
                <div style={{ fontSize: 14, fontWeight: 600 }}>Activa secciones desde el panel izquierdo</div>
              </div>
            )}

            {(activo.blocks || []).map((blockId) => {
              switch (blockId) {
                case "hero":
                  return (
                    <div key="hero" style={{ padding: "80px 24px", textAlign: "center", background: `linear-gradient(180deg, ${accent}0D 0%, #fff 100%)`, borderBottom: "1px solid #E5E7EB" }}>
                      <div style={{ display: "inline-block", background: accent + "18", color: accent, padding: "5px 16px", borderRadius: 20, fontSize: 11, fontWeight: 700, marginBottom: 20, border: `1px solid ${accent}33`, textTransform: "uppercase", letterSpacing: ".08em" }}>🚀 Plataforma CRM #1</div>
                      <h1 style={{ fontSize: "clamp(30px, 5vw, 54px)", fontWeight: 900, color: "#111827", margin: "0 0 16px", letterSpacing: "-.04em", lineHeight: 1.08, maxWidth: 700, marginInline: "auto" }}>{activo.heroTitle || "Genera más negocios hoy"}</h1>
                      <p style={{ fontSize: 17, color: "#6B7280", margin: "0 auto 32px", maxWidth: 540, lineHeight: 1.7 }}>{activo.heroSub || "La plataforma líder para captar leads."}</p>
                      <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
                        {activo.heroCTA && <a href={activo.heroCTAUrl || "#"} target={activo.heroCTAUrl?.startsWith("http") ? "_blank" : undefined} rel="noopener noreferrer" style={{ background: accent, color: "#fff", border: "none", padding: "14px 28px", borderRadius: 12, fontSize: 15, fontWeight: 700, cursor: "pointer", boxShadow: `0 8px 24px ${accent}44`, textDecoration: "none", display: "inline-block" }}>{activo.heroCTA}</a>}
                        {activo.heroCTA2 && <a href={activo.heroCTA2Url || "#"} target={activo.heroCTA2Url?.startsWith("http") ? "_blank" : undefined} rel="noopener noreferrer" style={{ background: "#F3F4F6", color: "#374151", border: "none", padding: "14px 26px", borderRadius: 12, fontSize: 15, fontWeight: 700, cursor: "pointer", textDecoration: "none", display: "inline-block" }}>{activo.heroCTA2} →</a>}
                      </div>
                    </div>
                  );
                case "stats":
                  return (
                    <div key="stats" style={{ padding: "50px 24px", background: accent }}>
                      <div style={{ display: "grid", gridTemplateColumns: `repeat(${Math.min((activo.statsItems || []).length, 4)}, 1fr)`, gap: 24, maxWidth: 900, margin: "0 auto", textAlign: "center" }}>
                        {(activo.statsItems || []).map((s, i) => (
                          <div key={i}><div style={{ fontSize: 34, fontWeight: 900, color: "#fff" }}>{s.value}</div><div style={{ fontSize: 13, color: "rgba(255,255,255,.8)", marginTop: 4 }}>{s.label}</div></div>
                        ))}
                      </div>
                    </div>
                  );
                case "features":
                  return (
                    <div key="features" style={{ padding: "70px 24px", background: "#F9FAFB" }}>
                      <h2 style={{ fontSize: 28, fontWeight: 800, color: "#111827", textAlign: "center", margin: "0 0 40px" }}>Todo lo que necesitas</h2>
                      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 20, maxWidth: 900, margin: "0 auto" }}>
                        {(activo.features || []).map((f, i) => (
                          <div key={i} style={{ background: "#fff", padding: 24, borderRadius: 14, border: "1px solid #E5E7EB" }}>
                            <div style={{ width: 42, height: 42, borderRadius: 12, background: accent + "18", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, marginBottom: 14 }}>{f.icon}</div>
                            <h3 style={{ fontSize: 14, fontWeight: 800, margin: "0 0 8px", color: "#111827" }}>{f.title}</h3>
                            <p style={{ fontSize: 13, color: "#6B7280", margin: 0, lineHeight: 1.6 }}>{f.desc}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                case "pricing":
                  return (
                    <div key="pricing" style={{ padding: "70px 24px", textAlign: "center" }}>
                      <h2 style={{ fontSize: 28, fontWeight: 800, color: "#111827", margin: "0 0 40px" }}>Planes simples y transparentes</h2>
                      <div style={{ display: "flex", gap: 20, justifyContent: "center", flexWrap: "wrap" }}>
                        {[{ p: "Starter", price: "$29", f: ["5 usuarios", "1 pipeline", "Email básico"], h: false },
                        { p: "Pro", price: "$79", f: ["25 usuarios", "Pipelines ilimitados", "IA & Automations", "API Access"], h: true },
                        { p: "Enterprise", price: "Custom", f: ["Usuarios ilimitados", "SSO", "SLA 99.9%"], h: false }].map((pl, i) => (
                          <div key={i} style={{ background: pl.h ? accent : "#fff", padding: 28, borderRadius: 16, border: `2px solid ${pl.h ? "transparent" : "#E5E7EB"}`, width: 200, boxShadow: pl.h ? `0 10px 30px ${accent}40` : "none" }}>
                            <div style={{ fontSize: 12, fontWeight: 700, color: pl.h ? "rgba(255,255,255,.8)" : "#6B7280", marginBottom: 8 }}>{pl.p}</div>
                            <div style={{ fontSize: 32, fontWeight: 900, color: pl.h ? "#fff" : "#111827", marginBottom: 14 }}>{pl.price}</div>
                            {pl.f.map((feat, j) => <div key={j} style={{ fontSize: 12, color: pl.h ? "rgba(255,255,255,.85)" : "#374151", marginBottom: 5 }}>✓ {feat}</div>)}
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                case "testimonials":
                  return (
                    <div key="testimonials" style={{ padding: "70px 24px", background: "#F9FAFB" }}>
                      <h2 style={{ fontSize: 28, fontWeight: 800, color: "#111827", textAlign: "center", margin: "0 0 40px" }}>Lo que dicen nuestros clientes</h2>
                      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 20, maxWidth: 900, margin: "0 auto" }}>
                        {[{ n: "María G.", c: "TechCorp", t: "Incrementamos las ventas en 40%." }, { n: "Carlos R.", c: "Startup SL", t: "Ahorramos 10h semanales con la IA." }, { n: "Ana P.", c: "AgenciaX", t: "El mejor CRM en 5 años de trabajo." }].map((t, i) => (
                          <div key={i} style={{ background: "#fff", padding: 22, borderRadius: 14, border: "1px solid #E5E7EB" }}>
                            <div style={{ fontSize: 16, marginBottom: 10 }}>⭐⭐⭐⭐⭐</div>
                            <p style={{ fontSize: 13, color: "#374151", lineHeight: 1.7, margin: "0 0 14px", fontStyle: "italic" }}>"{t.t}"</p>
                            <div style={{ fontSize: 12, fontWeight: 700, color: "#111827" }}>{t.n} · <span style={{ color: "#6B7280", fontWeight: 400 }}>{t.c}</span></div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                case "faq":
                  return (
                    <div key="faq" style={{ padding: "70px 24px" }}>
                      <h2 style={{ fontSize: 28, fontWeight: 800, color: "#111827", textAlign: "center", margin: "0 0 40px" }}>Preguntas Frecuentes</h2>
                      <div style={{ maxWidth: 680, margin: "0 auto", display: "flex", flexDirection: "column", gap: 12 }}>
                        {(activo.faqItems || []).map((item, i) => (
                          <div key={i} style={{ background: "#F9FAFB", padding: "18px 22px", borderRadius: 12, border: "1px solid #E5E7EB" }}>
                            <div style={{ fontWeight: 700, fontSize: 14, color: "#111827", marginBottom: 8 }}>❓ {item.q}</div>
                            <div style={{ fontSize: 13, color: "#6B7280", lineHeight: 1.7 }}>{item.a}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                case "video":
                  return activo.videoUrl ? (
                    <div key="video" style={{ padding: "60px 24px", background: "#111827", textAlign: "center" }}>
                      <h2 style={{ fontSize: 26, fontWeight: 800, color: "#fff", margin: "0 0 30px" }}>Ve cómo funciona</h2>
                      <div style={{ maxWidth: 780, margin: "0 auto", borderRadius: 16, overflow: "hidden", boxShadow: "0 25px 60px rgba(0,0,0,0.5)" }}>
                        <iframe src={activo.videoUrl} width="100%" height="420" frameBorder="0" allowFullScreen style={{ display: "block" }} />
                      </div>
                    </div>
                  ) : (
                    <div key="video" style={{ padding: "40px 24px", background: "#111827", textAlign: "center", color: "#6B7280", fontSize: 13 }}>
                      📹 Ingresa una URL de YouTube en la sección "Editar"
                    </div>
                  );
                case "form":
                  return (
                    <div key="form" style={{ padding: "70px 24px", background: "#F9FAFB", textAlign: "center" }}>
                      <h2 style={{ fontSize: 28, fontWeight: 800, color: "#111827", margin: "0 0 10px" }}>¿Listo para empezar?</h2>
                      <p style={{ color: "#6B7280", marginBottom: 36, fontSize: 14 }}>Un asesor te contactará en menos de 24 horas.</p>
                      <div style={{ maxWidth: 400, margin: "0 auto", background: "#fff", borderRadius: 18, padding: 30, boxShadow: "0 10px 40px rgba(0,0,0,0.08)", border: "1px solid #E5E7EB", display: "flex", flexDirection: "column", gap: 12 }}>
                        {["Nombre completo *", "Email empresarial *", "Empresa / Cargo"].map((pl, i) => (
                          <input key={i} readOnly placeholder={pl} style={{ padding: "11px 14px", border: "1.5px solid #E5E7EB", borderRadius: 8, fontSize: 13, fontFamily: "inherit", boxSizing: "border-box", color: "#9CA3AF", width: "100%" }} />
                        ))}
                        <button style={{ padding: "14px", background: accent, color: "#fff", border: "none", borderRadius: 10, fontSize: 14, fontWeight: 700, cursor: "pointer", boxShadow: `0 8px 20px ${accent}44` }}>Solicitar Demo →</button>
                      </div>
                    </div>
                  );
                case "text":
                  return (
                    <div key="text" style={{ padding: "60px 24px", background: "#fff", textAlign: "left", fontSize: 16, color: "#374151", lineHeight: 1.8, maxWidth: 800, margin: "0 auto" }}>
                      {(activo.customText || "Agrega texto desde el editor...").split("\n").map((par, i) => (
                        <p key={i} style={{ margin: "0 0 16px", minHeight: par ? "auto" : 28 }}>{par}</p>
                      ))}
                    </div>
                  );
                case "image":
                  return activo.imageUrl ? (
                    <div key="image" style={{ padding: "40px 24px", background: "#F9FAFB", textAlign: "center" }}>
                      <img src={activo.imageUrl} alt="Contenido" style={{ maxWidth: "100%", height: "auto", borderRadius: 16, boxShadow: "0 10px 30px rgba(0,0,0,0.1)", display: "block", margin: "0 auto" }} />
                    </div>
                  ) : (
                    <div key="image" style={{ padding: "40px 24px", background: "#F9FAFB", textAlign: "center", color: "#9CA3AF", fontSize: 14 }}>
                      🖼️ Aquí aparecerá la imagen (Agrega la URL en el editor)
                    </div>
                  );
                case "buttons":
                  return (
                    <div key="buttons" style={{ padding: "50px 24px", textAlign: "center", background: "#fff", borderBottom: "1px solid #E5E7EB" }}>
                      <div style={{ display: "flex", gap: 14, justifyContent: "center", flexWrap: "wrap" }}>
                        {(activo.buttons || []).length === 0 && <p style={{ color: "#9CA3AF", fontSize: 13 }}>Agrega botones desde el panel izquierdo (✏️ editar sección)</p>}
                        {(activo.buttons || []).map((btn, i) => {
                          const isSolid = !btn.variant || btn.variant === "solid";
                          const isOutline = btn.variant === "outline";
                          const btnBg = btn.bg || accent;
                          return (
                            <a key={i} href={btn.url || "#"} target={btn.url?.startsWith("http") ? "_blank" : undefined} rel="noopener noreferrer"
                              style={{
                                background: isSolid ? btnBg : isOutline ? "transparent" : "transparent",
                                color: isSolid ? "#fff" : btnBg,
                                border: isOutline ? `2px solid ${btnBg}` : "none",
                                padding: "14px 28px", borderRadius: 12, fontSize: 15, fontWeight: 700,
                                cursor: "pointer", textDecoration: "none", display: "inline-block",
                                boxShadow: isSolid ? `0 8px 24px ${btnBg}44` : "none"
                              }}>{btn.label || "Botón"}</a>
                          );
                        })}
                      </div>
                    </div>
                  );
                case "cta":
                  return (
                    <div key="cta" style={{ padding: "70px 24px", background: accent, textAlign: "center" }}>
                      <h2 style={{ fontSize: 32, fontWeight: 900, color: "#fff", margin: "0 0 14px" }}>{activo.ctaTitle || "Empieza hoy. Es gratis."}</h2>
                      <p style={{ color: "rgba(255,255,255,.85)", fontSize: 15, marginBottom: 26 }}>{activo.ctaSub || "Sin tarjeta de crédito · Configuración en 2 minutos"}</p>
                      <a href={activo.ctaBtnUrl || "#"} target={activo.ctaBtnUrl?.startsWith("http") ? "_blank" : undefined} rel="noopener noreferrer"
                        style={{ background: "#fff", color: accent, border: "none", padding: "15px 34px", borderRadius: 12, fontSize: 15, fontWeight: 800, cursor: "pointer", textDecoration: "none", display: "inline-block" }}>
                        {activo.ctaBtn || "Comenzar Ahora"} →
                      </a>
                    </div>
                  );
                default: return null;
              }
            })}

            {(activo.blocks || []).length > 0 && (
              <footer style={{ padding: "20px", background: "#111827", textAlign: "center", color: "#6B7280", fontSize: 12 }}>
                © {new Date().getFullYear()} · Potenciado por <span style={{ color: accent, fontWeight: 700 }}>ENSING CRM</span>
              </footer>
            )}

            {/* Rendering Floating Elements on Canvas */}
            {(activo.floatingElements || []).map(f => {
              const isActive = activeFl === f.id;
              const isDragging = dragFl === f.id;

              let contentNode = null;
              if (f.type === "text") {
                contentNode = <div style={{ fontSize: f.fontSize || 16, color: f.color || "#111827", fontWeight: f.fontWeight || "normal", whiteSpace: "pre-wrap" }}>{f.content}</div>;
              } else if (f.type === "image") {
                contentNode = <img src={f.content} alt="Libre" style={{ width: f.width || 150, height: "auto", borderRadius: 8, pointerEvents: "none" }} />;
              } else if (f.type === "button") {
                contentNode = <div style={{ background: f.bg || accent, color: "#fff", padding: "12px 24px", borderRadius: 10, fontSize: 14, fontWeight: 700, pointerEvents: "none", boxShadow: `0 8px 24px ${(f.bg || accent)}44` }}>{f.content}</div>;
              }

              return (
                <div
                  key={f.id}
                  onMouseDown={(e) => onFlDown(e, f.id)}
                  style={{
                    position: "absolute",
                    left: f.x,
                    top: f.y,
                    cursor: isDragging ? "grabbing" : "grab",
                    boxShadow: isActive ? `0 0 0 2px ${T.teal}` : "none",
                    opacity: isDragging ? 0.8 : 1,
                    zIndex: isActive ? 50 : 10,
                    userSelect: "none"
                  }}
                >
                  {contentNode}
                </div>
              );
            })}
          </div>
        </>) : (
          <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 16 }}>
            <div style={{ fontSize: 48 }}>🌐</div>
            <div style={{ fontSize: 16, fontWeight: 700, color: T.white }}>Crea tu primera landing page</div>
            <Btn onClick={() => setShowNew(true)}><Ico k="plus" size={14} /> Nueva Landing Page</Btn>
          </div>
        )}
      </div>

      <Modal open={showNew} onClose={() => setShowNew(false)} title="Nueva Landing Page" width={440}>
        <Campo label="Nombre de la Campaña">
          <Inp value={fNew.titulo} onChange={(e) => setFNew((p) => ({ ...p, titulo: e.target.value }))} placeholder="ej. Black Friday 2026" autoFocus />
        </Campo>
        <Campo label="Slug URL (opcional)">
          <Inp value={fNew.slug} onChange={(e) => setFNew((p) => ({ ...p, slug: e.target.value.toLowerCase().replace(/\s+/g, "-") }))} placeholder="black-friday-2026" />
        </Campo>
        <div style={{ display: "flex", gap: 12, justifyContent: "flex-end", marginTop: 20 }}>
          <Btn variant="secundario" onClick={() => setShowNew(false)}>Cancelar</Btn>
          <Btn onClick={nuevaPagina} disabled={!fNew.titulo.trim()}>Crear Página</Btn>
        </div>
      </Modal>
    </div>
  );
};

// ── Small helpers ────────────────────────────────────────────────────────────
const IE = ({ label, value, onChange, placeholder }) => (
  <div>
    <div style={{ fontSize: 10, color: "#6B7280", marginBottom: 3 }}>{label}</div>
    <Inp value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} style={{ fontSize: 13 }} />
  </div>
);
const smBtn = { background: "transparent", border: "1px solid #374151", color: "#9CA3AF", cursor: "pointer", borderRadius: 4, padding: "2px 5px", fontSize: 10 };
const delBtn = { background: "transparent", border: `1px solid #EF444440`, color: "#EF4444", cursor: "pointer", borderRadius: 4, padding: "2px 8px", fontSize: 10, alignSelf: "flex-end" };
const addBtn = { padding: "8px", background: "transparent", border: "1px dashed #374151", borderRadius: 8, color: "#06B6D4", cursor: "pointer", fontSize: 12, width: "100%" };
