import { useState, useEffect, useRef } from "react";
import { T } from "../theme";
import { uid } from "../utils";
import { Chip, Btn, Inp, Sel, Campo, Modal, Tarjeta, EncabezadoSeccion, Ico, Vacio } from "../components/ui";

// ─── CATÁLOGO DE MÓDULOS ───────────────────────────────────────────────────────
const TRIGGERS = {
  deal_nuevo: { label: "Deal Creado", icon: "plus", color: "#F59E0B", badge: "CRM" },
  deal_ganado: { label: "Deal Ganado", icon: "star", color: "#10B981", badge: "CRM" },
  deal_perdido: { label: "Deal Perdido", icon: "x", color: "#EF4444", badge: "CRM" },
  contacto_nuevo: { label: "Nuevo Contacto", icon: "user-plus", color: "#8B5CF6", badge: "CRM" },
  form_submit: { label: "Formulario Enviado", icon: "check", color: "#06B6D4", badge: "Web" },
  webhook_in: { label: "Webhook Recibido", icon: "code", color: "#6366F1", badge: "API" },
  schedule: { label: "Temporizador", icon: "clock", color: "#EC4899", badge: "Timer" },
  deal_sin_act: { label: "Deal Sin Actividad", icon: "clock", color: "#F59E0B", badge: "Reminder" },
  tarea_vencida: { label: "Tarea Vencida", icon: "alert", color: "#EF4444", badge: "Reminder" },
  cierre_cercano: { label: "Cierre Próximo", icon: "calendar", color: "#EC4899", badge: "Reminder" },
};

const ACTIONS = {
  enviar_email: { label: "Enviar Email", icon: "mail", color: "#06B6D4", badge: "Email" },
  crear_tarea: { label: "Crear Tarea", icon: "check", color: "#10B981", badge: "CRM" },
  webhook_out: { label: "Llamar Webhook (POST)", icon: "code", color: "#6366F1", badge: "API" },
  etiquetar: { label: "Agregar Etiqueta", icon: "tag", color: "#8B5CF6", badge: "CRM" },
  slack_notify: { label: "Notif. Slack", icon: "bell", color: "#EC4899", badge: "Slack" },
  update_field: { label: "Actualizar Campo", icon: "edit", color: "#F59E0B", badge: "CRM" },
  mover_etapa: { label: "Mover a Etapa", icon: "funnel", color: "#14B8A6", badge: "CRM" },
  crear_nota: { label: "Crear Nota", icon: "note", color: "#6366F1", badge: "CRM" },
  asignar_prop: { label: "Asignar Propietario", icon: "user", color: "#8B5CF6", badge: "CRM" },
  reminder_email: { label: "Recordatorio por Email", icon: "mail", color: "#F59E0B", badge: "Reminder" },
};

const CONDITIONS = {
  if_condition: { label: "IF / Rama", icon: "branch", color: "#14B8A6", badge: "Logic" },
  delay: { label: "Esperar / Delay", icon: "clock", color: "#6B7280", badge: "Timer" },
  filter: { label: "Filtro / Detener", icon: "filter", color: "#EF4444", badge: "Logic" },
  split: { label: "División A/B", icon: "branch", color: "#8B5CF6", badge: "Logic" },
};

const ALL_NODE_TYPES = { ...TRIGGERS, ...ACTIONS, ...CONDITIONS };

// ─── SIMULACIÓN LOG EN TIEMPO REAL ─────────────────────────────────────────────
const LOG_MSGS = [
  "→ Disparador recibido: deal.estado === 'ganado'",
  "✓ Condición aprobada: valor > 1000",
  "→ Llamando Webhook POST https://hooks.zapier.com/...",
  "← [200 OK] Respuesta: {\"estado\":\"en cola\"}",
  "→ Enviando Email a: cliente@empresa.com",
  "✓ Email entregado (SMTP 250 2.0.0 OK)",
  "→ Creando Tarea: 'Llamada de seguimiento'",
  "✓ Tarea creada ID: tsk_9f3a2b",
  "→ Etiquetando deal: 'cliente-vip'",
  "✓ Etiqueta aplicada correctamente",
  "⚡ Flow completado en 148ms",
];

export const Automatizaciones = ({ db, setDb, guardarEnSupa, eliminarDeSupa, t }) => {
  const [wfs, setWfs] = useState([]);

  useEffect(() => {
    if (db.automatizaciones) {
      setWfs(db.automatizaciones);
    }
  }, [db.automatizaciones]);

  const [wfSel, setWfSel] = useState(null);

  useEffect(() => {
    if (wfs.length > 0 && !wfSel) {
      setWfSel(wfs[0].id);
    }
  }, [wfs]);
  const [showForm, setShowForm] = useState(false);
  const [fNombre, setFNombre] = useState("");
  const [nodoSel, setNodoSel] = useState(null);
  const [showAddNode, setShowAddNode] = useState(false);
  const [logs, setLogs] = useState([]);
  const [running, setRunning] = useState(false);
  const logRef = useRef(null);

  const actual = wfs.find(w => w.id === wfSel);

  // Simulate log execution
  const simularEjecucion = () => {
    if (running) return;
    setRunning(true);
    setLogs([]);
    let i = 0;
    const interval = setInterval(() => {
      if (i >= LOG_MSGS.length) { clearInterval(interval); setRunning(false); return; }
      setLogs(p => [...p, { id: uid(), msg: LOG_MSGS[i], ts: new Date().toLocaleTimeString() }]);
      i++;
    }, 300);
  };

  useEffect(() => {
    if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight;
  }, [logs]);

  const crearWf = async () => {
    if (!fNombre.trim()) return;
    const wf = { id: "wf" + uid(), nombre: fNombre, nodos: [{ id: "n1", tipo: "trigger", ref: "deal_nuevo", extra: "" }], activo: false, stats: 0, org_id: db.usuario?.org_id };
    await guardarEnSupa("automatizaciones", wf);
    setWfSel(wf.id); setShowForm(false); setFNombre("");
  };

  const agregarNodo = async (tipo, ref) => {
    if (!actual) return;
    const updatedWf = { ...actual, nodos: [...actual.nodos, { id: "n" + uid(), tipo, ref, extra: "" }] };
    await guardarEnSupa("automatizaciones", updatedWf);
    setShowAddNode(false);
  };

  const actNodo = async (nId, k, v) => {
    const updatedWf = { ...actual, nodos: actual.nodos.map(n => n.id === nId ? { ...n, [k]: v } : n) };
    await guardarEnSupa("automatizaciones", updatedWf);
  };

  const elimNodo = async (nId) => {
    const updatedWf = { ...actual, nodos: actual.nodos.filter(n => n.id !== nId) };
    await guardarEnSupa("automatizaciones", updatedWf);
    setNodoSel(null);
  };

  const toggle = async (wId) => {
    const wf = wfs.find(w => w.id === wId);
    if (wf) {
      await guardarEnSupa("automatizaciones", { ...wf, activo: !wf.activo });
    }
  };

  const eliminarWf = async (wId) => {
    if (!confirm("¿Eliminar este Flow por completo?")) return;
    await eliminarDeSupa("automatizaciones", wId);
    if (wfSel === wId) setWfSel(wfs.filter(w => w.id !== wId)[0]?.id || null);
  };

  const selNodo = actual?.nodos.find(n => n.id === nodoSel);
  const isTrigSel = selNodo?.tipo === "trigger";
  const catSel = isTrigSel ? TRIGGERS : (selNodo?.tipo === "condition" ? CONDITIONS : ACTIONS);
  const defSel = catSel?.[selNodo?.ref] || Object.values(catSel || {})[0];

  return (
    <div style={{ display: "flex", gap: 20, height: "calc(100vh - 120px)", overflow: "hidden" }}>

      {/* ─── SIDEBAR WORKFLOWS ──── */}
      <div style={{ width: 290, display: "flex", flexDirection: "column", gap: 14, flexShrink: 0 }}>
        <EncabezadoSeccion title={t ? t("Automatizaciones") : "Automatizaciones"} sub={t ? t("Motor de Automatización") : "Motor de Automatización"} />
        <Btn onClick={() => setShowForm(true)} full><Ico k="plus" size={14} /> {t ? t("Nuevo Flow") : "Nuevo Flow"}</Btn>

        <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", gap: 8 }}>
          {wfs.map(w => {
            const act = wfSel === w.id;
            return (
              <Tarjeta key={w.id} onClick={() => { setWfSel(w.id); setNodoSel(null); }}
                style={{ padding: "14px 16px", background: act ? "#0D1117" : T.bg1, border: `1px solid ${act ? T.teal : T.borderHi}`, cursor: "pointer", transition: "all .2s", boxShadow: act ? `0 0 0 1px ${T.teal}40, 0 4px 20px ${T.teal}15` : "none" }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8, alignItems: "flex-start" }}>
                  <div style={{ fontWeight: 800, color: act ? T.teal : T.white, fontSize: 13, lineHeight: 1.4 }}>{w.nombre}</div>
                  <div style={{ width: 8, height: 8, borderRadius: "50%", flexShrink: 0, background: w.activo ? T.green : "#374151", boxShadow: w.activo ? `0 0 8px ${T.green}` : "none", marginTop: 4, marginLeft: 6 }} />
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div style={{ fontSize: 11, color: T.whiteDim, fontWeight: 600, display: "flex", alignItems: "center", gap: 4 }}>
                    <Ico k="play" size={10} /> {w.stats} {t ? t("ejecuciones") : "ejecuciones"}
                  </div>
                  <div style={{ fontSize: 11, color: T.whiteDim }}>{w.nodos.length} {t ? t("nodos") : "nodos"}</div>
                </div>
              </Tarjeta>
            );
          })}
          {wfs.length === 0 && <Vacio text={t ? t("Sin resultados") : "Sin automatizaciones aún"} />}
        </div>
      </div>

      {/* ─── CANVAS AREA ──── */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 0, overflow: "hidden", borderRadius: 16, border: `1px solid ${T.borderHi}`, minWidth: 0 }}>

        {actual ? (<>
          {/* Topbar */}
          <div style={{ padding: "14px 20px", background: "#0D1117", borderBottom: `1px solid #1F2937`, display: "flex", justifyContent: "space-between", alignItems: "center", flexShrink: 0, gap: 12, flexWrap: "wrap" }}>
            <div>
              <div style={{ fontSize: 16, fontWeight: 800, color: "#E5E7EB" }}>{actual.nombre}</div>
              <div style={{ fontSize: 11, color: "#6B7280", marginTop: 2, fontFamily: "monospace" }}>flow_id: {actual.id} · {actual.nodos.length} {t ? t("nodos") : "nodos"} · Flow Engine v3</div>
            </div>

            {/* Pipeline Target Selector */}
            <div style={{ display: "flex", alignItems: "center", gap: 8, background: "#111827", border: "1px solid #374151", borderRadius: 10, padding: "6px 12px" }}>
              <Ico k="funnel" size={14} style={{ color: T.teal, flexShrink: 0 }} />
              <span style={{ fontSize: 11, color: "#6B7280", fontWeight: 700, fontFamily: "monospace", whiteSpace: "nowrap" }}>{t ? t("Pipeline objetivo") : "Pipeline objetivo"}</span>
              <select value={actual.pipeline_id || ""} onChange={async (e) => {
                await guardarEnSupa("automatizaciones", { ...actual, pipeline_id: e.target.value });
              }} style={{ background: "transparent", color: T.teal, border: "none", outline: "none", fontFamily: "monospace", fontSize: 13, fontWeight: 700, cursor: "pointer", maxWidth: 160 }}>
                <option value="">— {t ? t("Todos los Pipelines") : "Todos los Pipelines"} —</option>
                {(db?.pipelines || []).map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}
              </select>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <Btn variant="fantasma" onClick={simularEjecucion} style={{ background: running ? "#065F46" : "#111827", border: `1px solid ${running ? T.green : "#374151"}`, color: running ? T.green : "#9CA3AF", fontSize: 12, fontFamily: "monospace" }}>
                {running ? `⚡ ${t ? t("Ejecutando...") : "Ejecutando..."}` : `▶ ${t ? t("Ejecutar Prueba") : "Ejecutar Prueba"}`}
              </Btn>
              <span style={{ fontSize: 13, fontWeight: 700, color: actual.activo ? T.green : "#6B7280" }}>{actual.activo ? `● ${t ? t("En vivo") : "En vivo"}` : `○ ${t ? t("Pausado") : "Pausado"}`}</span>
              <button onClick={() => toggle(actual.id)} style={{ width: 44, height: 24, borderRadius: 12, background: actual.activo ? T.green : "#374151", position: "relative", cursor: "pointer", border: "none" }}>
                <div style={{ width: 18, height: 18, borderRadius: "50%", background: "#fff", position: "absolute", top: 3, left: actual.activo ? 23 : 3, transition: "left .2s" }} />
              </button>
              <div style={{ width: 1, height: 20, background: "#1F2937" }} />
              <Btn variant="fantasma" onClick={() => eliminarWf(actual.id)}><Ico k="trash" size={15} style={{ color: "#EF4444" }} /></Btn>
            </div>
          </div>

          {/* Canvas + Logs Row */}
          <div style={{ flex: 1, display: "flex", minHeight: 0 }}>

            {/* Canvas Grid */}
            <div style={{ flex: 1, background: "#030712", backgroundImage: "radial-gradient(#1F2937 1.5px, transparent 1.5px)", backgroundSize: "28px 28px", overflowX: "auto", overflowY: "hidden", display: "flex", alignItems: "center", padding: "60px 60px", position: "relative", cursor: "crosshair" }}
              onClick={() => setNodoSel(null)}>

              {/* Bezier SVG layer */}
              <svg style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%", pointerEvents: "none", overflow: "visible" }}>
                <defs>
                  <filter id="glow">
                    <feGaussianBlur stdDeviation="3" result="coloredBlur" />
                    <feMerge><feMergeNode in="coloredBlur" /><feMergeNode in="SourceGraphic" /></feMerge>
                  </filter>
                </defs>
                {actual.nodos.map((n, i) => {
                  if (i === actual.nodos.length - 1) return null;
                  const nx = i * 380 + 66 + 300; // node width 300 + 60px connector
                  const ny = "50%";
                  const startX = 60 + i * 360 + 300;
                  const endX = 60 + (i + 1) * 360;
                  const midY = 200;
                  const def = ALL_NODE_TYPES[n.ref] || Object.values(ALL_NODE_TYPES)[0];
                  return (
                    <path key={i}
                      d={`M ${startX} ${midY} C ${startX + 60} ${midY}, ${endX - 60} ${midY}, ${endX} ${midY}`}
                      stroke={def.color}
                      strokeWidth="2.5"
                      fill="none"
                      strokeDasharray="6 4"
                      filter="url(#glow)"
                      style={{ animation: "dashMove 1.5s linear infinite" }}
                    />
                  );
                })}
              </svg>

              <style>{`
                @keyframes dashMove { to { stroke-dashoffset: -20; } }
                .node-card:hover { transform: scale(1.03) !important; }
              `}</style>

              {/* Nodes */}
              <div style={{ display: "flex", alignItems: "center", zIndex: 5, position: "relative" }}>
                {actual.nodos.map((n, i) => {
                  const def = ALL_NODE_TYPES[n.ref] || Object.values(ALL_NODE_TYPES)[0];
                  const isSel = nodoSel === n.id;
                  const isTrig = n.tipo === "trigger";
                  const isCond = n.tipo === "condition";
                  const nodeColor = def.color;

                  return (
                    <div key={n.id} style={{ display: "flex", alignItems: "center" }}>
                      {/* Node Card */}
                      <div className="node-card"
                        onClick={e => { e.stopPropagation(); setNodoSel(n.id); }}
                        style={{
                          width: 280, background: isSel ? "#111827" : "#0D1117",
                          border: `1.5px solid ${isSel ? nodeColor : "#1F2937"}`,
                          borderRadius: 14, cursor: "pointer", userSelect: "none",
                          boxShadow: isSel ? `0 0 0 3px ${nodeColor}30, 0 8px 40px ${nodeColor}20` : "0 4px 24px rgba(0,0,0,0.6)",
                          transition: "transform .2s, border-color .15s, box-shadow .15s",
                        }}>

                        {/* Node Header */}
                        <div style={{ padding: "12px 16px", borderBottom: "1px solid #1F2937", display: "flex", gap: 10, alignItems: "center", borderTopLeftRadius: 12, borderTopRightRadius: 12, background: `${nodeColor}10` }}>
                          <div style={{ width: 36, height: 36, borderRadius: 9, background: `${nodeColor}20`, border: `1px solid ${nodeColor}40`, display: "flex", alignItems: "center", justifyContent: "center", color: nodeColor, flexShrink: 0, boxShadow: `0 0 10px ${nodeColor}30` }}>
                            <Ico k={def.icon} size={18} />
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 2 }}>
                              <span style={{ fontSize: 9, fontWeight: 800, color: nodeColor, fontFamily: "monospace", textTransform: "uppercase", background: `${nodeColor}15`, padding: "1px 6px", borderRadius: 4, border: `1px solid ${nodeColor}30` }}>
                                {isTrig ? "TRIGGER" : isCond ? "CONDITION" : "ACTION"}
                              </span>
                              <span style={{ fontSize: 9, color: "#4B5563", fontFamily: "monospace" }}>{def.badge}</span>
                            </div>
                            <div style={{ fontSize: 13, fontWeight: 700, color: "#F9FAFB", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{def.label}</div>
                          </div>
                        </div>

                        {/* Node Body */}
                        <div style={{ padding: "12px 16px", background: "#0D1117", borderBottomLeftRadius: 12, borderBottomRightRadius: 12 }}>
                          {n.extra ? (
                            <div style={{ fontFamily: "monospace", fontSize: 11, color: nodeColor, background: `${nodeColor}10`, border: `1px solid ${nodeColor}20`, borderRadius: 6, padding: "6px 10px", wordBreak: "break-all" }}>
                              {n.extra}
                            </div>
                          ) : (
                            <div style={{ fontSize: 11, color: "#4B5563", fontStyle: "italic" }}>No config · click to edit</div>
                          )}
                          <div style={{ marginTop: 10, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                            <span style={{ fontSize: 10, color: "#374151", fontFamily: "monospace" }}>node_{i + 1}</span>
                            {isSel && <span style={{ fontSize: 10, color: nodeColor, fontWeight: 700 }}>● selected</span>}
                          </div>
                        </div>
                      </div>

                      {/* Connector */}
                      <div style={{ width: 80, height: 2, background: `linear-gradient(90deg, ${def.color}80, transparent)`, position: "relative", display: "flex", alignItems: "center", justifyContent: "flex-end" }}>
                        {i === actual.nodos.length - 1 && (
                          <button onClick={e => { e.stopPropagation(); setShowAddNode(true); }}
                            style={{ position: "absolute", right: 0, width: 32, height: 32, borderRadius: "50%", background: "#111827", color: "#4B5563", border: "2px dashed #374151", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", transition: "all .2s", zIndex: 10 }}
                            onMouseEnter={e => { e.currentTarget.style.borderColor = T.teal; e.currentTarget.style.color = T.teal; e.currentTarget.style.boxShadow = `0 0 12px ${T.teal}40`; }}
                            onMouseLeave={e => { e.currentTarget.style.borderColor = "#374151"; e.currentTarget.style.color = "#4B5563"; e.currentTarget.style.boxShadow = "none"; }}>
                            <Ico k="plus" size={15} />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* ─── INSPECTOR PANEL ──── */}
            {nodoSel && selNodo && (
              <div style={{ width: 320, background: "#0D1117", borderLeft: "1px solid #1F2937", display: "flex", flexDirection: "column", flexShrink: 0, animation: "slideInRight .25s ease-out" }}>
                <div style={{ padding: "16px 20px", borderBottom: "1px solid #1F2937", background: "#111827", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div>
                    <div style={{ fontSize: 10, fontFamily: "monospace", color: "#6B7280", textTransform: "uppercase", letterSpacing: ".1em", marginBottom: 4 }}>Node Inspector</div>
                    <div style={{ fontSize: 15, fontWeight: 700, color: defSel?.color || T.teal, display: "flex", alignItems: "center", gap: 8 }}>
                      <Ico k={defSel?.icon || "code"} size={16} /> {defSel?.label}
                    </div>
                  </div>
                  <Btn variant="fantasma" size="sm" onClick={() => setNodoSel(null)}><Ico k="x" size={15} /></Btn>
                </div>

                <div style={{ flex: 1, overflowY: "auto", padding: 20, display: "flex", flexDirection: "column", gap: 18 }}>
                  <Campo label="Module / Event">
                    <Sel value={selNodo.ref} onChange={e => actNodo(nodoSel, "ref", e.target.value)}
                      style={{ fontFamily: "monospace", fontSize: 13, background: "#111827", color: "#E5E7EB", border: "1px solid #374151" }}>
                      {Object.entries(catSel || {}).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                    </Sel>
                  </Campo>

                  <Campo label="Config / Payload">
                    <Inp value={selNodo.extra || ""} onChange={e => actNodo(nodoSel, "extra", e.target.value)}
                      placeholder="e.g. template_id / webhook_url / condition..."
                      style={{ fontFamily: "monospace", fontSize: 12, background: "#111827", color: "#10B981", border: "1px solid #374151" }}
                      rows={3} />
                  </Campo>

                  {!isTrigSel && (
                    <div>
                      <div style={{ fontSize: 11, color: "#6B7280", fontFamily: "monospace", marginBottom: 8, textTransform: "uppercase", letterSpacing: ".08em" }}>Variable Map</div>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                        {["{{deal.id}}", "{{deal.valor}}", "{{contact.name}}", "{{contact.email}}", "{{date.now}}", "{{form.data}}"].map(v => (
                          <button key={v} onClick={() => actNodo(nodoSel, "extra", (selNodo.extra || "") + v)}
                            style={{ fontFamily: "monospace", fontSize: 10, color: "#10B981", background: "#10B98115", border: "1px solid #10B98130", borderRadius: 4, padding: "3px 8px", cursor: "pointer" }}>
                            {v}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {!isTrigSel && (
                  <div style={{ padding: 16, borderTop: "1px solid #1F2937" }}>
                    <Btn full variant="peligro" onClick={() => elimNodo(nodoSel)}>
                      <Ico k="trash" size={14} /> Remove Node
                    </Btn>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* ─── LOG CONSOLE ──── */}
          <div style={{ height: 160, background: "#030712", borderTop: "1px solid #1F2937", display: "flex", flexDirection: "column", flexShrink: 0 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "6px 16px", borderBottom: "1px solid #111827" }}>
              <div style={{ fontFamily: "monospace", fontSize: 11, color: "#4B5563", display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ color: "#10B981" }}>●</span> Execution Console  {running && <span style={{ color: "#F59E0B", animation: "pulse 1s infinite" }}>▲ running...</span>}
              </div>
              <button onClick={() => setLogs([])} style={{ fontFamily: "monospace", fontSize: 10, color: "#374151", background: "transparent", border: "none", cursor: "pointer" }}>clear</button>
            </div>
            <div ref={logRef} style={{ flex: 1, overflowY: "auto", padding: "6px 16px", display: "flex", flexDirection: "column", gap: 3 }}>
              {logs.length === 0 && (
                <div style={{ fontFamily: "monospace", fontSize: 11, color: "#1F2937" }}>// Click "▶ Run Test" to simulate this flow execution</div>
              )}
              {logs.map(l => (
                <div key={l.id} style={{ fontFamily: "monospace", fontSize: 11, color: l.msg.startsWith("✓") ? "#10B981" : l.msg.startsWith("←") ? "#6366F1" : "#9CA3AF", display: "flex", gap: 10 }}>
                  <span style={{ color: "#374151", flexShrink: 0 }}>{l.ts}</span>
                  <span>{l.msg}</span>
                </div>
              ))}
            </div>
          </div>

        </>) : (
          <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", background: "#030712", backgroundImage: "radial-gradient(#1F2937 1.5px, transparent 1.5px)", backgroundSize: "28px 28px" }}>
            <Vacio text="Select or create an automation flow to start building your workflow." />
          </div>
        )}
      </div>

      {/* ─── ADD NODE MODAL ──── */}
      <Modal open={showAddNode} onClose={() => setShowAddNode(false)} title="Add Node to Flow" width={560}>
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          {[
            { label: "Actions", cat: ACTIONS, tipo: "action" },
            { label: "Conditions & Logic", cat: CONDITIONS, tipo: "condition" },
          ].map(({ label, cat, tipo }) => (
            <div key={label}>
              <div style={{ fontSize: 11, fontWeight: 800, color: T.whiteDim, textTransform: "uppercase", letterSpacing: ".1em", marginBottom: 10 }}>{label}</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                {Object.entries(cat).map(([k, v]) => (
                  <button key={k} onClick={() => agregarNodo(tipo, k)}
                    style={{ display: "flex", alignItems: "center", gap: 12, background: T.bg1, border: `1px solid ${T.borderHi}`, borderRadius: 10, padding: "12px 14px", cursor: "pointer", textAlign: "left", transition: "all .15s", fontFamily: "inherit" }}
                    onMouseEnter={e => { e.currentTarget.style.borderColor = v.color; e.currentTarget.style.background = `${v.color}10`; }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = T.borderHi; e.currentTarget.style.background = T.bg1; }}>
                    <div style={{ width: 32, height: 32, borderRadius: 8, background: `${v.color}20`, color: v.color, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                      <Ico k={v.icon} size={16} />
                    </div>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 700, color: T.white }}>{v.label}</div>
                      <div style={{ fontSize: 10, color: T.whiteDim, fontFamily: "monospace" }}>{v.badge}</div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </Modal>

      {/* ─── NEW FLOW MODAL ──── */}
      <Modal open={showForm} onClose={() => setShowForm(false)} title="New Automation Flow" width={440}>
        <Campo label="Flow Name">
          <Inp value={fNombre} onChange={e => setFNombre(e.target.value)} placeholder="e.g. Win → Notify Slack" style={{ fontSize: 15 }} />
        </Campo>
        <div style={{ display: "flex", gap: 12, justifyContent: "flex-end", marginTop: 24 }}>
          <Btn variant="secundario" onClick={() => setShowForm(false)}>Cancel</Btn>
          <Btn onClick={crearWf} disabled={!fNombre.trim()}>Create Flow</Btn>
        </div>
      </Modal>
    </div>
  );
};
