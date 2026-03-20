import { useState } from "react";
import { T } from "../theme";
import { uid, money, fdate, ESTADO_CFG } from "../utils";
import { Av, Chip, Btn, Inp, Sel, Campo, Modal, Tarjeta, CabeceraTabla, FilaTabla, Celda, Barra, AnilloScore, BuscadorBar, Vacio, EncabezadoSeccion, ControlSegmentado, Ico } from "../components/ui";

export const Contactos = ({ db, setDb, guardarEnSupa, eliminarDeSupa }) => {
  const [busqueda, setBusqueda] = useState("");
  const [estadoF, setEstadoF] = useState("todos");
  const [vista, setVista] = useState("tabla");
  const [showForm, setShowForm] = useState(false);
  const [editando, setEditando] = useState(null);
  const [detalle, setDetalle] = useState(null);

  const filtrados = db.contactos.filter(c =>
    (estadoF === "todos" || c.estado === estadoF) &&
    [c.nombre, c.email, c.empresa, c.cargo].some(v => v?.toLowerCase().includes(busqueda.toLowerCase()))
  );

  const FormContacto = ({ init = {}, onGuardar, onCancelar }) => {
    const [f, setF] = useState({ nombre: "", email: "", telefono: "", empresa: "", cargo: "", estado: "lead", fuente: "Web", valor: 0, score: 50, etiquetas: "", notas: "", ...init, etiquetas: (init.etiquetas || []).join(", ") });
    const s = k => e => setF(p => ({ ...p, [k]: e.target.value }));
    return (
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        <Campo label="Nombre completo *"><Inp value={f.nombre} onChange={s("nombre")} placeholder="Ana García" /></Campo>
        <Campo label="Email"><Inp value={f.email} onChange={s("email")} placeholder="ana@empresa.com" /></Campo>
        <Campo label="Teléfono"><Inp value={f.telefono} onChange={s("telefono")} placeholder="+52 55 1234 5678" /></Campo>
        <Campo label="Empresa"><Inp value={f.empresa} onChange={s("empresa")} placeholder="Nombre empresa" /></Campo>
        <Campo label="Cargo"><Inp value={f.cargo} onChange={s("cargo")} placeholder="CEO, Dir. Marketing..." /></Campo>
        <Campo label="Estado"><Sel value={f.estado} onChange={s("estado")}><option value="lead">Lead</option><option value="prospecto">Prospecto</option><option value="cliente">Cliente</option><option value="inactivo">Inactivo</option></Sel></Campo>
        <Campo label="Valor potencial ($)"><Inp type="number" value={f.valor} onChange={s("valor")} /></Campo>
        <Campo label="Lead Score (0-100)"><Inp type="number" value={f.score} onChange={s("score")} /></Campo>
        <Campo label="Fuente"><Sel value={f.fuente} onChange={s("fuente")}><option>Web</option><option>LinkedIn</option><option>Referido</option><option>Evento</option><option>Llamada fría</option><option>Email</option><option>Otro</option></Sel></Campo>
        <Campo label="Etiquetas (separadas por coma)"><Inp value={f.etiquetas} onChange={s("etiquetas")} placeholder="vip, tech, startup" /></Campo>
        <Campo label="Notas" col={2}><Inp value={f.notas} onChange={s("notas")} rows={3} placeholder="Observaciones..." /></Campo>
        <div style={{ gridColumn: "span 2", display: "flex", gap: 12, justifyContent: "flex-end", paddingTop: 12 }}>
          <Btn variant="secundario" onClick={onCancelar}>Cancelar</Btn>
          <Btn onClick={() => {
            if (!f.nombre.trim()) return;
            onGuardar({ ...f, valor: +f.valor, score: +f.score, etiquetas: f.etiquetas.split(",").map(t => t.trim()).filter(Boolean), avatar: f.nombre.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase() });
          }}>Guardar Contacto</Btn>
        </div>
      </div>
    );
  };

  const guardar = async (form) => {
    const colores = [T.teal, T.green, T.amber, "#8B5CF6", "#EC4899", "#3B82F6"];
    if (editando) {
      const actualizado = { ...editando, ...form };
      setDb(d => ({ ...d, contactos: d.contactos.map(c => c.id === editando.id ? actualizado : c) }));
      await guardarEnSupa("contactos", actualizado);
    } else {
      const nuevo = { ...form, id: "c" + uid(), color: colores[Math.floor(Math.random() * colores.length)], creado: new Date().toISOString().slice(0, 10), ultimo_contacto: new Date().toISOString().slice(0, 10) };
      setDb(d => ({ ...d, contactos: [nuevo, ...d.contactos] }));
      await guardarEnSupa("contactos", nuevo);
    }
    setShowForm(false); setEditando(null);
  };

  const eliminar = async (id) => {
    if (!confirm("¿Eliminar contacto?")) return;
    setDb(d => ({ ...d, contactos: d.contactos.filter(c => c.id !== id) }));
    await eliminarDeSupa("contactos", id);
  };

  return (
    <div>
      <EncabezadoSeccion title="Contactos" sub={`${db.contactos.length} contactos en total`}
        actions={<Btn onClick={() => { setEditando(null); setShowForm(true); }}><Ico k="plus" size={14} />Nuevo Contacto</Btn>} />

      <div style={{ display: "flex", gap: 8, marginBottom: 20, flexWrap: "wrap" }}>
        {[["todos", "Todos"], ["cliente", "Clientes"], ["lead", "Leads"], ["prospecto", "Prospectos"], ["inactivo", "Inactivos"]].map(([k, label]) => (
          <button key={k} onClick={() => setEstadoF(k)}
            style={{ padding: "6px 16px", borderRadius: 20, border: `1px solid ${estadoF === k ? (ESTADO_CFG[k]?.color || T.teal) : T.border}`, background: estadoF === k ? ((ESTADO_CFG[k]?.color || T.teal).startsWith("#") ? (ESTADO_CFG[k]?.color || T.teal) + "15" : (ESTADO_CFG[k]?.color || T.teal)) : T.bg1, color: estadoF === k ? (ESTADO_CFG[k]?.color || T.teal) : T.whiteDim, fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", transition: "all .2s" }}
            onMouseEnter={e => { if (estadoF !== k) e.currentTarget.style.background = T.bg2; }}
            onMouseLeave={e => { if (estadoF !== k) e.currentTarget.style.background = T.bg1; }}>
            {label} <span style={{ opacity: .6, marginLeft: 6 }}>{k === "todos" ? db.contactos.length : db.contactos.filter(c => c.estado === k).length}</span>
          </button>
        ))}
      </div>

      <div style={{ display: "flex", gap: 12, marginBottom: 20, alignItems: "center" }}>
        <BuscadorBar value={busqueda} onChange={e => setBusqueda(e.target.value)} placeholder="Buscar por nombre, email, empresa..." />
        <ControlSegmentado value={vista} onChange={setVista} options={[{ value: "tabla", label: "Lista", icon: "list" }, { value: "tarjetas", label: "Tarjetas", icon: "grid" }]} />
      </div>

      {vista === "tabla" && (
        <Tarjeta>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <CabeceraTabla cols={["Contacto", "Empresa", "Estado", "Score", "Valor", "Fuente", "Últ. Contacto", ""]} />
            <tbody>
              {filtrados.map(c => {
                const ec = ESTADO_CFG[c.estado] || ESTADO_CFG.lead;
                return (
                  <FilaTabla key={c.id} onClick={() => setDetalle(c)}>
                    <Celda><div style={{ display: "flex", gap: 12, alignItems: "center" }}><Av text={c.avatar} color={c.color} size={36} fs={13} /><div><div style={{ fontWeight: 700, color: T.white, fontSize: 13 }}>{c.nombre}</div><div style={{ fontSize: 11, color: T.whiteDim }}>{c.email}</div></div></div></Celda>
                    <Celda><div style={{ fontSize: 13, fontWeight: 600 }}>{c.empresa}</div><div style={{ fontSize: 11, color: T.whiteDim }}>{c.cargo}</div></Celda>
                    <Celda><Chip label={ec.label} color={ec.color} bg={ec.bg} /></Celda>
                    <Celda><AnilloScore score={c.score} size={36} /></Celda>
                    <Celda style={{ fontWeight: 800, color: T.green }}>{money(c.valor)}</Celda>
                    <Celda><span style={{ fontSize: 12, color: T.whiteOff }}>{c.fuente}</span></Celda>
                    <Celda style={{ fontSize: 12, color: T.whiteDim }}>{fdate(c.ultimo_contacto)}</Celda>
                    <Celda><div style={{ display: "flex", gap: 6 }} onClick={e => e.stopPropagation()}>
                      <Btn variant="secundario" size="sm" onClick={() => { setEditando(c); setShowForm(true); }}><Ico k="edit" size={14} /></Btn>
                      <Btn variant="fantasma" size="sm" onClick={() => eliminar(c.id)}><Ico k="trash" size={14} style={{ color: T.red }} /></Btn>
                    </div></Celda>
                  </FilaTabla>
                );
              })}
              {filtrados.length === 0 && <tr><td colSpan={8}><Vacio text="No se encontraron contactos" /></td></tr>}
            </tbody>
          </table>
        </Tarjeta>
      )}

      {vista === "tarjetas" && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(280px,1fr))", gap: 16 }}>
          {filtrados.map(c => {
            const ec = ESTADO_CFG[c.estado] || ESTADO_CFG.lead;
            return (
              <Tarjeta key={c.id} onClick={() => setDetalle(c)} style={{ padding: 20, cursor: "pointer", transition: "all .2s", display: "flex", flexDirection: "column" }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = c.color.startsWith("#") ? c.color + "60" : c.color; e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.boxShadow = "0 10px 25px rgba(0,0,0,0.05)"; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = T.border; e.currentTarget.style.transform = ""; e.currentTarget.style.boxShadow = "0 1px 3px rgba(0,0,0,0.05)"; }}>
                <div style={{ display: "flex", gap: 12, marginBottom: 16, alignItems: "flex-start" }}>
                  <Av text={c.avatar} color={c.color} size={48} fs={16} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 800, color: T.white, fontSize: 15, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.nombre}</div>
                    <div style={{ fontSize: 12, color: T.whiteDim, fontWeight: 500 }}>{c.cargo}</div>
                  </div>
                  <AnilloScore score={c.score} size={36} />
                </div>
                <div style={{ fontSize: 12, color: T.whiteOff, marginBottom: 6, display: "flex", alignItems: "center", gap: 6 }}><Ico k="building" size={14} style={{ color: T.whiteDim }} /> {c.empresa}</div>
                <div style={{ fontSize: 12, color: T.whiteDim, marginBottom: 16, display: "flex", alignItems: "center", gap: 6 }}><Ico k="mail" size={14} style={{ color: T.whiteDim }} /> {c.email}</div>
                <div style={{ marginTop: "auto", display: "flex", justifyContent: "space-between", alignItems: "center", paddingTop: 14, borderTop: `1px solid ${T.border}` }}>
                  <Chip label={ec.label} color={ec.color} bg={ec.bg} />
                  <span style={{ fontSize: 15, fontWeight: 800, color: T.green }}>{money(c.valor)}</span>
                </div>
              </Tarjeta>
            );
          })}
        </div>
      )}

      <Modal open={showForm} onClose={() => { setShowForm(false); setEditando(null); }} title={editando ? "Editar Contacto" : "Nuevo Contacto"} width={720}>
        <FormContacto init={editando || {}} onGuardar={guardar} onCancelar={() => { setShowForm(false); setEditando(null); }} />
      </Modal>

      <Modal open={!!detalle} onClose={() => setDetalle(null)} title="Detalle del Contacto" width={740}>
        {detalle && (
          <div>
            <div style={{ display: "flex", gap: 18, marginBottom: 24, alignItems: "flex-start" }}>
              <Av text={detalle.avatar} color={detalle.color} size={68} fs={24} />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 24, fontWeight: 800, color: T.white, marginBottom: 4 }}>{detalle.nombre}</div>
                <div style={{ fontSize: 14, color: T.whiteOff, marginBottom: 12 }}>{detalle.cargo} en <strong style={{ color: T.white }}>{detalle.empresa}</strong></div>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>{(detalle.etiquetas || []).map(t => <Chip key={t} label={t} color={T.teal} />)}</div>
              </div>
              <AnilloScore score={detalle.score} size={60} />
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
              <Tarjeta style={{ padding: 20 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: T.whiteDim, textTransform: "uppercase", letterSpacing: ".05em", marginBottom: 16 }}>Información</div>
                {[["phone", detalle.telefono, "Teléfono"], ["mail", detalle.email, "Email"], ["calendar", fdate(detalle.creado), "Creado"], ["star", detalle.fuente, "Fuente"]].map(([icon, val, lbl]) => (
                  <div key={lbl} style={{ display: "flex", gap: 12, marginBottom: 12, alignItems: "center" }}>
                    <div style={{ width: 32, height: 32, borderRadius: 8, background: T.tealSoft, color: T.teal, display: "flex", alignItems: "center", justifyContent: "center" }}><Ico k={icon} size={15} /></div>
                    <div><div style={{ fontSize: 11, color: T.whiteDim }}>{lbl}</div><div style={{ fontSize: 13, fontWeight: 600, color: T.white }}>{val || "—"}</div></div>
                  </div>
                ))}
              </Tarjeta>
              <Tarjeta style={{ padding: 20 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: T.whiteDim, textTransform: "uppercase", letterSpacing: ".05em", marginBottom: 16 }}>Financiero</div>
                <div style={{ fontSize: 32, fontWeight: 800, color: detalle.color, marginBottom: 6 }}>{money(detalle.valor)}</div>
                <div style={{ fontSize: 13, color: T.whiteDim, marginBottom: 20 }}>Valor potencial del contacto</div>
                <Barra value={detalle.score} color={detalle.score >= 80 ? T.green : detalle.score >= 50 ? T.amber : T.red} h={8} />
                <div style={{ fontSize: 12, fontWeight: 600, color: T.whiteDim, marginTop: 8 }}>Score de Calificación: <span style={{ color: T.white }}>{detalle.score}/100</span></div>
              </Tarjeta>
            </div>
            {detalle.notas && <Tarjeta style={{ padding: 16, marginBottom: 16, background: T.tealGlow, borderColor: "rgba(20, 184, 166, 0.2)" }}><div style={{ fontSize: 11, fontWeight: 700, color: T.teal, textTransform: "uppercase", letterSpacing: ".05em", marginBottom: 8 }}>Notas</div><div style={{ fontSize: 13, color: T.whiteOff, lineHeight: 1.7 }}>{detalle.notas}</div></Tarjeta>}
            <div style={{ display: "flex", gap: 12, justifyContent: "flex-end", marginTop: 24, paddingTop: 16, borderTop: `1px solid ${T.border}` }}>
              <Btn variant="secundario" onClick={() => setDetalle(null)}>Cerrar</Btn>
              <Btn onClick={() => { setEditando(detalle); setDetalle(null); setShowForm(true); }}><Ico k="edit" size={14} />Editar Contacto</Btn>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};
