import { useState } from "react";
import { format, addMonths, subMonths, startOfMonth, endOfMonth, startOfWeek, endOfWeek, isSameMonth, isSameDay, addDays, getDay } from "date-fns";
import { es } from "date-fns/locale";
import { T } from "../theme";
import { money } from "../utils";
import { Btn, Tarjeta, Celda, Chip, EncabezadoSeccion, Ico } from "../components/ui";

export const Calendario = ({ db }) => {
  const [currentDate, setCurrentDate] = useState(new Date());

  const nextMonth = () => setCurrentDate(addMonths(currentDate, 1));
  const prevMonth = () => setCurrentDate(subMonths(currentDate, 1));
  const today = () => setCurrentDate(new Date());

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(monthStart);
  const startDate = startOfWeek(monthStart, { weekStarts: 1 }); // Comienza el lunes
  const endDate = endOfWeek(monthEnd, { weekStarts: 1 });

  const dateFormat = "MMMM yyyy";
  const days = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];

  // Recopilar eventos del mes
  const getEventosDelDia = (dia) => {
    const evts = [];
    
    // Tareas vencimiento
    db.tareas?.forEach(t => {
      if (t.vencimiento && isSameDay(new Date(t.vencimiento), dia)) {
        evts.push({ id: t.id, tipo: "tarea", titulo: t.titulo, color: T.amber, icono: "check" });
      }
    });

    // Actividades (Reuniones, llamadas)
    db.actividades?.forEach(a => {
      if (a.fecha && isSameDay(new Date(a.fecha), dia)) {
        evts.push({ id: a.id, tipo: "act", titulo: a.titulo, color: T.teal, icono: "lightning" });
      }
    });

    // Cierres de Deals
    db.deals?.forEach(d => {
      if (d.fechaCierre && isSameDay(new Date(d.fechaCierre), dia)) {
        evts.push({ id: d.id, tipo: "deal", titulo: `Cierre: ${d.titulo}`, color: T.green, icono: "dollar", extra: money(d.valor) });
      }
    });

    return evts;
  };

  const dayRows = [];
  let rowDays = [];
  let day = startDate;
  let formatedDate = "";

  while (day <= endDate) {
    for (let i = 0; i < 7; i++) {
      formatedDate = format(day, "d");
      const cloneDay = day;
      const esHoy = isSameDay(day, new Date());
      const esMesAct = isSameMonth(day, monthStart);
      const evts = getEventosDelDia(day);

      rowDays.push(
        <div key={day} style={{ 
          minHeight: 120, 
          background: esMesAct ? T.bg1 : T.bg2,
          borderRight: `1px solid ${T.borderHi}`, 
          borderBottom: `1px solid ${T.borderHi}`,
          padding: 8,
          opacity: esMesAct ? 1 : 0.4
        }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
            <span style={{ 
              fontWeight: esHoy ? 800 : 700, 
              color: esHoy ? "#fff" : T.whiteOff,
              background: esHoy ? T.teal : "transparent",
              width: 24, height: 24, borderRadius: "50%",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 13
            }}>{formatedDate}</span>
          </div>
          
          <div style={{ display: "flex", flexDirection: "column", gap: 4, maxHeight: 85, overflowY: "auto" }}>
            {evts.slice(0, 3).map((ev, i) => (
              <div key={i} style={{ background: ev.color + "15", borderLeft: `3px solid ${ev.color}`, padding: "4px 8px", borderRadius: 4, display: "flex", alignItems: "center", gap: 6, fontSize: 11, color: T.white }}>
                <Ico k={ev.icono} size={10} style={{ color: ev.color }} />
                <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1, fontWeight: 600 }}>{ev.titulo}</span>
              </div>
            ))}
            {evts.length > 3 && <div style={{ fontSize: 10, color: T.whiteDim, textAlign: "center", fontWeight: 700 }}>+{evts.length - 3} más</div>}
          </div>
        </div>
      );
      day = addDays(day, 1);
    }
    dayRows.push(<div key={day} style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)" }}>{rowDays}</div>);
    rowDays = [];
  }

  return (
    <div>
      <EncabezadoSeccion title="Calendario Global" sub="Actividades, tareas y cierres de deals proyectados"
        actions={
          <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
            <span style={{ fontSize: 16, fontWeight: 800, color: T.teal, textTransform: "capitalize", minWidth: 150, textAlign: "right", marginRight: 16 }}>
              {format(currentDate, dateFormat, { locale: es })}
            </span>
            <div style={{ display: "flex", background: T.bg1, border: `1px solid ${T.borderHi}`, borderRadius: 8, overflow: "hidden" }}>
              <button onClick={today} style={{ padding: "6px 16px", border: "none", background: "transparent", cursor: "pointer", fontWeight: 700, fontSize: 13, borderRight: `1px solid ${T.borderHi}`, color: T.whiteDim, fontFamily: "inherit" }}>Hoy</button>
              <button onClick={prevMonth} style={{ padding: "6px 12px", border: "none", background: "transparent", cursor: "pointer", borderRight: `1px solid ${T.borderHi}`, color: T.whiteOff }}><Ico k="menu" size={14} style={{ transform: "rotate(90deg)" }} /></button>
              <button onClick={nextMonth} style={{ padding: "6px 12px", border: "none", background: "transparent", cursor: "pointer", color: T.whiteOff }}><Ico k="menu" size={14} style={{ transform: "rotate(-90deg)" }} /></button>
            </div>
            <Btn><Ico k="plus" size={14} />Nueva Cita</Btn>
          </div>
        }
      />

      <Tarjeta style={{ padding: 0, overflow: "hidden" }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", background: T.bg2, borderBottom: `1px solid ${T.border}` }}>
          {days.map(d => (
            <div key={d} style={{ padding: "12px 0", textAlign: "center", fontSize: 12, fontWeight: 800, color: T.whiteDim, textTransform: "uppercase", letterSpacing: ".05em", borderRight: `1px solid ${T.borderHi}` }}>
              {d}
            </div>
          ))}
        </div>
        <div style={{ display: "flex", flexDirection: "column" }}>
          {dayRows}
        </div>
      </Tarjeta>
    </div>
  );
};
