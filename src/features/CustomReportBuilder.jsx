import { useState, useMemo } from "react";
import { T } from "../theme";
import { money, uid } from "../utils";
import { Btn, Ico, Tarjeta, Modal, Inp, Sel } from "../components/ui";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from "recharts";

const COLORS = [T.teal, T.green, T.amber, "#A78BFA", "#F472B6", "#60A5FA", "#FB923C"];

export const CustomReportBuilder = ({ db, guardarEnSupa, eliminarDeSupa }) => {
  const [showEditor, setShowEditor] = useState(false);
  const [form, setForm] = useState({
    nombre: "Mi Reporte Viral",
    tipoGrafico: "bar", // bar, pie
    metrica: "valor_total", // count, valor_total
    agruparPor: "responsable", // responsable, etapa, fuente
  });

  const customReports = db.custom_reports || [];

  const generarData = (config) => {
    const { metrica, agruparPor } = config;
    const items = agruparPor === "fuente" ? db.contactos : db.deals;
    
    const stats = items.reduce((acc, item) => {
      let key = "Desconocido";
      if (agruparPor === "responsable") key = item.responsable || "Sin Asignar";
      if (agruparPor === "fuente") key = item.fuente || "Sin Fuente";
      if (agruparPor === "etapa") {
         const pl = db.pipelines.find(p => p.id === item.pipeline_id);
         key = pl?.etapas.find(e => e.id === item.etapa_id)?.nombre || "N/A";
      }

      if (!acc[key]) acc[key] = { name: key, value: 0 };
      
      if (metrica === "count") {
        acc[key].value += 1;
      } else {
        acc[key].value += (item.valor || 0);
      }
      return acc;
    }, {});

    return Object.values(stats).sort((a, b) => b.value - a.value);
  };

  const guardar = async () => {
    const report = {
      id: "rep" + uid(),
      nombre: form.nombre,
      configuracion: form,
      creado: new Date().toISOString()
    };
    await guardarEnSupa("custom_reports", report);
    setShowEditor(false);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24, marginTop: 40 }}>
      <div style={{ borderTop: `1px solid ${T.borderHi}`, paddingTop: 40, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <div style={{ fontSize: 20, fontWeight: 800, color: T.white }}>Reportes Personalizados</div>
          <div style={{ fontSize: 13, color: T.whiteDim, marginTop: 4 }}>Crea tus propias visualizaciones basadas en cualquier métrica del CRM.</div>
        </div>
        <Btn onClick={() => setShowEditor(true)} variant="primario" style={{ background: T.amber, color: "#000" }}><Ico k="plus" size={14} /> Crear Reporte</Btn>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
        {customReports.map(r => {
          const data = generarData(r.configuracion);
          const isBar = r.configuracion.tipoGrafico === "bar";

          return (
            <Tarjeta key={r.id} style={{ padding: 24, minHeight: 400, display: "flex", flexDirection: "column" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
                <div>
                  <div style={{ fontWeight: 800, color: T.white, fontSize: 16 }}>{r.nombre}</div>
                  <div style={{ fontSize: 11, color: T.whiteDim, textTransform: "uppercase", letterSpacing: ".1em", marginTop: 4 }}>
                    {r.configuracion.metrica} por {r.configuracion.agruparPor}
                  </div>
                </div>
                <Btn variant="fantasma" size="xs" onClick={() => eliminarDeSupa("custom_reports", r.id)} style={{ color: T.red }}><Ico k="trash" size={14} /></Btn>
              </div>

              <div style={{ flex: 1, minHeight: 250 }}>
                <ResponsiveContainer width="100%" height="100%">
                  {isBar ? (
                    <BarChart data={data}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={T.borderHi} />
                      <XAxis dataKey="name" tick={{ fill: T.whiteDim, fontSize: 11 }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fill: T.whiteDim, fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={v => r.configuracion.metrica === "valor_total" ? `$${v/1000}k` : v} />
                      <Tooltip contentStyle={{ background: T.bg1, border: `1px solid ${T.borderHi}`, borderRadius: 8 }} />
                      <Bar dataKey="value" fill={T.teal} radius={[4, 4, 0, 0]} />
                    </BarChart>
                  ) : (
                    <PieChart>
                      <Pie data={data} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} stroke="none">
                        {data.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                      </Pie>
                      <Tooltip contentStyle={{ background: T.bg1, border: `1px solid ${T.borderHi}`, borderRadius: 8 }} />
                      <Legend />
                    </PieChart>
                  )}
                </ResponsiveContainer>
              </div>
            </Tarjeta>
          );
        })}
      </div>

      {showEditor && (
        <Modal title="Configurar Reporte Custom" onClose={() => setShowEditor(false)}>
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            <div>
              <label style={{ fontSize: 11, fontWeight: 700, color: T.whiteDim }}>NOMBRE DEL REPORTE</label>
              <Inp value={form.nombre} onChange={e => setForm({ ...form, nombre: e.target.value })} />
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div>
                <label style={{ fontSize: 11, fontWeight: 700, color: T.whiteDim }}>MÉTRICA</label>
                <Sel value={form.metrica} onChange={e => setForm({ ...form, metrica: e.target.value })}>
                  <option value="valor_total">Valor Total (Revenue)</option>
                  <option value="count">Cantidad de Registros</option>
                </Sel>
              </div>
              <div>
                <label style={{ fontSize: 11, fontWeight: 700, color: T.whiteDim }}>AGRUPAR POR</label>
                <Sel value={form.agruparPor} onChange={e => setForm({ ...form, agruparPor: e.target.value })}>
                  <option value="responsable">Responsable</option>
                  <option value="etapa">Etapa del Pipeline</option>
                  <option value="fuente">Fuente del Lead</option>
                </Sel>
              </div>
            </div>

            <div>
              <label style={{ fontSize: 11, fontWeight: 700, color: T.whiteDim }}>TIPO DE GRÁFICO</label>
              <div style={{ display: "flex", gap: 10, marginTop: 8 }}>
                <button 
                  onClick={() => setForm({ ...form, tipoGrafico: "bar" })}
                  style={{ flex: 1, padding: 12, background: form.tipoGrafico === "bar" ? T.tealSoft : T.bg2, border: `1px solid ${form.tipoGrafico === "bar" ? T.teal : T.border}`, borderRadius: 10, color: T.white, cursor: "pointer" }}
                >
                  <Ico k="board" size={16} /> Barras
                </button>
                <button 
                  onClick={() => setForm({ ...form, tipoGrafico: "pie" })}
                  style={{ flex: 1, padding: 12, background: form.tipoGrafico === "pie" ? T.tealSoft : T.bg2, border: `1px solid ${form.tipoGrafico === "pie" ? T.teal : T.border}`, borderRadius: 10, color: T.white, cursor: "pointer" }}
                >
                  <Ico k="chart" size={16} /> Pastel
                </button>
              </div>
            </div>

            <div style={{ display: "flex", gap: 12, marginTop: 10 }}>
              <Btn variant="secundario" onClick={() => setShowEditor(false)} full>Cancelar</Btn>
              <Btn onClick={guardar} full style={{ background: T.teal, color: "#000" }}>Guardar Configuración</Btn>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
