import { useState } from "react";
import { T } from "../theme";
import { uid, fdate } from "../utils";
import { Btn, EncabezadoSeccion, Tarjeta, Celda, CabeceraTabla, FilaTabla, Chip, Ico, Modal, Campo, Inp, Vacio } from "../components/ui";

const FORMAT_ICONS = {
  pdf: { color: T.red, icon: "file-text" },
  doc: { color: "#60A5FA", icon: "file-text" },
  docx: { color: "#60A5FA", icon: "file-text" },
  xls: { color: T.green, icon: "grid" },
  xlsx: { color: T.green, icon: "grid" },
  png: { color: T.amber, icon: "image" },
  jpg: { color: T.amber, icon: "image" }
};

export const Documentos = ({ db, setDb }) => {
  const [showSubir, setShowSubir] = useState(false);
  const [f, setF] = useState({ nombre: "", cliente: "", archivo: null });

  // Fallback si no hay array de documentos creado
  const docs = db.documentos || [
    { id: "d1", nombre: "Contrato_Acme_Pro.pdf", formato: "pdf", size: "1.2 MB", clienteId: "c3", fecha: "2024-03-10", uploader: "Tú" },
    { id: "d2", nombre: "Cotizacion_TechFlow.xlsx", formato: "xlsx", size: "840 KB", clienteId: "c1", fecha: "2024-03-12", uploader: "Ana G." },
    { id: "d3", nombre: "Logo_InnoLab.png", formato: "png", size: "205 KB", clienteId: "c2", fecha: "2024-03-01", uploader: "Carlos R." }
  ];

  const statFormatos = docs.reduce((a, d) => { a[d.formato] = (a[d.formato] || 0) + 1; return a; }, {});
  const totalWeightStr = `${(docs.length * 1.5).toFixed(1)} MB`; // Mock

  const handleSubir = () => {
    if (!f.nombre.trim()) return;
    const format = f.nombre.split(".").pop().toLowerCase() || "pdf";
    const nd = { id: "d" + uid(), nombre: f.nombre.includes(".") ? f.nombre : `${f.nombre}.${format}`, formato: format, size: "500 KB", clienteId: f.cliente, fecha: new Date().toISOString().slice(0, 10), uploader: "Tú" };
    setDb(prev => ({ ...prev, documentos: [nd, ...(prev.documentos || docs)] }));
    setShowSubir(false);
    setF({ nombre: "", cliente: "", archivo: null });
  };

  const eliminar = id => {
    if (!confirm("¿Eliminar documento permanentemente?")) return;
    setDb(prev => ({ ...prev, documentos: (prev.documentos || docs).filter(d => d.id !== id) }));
  };

  return (
    <div>
      <EncabezadoSeccion title="Gestión de Documentos" sub={`${docs.length} archivos subidos · ${totalWeightStr} almacenamiento`}
        actions={<Btn onClick={() => setShowSubir(true)}><Ico k="upload" size={14} />Subir Archivo</Btn>} />

      <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: 20, marginBottom: 24 }}>
        <Tarjeta style={{ padding: 24 }}>
          <div style={{ fontSize: 16, fontWeight: 800, color: T.white, marginBottom: 16 }}>Espacio Utilizado</div>
          <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginBottom: 12 }}>
            <span style={{ fontSize: 32, fontWeight: 800, color: T.teal }}>{totalWeightStr}</span>
            <span style={{ fontSize: 13, color: T.whiteDim, fontWeight: 600 }}>/ 5 GB</span>
          </div>
          <div style={{ background: T.bg2, borderRadius: 10, height: 8, overflow: "hidden", marginBottom: 16 }}>
            <div style={{ background: T.teal, height: "100%", width: "15%", borderRadius: 10 }} />
          </div>
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginTop: 20 }}>
            {Object.entries(statFormatos).map(([f, n]) => {
              const cfg = FORMAT_ICONS[f] || { color: T.whiteDim };
              return (
                <div key={f} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, fontWeight: 700, color: T.whiteDim }}>
                  <div style={{ width: 10, height: 10, borderRadius: 3, background: cfg.color }} /> {f.toUpperCase()} ({n})
                </div>
              );
            })}
          </div>
        </Tarjeta>

        <Tarjeta style={{ padding: 24, background: T.bg1, border: `1px dashed ${T.borderHi}`, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center", cursor: "pointer", transition: "all .2s" }} onClick={() => setShowSubir(true)} onMouseEnter={e => e.currentTarget.style.borderColor = T.teal} onMouseLeave={e => e.currentTarget.style.borderColor = T.borderHi}>
          <div style={{ width: 48, height: 48, borderRadius: "50%", background: T.tealSoft, color: T.teal, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 16 }}>
            <Ico k="upload" size={24} />
          </div>
          <div style={{ fontSize: 16, fontWeight: 800, color: T.white, marginBottom: 6 }}>Arrastra tus archivos aquí</div>
          <div style={{ fontSize: 13, color: T.whiteDim }}>o haz clic para buscar en tu equipo (PDF, DOCX, XLSX, PNG, JPG)</div>
        </Tarjeta>
      </div>

      <Tarjeta>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <CabeceraTabla cols={["Archivo / Nombre", "Tipo", "Cliente Asociado", "Tamaño", "Fecha de Carga", "Subido por", ""]} />
          <tbody>
            {docs.map(doc => {
              const cfg = FORMAT_ICONS[doc.formato] || { color: T.whiteOff, icon: "file" };
              const cliente = db.contactos.find(c => c.id === doc.clienteId);
              return (
                <FilaTabla key={doc.id}>
                  <Celda>
                    <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                      <div style={{ width: 32, height: 32, borderRadius: 8, background: cfg.color.startsWith("#") ? cfg.color + "15" : cfg.color, color: cfg.color, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                        <Ico k={cfg.icon} size={16} />
                      </div>
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 700, color: T.white, marginBottom: 2 }}>{doc.nombre}</div>
                        <div style={{ fontSize: 11, color: T.whiteDim }}>ID: {doc.id}</div>
                      </div>
                    </div>
                  </Celda>
                  <Celda><Chip label={doc.formato.toUpperCase()} color={cfg.color} /></Celda>
                  <Celda><div style={{ fontSize: 13, color: T.whiteOff, fontWeight: 500 }}>{cliente ? cliente.nombre : "— General —"}</div></Celda>
                  <Celda style={{ fontSize: 12, fontWeight: 600, color: T.whiteDim }}>{doc.size}</Celda>
                  <Celda style={{ fontSize: 12, color: T.whiteDim }}>{fdate(doc.fecha)}</Celda>
                  <Celda style={{ fontSize: 12, color: T.whiteOff, fontWeight: 600 }}>{doc.uploader}</Celda>
                  <Celda>
                    <div style={{ display: "flex", gap: 6 }}>
                      <Btn variant="fantasma" size="sm"><Ico k="download" size={14} /></Btn>
                      <Btn variant="fantasma" size="sm" onClick={() => eliminar(doc.id)}><Ico k="trash" size={14} style={{ color: T.red }} /></Btn>
                    </div>
                  </Celda>
                </FilaTabla>
              );
            })}
            {docs.length === 0 && <tr><td colSpan={7}><Vacio text="La bóveda de documentos está vacía." /></td></tr>}
          </tbody>
        </table>
      </Tarjeta>

      <Modal open={showSubir} onClose={() => setShowSubir(false)} title="Subir Nuevo Documento" width={480}>
        <Campo label="Seleccionar Archivo (Mock)">
          <div style={{ width: "100%", padding: "30px", border: `2px dashed ${T.borderHi}`, borderRadius: 10, textAlign: "center", color: T.whiteDim, fontWeight: 600, cursor: "pointer", background: T.bg2 }}>Haz clic para seleccionar (Simulado)</div>
        </Campo>
        <Campo label="Nombre del Documento (Renombrar)"><Inp value={f.nombre} onChange={e => setF({ ...f, nombre: e.target.value })} placeholder="Ej. Contrato_NDA_2024.pdf" /></Campo>
        <Campo label="Vincular a Cliente (Opcional)">
          <select value={f.cliente} onChange={e => setF({ ...f, cliente: e.target.value })} style={{ width: "100%", padding: "10px 14px", borderRadius: 8, border: `1px solid ${T.borderHi}`, background: T.bg1, color: T.white, outline: "none" }}>
            <option value="">— Sin vincular (General) —</option>
            {db.contactos.map(c => <option key={c.id} value={c.id}>{c.nombre} ({c.empresa})</option>)}
          </select>
        </Campo>
        <div style={{ display: "flex", gap: 12, justifyContent: "flex-end", marginTop: 24 }}>
          <Btn variant="secundario" onClick={() => setShowSubir(false)}>Cancelar</Btn>
          <Btn onClick={handleSubir} disabled={!f.nombre.trim()}><Ico k="upload" size={14} />Subir Archivo</Btn>
        </div>
      </Modal>
    </div>
  );
};
