import { useState, useEffect, useCallback } from "react";
import { createClient } from "@supabase/supabase-js";
import { SEMILLA } from "../data/seed";

/* ═══════════════════════════════════════════
   SUPABASE
═══════════════════════════════════════════ */
const SUPA_URL = "https://eoylgxwlhsmwqgadahvk.supabase.co";
const SUPA_KEY = "sb_publishable_wKUbf7IFOoH4HIUayIAJdQ_Boj1jgZa";
export const sb = createClient(SUPA_URL, SUPA_KEY);

/* ═══════════════════════════════════════════
   HOOK: ESTADO CON SUPABASE + localStorage
═══════════════════════════════════════════ */
export function useSupaState() {
  const [db, setDbRaw] = useState(() => {
    try {
      const raw = localStorage.getItem("crm_nexus_v4");
      if (raw) {
        const p = JSON.parse(raw);
        return {
          ...SEMILLA, ...p,
          cuentaEmail: p.cuentaEmail || SEMILLA.cuentaEmail,
          plantillasEmail: (p.plantillasEmail && p.plantillasEmail.length > 0) ? p.plantillasEmail : SEMILLA.plantillasEmail,
        };
      }
    } catch (e) { }
    return SEMILLA;
  });
  const [estadoSupa, setEstadoSupa] = useState("conectando");
  const [cargando, setCargando] = useState(false);
  const [session, setSession] = useState(null);

  const setDb = useCallback((next) => {
    setDbRaw(prev => {
      const v = typeof next === "function" ? next(prev) : next;
      try { localStorage.setItem("crm_nexus_v4", JSON.stringify(v)); } catch (e) { }
      return v;
    });
  }, []);

  // Verificar conexión Supabase al inicio y Auth
  useEffect(() => {
    const verificar = async () => {
      try {
        const { error } = await sb.from("contactos").select("id").limit(1);
        if (error) {
          if (error.code === "42P01") {
            setEstadoSupa("conectado");
          } else {
            setEstadoSupa("error");
          }
        } else {
          setEstadoSupa("conectado");
          await cargarDeSupa();
        }
      } catch (e) {
        setEstadoSupa("error");
      }
    };
    verificar();

    // Setup Auth Listener
    sb.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) {
        setDb(d => {
          const uLocal = (d.usuariosApp || SEMILLA.usuariosApp).find(x => x.email === session.user.email);
          const mapped = {
            name: uLocal?.name || session.user.user_metadata?.name || 'Usuario',
            email: session.user.email,
            role: uLocal?.role || session.user.user_metadata?.role || 'user',
            avatar: uLocal?.avatar || 'U',
            whatsappAccess: uLocal?.whatsappAccess || false,
            activo: uLocal?.activo !== false
          };
          return { ...d, usuario: { ...d.usuario, ...mapped } };
        });
      }
    });

    const { data: { subscription } } = sb.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) {
        setDb(d => {
          const uLocal = (d.usuariosApp || SEMILLA.usuariosApp).find(x => x.email === session.user.email);
          const mapped = {
            name: uLocal?.name || session.user.user_metadata?.name || 'Usuario',
            email: session.user.email,
            role: uLocal?.role || session.user.user_metadata?.role || 'user',
            avatar: uLocal?.avatar || 'U',
            whatsappAccess: uLocal?.whatsappAccess || false,
            activo: uLocal?.activo !== false
          };
          return { ...d, usuario: { ...d.usuario, ...mapped } };
        });
      } else {
        // En lugar de borrar destructivamente siempre, verificamos si existe un usuario inyectado localmente.
        // Si el usuario presionó logout (limpio localStorage), o si simplemente falló la validación
        setDb(d => {
          if (d.usuario && !localStorage.getItem("crm_nexus_v4")) return { ...d, usuario: null };
          // Si d.usuario existe, es nuestra sesión fallback. Solo lo borramos explícitamente en el App.jsx logout.
          return d;
        });
      }
    });

    return () => subscription.unsubscribe();
  }, [setDb]); // eslint-disable-line

  const cargarDeSupa = async () => {
    try {
      const [rC, rE, rD, rA, rT, rEm] = await Promise.all([
        sb.from("contactos").select("*"),
        sb.from("empresas").select("*"),
        sb.from("deals").select("*"),
        sb.from("actividades").select("*"),
        sb.from("tareas").select("*"),
        sb.from("emails").select("*"),
      ]);
      const actualizar = {};
      if (rC.data?.length) actualizar.contactos = rC.data;
      if (rE.data?.length) actualizar.empresas = rE.data;
      if (rD.data?.length) actualizar.deals = rD.data;
      if (rA.data?.length) actualizar.actividades = rA.data;
      if (rT.data?.length) actualizar.tareas = rT.data;
      if (rEm.data?.length) actualizar.emails = rEm.data;
      if (Object.keys(actualizar).length > 0) {
        setDb(d => ({ ...d, ...actualizar }));
      }
    } catch (e) { console.log("No se pudo cargar de Supabase:", e.message); }
  };

  const guardarEnSupa = async (tabla, registro) => {
    try {
      const { error } = await sb.from(tabla).upsert(registro);
      if (error) console.log(`Error guardando en ${tabla}:`, error.message);
    } catch (e) { console.log("Supabase no disponible, guardado local."); }
  };

  const eliminarDeSupa = async (tabla, id) => {
    try {
      await sb.from(tabla).delete().eq("id", id);
    } catch (e) { console.log("Supabase no disponible."); }
  };

  return { db, setDb, session, estadoSupa, cargando, guardarEnSupa, eliminarDeSupa };
}
