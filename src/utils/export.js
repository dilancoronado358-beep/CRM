import * as XLSX from "xlsx";
import { sileo } from "./sileo";

/**
 * Exports data to an Excel file using a robust Blob method.
 * @param {Array} data - Array of objects to export.
 * @param {String} fileName - Name of the file (without extension).
 * @param {String} sheetName - Name of the worksheet.
 */
export const exportToExcel = (data, fileName = "export", sheetName = "Data") => {
  console.log("📊 [Export] Iniciando exportación de", data?.length, "filas");
  
  if (!data || data.length === 0) {
    sileo.info("No hay datos para exportar");
    return;
  }
  
  try {
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, sheetName);
    
    // Generar buffer binario
    const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    
    // Crear Blob y disparar descarga manual
    const blob = new Blob([wbout], { type: 'application/octet-stream' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${fileName}.xlsx`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
    
    sileo.success(`Archivo "${fileName}.xlsx" generado correctamente`);
    console.log("✅ [Export] Archivo generado exitosamente");
  } catch (err) {
    console.error("❌ [Export] Error:", err);
    sileo.error("Error técnico al generar el Excel. Revisa la consola.");
  }
};
