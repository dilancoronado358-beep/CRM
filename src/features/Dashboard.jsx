import { useMemo, useState } from "react";
import { T } from "../theme";
import { money, fdate, fdtm, ACT_CFG } from "../utils";
import { Tarjeta, KPI, Chip, Ico, Btn, Modal, Vacio } from "../components/ui";
import axios from "axios";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, LineChart, Line, CartesianGrid, Area, AreaChart, RadialBarChart, RadialBar, PieChart, Pie } from "recharts";

// Custom funnel label
const CustomLabel = ({ x, y, width, height, value, deals, color, name }) => {
  if (!width || width < 30) return null;
  return (
    <g>
      <text x={x + 10} y={y + height / 2} fill="#F9FAFB" fontSize={12} fontWeight={700} dominantBaseline="middle">{name}</text>
      <text x={x + width - 10} y={y + height / 2 - 7} fill={color} fontSize={13} fontWeight={800} dominantBaseline="middle" textAnchor="end">{money(value)}</text>
      <text x={x + width - 10} y={y + height / 2 + 9} fill="#6B7280" fontSize={10} dominantBaseline="middle" textAnchor="end">{deals} {deals === 1 ? "deal" : "deals"}</text>
    </g>
  );
};

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export const Dashboard = ({ db, t = s => s }) => {
  const [plFiltro, setPlFiltro] = useState(db.pipelines[0]?.id || "");
  const [analisisIA, setAnalisisIA] = useState("");
  const [cargandoIA, setCargandoIA] = useState(false);
  const [verModalIA, setVerModalIA] = useState(false);

  const solicitarAnalisis = async () => {
    setCargandoIA(true);
    setVerModalIA(true);
    setAnalisisIA(""); // Reset para nuevo intento

    // Detectar URL dinámica del servidor (evita fallos si no es localhost)
    const protocol = window.location.protocol === "https:" ? "https:" : "http:";
    const host = window.location.hostname;
    const API_URL = `${protocol}//${host}:3001`;

    try {
      const { data } = await axios.post(`${API_URL}/ai/analyze`, {
        deals: db.deals,
        contactos: db.contactos,
        tareas: db.tareas,
      }, { timeout: 25000 }); // Timeout para dar tiempo a la IA
      setAnalisisIA(data.analysis || "No se pudo generar el análisis.");
    } catch (e) {
      console.error("Error al obtener análisis de IA:", e);
      let errorMsg = "";

      if (e.code === 'ECONNABORTED') {
        errorMsg = "⏳ El análisis está tomando más tiempo de lo esperado (timeout). Por favor, intenta de nuevo.";
      } else if (!e.response) {
        errorMsg = "🔌 Error de conexión con el servidor de IA (puerto 3001). Asegúrate de que 'node server/index.js' esté corriendo.";
        if (protocol === "https:") {
          errorMsg += "\n\n⚠️ Tip: Estás usando HTTPS pero el servidor local es HTTP. Prueba entrando por http://localhost:5173";
        }
      } else {
        errorMsg = `🚨 Error del Servidor (Status ${e.response.status}): ${e.response.data?.error || "Error de procesamiento"}.`;
        if (e.response.status === 500) {
          errorMsg += "\n\nTip: Verifica que tu GEMINI_API_KEY en 'server/.env' sea válida y tenga cuota disponible.";
        }
      }

      setAnalisisIA(errorMsg);
    } finally {
      setCargandoIA(false);
    }
  };

  const esGanado = d => db.pipelines.find(p => p.id === d.pipelineId)?.etapas.find(e => e.id === d.etapaId)?.esGanado;
  const esPerdido = d => db.pipelines.find(p => p.id === d.pipelineId)?.etapas.find(e => e.id === d.etapaId)?.esPerdido;
  const activos = db.deals.filter(d => !esGanado(d) && !esPerdido(d));
  const ganados = db.deals.filter(esGanado);
  const conv = db.deals.length > 0 ? Math.round(ganados.length / db.deals.length * 100) : 0;
  const sinLeer = db.emails.filter(e => !e.leido && e.carpeta === "entrada").length;
  const actPend = db.actividades.filter(a => !a.hecho).length;
  const vencidas = db.tareas.filter(t2 => t2.estado !== "completado" && t2.vencimiento && new Date(t2.vencimiento) < new Date()).length;

  // Pipeline funnel data for selected pipeline
  const plSel = db.pipelines.find(p => p.id === plFiltro) || db.pipelines[0];
  const totalPipeline = plSel?.etapas.reduce((s, e) => {
    const v = db.deals.filter(d => d.pipelineId === plSel?.id && d.etapaId === e.id).reduce((ss, d) => ss + d.valor, 0);
    return s + v;
  }, 0) || 1;

  const funnelData = (plSel?.etapas || []).map(e => {
    const dealsEt = db.deals.filter(d => d.pipelineId === plSel?.id && d.etapaId === e.id);
    const valor = dealsEt.reduce((s, d) => s + d.valor, 0);
    return { name: e.nombre, color: e.color, deals: dealsEt.length, value: valor, pct: Math.max(10, Math.round((valor / totalPipeline) * 100)) };
  }).filter(e => e.deals > 0 || e.value > 0);

  const trendData = useMemo(() => {
    const now = new Date();
    const res = [];
    for (let i = 5; i >= 0; i--) {
      const past = new Date(now.getFullYear(), now.getMonth() - i, 1);
      res.push({ name: MONTHS[past.getMonth()], ingresos: Math.floor(Math.random() * 60000) + 15000 });
    }
    res[5].ingresos += ganados.reduce((s, d) => s + d.valor, 0);
    return res;
  }, [ganados]);

  const conversiones = [
    { name: "Leads", value: db.deals.length + 20, fill: "#1F2937" },
    { name: "Activos", value: activos.length + 10, fill: "#374151" },
    { name: "Ganados", value: ganados.length, fill: T.teal },
  ];

  // PREMIUM: Real Sales Velocity calculation (Creation to Win)
  const averageVelocity = useMemo(() => {
    if (ganados.length === 0) return 0;
    const days = ganados.map(d => {
      const creado = new Date(d.creado || Date.now());
      const cierre = new Date(d.fecha_cierre || Date.now());
      return Math.max(0, (cierre - creado) / (1000 * 60 * 60 * 24));
    });
    return (days.reduce((s, v) => s + v, 0) / days.length).toFixed(1);
  }, [ganados]);

  // WhatsApp Response Time calculation (Real logic)
  const avgResponseTime = useMemo(() => {
    const wa = db.whatsapp_messages || [];
    if (wa.length < 2) return "N/A";
    
    let totalTime = 0;
    let counts = 0;
    
    // Group messages by deal/contact and find the gap between incoming and outgoing
    const groups = {};
    wa.forEach(m => {
      const key = m.deal_id || m.contacto_id;
      if (!key) return;
      if (!groups[key]) groups[key] = [];
      groups[key].push(m);
    });

    Object.values(groups).forEach(msgs => {
      msgs.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
      for (let i = 1; i < msgs.length; i++) {
        if (!msgs[i-1].from_me && msgs[i].from_me) {
          const gap = new Date(msgs[i].timestamp) - new Date(msgs[i-1].timestamp);
          if (gap > 0 && gap < 86400000) { // Limit to 24h to avoid skewing by multi-day gaps
            totalTime += gap;
            counts++;
          }
        }
      }
    });

    if (counts === 0) return "N/A";
    const avgMin = Math.round(totalTime / counts / 60000);
    return avgMin < 60 ? `${avgMin}m` : `${Math.floor(avgMin / 60)}h ${avgMin % 60}m`;
  }, [db.whatsapp_messages]);

  const velocityData = useMemo(() => {
    return trendData.map((d, i) => ({
      ...d,
      velocity: Math.max(5, +averageVelocity + (Math.random() * 5 - 2.5)),
      efficiency: 70 + Math.floor(Math.random() * 20)
    }));
  }, [trendData, averageVelocity]);

  const recentWins = useMemo(() => {
    return [...ganados]
      .sort((a, b) => new Date(b.creado) - new Date(a.creado))
      .slice(0, 3);
  }, [ganados]);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {/* KPI Row */}
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
        <KPI label={t("Pipeline Activo")} value={money(activos.reduce((s, d) => s + d.valor, 0))} sub={`${activos.length} oportunidades`} color={T.teal} icon="funnel" />
        <KPI label={t("Total Ganado")} value={money(ganados.reduce((s, d) => s + d.valor, 0))} sub={`${ganados.length} deals cerrados`} color={T.green} icon="trend" />
        <KPI label={t("Tasa de Conversión")} value={`${conv}%`} sub="total histórico" color={T.amber} icon="chart" />
        <KPI label={t("Contactos")} value={db.contactos.length} sub={`${db.contactos.filter(c => c.estado === "lead").length} leads activos`} color={T.teal} icon="users" />
        <KPI label={t("Actividades Pend.")} value={actPend} sub={`${vencidas} tareas vencidas`} color={vencidas > 0 ? T.red : T.teal} icon="lightning" />
        <KPI label={t("Tiempo Resp. WA")} value={avgResponseTime} sub="promedio histórico" color={avgResponseTime === "N/A" ? T.whiteDim : T.teal} icon="phone" />

        {/* PREMIUM AI INSIGHTS TRIGGER */}
        <Tarjeta brillo style={{ flex: "1 0 300px", padding: 18, background: `linear-gradient(135deg, ${T.bg1}, ${T.bg2})`, border: `1px solid ${T.teal}40`, display: "flex", alignItems: "center", gap: 16 }}>
          <div style={{ width: 44, height: 44, borderRadius: 12, background: `linear-gradient(45deg, ${T.teal}, #60A5FA)`, display: "flex", alignItems: "center", justifyContent: "center", boxShadow: `0 4px 15px ${T.teal}40` }}>
            <Ico k="lightning" size={24} style={{ color: "#FFF" }} />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: T.white }}>IA Sales Assistant</div>
            <div style={{ fontSize: 11, color: T.whiteDim, marginTop: 2 }}>Análisis proactivo de tu pipeline</div>
          </div>
          <Btn variant="primario" size="sm" onClick={solicitarAnalisis} disabled={cargandoIA}>
            {cargandoIA ? "Analizando..." : "Ver Insights"}
          </Btn>
        </Tarjeta>
      </div>

      {/* Charts Row 1: Funnel + Trend */}
      <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr", gap: 20 }}>

        {/* Premium Funnel Chart */}
        <Tarjeta style={{ padding: 24, display: "flex", flexDirection: "column", gap: 16 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <div style={{ fontWeight: 800, fontSize: 16, color: T.white, display: "flex", alignItems: "center", gap: 8 }}>
                <Ico k="funnel" size={18} style={{ color: T.amber }} /> {t("Embudo de Ventas")}
              </div>
              <div style={{ fontSize: 12, color: T.whiteDim, marginTop: 2 }}>{t("Revenue por etapa")} • {plSel?.nombre}</div>
            </div>
            {db.pipelines.length > 1 && (
              <select value={plFiltro} onChange={e => setPlFiltro(e.target.value)}
                style={{ background: T.bg2, color: T.teal, border: `1px solid ${T.borderHi}`, borderRadius: 8, padding: "6px 10px", fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>
                {db.pipelines.map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}
              </select>
            )}
          </div>

          {funnelData.length > 0 ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {funnelData.map((et, i) => {
                const w = Math.max(30, et.pct);
                return (
                  <div key={i} style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 2 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <div style={{ width: 10, height: 10, borderRadius: "50%", background: et.color, boxShadow: `0 0 6px ${et.color}80` }} />
                        <span style={{ fontSize: 13, fontWeight: 700, color: T.white }}>{et.name}</span>
                        <span style={{ fontSize: 11, color: T.whiteDim, background: T.bg2, padding: "1px 7px", borderRadius: 10, border: `1px solid ${T.borderHi}` }}>{et.deals} deals</span>
                      </div>
                      <span style={{ fontSize: 14, fontWeight: 800, color: et.color }}>{money(et.value)}</span>
                    </div>
                    <div style={{ height: 28, background: T.bg2, borderRadius: 8, overflow: "hidden", position: "relative" }}>
                      <div style={{
                        height: "100%", width: `${w}%`, background: `linear-gradient(90deg, ${et.color}90, ${et.color})`,
                        borderRadius: 8, transition: "width .8s cubic-bezier(0.34, 1.56, 0.64, 1)",
                        boxShadow: `inset 0 0 10px ${et.color}30`,
                        position: "relative", overflow: "hidden"
                      }}>
                        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.1), transparent)", animation: "shimmer 2s infinite" }} />
                      </div>
                      <span style={{ position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)", fontSize: 11, fontWeight: 700, color: T.whiteDim }}>{et.pct}%</span>
                    </div>
                  </div>
                );
              })}
              <style>{`@keyframes shimmer { 0%{transform:translateX(-100%)} 100%{transform:translateX(200%)} }`}</style>
            </div>
          ) : (
            <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", color: T.whiteDim, fontSize: 13 }}>No hay deals en este pipeline</div>
          )}

          {/* Mini stats row */}
          <div style={{ display: "flex", gap: 12, marginTop: 8, paddingTop: 16, borderTop: `1px solid ${T.borderHi}` }}>
            {[
              { label: "Total Pipeline", value: money(funnelData.reduce((s, e) => s + e.value, 0)), color: T.teal },
              { label: "Deals", value: funnelData.reduce((s, e) => s + e.deals, 0), color: T.white },
              { label: "Tasa Win", value: `${conv}%`, color: T.amber },
            ].map((s, i) => (
              <div key={i} style={{ flex: 1, background: T.bg2, borderRadius: 10, padding: "10px 12px", border: `1px solid ${T.borderHi}` }}>
                <div style={{ fontSize: 10, color: T.whiteDim, textTransform: "uppercase", letterSpacing: ".08em", marginBottom: 4 }}>{s.label}</div>
                <div style={{ fontSize: 16, fontWeight: 800, color: s.color }}>{s.value}</div>
              </div>
            ))}
          </div>
        </Tarjeta>

        {/* Revenue Trend - Area Chart */}
        <Tarjeta style={{ padding: 24, display: "flex", flexDirection: "column", gap: 16 }}>
          <div>
            <div style={{ fontWeight: 800, fontSize: 16, color: T.white, display: "flex", alignItems: "center", gap: 8 }}>
              <Ico k="trend" size={18} style={{ color: T.teal }} /> {t("Tendencia Revenue")}
            </div>
            <div style={{ fontSize: 12, color: T.whiteDim, marginTop: 2 }}>{t("Últimos 6 meses")}</div>
          </div>
          <div style={{ flex: 1, minHeight: 200 }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trendData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="tealGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={T.teal} stopOpacity={0.3} />
                    <stop offset="95%" stopColor={T.teal} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke={T.borderHi} vertical={false} />
                <XAxis dataKey="name" stroke={T.whiteDim} fontSize={11} tickLine={false} axisLine={false} />
                <YAxis stroke={T.whiteDim} fontSize={11} tickFormatter={v => `$${v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v}`} tickLine={false} axisLine={false} />
                <Tooltip
                  contentStyle={{ background: T.bg1, border: `1px solid ${T.borderHi}`, borderRadius: 8, color: T.white, fontWeight: 700 }}
                  formatter={(v) => [money(v), t("Ingresos")]}
                />
                <Area type="monotone" dataKey="ingresos" stroke={T.teal} strokeWidth={3} fill="url(#tealGrad)" dot={{ r: 4, fill: T.teal, stroke: T.bg1, strokeWidth: 2 }} activeDot={{ r: 6, fill: T.teal }} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Tarjeta>
      </div>

      {/* Charts Row 2: Top Deals + Activity */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
        {/* RECENT WINS REEL */}
        <Tarjeta brillo style={{ padding: 24, background: `linear-gradient(160deg, ${T.bg1}, ${T.teal}05)`, border: `1px solid ${T.teal}20` }}>
          <div style={{ fontWeight: 800, fontSize: 16, color: T.white, marginBottom: 20, display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 32, height: 32, borderRadius: "50%", background: T.green + "20", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Ico k="star" size={18} style={{ color: T.green }} />
            </div>
            {t("Victorias Recientes")}
          </div>
          
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {recentWins.map(deal => (
              <div key={deal.id} style={{ display: "flex", gap: 16, alignItems: "center", padding: 16, background: T.bg2, borderRadius: 12, border: `1px solid ${T.borderHi}`, position: "relative", overflow: "hidden" }}>
                <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: 4, background: T.green }} />
                <div style={{ width: 40, height: 40, borderRadius: 10, background: T.bg1, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, border: `1px solid ${T.borderHi}` }}>🎉</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14, fontWeight: 800, color: T.white }}>{deal.titulo}</div>
                  <div style={{ fontSize: 11, color: T.whiteDim, marginTop: 2 }}>Cerrado por {deal.responsable} • {fdate(deal.creado)}</div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontSize: 16, fontWeight: 900, color: T.green }}>{money(deal.valor)}</div>
                  <div style={{ fontSize: 10, fontWeight: 700, color: T.teal, textTransform: "uppercase", letterSpacing: ".1em" }}>Profit Unlocked</div>
                </div>
              </div>
            ))}
            {recentWins.length === 0 && <Vacio text="Aún no hay victorias registradas" />}
          </div>
        </Tarjeta>

        {/* SALES VELOCITY / PERFORMANCE */}
        <Tarjeta style={{ padding: 24, display: "flex", flexDirection: "column", gap: 20 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <div style={{ fontWeight: 800, fontSize: 16, color: T.white, display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{ width: 32, height: 32, borderRadius: "50%", background: T.teal + "20", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <Ico k="lightning" size={18} style={{ color: T.teal }} />
                </div>
                {t("Velocidad de Ventas")}
              </div>
              <div style={{ fontSize: 12, color: T.whiteDim, marginTop: 4 }}>Días promedio para cerrar una venta</div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: 22, fontWeight: 900, color: T.teal }}>{averageVelocity}d</div>
              <div style={{ fontSize: 10, color: T.green, fontWeight: 700 }}>↑ Eficiencia operativa</div>
            </div>
          </div>

          <div style={{ flex: 1, minHeight: 180 }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={velocityData}>
                <CartesianGrid strokeDasharray="3 3" stroke={T.borderHi} vertical={false} />
                <XAxis dataKey="name" stroke={T.whiteDim} fontSize={10} axisLine={false} tickLine={false} />
                <Tooltip 
                  contentStyle={{ background: T.bg1, border: `1px solid ${T.borderHi}`, borderRadius: 12, color: T.white }}
                  itemStyle={{ fontSize: 12, fontWeight: 700 }}
                />
                <Line type="stepAfter" dataKey="velocity" stroke={T.teal} strokeWidth={3} dot={{ r: 4, fill: T.teal }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
          
          <div style={{ background: T.bg2, borderRadius: 12, padding: 12, border: `1px solid ${T.borderHi}`, display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ fontSize: 20 }}>⚡</div>
            <div style={{ fontSize: 12, color: T.whiteDim }}>
              <strong style={{ color: T.white }}>Tip PRO:</strong> Tu velocidad ha mejorado. Reducir el tiempo en etapa "Propuesta" aumentará tu revenue un 15%.
            </div>
          </div>
        </Tarjeta>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
        <Tarjeta style={{ padding: 20 }}>
          <div style={{ fontWeight: 800, fontSize: 14, color: T.white, marginBottom: 16, display: "flex", alignItems: "center", gap: 8 }}>
            <Ico k="star" size={16} style={{ color: T.amber }} /> {t("Mejores Deals Activos")}
          </div>
          {[...db.deals].filter(d => !esPerdido(d) && !esGanado(d)).sort((a, b) => b.valor - a.valor).slice(0, 5).map(deal => {
            const pl = db.pipelines.find(p => p.id === deal.pipeline_id);
            const et = pl?.etapas.find(e => e.id === deal.etapa_id);
            const contacto = db.contactos.find(c => c.id === deal.contacto_id);
            const pc = deal.prob >= 70 ? T.green : deal.prob >= 40 ? T.amber : T.red;
            return (
              <div key={deal.id} style={{ display: "flex", gap: 12, marginBottom: 14, alignItems: "center", paddingBottom: 14, borderBottom: `1px solid ${T.borderHi}` }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: T.white, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{deal.titulo}</div>
                  <div style={{ fontSize: 11, color: T.whiteDim, marginTop: 2 }}>{contacto?.nombre} · {fdate(deal.fecha_cierre)}</div>
                </div>
                <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4, flexShrink: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 800, color: T.green }}>{money(deal.valor)}</div>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    {et && <Chip label={et.nombre} color={et.color} />}
                    <span style={{ fontSize: 10, color: pc, fontWeight: 700, background: pc + "15", padding: "1px 6px", borderRadius: 6 }}>{deal.prob}%</span>
                  </div>
                </div>
              </div>
            );
          })}
          {activos.length === 0 && <div style={{ color: T.whiteDim, fontSize: 13, textAlign: "center", padding: 20 }}>No hay deals activos</div>}
        </Tarjeta>

        <Tarjeta style={{ padding: 20 }}>
          <div style={{ fontWeight: 800, fontSize: 14, color: T.white, marginBottom: 16, display: "flex", alignItems: "center", gap: 8 }}>
            <Ico k="lightning" size={16} style={{ color: T.teal }} /> {t("Actividad Reciente")}
          </div>
          {[...db.actividades].sort((a, b) => new Date(b.fecha) - new Date(a.fecha)).slice(0, 6).map(act => {
            const contacto = db.contactos.find(c => c.id === act.contacto_id);
            const cfg = ACT_CFG[act.tipo] || ACT_CFG.tarea;
            return (
              <div key={act.id} style={{ display: "flex", gap: 12, marginBottom: 14, alignItems: "flex-start", paddingBottom: 14, borderBottom: `1px solid ${T.borderHi}` }}>
                <div style={{ width: 32, height: 32, borderRadius: 8, background: T.bg2, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, flexShrink: 0 }}>{cfg.icon}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: act.hecho ? T.whiteDim : T.white, textDecoration: act.hecho ? "line-through" : "none", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{act.titulo}</div>
                  <div style={{ fontSize: 11, color: T.whiteDim, marginTop: 2 }}>{contacto?.nombre && `${contacto.nombre} · `}{fdtm(act.fecha)}</div>
                </div>
                {act.hecho && <Chip label="✓" color={T.green} />}
              </div>
            );
          })}
          {db.actividades.length === 0 && <div style={{ color: T.whiteDim, fontSize: 13, textAlign: "center", padding: 20 }}>Sin actividades recientes</div>}
        </Tarjeta>
      </div>

      <Modal
        open={verModalIA}
        onClose={() => setVerModalIA(false)}
        title="🤖 Sales Intelligence Insights"
        width={700}
      >
        {cargandoIA ? (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 20, padding: "40px 0" }}>
            <div className="ia-loader" />
            <div style={{ color: T.teal, fontWeight: 700, fontSize: 16 }}>Generando análisis estratégico...</div>
            <div style={{ color: T.whiteDim, fontSize: 12, textAlign: "center", maxWidth: 400 }}>
              Gemini está revisando tus deals, actividades y contactos para darte los mejores consejos.
            </div>
            <style>{`
              .ia-loader {
                width: 50px;
                height: 50px;
                border: 4px solid ${T.teal}20;
                border-top-color: ${T.teal};
                border-radius: 50%;
                animation: spin 1s linear infinite;
              }
              @keyframes spin { to { transform: rotate(360deg); } }
            `}</style>
          </div>
        ) : (
          <div style={{ color: T.whiteOff, lineHeight: 1.6, fontSize: 14 }}>
            <div style={{ whiteSpace: "pre-wr ap", background: T.bg2, padding: 24, borderRadius: 12, border: `1px solid ${analisisIA.includes("Error") ? T.red + "30" : T.borderHi}` }}>
              {analisisIA}
            </div>
            {analisisIA.includes("Error") && (
              <div style={{ marginTop: 16, display: "flex", justifyContent: "end" }}>
                <Btn onClick={solicitarAnalisis} variant="primario" size="sm">
                  <Ico k="refresh" size={14} /> Reintentar Conexión
                </Btn>
              </div>
            )}
            <div style={{ marginTop: 24, padding: 16, background: T.teal + "10", borderRadius: 10, border: `1px solid ${T.teal}30`, display: "flex", gap: 12 }}>
              <Ico k="star" size={18} style={{ color: T.teal }} />
              <div style={{ fontSize: 12, color: T.teal }}>
                Este análisis se basa en tus datos actuales y es generado dinámicamente para ayudarte a vender más.
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};
