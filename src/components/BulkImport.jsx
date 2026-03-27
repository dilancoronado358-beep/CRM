import { useState, useRef } from "react";
import * as XLSX from "xlsx";
import { T } from "../theme";
import { Btn, Ico, Modal, Tarjeta, Chip } from "./ui";
import { sileo } from "../utils/sileo";

export const BulkImport = ({ open, onClose, onImport, type }) => {
  const [data, setData] = useState([]);
  const [headers, setHeaders] = useState([]);
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef(null);

  const getTemplateConfig = () => {
    if (type === "contactos") return {
      name: "Plantilla_Contactos.xlsx",
      cols: ["Nombre", "Email", "Teléfono", "Empresa", "Cargo", "Estado", "Fuente", "Valor", "Score", "Etiquetas", "Notas"]
    };
    if (type === "empresas") return {
      name: "Plantilla_Empresas.xlsx",
      cols: ["Nombre", "Industria", "Tamaño", "Sitio Web", "Ingresos", "Ciudad"]
    };
    if (type === "deals") return {
      name: "Plantilla_Negociaciones.xlsx",
      cols: ["Título", "Valor", "Probabilidad", "Fecha Cierre", "Contacto", "Empresa", "Responsable", "Etiquetas", "Notas"]
    };
    return { name: "Plantilla.xlsx", cols: [] };
  };

  const downloadTemplate = () => {
    const config = getTemplateConfig();
    const ws = XLSX.utils.aoa_to_sheet([config.cols]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Plantilla");
    XLSX.writeFile(wb, config.name);
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setLoading(true);
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target.result;
        const wb = XLSX.read(bstr, { type: "binary" });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const rawData = XLSX.utils.sheet_to_json(ws, { header: 1 });

        if (rawData.length > 0) {
          setHeaders(rawData[0]);
          const rows = rawData.slice(1).filter(r => r.length > 0);
          setData(rows);
        }
      } catch (err) {
        sileo.error("Error al leer el archivo: " + err.message);
      } finally {
        setLoading(false);
      }
    };
    reader.readAsBinaryString(file);
  };

  const confirmImport = () => {
    if (data.length === 0) return;
    
    // Map data to objects using headers
    const mappedData = data.map(row => {
      const obj = {};
      headers.forEach((h, i) => {
        const key = h.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s/g, "_");
        obj[key] = row[i];
      });
      return obj;
    });

    onImport(mappedData);
    setData([]);
    setHeaders([]);
    onClose();
  };

  return (
    <Modal open={open} onClose={onClose} title={`Importación Masiva: ${type.toUpperCase()}`} width={800}>
      <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
        {!data.length ? (
          <div style={{ textAlign: "center", padding: "40px 20px" }}>
            <div 
              onClick={() => fileInputRef.current.click()}
              style={{ border: `2px dashed ${T.borderHi}`, borderRadius: 16, padding: 60, cursor: "pointer", transition: "all .2s", background: "rgba(255,255,255,0.02)" }}
              onMouseEnter={e => e.currentTarget.style.borderColor = T.teal}
              onMouseLeave={e => e.currentTarget.style.borderColor = T.borderHi}
            >
              <Ico k="upload" size={48} style={{ color: T.whiteFade, marginBottom: 16 }} />
              <div style={{ fontSize: 16, fontWeight: 700, color: T.white, marginBottom: 8 }}>Arrastra tu archivo aquí o haz clic para subir</div>
              <div style={{ fontSize: 13, color: T.whiteDim }}>Soporta formatos .xlsx, .xls y .csv</div>
              <input type="file" ref={fileInputRef} onChange={handleFileUpload} style={{ display: "none" }} accept=".xlsx, .xls, .csv" />
            </div>

            <div style={{ marginTop: 24, padding: 20, background: T.bg2, borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div style={{ textAlign: "left" }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: T.white }}>¿No tienes la plantilla?</div>
                <div style={{ fontSize: 12, color: T.whiteDim }}>Descárgala para asegurar que los datos se carguen correctamente.</div>
              </div>
              <Btn onClick={downloadTemplate} variant="secundario"><Ico k="download" size={14} /> Descargar Plantilla</Btn>
            </div>
          </div>
        ) : (
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <div style={{ fontSize: 15, fontWeight: 700, color: T.white }}>Vista previa de datos ({data.length} filas detectadas)</div>
              <Btn variant="fantasma" onClick={() => { setData([]); setHeaders([]); }} style={{ color: T.red }}>Limpiar y volver</Btn>
            </div>

            <div style={{ maxHeight: 400, overflow: "auto", border: `1px solid ${T.borderHi}`, borderRadius: 12 }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                <thead style={{ position: "sticky", top: 0, background: T.bg2, zIndex: 10 }}>
                  <tr>
                    {headers.map((h, i) => (
                      <th key={i} style={{ padding: "12px 16px", textAlign: "left", color: T.teal, borderBottom: `1px solid ${T.borderHi}`, whiteSpace: "nowrap" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {data.slice(0, 10).map((row, ri) => (
                    <tr key={ri} style={{ borderBottom: `1px solid ${T.borderHi}40` }}>
                      {headers.map((_, ci) => (
                        <td key={ci} style={{ padding: "10px 16px", color: T.whiteOff }}>{row[ci] || "—"}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
              {data.length > 10 && (
                <div style={{ padding: 12, textAlign: "center", background: T.bg1, fontSize: 12, color: T.whiteDim }}>
                  ... y {data.length - 10} filas más.
                </div>
              )}
            </div>

            <div style={{ marginTop: 24, display: "flex", gap: 12, justifyContent: "flex-end" }}>
              <Btn variant="secundario" onClick={onClose}>Cancelar</Btn>
              <Btn onClick={confirmImport} style={{ background: T.grad, border: "none" }}>Confirmar e Importar Todo</Btn>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
};
