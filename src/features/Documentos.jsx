import { useState } from "react";
import { T } from "../theme";
import { uid, fdate } from "../utils";
import { Btn, EncabezadoSeccion, Tarjeta, Celda, CabeceraTabla, FilaTabla, Chip, Ico, Modal, Campo, Inp, Vacio } from "../components/ui";
import { sb } from "../hooks/useSupaState";
import { sileo } from "../utils/sileo";

const FORMAT_ICONS = {
  pdf: { color: T.red, icon: "file-text" },
  doc: { color: "#60A5FA", icon: "file-text" },
  docx: { color: "#60A5FA", icon: "file-text" },
  xls: { color: T.green, icon: "grid" },
  xlsx: { color: T.green, icon: "grid" },
  png: { color: T.amber, icon: "image" },
  jpg: { color: T.amber, icon: "image" },
  contrato: { color: T.teal, icon: "note" }
};

/**
 * Documentos: Pilar 2 de Poder - Bóveda & Firma Digital
 * Permite subir archivos y generar contratos interactivos para firma del cliente.
 */
export const Documentos = ({ db, setDb, guardarEnSupa, eliminarDeSupa }) => {
  const [showSubir, setShowSubir] = useState(false);
  const [showFirmar, setShowFirmar] = useState(false);
  const [subiendo, setSubiendo] = useState(false);
  const [f, setF] = useState({ nombre: "", cliente: "", archivo: null, deal_id: "" });
  const [c, setC] = useState({ nombre: "", cuerpo: "", clienteId: "", dealId: "" });

  const docs = db.documentos || [];

  const statFormatos = docs.reduce((a, d) => { a[d.formato] = (a[d.formato] || 0) + 1; return a; }, {});
  
  const totalWeightBytes = docs.reduce((acc, d) => {
    const isMB = d.size?.includes("MB");
    const num = parseFloat(d.size) || 0;
    return acc + (isMB ? num * 1024 * 1024 : num * 1024);
  }, 0);
  const totalWeightStr = totalWeightBytes > 1048576 ? (totalWeightBytes / 1024 / 1024).toFixed(1) + " MB" : (totalWeightBytes / 1024).toFixed(0) + " KB";

  const handleArchivoSelect = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) return sileo.error("El archivo excede los 5 MB permitidos.");
    setF(prev => ({ ...prev, archivo: file, nombre: prev.nombre || file.name }));
  };

  const handleSubir = async () => {
    if (!f.archivo) return sileo.error("Selecciona un archivo");
    if (!f.nombre.trim()) return sileo.error("Falta el nombre");
    
    setSubiendo(true);
    try {
      const fileExt = f.archivo.name.split('.').pop().toLowerCase();
      const fileName = `${uid()}.${fileExt}`;
      const filePath = `${db.usuario?.org_id || 'general'}/${fileName}`;

      const { error } = await sb.storage.from('crm-documentos').upload(filePath, f.archivo);
      if (error) throw error;

      const { data: { publicUrl } } = sb.storage.from('crm-documentos').getPublicUrl(filePath);
      
      const sizeStr = f.archivo.size > 1048576 
        ? (f.archivo.size / 1024 / 1024).toFixed(2) + " MB" 
        : (f.archivo.size / 1024).toFixed(0) + " KB";

      const format = f.nombre.split(".").pop().toLowerCase() || fileExt;
      const docName = f.nombre.includes(".") ? f.nombre : `${f.nombre}.${format}`;

      const nd = { 
        id: "d" + uid(), 
        nombre: docName, 
        formato: format, 
        size: sizeStr, 
        clienteId: f.cliente || null, 
        fecha: new Date().toISOString().slice(0, 10), 
        uploader: db.usuario?.name || "Usuario",
        url: publicUrl,
        ruta_storage: filePath,
        tipo: 'archivo',
        deal_id: f.deal_id || null
      };

      setDb(prev => ({ ...prev, documentos: [nd, ...(prev.documentos || [])] }));
      await guardarEnSupa("documentos", nd);
      
      sileo.success("Documento subido correctamente");
      setShowSubir(false);
      setF({ nombre: "", cliente: "", archivo: null, deal_id: "" });
    } catch (e) {
      console.error(e);
      sileo.error("Error al subir el documento");
    } finally {
      setSubiendo(false);
    }
  };

  const handleCrearContrato = async () => {
    if (!c.nombre.trim() || !c.cuerpo.trim()) return sileo.error("Nombre y cuerpo son requeridos");
    setSubiendo(true);
    try {
      const token = uid() + uid(); 
      const nd = {
        id: "ctr_" + uid(),
        nombre: c.nombre,
        formato: "contrato",
        size: "—",
        clienteId: c.clienteId || null,
        deal_id: c.dealId || null,
        fecha: new Date().toISOString().slice(0, 10),
        uploader: db.usuario?.name || "Usuario",
        tipo: 'contrato',
        cuerpo_contrato: c.cuerpo,
        token_firma: token,
        firmado: false
      };
      await guardarEnSupa("documentos", nd);
      setDb(prev => ({ ...prev, documentos: [nd, ...(prev.documentos || [])] }));
      sileo.success("Contrato generado y listo para firma ✍️");
      setShowFirmar(false);
      setC({ nombre: "", cuerpo: "", clienteId: "", dealId: "" });
    } catch (e) {
      sileo.error("Error al generar contrato");
    } finally {
      setSubiendo(false);
    }
  };

  const copiarLinkFirma = (doc) => {
    const url = `${window.location.origin}${window.location.pathname}#/sign/${doc.token_firma}`;
    navigator.clipboard.writeText(url);
    sileo.success("Enlace de firma copiado 📋");
  };

  const eliminar = async (doc) => {
    if (!confirm("¿Eliminar documento permanentemente?")) return;
    setDb(prev => ({ ...prev, documentos: (prev.documentos || []).filter(d => d.id !== doc.id) }));
    await eliminarDeSupa("documentos", doc.id);
    if (doc.ruta_storage) await sb.storage.from('crm-documentos').remove([doc.ruta_storage]).catch(console.error);
    sileo.info("Documento eliminado");
  };

  return (
    <div>
      <EncabezadoSeccion title="Bóveda Digital & Contratos" sub={`${docs.length} documentos · ${totalWeightStr} almacenamiento`}
        actions={
          <div style={{ display: "flex", gap: 10 }}>
            <Btn variant="secundario" onClick={() => setShowFirmar(true)}><Ico k="note" size={14} />Nuevo Contrato</Btn>
            <Btn onClick={() => setShowSubir(true)}><Ico k="upload" size={14} />Subir Archivo</Btn>
          </div>
        } />

      <Tarjeta>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <CabeceraTabla cols={["Documento", "Tipo / Estado", "Lead / Cliente", "Fecha / Firma", "Carga", ""]} />
          <tbody>
            {docs.map(doc => {
              const cfg = FORMAT_ICONS[doc.formato] || { color: T.whiteOff, icon: "file" };
              const cli = db.contactos?.find(x => x.id === doc.clienteId);
              const deal = db.deals?.find(x => x.id === doc.deal_id);
              const esContrato = doc.tipo === 'contrato';
              
              return (
                <FilaTabla key={doc.id}>
                  <Celda>
                    <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                      <div style={{ 
                        width: 40, height: 40, borderRadius: 12, background: cfg.color.startsWith("#") ? cfg.color + "15" : cfg.color, 
                        color: cfg.color, display: "flex", alignItems: "center", justifyContent: "center" 
                      }}>
                        <Ico k={cfg.icon} size={20} />
                      </div>
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 800, color: T.white }}>{doc.nombre}</div>
                        <div style={{ fontSize: 10, color: T.whiteDim }}>{doc.size} • {doc.id}</div>
                      </div>
                    </div>
                  </Celda>
                  <Celda>
                    {esContrato ? (
                      <Chip label={doc.firmado ? "FIRMADO" : "PENDIENTE"} color={doc.firmado ? T.teal : T.amber} />
                    ) : (
                      <Chip label={doc.formato?.toUpperCase() || "ARCHIVO"} color={T.whiteDim} />
                    )}
                  </Celda>
                  <Celda>
                    <div style={{ fontSize: 12, fontWeight: 700, color: T.whiteOff }}>{cli?.nombre || "—"}</div>
                    <div style={{ fontSize: 10, color: T.teal }}>{deal?.titulo || "Carga general"}</div>
                  </Celda>
                  <Celda>
                    <div style={{ fontSize: 11, color: T.whiteDim }}>{fdate(doc.fecha)}</div>
                    {doc.firmado && (
                      <div style={{ display: "flex", alignItems: "center", gap: 4, color: T.teal, fontSize: 10, fontWeight: 800, marginTop: 4 }}>
                        <Ico k="check" size={12} /> {fdate(doc.fecha_firma)}
                      </div>
                    )}
                  </Celda>
                  <Celda style={{ fontSize: 11, color: T.whiteDim }}>{doc.uploader}</Celda>
                  <Celda>
                    <div style={{ display: "flex", gap: 6, justifyContent: "flex-end" }}>
                      {esContrato && !doc.firmado && <Btn variant="fantasma" size="sm" title="Link de firma" onClick={() => copiarLinkFirma(doc)} style={{ border: `1px solid ${T.teal}30`, color: T.teal }}><Ico k="link" size={14} /></Btn>}
                      {doc.url && <Btn variant="fantasma" size="sm" onClick={() => window.open(doc.url, "_blank")}><Ico k="download" size={14} /></Btn>}
                      <Btn variant="fantasma" size="sm" onClick={() => eliminar(doc)}><Ico k="trash" size={14} style={{ color: T.red }} /></Btn>
                    </div>
                  </Celda>
                </FilaTabla>
              );
            })}
          </tbody>
        </table>
      </Tarjeta>

      <Modal open={showSubir} onClose={() => setShowSubir(false)} title="Subir Archivo" width={480}>
        <Campo label="Archivo"><input type="file" onChange={handleArchivoSelect} style={{ width: "100%", padding: 10, background: T.bg2, color: T.white, border: `1px solid ${T.borderHi}`, borderRadius: 8 }} /></Campo>
        <Campo label="Nombre"><Inp value={f.nombre} onChange={e => setF({...f, nombre: e.target.value})} /></Campo>
        <Campo label="Lead Asociado">
           <select value={f.deal_id} onChange={e => setF({...f, deal_id: e.target.value})} style={{ width: "100%", padding: 10, background: T.bg1, color: T.white, borderRadius: 8 }}>
              <option value="">— Ninguno —</option>
              {db.deals?.filter(d => d.estado !== 'archivado').map(d => <option key={d.id} value={d.id}>{d.titulo}</option>)}
           </select>
        </Campo>
        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 20 }}>
           <Btn onClick={handleSubir} loading={subiendo}>Subir ahora</Btn>
        </div>
      </Modal>

      <Modal open={showFirmar} onClose={() => setShowFirmar(false)} title="Nuevo Contrato Digital (Pilar 2)" width={600}>
        <Campo label="Título de contrato"><Inp value={c.nombre} onChange={e => setC({...c, nombre: e.target.value})} placeholder="Ej: Acuerdo de Confidencialidad" /></Campo>
        <Campo label="Asociar a Lead">
           <select value={c.dealId} onChange={e => setC({...c, dealId: e.target.value})} style={{ width: "100%", padding: 10, background: T.bg1, color: T.white, borderRadius: 8 }}>
              <option value="">— Seleccionar Lead —</option>
              {db.deals?.filter(d => d.estado !== 'archivado').map(d => <option key={d.id} value={d.id}>{d.titulo}</option>)}
           </select>
        </Campo>
        <Campo label="Contenido"><textarea value={c.cuerpo} onChange={e => setC({...c, cuerpo: e.target.value})} style={{ width: "100%", height: 200, background: T.bg1, color: T.white, border: `1px solid ${T.borderHi}`, borderRadius: 12, padding: 16, outline: "none" }} placeholder="Escribe las cláusulas aquí..." /></Campo>
        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 20 }}>
           <Btn onClick={handleCrearContrato} loading={subiendo} style={{ background: T.teal, color: "#000" }}>Generar Link de Firma</Btn>
        </div>
      </Modal>
    </div>
  );
};
