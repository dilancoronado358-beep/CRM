import { useMemo, useState } from "react";
import { T } from "../theme";
import { money } from "../utils";
import { Tarjeta, Ico, Btn, Vacio, Chip } from "../components/ui";
import { 
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, 
  LineChart, Line, CartesianGrid, Area, AreaChart, PieChart, Pie,
  ComposedChart, Legend, RadialBarChart, RadialBar, PolarAngleAxis
} from "recharts";

const MONTHS = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
const sNum = (v) => isNaN(v) || v == null ? 0 : v;

const CustomTooltip = ({ active, payload, label, formatter }) => {
  if (active && payload && payload.length) {
    return (
      <div style={{ background: "rgba(20, 20, 30, 0.9)", backdropFilter: "blur(10px)", border: `1px solid rgba(255,255,255,0.1)`, padding: "12px 16px", borderRadius: 12, boxShadow: "0 8px 32px rgba(0,0,0,0.5)" }}>
        {label && <div style={{ margin: "0 0 8px 0", fontSize: 11, color: "rgba(255,255,255,0.6)", fontWeight: 800, textTransform: "uppercase" }}>{label}</div>}
        {payload.map((p, i) => (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 6 }}>
             <div style={{ width: 10, height: 10, borderRadius: 3, background: p.color || p.fill }} />
             <span style={{ fontSize: 13, color: "#fff", fontWeight: 700 }}>{p.name}: <span style={{opacity: 0.9, fontWeight: 500}}>{formatter ? formatter(p.value) : p.value}</span></span>
          </div>
        ))}
      </div>
    );
  }
  return null;
};

const SectionTitle = ({ title, icon, color }) => (
  <div style={{ gridColumn: "1 / -1", display: "flex", alignItems: "center", gap: 14, marginTop: 40, marginBottom: 16 }}>
     <div style={{ width: 4, height: 24, borderRadius: 10, background: color || T.teal, boxShadow: `0 0 10px ${color || T.teal}33` }} />
     <h2 style={{ fontSize: 20, fontWeight: 900, color: T.white, margin: 0, letterSpacing: "-.02em" }}>{title}</h2>
     <div style={{ flex: 1, height: 1, background: `linear-gradient(90deg, rgba(255,255,255,0.1) 0%, rgba(255,255,255,0) 100%)`, marginLeft: 16 }} />
  </div>
);

const WidgetWrapper = ({ id, title, icon, color, children, span = 1, height, sub = "" }) => {
  return (
    <Tarjeta brillo style={{
      padding: 24, display: "flex", flexDirection: "column", gap: 16,
      gridColumn: `span ${span}`, minHeight: height || "auto",
      border: `1px solid rgba(255,255,255,0.05)`, background: T.bg1
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
          <div style={{ fontWeight: 900, fontSize: 11, color: T.whiteDim, display: "flex", alignItems: "center", gap: 8, textTransform: "uppercase", letterSpacing: ".1em" }}>
            <Ico k={icon} size={14} style={{ color: color || T.teal }} /> {title}
          </div>
          {sub && <div style={{ fontSize: 10, color: T.whiteFade, fontWeight: 700 }}>{sub}</div>}
        </div>
      </div>
      <div style={{ flex: 1, display: "flex", flexDirection: "column", minHeight: 0, overflow: "hidden" }}>
        {children}
      </div>
    </Tarjeta>
  );
};

const Delta = ({ cur, prev }) => {
  const c = sNum(cur); const p = sNum(prev);
  const diff = p === 0 ? 0 : Math.round(((c - p) / p) * 100);
  const color = diff >= 0 ? T.green : T.red;
  if (p === 0) return null;
  return (
    <div style={{ fontSize: 10, fontWeight: 900, color, display: "inline-flex", alignItems: "center", gap: 4 }}>
       <Ico k={diff >= 0 ? "trend-up" : "trend-down"} size={10} /> {Math.abs(diff)}%
    </div>
  );
};

export const Dashboard = ({ db = {} }) => {
  const [rango, setRango] = useState("30");
  const [plIdSeleccionado, setPlIdSeleccionado] = useState("");
  const myOrgId = db.usuario?.org_id;
  const now = new Date();
  const limitDays = parseInt(rango) || 30;
  const limit = new Date(now.getTime() - (limitDays * 86400000));
  const limitPrev = new Date(now.getTime() - (limitDays * 2 * 86400000));

  const allPipelines = db.pipelines || [];
  const orgDeals = (db.deals || []).filter(d => d && (d.org_id === myOrgId || !d.org_id));
  const orgTasks = (db.tareas || []);
  const orgContacts = (db.contactos || []);
  const orgExpenses = (db.finanzas_gastos || []);
  const orgCommissions = (db.finanzas_comisiones || []);
  const orgMsgs = (db.whatsapp_messages || []);
  const orgActs = (db.actividades || []);

  const currentPipeline = allPipelines.find(p => p.id === plIdSeleccionado) || allPipelines[0];

  const esGanado = (d) => {
    if (!d || !d.pipeline_id || !d.etapa_id) return false;
    const pl = allPipelines.find(p => p.id == d.pipeline_id);
    return pl?.etapas?.find(e => e.id == d.etapa_id)?.es_ganado || false;
  };
  const esPerdido = (d) => {
    if (!d || !d.pipeline_id || !d.etapa_id) return false;
    const pl = allPipelines.find(p => p.id == d.pipeline_id);
    return pl?.etapas?.find(e => e.id == d.etapa_id)?.es_perdido || false;
  };

  const wonNow = orgDeals.filter(d => new Date(d.creado) >= limit && esGanado(d));
  const valNow = wonNow.reduce((s,d) => s + (d.valor || 0), 0);
  const valPrev = orgDeals.filter(d => {
    const t = new Date(d.creado);
    return !isNaN(t) && t >= limitPrev && t < limit && esGanado(d);
  }).reduce((s,d) => s + (d.valor || 0), 0);

  const contactsNow = orgContacts.filter(c => new Date(c.creado || c.created_at) >= limit).length;
  const contactsPrev = orgContacts.filter(c => {
    const t = new Date(c.creado || c.created_at);
    return !isNaN(t) && t >= limitPrev && t < limit;
  }).length;

  const tasksPendingNow = orgTasks.filter(t => t.estado !== "completada" && new Date(t.creado || t.created_at) >= limit).length;
  const tasksPendingPrev = orgTasks.filter(t => {
     const tm = new Date(t.creado || t.created_at);
     return t.estado !== "completada" && tm >= limitPrev && tm < limit;
  }).length;

  const globalConversion = (orgDeals.filter(esGanado).length / Math.max(1, orgDeals.length)) * 100;

  // 1. TIPO TARTA (DONUT) - Orígenes
  const COLORS = ["#10B981", "#3B82F6", "#8B5CF6", "#F59E0B", "#EC4899", "#14B8A6"];
  const originDist = useMemo(() => {
     const sources = { "Referido": 0, "Web": 0, "Orgánico": 0, "Publicidad": 0, "Directo": 0 };
     orgContacts.forEach(c => {
         const o = c.origen || (Math.random() > 0.5 ? "Referido" : Math.random() > 0.5 ? "Web" : "Directo");
         if (sources[o] !== undefined) sources[o]++;
         else sources["Directo"]++;
     });
     return Object.keys(sources).map((k, i) => ({ name: k, value: sources[k], fill: COLORS[i % COLORS.length] })).filter(d => d.value > 0);
  }, [orgContacts]);

  // 2. RADIAL BAR CHART - Meta
  const metaMensual = 50000;
  const porcentajeMeta = Math.min(100, Math.round((valNow / metaMensual) * 100));
  const radialData = [{ name: "Meta Mensual", value: porcentajeMeta, fill: T.amber }];

  // 3. COMPOSED CHART - Finanzas
  const finData = useMemo(() => {
    const mths = Array.from({length: 6}, (_, i) => {
       const d = new Date(); d.setMonth(d.getMonth() - (5 - i));
       return { name: MONTHS[d.getMonth()] || "?", ingresos: 0, gastos: 0, comisiones: 0 };
    });
    const addData = (arr, key, dateField, valField) => {
       arr.forEach(item => {
           const dt = new Date(item[dateField]);
           if (isNaN(dt.getTime())) return;
           const diff = (now.getFullYear() * 12 + now.getMonth()) - (dt.getFullYear() * 12 + dt.getMonth());
           if (diff >= 0 && diff < 6) mths[5 - diff][key] += (Number(item[valField]) || 0);
       });
    };
    addData(orgDeals.filter(esGanado), "ingresos", "creado", "valor");
    addData(orgExpenses, "gastos", "creado", "monto");
    addData(orgCommissions, "comisiones", "creado", "monto");
    
    return mths.map(m => ({ ...m, rentabilidad: m.ingresos - m.gastos - m.comisiones }));
  }, [orgDeals, orgExpenses, orgCommissions]);

  // 4. LINE CHART - Histórico
  const historyData = useMemo(() => {
    const mths = Array.from({length: 12}, (_, i) => {
       const d = new Date(); d.setMonth(d.getMonth() - (11 - i));
       return { name: MONTHS[d.getMonth()] || "?", value: 0 };
    });
    orgDeals.filter(esGanado).forEach(d => {
       const dt = new Date(d.creado);
       if (isNaN(dt.getTime())) return;
       const diff = (now.getFullYear() * 12 + now.getMonth()) - (dt.getFullYear() * 12 + dt.getMonth());
       if (diff >= 0 && diff < 12) mths[11 - diff].value += (d.valor || 0);
    });
    return mths;
  }, [orgDeals]);

  // 5. VERTICAL BAR CHART - Funnel
  const funnelSteps = useMemo(() => {
    if (!currentPipeline) return [];
    const stages = (currentPipeline.etapas || []);
    return stages.map(st => ({
       name: st.nombre, v: orgDeals.filter(d => d.etapa_id === st.id && d.pipeline_id === currentPipeline.id).length
    }));
  }, [orgDeals, currentPipeline]);

  // 6. AREA CHART - Pulso
  const hourlyPulse = useMemo(() => {
    const hours = Array.from({length: 24}, (_, i) => ({ h: `${i}h`, v: 0, a: 0 }));
    orgMsgs.filter(m => new Date(m.creado) >= limit).forEach(m => {
       const h = new Date(m.creado).getHours();
       if (h >= 0 && h < 24) hours[h].v++;
    });
    orgActs.filter(m => new Date(m.creado) >= limit).forEach(m => {
       const h = new Date(m.creado).getHours();
       if (h >= 0 && h < 24) hours[h].a++;
    });
    return hours;
  }, [orgMsgs, orgActs, limit]);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 36, paddingBottom: 160 }}>
      {/* HEADER */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: `1px solid rgba(255,255,255,0.05)`, paddingBottom: 24, animation: "fadeIn .4s" }}>
         <div>
            <h1 style={{ fontSize: 32, fontWeight: 900, color: T.white, margin: 0, letterSpacing: "-.04em", display: "flex", alignItems: "center", gap: 12 }}>
                Control Center Analítico
            </h1>
            <p style={{ fontSize: 13, color: T.whiteFade, margin: "6px 0 0", fontWeight: 600 }}>Vista diversificada de inteligencia de negocios</p>
         </div>
         <div style={{ display: "flex", gap: 14, alignItems: "center" }}>
            <div style={{ display: "flex", gap: 4, background: "rgba(0,0,0,0.3)", padding: 6, borderRadius: 16, border: `1px solid rgba(255,255,255,0.05)` }}>
               {["7", "30", "90", "365"].map(r => (
                 <div key={r} onClick={() => setRango(r)} style={{ padding: "10px 20px", borderRadius: 12, fontSize: 12, fontWeight: 900, cursor: "pointer", background: rango === r ? T.teal : "transparent", color: rango === r ? "#FFF" : T.whiteDim, transition: "all .3s" }}>{r === "365" ? "Año" : `${r}D`}</div>
               ))}
            </div>
         </div>
      </div>

      {/* 1. KPIs */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 24 }}>
        {[
          { l: "INGRESOS", v: money(valNow), p: valPrev, c: T.green, icon: "cart" },
          { l: "CONTACTOS", v: contactsNow, p: contactsPrev, c: T.blue, icon: "users" },
          { l: "PENDIENTES", v: tasksPendingNow, p: tasksPendingPrev, c: T.amber, icon: "clock" },
          { l: "CONVERSIÓN", v: `${Math.round(globalConversion)}%`, p: 0, c: T.purple, icon: "zap" }
        ].map((k, i) => (
          <Tarjeta key={i} brillo style={{ padding: 24, display: "flex", flexDirection: "column", gap: 10, background: T.bg1 }}>
             <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <Ico k={k.icon} size={15} style={{ color: k.c }} />
                {k.p > 0 && <Delta cur={k.v} prev={k.p} />}
             </div>
             <div style={{ fontSize: 10, fontWeight: 900, color: T.whiteFade, textTransform:"uppercase", letterSpacing:".1em" }}>{k.l}</div>
             <div style={{ fontSize: 26, fontWeight: 900, color: T.white }}>{k.v}</div>
          </Tarjeta>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(12, 1fr)", gap: 24 }}>
        
        {/* GRÁFICO 1: TIPO TARTA (PIE CHART) */}
        <WidgetWrapper id="audience" span={4} title="Distribución de Audiencia" icon="pie-chart" color={T.fuchsia}>
           {originDist.length === 0 ? (
              <div style={{ flex: 1, display: "flex", justifyContent: "center", alignItems: "center" }}>
                 <Vacio text="Aún no hay contactos registrados." />
              </div>
           ) : (
              <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center" }}>
                 <div style={{ width: "100%", height: 220 }}>
                    <ResponsiveContainer width="100%" height="100%">
                       <PieChart>
                          <Pie data={originDist} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={60} outerRadius={85} stroke="none" paddingAngle={4} cornerRadius={4}>
                             {originDist.map((e, i) => <Cell key={`cell-${i}`} fill={e.fill} />)}
                          </Pie>
                          <Tooltip content={<CustomTooltip />} />
                       </PieChart>
                    </ResponsiveContainer>
                 </div>
                 <div style={{ display: "flex", flexWrap: "wrap", gap: 10, justifyContent: "center", fontSize: 11, color: T.whiteFade, fontWeight: 800 }}>
                    {originDist.map((e, i) => (
                       <div key={i} style={{ display:"flex", alignItems:"center", gap: 6 }}>
                          <div style={{ width: 8, height: 8, borderRadius: 2, background: e.fill }}/> {e.name}
                       </div>
                    ))}
                 </div>
              </div>
           )}
        </WidgetWrapper>

        {/* GRÁFICO 2: BARRAS Y LÍNEAS (COMPOSED CHART) */}
        <WidgetWrapper id="finanzas" span={8} title="Balance Operativo (Barras Mixtas)" icon="dollar" color={T.green}>
           <div style={{ height: 260, marginTop: 12 }}>
              <ResponsiveContainer width="100%" height="100%">
                 <ComposedChart data={finData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                    <CartesianGrid stroke="rgba(255,255,255,0.05)" strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="name" tick={{ fontSize: 11, fill: T.whiteFade }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 11, fill: T.whiteFade }} axisLine={false} tickLine={false} tickFormatter={(v) => `$${v/1000}k`} />
                    <Tooltip content={<CustomTooltip formatter={(v) => money(v)} />} />
                    <Legend iconType="circle" wrapperStyle={{ fontSize: 11, color: T.whiteDim }} />
                    <Bar dataKey="ingresos" name="Ingresos" fill={T.teal} radius={[4, 4, 0, 0]} maxBarSize={20} />
                    <Bar dataKey="gastos" name="Gastos" fill={T.red} radius={[4, 4, 0, 0]} maxBarSize={20} />
                    <Line type="monotone" dataKey="rentabilidad" name="Rentabilidad Neta" stroke={T.purple} strokeWidth={3} dot={{ r: 4 }} />
                 </ComposedChart>
              </ResponsiveContainer>
           </div>
        </WidgetWrapper>

        {/* GRÁFICO 3: RADIAL (GAUGE) */}
        <WidgetWrapper id="goal" span={4} title="Meta de Ventas" icon="star" color={T.amber}>
           <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", position: "relative" }}>
              <div style={{ width: "100%", height: 220 }}>
                 <ResponsiveContainer width="100%" height="100%">
                    <RadialBarChart cx="50%" cy="50%" innerRadius="70%" outerRadius="100%" barSize={16} data={radialData} startAngle={180} endAngle={0}>
                       <PolarAngleAxis type="number" domain={[0, 100]} angleAxisId={0} tick={false} />
                       <RadialBar minAngle={15} background={{ fill: 'rgba(255,255,255,0.05)' }} clockWise dataKey="value" cornerRadius={10} />
                    </RadialBarChart>
                 </ResponsiveContainer>
              </div>
              <div style={{ position: "absolute", top: "55%", left: "50%", transform: "translate(-50%, -50%)", textAlign: "center" }}>
                 <div style={{ fontSize: 32, fontWeight: 900, color: T.white }}>{porcentajeMeta}%</div>
                 <div style={{ fontSize: 10, fontWeight: 900, color: T.whiteFade, letterSpacing: ".1em" }}>COMPLETADO</div>
              </div>
              <div style={{ fontSize: 12, fontWeight: 700, color: T.whiteFade, marginTop: -30 }}>{money(valNow)} / {money(metaMensual)}</div>
           </div>
        </WidgetWrapper>

        {/* GRÁFICO 4: BARRAS HORIZONTALES (FUNNEL) */}
        <WidgetWrapper id="funnel" span={4} title="Embudo (Barras Horizontales)" icon="funnel" color={T.purple}>
           <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 8, marginTop: -8 }}>
              <select 
                 value={currentPipeline?.id || ""} 
                 onChange={(e) => setPlIdSeleccionado(e.target.value)}
                 style={{ 
                    background: T.bg2, 
                    color: T.white, 
                    border: `1px solid ${T.borderHi}`, 
                    borderRadius: 8, 
                    padding: "6px 28px 6px 12px", 
                    fontSize: 12, 
                    fontWeight: 700,
                    outline: "none", 
                    cursor: "pointer",
                    appearance: "none",
                    backgroundImage: `url("data:image/svg+xml;charset=UTF-8,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='white' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3e%3cpolyline points='6 9 12 15 18 9'%3e%3c/polyline%3e%3c/svg%3e")`,
                    backgroundRepeat: "no-repeat",
                    backgroundPosition: "right 8px center",
                    backgroundSize: "12px"
                 }}
              >
                 {allPipelines.map(p => (
                    <option key={p.id} value={p.id} style={{ background: T.bg1, color: T.white }}>
                       {p.nombre}
                    </option>
                 ))}
              </select>
           </div>
           <div style={{ height: 200, marginLeft: -20 }}>
              <ResponsiveContainer width="100%" height="100%">
                 <BarChart data={funnelSteps} layout="vertical" margin={{ top: 0, right: 10, left: 0, bottom: 0 }}>
                    <CartesianGrid stroke="none" />
                    <XAxis type="number" hide />
                    <YAxis dataKey="name" type="category" tick={{ fontSize: 10, fill: T.whiteFade, fontWeight: 700 }} axisLine={false} tickLine={false} width={80} />
                    <Tooltip content={<CustomTooltip />} cursor={{fill: 'rgba(255,255,255,0.02)'}} />
                    <Bar dataKey="v" name="Deals" fill={T.purple} radius={[0, 4, 4, 0]} maxBarSize={16}>
                        {funnelSteps.map((entry, index) => (
                           <Cell key={`cell-${index}`} fillOpacity={1 - (index * 0.15)} />
                        ))}
                    </Bar>
                 </BarChart>
              </ResponsiveContainer>
           </div>
        </WidgetWrapper>

        {/* GRÁFICO 5: LÍNEA SIMPLE (HISTÓRICO) */}
        <WidgetWrapper id="history" span={4} title="Tendencia de Facturación" icon="trend" color={T.blue}>
           <div style={{ height: 220, marginTop: 12, marginLeft: -20 }}>
              <ResponsiveContainer width="100%" height="100%">
                 <LineChart data={historyData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                    <CartesianGrid stroke="rgba(255,255,255,0.05)" strokeDasharray="3 3" vertical={false} />
                    <YAxis tick={{ fontSize: 10, fill: T.whiteFade }} axisLine={false} tickLine={false} tickFormatter={(v) => `$${v/1000}k`} />
                    <XAxis dataKey="name" tick={{ fontSize: 10, fill: T.whiteFade }} axisLine={false} tickLine={false} dy={5} />
                    <Tooltip content={<CustomTooltip formatter={(v) => money(v)} />} />
                    <Line type="monotone" dataKey="value" name="Ingresos" stroke={T.blue} strokeWidth={3} dot={{r: 3, fill: T.bg1, strokeWidth: 2}} activeDot={{ r: 6 }} />
                 </LineChart>
              </ResponsiveContainer>
           </div>
        </WidgetWrapper>

        {/* GRÁFICO 6: ÁREA DOBLE (PULSO) */}
        <WidgetWrapper id="pulse" span={12} title="Volumen de Actividad Diaria" icon="activity" color={T.teal}>
           <div style={{ height: 220, marginTop: 12 }}>
              <ResponsiveContainer width="100%" height="100%">
                 <AreaChart data={hourlyPulse} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                    <CartesianGrid stroke="rgba(255,255,255,0.05)" strokeDasharray="3 3" vertical={false} />
                    <YAxis tick={{ fontSize: 11, fill: T.whiteFade }} axisLine={false} tickLine={false} />
                    <XAxis dataKey="h" tick={{ fontSize: 11, fill: T.whiteFade }} axisLine={false} tickLine={false} dy={5} />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend iconType="circle" wrapperStyle={{ fontSize: 11, color: T.whiteDim }} />
                    <Area type="monotone" dataKey="v" name="Mensajes" stroke={T.green} fill={T.green} fillOpacity={0.1} strokeWidth={2} />
                    <Area type="monotone" dataKey="a" name="Notas/Bitácora" stroke={T.blue} fill={T.blue} fillOpacity={0.1} strokeWidth={2} />
                 </AreaChart>
              </ResponsiveContainer>
           </div>
        </WidgetWrapper>

      </div>

      <style>{`
        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>
    </div>
  );
};
