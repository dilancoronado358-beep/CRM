import { useState } from "react";
import { T } from "../theme";
import { money } from "../utils";
import { Tarjeta, KPI, EncabezadoSeccion } from "../components/ui";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend } from "recharts";

const COLORS = [T.teal, T.green, T.amber, "#A78BFA", "#F472B6", "#60A5FA"];

export const Reportes = ({ db }) => {
  const pl = db.pipelines[0];
  const deals = db.deals.filter(d => d.pipelineId === pl?.id);
  const totalValor = deals.reduce((s, d) => s + d.valor, 0);
  const ganados = deals.filter(d => pl?.etapas.find(e => e.id === d.etapaId)?.esGanado);
  const perdidos = deals.filter(d => pl?.etapas.find(e => e.id === d.etapaId)?.esPerdido);
  const activos = deals.filter(d => !pl?.etapas.find(e => e.id === d.etapaId)?.esGanado && !pl?.etapas.find(e => e.id === d.etapaId)?.esPerdido);
  const valGanados = ganados.reduce((s, d) => s + d.valor, 0);

  const statsFuente = db.contactos.reduce((acc, c) => { acc[c.fuente] = (acc[c.fuente] || 0) + 1; return acc; }, {});
  const dataFuentes = Object.keys(statsFuente).map(k => ({ name: k, value: statsFuente[k] })).sort((a, b) => b.value - a.value);

  const dataPipeline = [
    { name: "Activos", cantidad: activos.length, valor: activos.reduce((s, d) => s + d.valor, 0), fill: T.teal },
    { name: "Ganados", cantidad: ganados.length, valor: ganados.reduce((s, d) => s + d.valor, 0), fill: T.green },
    { name: "Perdidos", cantidad: perdidos.length, valor: perdidos.reduce((s, d) => s + d.valor, 0), fill: T.red },
  ];

  return (
    <div>
      <EncabezadoSeccion title="Reportes Analíticos Profesionales" sub="Métricas en tiempo real de tu CRM" />

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px,1fr))", gap: 16, marginBottom: 24 }}>
        <KPI label="Valor Total Pipeline" value={money(totalValor)} color={T.teal} icon="funnel" />
        <KPI label="Ingresos Cerrados" value={money(valGanados)} color={T.green} icon="trend" />
        <KPI label="Win Rate" value={`${deals.length > 0 ? Math.round(ganados.length / deals.length * 100) : 0}%`} sub={`${ganados.length} deals ganados`} color={T.amber} icon="star" />
        <KPI label="Leads Generados" value={db.contactos.length} color="#A78BFA" icon="users" />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1.5fr 1fr", gap: 20 }}>
        <Tarjeta style={{ padding: 24, display: "flex", flexDirection: "column", minHeight: 350 }}>
          <div style={{ fontSize: 16, fontWeight: 800, color: T.white, marginBottom: 8 }}>Desempeño del Pipeline ({pl?.nombre})</div>
          <div style={{ fontSize: 13, color: T.whiteDim, marginBottom: 20 }}>Visión general del valor en cada fase macro.</div>
          <div style={{ flex: 1, minHeight: 250 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={dataPipeline} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={T.borderHi} />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 13, fontWeight: 700, fill: T.whiteDim }} dy={10} />
                <YAxis axisLine={false} tickLine={false} tickFormatter={v => `$${v/1000}k`} tick={{ fontSize: 11, fill: T.whiteDim }} dx={-10} />
                <Tooltip 
                  cursor={{ fill: T.bg2 }}
                  contentStyle={{ background: T.bg1, border: `1px solid ${T.borderHi}`, borderRadius: 8, boxShadow: "0 4px 15px rgba(0,0,0,0.05)" }}
                  formatter={(val) => [money(val), "Valor Total"]}
                />
                <Bar dataKey="valor" radius={[6, 6, 0, 0]} barSize={50}>
                  {dataPipeline.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.fill} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Tarjeta>
        
        <Tarjeta style={{ padding: 24, display: "flex", flexDirection: "column", minHeight: 350 }}>
          <div style={{ fontSize: 16, fontWeight: 800, color: T.white, marginBottom: 8 }}>Distribución por Fuente</div>
          <div style={{ fontSize: 13, color: T.whiteDim, marginBottom: 20 }}>Origen de tus leads y contactos.</div>
          <div style={{ flex: 1, minHeight: 250, display: "flex", justifyContent: "center", alignItems: "center" }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie 
                  data={dataFuentes} 
                  cx="50%" 
                  cy="50%" 
                  innerRadius={60} 
                  outerRadius={90} 
                  paddingAngle={5} 
                  dataKey="value"
                  stroke="none"
                >
                  {dataFuentes.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ background: T.bg1, border: `1px solid ${T.borderHi}`, borderRadius: 8, boxShadow: "0 4px 15px rgba(0,0,0,0.05)", fontWeight: 700 }}
                  formatter={(val, name) => [`${val} leads`, name]}
                />
                <Legend verticalAlign="bottom" height={36} iconType="circle" wrapperStyle={{ fontSize: 12, fontWeight: 600, color: T.whiteDim }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </Tarjeta>
      </div>
    </div>
  );
};
