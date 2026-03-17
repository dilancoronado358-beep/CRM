import { useState } from "react";
import { T } from "../theme";
import { uid, PRIO_CFG, fdate } from "../utils";
import { Av, Chip, Btn, Inp, Sel, Campo, Modal, Tarjeta, KPI, BuscadorBar, Vacio, EncabezadoSeccion, ControlSegmentado, Ico } from "../components/ui";

export const Empresas = ({ db, setDb, guardarEnSupa, eliminarDeSupa }) => {
  const [busqueda, setBusqueda] = useState("");
  const [vista, setVista] = useState("tarjetas");
  const [showForm, setShowForm] = useState(false);
  const [editando, setEditando] = useState(null);

  const filtrados = db.empresas.filter(e =>
    [e.nombre, e.industria, e.sitio, e.ciudad].some(v => v?.toLowerCase().includes(busqueda.toLowerCase()))
  );

  const FormEmpresa = ({ init = {}, onGuardar, onCancelar }) => {
    const [f, setF] = useState({ nombre: "", industria: "", tamaño: "1-10", sitio: "", ingresos: "<$500K", ciudad: "", ...init });
    const s = k => e => setF(p => ({ ...p, [k]: e.target.value }));
    return (
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        <Campo label="Nombre de Empresa *"><Inp value={f.nombre} onChange={s("nombre")} placeholder="Acme Inc." /></Campo>
        <Campo label="Industria"><Sel value={f.industria} onChange={s("industria")}><option>SaaS</option><option>Retail</option><option>Fintech</option><option>Salud</option><option>Manufactura</option><option>Servicios</option><option>Consultoría</option><option>Otra</option></Sel></Campo>
        <Campo label="Tamaño (empleados)"><Sel value={f.tamaño} onChange={s("tamaño")}><option>1-10</option><option>11-50</option><option>51-200</option><option>201-500</option><option>500-1000</option><option>1000+</option></Sel></Campo>
        <Campo label="Sitio Web"><Inp value={f.sitio} onChange={s("sitio")} placeholder="www.ejemplo.com" /></Campo>
        <Campo label="Ingresos Anuales"><Sel value={f.ingresos} onChange={s("ingresos")}><option>&lt;$500K</option><option>$500K-1M</option><option>$1M-5M</option><option>$5M-10M</option><option>$10M-50M</option><option>&gt;$50M</option></Sel></Campo>
        <Campo label="Sede / Ciudad"><Inp value={f.ciudad} onChange={s("ciudad")} placeholder="Ciudad, País" /></Campo>
        <div style={{ gridColumn: "span 2", display: "flex", gap: 12, justifyContent: "flex-end", paddingTop: 12 }}>
          <Btn variant="secundario" onClick={onCancelar}>Cancelar</Btn>
          <Btn onClick={() => { if (!f.nombre.trim()) return; onGuardar({ ...f, logo: f.nombre.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase() }); }}>Guardar</Btn>
        </div>
      </div>
    );
  };

  const guardar = async f => {
    const colores = [T.teal, T.green, T.amber, "#8B5CF6", "#EC4899", "#3B82F6"];
    if (editando) {
      const act = { ...editando, ...f };
      setDb(d => ({ ...d, empresas: d.empresas.map(e => e.id === editando.id ? act : e) }));
      await guardarEnSupa("empresas", act);
    } else {
      const nv = { ...f, id: "co" + uid(), color: colores[Math.floor(Math.random() * colores.length)], contactos: [], deals: [] };
      setDb(d => ({ ...d, empresas: [nv, ...d.empresas] }));
      await guardarEnSupa("empresas", nv);
    }
    setShowForm(false); setEditando(null);
  };

  const eliminar = async id => {
    if (!confirm("¿Eliminar empresa? Esto NO elimina sus contactos.")) return;
    setDb(d => ({ ...d, empresas: d.empresas.filter(e => e.id !== id) }));
    await eliminarDeSupa("empresas", id);
  };

  return (
    <div>
      <EncabezadoSeccion title="Directorio de Empresas" sub={`${db.empresas.length} organizaciones registradas`} actions={<Btn onClick={() => { setEditando(null); setShowForm(true); }}><Ico k="plus" size={14} />Nueva Empresa</Btn>} />
      
      <div style={{ display: "flex", gap: 12, marginBottom: 24, alignItems: "center" }}>
        <BuscadorBar value={busqueda} onChange={e => setBusqueda(e.target.value)} placeholder="Buscar empresas..." />
        <ControlSegmentado value={vista} onChange={setVista} options={[{ value: "tarjetas", label: "Tarjetas", icon: "grid" }, { value: "lista", label: "Lista", icon: "list" }]} />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(320px,1fr))", gap: 20 }}>
        {filtrados.map(emp => (
          <Tarjeta key={emp.id} style={{ display: "flex", flexDirection: "column", padding: 24, transition: "all .2s" }} onMouseEnter={e => { e.currentTarget.style.borderColor = emp.color; e.currentTarget.style.boxShadow = "0 8px 25px rgba(0,0,0,0.06)"; }} onMouseLeave={e => { e.currentTarget.style.borderColor = T.border; e.currentTarget.style.boxShadow = "0 1px 3px rgba(0,0,0,0.05)"; }}>
            <div style={{ display: "flex", gap: 16, alignItems: "center", marginBottom: 20 }}>
              <div style={{ width: 56, height: 56, borderRadius: 14, background: emp.color + "15", border: `2px solid ${emp.color}30`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, fontWeight: 800, color: emp.color, flexShrink: 0 }}>{emp.logo}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 18, fontWeight: 800, color: T.white, marginBottom: 4, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{emp.nombre}</div>
                {emp.sitio && <a href={`https://${emp.sitio}`} target="_blank" rel="noreferrer" style={{ fontSize: 13, color: T.teal, textDecoration: "none", fontWeight: 600 }}>{emp.sitio}</a>}
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <Btn variant="secundario" size="sm" onClick={() => { setEditando(emp); setShowForm(true); }}><Ico k="edit" size={13} /></Btn>
                <Btn variant="fantasma" size="sm" onClick={() => eliminar(emp.id)}><Ico k="trash" size={13} style={{ color: T.red }} /></Btn>
              </div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px 16px", marginBottom: 24, fontSize: 13 }}>
              <div><span style={{ color: T.whiteDim, fontWeight: 600 }}>Industria:</span> <span style={{ color: T.whiteOff }}>{emp.industria}</span></div>
              <div><span style={{ color: T.whiteDim, fontWeight: 600 }}>Tamaño:</span> <span style={{ color: T.whiteOff }}>{emp.tamaño}</span></div>
              <div><span style={{ color: T.whiteDim, fontWeight: 600 }}>Ingresos:</span> <span style={{ color: T.whiteOff }}>{emp.ingresos}</span></div>
              <div><span style={{ color: T.whiteDim, fontWeight: 600 }}>Sede:</span> <span style={{ color: T.whiteOff }}>{emp.ciudad || "No definída"}</span></div>
            </div>
            <div style={{ display: "flex", gap: 12, marginTop: "auto", borderTop: `1px solid ${T.borderHi}`, paddingTop: 16 }}>
              <div style={{ flex: 1, textAlign: "center", borderRight: `1px solid ${T.borderHi}` }}>
                <div style={{ fontSize: 22, fontWeight: 800, color: T.white }}>{db.contactos.filter(c => c.empresa === emp.nombre).length}</div>
                <div style={{ fontSize: 11, color: T.whiteDim, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".05em" }}>Contactos</div>
              </div>
              <div style={{ flex: 1, textAlign: "center" }}>
                <div style={{ fontSize: 22, fontWeight: 800, color: T.white }}>{db.deals.filter(d => d.empresa_id === emp.id).length}</div>
                <div style={{ fontSize: 11, color: T.whiteDim, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".05em" }}>Deals</div>
              </div>
            </div>
          </Tarjeta>
        ))}
      </div>
      
      {filtrados.length === 0 && <Vacio text="No se encontraron empresas con esos criterios." />}
      <Modal open={showForm} onClose={() => { setShowForm(false); setEditando(null); }} title={editando ? "Editar Empresa" : "Nueva Empresa"} width={500}><FormEmpresa init={editando || {}} onGuardar={guardar} onCancelar={() => { setShowForm(false); setEditando(null); }} /></Modal>
    </div>
  );
};
