import { useState, useMemo } from "react";
import { T } from "../theme";
import { uid, money, fdate } from "../utils";
import { Btn, Inp, Sel, Campo, Modal, Tarjeta, EncabezadoSeccion, Ico, KPI, Chip, Vacio } from "../components/ui";
import { sileo } from "../utils/sileo";

const ESTADOS = {
  borrador:  { label: "Borrador",  color: T.whiteDim,  bg: "rgba(255,255,255,0.08)", icon: "note"    },
  pendiente: { label: "Pendiente", color: "#F59E0B",   bg: "rgba(245,158,11,0.12)", icon: "bell"    },
  pagada:    { label: "Pagada",    color: "#10B981",   bg: "rgba(16,185,129,0.12)", icon: "check"   },
  vencida:   { label: "Vencida",  color: "#EF4444",   bg: "rgba(239,68,68,0.12)",  icon: "lightning"},
  anulada:   { label: "Anulada",  color: T.whiteDim,  bg: "rgba(255,255,255,0.05)", icon: "x"      },
};

const METODOS_PAGO = ["Efectivo", "Transferencia", "Tarjeta de Crédito", "Tarjeta de Débito", "Cheque", "PayPal", "Otro"];
const IVA_OPTS = [0, 5, 8, 12, 14, 15, 16, 19, 21];

const defaultF = {
  cliente_nombre: "", cliente_email: "", cliente_cedula: "", cliente_telefono: "",
  fecha_emision: new Date().toISOString().slice(0, 10),
  fecha_vencimiento: new Date(Date.now() + 15 * 86400000).toISOString().slice(0, 10),
  metodo_pago: "Transferencia", notas: "", iva_pct: 14,
  estado: "borrador",
};

const defaultItem = { descripcion: "", cantidad: 1, precio_unitario: 0, descuento: 0 };

const generarNumFactura = (facturas) => {
  const max = facturas.reduce((mx, f) => {
    const n = parseInt((f.numero || "0").replace(/\D/g, ""), 10);
    return n > mx ? n : mx;
  }, 0);
  return `FAC-${String(max + 1).padStart(5, "0")}`;
};

export const Facturacion = ({ db, setDb, guardarEnSupa, eliminarDeSupa }) => {
  const [tab, setTab] = useState("lista");
  const [showForm, setShowForm] = useState(false);
  const [editando, setEditando] = useState(null);
  const [f, setF] = useState(defaultF);
  const [items, setItems] = useState([{ ...defaultItem }]);
  const [busqueda, setBusqueda] = useState("");
  const [filtroEstado, setFiltroEstado] = useState("todos");
  const [showViewer, setShowViewer] = useState(null);
  const [activeRow, setActiveRow] = useState(null);

  const facturas = db.facturas || [];
  const productos = db.productos || [];
  const contactos = db.contactos || [];

  // TOTALES
  const calcTotales = (its, iva) => {
    const subtotal = its.reduce((acc, i) => {
      const base = (Number(i.cantidad) || 0) * (Number(i.precio_unitario) || 0);
      const desc = (base * (Number(i.descuento) || 0)) / 100;
      return acc + base - desc;
    }, 0);
    const ivaAmt = subtotal * (Number(iva) / 100);
    return { subtotal, ivaAmt, total: subtotal + ivaAmt };
  };

  const { subtotal, ivaAmt, total } = useMemo(() => calcTotales(items, f.iva_pct), [items, f.iva_pct]);

  // KPIs
  const totalPagadas = useMemo(() => facturas.filter(f => f.estado === "pagada").reduce((a, f) => a + (f.total || 0), 0), [facturas]);
  const totalPendientes = useMemo(() => facturas.filter(f => f.estado === "pendiente").length, [facturas]);
  const totalVencidas = useMemo(() => facturas.filter(f => f.estado === "vencida").length, [facturas]);
  const totalEmitidas = facturas.length;

  const filtradas = useMemo(() => facturas.filter(f =>
    (filtroEstado === "todos" || f.estado === filtroEstado) &&
    ((f.numero || "").toLowerCase().includes(busqueda.toLowerCase()) ||
     (f.cliente_nombre || "").toLowerCase().includes(busqueda.toLowerCase()))
  ).sort((a, b) => new Date(b.creado || 0) - new Date(a.creado || 0)), [facturas, filtroEstado, busqueda]);

  // Buscar contacto por cédula / RUC y autocompletar
  const buscarPorCedula = (cedula) => {
    setF(p => ({ ...p, cliente_cedula: cedula }));
    if (cedula.length < 5) return;
    const match = contactos.find(
      c => (c.cedula || c.ruc || "").replace(/\s/g, "") === cedula.replace(/\s/g, "")
    );
    if (match) {
      setF(p => ({
        ...p,
        cliente_cedula: cedula,
        cliente_nombre:   match.nombre    || p.cliente_nombre,
        cliente_email:    match.email     || p.cliente_email,
        cliente_telefono: match.telefono  || p.cliente_telefono,
        _contacto_id: match.id,
      }));
      sileo.success(`✅ Contacto encontrado: ${match.nombre}`);
    }
  };

  const guardar = async () => {
    if (!f.cliente_nombre.trim()) return sileo.error("El nombre del cliente es obligatorio.");
    if (items.filter(i => i.descripcion.trim()).length === 0) return sileo.error("Agrega al menos un ítem.");
    const { subtotal, ivaAmt, total } = calcTotales(items, f.iva_pct);
    const payload = {
      ...f, items: items.filter(i => i.descripcion.trim()),
      subtotal, iva_amount: ivaAmt, total,
      org_id: db.usuario?.org_id,
    };
    if (editando) {
      const act = { ...editando, ...payload };
      setDb(d => ({ ...d, facturas: (d.facturas || []).map(f => f.id === editando.id ? act : f) }));
      await guardarEnSupa("facturas", act);
      sileo.success("Factura actualizada ✅");
    } else {
      const nv = { ...payload, id: "fac_" + uid(), numero: generarNumFactura(facturas), creado: new Date().toISOString() };
      setDb(d => ({ ...d, facturas: [nv, ...(d.facturas || [])] }));
      await guardarEnSupa("facturas", nv);

      // ── Crear contacto automáticamente si no existe ──────────────────
      const yaExiste = contactos.find(
        c => (c.cedula || c.ruc || "") === f.cliente_cedula ||
             (c.email || "").toLowerCase() === f.cliente_email.toLowerCase() ||
             c.id === f._contacto_id
      );
      if (!yaExiste && f.cliente_nombre.trim()) {
        const nuevoContacto = {
          id:       "cnt_" + uid(),
          nombre:   f.cliente_nombre.trim(),
          email:    f.cliente_email   || "",
          telefono: f.cliente_telefono || "",
          cedula:   f.cliente_cedula  || "",
          tipo:     "Cliente",
          fuente:   "Facturación",
          creado:   new Date().toISOString(),
          org_id:   db.usuario?.org_id,
        };
        setDb(d => ({ ...d, contactos: [nuevoContacto, ...(d.contactos || [])] }));
        await guardarEnSupa("contactos", nuevoContacto);
        sileo.info(`👤 Contacto "${f.cliente_nombre}" creado automáticamente.`);
      }
      sileo.success(`Factura ${nv.numero} creada 📄`);
    }
    setShowForm(false); setEditando(null); setF(defaultF); setItems([{ ...defaultItem }]);
  };

  const cambiarEstado = async (factura, nuevoEstado) => {
    const act = { ...factura, estado: nuevoEstado };
    setDb(d => ({ ...d, facturas: (d.facturas || []).map(f => f.id === factura.id ? act : f) }));
    await guardarEnSupa("facturas", act);
    sileo.success(`Factura marcada como ${ESTADOS[nuevoEstado]?.label}`);
  };

  const eliminar = async (id) => {
    if (!confirm("¿Eliminar esta factura?")) return;
    setDb(d => ({ ...d, facturas: (d.facturas || []).filter(f => f.id !== id) }));
    await eliminarDeSupa("facturas", id);
    sileo.success("Factura eliminada.");
  };

  const abrirEditar = (fac) => {
    setEditando(fac);
    setF({
      cliente_nombre: fac.cliente_nombre || "", cliente_email: fac.cliente_email || "",
      cliente_cedula: fac.cliente_cedula || "", cliente_telefono: fac.cliente_telefono || "",
      fecha_emision: fac.fecha_emision || new Date().toISOString().slice(0, 10),
      fecha_vencimiento: fac.fecha_vencimiento || "",
      metodo_pago: fac.metodo_pago || "Transferencia",
      notas: fac.notas || "", iva_pct: fac.iva_pct ?? 12, estado: fac.estado || "borrador",
    });
    setItems(fac.items?.length ? fac.items : [{ ...defaultItem }]);
    setShowForm(true);
  };

  const imprimir = (fac) => {
    const { subtotal, ivaAmt, total } = calcTotales(fac.items || [], fac.iva_pct || 12);
    const html = `
      <html><head><meta charset="utf-8"><title>Factura ${fac.numero}</title>
      <style>
        body { font-family: Arial, sans-serif; color: #1e293b; margin: 0; padding: 32px; }
        .header { display: flex; justify-content: space-between; margin-bottom: 32px; }
        .logo { font-size: 24px; font-weight: 900; color: #0D9488; }
        .badge { background: ${ESTADOS[fac.estado]?.bg || "#f0f0f0"}; color: ${ESTADOS[fac.estado]?.color || "#000"}; padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: 700; text-transform: uppercase; }
        table { width: 100%; border-collapse: collapse; margin: 20px 0; font-size: 13px; }
        th { background: #f1f5f9; padding: 10px; text-align: left; font-size: 11px; text-transform: uppercase; color: #64748b; }
        td { padding: 10px; border-bottom: 1px solid #e2e8f0; }
        .total-section { margin-top: 24px; border-top: 2px solid #0D9488; padding-top: 16px; text-align: right; }
        .total-line { display: flex; justify-content: flex-end; gap: 32px; margin-bottom: 8px; font-size: 14px; }
        .grand-total { font-size: 20px; font-weight: 900; color: #0D9488; }
        .client-box { background: #f8fafc; border-radius: 10px; padding: 16px; margin-bottom: 24px; }
      </style></head>
      <body>
        <div class="header">
          <div>
            <div class="logo">Ensing CRM</div>
            <div style="font-size:12px;color:#64748b;margin-top:4px;">Sistema de Gestión Empresarial</div>
          </div>
          <div style="text-align:right;">
            <div style="font-size:22px;font-weight:800;">FACTURA</div>
            <div style="font-size:18px;color:#0D9488;font-weight:900;">${fac.numero}</div>
            <div class="badge">${ESTADOS[fac.estado]?.label || fac.estado}</div>
          </div>
        </div>
        <div style="display:flex;gap:24px;margin-bottom:24px;">
          <div class="client-box" style="flex:1;">
            <div style="font-size:11px;font-weight:700;color:#64748b;margin-bottom:8px;">CLIENTE</div>
            <div style="font-size:16px;font-weight:800;">${fac.cliente_nombre}</div>
            ${fac.cliente_cedula ? `<div style="font-size:12px;color:#64748b;">CI/RUC: ${fac.cliente_cedula}</div>` : ""}
            ${fac.cliente_email ? `<div style="font-size:12px;color:#64748b;">${fac.cliente_email}</div>` : ""}
            ${fac.cliente_telefono ? `<div style="font-size:12px;color:#64748b;">${fac.cliente_telefono}</div>` : ""}
          </div>
          <div class="client-box" style="flex:1;">
            <div style="font-size:11px;font-weight:700;color:#64748b;margin-bottom:8px;">DETALLES</div>
            <div style="font-size:12px;margin-bottom:4px;"><b>Emisión:</b> ${fac.fecha_emision}</div>
            ${fac.fecha_vencimiento ? `<div style="font-size:12px;margin-bottom:4px;"><b>Vence:</b> ${fac.fecha_vencimiento}</div>` : ""}
            <div style="font-size:12px;"><b>Método:</b> ${fac.metodo_pago}</div>
          </div>
        </div>
        <table>
          <thead><tr><th>Descripción</th><th>Cant.</th><th>P. Unitario</th><th>Desc.</th><th>Subtotal</th></tr></thead>
          <tbody>
            ${(fac.items || []).map(i => {
              const base = (i.cantidad || 0) * (i.precio_unitario || 0);
              const dsc = base * ((i.descuento || 0) / 100);
              return `<tr><td>${i.descripcion}</td><td>${i.cantidad}</td><td>$${Number(i.precio_unitario).toFixed(2)}</td><td>${i.descuento || 0}%</td><td>$${(base - dsc).toFixed(2)}</td></tr>`;
            }).join("")}
          </tbody>
        </table>
        <div class="total-section">
          <div class="total-line"><span>Subtotal:</span><span>$${subtotal.toFixed(2)}</span></div>
          <div class="total-line"><span>IVA (${fac.iva_pct || 0}%):</span><span>$${ivaAmt.toFixed(2)}</span></div>
          <div class="total-line grand-total"><span>TOTAL:</span><span>$${total.toFixed(2)}</span></div>
        </div>
        ${fac.notas ? `<div style="margin-top:24px;padding:12px;background:#f8fafc;border-radius:8px;font-size:12px;color:#64748b;"><b>Notas:</b> ${fac.notas}</div>` : ""}
      </body></html>
    `;
    const w = window.open("", "_blank");
    w.document.write(html);
    w.document.close();
    w.print();
  };

  const agregarItemDesdeProducto = (prod) => {
    setItems(prev => [...prev, { descripcion: prod.nombre, cantidad: 1, precio_unitario: prod.precio, descuento: 0 }]);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      <EncabezadoSeccion
        title="🧾 Facturación"
        sub={`${totalEmitidas} facturas emitidas · ${totalPendientes} pendientes · ${totalVencidas} vencidas`}
        actions={
          <Btn onClick={() => { setEditando(null); setF(defaultF); setItems([{ ...defaultItem }]); setShowForm(true); }}>
            <Ico k="plus" size={14} /> Nueva Factura
          </Btn>
        }
      />

      {/* KPIs */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 16 }}>
        <KPI label="Total Facturado (pagado)" value={money(totalPagadas)} color={T.green} icon="dollar" />
        <KPI label="Facturas Emitidas" value={totalEmitidas} color={T.teal} icon="note" />
        <KPI label="Pendientes de Pago" value={totalPendientes} color="#F59E0B" icon="bell" />
        <KPI label="Vencidas / En mora" value={totalVencidas} color={T.red} icon="lightning" />
      </div>

      {/* Filtros */}
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
        <input value={busqueda} onChange={e => setBusqueda(e.target.value)} placeholder="🔍 Buscar por número o cliente..."
          style={{ background: T.bg2, border: `1px solid ${T.borderHi}`, borderRadius: 10, padding: "9px 14px", fontSize: 13, color: T.white, outline: "none", width: 260, fontFamily: "inherit" }} />
        <div style={{ display: "flex", gap: 6 }}>
          {["todos", ...Object.keys(ESTADOS)].map(est => (
            <button key={est} onClick={() => setFiltroEstado(est)}
              style={{ padding: "7px 14px", borderRadius: 20, border: "none", fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "inherit",
                background: filtroEstado === est ? T.teal : T.bg2, color: filtroEstado === est ? "#000" : T.whiteDim, transition: "all .2s" }}>
              {est === "todos" ? "Todos" : ESTADOS[est]?.label}
            </button>
          ))}
        </div>
      </div>

      {/* TABLA DE FACTURAS */}
      <Tarjeta>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ borderBottom: `1px solid ${T.borderHi}`, color: T.whiteDim, fontSize: 11, textTransform: "uppercase" }}>
              {["N° Factura", "Cliente", "Fecha Emisión", "Vencimiento", "Total", "Estado", "Método", ""].map(h => (
                <th key={h} style={{ padding: "12px 16px", textAlign: "left", fontWeight: 700 }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtradas.length === 0 ? (
              <tr><td colSpan={8}><Vacio text="No hay facturas que coincidan." /></td></tr>
            ) : filtradas.map(fac => {
              const est = ESTADOS[fac.estado] || ESTADOS.borrador;
              return (
                <tr key={fac.id} style={{ borderBottom: `1px solid ${T.borderHi}`, transition: "background .15s" }}
                  onMouseEnter={e => e.currentTarget.style.background = T.bg2}
                  onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                  <td style={{ padding: "14px 16px", fontWeight: 800, color: T.teal, fontFamily: "monospace" }}>{fac.numero}</td>
                  <td style={{ padding: "14px 16px" }}>
                    <div style={{ fontWeight: 700, color: T.white }}>{fac.cliente_nombre}</div>
                    {fac.cliente_email && <div style={{ fontSize: 11, color: T.whiteDim }}>{fac.cliente_email}</div>}
                  </td>
                  <td style={{ padding: "14px 16px", fontSize: 13, color: T.whiteDim }}>{fac.fecha_emision}</td>
                  <td style={{ padding: "14px 16px", fontSize: 13, color: fac.estado === "vencida" ? T.red : T.whiteDim }}>{fac.fecha_vencimiento || "—"}</td>
                  <td style={{ padding: "14px 16px", fontWeight: 800, color: T.green, fontSize: 15 }}>{money(fac.total || 0)}</td>
                  <td style={{ padding: "14px 16px" }}>
                    <span style={{ background: est.bg, color: est.color, borderRadius: 20, padding: "4px 10px", fontSize: 11, fontWeight: 700 }}>
                      {est.label}
                    </span>
                  </td>
                  <td style={{ padding: "14px 16px", fontSize: 12, color: T.whiteDim }}>{fac.metodo_pago}</td>
                  <td style={{ padding: "14px 16px" }}>
                    <div style={{ display: "flex", gap: 6 }}>
                      <button onClick={() => setShowViewer(fac)} title="Ver" style={{ padding: 6, borderRadius: 8, border: `1px solid ${T.borderHi}`, background: "transparent", cursor: "pointer", color: T.teal }} onMouseEnter={e => e.currentTarget.style.background = T.tealSoft} onMouseLeave={e => e.currentTarget.style.background = "transparent"}><Ico k="eye" size={14} /></button>
                      <button onClick={() => abrirEditar(fac)} title="Editar" style={{ padding: 6, borderRadius: 8, border: `1px solid ${T.borderHi}`, background: "transparent", cursor: "pointer", color: T.whiteDim }} onMouseEnter={e => e.currentTarget.style.background = T.bg2} onMouseLeave={e => e.currentTarget.style.background = "transparent"}><Ico k="edit" size={14} /></button>
                      <button onClick={() => imprimir(fac)} title="Imprimir" style={{ padding: 6, borderRadius: 8, border: `1px solid ${T.borderHi}`, background: "transparent", cursor: "pointer", color: T.amber }} onMouseEnter={e => e.currentTarget.style.background = "rgba(245,158,11,0.1)"} onMouseLeave={e => e.currentTarget.style.background = "transparent"}><Ico k="note" size={14} /></button>
                      <button onClick={() => eliminar(fac.id)} title="Eliminar" style={{ padding: 6, borderRadius: 8, border: `1px solid rgba(239,68,68,0.2)`, background: "transparent", cursor: "pointer", color: T.red }} onMouseEnter={e => e.currentTarget.style.background = "rgba(239,68,68,0.1)"} onMouseLeave={e => e.currentTarget.style.background = "transparent"}><Ico k="trash" size={14} /></button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </Tarjeta>

      {/* MODAL CREAR/EDITAR FACTURA */}
      <Modal open={showForm} onClose={() => { setShowForm(false); setEditando(null); }} title={editando ? `✏️ Editar ${editando.numero}` : "🧾 Nueva Factura"} width={820}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 20 }}>
          <Campo label="Nombre del Cliente *">
            <div style={{ position: "relative" }}>
              <Inp value={f.cliente_nombre} onChange={e => setF(prev => ({ ...prev, cliente_nombre: e.target.value }))} placeholder="Nombre o empresa..." />
              {/* Autocompletar desde contactos */}
              {f.cliente_nombre.length > 1 && (
                <div style={{ position: "absolute", top: "100%", left: 0, right: 0, background: T.bg1, border: `1px solid ${T.borderHi}`, borderRadius: 10, zIndex: 100, maxHeight: 180, overflowY: "auto" }}>
                  {contactos.filter(c => (c.nombre || "").toLowerCase().includes(f.cliente_nombre.toLowerCase())).slice(0, 5).map(c => (
                    <div key={c.id} onClick={() => setF(prev => ({ ...prev, cliente_nombre: c.nombre, cliente_email: c.email || prev.cliente_email, cliente_telefono: c.telefono || prev.cliente_telefono }))}
                      style={{ padding: "10px 14px", cursor: "pointer", fontSize: 13, color: T.white, borderBottom: `1px solid ${T.borderHi}` }}
                      onMouseEnter={e => e.currentTarget.style.background = T.bg2} onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                      <b>{c.nombre}</b> · <span style={{ color: T.whiteDim }}>{c.email}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </Campo>
          <Campo label="CI / RUC / NIT">
            <div style={{ position: "relative" }}>
              <Inp
                value={f.cliente_cedula}
                onChange={e => buscarPorCedula(e.target.value)}
                placeholder="Cédula, RUC o NIT..."
              />
              {/* Resultados de búsqueda por cédula */}
              {f.cliente_cedula.length >= 5 && (() => {
                const matches = contactos.filter(c =>
                  (c.cedula || c.ruc || "").includes(f.cliente_cedula) ||
                  (c.nombre || "").toLowerCase().includes(f.cliente_cedula.toLowerCase())
                ).slice(0, 4);
                if (!matches.length) return null;
                return (
                  <div style={{ position: "absolute", top: "100%", left: 0, right: 0, background: T.bg1, border: `1px solid ${T.teal}40`, borderRadius: 10, zIndex: 200, boxShadow: "0 8px 24px rgba(0,0,0,0.3)" }}>
                    <div style={{ padding: "6px 12px", fontSize: 10, fontWeight: 700, color: T.teal, textTransform: "uppercase", borderBottom: `1px solid ${T.borderHi}` }}>Contactos encontrados</div>
                    {matches.map(c => (
                      <div key={c.id}
                        onClick={() => setF(p => ({ ...p, cliente_cedula: c.cedula || c.ruc || p.cliente_cedula, cliente_nombre: c.nombre, cliente_email: c.email || p.cliente_email, cliente_telefono: c.telefono || p.cliente_telefono, _contacto_id: c.id }))}
                        style={{ padding: "10px 14px", cursor: "pointer", fontSize: 13, color: T.white, borderBottom: `1px solid ${T.borderHi}`, display: "flex", gap: 10, alignItems: "center" }}
                        onMouseEnter={e => e.currentTarget.style.background = T.bg2}
                        onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                        <div style={{ width: 32, height: 32, borderRadius: "50%", background: T.tealSoft, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 800, color: T.teal, flexShrink: 0 }}>
                          {(c.nombre || "?")[0].toUpperCase()}
                        </div>
                        <div>
                          <div style={{ fontWeight: 700 }}>{c.nombre}</div>
                          <div style={{ fontSize: 11, color: T.whiteDim }}>
                            {c.cedula || c.ruc ? `ID: ${c.cedula || c.ruc}` : ""}
                            {c.email ? ` · ${c.email}` : ""}
                          </div>
                        </div>
                        <div style={{ marginLeft: "auto", fontSize: 10, background: T.tealSoft, color: T.teal, borderRadius: 20, padding: "2px 8px", fontWeight: 700 }}>Seleccionar</div>
                      </div>
                    ))}
                  </div>
                );
              })()}
            </div>
          </Campo>
          <Campo label="Email del Cliente">
            <Inp type="email" value={f.cliente_email} onChange={e => setF(p => ({ ...p, cliente_email: e.target.value }))} placeholder="cliente@email.com" />
          </Campo>
          <Campo label="Teléfono">
            <Inp value={f.cliente_telefono} onChange={e => setF(p => ({ ...p, cliente_telefono: e.target.value }))} />
          </Campo>
          <Campo label="Fecha de Emisión">
            <Inp type="date" value={f.fecha_emision} onChange={e => setF(p => ({ ...p, fecha_emision: e.target.value }))} />
          </Campo>
          <Campo label="Fecha de Vencimiento">
            <Inp type="date" value={f.fecha_vencimiento} onChange={e => setF(p => ({ ...p, fecha_vencimiento: e.target.value }))} />
          </Campo>
          <Campo label="Método de Pago">
            <select value={f.metodo_pago} onChange={e => setF(p => ({ ...p, metodo_pago: e.target.value }))}
              style={{ width: "100%", background: T.bg2, border: `1px solid ${T.borderHi}`, borderRadius: 10, padding: "10px 14px", fontSize: 13, color: T.white, outline: "none" }}>
              {METODOS_PAGO.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
          </Campo>
          <Campo label="IVA (%)">
            <select value={f.iva_pct} onChange={e => setF(p => ({ ...p, iva_pct: Number(e.target.value) }))}
              style={{ width: "100%", background: T.bg2, border: `1px solid ${T.borderHi}`, borderRadius: 10, padding: "10px 14px", fontSize: 13, color: T.white, outline: "none" }}>
              {IVA_OPTS.map(v => <option key={v} value={v}>{v}%</option>)}
            </select>
          </Campo>
          {editando && (
            <Campo label="Estado">
              <select value={f.estado} onChange={e => setF(p => ({ ...p, estado: e.target.value }))}
                style={{ width: "100%", background: T.bg2, border: `1px solid ${T.borderHi}`, borderRadius: 10, padding: "10px 14px", fontSize: 13, color: T.white, outline: "none" }}>
                {Object.keys(ESTADOS).map(s => <option key={s} value={s}>{ESTADOS[s].label}</option>)}
              </select>
            </Campo>
          )}
        </div>

        {/* ÍTEMS */}
        <div style={{ marginBottom: 16 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <div style={{ fontSize: 13, fontWeight: 800, color: T.white }}>📋 Ítems de la Factura</div>
          </div>

          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ color: T.whiteDim, fontSize: 11, textTransform: "uppercase", borderBottom: `1px solid ${T.borderHi}` }}>
                <th style={{ padding: "8px 6px", textAlign: "left", fontWeight: 700 }}>Descripción</th>
                <th style={{ padding: "8px 6px", textAlign: "center", width: 70 }}>Cant.</th>
                <th style={{ padding: "8px 6px", textAlign: "center", width: 110 }}>P. Unitario</th>
                <th style={{ padding: "8px 6px", textAlign: "center", width: 80 }}>Desc. %</th>
                <th style={{ padding: "8px 6px", textAlign: "right", width: 100 }}>Subtotal</th>
                <th style={{ width: 36 }}></th>
              </tr>
            </thead>
            <tbody>
              {items.map((item, idx) => {
                const base = (Number(item.cantidad) || 0) * (Number(item.precio_unitario) || 0);
                const dsc = base * ((Number(item.descuento) || 0) / 100);
                const sub = base - dsc;
                const upd = (k, v) => setItems(prev => prev.map((it, i) => i === idx ? { ...it, [k]: v } : it));
                return (
                  <tr key={idx} style={{ borderBottom: `1px solid ${T.borderHi}` }}>
                    <td style={{ padding: "6px", position: "relative" }}>
                      <input 
                        value={item.descripcion} 
                        onChange={e => { upd("descripcion", e.target.value); upd("_selected", false); }} 
                        onFocus={() => setActiveRow(idx)}
                        onBlur={() => setTimeout(() => setActiveRow(null), 200)}
                        placeholder="Escribe para buscar o selecciona de la lista..."
                        style={{ width: "100%", background: T.bg2, border: `1px solid ${T.borderHi}`, borderRadius: 8, padding: "7px 10px", fontSize: 13, color: T.white, outline: "none", fontFamily: "inherit" }} 
                      />
                      
                      {/* Desplegable de productos Automático */}
                      {activeRow === idx && (
                        <div style={{ position: "absolute", top: "100%", left: 6, right: 6, background: T.bg1, border: `1px solid ${T.teal}50`, borderRadius: 10, zIndex: 300, boxShadow: "0 12px 30px rgba(0,0,0,0.5)", maxHeight: 220, overflowY: "auto" }}>
                          <div style={{ padding: "8px 14px", fontSize: 10, fontWeight: 800, color: T.teal, textTransform: "uppercase", borderBottom: `1px solid ${T.borderHi}`, background: "rgba(13,148,136,0.05)" }}>
                            Catálogo de Productos
                          </div>
                          {productos
                            .filter(p => p.activo !== false && (
                              !item.descripcion || 
                              p.nombre.toLowerCase().includes(item.descripcion.toLowerCase()) || 
                              (p.sku || "").toLowerCase().includes(item.descripcion.toLowerCase())
                            ))
                            .map(p => (
                              <div key={p.id} onClick={() => {
                                setItems(prev => prev.map((it, i) => i === idx ? { ...it, descripcion: p.nombre, precio_unitario: p.precio, _selected: true } : it));
                                setActiveRow(null);
                              }} style={{ padding: "10px 14px", cursor: "pointer", fontSize: 13, color: T.white, borderBottom: `1px solid ${T.borderHi}`, display: "flex", justifyContent: "space-between", alignItems: "center", transition: "background .2s" }}
                              onMouseEnter={e => e.currentTarget.style.background = T.bg2} onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                                <div>
                                  <div style={{ fontWeight: 700 }}>{p.nombre}</div>
                                  <div style={{ fontSize: 11, color: T.whiteDim }}>SKU: {p.sku || "N/A"} · {p.stock > 0 ? `Stock: ${p.stock}` : "⚠️ Sin stock"}</div>
                                </div>
                                <div style={{ textAlign: "right" }}>
                                  <div style={{ fontWeight: 800, color: T.green }}>{money(p.precio)}</div>
                                  <div style={{ fontSize: 10, color: T.whiteDim }}>{p.categoria}</div>
                                </div>
                              </div>
                            ))}
                          {productos.length === 0 && <div style={{ padding: 20, textAlign: "center", fontStyle: "italic", color: T.whiteDim, fontSize: 12 }}>No hay productos en el catálogo</div>}
                        </div>
                      )}
                    </td>
                    <td style={{ padding: "6px" }}>
                      <input type="number" value={item.cantidad} onChange={e => upd("cantidad", e.target.value)} min={1}
                        style={{ width: "100%", background: T.bg2, border: `1px solid ${T.borderHi}`, borderRadius: 8, padding: "7px 8px", fontSize: 13, color: T.white, outline: "none", textAlign: "center", fontFamily: "inherit" }} />
                    </td>
                    <td style={{ padding: "6px" }}>
                      <input type="number" value={item.precio_unitario} onChange={e => upd("precio_unitario", e.target.value)} min={0} step="0.01"
                        style={{ width: "100%", background: T.bg2, border: `1px solid ${T.borderHi}`, borderRadius: 8, padding: "7px 8px", fontSize: 13, color: T.white, outline: "none", textAlign: "center", fontFamily: "inherit" }} />
                    </td>
                    <td style={{ padding: "6px" }}>
                      <input type="number" value={item.descuento} onChange={e => upd("descuento", e.target.value)} min={0} max={100}
                        style={{ width: "100%", background: T.bg2, border: `1px solid ${T.borderHi}`, borderRadius: 8, padding: "7px 8px", fontSize: 13, color: T.white, outline: "none", textAlign: "center", fontFamily: "inherit" }} />
                    </td>
                    <td style={{ padding: "6px", textAlign: "right", fontWeight: 700, color: T.green, fontSize: 14 }}>${sub.toFixed(2)}</td>
                    <td style={{ padding: "6px" }}>
                      {items.length > 1 && (
                        <button onClick={() => setItems(prev => prev.filter((_, i) => i !== idx))}
                          style={{ background: "none", border: "none", color: T.red, cursor: "pointer", padding: 4 }}>
                          <Ico k="x" size={14} />
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          <button onClick={() => setItems(prev => [...prev, { ...defaultItem }])}
            style={{ marginTop: 10, background: "transparent", border: `1px dashed ${T.teal}`, borderRadius: 8, padding: "8px 16px", color: T.teal, fontSize: 13, fontWeight: 700, cursor: "pointer", width: "100%", transition: "all .2s" }}
            onMouseEnter={e => e.currentTarget.style.background = T.tealSoft}
            onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
            + Agregar ítem
          </button>
        </div>

        {/* Totales */}
        <div style={{ background: T.bg2, borderRadius: 14, padding: 16, marginBottom: 16 }}>
          <div style={{ display: "flex", justifyContent: "flex-end", flexDirection: "column", gap: 6, alignItems: "flex-end" }}>
            <div style={{ display: "flex", gap: 32, fontSize: 13, color: T.whiteDim }}>
              <span>Subtotal:</span><span style={{ color: T.white, fontWeight: 700 }}>{money(subtotal)}</span>
            </div>
            <div style={{ display: "flex", gap: 32, fontSize: 13, color: T.whiteDim }}>
              <span>IVA ({f.iva_pct}%):</span><span style={{ color: T.white, fontWeight: 700 }}>{money(ivaAmt)}</span>
            </div>
            <div style={{ display: "flex", gap: 32, fontSize: 18, color: T.green, fontWeight: 900, borderTop: `1px solid ${T.borderHi}`, paddingTop: 8, marginTop: 4 }}>
              <span>TOTAL:</span><span>{money(total)}</span>
            </div>
          </div>
        </div>

        <Campo label="Notas / Condiciones">
          <Inp value={f.notas} onChange={e => setF(p => ({ ...p, notas: e.target.value }))} placeholder="Términos de pago, condiciones, observaciones..." rows={2} />
        </Campo>

        <div style={{ display: "flex", gap: 12, justifyContent: "flex-end", marginTop: 20 }}>
          <Btn variant="secundario" onClick={() => { setShowForm(false); setEditando(null); }}>Cancelar</Btn>
          <Btn onClick={guardar}>💾 {editando ? "Actualizar Factura" : "Crear Factura"}</Btn>
        </div>
      </Modal>

      {/* VIEWER */}
      {showViewer && (
        <Modal open onClose={() => setShowViewer(null)} title={`📄 Factura ${showViewer.numero}`} width={700}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 16 }}>
            <div>
              <div style={{ fontSize: 22, fontWeight: 900, color: T.white }}>{showViewer.cliente_nombre}</div>
              {showViewer.cliente_email && <div style={{ fontSize: 13, color: T.whiteDim }}>{showViewer.cliente_email}</div>}
              {showViewer.cliente_cedula && <div style={{ fontSize: 12, color: T.whiteDim }}>ID: {showViewer.cliente_cedula}</div>}
            </div>
            <div style={{ textAlign: "right" }}>
              <span style={{ background: ESTADOS[showViewer.estado]?.bg, color: ESTADOS[showViewer.estado]?.color, borderRadius: 20, padding: "6px 14px", fontSize: 13, fontWeight: 800 }}>
                {ESTADOS[showViewer.estado]?.label}
              </span>
              <div style={{ fontSize: 12, color: T.whiteDim, marginTop: 6 }}>Emitida: {showViewer.fecha_emision}</div>
              {showViewer.fecha_vencimiento && <div style={{ fontSize: 12, color: T.whiteDim }}>Vence: {showViewer.fecha_vencimiento}</div>}
            </div>
          </div>

          <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: 16 }}>
            <thead><tr style={{ background: T.bg2, fontSize: 11, color: T.whiteDim, textTransform: "uppercase" }}>
              <th style={{ padding: "8px 12px", textAlign: "left" }}>Descripción</th>
              <th style={{ padding: "8px", textAlign: "center" }}>Cant.</th>
              <th style={{ padding: "8px", textAlign: "center" }}>P. Unit.</th>
              <th style={{ padding: "8px", textAlign: "center" }}>Desc.</th>
              <th style={{ padding: "8px 12px", textAlign: "right" }}>Subtotal</th>
            </tr></thead>
            <tbody>
              {(showViewer.items || []).map((i, idx) => {
                const base = (i.cantidad || 0) * (i.precio_unitario || 0);
                const dsc = base * ((i.descuento || 0) / 100);
                return (
                  <tr key={idx} style={{ borderBottom: `1px solid ${T.borderHi}`, fontSize: 13, color: T.white }}>
                    <td style={{ padding: "10px 12px" }}>{i.descripcion}</td>
                    <td style={{ padding: "10px 8px", textAlign: "center" }}>{i.cantidad}</td>
                    <td style={{ padding: "10px 8px", textAlign: "center" }}>{money(i.precio_unitario)}</td>
                    <td style={{ padding: "10px 8px", textAlign: "center", color: T.amber }}>{i.descuento || 0}%</td>
                    <td style={{ padding: "10px 12px", textAlign: "right", fontWeight: 700, color: T.green }}>{money(base - dsc)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          <div style={{ textAlign: "right", padding: 16, background: T.bg2, borderRadius: 12, marginBottom: 16 }}>
            <div style={{ fontSize: 13, color: T.whiteDim, marginBottom: 4 }}>Subtotal: <b style={{ color: T.white }}>{money(showViewer.subtotal || 0)}</b></div>
            <div style={{ fontSize: 13, color: T.whiteDim, marginBottom: 8 }}>IVA ({showViewer.iva_pct}%): <b style={{ color: T.white }}>{money(showViewer.iva_amount || 0)}</b></div>
            <div style={{ fontSize: 22, fontWeight: 900, color: T.green }}>TOTAL: {money(showViewer.total || 0)}</div>
          </div>

          {showViewer.notas && <div style={{ padding: 12, background: T.bg2, borderRadius: 10, fontSize: 13, color: T.whiteDim, marginBottom: 16 }}><b>Notas:</b> {showViewer.notas}</div>}

          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            {Object.entries(ESTADOS).filter(([k]) => k !== showViewer.estado).map(([k, est]) => (
              <Btn key={k} variant="secundario" size="sm" style={{ color: est.color, borderColor: est.color }}
                onClick={() => { cambiarEstado(showViewer, k); setShowViewer({ ...showViewer, estado: k }); }}>
                Marcar {est.label}
              </Btn>
            ))}
            <Btn onClick={() => imprimir(showViewer)} style={{ marginLeft: "auto" }}><Ico k="note" size={14} /> Imprimir / PDF</Btn>
          </div>
        </Modal>
      )}
    </div>
  );
};
