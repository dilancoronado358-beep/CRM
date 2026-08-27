import { useState, useEffect, useRef } from "react";
import { T } from "../theme";
import { uid, uuid } from "../utils";
import { Btn, Inp, Modal, Ico, Campo, ConfirmModal } from "../components/ui";
import { FormularioPublico } from "./FormularioPublico";
import { sileo as toast } from "../utils/sileo";
import { checkPlanLimit, getPlanLimitError } from "../utils/planes";

const BASE_URL = window.location.origin;

const ALL_BLOCKS = [
  { id: "hero", title: "Hero Section", icon: "star", desc: "Título principal y CTA" },
  { id: "buttons", title: "Botones Personalizados", icon: "link", desc: "Agrega botones con URL" },
  { id: "stats", title: "Estadísticas", icon: "bar-chart", desc: "Números de impacto" },
  { id: "features", title: "Beneficios", icon: "grid", desc: "Características en columnas" },
  { id: "pricing", title: "Precios", icon: "dollar-sign", desc: "Planes con CTA" },
  { id: "testimonials", title: "Testimonios", icon: "user", desc: "Opiniones de clientes" },
  { id: "text", title: "Texto Libre", icon: "file-text", desc: "Párrafos personalizados" },
  { id: "image", title: "Imagen", icon: "image", desc: "Sube o enlaza una imagen" },
  { id: "faq", title: "Preguntas Frecuentes", icon: "help-circle", desc: "FAQ interactivo" },
  { id: "video", title: "Video Embed", icon: "video", desc: "YouTube o Vimeo" },
  { id: "form", title: "Formulario de Captura", icon: "layout", desc: "Lead capture en vivo" },
  { id: "cta", title: "Banner CTA", icon: "mail", desc: "Banner de conversión final" },
  { id: "floating", title: "Elementos Flotantes", icon: "move", desc: "Posición libre en pantalla" },
  { id: "popup", title: "Popup de Salida", icon: "alert-circle", desc: "Muestra oferta al salir" },
];

const DEFAULT_PAGE = (id, titulo, slug) => ({
  id: id || uuid(),
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
  accentColor: "#6366f1",
  videoUrl: "",
  ctaTitle: "Empieza hoy. Es gratis.",
  ctaSub: "Sin tarjeta de crédito · Configuración en 2 minutos",
  ctaBtn: "Comenzar Ahora",
  ctaBtnUrl: "#form-section",
  customText: "Escribe aquí tu contenido libre o mensaje personalizado...",
  imageUrl: "",
  buttons: [],
  floatingElements: [],
  faqItems: [
    { q: "¿Cuánto cuesta?", a: "Planes desde $29/mes con 14 días de prueba." },
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
  customFormId: null,
});

// Extraemos los subcomponentes del Editor Inline
const IE = ({ label, value, onChange, placeholder, type = "text" }) => (
  <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
    <div style={{ fontSize: 11, fontWeight: 600, color: T.whiteDim }}>{label}</div>
    <input type={type} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} style={{ padding: "8px 12px", background: T.bg0, border: `1px solid ${T.borderHi}`, borderRadius: 8, color: T.white, fontSize: 12, outline: "none", width: "100%", boxSizing: "border-box" }} />
  </div>
);

export const Websites = ({ db, guardarEnSupa, eliminarDeSupa }) => {
  const [pages, setPages] = useState([]);
  const [activoId, setActivoId] = useState(null);
  const [panel, setPanel] = useState("sections");
  const [showNew, setShowNew] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [expandedBlock, setExpandedBlock] = useState(null);
  const [dragBlock, setDragBlock] = useState(null);
  const [dragOverBlock, setDragOverBlock] = useState(null);
  const [dragElement, setDragElement] = useState(null); // Para Drag & Drop de Elementos Flotantes
  const [idToDelete, setIdToDelete] = useState(null);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isFullScreen, setIsFullScreen] = useState(false); // Modo pantalla completa
  const [contextMenu, setContextMenu] = useState(null); // Menu de clic derecho
  const [previewMode, setPreviewMode] = useState("desktop"); // "desktop" | "mobile"
  const dragRef = useRef(null);
  const canvasRef = useRef(null);

  useEffect(() => {
    if (db.landing_pages) {
      const parsed = db.landing_pages.map((p) => ({
        ...DEFAULT_PAGE(p.id, p.titulo, p.slug),
        ...p,
        blocks: Array.isArray(p.blocks) ? p.blocks : JSON.parse(p.blocks || '["hero","features","cta"]'),
        faqItems: Array.isArray(p.faq_items) ? p.faq_items : (p.faqItems || []),
        statsItems: Array.isArray(p.stats_items) ? p.stats_items : (p.statsItems || []),
        features: Array.isArray(p.features) ? p.features : (p.features || []),
        buttons: Array.isArray(p.buttons) ? p.buttons : (p.buttons || []),
        heroTitle: p.hero_title || p.heroTitle, heroSub: p.hero_sub || p.heroSub,
        heroCTA: p.hero_cta || p.heroCTA, heroCTAUrl: p.hero_cta_url || p.heroCTAUrl || "#form-section",
        heroCTA2: p.hero_cta2 || p.heroCTA2, heroCTA2Url: p.hero_cta2_url || p.heroCTA2Url || "#pricing",
        accentColor: p.accent_color || p.accentColor || "#6366f1", videoUrl: p.video_url || p.videoUrl || "",
        ctaTitle: p.cta_title || p.ctaTitle || "Empieza hoy. Es gratis.", ctaSub: p.cta_sub || p.ctaSub || "",
        ctaBtn: p.cta_btn || p.ctaBtn || "Comenzar Ahora", ctaBtnUrl: p.cta_btn_url || p.ctaBtnUrl || "#form-section",
        customText: p.custom_text || p.customText || "Escribe aquí tu contenido libre...", 
        imageUrl: (p.image_url || p.imageUrl || "").split("#bg")[0], 
        imageAsBg: (p.image_url || p.imageUrl || "").includes("#bg"),
        floatingElements: Array.isArray(p.floating_elements) ? p.floating_elements : (p.floatingElements || []),
        customFormId: p.custom_form_id || p.customFormId || null,
      }));
      setPages(parsed);
      if (parsed.length > 0 && !activoId) setActivoId(parsed[0].id);
      setLoading(false);
    } else {
      setLoading(false);
    }
  }, [db.landing_pages]);

  const activo = pages.find((p) => p.id === activoId) || null;
  const updateActivo = (upd) => setPages((prev) => prev.map((p) => p.id === activoId ? { ...p, ...upd } : p));

  const guardar = async (overrideActivo = null) => {
    const pg = overrideActivo || activo;
    if (!pg) return;
    setSaving(true);
    const payload = {
      id: pg.id, slug: pg.slug, titulo: pg.titulo, activo: pg.activo, blocks: pg.blocks || [],
      hero_title: pg.heroTitle || null, hero_sub: pg.heroSub || null, hero_cta: pg.heroCTA || null,
      hero_cta_url: pg.heroCTAUrl || null, hero_cta2: pg.heroCTA2 || null, hero_cta2_url: pg.heroCTA2Url || null,
      accent_color: pg.accentColor || "#6366f1", video_url: pg.videoUrl || null, cta_title: pg.ctaTitle || null,
      cta_sub: pg.ctaSub || null, cta_btn: pg.ctaBtn || null, cta_btn_url: pg.ctaBtnUrl || null,
      custom_text: pg.customText || null, image_url: pg.imageUrl ? (pg.imageAsBg ? pg.imageUrl + "#bg" : pg.imageUrl) : null, floating_elements: pg.floatingElements || [],
      buttons: pg.buttons || [], faq_items: pg.faqItems || [], stats_items: pg.statsItems || [],
      features: pg.features || [], custom_form_id: pg.customFormId || null,
    };
    const { error } = await guardarEnSupa("landing_pages", payload);
    setSaving(false);
    if (error) toast.error("Error al guardar: " + error.message);
    else toast.success("¡Landing page guardada!");
  };

  const nuevaPagina = async () => {
    const titulo = "Nueva Página " + (pages.length + 1);
    const np = DEFAULT_PAGE(null, titulo, "page-" + Date.now());
    const payload = {
      id: np.id, slug: np.slug, titulo: np.titulo, activo: np.activo, blocks: np.blocks || [],
      hero_title: np.heroTitle || null, hero_sub: np.heroSub || null, hero_cta: np.heroCTA || null,
      hero_cta_url: np.heroCTAUrl || null, hero_cta2: np.heroCTA2 || null, hero_cta2_url: np.heroCTA2Url || null,
      accent_color: np.accentColor || "#6366f1", video_url: np.videoUrl || null, cta_title: np.ctaTitle || null,
      cta_sub: np.ctaSub || null, cta_btn: np.ctaBtn || null, cta_btn_url: np.ctaBtnUrl || null,
      custom_text: np.customText || null, image_url: np.imageUrl ? (np.imageAsBg ? np.imageUrl + "#bg" : np.imageUrl) : null, floating_elements: np.floatingElements || [],
      buttons: np.buttons || [], faq_items: np.faqItems || [], stats_items: np.statsItems || [],
      features: np.features || [], custom_form_id: np.customFormId || null,
    };
    const { error } = await guardarEnSupa("landing_pages", payload);
    if (!error) { setPages((p) => [...p, np]); setActivoId(np.id); }
    else toast.error("Error al crear: " + error.message);
  };

  const confirmEliminar = async () => {
    if (!idToDelete) return;
    await eliminarDeSupa("landing_pages", idToDelete);
    const rem = pages.filter((p) => p.id !== idToDelete);
    setPages(rem); setActivoId(rem[0]?.id || null);
    toast.success("Eliminada correctamente");
    setIdToDelete(null);
  };

  const toggleBloque = (blockId) => {
    const cur = activo?.blocks || [];
    updateActivo({ blocks: cur.includes(blockId) ? cur.filter((b) => b !== blockId) : [...cur, blockId] });
  };

  // Drag reorder
  const onBlockDragStart = (e, idx) => {
    setDragBlock(idx);
    dragRef.current = e.currentTarget;
    setTimeout(() => { if (dragRef.current) dragRef.current.style.opacity = "0.4"; }, 0);
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

  const copyLink = (pg) => {
    navigator.clipboard?.writeText(`${BASE_URL}/#/sites/${pg.id}`);
    toast.success("Link copiado al portapapeles");
  };

  // Render Inline Editors
  const renderBlockEditor = (blockId) => {
    if (!activo) return null;
    const upd = (k, v) => updateActivo({ [k]: v });
    const updArr = (arrKey, idx, partial) => {
      const arr = [...(activo[arrKey] || [])];
      arr[idx] = { ...arr[idx], ...partial };
      updateActivo({ [arrKey]: arr });
    };
    const addArr = (arrKey, item) => updateActivo({ [arrKey]: [...(activo[arrKey] || []), item] });
    const rmArr = (arrKey, idx) => updateActivo({ [arrKey]: (activo[arrKey] || []).filter((_, i) => i !== idx) });

    const editorStyles = { padding: "16px", background: T.bg0, borderTop: `1px solid ${T.borderHi}`, display: "flex", flexDirection: "column", gap: 16 };

    switch (blockId) {
      case "hero": return (
        <div style={editorStyles}>
          <IE label="Título Principal" value={activo.heroTitle || ""} onChange={(v) => upd("heroTitle", v)} />
          <IE label="Subtítulo" value={activo.heroSub || ""} onChange={(v) => upd("heroSub", v)} />
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <IE label="Texto Botón 1" value={activo.heroCTA || ""} onChange={(v) => upd("heroCTA", v)} />
            <IE label="Link Botón 1" value={activo.heroCTAUrl || ""} onChange={(v) => upd("heroCTAUrl", v)} placeholder="#form-section" />
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <IE label="Texto Botón 2" value={activo.heroCTA2 || ""} onChange={(v) => upd("heroCTA2", v)} />
            <IE label="Link Botón 2" value={activo.heroCTA2Url || ""} onChange={(v) => upd("heroCTA2Url", v)} />
          </div>
        </div>
      );
      case "cta": return (
        <div style={editorStyles}>
          <IE label="Título" value={activo.ctaTitle || ""} onChange={(v) => upd("ctaTitle", v)} />
          <IE label="Subtítulo" value={activo.ctaSub || ""} onChange={(v) => upd("ctaSub", v)} />
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <IE label="Texto Botón" value={activo.ctaBtn || ""} onChange={(v) => upd("ctaBtn", v)} />
            <IE label="Link Botón" value={activo.ctaBtnUrl || ""} onChange={(v) => upd("ctaBtnUrl", v)} />
          </div>
        </div>
      );
      case "features": return (
        <div style={editorStyles}>
          {(activo.features || []).map((f, i) => (
            <div key={i} style={{ background: T.bg1, padding: 12, borderRadius: 8, border: `1px solid ${T.borderHi}` }}>
              <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
                <div style={{ width: 40 }}><IE label="Icon" value={f.icon} onChange={(v) => updArr("features", i, { icon: v })} /></div>
                <div style={{ flex: 1 }}><IE label="Título" value={f.title} onChange={(v) => updArr("features", i, { title: v })} /></div>
                <button onClick={() => rmArr("features", i)} style={{ background: "none", border: "none", color: "#ef4444", cursor: "pointer", padding: "0 8px", alignSelf: "flex-end", height: 32 }}>✕</button>
              </div>
              <textarea value={f.desc} onChange={(e) => updArr("features", i, { desc: e.target.value })} rows={2} style={{ width: "100%", padding: "8px", background: T.bg0, border: `1px solid ${T.borderHi}`, color: T.white, borderRadius: 6, fontSize: 12, boxSizing: "border-box", resize: "none" }} />
            </div>
          ))}
          <button onClick={() => addArr("features", { icon: "⚡", title: "Nuevo", desc: "Descripción" })} style={{ padding: "8px", background: "transparent", border: `1px dashed ${T.borderHi}`, color: T.white, borderRadius: 8, cursor: "pointer" }}>+ Añadir Beneficio</button>
        </div>
      );
      case "stats": return (
        <div style={editorStyles}>
          {(activo.statsItems || []).map((s, i) => (
            <div key={i} style={{ display: "flex", gap: 8 }}>
              <div style={{ width: 80 }}><IE label="Valor" value={s.value} onChange={(v) => updArr("statsItems", i, { value: v })} /></div>
              <div style={{ flex: 1 }}><IE label="Etiqueta" value={s.label} onChange={(v) => updArr("statsItems", i, { label: v })} /></div>
              <button onClick={() => rmArr("statsItems", i)} style={{ background: "none", border: "none", color: "#ef4444", cursor: "pointer", marginTop: 16 }}>✕</button>
            </div>
          ))}
          <button onClick={() => addArr("statsItems", { value: "+10", label: "Nuevo" })} style={{ padding: "8px", background: "transparent", border: `1px dashed ${T.borderHi}`, color: T.white, borderRadius: 8, cursor: "pointer" }}>+ Añadir Dato</button>
        </div>
      );
      case "form": return (
        <div style={editorStyles}>
          <div style={{ fontSize: 11, fontWeight: 600, color: T.whiteDim, marginBottom: 4 }}>Formulario a mostrar</div>
          <select value={activo.customFormId || ""} onChange={(e) => upd("customFormId", e.target.value)} style={{ padding: "8px 12px", background: T.bg0, border: `1px solid ${T.borderHi}`, borderRadius: 8, color: T.white, width: "100%", fontSize: 12 }}>
            <option value="">Formulario Simple (Default)</option>
            {(db.formularios_publicos || []).map(f => <option key={f.id} value={f.id}>{f.nombre}</option>)}
          </select>
        </div>
      );
      case "buttons": return (
        <div style={editorStyles}>
          <div style={{ fontSize: 11, fontWeight: 700, color: T.whiteDim, textTransform: "uppercase" }}>Configurar Botones</div>
          {(activo.buttons || []).map((b, i) => (
            <div key={i} style={{ background: T.bg1, padding: 12, borderRadius: 8, border: `1px solid ${T.borderHi}`, display: "flex", flexDirection: "column", gap: 10 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: T.white }}>Botón {i + 1}</span>
                <button onClick={() => rmArr("buttons", i)} style={{ background: "none", border: "none", color: "#ef4444", cursor: "pointer", fontSize: 16 }}>✕</button>
              </div>
              <IE label="Etiqueta" value={b.label} onChange={(v) => updArr("buttons", i, { label: v })} />
              <IE label="URL o Acción" value={b.url} onChange={(v) => updArr("buttons", i, { url: v })} placeholder="https://... o #seccion" />
              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                <div style={{ fontSize: 11, fontWeight: 600, color: T.whiteDim }}>Estilo</div>
                <select value={b.style || "primary"} onChange={(e) => updArr("buttons", i, { style: e.target.value })} style={{ padding: "8px", background: T.bg0, border: `1px solid ${T.borderHi}`, color: T.white, borderRadius: 6, fontSize: 12 }}>
                  <option value="primary">Primario (Fondo relleno)</option>
                  <option value="secondary">Secundario (Borde transparente)</option>
                  <option value="outline">Contorno (Borde visible)</option>
                </select>
              </div>
            </div>
          ))}
          <button onClick={() => addArr("buttons", { label: "Nuevo Botón", url: "#", style: "primary", id: uuid() })} style={{ padding: "10px", background: "transparent", border: `1px dashed ${T.borderHi}`, color: T.white, borderRadius: 8, cursor: "pointer", fontWeight: 600 }}>+ Agregar Botón</button>
        </div>
      );
      case "image": return (
        <div style={editorStyles}>
          <IE label="URL de la Imagen" value={activo.imageUrl || ""} onChange={(v) => upd("imageUrl", v)} placeholder="https://ejemplo.com/foto.jpg" />
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 8 }}>
            <input type="checkbox" checked={activo.imageAsBg || false} onChange={(e) => upd("imageAsBg", e.target.checked)} id="imgBgToggle" />
            <label htmlFor="imgBgToggle" style={{ fontSize: 12, color: T.white, cursor: "pointer" }}>Usar como fondo de pantalla (Hero Background)</label>
          </div>
          {activo.imageUrl && (
            <div style={{ marginTop: 12, borderRadius: 8, overflow: "hidden", border: `1px solid ${T.borderHi}` }}>
              <img src={activo.imageUrl} alt="Preview" style={{ width: "100%", maxHeight: 150, objectFit: "cover", display: "block" }} onError={(e) => { e.target.style.display = "none" }} />
            </div>
          )}
        </div>
      );
      case "floating": return (
        <div style={editorStyles}>
          <div style={{ fontSize: 11, fontWeight: 700, color: T.whiteDim, textTransform: "uppercase" }}>Elementos Libres</div>
          <div style={{ fontSize: 11, color: T.whiteDim, marginBottom: 8 }}>Añade texto o imágenes sobre tu página.</div>
          {(activo.floatingElements || []).map((el, i) => (
            <div key={i} style={{ background: T.bg1, padding: 12, borderRadius: 8, border: `1px solid ${T.borderHi}`, display: "flex", flexDirection: "column", gap: 10 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: T.white }}>Elemento {i + 1} ({el.type})</span>
                <button onClick={() => rmArr("floatingElements", i)} style={{ background: "none", border: "none", color: "#ef4444", cursor: "pointer", fontSize: 16 }}>✕</button>
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <select value={el.type} onChange={(e) => updArr("floatingElements", i, { type: e.target.value })} style={{ padding: "6px", background: T.bg0, color: T.white, border: `1px solid ${T.borderHi}`, borderRadius: 6, fontSize: 12, flex: 1 }}>
                  <option value="text">Texto</option>
                  <option value="image">Imagen</option>
                  <option value="button">Botón</option>
                </select>
              </div>
              {el.type === "text" ? (
                <textarea value={el.content || ""} onChange={(e) => updArr("floatingElements", i, { content: e.target.value })} rows={2} style={{ width: "100%", padding: "8px", background: T.bg0, border: `1px solid ${T.borderHi}`, color: T.white, borderRadius: 6, fontSize: 12, boxSizing: "border-box", resize: "none" }} placeholder="Escribe algo..." />
              ) : el.type === "button" ? (
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  <IE label="Etiqueta" value={el.content || ""} onChange={(v) => updArr("floatingElements", i, { content: v })} placeholder="Click aquí" />
                  <IE label="URL" value={el.url || ""} onChange={(v) => updArr("floatingElements", i, { url: v })} placeholder="https://..." />
                </div>
              ) : (
                <IE label="URL Imagen" value={el.content || ""} onChange={(v) => updArr("floatingElements", i, { content: v })} placeholder="https://..." />
              )}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                  <span style={{ fontSize: 10, color: T.whiteDim }}>Posición X (%)</span>
                  <input type="range" min="0" max="100" step="0.1" value={el.x || 50} onChange={(e) => updArr("floatingElements", i, { x: parseFloat(e.target.value) })} style={{ width: "100%" }} />
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                  <span style={{ fontSize: 10, color: T.whiteDim }}>Posición Y (%)</span>
                  <input type="range" min="0" max="100" step="0.1" value={el.y || 50} onChange={(e) => updArr("floatingElements", i, { y: parseFloat(e.target.value) })} style={{ width: "100%" }} />
                </div>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                  <span style={{ fontSize: 10, color: T.whiteDim }}>Tamaño (%)</span>
                  <input type="range" min="10" max="300" value={el.scale || 100} onChange={(e) => updArr("floatingElements", i, { scale: parseInt(e.target.value) })} style={{ width: "100%" }} />
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                  <span style={{ fontSize: 10, color: T.whiteDim }}>Capa (Profundidad)</span>
                  <select value={el.zIndex === undefined ? 10 : el.zIndex} onChange={(e) => updArr("floatingElements", i, { zIndex: parseInt(e.target.value) })} style={{ padding: "4px", background: T.bg0, color: T.white, border: `1px solid ${T.borderHi}`, borderRadius: 4, fontSize: 10 }}>
                    <option value="0">Al Fondo</option>
                    <option value="10">Normal</option>
                    <option value="50">Al Frente</option>
                  </select>
                </div>
              </div>
            </div>
          ))}
          <button onClick={() => addArr("floatingElements", { id: uuid(), type: "text", content: "Nuevo texto", x: 50, y: 50 })} style={{ padding: "10px", background: "transparent", border: `1px dashed ${T.borderHi}`, color: T.white, borderRadius: 8, cursor: "pointer", fontWeight: 600 }}>+ Añadir Elemento</button>
        </div>
      );
      case "popup": {
        const popupEl = (activo.floatingElements || []).find(e => e.type === "popup") || { type: "popup", title: "¡Espera no te vayas!", content: "Obtén un 10% de descuento en tu primera compra si te quedas.", btn: "Reclamar 10%" };
        const updPopup = (upd) => {
          const exists = (activo.floatingElements || []).some(e => e.type === "popup");
          if (exists) updateActivo({ floatingElements: activo.floatingElements.map(e => e.type === "popup" ? { ...e, ...upd } : e) });
          else updateActivo({ floatingElements: [...activo.floatingElements, { id: "popup-" + Date.now(), type: "popup", ...upd, title: popupEl.title, content: popupEl.content, btn: popupEl.btn }] });
        };
        return (
          <div style={editorStyles}>
            <div style={{ fontSize: 11, fontWeight: 700, color: T.whiteDim, textTransform: "uppercase", marginBottom: 8 }}>Popup de Salida</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <IE label="Título del Popup" value={popupEl.title || ""} onChange={(v) => updPopup({ title: v })} placeholder="¡No te vayas!" />
              <textarea value={popupEl.content || ""} onChange={(e) => updPopup({ content: e.target.value })} rows={3} style={{ width: "100%", padding: "8px", background: T.bg0, border: `1px solid ${T.borderHi}`, color: T.white, borderRadius: 6, fontSize: 12, resize: "none", boxSizing: "border-box" }} placeholder="Texto de la oferta..." />
              <IE label="Texto del Botón" value={popupEl.btn || ""} onChange={(v) => updPopup({ btn: v })} placeholder="Obtener oferta" />
              <div style={{ fontSize: 11, color: T.whiteDim, marginTop: 4 }}>💡 Este popup se mostrará en la página pública solo cuando el usuario mueva el ratón intentando cerrar la ventana.</div>
            </div>
          </div>
        );
      }
      case "text": return (
        <div style={editorStyles}>
          <div style={{ fontSize: 11, fontWeight: 700, color: T.whiteDim, textTransform: "uppercase", marginBottom: 8 }}>Texto Libre</div>
          <textarea value={activo.customText || ""} onChange={(e) => upd("customText", e.target.value)} rows={6} style={{ width: "100%", padding: "12px", background: T.bg0, border: `1px solid ${T.borderHi}`, color: T.white, borderRadius: 8, fontSize: 13, resize: "vertical" }} placeholder="Escribe tu contenido aquí..." />
        </div>
      );
      case "video": return (
        <div style={editorStyles}>
          <IE label="URL del Video (YouTube / Vimeo)" value={activo.videoUrl || ""} onChange={(v) => upd("videoUrl", v)} placeholder="https://www.youtube.com/embed/..." />
        </div>
      );
      case "faq": return (
        <div style={editorStyles}>
          <div style={{ fontSize: 11, fontWeight: 700, color: T.whiteDim, textTransform: "uppercase" }}>Preguntas Frecuentes</div>
          {(activo.faqItems || []).map((faq, i) => (
            <div key={i} style={{ background: T.bg1, padding: 12, borderRadius: 8, border: `1px solid ${T.borderHi}`, display: "flex", flexDirection: "column", gap: 8 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: T.white }}>Pregunta {i + 1}</span>
                <button onClick={() => rmArr("faqItems", i)} style={{ background: "none", border: "none", color: "#ef4444", cursor: "pointer", fontSize: 16 }}>✕</button>
              </div>
              <IE label="Pregunta" value={faq.q} onChange={(v) => updArr("faqItems", i, { q: v })} />
              <textarea value={faq.a || ""} onChange={(e) => updArr("faqItems", i, { a: e.target.value })} rows={2} style={{ width: "100%", padding: "8px", background: T.bg0, border: `1px solid ${T.borderHi}`, color: T.white, borderRadius: 6, fontSize: 12, boxSizing: "border-box", resize: "none" }} placeholder="Respuesta..." />
            </div>
          ))}
          <button onClick={() => addArr("faqItems", { q: "¿Nueva pregunta?", a: "Respuesta..." })} style={{ padding: "10px", background: "transparent", border: `1px dashed ${T.borderHi}`, color: T.white, borderRadius: 8, cursor: "pointer", fontWeight: 600 }}>+ Añadir FAQ</button>
        </div>
      );
      case "testimonials": return (
        <div style={{ padding: 16, color: T.whiteDim, fontSize: 12, textAlign: "center", background: T.bg0, borderTop: `1px solid ${T.borderHi}` }}>
          Este bloque muestra testimonios fijos de diseño premium.
        </div>
      );
      default: return (
        <div style={{ padding: 16, color: T.whiteDim, fontSize: 12, textAlign: "center", background: T.bg0, borderTop: `1px solid ${T.borderHi}` }}>
          Configuración en el panel principal o no aplicable para este bloque.
        </div>
      );
    }
  };

  // ── Render Canvas Block ──
  const renderCanvasBlock = (blockId) => {
    if (!activo) return null;
    const accent = activo.accentColor || "#6366f1";
    const accentRGB = accent.startsWith("#") ? accent : "#6366f1"; // Simplification for rgba
    const hasGlobalBg = activo.imageAsBg && activo.imageUrl;

    switch (blockId) {
      case "hero": {
        const bgImg = hasGlobalBg ? "none" : (activo.imageUrl ? `url(${activo.imageUrl})` : "none");
        const txtCol = hasGlobalBg || bgImg !== "none" ? "#fff" : "#111827";
        return (
          <div key="hero" style={{ padding: "80px 24px", textAlign: "center", background: bgImg !== "none" ? `${bgImg} center/cover no-repeat` : "transparent", borderBottom: hasGlobalBg ? "none" : "1px solid #f3f4f6", position: "relative" }}>
            {bgImg !== "none" && <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.6)" }} />}
            <div style={{ position: "relative", zIndex: 1 }}>
              <div style={{ display: "inline-block", background: `${accentRGB}15`, color: accentRGB, padding: "6px 16px", borderRadius: 24, fontSize: 12, fontWeight: 700, marginBottom: 24, textTransform: "uppercase", letterSpacing: "0.05em", backdropFilter: "blur(4px)" }}>🌟 Plataforma Líder</div>
              <h1 style={{ fontSize: "clamp(36px, 6vw, 64px)", fontWeight: 900, color: txtCol, margin: "0 0 20px", letterSpacing: "-0.04em", lineHeight: 1.1, maxWidth: 800, marginInline: "auto" }}>{activo.heroTitle}</h1>
              <p style={{ fontSize: 18, color: bgImg !== "none" ? "#e5e7eb" : "#4b5563", margin: "0 auto 40px", maxWidth: 600, lineHeight: 1.6 }}>{activo.heroSub}</p>
              <div style={{ display: "flex", gap: 16, justifyContent: "center", flexWrap: "wrap" }}>
                <a href={activo.heroCTAUrl || "#"} style={{ textDecoration: "none", background: accentRGB, color: "#fff", padding: "16px 32px", borderRadius: 12, fontSize: 16, fontWeight: 700, boxShadow: `0 8px 24px ${accentRGB}50`, display: "inline-block" }}>{activo.heroCTA}</a>
                {activo.heroCTA2 && <a href={activo.heroCTA2Url || "#"} style={{ textDecoration: "none", background: bgImg !== "none" ? "rgba(255,255,255,0.15)" : "#f3f4f6", color: bgImg !== "none" ? "#fff" : "#1f2937", backdropFilter: "blur(4px)", padding: "16px 32px", borderRadius: 12, fontSize: 16, fontWeight: 700, display: "inline-block" }}>{activo.heroCTA2} →</a>}
              </div>
            </div>
          </div>
        );
      }
      case "buttons": return (
        <div key="buttons" style={{ padding: "60px 24px", background: hasGlobalBg ? "transparent" : "#fff", display: "flex", gap: 16, justifyContent: "center", flexWrap: "wrap" }}>
          {(activo.buttons || []).map((b) => {
            const isPri = b.style === "primary" || !b.style;
            const isOut = b.style === "outline";
            const bg = isPri ? accentRGB : "transparent";
            const col = isPri ? "#fff" : accentRGB;
            const border = isOut ? `2px solid ${accentRGB}` : "none";
            return (
              <a key={b.id || b.label} href={b.url || "#"} style={{ textDecoration: "none", padding: "14px 28px", background: bg, color: col, border: border, borderRadius: 12, fontSize: 16, fontWeight: 700, display: "inline-block", transition: "all 0.2s" }}>
                {b.label}
              </a>
            );
          })}
        </div>
      );
      case "image": return (!hasGlobalBg && activo.imageUrl) ? (
        <div key="image" style={{ padding: "40px 24px", background: "transparent", textAlign: "center" }}>
          <img src={activo.imageUrl} alt="Bloque Imagen" style={{ maxWidth: "100%", height: "auto", borderRadius: 16, boxShadow: "0 20px 40px rgba(0,0,0,0.1)" }} />
        </div>
      ) : null;
      case "floating": return (
        <div key="floating" style={{ position: "absolute", inset: 0, pointerEvents: "none" }}>
          {(activo.floatingElements || []).map((el) => {
            const isDragging = dragElement?.id === el.id;
            return (
            <div key={el.id} 
                 onMouseDown={(e) => {
                   if (e.button !== 0) return; // Only left click to drag
                   e.preventDefault();
                   e.stopPropagation();
                   setDragElement({ id: el.id, startX: e.clientX, startY: e.clientY, initElX: el.x || 50, initElY: el.y || 50 });
                 }}
                 onContextMenu={(e) => {
                   e.preventDefault();
                   e.stopPropagation();
                   setContextMenu({ x: e.clientX, y: e.clientY, type: "floating", el: el });
                 }}
                 style={{ 
                   position: "absolute", left: `${el.x || 50}%`, top: `${el.y || 50}%`, 
                   transform: `translate(-50%, -50%) scale(${(el.scale || 100) / 100})`, 
                   pointerEvents: "auto", 
                   cursor: isDragging ? "grabbing" : "grab",
                   transition: isDragging ? "none" : "left 0.1s, top 0.1s",
                   filter: isDragging ? "brightness(1.1)" : "none",
                   zIndex: isDragging ? 999 : (el.zIndex !== undefined ? el.zIndex : 10)
                 }}>
              {el.type === "image" && el.content ? (
                <img src={el.content} alt="Flotante" style={{ maxWidth: 300, maxHeight: 300, objectFit: "contain", borderRadius: 12, boxShadow: isDragging ? "0 20px 40px rgba(0,0,0,0.3)" : "0 10px 25px rgba(0,0,0,0.15)" }} draggable={false} />
              ) : el.type === "button" ? (
                <div style={{ textDecoration: "none", background: accentRGB, color: "#fff", padding: "12px 24px", borderRadius: 12, fontSize: 15, fontWeight: 700, boxShadow: isDragging ? `0 15px 30px ${accentRGB}80` : `0 8px 24px ${accentRGB}50`, display: "inline-block", whiteSpace: "nowrap" }}>
                  {el.content || "Botón Libre"}
                </div>
              ) : (
                <div style={{ background: "rgba(255,255,255,0.9)", backdropFilter: "blur(10px)", padding: "12px 20px", borderRadius: 12, boxShadow: isDragging ? "0 20px 40px rgba(0,0,0,0.2)" : "0 10px 25px rgba(0,0,0,0.1)", fontSize: 14, fontWeight: 600, color: "#111827", border: "1px solid rgba(0,0,0,0.05)" }}>
                  {el.content || "Texto libre"}
                </div>
              )}
            </div>
          )})}
          {activo.blocks.includes("popup") && (activo.floatingElements || []).some(e => e.type === "popup") && (
            <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.4)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 10000, pointerEvents: "auto" }}>
              {(() => {
                const pEl = activo.floatingElements.find(e => e.type === "popup");
                return (
                  <div style={{ background: "#fff", padding: "40px", borderRadius: 24, maxWidth: 400, width: "90%", textAlign: "center", boxShadow: "0 25px 50px -12px rgba(0,0,0,0.5)", border: "1px solid #f1f5f9", position: "relative" }}>
                    <div style={{ position: "absolute", top: 16, right: 16, color: "#94a3b8", cursor: "pointer", fontSize: 20 }}>✕</div>
                    <div style={{ fontSize: 48, marginBottom: 16 }}>🎁</div>
                    <h3 style={{ fontSize: 24, fontWeight: 900, color: "#0f172a", margin: "0 0 12px", letterSpacing: "-0.02em" }}>{pEl.title || "¡Espera!"}</h3>
                    <p style={{ color: "#475569", margin: "0 0 24px", lineHeight: 1.6 }}>{pEl.content || "No te vayas aún..."}</p>
                    <div style={{ background: accentRGB, color: "#fff", padding: "16px", borderRadius: 12, fontWeight: 800, fontSize: 16, cursor: "pointer", boxShadow: `0 10px 25px -5px ${accentRGB}80` }}>{pEl.btn || "Obtener"}</div>
                  </div>
                );
              })()}
            </div>
          )}
        </div>
      );
      case "popup": return null; // El popup se renderiza dentro del wrapper floating para no afectar el flujo
      case "stats": return activo.statsItems?.length ? (
        <div key="stats" style={{ padding: "60px 24px", background: accentRGB }}>
          <div style={{ display: "grid", gridTemplateColumns: `repeat(auto-fit, minmax(150px, 1fr))`, gap: 24, maxWidth: 1000, margin: "0 auto", textAlign: "center" }}>
            {activo.statsItems.map((s, i) => <div key={i}><div style={{ fontSize: 42, fontWeight: 900, color: "#fff", letterSpacing: "-0.02em" }}>{s.value}</div><div style={{ fontSize: 14, color: "rgba(255,255,255,.9)", marginTop: 4, fontWeight: 500 }}>{s.label}</div></div>)}
          </div>
        </div>
      ) : null;
      case "features": return (
        <div key="features" style={{ padding: "80px 24px", background: hasGlobalBg ? "transparent" : "#f8fafc" }}>
          <h2 style={{ fontSize: 32, fontWeight: 800, color: hasGlobalBg ? "#fff" : "#0f172a", textAlign: "center", margin: "0 0 48px", letterSpacing: "-0.03em" }}>Todo lo que necesitas</h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 24, maxWidth: 1000, margin: "0 auto" }}>
            {(activo.features || []).map((f, i) => (
              <div key={i} style={{ background: "#fff", padding: 32, borderRadius: 20, boxShadow: "0 4px 6px -1px rgba(0,0,0,0.05), 0 2px 4px -2px rgba(0,0,0,0.05)", border: "1px solid #f1f5f9" }}>
                <div style={{ width: 48, height: 48, borderRadius: 14, background: `${accentRGB}15`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24, marginBottom: 20 }}>{f.icon}</div>
                <h3 style={{ fontSize: 18, fontWeight: 800, margin: "0 0 12px", color: "#0f172a" }}>{f.title}</h3>
                <p style={{ fontSize: 14, color: "#64748b", margin: 0, lineHeight: 1.6 }}>{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      );
      case "pricing": return (
        <div key="pricing" style={{ padding: "80px 24px", textAlign: "center", background: hasGlobalBg ? "transparent" : "#ffffff" }}>
          <h2 style={{ fontSize: 32, fontWeight: 800, color: hasGlobalBg ? "#fff" : "#111827", margin: "0 0 48px", letterSpacing: "-0.03em" }}>Planes simples y transparentes</h2>
          <div style={{ display: "flex", gap: 24, justifyContent: "center", flexWrap: "wrap", alignItems: "center" }}>
            {[{ p: "Starter", price: "$29", f: ["5 usuarios", "1 pipeline"], h: false }, { p: "Pro", price: "$79", f: ["25 usuarios", "Pipelines ilimitados", "IA"], h: true }, { p: "Enterprise", price: "Custom", f: ["Usuarios ilimitados", "SSO"], h: false }].map((pl, i) => (
              <div key={i} style={{ background: pl.h ? accentRGB : "#fff", padding: pl.h ? "48px 32px" : "32px", borderRadius: 24, border: `1px solid ${pl.h ? "transparent" : "#e5e7eb"}`, width: 260, boxShadow: pl.h ? `0 20px 40px -10px ${accentRGB}50` : "none", color: pl.h ? "#fff" : "#111827", transform: pl.h ? "scale(1.05)" : "none" }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: pl.h ? "rgba(255,255,255,.9)" : "#6b7280", marginBottom: 12, textTransform: "uppercase", letterSpacing: "0.05em" }}>{pl.p}</div>
                <div style={{ fontSize: 48, fontWeight: 900, marginBottom: 24, letterSpacing: "-0.04em" }}>{pl.price}</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 32 }}>
                  {pl.f.map((ft, j) => <div key={j} style={{ fontSize: 14, color: pl.h ? "rgba(255,255,255,.9)" : "#4b5563" }}>✓ {ft}</div>)}
                </div>
                <div style={{ background: pl.h ? "#fff" : `${accentRGB}15`, color: pl.h ? accentRGB : accentRGB, padding: "14px 24px", borderRadius: 12, fontSize: 15, fontWeight: 700, cursor: "pointer" }}>Elegir Plan</div>
              </div>
            ))}
          </div>
        </div>
      );
      case "form": return (
        <div key="form" style={{ padding: "80px 24px", background: hasGlobalBg ? "transparent" : "#f8fafc", display: "flex", justifyContent: "center" }}>
          <div style={{ width: "100%", maxWidth: 500, background: "#fff", borderRadius: 24, padding: 40, boxShadow: "0 20px 40px -10px rgba(0,0,0,0.1)", border: "1px solid #f1f5f9" }}>
            <div style={{ textAlign: "center", marginBottom: 24 }}>
              <h3 style={{ fontSize: 24, fontWeight: 800, color: "#0f172a", margin: "0 0 8px" }}>¿Listo para empezar?</h3>
              <p style={{ color: "#64748b", margin: 0, fontSize: 14 }}>Déjanos tus datos y hablemos.</p>
            </div>
            <div style={{ height: 200, display: "flex", alignItems: "center", justifyContent: "center", background: "#f1f5f9", borderRadius: 12, color: "#94a3b8", fontSize: 14, border: "2px dashed #cbd5e1" }}>
              [ Render de Formulario {activo.customFormId ? "Personalizado" : "Base"} ]
            </div>
          </div>
        </div>
      );
      case "cta": return (
        <div key="cta" style={{ padding: "80px 24px", background: accentRGB, textAlign: "center" }}>
          <h2 style={{ fontSize: 36, fontWeight: 900, color: "#fff", margin: "0 0 16px", letterSpacing: "-0.03em" }}>{activo.ctaTitle}</h2>
          <p style={{ color: "rgba(255,255,255,.9)", fontSize: 18, marginBottom: 40, maxWidth: 600, marginInline: "auto" }}>{activo.ctaSub}</p>
          <div style={{ display: "inline-block", background: "#fff", color: accentRGB, padding: "18px 40px", borderRadius: 16, fontSize: 16, fontWeight: 800, boxShadow: "0 10px 25px rgba(0,0,0,0.15)", cursor: "pointer" }}>{activo.ctaBtn} →</div>
        </div>
      );
      case "text": return (
        <div key="text" style={{ padding: "80px 24px", background: hasGlobalBg ? "transparent" : "#fff", display: "flex", justifyContent: "center" }}>
          <div style={{ maxWidth: 800, width: "100%", color: hasGlobalBg ? "#fff" : "#334155", fontSize: 18, lineHeight: 1.8, whiteSpace: "pre-wrap" }}>
            {activo.customText}
          </div>
        </div>
      );
      case "video": return (
        <div key="video" style={{ padding: "80px 24px", background: hasGlobalBg ? "transparent" : "#f8fafc", display: "flex", justifyContent: "center" }}>
          {activo.videoUrl ? (
            <iframe src={activo.videoUrl} style={{ width: "100%", maxWidth: 900, aspectRatio: "16/9", border: "none", borderRadius: 16, boxShadow: "0 20px 40px rgba(0,0,0,0.1)" }} allowFullScreen />
          ) : (
            <div style={{ width: "100%", maxWidth: 900, aspectRatio: "16/9", background: "#e2e8f0", borderRadius: 16, display: "flex", alignItems: "center", justifyContent: "center", color: "#64748b", fontSize: 18, fontWeight: 600 }}>[ Ingresa la URL del video en el editor ]</div>
          )}
        </div>
      );
      case "faq": return (
        <div key="faq" style={{ padding: "80px 24px", background: hasGlobalBg ? "transparent" : "#fff" }}>
          <h2 style={{ fontSize: 32, fontWeight: 800, color: hasGlobalBg ? "#fff" : "#0f172a", textAlign: "center", margin: "0 0 48px", letterSpacing: "-0.03em" }}>Preguntas Frecuentes</h2>
          <div style={{ maxWidth: 800, margin: "0 auto", display: "flex", flexDirection: "column", gap: 16 }}>
            {(activo.faqItems || []).map((faq, i) => (
              <div key={i} style={{ padding: 24, borderRadius: 16, border: "1px solid #e2e8f0", background: "#f8fafc" }}>
                <h4 style={{ fontSize: 18, fontWeight: 700, color: "#0f172a", margin: "0 0 8px" }}>{faq.q}</h4>
                <p style={{ color: "#475569", margin: 0, lineHeight: 1.6 }}>{faq.a}</p>
              </div>
            ))}
          </div>
        </div>
      );
      case "testimonials": return (
        <div key="testimonials" style={{ padding: "80px 24px", background: hasGlobalBg ? "transparent" : "#f8fafc" }}>
          <h2 style={{ fontSize: 32, fontWeight: 800, color: hasGlobalBg ? "#fff" : "#0f172a", textAlign: "center", margin: "0 0 48px", letterSpacing: "-0.03em" }}>Lo que dicen nuestros clientes</h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 24, maxWidth: 1000, margin: "0 auto" }}>
            {[
              { t: "La mejor herramienta que hemos usado. Aumentó nuestras ventas en un 40% el primer mes.", n: "María Rodríguez", r: "CEO, TechGrowth" },
              { t: "Increíblemente fácil de configurar. Nuestro equipo de ventas la adoptó desde el día uno.", n: "Carlos Gómez", r: "Director de Ventas, Innova" }
            ].map((test, i) => (
              <div key={i} style={{ background: "#fff", padding: 32, borderRadius: 20, boxShadow: "0 10px 25px -5px rgba(0,0,0,0.05)", border: "1px solid #f1f5f9" }}>
                <div style={{ fontSize: 24, color: accentRGB, marginBottom: 16 }}>"</div>
                <p style={{ fontSize: 16, color: "#334155", fontStyle: "italic", margin: "0 0 24px", lineHeight: 1.6 }}>{test.t}</p>
                <div>
                  <div style={{ fontWeight: 700, color: "#0f172a" }}>{test.n}</div>
                  <div style={{ fontSize: 14, color: "#64748b" }}>{test.r}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      );
    }
  };

  if (loading) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", gap: 16, color: T.whiteDim }}>
      <div style={{ width: 24, height: 24, border: `2px solid ${T.tealSoft}`, borderTopColor: T.teal, borderRadius: "50%", animation: "spin 1s linear infinite" }} />
      Cargando Sites...
    </div>
  );

  return (
    <div style={{ display: "flex", height: "calc(100vh - 120px)", overflow: "hidden", background: T.bg0, fontFamily: "'Inter', sans-serif" }}>
      {/* ── SIDEBAR (Site Builder) ── */}
      {!isFullScreen && (
        <div style={{ width: isSidebarCollapsed ? 0 : 380, display: isSidebarCollapsed ? "none" : "flex", flexDirection: "column", background: T.bg1, borderRight: `1px solid ${T.borderHi}`, flexShrink: 0, zIndex: 10, boxShadow: "4px 0 24px rgba(0,0,0,0.2)" }}>
        
        {/* Header */}
        <div style={{ padding: "20px 24px", borderBottom: `1px solid ${T.borderHi}`, flexShrink: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
            <div style={{ width: 32, height: 32, borderRadius: 10, background: "linear-gradient(135deg, #10b981, #059669)", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: 16 }}>🚀</div>
            <div>
              <div style={{ fontSize: 18, fontWeight: 800, color: T.white, letterSpacing: "-0.02em" }}>Site Builder</div>
              <div style={{ fontSize: 12, color: T.whiteDim }}>Landing pages de alta conversión</div>
            </div>
          </div>
          
          <div style={{ marginTop: 20, marginBottom: 12 }}>
            <div style={{ display: "flex", gap: 8, overflowX: "auto", paddingBottom: 4, scrollbarWidth: "none" }}>
              {pages.map((p) => (
                <button key={p.id} onClick={() => setActivoId(p.id)} style={{ padding: "8px 16px", borderRadius: 12, border: `1px solid ${activoId === p.id ? "#10b981" : T.borderHi}`, background: activoId === p.id ? "rgba(16, 185, 129, 0.1)" : T.bg2, color: activoId === p.id ? "#34d399" : T.whiteDim, fontSize: 13, fontWeight: activoId === p.id ? 600 : 400, cursor: "pointer", whiteSpace: "nowrap", transition: "all 0.2s" }}>
                  {p.titulo}
                </button>
              ))}
              <button onClick={() => { if(!checkPlanLimit(db, "landing_pages")) return toast.error(getPlanLimitError("landing pages")); nuevaPagina(); }} style={{ padding: "8px 16px", borderRadius: 12, border: `1px dashed ${T.borderHi}`, background: "transparent", color: T.whiteDim, fontSize: 13, cursor: "pointer", whiteSpace: "nowrap" }}>
                + Nueva
              </button>
            </div>
          </div>

          <div style={{ display: "flex", gap: 8 }}>
            <Btn variant="secundario" size="sm" onClick={() => copyLink(activo)} style={{ flex: 1, borderRadius: 10 }}>🔗 Link</Btn>
            <Btn size="sm" onClick={() => guardar()} style={{ flex: 1.5, background: "linear-gradient(135deg, #10b981, #059669)", color: "#fff", border: "none", borderRadius: 10 }} disabled={saving}>
              {saving ? "Guardando..." : "Guardar Cambios"}
            </Btn>
            {activo && <button onClick={() => setIdToDelete(activo.id)} style={{ background: "transparent", border: `1px solid rgba(239, 68, 68, 0.2)`, color: "#ef4444", borderRadius: 10, padding: "0 12px", fontSize: 14, cursor: "pointer" }}>🗑</button>}
          </div>
        </div>

        {/* Tabs */}
        {activo && (
          <div style={{ display: "flex", padding: "0 12px", borderBottom: `1px solid ${T.borderHi}`, flexShrink: 0 }}>
            {[["sections", "🧩 Secciones"], ["edit", "📝 Datos Básicos"], ["design", "✨ Estilo"]].map(([k, lbl]) => (
              <button key={k} onClick={() => setPanel(k)} style={{ flex: 1, padding: "16px 0", background: "transparent", border: "none", color: panel === k ? "#34d399" : T.whiteDim, fontWeight: panel === k ? 700 : 500, fontSize: 13, cursor: "pointer", borderBottom: `2px solid ${panel === k ? "#10b981" : "transparent"}`, transition: "all 0.2s" }}>
                {lbl}
              </button>
            ))}
          </div>
        )}

        {/* Content */}
        <div style={{ flex: 1, overflowY: "auto", padding: 20 }}>
          {!activo ? (
            <div style={{ textAlign: "center", color: T.whiteDim, fontSize: 14, marginTop: 60 }}>Selecciona o crea una Landing Page</div>
          ) : (<>

            {/* SECCIONES */}
            {panel === "sections" && (
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                
                {/* Active Blocks */}
                {(activo.blocks || []).map((blockId, idx) => {
                  const def = ALL_BLOCKS.find(b => b.id === blockId);
                  if (!def) return null;
                  const isExp = expandedBlock === blockId;
                  const isDragOver = dragOverBlock === idx;

                  return (
                    <div key={blockId} draggable onDragStart={(e) => onBlockDragStart(e, idx)} onDragEnter={() => setDragOverBlock(idx)} onDragEnd={onBlockDragEnd} onDragOver={(e) => e.preventDefault()}
                      style={{ background: isDragOver ? "rgba(16, 185, 129, 0.1)" : T.bg2, border: `1px solid ${isExp ? "#10b981" : T.borderHi}`, borderRadius: 12, overflow: "hidden", transition: "all 0.2s" }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 16px", cursor: "grab", background: isExp ? "rgba(16, 185, 129, 0.05)" : "transparent" }}>
                        <div style={{ color: T.whiteDim, padding: 4, margin: "-4px" }}>⠿</div>
                        <div style={{ width: 28, height: 28, borderRadius: 8, background: T.bg1, display: "flex", alignItems: "center", justifyContent: "center", color: T.white }}>
                          <Ico k={def.icon} size={14} />
                        </div>
                        <div style={{ flex: 1, fontWeight: 600, color: T.white, fontSize: 13 }}>{def.title}</div>
                        
                        <div style={{ display: "flex", gap: 4 }}>
                          <button onClick={() => setExpandedBlock(isExp ? null : blockId)} style={{ background: isExp ? "#10b981" : T.bg0, color: isExp ? "#fff" : T.whiteDim, border: `1px solid ${isExp ? "#10b981" : T.borderHi}`, padding: "6px 12px", borderRadius: 6, fontSize: 11, fontWeight: 700, cursor: "pointer" }}>{isExp ? "Cerrar" : "Editar"}</button>
                          <button onClick={() => toggleBloque(blockId)} style={{ background: "transparent", border: `1px solid rgba(239, 68, 68, 0.3)`, color: "#ef4444", padding: "6px", borderRadius: 6, cursor: "pointer" }}>✕</button>
                        </div>
                      </div>
                      
                      {isExp && renderBlockEditor(blockId)}
                    </div>
                  );
                })}

                <div style={{ borderTop: `1px solid ${T.borderHi}`, margin: "16px 0", paddingTop: 16 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: T.whiteDim, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 12 }}>Bloques Disponibles</div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                    {ALL_BLOCKS.filter((b) => !(activo.blocks || []).includes(b.id)).map((b) => (
                      <div key={b.id} onClick={() => toggleBloque(b.id)} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px", background: "transparent", border: `1px dashed ${T.borderHi}`, borderRadius: 10, cursor: "pointer", transition: "all 0.2s" }}>
                        <Ico k={b.icon} size={14} style={{ color: T.whiteDim }} />
                        <div style={{ flex: 1, fontSize: 12, fontWeight: 600, color: T.whiteDim }}>{b.title}</div>
                        <div style={{ color: "#10b981", fontWeight: 800 }}>+</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* EDIT BASICOS */}
            {panel === "edit" && (
              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                <IE label="Nombre Interno de la Página" value={activo.titulo} onChange={(v) => updateActivo({ titulo: v })} />
                <IE label="URL Slug" value={activo.slug} onChange={(v) => updateActivo({ slug: v.toLowerCase().replace(/[^a-z0-9-]/g, "") })} />
                <div style={{ background: T.bg2, padding: 16, borderRadius: 12, border: `1px solid ${T.borderHi}`, marginTop: 12 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: T.white, marginBottom: 4 }}>Estado de Publicación</div>
                  <div style={{ fontSize: 12, color: T.whiteDim, marginBottom: 16 }}>Controla si tu página es visible para el público.</div>
                  <button onClick={() => guardar({ ...activo, activo: !activo.activo })} style={{ width: "100%", padding: "12px", background: activo.activo ? "rgba(16, 185, 129, 0.1)" : "transparent", border: `1px solid ${activo.activo ? "#10b981" : T.borderHi}`, color: activo.activo ? "#10b981" : T.white, borderRadius: 8, fontWeight: 700, cursor: "pointer", fontSize: 13 }}>
                    {activo.activo ? "🟢 PÁGINA PÚBLICA (LIVE)" : "⚪ BORRADOR OCULTO"}
                  </button>
                </div>
              </div>
            )}

            {/* DESIGN */}
            {panel === "design" && (
              <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
                <div>
                  <div style={{ fontSize: 11, fontWeight: 600, color: T.whiteDim, marginBottom: 8 }}>Color de Marca (Acento)</div>
                  <div style={{ display: "flex", alignItems: "center", gap: 12, background: T.bg2, padding: "8px 16px", borderRadius: 12, border: `1px solid ${T.borderHi}` }}>
                    <input type="color" value={activo.accentColor || "#6366f1"} onChange={(e) => updateActivo({ accentColor: e.target.value })} style={{ width: 32, height: 32, border: "none", background: "transparent", cursor: "pointer", padding: 0 }} />
                    <span style={{ fontSize: 14, fontWeight: 600, color: T.white, fontFamily: "monospace" }}>{activo.accentColor || "#6366f1"}</span>
                  </div>
                </div>

                <div>
                  <div style={{ fontSize: 11, fontWeight: 600, color: T.whiteDim, marginBottom: 8 }}>Paletas Sugeridas</div>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 10 }}>
                    {["#6366f1", "#8b5cf6", "#ec4899", "#ef4444", "#f97316", "#f59e0b", "#10b981", "#14b8a6", "#0ea5e9", "#111827"].map((c) => (
                      <button key={c} onClick={() => updateActivo({ accentColor: c })} style={{ aspectRatio: "1", borderRadius: "50%", background: c, border: activo.accentColor === c ? "4px solid rgba(255,255,255,0.8)" : "2px solid transparent", cursor: "pointer", boxShadow: "0 4px 6px rgba(0,0,0,0.1)" }} />
                    ))}
                  </div>
                </div>
              </div>
            )}
          </>)}
        </div>
      </div>
      )}

      {/* ── CANVAS DE PREVISUALIZACIÓN ── */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", background: "#f3f4f6", overflow: "hidden" }}>
        
        {/* Topbar del canvas */}
        <div style={{ height: 60, background: T.bg1, borderBottom: `1px solid ${T.borderHi}`, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 24px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <button onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)} style={{ background: "transparent", border: "none", color: T.whiteDim, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", padding: 8, borderRadius: 8 }}>
              <Ico k={isSidebarCollapsed ? "chevron-right" : "chevron-left"} size={20} />
            </button>
            <div style={{ fontSize: 14, fontWeight: 600, color: T.white }}>Previsualización en Vivo</div>
            {activo?.imageAsBg && activo?.imageUrl && <div style={{ fontSize: 11, background: "rgba(16,185,129,0.15)", color: "#34d399", padding: "4px 8px", borderRadius: 6, fontWeight: 700 }}>Modo Canvas Activo</div>}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <button onClick={() => setIsFullScreen(!isFullScreen)} style={{ padding: "8px 16px", background: isFullScreen ? "rgba(16,185,129,0.15)" : T.bg2, border: `1px solid ${isFullScreen ? "#10b981" : T.borderHi}`, color: isFullScreen ? "#10b981" : T.white, borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer", transition: "all 0.2s" }}>
              {isFullScreen ? "Salir de Pantalla Completa" : "Pantalla Completa"}
            </button>
            <div style={{ width: 1, height: 24, background: T.borderHi, margin: "0 8px" }} />
            <button onClick={() => setPreviewMode("desktop")} style={{ padding: "8px 12px", background: previewMode === "desktop" ? T.bg3 : "transparent", border: "none", color: previewMode === "desktop" ? T.white : T.whiteDim, borderRadius: 8, cursor: "pointer" }}>💻</button>
            <button onClick={() => setPreviewMode("mobile")} style={{ padding: "8px 12px", background: previewMode === "mobile" ? T.bg3 : "transparent", border: "none", color: previewMode === "mobile" ? T.white : T.whiteDim, borderRadius: 8, cursor: "pointer" }}>📱</button>
          </div>
        </div>

        {/* Scrollable Landing Page Preview */}
        <div style={{ flex: 1, display: "flex", justifyContent: "center", background: previewMode === "mobile" ? "#cbd5e1" : "transparent", overflow: "hidden" }}>
          <div ref={canvasRef} 
               style={{ 
                 width: "100%", 
                 maxWidth: previewMode === "mobile" ? 375 : "100%", 
                 height: previewMode === "mobile" ? "calc(100vh - 120px)" : "100%",
                 margin: previewMode === "mobile" ? "20px auto" : "0",
                 borderRadius: previewMode === "mobile" ? 36 : 0,
                 boxShadow: previewMode === "mobile" ? "0 25px 50px -12px rgba(0,0,0,0.25)" : "none",
                 border: previewMode === "mobile" ? "8px solid #0f172a" : "none",
                 position: "relative", 
                 background: (activo?.imageAsBg && activo?.imageUrl) ? `url(${activo.imageUrl.split("#bg")[0]}) center/cover no-repeat` : "#f3f4f6",
                 overflowY: "auto",
                 overflowX: "hidden"
               }}
             onMouseMove={(e) => {
               if (dragElement && canvasRef.current) {
                 const rect = canvasRef.current.getBoundingClientRect();
                 const dx = ((e.clientX - dragElement.startX) / rect.width) * 100;
                 const dy = ((e.clientY - dragElement.startY) / rect.height) * 100;
                 let newX = Math.max(0, Math.min(100, dragElement.initElX + dx));
                 let newY = Math.max(0, Math.min(100, dragElement.initElY + dy));
                 updateActivo({
                   floatingElements: activo.floatingElements.map(el => 
                     el.id === dragElement.id ? { ...el, x: parseFloat(newX.toFixed(1)), y: parseFloat(newY.toFixed(1)) } : el
                   )
                 });
               }
             }}
             onMouseUp={() => setDragElement(null)}
             onMouseLeave={() => setDragElement(null)}
        >
          {activo?.imageAsBg && activo?.imageUrl && <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", zIndex: 0, pointerEvents: "none" }} />}
          {!activo || !activo.blocks || activo.blocks.length === 0 ? (
            <div style={{ height: "100%", display: "flex", alignItems: "center", justifyContent: "center", color: "#94a3b8", fontSize: 18, fontWeight: 600 }}>
              Agrega secciones desde el panel izquierdo para construir tu página.
            </div>
          ) : (
            <div style={{ fontFamily: "'Inter', sans-serif", position: "relative", zIndex: 1, minHeight: "100%" }}>
              {/* Navbar mock */}
              <nav style={{ background: "rgba(255,255,255,0.95)", backdropFilter: "blur(12px)", padding: "16px 24px", display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: "1px solid #f1f5f9", position: "sticky", top: 0, zIndex: 100 }}>
                <div style={{ fontWeight: 900, fontSize: 20, color: "#0f172a", letterSpacing: "-0.03em" }}>
                  <span style={{ color: activo.accentColor || "#6366f1" }}>●</span> {activo.titulo.split(" ")[0] || "CRM"}
                </div>
                <div style={{ background: activo.accentColor || "#6366f1", color: "#fff", padding: "10px 24px", borderRadius: 10, fontSize: 14, fontWeight: 700 }}>
                  {activo.heroCTA || "Acción"}
                </div>
              </nav>

              {/* Render Blocks */}
              {activo.blocks.map(blockId => (
                <div key={blockId} 
                     style={blockId === "floating" ? {} : { position: "relative", zIndex: 5 }}
                     onContextMenu={(e) => {
                       if (blockId === "floating") return;
                       e.preventDefault();
                       e.stopPropagation();
                       setContextMenu({ x: e.clientX, y: e.clientY, type: "block", id: blockId });
                     }}>
                  {renderCanvasBlock(blockId)}
                </div>
              ))}

              {/* Footer mock */}
              <footer style={{ padding: "32px 24px", background: "#0f172a", textAlign: "center", color: "#64748b", fontSize: 14 }}>
                © {new Date().getFullYear()} · Potenciado por <span style={{ color: activo.accentColor || "#6366f1", fontWeight: 700 }}>ENSING CRM</span>
              </footer>
            </div>
          )}
        </div>
      </div>
      </div>
      <ConfirmModal open={!!idToDelete} onClose={() => setIdToDelete(null)} onConfirm={confirmEliminar} title="¿Eliminar Página?" description="Se borrará de forma permanente." confirmText="Eliminar" variant="danger" />
      {/* ── MENÚ CONTEXTUAL ── */}
      {contextMenu && (
        <>
          <div style={{ position: "fixed", inset: 0, zIndex: 99998 }} onClick={() => setContextMenu(null)} onContextMenu={(e) => { e.preventDefault(); setContextMenu(null); }} />
          <div style={{ position: "fixed", top: Math.min(contextMenu.y, window.innerHeight - 200), left: Math.min(contextMenu.x, window.innerWidth - 220), background: "#fff", padding: 12, borderRadius: 12, boxShadow: "0 10px 40px rgba(0,0,0,0.2)", zIndex: 99999, minWidth: 200, display: "flex", flexDirection: "column", gap: 8, border: "1px solid #e2e8f0", fontFamily: "'Inter', sans-serif" }}>
            {contextMenu.type === "block" && (
              <>
                <div style={{ fontSize: 12, fontWeight: 700, color: "#64748b", textTransform: "uppercase", marginBottom: 4 }}>Sección: {contextMenu.id}</div>
                <button onClick={() => { setPanel("sections"); setExpandedBlock(contextMenu.id); setIsSidebarCollapsed(false); setContextMenu(null); }} style={{ padding: "8px 12px", background: "#f1f5f9", border: "none", borderRadius: 8, textAlign: "left", cursor: "pointer", fontWeight: 600, color: "#0f172a" }}>✏️ Editar Sección</button>
                <button onClick={() => { setIdToDelete(contextMenu.id); setContextMenu(null); }} style={{ padding: "8px 12px", background: "#fef2f2", border: "none", borderRadius: 8, textAlign: "left", cursor: "pointer", fontWeight: 600, color: "#ef4444" }}>🗑️ Eliminar</button>
              </>
            )}
            {contextMenu.type === "floating" && (
              <>
                <div style={{ fontSize: 12, fontWeight: 700, color: "#64748b", textTransform: "uppercase", marginBottom: 4 }}>Editar {contextMenu.el.type}</div>
                {contextMenu.el.type === "text" ? (
                  <textarea value={contextMenu.el.content || ""} onChange={(e) => updateActivo({ floatingElements: activo.floatingElements.map(x => x.id === contextMenu.el.id ? { ...x, content: e.target.value } : x) })} rows={2} style={{ width: "100%", padding: "8px", background: "#f8fafc", border: `1px solid #e2e8f0`, borderRadius: 6, fontSize: 12, resize: "none" }} placeholder="Escribe algo..." />
                ) : contextMenu.el.type === "button" ? (
                  <>
                    <input type="text" value={contextMenu.el.content || ""} onChange={(e) => updateActivo({ floatingElements: activo.floatingElements.map(x => x.id === contextMenu.el.id ? { ...x, content: e.target.value } : x) })} placeholder="Texto del Botón" style={{ padding: "6px", background: "#f8fafc", border: `1px solid #e2e8f0`, borderRadius: 6, fontSize: 12 }} />
                    <input type="text" value={contextMenu.el.url || ""} onChange={(e) => updateActivo({ floatingElements: activo.floatingElements.map(x => x.id === contextMenu.el.id ? { ...x, url: e.target.value } : x) })} placeholder="Enlace URL" style={{ padding: "6px", background: "#f8fafc", border: `1px solid #e2e8f0`, borderRadius: 6, fontSize: 12 }} />
                  </>
                ) : (
                  <input type="text" value={contextMenu.el.content || ""} onChange={(e) => updateActivo({ floatingElements: activo.floatingElements.map(x => x.id === contextMenu.el.id ? { ...x, content: e.target.value } : x) })} placeholder="URL de Imagen" style={{ padding: "6px", background: "#f8fafc", border: `1px solid #e2e8f0`, borderRadius: 6, fontSize: 12 }} />
                )}
                <div style={{ display: "flex", gap: 4, marginTop: 4 }}>
                  <button onClick={() => updateActivo({ floatingElements: activo.floatingElements.map(x => x.id === contextMenu.el.id ? { ...x, zIndex: -1 } : x) })} style={{ flex: 1, padding: "6px", background: contextMenu.el.zIndex === -1 ? "#e0e7ff" : "#f1f5f9", border: "none", borderRadius: 6, cursor: "pointer", fontSize: 11, fontWeight: 600 }}>Fondo</button>
                  <button onClick={() => updateActivo({ floatingElements: activo.floatingElements.map(x => x.id === contextMenu.el.id ? { ...x, zIndex: 10 } : x) })} style={{ flex: 1, padding: "6px", background: (contextMenu.el.zIndex === undefined || contextMenu.el.zIndex === 10) ? "#e0e7ff" : "#f1f5f9", border: "none", borderRadius: 6, cursor: "pointer", fontSize: 11, fontWeight: 600 }}>Medio</button>
                  <button onClick={() => updateActivo({ floatingElements: activo.floatingElements.map(x => x.id === contextMenu.el.id ? { ...x, zIndex: 50 } : x) })} style={{ flex: 1, padding: "6px", background: contextMenu.el.zIndex === 50 ? "#e0e7ff" : "#f1f5f9", border: "none", borderRadius: 6, cursor: "pointer", fontSize: 11, fontWeight: 600 }}>Frente</button>
                </div>
                <button onClick={() => { updateActivo({ floatingElements: activo.floatingElements.filter(x => x.id !== contextMenu.el.id) }); setContextMenu(null); }} style={{ padding: "6px", background: "#fef2f2", border: "none", borderRadius: 6, cursor: "pointer", fontSize: 11, fontWeight: 600, color: "#ef4444" }}>Eliminar Elemento</button>
              </>
            )}
          </div>
        </>
      )}

    </div>
  );
};
