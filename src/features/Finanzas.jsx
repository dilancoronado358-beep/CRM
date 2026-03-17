import { useState, useMemo } from "react";
import { T } from "../theme";
import { money, uid, fdate } from "../utils";
import { Btn, Ico, Tarjeta, Modal, Inp, Sel, EncabezadoSeccion, KPI } from "../components/ui";

export const Finanzas = ({ db, guardarEnSupa, eliminarDeSupa }) => {
  const [showGastoModal, setShowGastoModal] = useState(false);
  const [fGasto, setFGasto] = useState({ deal_id: "", categoria: "Publicidad", descripcion: "", monto: 0 });

  const gastos = db.finanzas_gastos || [];
  const comisiones = db.finanzas_comisiones || [];
  const deals = db.deals || [];

  if (db.usuario?.role !== "admin") {
    return (
      <div style={{ padding: 40, textAlign: "center" }}>
        <Ico k="lock" size={64} style={{ color: T.red, marginBottom: 20 }} />
        <h2 style={{ color: T.white }}>Acceso Denegado</h2>
        <p style={{ color: T.whiteDim }}>Solo los administradores pueden ver la información financiera.</p>
      </div>
    );
  }

  const totalGastos = useMemo(() => gastos.reduce((acc, g) => acc + (Number(g.monto) || 0), 0), [gastos]);
  const totalComisiones = useMemo(() => comisiones.reduce((acc, c) => acc + (Number(c.monto) || 0), 0), [comisiones]);
  const totalVentas = useMemo(() => deals.filter(d => d.etapa_id?.toLowerCase().includes("won") || d.status === "won").reduce((acc, d) => acc + (Number(d.valor) || 0), 0), [deals]);

  const margenNeto = totalVentas - totalGastos - totalComisiones;

  const handleGuardarGasto = async () => {
    if (!fGasto.monto) return alert("Por favor, ingresa un monto válido.");
    
    // Preparar payload: deal_id vacío debe ser null para evitar errores de FK
    const payload = { 
      ...fGasto, 
      id: "gst" + uid(), 
      deal_id: fGasto.deal_id || null,
      creado: new Date().toISOString() 
    };
    
    await guardarEnSupa("finanzas_gastos", payload);
    setShowGastoModal(false);
    setFGasto({ deal_id: "", categoria: "Publicidad", descripcion: "", monto: 0 });
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 32 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <EncabezadoSeccion title="Control Financiero" sub="Rentabilidad, Comisiones y Gastos Operativos" />
        <Btn onClick={() => setShowGastoModal(true)} variant="primario"><Ico k="plus" size={14} /> Registrar Gasto</Btn>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 20 }}>
        <KPI label="Ventas Totales (Bruto)" value={money(totalVentas)} color={T.teal} icon="trend" />
        <KPI label="Gastos Operativos" value={money(totalGastos)} color={T.red} icon="arrow" />
        <KPI label="Comisiones x Pagar" value={money(totalComisiones)} color={T.amber} icon="users" />
        <KPI label="Margen Neto (ROI)" value={money(margenNeto)} color={T.green} icon="star" sub={`${totalVentas > 0 ? Math.round((margenNeto / totalVentas) * 100) : 0}% rentabilidad`} />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1.5fr 1fr", gap: 24 }}>
        <Tarjeta title="Gastos Recientes" style={{ padding: 24 }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ textAlign: "left", borderBottom: `1px solid ${T.borderHi}`, color: T.whiteDim, fontSize: 12 }}>
                <th style={{ padding: "12px 8px" }}>Categoría</th>
                <th>Descripción</th>
                <th>Monto</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {gastos.map(g => (
                <tr key={g.id} style={{ borderBottom: `1px solid ${T.border}`, fontSize: 13, color: T.white }}>
                  <td style={{ padding: "12px 8px" }}><div style={{ background: T.bg2, padding: "4px 8px", borderRadius: 6, display: "inline-block", fontSize: 11, fontWeight: 700 }}>{g.categoria}</div></td>
                  <td>{g.descripcion}</td>
                  <td style={{ fontWeight: 700, color: T.red }}>-{money(g.monto)}</td>
                  <td><Btn variant="fantasma" size="xs" onClick={() => eliminarDeSupa("finanzas_gastos", g.id)} style={{ color: T.red }}><Ico k="trash" size={14} /></Btn></td>
                </tr>
              ))}
              {gastos.length === 0 && <tr><td colSpan={4} style={{ textAlign: "center", padding: 40, color: T.whiteDim }}>No hay gastos registrados.</td></tr>}
            </tbody>
          </table>
        </Tarjeta>

        <Tarjeta title="Comisiones Pendientes" style={{ padding: 24 }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {comisiones.map(c => {
              const vendedor = db.usuariosApp?.find(u => u.id === c.vendedor_id);
              return (
                <div key={c.id} style={{ padding: 16, background: T.bg2, borderRadius: 12, border: `1px solid ${T.borderHi}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div>
                    <div style={{ fontWeight: 800, color: T.white }}>{vendedor?.name || "Vendedor"}</div>
                    <div style={{ fontSize: 11, color: T.whiteDim }}>Deal: {db.deals?.find(d => d.id === c.deal_id)?.name || "N/A"}</div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontWeight: 800, color: T.amber }}>{money(c.monto)}</div>
                    <div style={{ fontSize: 10, color: T.whiteDim, textTransform: "uppercase" }}>{c.status}</div>
                  </div>
                </div>
              );
            })}
            {comisiones.length === 0 && <div style={{ textAlign: "center", padding: 40, color: T.whiteDim }}>No hay comisiones por liquidar.</div>}
          </div>
        </Tarjeta>
      </div>

      {showGastoModal && (
        <Modal open={true} title="Nuevo Gasto" onClose={() => setShowGastoModal(false)}>
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            <div>
              <label style={{ fontSize: 11, fontWeight: 700, color: T.whiteDim }}>VINCULAR A NEGOCIO (OPCIONAL)</label>
              <Sel value={fGasto.deal_id} onChange={e => setFGasto({...fGasto, deal_id: e.target.value})}>
                <option value="">Gasto General (Sin Deal)</option>
                {deals.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
              </Sel>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div>
                <label style={{ fontSize: 11, fontWeight: 700, color: T.whiteDim }}>CATEGORÍA</label>
                <Sel value={fGasto.categoria} onChange={e => setFGasto({...fGasto, categoria: e.target.value})}>
                  <option>Publicidad</option>
                  <option>Viáticos</option>
                  <option>Software</option>
                  <option>Legales</option>
                  <option>Otros</option>
                </Sel>
              </div>
              <div>
                <label style={{ fontSize: 11, fontWeight: 700, color: T.whiteDim }}>MONTO</label>
                <Inp type="number" value={fGasto.monto} onChange={e => setFGasto({...fGasto, monto: Number(e.target.value)})} />
              </div>
            </div>
            <div>
              <label style={{ fontSize: 11, fontWeight: 700, color: T.whiteDim }}>DESCRIPCIÓN</label>
              <Inp value={fGasto.descripcion} onChange={e => setFGasto({...fGasto, descripcion: e.target.value})} placeholder="Ej: Campaña Facebook Ads Marzo" />
            </div>
            <div style={{ display: "flex", gap: 12, marginTop: 10 }}>
              <Btn variant="secundario" onClick={() => setShowGastoModal(false)} full>Cancelar</Btn>
              <Btn onClick={handleGuardarGasto} full style={{ background: T.teal, color: "#000" }}>Guardar Gasto</Btn>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
