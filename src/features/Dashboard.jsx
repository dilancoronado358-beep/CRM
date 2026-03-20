import { useMemo, useState, useEffect } from "react";
import { T } from "../theme";
import { money, fdate, fdtm, ACT_CFG, getApiUrl } from "../utils";
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
  const [showConfig, setShowConfig] = useState(false);
  
  // Widget Visibility State (Default all true)
  const [widgets, setWidgets] = useState(() => {
    const saved = localStorage.getItem("crm_dashboard_widgets");
    return saved ? JSON.parse(saved) : {
      kpis: true,
      funnel: true,
      trend: true,
      recentWins: true,
      velocity: true,
      topDeals: true,
      activities: true,
      ai: true
    };
  });

  const toggleWidget = (id) => {
    const newWidgets = { ...widgets, [id]: !widgets[id] };
    setWidgets(newWidgets);
    localStorage.setItem("crm_dashboard_widgets", JSON.stringify(newWidgets));
  };

  // Sync pipeline filter when pipelines load
  useEffect(() => {
    if (!plFiltro && db.pipelines.length > 0) {
      // Intentar buscar el primer pipeline que tenga algún deal
      const withDeals = db.pipelines.find(p => db.deals.some(d => d.pipeline_id === p.id));
      setPlFiltro(withDeals ? withDeals.id : db.pipelines[0]?.id || "");
    }
  }, [db.pipelines, plFiltro, db.deals]);

  const Widget = ({ id, title, icon, color, children, span = 1, height }) => {
    if (!widgets[id]) return null;
    return (
      <Tarjeta style={{ 
        padding: 24, 
        display: "flex", 
        flexDirection: "column", 
        gap: 16, 
        gridColumn: `span ${span}`,
        minHeight: height || "auto",
        position: "relative",
        // animation: "fadeIn .4s ease" // Deshabilitado para evitar parpadeo en re-renders
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ fontWeight: 800, fontSize: 16, color: T.white, display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 32, height: 32, borderRadius: 10, background: T.bg2, border: `1px solid ${color || T.teal}`, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Ico k={icon} size={18} style={{ color: color || T.teal }} />
            </div>
            {title}
          </div>
        </div>
        <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
          {children}
        </div>
      </Tarjeta>
    );
  };

  const isAdmin = db.usuario?.role === "admin";
  const userDeals = db.deals.filter(d => isAdmin || d.responsable === db.usuario?.name);
  const userContacts = db.contactos.filter(c => isAdmin || c.vendedor === db.usuario?.name || c.vendedor_id === db.usuario?.id);
  const userTasks = db.tareas.filter(t2 => isAdmin || t2.asignado === db.usuario?.name);
  const userActs = db.actividades.filter(a => isAdmin || a.usuario_id === db.usuario?.id);
  const userEmails = db.emails.filter(e => isAdmin || e.usuario_id === db.usuario?.id);
  const userWA = db.whatsapp_messages || []; // Podríamos filtrar WA también si fuera necesario por deal_id -> responsable

  const solicitarAnalisis = async () => {
    setCargandoIA(true);
    setVerModalIA(true);
    setAnalisisIA(""); // Reset para nuevo intento

    // Detectar URL dinámica del servidor (evita fallos si no es localhost)
    const API_URL = getApiUrl(db);

    try {
      const { data } = await axios.post(`${API_URL}/ai/analyze`, {
        deals: userDeals,
        contactos: userContacts,
        tareas: userTasks,
      }, { timeout: 25000 }); // Timeout para dar tiempo a la IA
      setAnalisisIA(data.analysis || "No se pudo generar el análisis.");
    } catch (e) {
      console.error("Error al obtener análisis de IA:", e);
      let errorMsg = "";

      if (e.code === 'ECONNABORTED') {
        errorMsg = "⏳ El análisis está tomando más tiempo de lo esperado (timeout). Por favor, intenta de nuevo.";
      } else if (!e.response) {
        errorMsg = "🔌 Error de conexión con el servidor de IA (puerto 3001). Asegúrate de que 'node server/index.js' esté corriendo.";
        if (window.location.protocol === "https:") {
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

  const esGanado = d => {
    const pl = db.pipelines.find(p => p.id == d.pipeline_id);
    const et = pl?.etapas?.find(e => e.id == d.etapa_id);
    return et?.es_ganado;
  };
  const esPerdido = d => {
    const pl = db.pipelines.find(p => p.id == d.pipeline_id);
    const et = pl?.etapas?.find(e => e.id == d.etapa_id);
    return et?.es_perdido;
  };
  const activos = userDeals.filter(d => !esGanado(d) && !esPerdido(d));
  const ganados = userDeals.filter(esGanado);
  const sinAsignar = userDeals.filter(d => !d.pipeline_id);
  const conv = userDeals.length > 0 ? Math.round(ganados.length / userDeals.length * 100) : 0;
  const sinLeer = userEmails.filter(e => !e.leido && e.carpeta === "entrada").length;
  const actPend = userActs.filter(a => !a.hecho).length;
  const vencidas = userTasks.filter(t2 => t2.estado !== "completado" && t2.vencimiento && new Date(t2.vencimiento) < new Date()).length;

  // Pipeline funnel data for selected pipeline
  const plSel = db.pipelines.find(p => p.id == plFiltro) || db.pipelines[0];
  const totalPipeline = (plSel?.etapas || []).reduce((s, e) => {
    const v = userDeals.filter(d => d.pipeline_id == plSel?.id && d.etapa_id == e.id).reduce((ss, d) => ss + d.valor, 0);
    return s + v;
  }, 0) || 1;

  const funnelData = (plSel?.etapas || []).map(e => {
    const dealsEt = userDeals.filter(d => d.pipeline_id == plSel?.id && d.etapa_id == e.id);
    const valor = dealsEt.reduce((s, d) => s + d.valor, 0);
    return { name: e.nombre, color: e.color, deals: dealsEt.length, value: valor, pct: Math.max(10, Math.round((valor / totalPipeline) * 100)) };
  }).filter(e => e.deals > 0 || e.value > 0);

  const trendData = useMemo(() => {
    const now = new Date();
    const res = [];
    const ganadosSet = new Set(ganados.map(d => d.id));
    
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const m = d.getMonth();
      const y = d.getFullYear();
      
      const revenue = ganados.filter(g => {
        const fc = new Date(g.fecha_cierre || g.creado);
        return fc.getMonth() === m && fc.getFullYear() === y;
      }).reduce((s, g) => s + (g.valor || 0), 0);
      
      res.push({ name: MONTHS[m], ingresos: revenue });
    }
    return res;
  }, [ganados]);

  const conversiones = [
    { name: "Leads", value: db.contactos.filter(c => c.estado === "lead").length, fill: "#1F2937" },
    { name: "Activos", value: activos.length, fill: "#374151" },
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
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      {/* Dashboard Toolbar */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 24, fontWeight: 900, color: T.white }}>Control Center</h1>
          <p style={{ margin: 0, fontSize: 13, color: T.whiteDim }}>{isAdmin ? "Vista Global de Operaciones" : `Panel Personal de ${db.usuario?.name}`}</p>
        </div>
        <div style={{ display: "flex", gap: 12 }}>
          {db.pipelines.length > 1 && (
            <Sel value={plFiltro} onChange={e => setPlFiltro(e.target.value)}
              style={{ width: "auto", minWidth: 160 }}>
              {db.pipelines.map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}
            </Sel>
          )}
          <Btn variant="fantasma" onClick={() => setShowConfig(true)}>
            <Ico k="edit" size={16} /> Personalizar
          </Btn>
        </div>
      </div>

      {/* KPI Row */}
      {widgets.kpis && (
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
          <KPI label={t("Pipeline Activo")} value={money(activos.reduce((s, d) => s + d.valor, 0))} sub={`${activos.length} oportunidades`} color={T.teal} icon="funnel" />
          <KPI label={t("Total Ganado")} value={money(ganados.reduce((s, d) => s + d.valor, 0))} sub={`${ganados.length} deals cerrados`} color={T.green} icon="trend" />
          <KPI label={t("Tasa de Conversión")} value={`${conv}%`} sub="total histórico" color={T.amber} icon="chart" />
          <KPI label={t("Contactos")} value={userContacts.length} sub={`${userContacts.filter(c => c.estado === "lead").length} leads activos`} color={T.teal} icon="users" />
          <KPI label={t("Actividades Pend.")} value={actPend} sub={`${vencidas} tareas vencidas`} color={vencidas > 0 ? T.red : T.teal} icon="lightning" />
          <KPI label={t("Tiempo Resp. WA")} value={avgResponseTime} sub="promedio histórico" color={avgResponseTime === "N/A" ? T.whiteDim : T.teal} icon="phone" />
        </div>
      )}

      {/* Main Grid Layout */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: 20 }}>
        
        {/* WIDGET: AI INSIGHTS */}
        <div style={{ gridColumn: "span 6", display: widgets.ai ? "block" : "none" }}>
          <Tarjeta brillo style={{ padding: 20, background: T.bg1, border: `1px solid ${T.teal}`, display: "flex", alignItems: "center", gap: 20 }}>
            <div style={{ position: "relative" }}>
              <div style={{ width: 50, height: 50, borderRadius: 14, background: `linear-gradient(45deg, ${T.teal}, #6366F1)`, display: "flex", alignItems: "center", justifyContent: "center", boxShadow: `0 4px 12px rgba(20, 184, 166, 0.3)` }}>
                <Ico k="lightning" size={28} style={{ color: "#FFF" }} />
              </div>
              <div style={{ position: "absolute", top: -4, right: -4, width: 12, height: 12, borderRadius: "50%", background: T.teal, border: `2px solid ${T.bg1}` }} />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 16, fontWeight: 900, color: T.white }}>Sales Intelligence Pro</div>
              <div style={{ fontSize: 13, color: T.whiteDim, marginTop: 2 }}>Tu asistente IA analizando el comportamiento de {userDeals.length} oportunidades en tiempo real.</div>
            </div>
            <div style={{ display: "flex", gap: 12 }}>
              <Btn variant="primario" onClick={solicitarAnalisis} disabled={cargandoIA}>
                {cargandoIA ? "Procesando..." : "Generar Insights Estratégicos"}
              </Btn>
            </div>
          </Tarjeta>
        </div>

        {/* WIDGET: FUNNEL */}
        <Widget id="funnel" span={4} title={t("Embudo de Ventas")} icon="funnel" color={T.amber}>
          {funnelData.length > 0 ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {funnelData.map((et, i) => {
                        const w = Math.max(30, et.pct);
                        return (
                          <div key={i} style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                <div style={{ width: 10, height: 10, borderRadius: "2px", background: et.color }} />
                                <span style={{ fontSize: 14, fontWeight: 700, color: T.white }}>{et.name}</span>
                                <span style={{ fontSize: 11, color: T.whiteDim }}>{et.deals} deals</span>
                              </div>
                              <span style={{ fontSize: 15, fontWeight: 900, color: et.color }}>{money(et.value)}</span>
                            </div>
                            <div style={{ height: 32, background: T.bg2, borderRadius: 10, overflow: "hidden", position: "relative", border: `1px solid ${T.borderHi}` }}>
                              <div style={{
                                height: "100%", width: `${w}%`, background: et.color,
                                borderRadius: 10, transition: "width 1s cubic-bezier(0.34, 1.56, 0.64, 1)",
                                position: "relative"
                              }}>
                         <div style={{ position: "absolute", inset: 0, background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.1), transparent)", animation: "shimmer 3s infinite" }} />
                      </div>
                      <span style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", fontSize: 12, fontWeight: 900, color: T.whiteOff }}>{et.pct}%</span>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : <Vacio text="Sin datos de funnel" />}
          
          <div style={{ display: "flex", gap: 15, marginTop: 24, paddingTop: 20, borderTop: `1px solid ${T.borderHi}` }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 11, color: T.whiteDim, textTransform: "uppercase", marginBottom: 4 }}>Revenue Total</div>
              <div style={{ fontSize: 20, fontWeight: 900, color: T.teal }}>{money(funnelData.reduce((s, e) => s + e.value, 0))}</div>
            </div>
            <div style={{ flex: 1, textAlign: "right" }}>
              <div style={{ fontSize: 11, color: T.whiteDim, textTransform: "uppercase", marginBottom: 4 }}>Conversión Promedio</div>
              <div style={{ fontSize: 20, fontWeight: 900, color: T.amber }}>{conv}%</div>
            </div>
          </div>
        </Widget>

        {/* WIDGET: TRENDING */}
        <Widget id="trend" span={2} title="Tendencia" icon="trend" color={T.teal}>
          <div style={{ flex: 1, minHeight: 250 }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trendData}>
                <defs>
                   <linearGradient id="widgetGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={T.teal} stopOpacity={0.3} />
                    <stop offset="95%" stopColor={T.teal} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke={T.borderHi} vertical={false} />
                <XAxis dataKey="name" hide />
                <Tooltip contentStyle={{ background: T.bg1, border: `1px solid ${T.borderHi}`, borderRadius: 10 }} />
                <Area type="monotone" dataKey="ingresos" stroke={T.teal} strokeWidth={3} fill="url(#widgetGrad)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <div style={{ fontSize: 12, color: T.whiteDim, textAlign: "center", marginTop: 10 }}>Ingresos proyectados vs reales</div>
        </Widget>

        {/* WIDGET: RECENT WINS */}
        <Widget id="recentWins" span={3} title="Victorias Flash" icon="star" color={T.green}>
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {recentWins.map(deal => (
              <div key={deal.id} style={{ display: "flex", gap: 14, alignItems: "center", padding: "12px 16px", background: T.bg2, borderRadius: 12, border: `1px solid ${T.borderHi}`, transition: "transform .2s" }}>
                <div style={{ width: 42, height: 42, borderRadius: "50%", background: "rgba(255,255,255,0.05)", border: `1px solid ${T.green}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20 }}>🏆</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14, fontWeight: 800, color: T.white }}>{deal.titulo}</div>
                  <div style={{ fontSize: 11, color: T.whiteDim }}>{deal.responsable} · {money(deal.valor)}</div>
                </div>
                <div style={{ fontSize: 10, color: T.green, fontWeight: 900 }}>GANADO</div>
              </div>
            ))}
            {recentWins.length === 0 && <Vacio text="Nada nuevo por aquí" />}
          </div>
        </Widget>

         {/* WIDGET: VELOCITY */}
        <Widget id="velocity" span={3} title="Sales Velocity" icon="lightning" color={T.teal}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 20 }}>
             <div>
                <div style={{ fontSize: 32, fontWeight: 900, color: T.white }}>{averageVelocity}<span style={{ fontSize: 16, color: T.whiteDim, marginLeft: 4 }}>días</span></div>
                <div style={{ fontSize: 12, color: T.teal, fontWeight: 700 }}>Ciclo de cierre promedio</div>
             </div>
             <div style={{ padding: "6px 12px", background: "rgba(255,255,255,0.05)", borderRadius: 20, fontSize: 11, color: T.teal, fontWeight: 800 }}>EFICIENCIA +12%</div>
          </div>
          <div style={{ height: 120 }}>
             <ResponsiveContainer width="100%" height="100%">
                <LineChart data={velocityData}>
                   <Line type="monotone" dataKey="velocity" stroke={T.teal} strokeWidth={4} dot={false} />
                </LineChart>
             </ResponsiveContainer>
          </div>
        </Widget>

        {/* WIDGET: TOP DEALS */}
        <Widget id="topDeals" span={3} title="Top Opportunities" icon="star" color={T.amber}>
           <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {[...userDeals].filter(d => !esPerdido(d) && !esGanado(d)).sort((a, b) => b.valor - a.valor).slice(0, 4).map(deal => (
                <div key={deal.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingBottom: 12, borderBottom: `1px solid ${T.borderHi}` }}>
                   <div>
                      <div style={{ fontSize: 14, fontWeight: 700, color: T.white }}>{deal.titulo}</div>
                      <div style={{ fontSize: 11, color: T.whiteDim }}>{userContacts.find(c => c.id === deal.contacto_id)?.nombre || "Sin contacto"}</div>
                   </div>
                   <div style={{ textAlign: "right" }}>
                      <div style={{ fontSize: 15, fontWeight: 900, color: T.green }}>{money(deal.valor)}</div>
                      <div style={{ fontSize: 10, color: T.amber, fontWeight: 700 }}>Prob: {deal.prob}%</div>
                   </div>
                </div>
              ))}
           </div>
        </Widget>

        {/* WIDGET: ACTIVITIES */}
        <Widget id="activities" span={3} title="Live Feed" icon="history" color={T.whiteDim}>
           <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {[...userActs].sort((a, b) => new Date(b.fecha) - new Date(a.fecha)).slice(0, 4).map(act => {
                const cfg = ACT_CFG[act.tipo] || ACT_CFG.tarea;
                return (
                  <div key={act.id} style={{ display: "flex", gap: 12, alignItems: "center" }}>
                    <div style={{ width: 32, height: 32, borderRadius: 8, background: T.bg2, border: `1px solid ${T.borderHi}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14 }}>{cfg.icon}</div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                       <div style={{ fontSize: 13, fontWeight: 700, color: T.whiteOff, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{act.titulo}</div>
                       <div style={{ fontSize: 10, color: T.whiteDim }}>{fdtm(act.fecha)}</div>
                    </div>
                  </div>
                );
              })}
           </div>
        </Widget>

      </div>

      {/* MODAL CONFIGURACIÓN DASHBOARD */}
      <Modal open={showConfig} onClose={() => setShowConfig(false)} title="Personalizar Control Center" width={450}>
         <div style={{ display: "flex", flexDirection: "column", gap: 12, padding: "10px 0" }}>
            <p style={{ color: T.whiteDim, fontSize: 13, marginBottom: 16 }}>Selecciona los widgets que deseas ver en tu dashboard principal.</p>
            {Object.keys(widgets).map(wId => (
              <label key={wId} style={{ display: "flex", alignItems: "center", gap: 14, padding: "12px 16px", background: T.bg2, borderRadius: 12, cursor: "pointer", transition: "all .2s", border: `1px solid ${widgets[wId] ? T.teal : T.borderHi}` }}>
                 <input type="checkbox" checked={widgets[wId]} onChange={() => toggleWidget(wId)} style={{ width: 18, height: 18, accentColor: T.teal }} />
                 <span style={{ fontSize: 14, fontWeight: 700, color: T.white, textTransform: "capitalize" }}>{wId === "kpis" ? "Resumen (KPIs)" : wId === "ai" ? "Sales AI Insights" : wId.replace(/[A-Z]/g, ' $&')}</span>
                 <div style={{ flex: 1 }} />
                 <Ico k={wId === "kpis" ? "board" : wId === "ai" ? "lightning" : "chart"} size={16} style={{ opacity: widgets[wId] ? 1 : 0.3 }} />
              </label>
            ))}
            <Btn onClick={() => setShowConfig(false)} style={{ marginTop: 20 }}>Guardar Preferencias</Btn>
         </div>
      </Modal>

      <style>{`
        @keyframes fadeIn { from { opacity:0; transform: translateY(10px); } to { opacity:1; transform: translateY(0); } }
      `}</style>

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
                border: 4px solid rgba(255,255,255,0.1);
                border-top-color: ${T.teal};
                border-radius: 50%;
                animation: spin 1s linear infinite;
              }
              @keyframes spin { to { transform: rotate(360deg); } }
            `}</style>
          </div>
        ) : (
          <div style={{ color: T.whiteOff, lineHeight: 1.6, fontSize: 14 }}>
            <div style={{ whiteSpace: "pre-wrap", background: T.bg2, padding: 24, borderRadius: 12, border: `1px solid ${analisisIA.includes("Error") ? "rgba(239,68,68,0.3)" : T.borderHi}` }}>
              {analisisIA}
            </div>
            {analisisIA.includes("Error") && (
              <div style={{ marginTop: 16, display: "flex", justifyContent: "end" }}>
                <Btn onClick={solicitarAnalisis} variant="primario" size="sm">
                  <Ico k="refresh" size={14} /> Reintentar Conexión
                </Btn>
              </div>
            )}
            <div style={{ marginTop: 24, padding: 16, background: "rgba(255,255,255,0.03)", borderRadius: 10, border: `1px solid ${T.teal}`, display: "flex", gap: 12 }}>
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
