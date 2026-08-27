import * as XLSX from "xlsx";
import { sileo } from "./sileo";

/**
 * Robust Excel Export Utility with deep logging and fallback.
 */
export const exportToExcel = (data, fileName = "export", sheetName = "Data") => {
  const logPrefix = `[ExcelExport:${fileName}]`;
  console.log(`${logPrefix} Iniciando...`, { rows: data?.length });

  if (!data || data.length === 0) {
    console.warn(`${logPrefix} Error: Sin datos para exportar.`);
    sileo.warning("No hay información para exportar en el listado actual.");
    return;
  }

  try {
    // 1. Preparar el libro
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, sheetName);

    console.log(`${logPrefix} Libro preparado, intentando descarga...`);

    // 2. Intentar descarga nativa de SheetJS (writeFile)
    // Esto detecta automáticamente el entorno y dispara la descarga.
    XLSX.writeFile(wb, `${fileName}.xlsx`);
    
    console.log(`${logPrefix} XLSX.writeFile ejecutado.`);
    sileo.success(`Exportando ${data.length} registros a ${fileName}.xlsx`);

  } catch (err) {
    console.error(`${logPrefix} Error crítico:`, err);
    
    // 3. Fallback: CSV manual si falla XLSX
    try {
      console.log(`${logPrefix} Intentando fallback a CSV...`);
      const csv = XLSX.utils.sheet_to_csv(XLSX.utils.json_to_sheet(data));
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.setAttribute("href", url);
      link.setAttribute("download", `${fileName}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      sileo.info("Se ha descargado un CSV como alternativa.");
    } catch (csvErr) {
      console.error(`${logPrefix} Fallback fallido:`, csvErr);
      sileo.error("No se pudo generar el archivo. Por favor, revisa la consola.");
    }
  }
};
