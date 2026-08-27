import { useState, useEffect } from "react";
import { T } from "../theme";
import { money, uid, fdate } from "../utils";
import { Btn, Ico, Tarjeta, Modal, Inp } from "../components/ui";

export const Cotizaciones = ({ db, deal, onCerrar, guardarEnSupa }) => {
  const [showForm, setShowForm] = useState(false);
  const [cotizacion, setCotizacion] = useState(null);
  const [nuevaCot, setNuevaCot] = useState({
    numero: `COT-${Math.floor(1000 + Math.random() * 9000)}`,
    fecha: new Date().toISOString().slice(0, 10),
    items: [{ desc: "", qty: 1, precio: 0 }],
    estado: "borrador"
  });

  const cotsDeal = (db.cotizaciones || []).filter(c => c.deal_id === deal.id);

  const calculateTotal = (items) => items.reduce((s, it) => s + (it.qty * it.precio), 0);

  const agregarItem = () => {
    setNuevaCot(prev => ({ ...prev, items: [...prev.items, { desc: "", qty: 1, precio: 0 }] }));
  };

  const updateItem = (idx, key, val) => {
    const next = [...nuevaCot.items];
    next[idx][key] = val;
    setNuevaCot(prev => ({ ...prev, items: next }));
  };

  const guardar = async () => {
    const final = {
      ...nuevaCot,
      id: "cot" + uid(),
      deal_id: deal.id,
      total: calculateTotal(nuevaCot.items)
    };
    await guardarEnSupa("cotizaciones", final);
    setShowForm(false);
  };

  const imprimir = (c) => {
    const win = window.open("", "_blank");
    win.document.write(`
      <html>
        <head>
          <title>Cotización ${c.numero}</title>
          <style>
            body { font-family: sans-serif; padding: 40px; color: #333; }
            .header { display: flex; justify-content: space-between; border-bottom: 2px solid #EEE; padding-bottom: 20px; margin-bottom: 30px; }
            .logo { font-size: 24px; fontWeight: 900; color: #2563EB; }
            .info { margin-bottom: 40px; }
            table { width: 100%; border-collapse: collapse; }
            th { text-align: left; background: #F9FAFB; padding: 12px; border-bottom: 1px solid #EEE; }
            td { padding: 12px; border-bottom: 1px solid #EEE; }
            .total { text-align: right; font-size: 20px; font-weight: 800; margin-top: 30px; color: #10B981; }
            .footer { margin-top: 50px; font-size: 12px; color: #999; text-align: center; }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="logo">ENSIN<span style="color: #10B981">G</span> CRM</div>
            <div style="text-align: right">
              <div style="font-size: 20px; font-weight: 800">COTIZACIÓN</div>
              <div style="color: #666">#${c.numero}</div>
            </div>
          </div>
          <div class="info">
            <div><strong>Cliente:</strong> ${db.contactos.find(ct => ct.id === deal.contacto_id)?.nombre || "N/A"}</div>
            <div><strong>Proyecto:</strong> ${deal.titulo}</div>
            <div><strong>Fecha:</strong> ${fdate(c.fecha)}</div>
          </div>
          <table>
            <thead>
              <tr>
                <th>Descripción</th>
                <th>Cant.</th>
                <th>Precio</th>
                <th>Subtotal</th>
              </tr>
            </thead>
            <tbody>
              ${c.items.map(it => `
                <tr>
                  <td>${it.desc}</td>
                  <td>${it.qty}</td>
                  <td>$${it.precio.toLocaleString()}</td>
                  <td>$${(it.qty * it.precio).toLocaleString()}</td>
                </tr>
              `).join("")}
            </tbody>
          </table>
          <div class="total">Total: $${c.total.toLocaleString()}</div>
          <div class="footer">Gracias por su confianza. Esta cotización es válida por 15 días.</div>
          <script>window.print();</script>
        </body>
      </html>
    `);
    win.document.close();
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16, padding: 20 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ fontWeight: 800, color: T.white }}>Presupuestos y Cotizaciones</div>
        <Btn size="sm" onClick={() => setShowForm(true)}><Ico k="plus" size={14} /> Nueva Cotización</Btn>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {cotsDeal.map(c => (
          <Tarjeta key={c.id} style={{ padding: 16, display: "flex", justifyContent: "space-between", alignItems: "center", background: T.bg2 }}>
            <div>
              <div style={{ fontWeight: 700, color: T.white }}>{c.numero}</div>
              <div style={{ fontSize: 12, color: T.whiteDim }}>{fdate(c.fecha)} • {c.items.length} items</div>
            </div>
            <div style={{ textAlign: "right", display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{ fontWeight: 800, color: T.green }}>{money(c.total)}</div>
              <Btn variant="fantasma" size="xs" onClick={() => imprimir(c)}><Ico k="print" size={14} /></Btn>
            </div>
          </Tarjeta>
        ))}
        {cotsDeal.length === 0 && <div style={{ textAlign: "center", padding: 40, color: T.whiteDim, fontSize: 13, border: `1px dashed ${T.borderHi}`, borderRadius: 12 }}>No hay cotizaciones para este deal.</div>}
      </div>

      {showForm && (
        <Modal title="Crear Nueva Cotización" onClose={() => setShowForm(false)}>
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div>
                <label style={{ fontSize: 11, color: T.whiteDim, fontWeight: 700 }}>NÚMERO</label>
                <Inp value={nuevaCot.numero} onChange={e => setNuevaCot({ ...nuevaCot, numero: e.target.value })} />
              </div>
              <div>
                <label style={{ fontSize: 11, color: T.whiteDim, fontWeight: 700 }}>FECHA</label>
                <Inp type="date" value={nuevaCot.fecha} onChange={e => setNuevaCot({ ...nuevaCot, fecha: e.target.value })} />
              </div>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <label style={{ fontSize: 11, color: T.whiteDim, fontWeight: 700 }}>ITEMS</label>
              {nuevaCot.items.map((it, i) => (
                <div key={i} style={{ display: "grid", gridTemplateColumns: "2fr 0.5fr 1fr", gap: 8 }}>
                  <Inp placeholder="Descripción" value={it.desc} onChange={e => updateItem(i, "desc", e.target.value)} />
                  <Inp type="number" placeholder="Cant." value={it.qty} onChange={e => updateItem(i, "qty", +e.target.value)} />
                  <Inp type="number" placeholder="Precio" value={it.precio} onChange={e => updateItem(i, "precio", +e.target.value)} />
                </div>
              ))}
              <Btn variant="fantasma" size="sm" onClick={agregarItem}><Ico k="plus" size={12} /> Agregar Línea</Btn>
            </div>

            <div style={{ padding: 16, background: T.bg1, borderRadius: 12, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontWeight: 700, color: T.whiteDim }}>TOTAL ESTIMADO</span>
              <span style={{ fontSize: 20, fontWeight: 900, color: T.green }}>{money(calculateTotal(nuevaCot.items))}</span>
            </div>

            <div style={{ display: "flex", gap: 12 }}>
              <Btn variant="secundario" onClick={() => setShowForm(false)} full>Cancelar</Btn>
              <Btn onClick={guardar} full style={{ background: T.teal, color: "#000" }}>Guardar y Generar</Btn>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
