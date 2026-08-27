import { useState, useMemo } from "react";
import { T } from "../theme";
import { Ico, Btn } from "../components/ui";

// Base de Conocimientos completa
const FAQ_DB = [
  {
    cat: "Primeros Pasos",
    icon: "play",
    q: "¿Cómo configuro mi perfil y mi equipo?",
    a: "Ve a 'Configuración' en el menú lateral izquierdo (icono de engranaje). Desde 'Equipo & Accesos' puedes invitar a tus colegas escribiendo su correo electrónico y asignándoles un rol (Admin o Agente)."
  },
  {
    cat: "Primeros Pasos",
    icon: "play",
    q: "¿Cómo importo mis clientes actuales?",
    a: "En el módulo 'Directorio Contactos', haz clic en el botón 'Importar CSV' en la esquina superior derecha. Asegúrate de que tu archivo tenga las columnas: Nombre, Email y Teléfono."
  },
  {
    cat: "Embudos y CRM",
    icon: "funnel",
    q: "¿Cómo muevo un Lead (Deal) de una etapa a otra?",
    a: "En el módulo 'Pipeline (Kanban)', simplemente haz clic sobre la tarjeta del contacto, mantén presionado y arrástralo (Drag & Drop) hacia la columna de la etapa deseada (ej. de 'Contacto Inicial' a 'Reunión Agendada')."
  },
  {
    cat: "Embudos y CRM",
    icon: "funnel",
    q: "¿Por qué un Deal aparece como 'Perdido'?",
    a: "Al editar un Deal (haciendo clic en la tarjeta), puedes cambiar el Estado a 'Ganado' (verde) o 'Perdido' (rojo). Si un Deal está perdido, desaparecerá del Pipeline principal para no estorbar, pero puedes verlo en los Filtros."
  },
  {
    cat: "Landing Pages & Formularios",
    icon: "layout",
    q: "¿Cómo edito mi Landing Page en Pantalla Completa?",
    a: "Entra a tu Landing Page. En la barra superior del editor verás un botón con una flecha (⬅) o (➡). Púlsalo para ocultar el panel izquierdo y ver el diseño en pantalla completa. Usa el clic derecho sobre los elementos para editarlos sin abrir el menú."
  },
  {
    cat: "Landing Pages & Formularios",
    icon: "layout",
    q: "¿Cómo funciona el Popup de Intención de Salida?",
    a: "Añade el bloque 'Popup de Salida' desde el menú lateral. Este popup permanecerá oculto para tus clientes hasta que intenten mover el ratón hacia la 'X' para cerrar la pestaña; en ese momento saltará automáticamente para ofrecerles un descuento o promoción."
  },
  {
    cat: "Landing Pages & Formularios",
    icon: "layout",
    q: "¿Cómo hago que una imagen o botón vaya 'Al Fondo'?",
    a: "Haz clic derecho sobre el elemento flotante en tu editor. Selecciona 'Fondo' en las opciones de capa. Si aún no se ve, asegúrate de que el bloque donde está puesto no tenga un color de fondo sólido que lo tape."
  },
  {
    cat: "Automatizaciones",
    icon: "var",
    q: "¿Cómo envío un correo automático cuando alguien llena mi formulario?",
    a: "1. Ve a 'Automatizaciones'.\n2. Crea un 'Nuevo Flow'.\n3. En el Disparador elige 'Nuevo Lead (Formulario)'.\n4. En la Acción elige 'Enviar Email' y selecciona tu plantilla.\n5. Asegúrate de activar el interruptor 'En vivo' arriba a la derecha."
  },
  {
    cat: "Automatizaciones",
    icon: "var",
    q: "¿Qué significa que un Workflow está pausado?",
    a: "Si el estado dice 'Pausado', la automatización no se ejecutará aunque ocurra el evento detonante (trigger). Siempre debes probar el flujo con 'Ejecutar Prueba' y luego cambiar el estado a 'En vivo' (botón verde) para que comience a trabajar por ti."
  },
  {
    cat: "Configuración",
    icon: "cog",
    q: "¿Cómo vinculo mi cuenta de WhatsApp?",
    a: "Ve a 'Configuración' -> 'Infraestructura' o 'API & Webhooks'. Genera un Token de conexión y escanéa el código QR con tu aplicación móvil de WhatsApp Business. Requiere plan PRO."
  }
];

export const Soporte = () => {
  const [search, setSearch] = useState("");
  const [activeCat, setActiveCat] = useState("Todos");
  const [openQ, setOpenQ] = useState(null);

  const categories = ["Todos", ...Array.from(new Set(FAQ_DB.map(i => i.cat)))];

  const filtered = useMemo(() => {
    return FAQ_DB.filter(i => {
      const matchCat = activeCat === "Todos" || i.cat === activeCat;
      const matchSearch = (i.q.toLowerCase() + i.a.toLowerCase()).includes(search.toLowerCase());
      return matchCat && matchSearch;
    });
  }, [search, activeCat]);

  return (
    <div style={{ padding: "40px", maxWidth: 1000, margin: "0 auto", color: T.white }}>
      {/* HEADER */}
      <div style={{ textAlign: "center", marginBottom: 40, animation: "fadeIn 0.5s ease" }}>
        <div style={{ width: 64, height: 64, borderRadius: 20, background: T.tealSoft, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px", color: T.teal }}>
          <Ico k="help-circle" size={32} />
        </div>
        <h1 style={{ fontSize: 32, fontWeight: 900, marginBottom: 8, letterSpacing: "-0.03em" }}>Asistente ENSING</h1>
        <p style={{ color: T.whiteDim, fontSize: 16 }}>¿En qué te puedo ayudar hoy? Busca manuales, trucos y soluciones rápidas.</p>
      </div>

      {/* SEARCH BAR */}
      <div style={{ position: "relative", marginBottom: 32 }}>
        <Ico k="search" size={20} style={{ position: "absolute", left: 16, top: 16, color: T.whiteDim }} />
        <input 
          type="text" 
          value={search} 
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Ej: ¿Cómo configuro el popup de salida?"
          style={{ width: "100%", padding: "16px 20px 16px 48px", borderRadius: 16, border: `1px solid ${T.borderHi}`, background: T.bg1, color: T.white, fontSize: 16, outline: "none", boxShadow: "0 10px 25px rgba(0,0,0,0.2)" }}
        />
      </div>

      {/* CATEGORIES */}
      <div style={{ display: "flex", gap: 8, overflowX: "auto", paddingBottom: 16, marginBottom: 16, scrollbarWidth: "none" }}>
        {categories.map(c => (
          <button 
            key={c}
            onClick={() => setActiveCat(c)}
            style={{ padding: "10px 20px", borderRadius: 24, border: `1px solid ${activeCat === c ? T.teal : T.borderHi}`, background: activeCat === c ? T.tealSoft : T.bg1, color: activeCat === c ? T.teal : T.whiteDim, fontSize: 14, fontWeight: 600, cursor: "pointer", whiteSpace: "nowrap", transition: "all 0.2s" }}
          >
            {c}
          </button>
        ))}
      </div>

      {/* RESULTS LIST */}
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {filtered.length === 0 ? (
          <div style={{ textAlign: "center", padding: 40, color: T.whiteDim, background: T.bg1, borderRadius: 16, border: `1px dashed ${T.borderHi}` }}>
            <Ico k="alert-circle" size={32} style={{ marginBottom: 12, opacity: 0.5 }} />
            <p>No encontré resultados para tu búsqueda.</p>
            <Btn variant="secundario" onClick={() => setSearch("")}>Limpiar Búsqueda</Btn>
          </div>
        ) : (
          filtered.map((item, idx) => {
            const isOpen = openQ === idx;
            return (
              <div key={idx} style={{ background: T.bg1, border: `1px solid ${T.borderHi}`, borderRadius: 12, overflow: "hidden", transition: "all 0.2s" }}>
                <div 
                  onClick={() => setOpenQ(isOpen ? null : idx)}
                  style={{ padding: "20px", display: "flex", gap: 16, cursor: "pointer", alignItems: "center" }}
                >
                  <div style={{ width: 40, height: 40, borderRadius: 10, background: T.bg2, display: "flex", alignItems: "center", justifyContent: "center", color: T.teal, flexShrink: 0 }}>
                    <Ico k={item.icon} size={20} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 11, color: T.teal, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 4 }}>{item.cat}</div>
                    <div style={{ fontSize: 16, fontWeight: 700, color: T.white }}>{item.q}</div>
                  </div>
                  <Ico k={isOpen ? "chevron-up" : "chevron-down"} size={20} style={{ color: T.whiteDim }} />
                </div>
                {isOpen && (
                  <div style={{ padding: "0 20px 20px 76px", color: T.whiteDim, fontSize: 15, lineHeight: 1.6, animation: "fadeIn 0.3s ease" }}>
                    {item.a.split('\n').map((line, i) => <span key={i}>{line}<br/></span>)}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* HUMAN SUPPORT */}
      <div style={{ marginTop: 40, padding: 32, background: "linear-gradient(135deg, rgba(16,185,129,0.1), rgba(5,150,105,0.1))", borderRadius: 24, border: `1px solid ${T.tealSoft}`, textAlign: "center" }}>
        <div style={{ width: 56, height: 56, borderRadius: "50%", background: T.teal, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px", color: T.white }}>
          <Ico k="message-circle" size={28} />
        </div>
        <h3 style={{ fontSize: 22, fontWeight: 800, color: T.white, marginBottom: 8, letterSpacing: "-0.02em" }}>¿Necesitas ayuda personalizada?</h3>
        <p style={{ color: T.whiteDim, fontSize: 15, marginBottom: 24, maxWidth: 400, marginInline: "auto" }}>Habla directamente con un experto de nuestro equipo de soporte a través de WhatsApp.</p>
        <a 
          href="https://wa.me/593969930639?text=Hola,%20necesito%20ayuda%20con%20el%20CRM%20ENSING"
          target="_blank"
          rel="noopener noreferrer"
          style={{ display: "inline-block", padding: "14px 28px", background: "#25D366", color: "#fff", borderRadius: 12, fontSize: 15, fontWeight: 700, textDecoration: "none", boxShadow: "0 8px 24px rgba(37, 211, 102, 0.3)" }}
        >
          Contactar por WhatsApp
        </a>
      </div>

      <style>{`@keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }`}</style>
    </div>
  );
};
