import { useState, useMemo } from "react";
import { T } from "../theme";
import { uid, money, fdate } from "../utils";
import { Btn, Inp, Campo, Modal, EncabezadoSeccion, Ico, KPI, Vacio } from "../components/ui";
import { sileo } from "../utils/sileo";

// ─── Configuración Premium de Tipos ──────────────────────────────────────────
const TIPOS = {
  ropa: {
    label: "Ropa & Moda", emoji: "👗", color: "#A78BFA", bg: "rgba(167,139,250,0.12)",
    categorias: ["Camisetas", "Pantalones", "Vestidos", "Chaquetas", "Zapatos", "Accesorios", "Ropa Interior", "Ropa Deportiva", "Faldas", "Shorts", "Abrigos"],
  },
  alimentos: {
    label: "Alimentos & Bebidas", emoji: "🛒", color: "#34D399", bg: "rgba(52,211,153,0.12)",
    categorias: ["Frutas & Verduras", "Carnes & Aves", "Lácteos & Huevos", "Panadería & Repostería", "Bebidas", "Snacks & Dulces", "Congelados", "Granos & Cereales", "Condimentos & Salsas", "Mariscos", "Embutidos"],
  },
  otro: {
    label: "Otro", emoji: "📦", color: "#94A3B8", bg: "rgba(148,163,184,0.1)",
    categorias: ["General", "Electrónica", "Hogar", "Belleza", "Salud", "Deportes", "Juguetes", "Librería"],
  },
};

const TALLAS  = ["XS","S","M","L","XL","XXL","Única","28","30","32","34","36","38","40","42","44"];
const COLORES = ["Negro","Blanco","Azul","Rojo","Verde","Amarillo","Gris","Rosa","Morado","Café","Naranja","Multicolor"];
const UNIDADES_ALIMENTO = ["Unidad","Kg","Gr","Litro","Ml","Paquete","Caja","Bolsa","Docena","Bandeja"];

const getTipo = (p) => {
  const t = p?.tipo || "";
  return TIPOS[t] ? t : "otro";
};

const defaultF = { 
  tipo: "", sku: "", nombre: "", descripcion: "", imagen_url: "", 
  precio: 0, precio_costo: 0, stock: 0, stock_minimo: 5, 
  categoria: "General", talla: "", color: "", unidad: "Unidad", 
  peso_volumen: "", fecha_vencimiento: "", refrigerado: false, 
  activo: true, destacado: false 
};

// ─── Componentes de UI ────────────────────────────────────────────────────────
const FormProducto = ({ f, setF, editando, onGuardar, onCancelar, guardando }) => {
  const s = k => e => setF(p => ({ ...p, [k]: e.target.type === "checkbox" ? e.target.checked : e.target.value }));
  const t = TIPOS[f.tipo] || TIPOS.otro;
  const selStyle = { width: "100%", background: T.bg2, border: `1px solid ${T.borderHi}`, borderRadius: 10, padding: "10px 14px", fontSize: 13, color: T.white, outline: "none" };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, padding: 16, background: t.bg, borderRadius: 12, border: `1px solid ${t.color}30` }}>
        <span style={{ fontSize: 24 }}>{t.emoji}</span>
        <div>
          <div style={{ fontSize: 14, fontWeight: 800, color: t.color }}>{t.label}</div>
          <div style={{ fontSize: 11, color: T.whiteDim }}>Completa los detalles del producto</div>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        <Campo label="Código SKU *"><Inp value={f.sku} onChange={s("sku")} placeholder="SKU-001" /></Campo>
        <Campo label="Nombre *"><Inp value={f.nombre} onChange={s("nombre")} placeholder="Nombre..." /></Campo>
        
        <Campo label="Categoría">
          <select value={f.categoria} onChange={s("categoria")} style={selStyle}>
            {t.categorias.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </Campo>
        
        <Campo label="Precio Venta ($)"><Inp type="number" value={f.precio} onChange={s("precio")} /></Campo>

        {f.tipo === "ropa" && (
          <>
            <Campo label="Talla">
              <select value={f.talla} onChange={s("talla")} style={selStyle}>
                <option value="">N/A</option>
                {TALLAS.map(val => <option key={val} value={val}>{val}</option>)}
              </select>
            </Campo>
            <Campo label="Color">
              <select value={f.color} onChange={s("color")} style={selStyle}>
                <option value="">N/A</option>
                {COLORES.map(val => <option key={val} value={val}>{val}</option>)}
              </select>
            </Campo>
          </>
        )}

        <Campo label="Stock Actual"><Inp type="number" value={f.stock} onChange={s("stock")} /></Campo>
        <Campo label="Stock Mínimo"><Inp type="number" value={f.stock_minimo} onChange={s("stock_minimo")} /></Campo>
      </div>

      <div style={{ display: "flex", gap: 12, justifyContent: "flex-end", marginTop: 10 }}>
        <Btn variant="secundario" onClick={onCancelar} disabled={guardando}>Cancelar</Btn>
        <Btn onClick={onGuardar} disabled={guardando}>{guardando ? "⏳ Guardando..." : "💾 Guardar"}</Btn>
      </div>
    </div>
  );
};

export const Tienda = ({ db, setDb, guardarEnSupa, eliminarDeSupa }) => {
  const [tab, setTab] = useState("todos");
  const [showForm, setShowForm] = useState(false);
  const [editando, setEditando] = useState(null);
  const [f, setF] = useState(defaultF);
  const [guardando, setGuardando] = useState(false);

  const productos = db?.productos || [];

  const filtrados = useMemo(() => {
    if (tab === "todos") return productos;
    return productos.filter(p => getTipo(p) === tab);
  }, [productos, tab]);

  const guardar = async () => {
    if (!f.nombre || !f.sku) return sileo.error("Nombre y SKU obligatorios");
    setGuardando(true);
    try {
      // 1. Limpieza de Payload ANTI-ERRORES
      // Recorremos el objeto y convertimos "" en null para evitar fallos en la base de datos
      const payload = { ...f, id: editando?.id || "prd_" + uid(), org_id: db?.usuario?.org_id };
      
      Object.keys(payload).forEach(key => {
        // Convertir campos vacíos a null (fundamental para tipos DATE en SQL)
        if (payload[key] === "") payload[key] = null;
        
        // Asegurar que campos numéricos sean números
        if (["precio", "precio_costo", "stock", "stock_minimo"].includes(key)) {
          payload[key] = parseFloat(payload[key]) || 0;
        }
      });
      
      const { error, data } = await guardarEnSupa("productos", payload);
      if (error) throw error;
      
      sileo.success("¡Catálogo actualizado!");
      setShowForm(false); setEditando(null); setF(defaultF);
    } catch (e) {
      console.error(e);
      window.alert("ERROR DE SUPABASE: " + (e.message || JSON.stringify(e)));
      sileo.error("No se pudo guardar");
    } finally {
      setGuardando(false);
    }
  };

  const eliminar = async (id) => {
    if (!window.confirm("¿Eliminar este producto?")) return;
    setDb(d => ({ ...d, productos: d.productos.filter(p => p.id !== id) }));
    await eliminarDeSupa("productos", id);
    sileo.success("Eliminado");
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      <EncabezadoSeccion title="🛍️ Tienda Elite" sub="Gestión de inventario y catálogo" actions={<Btn onClick={() => { setF(defaultF); setShowForm(true); }}>+ Nuevo Producto</Btn>} />

      <div style={{ display: "flex", gap: 10, borderBottom: `1px solid ${T.borderHi}`, paddingBottom: 10 }}>
        {["todos", "ropa", "alimentos", "otro"].map(id => (
          <button key={id} onClick={() => setTab(id)} style={{ background: tab === id ? T.tealSoft : "transparent", color: tab === id ? T.teal : T.whiteDim, border: "none", padding: "8px 16px", borderRadius: 10, cursor: "pointer", fontWeight: 700, fontSize: 13 }}>
            {id === "todos" ? "📦 Todos" : id === "ropa" ? "👗 Ropa" : id === "alimentos" ? "🛒 Alimentos" : "📁 Otros"}
          </button>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 20 }}>
        {filtrados.length === 0 ? <Vacio text="No hay productos registrados" /> : filtrados.map(p => {
          const t = TIPOS[getTipo(p)] || TIPOS.otro;
          return (
            <div key={p.id} style={{ background: T.bg1, border: `1px solid ${T.borderHi}`, borderRadius: 20, overflow: "hidden", position: "relative" }}>
              <div style={{ height: 120, background: t.bg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 48 }}>{t.emoji}</div>
              <div style={{ padding: 20 }}>
                <div style={{ fontSize: 11, fontWeight: 800, color: t.color, textTransform: "uppercase", marginBottom: 4 }}>{p.categoria}</div>
                <div style={{ fontSize: 16, fontWeight: 800, color: T.white, marginBottom: 8 }}>{p.nombre}</div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div style={{ fontSize: 20, fontWeight: 900, color: T.green }}>{money(p.precio)}</div>
                  <div style={{ fontSize: 12, color: T.whiteDim }}>Stock: <b>{p.stock}</b></div>
                </div>
                <div style={{ display: "flex", gap: 8, marginTop: 15 }}>
                  <Btn size="sm" variant="fantasma" full onClick={() => { setEditando(p); setF({...defaultF, ...p, tipo: getTipo(p)}); setShowForm(true); }}>Editar</Btn>
                  <button onClick={() => eliminar(p.id)} style={{ background: "transparent", border: "none", color: T.red, cursor: "pointer" }}><Ico k="trash" size={16} /></button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <Modal open={showForm} onClose={() => setShowForm(false)} title={editando ? "Editar Producto" : "Nuevo Producto"} width={500}>
         {!f.tipo ? (
           <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
             {Object.entries(TIPOS).map(([k, v]) => (
               <button key={k} onClick={() => setF({...f, tipo: k, categoria: v.categorias[0]})} style={{ padding: 20, borderRadius: 16, background: v.bg, border: `1px solid ${v.color}30`, cursor: "pointer", textAlign: "center" }}>
                  <div style={{ fontSize: 32 }}>{v.emoji}</div>
                  <div style={{ color: v.color, fontWeight: 800, fontSize: 13, marginTop: 8 }}>{v.label}</div>
               </button>
             ))}
           </div>
         ) : (
           <FormProducto f={f} setF={setF} editando={editando} onGuardar={guardar} onCancelar={() => setShowForm(false)} guardando={guardando} />
         )}
      </Modal>
    </div>
  );
};
