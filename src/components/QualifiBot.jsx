import React, { useState, useEffect, useRef } from "react";
import { T } from "../theme";
import { Ico } from "./ui/Ico";
import * as XLSX from "xlsx";
import { jsPDF } from "jspdf";
import "jspdf-autotable";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { sb } from "../hooks/useSupaState";

// Custom Tooltip for our elite embedded charts
const CustomTooltip = ({ active, payload }) => {
  if (active && payload && payload.length) {
    return (
      <div style={{ background: T.bg1, border: `1px solid ${T.borderHi}`, padding: "6px 12px", borderRadius: 8, boxShadow: "0 4px 15px rgba(0,0,0,0.3)", color: "var(--btnText, #fff)", fontSize: 13, fontWeight: 600 }}>
        {payload[0].name}: {payload[0].value}
      </div>
    );
  }
  return null;
};

// 1. Interactive Live Form for Bot
const ContactForm = ({ db }) => {
  const [formData, setFormData] = useState({ nombre: "", telefono: "", correo: "" });
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);

  const saveToDb = async () => {
    if (!formData.nombre) return;
    setSaving(true);
    const orgId = db.usuario?.org_id;
    const newContact = {
      id: crypto.randomUUID(), nombre: formData.nombre, telefono: formData.telefono, email: formData.correo, estado: "lead", creado: new Date().toISOString(), org_id: orgId
    };
    const { error } = await sb.from("contactos").insert([newContact]);
    setSaving(false);
    if (!error) setDone(true);
    else alert("Hubo un error guardando el lead: " + error.message);
  };

  if (done) return <div style={{ background: T.bg2, padding: 12, borderRadius: 8, borderLeft: `3px solid #10B981`, marginTop: 8 }}>✅ <b>¡Listo!</b> El contacto <b>{formData.nombre}</b> ha sido guardado exitosamente.</div>;

  return (
    <div style={{ background: T.bg2, border: `1px solid ${T.teal}`, padding: 14, borderRadius: 10, marginTop: 12, boxShadow: "0 4px 12px rgba(0,0,0,0.05)" }}>
      <div style={{ fontWeight: 600, marginBottom: 12, color: T.white, display: "flex", alignItems: "center", gap: 6 }}><Ico k="user-plus" size={16} style={{ color: T.teal }}/> Alta de Prospecto</div>
      <input placeholder="Nombre Completo *" value={formData.nombre} onChange={(e) => setFormData({...formData, nombre: e.target.value})} style={{ width: "100%", marginBottom: 8, padding: "10px 12px", borderRadius: 6, border: `1px solid ${T.borderHi}`, background: T.bg1, color: T.white, outline: "none" }} />
      <input placeholder="Teléfono / WhatsApp" value={formData.telefono} onChange={(e) => setFormData({...formData, telefono: e.target.value})} style={{ width: "100%", marginBottom: 8, padding: "10px 12px", borderRadius: 6, border: `1px solid ${T.borderHi}`, background: T.bg1, color: T.white, outline: "none" }} />
      <input placeholder="Correo Electrónico" value={formData.correo} onChange={(e) => setFormData({...formData, correo: e.target.value})} style={{ width: "100%", marginBottom: 12, padding: "10px 12px", borderRadius: 6, border: `1px solid ${T.borderHi}`, background: T.bg1, color: T.white, outline: "none" }} />
      <button onClick={saveToDb} disabled={saving || !formData.nombre} style={{ width: "100%", padding: "10px 0", background: formData.nombre ? T.teal : T.borderHi, color: "#fff", border: "none", borderRadius: 6, cursor: formData.nombre ? "pointer" : "not-allowed", fontWeight: 600, transition: "0.2s" }}>
        {saving ? "Guardando en Nube..." : "Guardar Contacto"}
      </button>
    </div>
  );
};

// 2. CPQ Live Quote Calculator
const CotizadorForm = () => {
    const [usuarios, setUsuarios] = useState(3);
    const [meses, setMeses] = useState(1);
    
    // Dynamic Pricing Logic Example
    const costoLicenciaMensual = 20; 
    const costoBase = 50; 
    const descuento = meses >= 12 ? 0.8 : 1; // 20% discount if annual
    
    const subtotalMes = costoBase + (usuarios * costoLicenciaMensual);
    const total = (subtotalMes * meses) * descuento;

    const copiarPropuesta = () => {
       const text = `Hola, te comparto nuestra cotización:\n- Suscripción por ${meses} mes(es)\n- ${usuarios} Usuarios Elite\n✅ TOTAL APROXIMADO: $${total.toFixed(2)} USD.\n\n*Incluye descuentos aplicables.`;
       navigator.clipboard.writeText(text);
       alert("¡Propuesta copiada al portapapeles!");
    };

    return (
        <div style={{ background: T.bg2, border: `1px solid ${T.tealSoft}`, padding: 16, borderRadius: 12, marginTop: 12 }}>
            <div style={{ fontWeight: 600, color: T.white, marginBottom: 12, display: "flex", gap: 6, alignItems: "center" }}><Ico k="dollar-sign" size={16} style={{ color: T.teal }}/> Simulador CPQ Elite</div>
            
            <div style={{ marginBottom: 12 }}>
                <div style={{ fontSize: 12, color: T.whiteDim, marginBottom: 4 }}>👥 Cantidad de Agentes: <b>{usuarios}</b></div>
                <input type="range" min="1" max="20" value={usuarios} onChange={e => setUsuarios(Number(e.target.value))} style={{ width: "100%", accentColor: T.teal }} />
            </div>

            <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 12, color: T.whiteDim, marginBottom: 4 }}>📅 Duración Contrato: <b>{meses} meses</b> {meses >= 12 && <span style={{color: T.green, fontSize: 10}}>(20% OFF)</span>}</div>
                <input type="range" min="1" max="24" value={meses} onChange={e => setMeses(Number(e.target.value))} style={{ width: "100%", accentColor: T.teal }} />
            </div>

            <div style={{ background: T.bg1, padding: 12, borderRadius: 8, display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12, border: `1px solid ${T.borderHi}` }}>
                <span style={{ fontSize: 12, color: T.whiteDim }}>Total Estimado:</span>
                <span style={{ fontSize: 20, fontWeight: 800, color: T.white }}>${total.toFixed(2)}</span>
            </div>

            <button onClick={copiarPropuesta} style={{ width: "100%", padding: "10px 0", background: T.teal, color: "#fff", border: "none", borderRadius: 6, cursor: "pointer", fontWeight: 600, transition: "0.2s", display: "flex", justifyContent: "center", gap: 6 }}>
                <Ico k="copy" size={16} /> Copiar Propuesta de Venta
            </button>
        </div>
    );
}

// 1B. Interactive Live Form for Bot: Empresa
const EmpresaForm = ({ db }) => {
  const [formData, setFormData] = useState({ nombre: "", industria: "", sitio: "" });
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);

  const saveToDb = async () => {
    if (!formData.nombre) return;
    setSaving(true);
    const orgId = db.usuario?.org_id;
    const newRecord = {
      id: crypto.randomUUID(), nombre: formData.nombre, industria: formData.industria, sitio: formData.sitio, org_id: orgId
    };
    const { error } = await sb.from("empresas").insert([newRecord]);
    setSaving(false);
    if (!error) setDone(true);
    else alert("Hubo un error guardando la empresa: " + error.message);
  };

  if (done) return <div style={{ background: T.bg2, padding: 12, borderRadius: 8, borderLeft: `3px solid #10B981`, marginTop: 8 }}>✅ <b>¡Listo!</b> Empresa <b>{formData.nombre}</b> añadida a la base de datos B2B.</div>;

  return (
    <div style={{ background: T.bg2, border: `1px solid ${T.teal}`, padding: 14, borderRadius: 10, marginTop: 12 }}>
      <div style={{ fontWeight: 600, marginBottom: 12, color: T.white, display: "flex", alignItems: "center", gap: 6 }}><Ico k="briefcase" size={16} style={{ color: T.teal }}/> Registro de Empresa B2B</div>
      <input placeholder="Nombre de la Empresa *" value={formData.nombre} onChange={(e) => setFormData({...formData, nombre: e.target.value})} style={{ width: "100%", marginBottom: 8, padding: "10px 12px", borderRadius: 6, border: `1px solid ${T.borderHi}`, background: T.bg1, color: T.white, outline: "none" }} />
      <input placeholder="Industria / Sector" value={formData.industria} onChange={(e) => setFormData({...formData, industria: e.target.value})} style={{ width: "100%", marginBottom: 8, padding: "10px 12px", borderRadius: 6, border: `1px solid ${T.borderHi}`, background: T.bg1, color: T.white, outline: "none" }} />
      <input placeholder="Sitio Web (ej. www.corp.com)" value={formData.sitio} onChange={(e) => setFormData({...formData, sitio: e.target.value})} style={{ width: "100%", marginBottom: 12, padding: "10px 12px", borderRadius: 6, border: `1px solid ${T.borderHi}`, background: T.bg1, color: T.white, outline: "none" }} />
      <button onClick={saveToDb} disabled={saving || !formData.nombre} style={{ width: "100%", padding: "10px 0", background: formData.nombre ? T.teal : T.borderHi, color: "#fff", border: "none", borderRadius: 6, cursor: formData.nombre ? "pointer" : "not-allowed", fontWeight: 600, transition: "0.2s" }}>
        {saving ? "Guardando..." : "Crear Empresa B2B"}
      </button>
    </div>
  );
};

// 1C. Interactive Live Form for Bot: Tareas
const TareaForm = ({ db }) => {
  const [formData, setFormData] = useState({ titulo: "", prioridad: "alta", fecha: "" });
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);

  const saveToDb = async () => {
    if (!formData.titulo) return;
    setSaving(true);
    const orgId = db.usuario?.org_id;
    const newRecord = {
      id: crypto.randomUUID(), titulo: formData.titulo, prioridad: formData.prioridad, estado: "pendiente", vencimiento: formData.fecha || new Date().toISOString().split('T')[0], asignado: db.usuario?.name, org_id: orgId
    };
    const { error } = await sb.from("tareas").insert([newRecord]);
    setSaving(false);
    if (!error) setDone(true);
    else alert("Hubo un error guardando la tarea: " + error.message);
  };

  if (done) return <div style={{ background: T.bg2, padding: 12, borderRadius: 8, borderLeft: `3px solid #10B981`, marginTop: 8 }}>✅ <b>¡Agendado!</b> La tarea <b>{formData.titulo}</b> ha sido programada.</div>;

  return (
    <div style={{ background: T.bg2, border: `1px solid ${T.amber}`, padding: 14, borderRadius: 10, marginTop: 12 }}>
      <div style={{ fontWeight: 600, marginBottom: 12, color: T.white, display: "flex", alignItems: "center", gap: 6 }}><Ico k="check-square" size={16} style={{ color: T.amber }}/> Programar Actividad</div>
      <input placeholder="¿Qué necesitas hacer? *" value={formData.titulo} onChange={(e) => setFormData({...formData, titulo: e.target.value})} style={{ width: "100%", marginBottom: 8, padding: "10px 12px", borderRadius: 6, border: `1px solid ${T.borderHi}`, background: T.bg1, color: T.white, outline: "none" }} />
      <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
         <input type="date" value={formData.fecha} onChange={(e) => setFormData({...formData, fecha: e.target.value})} style={{ flex: 1, padding: "10px 12px", borderRadius: 6, border: `1px solid ${T.borderHi}`, background: T.bg1, color: T.whiteDim, outline: "none" }}/>
         <select value={formData.prioridad} onChange={(e) => setFormData({...formData, prioridad: e.target.value})} style={{ flex: 1, padding: "10px 12px", borderRadius: 6, border: `1px solid ${T.borderHi}`, background: T.bg1, color: T.whiteDim, outline: "none" }}>
            <option value="alta">🔥 Prioridad Alta</option>
            <option value="media">⚡ Prioridad Media</option>
            <option value="baja">☕ Prioridad Baja</option>
         </select>
      </div>
      <button onClick={saveToDb} disabled={saving || !formData.titulo} style={{ width: "100%", padding: "10px 0", background: formData.titulo ? T.amber : T.borderHi, color: "#fff", border: "none", borderRadius: 6, cursor: formData.titulo ? "pointer" : "not-allowed", fontWeight: 600, transition: "0.2s" }}>
        {saving ? "Agendando..." : "Crear Tarea"}
      </button>
    </div>
  );
};

// 4. Analytics Universal Stats Card
const BotStatsCard = ({ title, desc, icon, data, color, onDownload }) => {
  return (
    <div style={{ background: T.bg2, border: `1px solid ${color || T.teal}`, padding: 14, borderRadius: 10, marginTop: 12 }}>
      <div style={{ fontWeight: 600, marginBottom: 8, color: T.white, display: "flex", alignItems: "center", gap: 6 }}><Ico k={icon || "pie-chart"} size={16} style={{ color: color || T.teal }}/> {title}</div>
      <div style={{ fontSize: 12, color: T.whiteDim, marginBottom: 12 }}>{desc}</div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 12 }}>
        {data.map((item, i) => (
          <div key={i} style={{ background: T.bg1, padding: "8px 12px", border: `1px solid ${T.borderHi}`, borderRadius: 6, display: "flex", flexDirection: "column" }}>
            <span style={{ fontSize: 10, color: T.whiteDim, textTransform: "uppercase" }}>{item.label}</span>
            <span style={{ fontSize: 16, fontWeight: 800, color: item.color || T.white }}>{item.value}</span>
          </div>
        ))}
      </div>
      {onDownload && (
        <button onClick={onDownload} style={{ width: "100%", padding: "8px 0", background: "transparent", color: color || T.teal, border: `1px solid ${color || T.teal}`, borderRadius: 6, cursor: "pointer", fontWeight: 600, fontSize: 12, display: "flex", justifyContent: "center", alignItems: "center", gap: 6 }}>
          <Ico k="download" size={14} /> Descargar Reporte Completo
        </button>
      )}
    </div>
  );
};

// 5. Bot Search Result Card
const BotSearchCard = ({ record, type }) => {
    if (!record) return null;
    return (
      <div style={{ background: T.bg2, border: `1px solid ${T.borderHi}`, padding: 12, borderRadius: 10, marginTop: 12, position: "relative", overflow: "hidden" }}>
        <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: 4, background: type === 'empresa' ? T.indigo : T.teal }} />
        <div style={{ fontWeight: 700, color: T.white, fontSize: 14, marginBottom: 4, paddingLeft: 8 }}>{record.nombre || record.titulo || record.titulo}</div>
        <div style={{ fontSize: 12, color: T.whiteDim, paddingLeft: 8 }}>
           {type === 'lead' && <><Ico k="phone" size={10} /> {record.telefono || 'Sin tel'} • <Ico k="mail" size={10} /> {record.email || 'Sin mail'}</>}
           {type === 'empresa' && <><Ico k="briefcase" size={10} /> {record.industria || 'General'} • {record.sitio || 'Sin sitio'}</>}
           {type === 'deal' && <><Ico k="dollar-sign" size={10}/> ${record.valor || 0} • {record.estado}</>}
           {type === 'tarea' && <><Ico k="calendar" size={10}/> {record.vencimiento} • Prioridad: {record.prioridad}</>}
        </div>
      </div>
    );
};


const TimelineView = ({ db }) => {
    // Collect all contacts, deals, tasks created today for a rough audit timeline
    const hoyStr = new Date().toISOString().split('T')[0];
    const events = [];

    (db.contactos || []).forEach(c => {
         if(c.creado && c.creado.startsWith(hoyStr)) events.push({ type: 'lead', time: new Date(c.creado).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}), title: `Creaste al prospecto '${c.nombre}'`, icon: 'user-plus', color: T.teal });
    });
    (db.deals || []).forEach(d => {
         if(d.creado && d.creado.startsWith(hoyStr)) events.push({ type: 'deal', time: new Date(d.creado).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}), title: `Nuevo negocio: '${d.titulo}'`, icon: 'target', color: T.amber });
    });

    if(events.length === 0) return <div style={{ color: T.whiteDim, fontSize: 13, marginTop: 8 }}>No hay actividad destacada registrada hoy en la base de datos de auditoría.</div>;

    // Sort by roughly time (if missing, they end up at the bottom)
    events.sort((a,b) => a.time.localeCompare(b.time));

    return (
        <div style={{ marginTop: 12, borderLeft: `2px solid ${T.borderHi}`, marginLeft: 8, paddingLeft: 16 }}>
            {events.map((ev, i) => (
                <div key={i} style={{ position: "relative", marginBottom: 16 }}>
                    <div style={{ position: "absolute", left: -25, top: 2, background: T.bg1, borderRadius: "50%", padding: 4, display: "flex", border: `1px solid ${T.borderHi}` }}>
                        <Ico k={ev.icon} size={10} style={{ color: ev.color }} />
                    </div>
                    <div style={{ fontSize: 11, color: T.whiteDim, fontWeight: 600 }}>{ev.time}</div>
                    <div style={{ fontSize: 13, color: T.white, marginTop: 2 }}>{ev.title}</div>
                </div>
            ))}
            <div style={{ fontSize: 11, color: T.whiteDim, marginTop: 16 }}>Fin del reporte de actividad.</div>
        </div>
    );
};


export function QualifiBot({ db }) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [inputVal, setInputVal] = useState("");
  const [isListening, setIsListening] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const endRef = useRef(null);

  // Theme detection for dynamic logo
  const currentThemeId = db?.usuario?.tema || localStorage.getItem("crm_theme") || "dark";
  const logoUrl = currentThemeId === 'light' 
    ? "https://res.cloudinary.com/dtmqftcsr/image/upload/v1786422574/ChatGPT_Image_10_ago_2026_23_27_17_1_zix5z3.png" // Logo oscuro (para fondo claro)
    : "https://res.cloudinary.com/dtmqftcsr/image/upload/v1786329945/ChatGPT_Image_9_ago_2026_08_48_30_p.m._1_slrt42.png"; // Logo claro (para fondo oscuro)

  // GLOBAL COMMAND HOOK (Cmd+K)
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Allow Ctrl+K or Cmd+K
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsOpen((prev) => {
          const nextState = !prev;
          if (nextState) setTimeout(() => document.getElementById("botInput")?.focus(), 150);
          return nextState;
        });
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  useEffect(() => {
    if (isOpen && messages.length === 0) {
      const deals = db?.deals || [];
      const seguimientos = deals.filter(d => d.estado?.toLowerCase() === "seguimiento" || d.estado?.toLowerCase() === "nuevo");
      
      let initialNode = (
        <div>
          ¡Hola! Soy el <b>Asistente Ensing 🤖</b>, tu copiloto inteligente. <br/><br/>
          Prueba con el atajo de poder <code style={{background: T.bg2, padding:"2px 6px", borderRadius:4, border:`1px solid ${T.border}`}}>Cmd + K</code> o pídeme simular una cotización, ver el *timeline* de hoy, o dictarme un comando para analizar o exportar <b>cualquier tipo de datos</b> del CRM.
        </div>
      );

      if (seguimientos.length > 0) {
        initialNode = (
          <div>
            ¡Bienvenido! He detectado <b>{seguimientos.length} negocios</b> en etapa de seguimiento o nuevos. 🚨<br/>
            Para no perderlos, te recomiendo exportarlos y enfocarte en ellos hoy mismo. 
            <div style={{ marginTop: 12, display: "flex", gap: 8 }}>
              <button onClick={() => generateExcel(seguimientos, "Urgentes", "Negocios_Prioridad")} style={{ background: T.red, color: "#fff", border: "none", padding: "8px 14px", borderRadius: 6, fontSize: 12, cursor: "pointer", display: "flex", alignItems: "center" }}>
                <Ico k="download" size={14} style={{ marginRight: 6 }} /> Bajar Lista Urgente
              </button>
            </div>
          </div>
        );
      }
      setMessages([{ id: Date.now(), sender: "bot", content: initialNode }]);
    }
  }, [isOpen, messages.length, db]);

  useEffect(() => {
    if (endRef.current) endRef.current.scrollIntoView({ behavior: "smooth" });
  }, [messages, isOpen]);

  // Speech Recognition Hook
  let recognition = null;
  if ('webkitSpeechRecognition' in window) {
    recognition = new window.webkitSpeechRecognition();
    recognition.continuous = false;
    recognition.lang = 'es-ES';
    recognition.onstart = () => setIsListening(true);
    recognition.onresult = (event) => submitQuery(event.results[0][0].transcript);
    recognition.onerror = () => setIsListening(false);
    recognition.onend = () => setIsListening(false);
  }

  const toggleListen = () => {
    if (!recognition) return alert("Tu navegador no soporta el reconocimiento de voz nativo.");
    if (isListening) recognition.stop();
    else recognition.start();
  };

  const generateExcel = (data, sheetName, fileName) => {
    if (!data || data.length === 0) return false;
    const ws = XLSX.utils.json_to_sheet(data);
    const colWidths = [];
    data.forEach(row => {
      Object.keys(row).forEach((key, i) => {
        const val = String(row[key] || "");
        const currentW = colWidths[i] || { wch: key.length };
        if (val.length > currentW.wch) currentW.wch = val.length;
        colWidths[i] = currentW;
      });
    });
    ws['!cols'] = colWidths.map(w => ({ wch: Math.min(w.wch + 2, 50) }));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, sheetName);
    XLSX.writeFile(wb, `${fileName}_${new Date().toISOString().split('T')[0]}.xlsx`);
    return true;
  };

  const generatePDF = (data, fileName) => {
    if (!data || data.length === 0) return false;
    const doc = new jsPDF('landscape');
    const keys = Object.keys(data[0] || {}).slice(0, 12); // limit columns for space
    const rows = data.map(d => keys.map(k => {
      let val = d[k];
      if (typeof val === 'object') val = JSON.stringify(val).substring(0, 30);
      return String(val || '').substring(0, 50); // limit string len
    }));
    doc.text(`Reporte Ensing: ${fileName}`, 14, 15);
    doc.autoTable({
      startY: 20,
      head: [keys.map(k => k.toUpperCase())],
      body: rows,
      theme: 'grid',
      styles: { fontSize: 7, cellPadding: 2 },
      headStyles: { fillColor: [16, 185, 129] } // Teal color
    });
    doc.save(`${fileName}_${new Date().toISOString().split('T')[0]}.pdf`);
    return true;
  };

  const generateWord = (data, fileName) => {
    if (!data || data.length === 0) return false;
    let html = "<html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'><head><meta charset='utf-8'><title>Reporte CRM</title></head><body style='font-family: sans-serif;'>";
    html += `<h2 style='color:#10B981;'>Reporte Ensing: ${fileName}</h2><table border="1" style="border-collapse: collapse; width: 100%; font-size: 11px;">`;
    const keys = Object.keys(data[0] || {});
    html += "<thead><tr>" + keys.map(k => `<th style="background:#f2f2f2; padding:6px; text-align:left;">${k.toUpperCase()}</th>`).join("") + "</tr></thead><tbody>";
    data.forEach(row => {
      html += "<tr>" + keys.map(k => `<td style="padding:4px;">${typeof row[k] === 'object' ? 'Obj' : (row[k] || '')}</td>`).join("") + "</tr>";
    });
    html += "</tbody></table></body></html>";
    const blob = new Blob(['\ufeff', html], { type: 'application/msword' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${fileName}_${new Date().toISOString().split('T')[0]}.doc`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    return true;
  };

  const generateMultiExcel = (tables) => {
    const wb = XLSX.utils.book_new();
    let hasData = false;
    tables.forEach(({ data, name }) => {
      if (data && data.length > 0) {
        hasData = true;
        const ws = XLSX.utils.json_to_sheet(data);
        XLSX.utils.book_append_sheet(wb, ws, name.substring(0, 31)); // max 31 chars per sheet
      }
    });
    if (!hasData) return false;
    XLSX.writeFile(wb, `Respaldo_Total_CRM_${new Date().toISOString().split('T')[0]}.xlsx`);
    return true;
  };


  const processIntent = (text) => {
    const t = text.toLowerCase();

    // ─────────────────────────────────────────────────────────────
    // 1. NLP: EXPORTACIONES Y GENERACIÓN UNIVERSAL ("Reportes de todo")
    // ─────────────────────────────────────────────────────────────
    if (t.match(/descargar|descarga|exportar|exporta|bajar|baja|genera|generar|pasame|dame|necesito|quiero|crear|crea|haz|prepara/i) && t.match(/excel|pdf|word|doc|reporte|lista|csv|datos|matriz|todo/i)) {
      
      // Determine Format
      let format = 'excel';
      if (t.includes('pdf')) format = 'pdf';
      if (t.includes('word') || t.includes('doc')) format = 'word';

      // Detect Entities Dynamically from db
      let entitiesToExport = [];
      const dbKeys = Object.keys(db).filter(k => Array.isArray(db[k]));

      // Predefined synonyms for robustness
      const synonyms = {
         empresas: ['empresa', 'compañia', 'socio', 'empresas', 'b2b'],
         tareas: ['tarea', 'pendiente', 'actividad', 'tareas'],
         deals: ['venta', 'negocio', 'deal', 'pipeline', 'pipline', 'ventas', 'oportunidad', 'oportunidades'],
         contactos: ['contacto', 'cliente', 'lead', 'prospecto', 'contactos'],
         actividades: ['bitacora', 'actividades', 'registro'],
         emails: ['correo', 'email', 'correos', 'emails'],
         productos: ['producto', 'catalogo', 'productos', 'item'],
         notas: ['nota', 'apunte', 'notas'],
         usuariosApp: ['usuario', 'agente', 'equipo', 'usuarios'],
         documentos: ['documento', 'archivo', 'documentos']
      };

      const wordList = t.split(/[\s,]+/);

      dbKeys.forEach(k => {
          // Check if table name is in the text
          let matched = t.includes(k.toLowerCase());
          // Check synonyms
          if (!matched && synonyms[k]) {
              matched = synonyms[k].some(syn => wordList.includes(syn));
          }
          if (matched) {
              const icon = k === 'deals' ? 'dollar-sign' : k === 'contactos' ? 'users' : k === 'empresas' ? 'building' : 'database';
              const color = k === 'deals' ? T.blue : k === 'contactos' ? T.teal : k === 'tareas' ? T.amber : T.fuchsia;
              entitiesToExport.push({ name: k.charAt(0).toUpperCase() + k.slice(1), key: k, icon: icon, color: color });
          }
      });

      // Si pide "absolutamente todo" o simplemente "todo"
      if (t.match(/todo|absolutamente/i) || entitiesToExport.length === 0) {
          if (t.match(/todo|absolutamente/i)) {
              return (
                <div>
                  📦 <b>Respaldo Absoluto (All-In-One):</b>
                  <div style={{ fontSize: 13, color: T.whiteDim, margin: "8px 0" }}>
                     Preparando la extracción completa de <b>todos los módulos</b> del CRM en un único archivo maestro.
                  </div>
                  <button onClick={() => {
                    const tables = Object.keys(db)
                      .filter(k => Array.isArray(db[k]))
                      .map(k => ({ data: db[k], name: k.charAt(0).toUpperCase() + k.slice(1) }));
                    generateMultiExcel(tables);
                  }} style={{ background: T.teal, color: "#fff", border: "none", padding: "8px 14px", borderRadius: 6, fontSize: 12, cursor: "pointer", display: "inline-flex", alignItems: "center", fontWeight: 600, width: "100%", justifyContent: "center" }}>
                    <Ico k="database" size={14} style={{ marginRight: 6 }} /> Descargar Backup Total (.xlsx)
                  </button>
                </div>
              );
          } else {
             return (
                <div>
                  No especificaste el módulo exacto que quieres exportar en <b>{format.toUpperCase()}</b>.<br/><br/>
                  💡 Intenta: <i>"Descargar tareas en PDF"</i>, <i>"Bajar productos en Word"</i> o <i>"Dame absolutamente todo"</i>.
                </div>
             );
          }
      }

      // Return action buttons for matched entities
      return (
        <div>
          {entitiesToExport.map((ent, idx) => {
             const data = db[ent.key] || [];
             if (data.length === 0) return <div key={idx} style={{ marginTop: 8, fontSize: 13, padding: 8, background: T.bg1, border: `1px solid ${T.borderHi}`, borderRadius: 6 }}>No hay datos en <b>{ent.name.replace(/_/g, ' ')}</b> para exportar.</div>;
             
             // Dynamic Pipeline Selection Logic
             if (ent.key === 'deals' && db.pipelines?.length > 1) {
                 const specifiedPipeline = db.pipelines.find(p => t.includes(p.nombre.toLowerCase()));
                 if (specifiedPipeline) {
                     const plData = data.filter(d => d.pipeline_id === specifiedPipeline.id);
                     if (plData.length === 0) return <div key={idx} style={{ marginTop: 8, fontSize: 13, padding: 8, background: T.bg1, border: `1px solid ${T.borderHi}`, borderRadius: 6 }}>El Pipeline "<b>{specifiedPipeline.nombre}</b>" no tiene datos.</div>;
                     
                     const handleDownload = () => {
                         if (format === 'excel') generateExcel(plData, specifiedPipeline.nombre.substring(0,30), `Reporte_${specifiedPipeline.nombre.replace(/ /g, "_")}`);
                         if (format === 'pdf') generatePDF(plData, `Reporte_${specifiedPipeline.nombre.replace(/ /g, "_")}`);
                         if (format === 'word') generateWord(plData, `Reporte_${specifiedPipeline.nombre.replace(/ /g, "_")}`);
                     };
                     
                     return (
                         <div key={idx} style={{ marginTop: 12, background: T.bg2, padding: 12, borderRadius: 8, border: `1px solid ${ent.color}` }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8, fontWeight: 700, color: ent.color }}>
                                <Ico k={ent.icon} size={16} /> Pipeline Encontrado: {specifiedPipeline.nombre}
                            </div>
                            <div style={{ fontSize: 13, color: T.whiteDim, marginBottom: 12 }}>Se preparó la extracción de <b>{plData.length}</b> negocios para este pipeline en formato {format.toUpperCase()}.</div>
                            <button onClick={handleDownload} style={{ background: ent.color, color: "#fff", border: "none", padding: "8px 14px", borderRadius: 6, fontSize: 12, cursor: "pointer", display: "inline-flex", alignItems: "center", fontWeight: 600, width: "100%", justifyContent: "center" }}>
                              <Ico k="download" size={14} style={{ marginRight: 6 }} /> Descargar {format.toUpperCase()}
                            </button>
                         </div>
                     );
                 } else {
                     // Multiple pipelines but none specifically requested
                     return (
                         <div key={idx} style={{ marginTop: 12, background: T.bg2, padding: 12, borderRadius: 8, border: `1px solid ${ent.color}` }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8, fontWeight: 700, color: ent.color }}>
                                <Ico k={ent.icon} size={16} /> Selecciona el Pipeline
                            </div>
                            <div style={{ fontSize: 13, color: T.whiteDim, marginBottom: 12 }}>Veo que tienes múltiples pipelines. ¿De cuál deseas generar el reporte en {format.toUpperCase()}?</div>
                            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                                {db.pipelines.map(p => {
                                    const plData = data.filter(d => d.pipeline_id === p.id);
                                    const handleDownload = () => {
                                        if (plData.length === 0) return;
                                        if (format === 'excel') generateExcel(plData, p.nombre.substring(0,30), `Reporte_${p.nombre.replace(/ /g, "_")}`);
                                        if (format === 'pdf') generatePDF(plData, `Reporte_${p.nombre.replace(/ /g, "_")}`);
                                        if (format === 'word') generateWord(plData, `Reporte_${p.nombre.replace(/ /g, "_")}`);
                                    };
                                    return (
                                        <button key={p.id} disabled={plData.length === 0} onClick={handleDownload} style={{ background: plData.length > 0 ? ent.color : T.borderHi, color: "#fff", border: "none", padding: "8px 14px", borderRadius: 6, fontSize: 12, cursor: plData.length > 0 ? "pointer" : "not-allowed", display: "inline-flex", alignItems: "center", fontWeight: 600, justifyContent: "space-between" }}>
                                          <span>{p.nombre} ({plData.length} registros)</span>
                                          <Ico k="download" size={14} />
                                        </button>
                                    );
                                })}
                            </div>
                         </div>
                     );
                 }
             }

             // Default Logic (No pipeline specific, or only 1 pipeline)
             const handleDownload = () => {
                 if (format === 'excel') generateExcel(data, ent.name.substring(0,30), `Reporte_${ent.name}`);
                 if (format === 'pdf') generatePDF(data, `Reporte_${ent.name}`);
                 if (format === 'word') generateWord(data, `Reporte_${ent.name}`);
             };
             
             return (
                 <div key={idx} style={{ marginTop: 12, background: T.bg2, padding: 12, borderRadius: 8, border: `1px solid ${ent.color}` }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8, fontWeight: 700, color: ent.color }}>
                        <Ico k={ent.icon} size={16} /> Data Lista: {ent.name}
                    </div>
                    <div style={{ fontSize: 13, color: T.whiteDim, marginBottom: 12 }}>Se han consolidado <b>{data.length}</b> registros para exportar en formato {format.toUpperCase()}.</div>
                    <button onClick={handleDownload} style={{ background: ent.color, color: "#fff", border: "none", padding: "8px 14px", borderRadius: 6, fontSize: 12, cursor: "pointer", display: "inline-flex", alignItems: "center", fontWeight: 600, width: "100%", justifyContent: "center" }}>
                      <Ico k="download" size={14} style={{ marginRight: 6 }} /> Descargar Data {format.toUpperCase()}
                    </button>
                 </div>
             );
          })}
        </div>
      );
    }

    // ─────────────────────────────────────────────────────────────
    // 2. NLP: BÚSQUEDAS DINÁMICAS ("buscame a...")
    // ─────────────────────────────────────────────────────────────
    if (t.match(/buscame|busca|encuentra|quien es|datos de|info de/i)) {
        const words = t.split(" ");
        // Intentar extraer nombre/elemento buscando la palabra después del comando
        const searchTerm = t.replace(/buscame a|buscame el|busca a|encuentra a|quien es|datos de|info de|lead|empresa/gi, "").trim();
        
        if (searchTerm.length < 3) return "Por favor, dame un nombre o término más específico (mín. 3 letras) para buscar en la base.";

        const matchContacto = (db.contactos || []).find(c => c.nombre?.toLowerCase().includes(searchTerm) || c.email?.toLowerCase().includes(searchTerm));
        if (matchContacto) return <div>🔍 <b>Extracción exitosa:</b><BotSearchCard record={matchContacto} type="lead" /></div>;

        const matchEmpresa = (db.empresas || []).find(e => e.nombre?.toLowerCase().includes(searchTerm));
        if (matchEmpresa) return <div>🏢 <b>Búsqueda corporativa:</b><BotSearchCard record={matchEmpresa} type="empresa" /></div>;

        const matchDeal = (db.deals || []).find(d => d.titulo?.toLowerCase().includes(searchTerm));
        if (matchDeal) return <div>💼 <b>Trato localizado:</b><BotSearchCard record={matchDeal} type="deal" /></div>;

        return `Lo siento, utilicé algoritmos de búsqueda para "${searchTerm}" pero no arrojó resultados ni en Contactos, ni Empresas, ni Pipeline.`;
    }

    // ─────────────────────────────────────────────────────────────
    // 3. NLP: RESÚMENES Y ANALÍTICA DE ENTIDADES
    // ─────────────────────────────────────────────────────────────
    if (t.match(/resumen|analiza|analizar|analisis|an[aá]lisis|metricas|m[eé]tricas|como vamos|estado|status|reporte/i)) {
        
        // DYNAMIC UNIVERSAL ANALYSIS SYSTEM
        const dbKeys = Object.keys(db).filter(k => Array.isArray(db[k]));
        const synonyms = {
           empresas: ['empresa', 'compañia', 'socio', 'empresas', 'b2b'],
           tareas: ['tarea', 'pendiente', 'actividad', 'tareas'],
           deals: ['venta', 'negocio', 'deal', 'pipeline', 'ventas', 'oportunidad', 'oportunidades'],
           contactos: ['contacto', 'cliente', 'lead', 'prospecto', 'contactos'],
           actividades: ['bitacora', 'actividades', 'registro'],
           emails: ['correo', 'email', 'correos', 'emails'],
           productos: ['producto', 'catalogo', 'productos', 'item'],
           notas: ['nota', 'apunte', 'notas'],
           usuariosApp: ['usuario', 'agente', 'equipo', 'usuarios'],
           documentos: ['documento', 'archivo', 'documentos']
        };

        const wordList = t.split(/[\s,]+/);
        let targetKey = null;

        for (let k of dbKeys) {
            let matched = t.includes(k.toLowerCase());
            if (!matched && synonyms[k]) {
                matched = synonyms[k].some(syn => wordList.includes(syn));
            }
            if (matched) {
                targetKey = k;
                break;
            }
        }

        if (!targetKey && t.match(/empresa|empresas|b2b/i)) targetKey = 'empresas';
        if (!targetKey && t.match(/tarea|tareas|actividad|productividad/i)) targetKey = 'tareas';
        if (!targetKey && t.match(/pipeline|deals|ventas|negocio/i)) targetKey = 'deals';
        if (!targetKey) targetKey = 'deals'; // Default fallback

        const dataArr = db[targetKey] || [];
        const total = dataArr.length;

        if (total === 0) return `Carencia de datos para analizar en ${targetKey.toUpperCase()}.`;

        // Special Pipeline Analysis
        if (targetKey === 'deals') {
            const ganados = dataArr.filter(d => d.estado === "ganado");
            const perdidos = dataArr.filter(d => d.estado === "perdido");
            const activos = total - ganados.length - perdidos.length;
            const rev = ganados.reduce((acc, d) => acc + (Number(d.valor) || 0), 0);
            const chartData = [
                { name: "Ganados", value: ganados.length, color: "#10B981" },
                { name: "Perdidos", value: perdidos.length, color: "#EF4444" },
                { name: "Activos", value: activos, color: "#3B82F6" }
            ].filter(d => d.value > 0);

            return (
              <div style={{ width: "100%" }}>
                📊 <b>Modelo de Rendimiento del Pipeline</b><br/>
                Se ha concretado un Revenue verificado de <b>${rev.toLocaleString("en-US")}</b>.<br/>
                <div style={{ width: "100%", height: 180, marginTop: 16 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={chartData} innerRadius={40} outerRadius={68} dataKey="value" stroke="none" paddingAngle={5}>
                        {chartData.map((e, i) => <Cell key={`cell-${i}`} fill={e.color} />)}
                      </Pie>
                      <Tooltip content={<CustomTooltip/>} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div style={{ display: "flex", gap: 12, justifyContent: "center", fontSize: 11, marginBottom: 12 }}>
                    <div style={{ display:"flex", alignItems:"center", gap: 4 }}><div style={{ width: 8, height: 8, borderRadius: "50%", background: "#10B981" }}/>Ganados</div>
                    <div style={{ display:"flex", alignItems:"center", gap: 4 }}><div style={{ width: 8, height: 8, borderRadius: "50%", background: "#3B82F6" }}/>Proceso</div>
                    <div style={{ display:"flex", alignItems:"center", gap: 4 }}><div style={{ width: 8, height: 8, borderRadius: "50%", background: "#EF4444" }}/>Perd.</div>
                </div>
                <button onClick={() => generateExcel(dataArr, "Pipeline", "Analisis_Total")} style={{ background: T.teal, color: "#fff", border: "none", padding: "6px 12px", borderRadius: 6, fontSize: 12, cursor: "pointer", width: "100%", display: "flex", justifyContent: "center", alignItems: "center" }}>
                  <Ico k="download" size={14} style={{ marginRight: 6 }} /> Descargar Reporte Completo
                </button>
              </div>
            );
        }

        // Generic Dynamic Analysis
        // Try to find a categorical field to group by (like estado, prioridad, tipo, industria, etc.)
        let categoricalField = null;
        const candidateFields = ['estado', 'status', 'prioridad', 'tipo', 'industria', 'categoria', 'rol'];
        
        if (dataArr.length > 0) {
            const firstItem = dataArr[0];
            for (let field of candidateFields) {
                if (firstItem[field] !== undefined) {
                    categoricalField = field;
                    break;
                }
            }
        }

        if (categoricalField) {
            const groups = {};
            dataArr.forEach(item => {
                const val = item[categoricalField] || 'Desconocido';
                groups[val] = (groups[val] || 0) + 1;
            });
            const colors = ["#10B981", "#3B82F6", "#F59E0B", "#EF4444", "#8B5CF6", "#EC4899", "#14B8A6"];
            const chartData = Object.keys(groups).map((key, i) => ({
                name: String(key).toUpperCase(),
                value: groups[key],
                color: colors[i % colors.length]
            }));

            return (
              <div style={{ width: "100%" }}>
                📊 <b>Análisis Inteligente: {targetKey.toUpperCase()}</b><br/>
                Total registrados: <b>{total}</b> registros.<br/>
                Distribución por <i>{categoricalField}</i>:
                <div style={{ width: "100%", height: 180, marginTop: 16 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={chartData} innerRadius={40} outerRadius={68} dataKey="value" stroke="none" paddingAngle={5}>
                        {chartData.map((e, i) => <Cell key={`cell-${i}`} fill={e.color} />)}
                      </Pie>
                      <Tooltip content={<CustomTooltip/>} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div style={{ display: "flex", gap: 8, justifyContent: "center", fontSize: 11, marginBottom: 12, flexWrap: "wrap" }}>
                    {chartData.map((cd, idx) => (
                       <div key={idx} style={{ display:"flex", alignItems:"center", gap: 4 }}><div style={{ width: 8, height: 8, borderRadius: "50%", background: cd.color }}/>{cd.name}</div>
                    ))}
                </div>
                <button onClick={() => generateExcel(dataArr, targetKey, `Analisis_${targetKey}`)} style={{ background: T.indigo, color: "#fff", border: "none", padding: "6px 12px", borderRadius: 6, fontSize: 12, cursor: "pointer", width: "100%", display: "flex", justifyContent: "center", alignItems: "center" }}>
                  <Ico k="download" size={14} style={{ marginRight: 6 }} /> Descargar Data Set Completo
                </button>
              </div>
            );
        }

        // If no categorical field, just show a general stats card
        return <BotStatsCard title={`Reporte de ${targetKey.toUpperCase()}`} desc={`Análisis general de la tabla de ${targetKey}.`} color={T.indigo} icon="database" data={[ { label: "Total Registros", value: total } ]} onDownload={() => generateExcel(dataArr, targetKey, `Analisis_${targetKey}`)} />;
    }

    // ─────────────────────────────────────────────────────────────
    // 4. NLP: INVOCAR FORMS DE CREACION
    // ─────────────────────────────────────────────────────────────
    if (t.match(/crear|crea|agrega|agregar|anotar|anota|nuevo|nueva|inserta/i)) {
        if (t.match(/empresa|compañ[ií]a|organizaci[oó]n|socio|b2b/i)) {
            return <div>🏢 Te asisto con la gestión B2B. <b>Proporciona los datos:</b><EmpresaForm db={db} /></div>;
        }
        if (t.match(/tarea|recordatorio|actividad|llamada|reunion/i)) {
            return <div>📅 Abriendo el agendador universal. <b>Configura la tarea:</b><TareaForm db={db} /></div>;
        }
        if (t.match(/lead|contacto|cliente|prospecto/i)) {
            return <div>📝 Vamos a ingresar un prospecto nativo. <b>Completa los datos:</b><ContactForm db={db} /></div>;
        }
    }

    // ─────────────────────────────────────────────────────────────
    // 5. NLP: OTROS COMPORTAMIENTOS ESPECIFICOS
    // ─────────────────────────────────────────────────────────────
    if (t.match(/cotizar|cotizador|precios|precio|calculadora|simula/i)) {
        return <div>💰 Abriendo la <b>Calculadora CPQ Rápida</b>.<CotizadorForm /></div>;
    }

    if (t.match(/hice hoy|timeline|auditoria|qué he hecho|bitacora/i) || (t.includes("actividad") && t.includes("hoy"))) {
        return <div>🕒 <b>Reporte Diario Local:</b> <TimelineView db={db} /></div>;
    }

    if (t.includes("/cierre") || t.match(/cierre de mes|macro|limpiar|limpieza|borrar/i)) {
        const deals = db.deals || [];
        const stale = deals.filter(d => d.estado?.toLowerCase() === "seguimiento" || d.estado?.toLowerCase() === "nuevo");
        if (stale.length === 0) return "Tu base de datos está completamente limpia. No hay registros estancados para procesar.";
        
        return (
          <div>
            🧹 <b>Motor de Macros Liberado:</b><br/>
            He escaneado el sistema y encontré <b>{stale.length}</b> negocios estancados o sin movimiento reciente.<br/>
            Como me has otorgado acceso sin limitaciones, puedo limpiar la base de datos por ti pasándolos a "Perdido" masivamente.<br/>
            <button onClick={async (e) => {
               const btn = e.target;
               btn.innerText = "Ejecutando limpieza...";
               btn.disabled = true;
               for(let d of stale) {
                   await sb.from("deals").update({estado: "perdido"}).eq("id", d.id);
               }
               btn.innerText = "¡Limpieza Completada con Éxito!";
               btn.style.background = "#10B981";
            }} style={{ marginTop: 12, background: T.red, color: "#fff", border: "none", padding: "8px 14px", borderRadius: 6, fontSize: 12, cursor: "pointer", fontWeight: 600, width: "100%" }}>
               Ejecutar Macro de Limpieza Real
            </button>
          </div>
        );
    }

    if (t.match(/hola|buenos|buenas|saludo|qué tal/i)) return "¡Hola! He sido actualizado a la versión sin limitaciones. Puedo buscar información cruzada en todo el sistema, ejecutar macros reales, y generar reportes de cualquier módulo. ¿Qué necesitas?";

    // ─────────────────────────────────────────────────────────────
    // 6. NLP FALLBACK - BÚSQUEDA PROFUNDA AGI "SIN LIMITACIONES"
    // ─────────────────────────────────────────────────────────────
    
    // 1. Universal Search Engine (Fuzzy match across ALL database tables)
    const stopWords = ['el','la','los','las','un','una','unos','unas','y','o','pero','si','no','de','del','a','al','en','con','por','para','que','qué','como','cómo','quien','quién'];
    const searchTerms = t.split(/[\s,?!]+/).filter(w => w.length > 2 && !stopWords.includes(w.toLowerCase()));
    
    let globalMatches = [];
    if (searchTerms.length > 0) {
        Object.keys(db).filter(k => Array.isArray(db[k])).forEach(table => {
            db[table].forEach(record => {
                let matchScore = 0;
                const recordStr = JSON.stringify(record).toLowerCase();
                searchTerms.forEach(term => {
                    if (recordStr.includes(term.toLowerCase())) matchScore++;
                });
                if (matchScore > 0) {
                    globalMatches.push({ table, record, score: matchScore });
                }
            });
        });
    }

    if (globalMatches.length > 0) {
        // Sort by score
        globalMatches.sort((a,b) => b.score - a.score);
        const topMatches = globalMatches.slice(0, 5); // show top 5
        
        return (
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8, color: T.teal }}>
                <Ico k="cpu" size={16} /> <b>Motor de Inteligencia Omnipresente</b>
            </div>
            He escaneado transversalmente <b>todas las tablas</b> del CRM y encontré {globalMatches.length} registros que coinciden con tu petición.<br/>
            {topMatches.map((m, i) => (
                <div key={i} style={{ marginTop: 8 }}>
                    <BotSearchCard record={m.record} type={m.table === 'contactos' ? 'lead' : m.table === 'empresas' ? 'empresa' : m.table === 'deals' ? 'deal' : m.table === 'tareas' ? 'tarea' : 'general'} />
                    <div style={{ fontSize: 10, color: T.teal, marginTop: 4, textAlign: "right" }}>Encontrado en módulo: {m.table.toUpperCase()}</div>
                </div>
            ))}
            {globalMatches.length > 5 && <div style={{ fontSize: 11, color: T.whiteDim, marginTop: 12, textAlign: "center" }}>...y {globalMatches.length - 5} resultados más. Pídeme un reporte si quieres exportarlos.</div>}
          </div>
        );
    }

    // 2. AGI Conversational Response if no data found
    return (
      <div>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8, color: T.teal }}>
            <Ico k="zap" size={16} /> <b>Asistente AGI Desbloqueado</b>
        </div>
        No encontré datos específicos en el CRM relacionados con <i>"{text}"</i>, pero como tu asistente sin límites, mi capacidad de lectura de base de datos está al máximo.<br/><br/>
        Recuerda que ahora puedo:<br/>
        <ul style={{ margin: "8px 0 8px 18px", padding: 0, color: T.whiteDim }}>
            <li>Buscar en <b>todos</b> los módulos a la vez.</li>
            <li><b>Ejecutar macros reales</b> para alterar o limpiar datos (ej. "Limpiar base").</li>
            <li>Generar analíticas de cualquier métrica transversal.</li>
        </ul>
      </div>
    );
  };

  const submitQuery = (txt) => {
    if (!txt || !txt.trim()) return;
    setInputVal("");
    setMessages((prev) => [...prev, { id: Date.now(), sender: "user", content: txt }]);
    setTimeout(() => {
      const botResponse = processIntent(txt);
      setMessages((prev) => [...prev, { id: Date.now(), sender: "bot", content: botResponse }]);
    }, 600);
  };

  const handleSend = (e) => {
    e.preventDefault();
    submitQuery(inputVal);
  };

  const btnPill = { whiteSpace: "nowrap", background: T.bg2, border: `1px solid ${T.borderHi}`, padding: "6px 10px", borderRadius: 20, color: T.white, fontSize: 12, display: "flex", alignItems: "center", gap: 6, cursor: "pointer", transition: "all 0.2s" };

  return (
    <>
      <div style={{ position: "fixed", bottom: isOpen ? 24 : 96, right: 32, zIndex: 9999, display: "flex", flexDirection: "column", alignItems: "flex-end", transition: "bottom 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)" }}>
        {isOpen && (
          <div style={{ width: 380, height: 600, backgroundColor: T.bg1, borderRadius: 16, boxShadow: "0 10px 40px rgba(0,0,0,0.3), 0 0 0 1px rgba(255,255,255,0.05)", border: `1px solid ${T.borderHi}`, marginBottom: 16, display: "flex", flexDirection: "column", overflow: "hidden", animation: "slideUpBot 0.3s cubic-bezier(0.16, 1, 0.3, 1)" }}>
            
            {/* Header */}
            <div style={{ height: 68, backgroundColor: T.teal, backgroundImage: "linear-gradient(135deg, rgba(255,255,255,0.15) 0%, rgba(0,0,0,0) 100%)", display: "flex", alignItems: "center", padding: "0 16px", justifyContent: "space-between", flexShrink: 0 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div style={{ backgroundColor: "rgba(255,255,255,0.2)", borderRadius: "50%", width: 42, height: 42, display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "inset 0 0 15px rgba(0,0,0,0.1)", overflow: "hidden", padding: 6 }}>
                  <img src="https://res.cloudinary.com/dtmqftcsr/image/upload/v1786329945/ChatGPT_Image_9_ago_2026_08_49_19_p.m._1_pjqhul.png" alt="Logo" style={{ width: "100%", height: "100%", objectFit: "contain" }} />
                </div>
                <div>
                  <div style={{ color: "var(--btnText, #fff)", fontWeight: 800, fontSize: 16, letterSpacing: "-0.3px", display: "flex", alignItems: "center", gap: 6 }}>
                      Asistente Ensing 
                      <code style={{ fontSize: 9, background: "rgba(0,0,0,0.2)", padding: "2px 4px", borderRadius: 4}}>Ctrl+K</code>
                  </div>
                  <div style={{ color: "var(--btnText, #fff)", opacity: 0.8, fontSize: 12, display: "flex", alignItems: "center", gap: 4 }}>
                    <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#4ade80", boxShadow: "0 0 6px #4ade80", animation: "botFloat 2s infinite" }} />
                    Sistema Listo
                  </div>
                </div>
              </div>
              <button onClick={() => setIsOpen(false)} style={{ background: "transparent", border: "none", color: "var(--btnText, #fff)", cursor: "pointer", opacity: 0.8, padding: 4 }}>
                <Ico k="x" size={20} />
              </button>
            </div>

            {/* Messages */}
            <div id="botScrollContainer" style={{ flex: 1, overflowY: "auto", padding: "20px 16px", display: "flex", flexDirection: "column", gap: 18, backgroundColor: T.bg0 }}>
              {messages.map((m) => (
                <div key={m.id} style={{ alignSelf: m.sender === "user" ? "flex-end" : "flex-start", maxWidth: "90%", backgroundColor: m.sender === "user" ? T.teal : T.bg1, color: m.sender === "user" ? "var(--btnText, #fff)" : T.white, padding: "14px 16px", borderRadius: 16, borderBottomRightRadius: m.sender === "user" ? 4 : 16, borderBottomLeftRadius: m.sender === "bot" ? 4 : 16, fontSize: 13, lineHeight: "1.5", border: m.sender === "bot" ? `1px solid ${T.borderHi}` : "none", boxShadow: m.sender === "bot" ? "0 2px 10px rgba(0,0,0,0.1)" : "0 2px 10px rgba(0,0,0,0.15)", animation: "popIn 0.3s cubic-bezier(0.16, 1, 0.3, 1)" }}>
                  {m.content}
                </div>
              ))}
              <div ref={endRef} />
            </div>

            {/* Quick Suggestions Row */}
            <div style={{ padding: "12px 16px", display: "flex", flexWrap: "wrap", gap: 8, background: T.bg1, borderTop: `1px solid ${T.borderHi}` }}>
                 <button onClick={() => submitQuery("/cotizador")} style={btnPill}><Ico k="dollar-sign" size={12} style={{color: T.teal}}/> Cotizador Ligero</button>
                 <button onClick={() => submitQuery("¿Qué hice hoy?")} style={btnPill}><Ico k="clock" size={12} style={{color: T.teal}}/> Mi Timeline</button>
                 <button onClick={() => submitQuery("Analiza mis ventas")} style={btnPill}><Ico k="pie-chart" size={12} style={{color: T.teal}}/> Gráfico del Embudo</button>
                 <button onClick={() => submitQuery("/cierre de mes")} style={btnPill}><Ico k="database" size={12} style={{color: T.teal}}/> Limpieza Batch</button>
            </div>

            {/* Input Form with Voice Button */}
            <form onSubmit={handleSend} style={{ background: T.bg1, padding: "12px 16px", display: "flex", alignItems: "center", gap: 10, paddingBottom: 16 }}>
              <button type="button" onClick={toggleListen} style={{ width: 44, height: 44, borderRadius: "50%", background: isListening ? T.red : T.bg2, border: isListening ? "none" : `1px solid ${T.borderHi}`, color: isListening ? "#fff" : T.white, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", transition: "all 0.2s", boxShadow: isListening ? `0 0 15px ${T.red}` : "none" }}>
                <Ico k="mic" size={20} />
              </button>

              <input id="botInput" type="text" placeholder={isListening ? "Escuchando..." : "Comandos (ej. /cotizar)"} value={inputVal} onChange={(e) => setInputVal(e.target.value)} style={{ flex: 1, background: T.bg2, border: `1px solid ${T.borderHi}`, padding: "12px 16px", borderRadius: 24, color: T.white, outline: "none", fontSize: 13, transition: "border 0.2s" }} />
              
              <button type="submit" disabled={!inputVal.trim()} style={{ width: 44, height: 44, borderRadius: "50%", background: inputVal.trim() ? T.teal : T.borderHi, border: "none", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", cursor: inputVal.trim() ? "pointer" : "not-allowed", transition: "transform 0.2s" }}>
                <Ico k="send" size={18} />
              </button>
            </form>
          </div>
        )}

        {/* Modern Hover-Expanding Button Launcher */}
        {!isOpen && (
          <div 
            onClick={() => setIsOpen(true)} 
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            style={{ 
              height: 52, 
              borderRadius: 26, 
              backgroundColor: T.teal, 
              backgroundImage: "linear-gradient(135deg, rgba(255,255,255,0.2) 0%, rgba(0,0,0,0) 100%)", 
              boxShadow: `0 8px 24px rgba(0,0,0,0.2), inset 0 2px 4px rgba(255,255,255,0.3)`, 
              display: "flex", 
              alignItems: "center", 
              padding: isHovered ? "0 22px 0 16px" : "0",
              width: isHovered ? "auto" : 52,
              justifyContent: isHovered ? "flex-start" : "center",
              gap: isHovered ? 12 : 0, 
              cursor: "pointer", 
              transition: "all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)", 
              border: "1px solid rgba(255,255,255,0.1)", 
              animation: "botFloat 3s ease-in-out infinite",
              overflow: "hidden"
            }}>
            <div style={{ width: 32, height: 32, borderRadius: "50%", backgroundColor: "rgba(0,0,0,0.1)", display: "flex", alignItems: "center", justifyContent: "center", position: "relative", flexShrink: 0, padding: 4 }}>
               <img src="https://res.cloudinary.com/dtmqftcsr/image/upload/v1786329945/ChatGPT_Image_9_ago_2026_08_49_19_p.m._1_pjqhul.png" alt="Logo" style={{ width: "100%", height: "100%", objectFit: "contain", filter: "drop-shadow(0 1px 2px rgba(0,0,0,0.2))" }} />
               <div style={{ position: "absolute", top: 0, right: 0, width: 8, height: 8, backgroundColor: "#ef4444", borderRadius: "50%", boxShadow: "0 0 0 2px " + T.teal }} />
            </div>
            
            <span style={{ 
              color: "var(--btnText, #fff)", 
              fontWeight: 700, 
              fontSize: 15, 
              letterSpacing: "-0.2px", 
              textShadow: "0 1px 2px rgba(0,0,0,0.1)",
              opacity: isHovered ? 1 : 0,
              width: isHovered ? "auto" : 0,
              whiteSpace: "nowrap",
              display: "flex",
              alignItems: "center",
              transition: "all 0.3s ease"
            }}>
              Asistente Ensing <code style={{ fontSize: 10, background:"rgba(0,0,0,0.2)", padding:"2px 4px", borderRadius:4, marginLeft:6, verticalAlign:"middle"}}>Ctrl+K</code>
            </span>
          </div>
        )}
      </div>

      <style>{`
        @keyframes slideUpBot { from { opacity: 0; transform: translateY(20px) scale(0.95); } to { opacity: 1; transform: translateY(0) scale(1); } }
        @keyframes botFloat { 0% { transform: translateY(0px); } 50% { transform: translateY(-5px); } 100% { transform: translateY(0px); } }
        @keyframes popIn { 0% { opacity: 0; transform: scale(0.95) translateY(10px); } 100% { opacity: 1; transform: scale(1) translateY(0); } }
        .hide-scroll::-webkit-scrollbar { display: none; }
        .hide-scroll { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
    </>
  );
}

