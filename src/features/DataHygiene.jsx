import { useState, useMemo } from "react";
import { T } from "../theme";
import { Ico, Btn, Tarjeta, EncabezadoSeccion, Chip } from "../components/ui";
import { sileo } from "../utils/sileo";

export function DataHygiene({ db, setDb, guardarEnSupa, eliminarDeSupa, t }) {
  const [loading, setLoading] = useState(false);
  const [selectedIds, setSelectedIds] = useState([]);
  
  // 1. Detección de Duplicados (Lógica Simple por Teléfono o Email)
  const duplicados = useMemo(() => {
    const counts = {};
    const dupes = [];
    
    (db.contactos || []).forEach(c => {
      if (c.telefono) {
        const tel = String(c.telefono).replace(/\D/g, "");
        if (tel.length > 5) {
          counts[tel] = (counts[tel] || 0) + 1;
        }
      }
      if (c.email) {
        const mail = c.email.toLowerCase().trim();
        counts[mail] = (counts[mail] || 0) + 1;
      }
    });

    const validados = new Set();
    Object.entries(counts).forEach(([key, count]) => {
      if (count > 1) {
        const matching = (db.contactos || []).filter(c => {
          const tel = c.telefono ? String(c.telefono).replace(/\D/g, "") : "";
          const mail = c.email ? c.email.toLowerCase().trim() : "";
          return tel === key || mail === key;
        });
        
        // Evitar grupos duplicados si un contacto tiene email y tel duplicados
        const matchIds = matching.map(m => m.id).sort().join("|");
        if (!validados.has(matchIds)) {
          dupes.push({ key, matching });
          validados.add(matchIds);
        }
      }
    });
    
    return dupes;
  }, [db.contactos]);

  const fusionarContactos = async (grupo) => {
    if (!confirm(`¿Fusionar ${grupo.length} contactos en uno solo? Se conservará el primero y se intentará mover los deals al principal.`)) return;
    
    setLoading(true);
    const principal = grupo[0];
    const obsoletos = grupo.slice(1);
    
    try {
      // Mover deals de los obsoletos al principal
      for (const obs of obsoletos) {
        const dealsAsociados = (db.deals || []).filter(d => d.contacto_id === obs.id);
        for (const deal of dealsAsociados) {
          await guardarEnSupa("deals", { ...deal, contacto_id: principal.id });
        }
        // Eliminar el contacto obsoleto
        await eliminarDeSupa("contactos", obs.id);
      }
      sileo.success("Fusión completada con éxito.");
    } catch (e) {
      console.error("Error fusionando:", e);
    }
    setLoading(false);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 32 }}>
      <EncabezadoSeccion title="Limpieza de Datos (Data Hygiene)" sub="Mantén tu base de datos optimizada y libre de duplicados." />

      <div style={{ display: "grid", gridTemplateColumns: "1fr 350px", gap: 24 }}>
        
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          <Tarjeta title="Duplicados Detectados" style={{ padding: 24 }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              {duplicados.length === 0 && (
                <div style={{ textAlign: "center", padding: 40, color: T.whiteDim }}>
                  <Ico k="check" size={48} style={{ color: T.green, opacity: 0.3, marginBottom: 16 }} />
                  <div>¡Gran trabajo! No se encontraron contactos duplicados.</div>
                </div>
              )}
              {duplicados.map((grp, i) => (
                <div key={i} style={{ padding: 20, background: T.bg2, borderRadius: 12, border: `1px solid ${T.borderHi}` }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                    <div>
                      <div style={{ fontWeight: 800, color: T.white }}>Grupo por: <span style={{ color: T.teal }}>{grp.key}</span></div>
                      <div style={{ fontSize: 12, color: T.whiteDim }}>{grp.matching.length} coincidencias encontradas</div>
                    </div>
                    <Btn onClick={() => fusionarContactos(grp.matching)} size="sm" variant="secundario">Fusionar Grupo</Btn>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {grp.matching.map(c => (
                      <div key={c.id} style={{ display: "flex", alignItems: "center", gap: 12, fontSize: 13, background: T.bg1, padding: "8px 12px", borderRadius: 8 }}>
                        <div style={{ fontWeight: 700, color: T.whiteOff, flex: 1 }}>{c.nombre}</div>
                        <div style={{ color: T.whiteDim, fontSize: 11 }}>ID: {c.id}</div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </Tarjeta>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          <Tarjeta title="Estado de Salud" style={{ padding: 20 }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: T.whiteDim, fontSize: 13 }}>Total Contactos</span>
                <span style={{ color: T.white, fontWeight: 700 }}>{db.contactos?.length || 0}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: T.whiteDim, fontSize: 13 }}>Sin Email</span>
                <span style={{ color: T.amber, fontWeight: 700 }}>{(db.contactos || []).filter(c => !c.email).length}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: T.whiteDim, fontSize: 13 }}>Sin Teléfono</span>
                <span style={{ color: T.red, fontWeight: 700 }}>{(db.contactos || []).filter(c => !c.telefono).length}</span>
              </div>
              <div style={{ height: 1, background: T.border, margin: "8px 0" }} />
              <div style={{ fontSize: 12, color: T.whiteDim, fontStyle: "italic", textAlign: "center" }}>
                "Una base de datos limpia convierte un 25% más".
              </div>
            </div>
          </Tarjeta>

          <Tarjeta title="Acciones Rápidas" style={{ padding: 20 }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <Btn variant="fantasma" full style={{ justifyContent: "flex-start", fontSize: 12 }}><Ico k="trash" size={14} /> Eliminar contactos sin actividad (+1 año)</Btn>
              <Btn variant="fantasma" full style={{ justifyContent: "flex-start", fontSize: 12 }}><Ico k="mail" size={14} /> Normalizar dominios de email</Btn>
            </div>
          </Tarjeta>
        </div>

      </div>
    </div>
  );
}
