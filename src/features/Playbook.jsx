import { useState } from "react";
import { T } from "../theme";
import { uid, fdate } from "../utils";
import { Btn, Ico, Tarjeta, Modal, Inp } from "../components/ui";

export const Playbook = ({ db, guardarEnSupa, eliminarDeSupa, t }) => {
  const [busqueda, setBusqueda] = useState("");
  const [articuloseleccionado, setArticuloSeleccionado] = useState(null);
  const [editando, setEditando] = useState(false);
  const [form, setForm] = useState({ titulo: "", contenido: "", categoria: "Ventas" });

  const articulos = (db.sales_playbook || []).filter(a => 
    a.titulo.toLowerCase().includes(busqueda.toLowerCase()) || 
    a.contenido.toLowerCase().includes(busqueda.toLowerCase())
  );

  const isAdmin = db.usuario?.role === "admin";

  const abrirNuevo = () => {
    setForm({ titulo: "", contenido: "", categoria: "Ventas" });
    setEditando(true);
    setArticuloSeleccionado(null);
  };

  const abrirEditar = (a) => {
    setForm(a);
    setEditando(true);
  };

  const guardar = async () => {
    const final = {
      ...form,
      id: form.id || "pb" + uid(),
      creado: form.creado || new Date().toISOString()
    };
    await guardarEnSupa("sales_playbook", final);
    setEditando(false);
    setArticuloSeleccionado(final);
  };

  const eliminar = async (id) => {
    if (confirm("¿Seguro que deseas eliminar este artículo del Playbook?")) {
      await eliminarDeSupa("sales_playbook", id);
      setArticuloSeleccionado(null);
    }
  };

  return (
    <div style={{ display: "flex", gap: 24, height: "calc(100vh - 180px)" }}>
      {/* SIDEBAR DE ARTÍCULOS */}
      <div style={{ width: 320, display: "flex", flexDirection: "column", gap: 16 }}>
        <div style={{ position: "relative" }}>
          <Ico k="search" size={14} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: T.whiteDim }} />
          <Inp 
            placeholder="Buscar en el Playbook..." 
            value={busqueda} 
            onChange={e => setBusqueda(e.target.value)} 
            style={{ paddingLeft: 34 }}
          />
        </div>

        <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", gap: 8 }}>
          {articulos.map(a => (
            <div 
              key={a.id} 
              onClick={() => { setArticuloSeleccionado(a); setEditando(false); }}
              style={{ 
                padding: "12px 16px", 
                borderRadius: 10, 
                background: articuloseleccionado?.id === a.id ? T.tealSoft : T.bg1, 
                cursor: "pointer",
                border: `1px solid ${articuloseleccionado?.id === a.id ? T.teal : T.border}`,
                transition: "all .2s"
              }}
            >
              <div style={{ fontSize: 13, fontWeight: 700, color: articuloseleccionado?.id === a.id ? T.teal : T.white }}>{a.titulo}</div>
              <div style={{ fontSize: 11, color: T.whiteDim, marginTop: 4 }}>{a.categoria} • {fdate(a.creado)}</div>
            </div>
          ))}
          {articulos.length === 0 && (
            <div style={{ textAlign: "center", padding: 40, color: T.whiteDim, fontSize: 13 }}>No se encontraron artículos.</div>
          )}
        </div>

        {isAdmin && (
          <Btn onClick={abrirNuevo} full><Ico k="plus" size={14} /> Nuevo Artículo</Btn>
        )}
      </div>

      {/* CONTENIDO DEL ARTÍCULO */}
      <Tarjeta style={{ flex: 1, padding: 40, overflowY: "auto", background: T.bg1, position: "relative" }}>
        {editando ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ fontSize: 18, fontWeight: 800, color: T.white }}>{form.id ? "Editar Artículo" : "Nuevo Artículo del Playbook"}</div>
              <div style={{ display: "flex", gap: 12 }}>
                <Btn variant="secundario" onClick={() => setEditando(false)}>Cancelar</Btn>
                <Btn onClick={guardar}>Guardar Playbook</Btn>
              </div>
            </div>
            
            <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 16 }}>
              <Inp 
                placeholder="Título del artículo" 
                value={form.titulo} 
                onChange={e => setForm({ ...form, titulo: e.target.value })} 
                style={{ fontSize: 18, fontWeight: 700 }}
              />
              <select 
                value={form.categoria} 
                onChange={e => setForm({ ...form, categoria: e.target.value })}
                style={{ background: T.bg2, color: T.white, border: `1px solid ${T.border}`, borderRadius: 10, padding: 12, outline: "none" }}
              >
                <option value="Ventas">Ventas</option>
                <option value="Onboarding">Onboarding</option>
                <option value="Producto">Producto</option>
                <option value="Objeciones">Objeciones</option>
                <option value="Scripts">Scripts</option>
              </select>
            </div>

            <textarea 
              placeholder="Escribe el contenido aquí (puedes usar Markdown)..."
              value={form.contenido}
              onChange={e => setForm({ ...form, contenido: e.target.value })}
              style={{ 
                flex: 1, 
                minHeight: 400, 
                background: T.bg2, 
                color: T.white, 
                border: `1px solid ${T.border}`, 
                borderRadius: 12, 
                padding: 20, 
                fontFamily: "inherit", 
                fontSize: 15, 
                lineHeight: 1.6, 
                resize: "none",
                outline: "none" 
              }}
            />
          </div>
        ) : articuloseleccionado ? (
          <div style={{ position: "relative" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 32 }}>
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, color: T.teal, textTransform: "uppercase", letterSpacing: ".1em", marginBottom: 8 }}>{articuloseleccionado.categoria}</div>
                <div style={{ fontSize: 32, fontWeight: 900, color: T.white, letterSpacing: "-.02em" }}>{articuloseleccionado.titulo}</div>
                <div style={{ fontSize: 13, color: T.whiteDim, marginTop: 12 }}>Actualizado el {fdate(articuloseleccionado.creado)}</div>
              </div>
              {isAdmin && (
                <div style={{ display: "flex", gap: 8 }}>
                  <Btn variant="fantasma" size="sm" onClick={() => abrirEditar(articuloseleccionado)}><Ico k="edit" size={14} /></Btn>
                  <Btn variant="fantasma" size="sm" onClick={() => eliminar(articuloseleccionado.id)} style={{ color: T.red }}><Ico k="trash" size={14} /></Btn>
                </div>
              )}
            </div>

            <div style={{ 
              fontSize: 16, 
              color: T.whiteOff, 
              lineHeight: 1.8, 
              whiteSpace: "pre-wrap",
              background: T.bg2,
              padding: 32,
              borderRadius: 20,
              border: `1px solid ${T.borderHi}`
            }}>
              {articuloseleccionado.contenido}
            </div>
          </div>
        ) : (
          <div style={{ height: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 20, color: T.whiteDim }}>
            <div style={{ width: 80, height: 80, borderRadius: "50%", background: T.bg2, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Ico k="note" size={40} />
            </div>
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: 18, fontWeight: 800, color: T.white }}>Selecciona un artículo</div>
              <div style={{ fontSize: 14, marginTop: 8 }}>Explora el conocimiento interno del equipo de ventas</div>
            </div>
          </div>
        )}
      </Tarjeta>
    </div>
  );
};
