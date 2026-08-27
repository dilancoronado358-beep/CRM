import { useState } from "react";
import { T } from "../theme";
import { uid, money, fdate } from "../utils";
import { Av, Chip, Btn, Inp, Sel, Celda, CabeceraTabla, FilaTabla, Campo, Modal, Tarjeta, KPI, BuscadorBar, Vacio, EncabezadoSeccion, Ico } from "../components/ui";

export const Productos = ({ db, setDb, guardarEnSupa, eliminarDeSupa }) => {
  const [busqueda, setBusqueda] = useState("");
  const [fCat, setFCat] = useState("todas");
  const [showForm, setShowForm] = useState(false);
  const [editando, setEditando] = useState(null);
  const [f, setF] = useState({ sku: "", nombre: "", descripcion: "", precio: 0, categoria: "Suscripción", activo: true });

  const s = k => e => setF(p => ({ ...p, [k]: e.target.type === "checkbox" ? e.target.checked : e.target.value }));

  const productos = db.productos || [];

  const filtrados = productos.filter(p =>
    (fCat === "todas" || p.categoria === fCat) &&
    (p.nombre.toLowerCase().includes(busqueda.toLowerCase()) || p.sku.toLowerCase().includes(busqueda.toLowerCase()))
  );

  const totalActivos = filtrados.filter(p => p.activo).length;
  const cats = [...new Set(productos.map(p => p.categoria))].filter(Boolean);

  const guardar = async () => {
    if (!f.nombre.trim() || !f.sku.trim()) return;
    if (editando) {
      const act = { ...editando, ...f, precio: +f.precio };
      setDb(d => ({ ...d, productos: d.productos.map(p => p.id === editando.id ? act : p) }));
      await guardarEnSupa("productos", act);
    } else {
      const nv = { ...f, precio: +f.precio, id: "prd" + uid(), creado: new Date().toISOString() };
      setDb(d => ({ ...d, productos: [nv, ...productos] }));
      await guardarEnSupa("productos", nv);
    }
    setShowForm(false); setEditando(null); setF({ sku: "", nombre: "", descripcion: "", precio: 0, categoria: "Suscripción", activo: true });
  };
  
  const eliminar = async id => {
    if (!confirm("¿Eliminar producto del catálogo?")) return;
    setDb(d => ({ ...d, productos: productos.filter(p => p.id !== id) }));
    await eliminarDeSupa("productos", id);
  };

  return (
    <div>
      <EncabezadoSeccion title="Catálogo de Productos" sub={`${totalActivos} productos/servicios activos para cotizar`}
        actions={<Btn onClick={() => { setEditando(null); setF({ sku: "", nombre: "", descripcion: "", precio: 0, categoria: "Suscripción", activo: true }); setShowForm(true); }}><Ico k="plus" size={14} />Nuevo Producto</Btn>} />
      
      <div style={{ display: "flex", gap: 16, marginBottom: 24, flexWrap: "wrap", alignItems: "center" }}>
        <BuscadorBar value={busqueda} onChange={e => setBusqueda(e.target.value)} placeholder="Buscar por nombre o SKU..." />
        <Sel value={fCat} onChange={e => setFCat(e.target.value)} style={{ width: 220 }}>
          <option value="todas">Todas las categorías</option>
          {cats.map(c => <option key={c} value={c}>{c}</option>)}
        </Sel>
      </div>

      <Tarjeta>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <CabeceraTabla cols={["Código (SKU)", "Producto / Servicio", "Precio Unitario", "Categoría", "Estado", ""]} />
          <tbody>
            {filtrados.map(p => (
              <FilaTabla key={p.id}>
                <Celda style={{ fontWeight: 800, color: T.teal, fontFamily: "monospace", fontSize: 13 }}>{p.sku}</Celda>
                <Celda>
                  <div style={{ fontWeight: 700, color: T.white, fontSize: 14, marginBottom: 4 }}>{p.nombre}</div>
                  <div style={{ fontSize: 12, color: T.whiteDim, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 300 }}>{p.descripcion}</div>
                </Celda>
                <Celda style={{ fontWeight: 800, color: T.green, fontSize: 15 }}>{money(p.precio)}</Celda>
                <Celda><Chip label={p.categoria} color={T.amber} /></Celda>
                <Celda>{p.activo ? <Chip label="Activo" color={T.teal} /> : <Chip label="Inactivo" color={T.whiteDim} />}</Celda>
                <Celda>
                  <div style={{ display: "flex", gap: 6 }}>
                    <Btn variant="fantasma" size="sm" onClick={() => { setEditando(p); setF({ sku: p.sku, nombre: p.nombre, descripcion: p.descripcion, precio: p.precio, categoria: p.categoria, activo: p.activo }); setShowForm(true); }}><Ico k="edit" size={14} /></Btn>
                    <Btn variant="fantasma" size="sm" onClick={() => eliminar(p.id)}><Ico k="trash" size={14} style={{ color: T.red }} /></Btn>
                  </div>
                </Celda>
              </FilaTabla>
            ))}
            {filtrados.length === 0 && <tr><td colSpan={6}><Vacio text="No se encontraron productos en el catálogo." /></td></tr>}
          </tbody>
        </table>
      </Tarjeta>

      <Modal open={showForm} onClose={() => { setShowForm(false); setEditando(null); }} title={editando ? "Editar Producto" : "Nuevo Producto"} width={600}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          <Campo label="Código SKU *"><Inp value={f.sku} onChange={s("sku")} placeholder="Ej. LCF-PRO-1Y" style={{ fontFamily: "monospace" }} /></Campo>
          <Campo label="Nombre del Producto *"><Inp value={f.nombre} onChange={s("nombre")} /></Campo>
          <Campo label="Descripción Corta" col={2}><Inp value={f.descripcion} onChange={s("descripcion")} rows={2} /></Campo>
          <Campo label="Precio Unitario ($) *"><Inp type="number" value={f.precio} onChange={s("precio")} /></Campo>
          <Campo label="Categoría"><Inp value={f.categoria} onChange={s("categoria")} placeholder="Suscripción, Servicio, Hardware..." /></Campo>
        </div>
        <div style={{ marginTop: 16, display: "flex", alignItems: "center", gap: 8 }}>
          <input type="checkbox" id="activo" checked={f.activo} onChange={s("activo")} style={{ accentColor: T.teal }} />
          <label htmlFor="activo" style={{ fontSize: 13, color: T.whiteOff, cursor: "pointer" }}>Producto Activo (Visible para cotizar)</label>
        </div>
        <div style={{ display: "flex", gap: 12, justifyContent: "flex-end", marginTop: 24 }}>
          <Btn variant="secundario" onClick={() => { setShowForm(false); setEditando(null); }}>Cancelar</Btn>
          <Btn onClick={guardar} disabled={!f.nombre.trim() || !f.sku.trim() || f.precio < 0}>Guardar Producto</Btn>
        </div>
      </Modal>
    </div>
  );
};
