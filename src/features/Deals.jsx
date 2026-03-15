import { useState } from "react";
import { T } from "../theme";
import { money, fdate } from "../utils";
import { Av, Chip, Btn, Sel, Tarjeta, CabeceraTabla, FilaTabla, Celda, Barra, BuscadorBar, Vacio, EncabezadoSeccion, KPI, Ico } from "../components/ui";

export const Deals = ({ db, setDb, guardarEnSupa, eliminarDeSupa }) => {
  const [busqueda, setBusqueda] = useState("");
  const [fPL, setFPL] = useState("todos");
  const [fEt, setFEt] = useState("todas");

  const filtrados = db.deals.filter(d =>
    (fPL === "todos" || d.pipelineId === fPL) &&
    (fEt === "todas" || d.etapaId === fEt) &&
    d.titulo.toLowerCase().includes(busqueda.toLowerCase())
  );
  
  const etapasActuales = fPL !== "todos" ? db.pipelines.find(p => p.id === fPL)?.etapas || [] : [];
  const esGanado = d => db.pipelines.find(p => p.id === d.pipelineId)?.etapas.find(e => e.id === d.etapaId)?.esGanado;
  
  const total = filtrados.reduce((s, d) => s + d.valor, 0);
  const ganados = filtrados.filter(esGanado);
  
  const eliminar = async id => {
    if (!confirm("¿Eliminar deal?")) return;
    setDb(d => ({ ...d, deals: d.deals.filter(deal => deal.id !== id) }));
    await eliminarDeSupa("deals", id);
  };

  return (
    <div>
      <EncabezadoSeccion title="Deals y Oportunidades" sub={`${filtrados.length} oportunidades filtradas · ${money(total)} generados en pipeline`} />
      
      <div style={{ display: "flex", gap: 16, marginBottom: 24, flexWrap: "wrap", maxWidth: 900 }}>
        <KPI label="Pipeline Seleccionado" value={money(total)} color={T.teal} icon="funnel" />
        <KPI label="Total Ganado" value={money(ganados.reduce((s, d) => s + d.valor, 0))} color={T.green} sub={`${ganados.length} deals cerrados`} icon="trend" />
        <KPI label="Deals Pendientes" value={filtrados.filter(d => !esGanado(d)).length} color={T.amber} icon="clock" />
      </div>

      <Tarjeta style={{ padding: 20, marginBottom: 20 }}>
        <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
          <BuscadorBar value={busqueda} onChange={e => setBusqueda(e.target.value)} placeholder="Buscar deals por nombre..." />
          <Sel value={fPL} onChange={e => { setFPL(e.target.value); setFEt("todas"); }} style={{ width: 220 }}>
            <option value="todos">Todos los pipelines</option>
            {db.pipelines.map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}
          </Sel>
          {etapasActuales.length > 0 && <Sel value={fEt} onChange={e => setFEt(e.target.value)} style={{ width: 220 }}>
            <option value="todas">Todas las etapas</option>
            {etapasActuales.map(e => <option key={e.id} value={e.id}>{e.nombre}</option>)}
          </Sel>}
        </div>
      </Tarjeta>

      <Tarjeta>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <CabeceraTabla cols={["Deal", "Contacto", "Pipeline · Etapa", "Valor", "Probabilidad", "Cierre", "Responsable", ""]} />
          <tbody>
            {filtrados.map(deal => {
              const contacto = db.contactos.find(c => c.id === deal.contactoId);
              const pl = db.pipelines.find(p => p.id === deal.pipelineId);
              const et = pl?.etapas.find(e => e.id === deal.etapaId);
              const pc = deal.prob >= 70 ? T.green : deal.prob >= 40 ? T.amber : T.red;
              return (
                <FilaTabla key={deal.id}>
                  <Celda><div style={{ fontWeight: 700, color: T.white, fontSize: 13, marginBottom: 4 }}>{deal.titulo}</div><div style={{ fontSize: 11, color: T.whiteDim }}>Creado: {fdate(deal.creado)}</div></Celda>
                  <Celda>{contacto ? <div style={{ display: "flex", gap: 10, alignItems: "center" }}><Av text={contacto.avatar} color={contacto.color} size={28} fs={10} /><span style={{ fontSize: 13, fontWeight: 600 }}>{contacto.nombre}</span></div> : <span style={{ color: T.whiteFade }}>—</span>}</Celda>
                  <Celda><div style={{ fontSize: 11, color: T.whiteDim, fontWeight: 600, marginBottom: 6 }}>{pl?.nombre}</div>{et && <Chip label={et.nombre} color={et.color} />}</Celda>
                  <Celda style={{ fontWeight: 800, color: T.green, fontSize: 14 }}>{money(deal.valor)}</Celda>
                  <Celda><div style={{ display: "flex", gap: 8, alignItems: "center" }}><div style={{ width: 48 }}><Barra value={deal.prob} color={pc} h={6} /></div><span style={{ fontSize: 11, color: pc, fontWeight: 800 }}>{deal.prob}%</span></div></Celda>
                  <Celda style={{ fontSize: 13, fontWeight: 500 }}>{fdate(deal.fechaCierre)}</Celda>
                  <Celda style={{ fontSize: 13, color: T.whiteDim }}>{deal.responsable}</Celda>
                  <Celda><Btn variant="fantasma" size="sm" onClick={() => eliminar(deal.id)}><Ico k="trash" size={14} style={{ color: T.red }} /></Btn></Celda>
                </FilaTabla>
              );
            })}
            {filtrados.length === 0 && <tr><td colSpan={8}><Vacio text="No se encontraron deals con los filtros actuales." /></td></tr>}
          </tbody>
        </table>
      </Tarjeta>
    </div>
  );
};
