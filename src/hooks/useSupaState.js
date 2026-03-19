import { useState, useEffect, useCallback, useRef } from "react";
import { createClient } from "@supabase/supabase-js";
import { SEMILLA } from "../data/seed";
import { applyTheme } from "../theme";
import { sileo as toast } from "../utils/sileo";

/* ═══════════════════════════════════════════
   SUPABASE
═══════════════════════════════════════════ */
const SUPA_URL = "https://eoylgxwlhsmwqgadahvk.supabase.co";
const SUPA_KEY = "sb_publishable_wKUbf7IFOoH4HIUayIAJdQ_Boj1jgZa";
export const sb = createClient(SUPA_URL, SUPA_KEY);

// Tablas que se sincronizan con Supabase
const TABLAS_SUPA = [
  "contactos", "empresas", "deals", "actividades", "tareas", "emails", "notas",
  "usuario", "empresaConfigs", "usuariosApp", "productos",
  "pipelines", "plantillasEmail", "campos_personalizados", "automatizaciones",
  "whatsapp_automations", "whatsapp_messages", "finanzas_gastos", "finanzas_comisiones",
  "notificaciones", "auditoria", "api_settings", "webhook_subscriptions",
  "email_accounts", "landing_pages", "formularios_publicos", "organizacion"
];

/* ═══════════════════════════════════════════
   HOOK: ESTADO EXCLUSIVAMENTE SUPABASE
═══════════════════════════════════════════ */
export function useSupaState() {
  // Estado local inicializado con SEMILLA como fallback temporal mientras carga Supabase
  const [db, setDbRaw] = useState(() => {
    // Solo consultar localStorage para la sesión de usuario activo
    try {
      const raw = localStorage.getItem("crm_usuario_activo");
      // Restaurar tema guardado
      const savedTheme = localStorage.getItem("crm_theme") || "dark";
      applyTheme(savedTheme);
      if (raw) {
        const usuario = JSON.parse(raw);
        return { ...SEMILLA, usuario };
      }
    } catch (e) { }
    return SEMILLA;
  });

  const [estadoSupa, setEstadoSupa] = useState("conectando");
  const [cargando, setCargando] = useState(true);
  const [isAppReady, setIsAppReady] = useState(false);
  const [session, setSession] = useState(null);
  const channelRef = useRef(null);
  const [intentoCarga, setIntentoCarga] = useState(0); // Para forzar reintentos si falla algo crítico

  const setDb = useCallback((next) => {
    setDbRaw((prev) => {
      const v = typeof next === "function" ? next(prev) : next;

      // Persistir sesión de usuario activo en localStorage
      if (v?.usuario) {
        try {
          localStorage.setItem("crm_usuario_activo", JSON.stringify(v.usuario));
          // Guardar tema por separado para que persista
          if (v.usuario.tema) {
            localStorage.setItem("crm_theme", v.usuario.tema);
          }
        } catch (e) { }
      }

      // Auto-sync is disabled for safety. Use guardarEnSupa for modifications to Supabase.
      return v;
    });
  }, []);


  // ── Cargar todos los datos desde Supabase ──────────────────────────────────
  const cargarDeSupa = useCallback(async (orgIdForzado) => {
    try {
      setCargando(true);
      const oi = orgIdForzado || db.usuario?.org_id;
      console.log(`📡 [cargarDeSupa] Contexto: ${oi || "GLOBAL"} | Tablas: ${TABLAS_SUPA.length}`);

      const resultados = await Promise.all(
        TABLAS_SUPA.map((tabla) => {
          let q = sb.from(tabla).select("*");
          // Si estamos en un contexto de organización, filtrar tablas operativas
          if (oi && !["organizacion", "recordatorios"].includes(tabla)) {
            q = q.eq("org_id", oi);
            // FILTRO PERSONAL PARA EMAILS
            if (["emails", "email_accounts"].includes(tabla)) {
              q = q.eq("user_id", db.usuario?.id);
            }
          }
          return q;
        })
      );

      const nuevoEstado = {};
      TABLAS_SUPA.forEach((tabla, i) => {
        const { data, error } = resultados[i];
        if (error) {
          console.error(`❌ Error cargando tabla '${tabla}':`, error.message, error.code, error.hint);
        } else {
          console.log(`✅ Tabla '${tabla}': ${data?.length || 0} registros`);
          nuevoEstado[tabla] = data;
        }
      });

      // Si las tablas principales están vacías, NO sembramos automáticamente
      // para evitar que el arranque demore +10 segundos y sobrescriba el estado vacío del usuario.
      /*
      const necesitaSeed = !nuevoEstado.contactos?.length && !nuevoEstado.deals?.length;
      if (necesitaSeed) {
        console.log("Tablas vacías detectadas. Sembrando datos iniciales en Supabase...");
        await sembrarDatos();
        // Volver a cargar tras sembrar
        const segundaVuelta = await Promise.all(
          TABLAS_SUPA.map((tabla) => sb.from(tabla).select("*"))
        );
        TABLAS_SUPA.forEach((tabla, i) => {
          const { data, error } = segundaVuelta[i];
          if (!error && data && data.length > 0) {
            nuevoEstado[tabla] = data;
          }
        });
      }
      */

      // Aplicar datos de Supabase al estado (manteniendo usuario actual)
      setDb((d) => ({
        ...SEMILLA,
        ...nuevoEstado,
        usuario: d.usuario, // Conservar sesión activa
        empresaConfigs: d.empresaConfigs || SEMILLA.empresaConfigs,
        cuentaEmail: d.cuentaEmail || SEMILLA.cuentaEmail,
        recordatorios: d.recordatorios || SEMILLA.recordatorios,
      }));

      setEstadoSupa("conectado");
    } catch (e) {
      console.error("Error cargando de Supabase:", e.message);
      setEstadoSupa("error");
    } finally {
      setCargando(false);
    }
  }, [setDb]);

  // ── Sembrar datos iniciales de seed.js en Supabase ────────────────────────
  const sembrarDatos = async () => {
    const operaciones = [
      sb.from("contactos").upsert(SEMILLA.contactos || []),
      sb.from("empresas").upsert(SEMILLA.empresas || []),
      sb.from("deals").upsert(SEMILLA.deals || []),
      sb.from("actividades").upsert(SEMILLA.actividades || []),
      sb.from("tareas").upsert(SEMILLA.tareas || []),
      sb.from("emails").upsert(SEMILLA.emails || []),
      sb.from("notas").upsert(SEMILLA.notas || []),
      sb.from("productos").upsert(SEMILLA.productos || []),
      sb.from("pipelines").upsert(SEMILLA.pipelines || []),
      sb.from("usuariosApp").upsert(SEMILLA.usuariosApp || []),
      sb.from("documentos").upsert(SEMILLA.documentos || []),
    ];
    const resultados = await Promise.all(operaciones);
    resultados.forEach((r, i) => {
      if (r.error) console.warn(`Error sembrando tabla ${i}:`, r.error.message);
    });
    console.log("✅ Datos iniciales sembrados en Supabase correctamente.");
  };

  // ── Auth + Carga inicial ───────────────────────────────────────────────────
  useEffect(() => {
    let montado = true;

    const iniciarApp = async () => {
      // Temporizador estricto de seguridad: máximo 2.5 segundos de pantalla de carga
      const timeoutFallback = setTimeout(() => {
        if (montado) {
          console.warn("⚠️ Tiempo de carga excedido (5s). Forzando isAppReady a true.");
          setCargando(false);
          setIsAppReady(true);
        }
      }, 5000);

      try {
        let uLocal = null;
        // 1. Obtener sesión actual
        const { data: { session }, error: sessionError } = await sb.auth.getSession();
        if (sessionError) console.warn("Supabase auth error:", sessionError);
        if (!montado) return;
        setSession(session);

        if (session) {
          // Mostrar nombre provisional (evita usuario vacío temporalmente)
          setDb((d) => {
            const tempName = d.usuario?.name || session.user.user_metadata?.name || session.user.email;
            const tempAvatar = tempName.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase() || "U";
            return {
              ...d,
              usuario: {
                ...d.usuario,
                name: tempName,
                email: session.user.email,
                avatar: d.usuario?.avatar || tempAvatar,
                role: d.usuario?.role || session.user.user_metadata?.role || "user",
                activo: d.usuario?.activo !== false,
              }
            };
          });

          // Consultar directamente a Supabase para obtener datos reales
          const { data: userRow, error: fetchError } = await sb.from("usuariosApp").select("*").eq("email", session.user.email).maybeSingle();
          uLocal = userRow;
          if (fetchError) console.warn("Supabase user fetch error:", fetchError);
          if (uLocal && montado) {
            if (uLocal.temaActivo) {
              applyTheme(uLocal.temaActivo);
              localStorage.setItem("crm_theme", uLocal.temaActivo);
            }
            setDb((d) => {
              const mapped = {
                name: uLocal.name || session.user.user_metadata?.name || "Usuario",
                email: session.user.email,
                role: uLocal.role || "user",
                avatar: uLocal.avatar || "U",
                whatsappAccess: uLocal.whatsappAccess || false,
                profilePic: uLocal.profilePic || null,
                temaActivo: uLocal.temaActivo || null,
                waServerUrl: uLocal.waServerUrl || null,
                activo: uLocal.activo !== false,
                id: uLocal.id, // IMPORTANTE: Guardar el ID para poder actualizar el perfil
                org_id: uLocal.org_id || null, // Guardar org_id en el estado
              };
              return { ...d, usuario: { ...d.usuario, ...mapped } };
            });
          }
        }

        // 2. Cargar datos desde Supabase
        if (montado) {
          const targetOrg = uLocal?.org_id || db.usuario?.org_id;
          await cargarDeSupa(targetOrg);
        }
      } catch (err) {
        console.error("❌ Error en iniciarApp:", err);
      } finally {
        if (montado) {
          setIsAppReady(true);
          clearTimeout(timeoutFallback);
        }
      }
    };

    iniciarApp();

    const { data: { subscription } } = sb.auth.onAuthStateChange((_event, session) => {
      if (!montado) return;
      setSession(session);
      if (!session) {
        setDb((d) => {
          if (d.usuario && !localStorage.getItem("crm_usuario_activo")) return { ...d, usuario: null };
          return d;
        });
      }
    });

    // ── SUPABASE REALTIME SINC (Escuchar cambios en vivo) ──────────────────
    channelRef.current = sb
      .channel('schema-db-changes')
      .on('postgres_changes', { event: '*', schema: 'public' }, (payload) => {
        const { eventType, table, new: record, old } = payload;
        if (!TABLAS_SUPA.includes(table)) return;
        setDbRaw(prev => {
          const lista = Array.isArray(prev[table]) ? prev[table] : [];
          if (eventType === 'INSERT' || eventType === 'UPDATE') {
            // Guard: Ignorar si el registro no pertenece a la organización activa
            if (prev.usuario?.org_id && record.org_id && record.org_id !== prev.usuario.org_id) {
              return prev;
            }
            const idx = lista.findIndex(r => r.id === record.id);
            if (idx >= 0 && JSON.stringify(lista[idx]) === JSON.stringify(record)) return prev;
            const nuevaLista = idx >= 0
              ? lista.map(r => r.id === record.id ? record : r)
              : [record, ...lista];
            return { ...prev, [table]: nuevaLista };
          }
          if (eventType === 'DELETE') {
            if (!lista.find(r => r.id === old.id)) return prev;
            return { ...prev, [table]: lista.filter(r => r.id !== old.id) };
          }
          return prev;
        });
      })
      .on('broadcast', { event: 'force_logout' }, (data) => {
        // La estructura de Supabase Broadcast suele poner el objeto enviado dentro de .payload o directamente en data
        const payload = data.payload || data;
        console.log("🚨 Recibida señal de FORCE_LOGOUT:", payload);

        // EXTRA CRÍTICO: Verificar que el comando sea para ESTE usuario
        // de lo contrario, ¡cerraríamos la sesión de todo el mundo en el CRM!
        const miEmail = localStorage.getItem("crm_usuario_activo") ? JSON.parse(localStorage.getItem("crm_usuario_activo")).email : null;

        if (payload.email && miEmail && payload.email.toLowerCase() === miEmail.toLowerCase()) {
          console.warn("🔒 Cerrando sesión por comando global remoto...");
          localStorage.removeItem("crm_usuario_activo");
          localStorage.removeItem("crm_theme");
          sessionStorage.clear();
          // Desconectar explícitamente de Supabase Auth
          sb.auth.signOut().then(() => {
            window.location.reload();
          });
        }
      })
      .subscribe();

    return () => {
      montado = false;
      subscription.unsubscribe();
      if (channelRef.current) sb.removeChannel(channelRef.current);
    };
  }, [cargarDeSupa, setDb]);

  // ── CRUD helper: guardar en Supabase y actualizar estado local ────────────
  const guardarEnSupa = async (tabla, registro) => {
    try {
      console.log(`[SUPA] Intentando guardar en ${tabla}:`, registro);

      const payload = { ...registro };
      // Solo inyectar org_id si no es la tabla de organizaciones y no se pasó uno explícitamente
      if (db.usuario?.org_id && tabla !== "organizacion" && !payload.org_id) {
        payload.org_id = db.usuario.org_id;
      }
      if (tabla === "tareas" && !payload.creado) {
        payload.creado = new Date().toISOString();
      }

      const { data, error } = await sb.from(tabla).upsert(payload).select();

      if (error) {
        console.error(`🔴 Error en ${tabla}:`, error.message);
        toast.error(`No se pudo guardar en ${tabla}: ${error.message}`);
        return { data: null, error };
      } else {
        console.log(`🟢 Éxito en ${tabla}`);
        const confirmado = data?.[0] || payload;

        setDb((d) => {
          const lista = Array.isArray(d[tabla]) ? d[tabla] : [];
          const idx = lista.findIndex((r) => r.id === confirmado.id);
          const nueva = idx >= 0
            ? lista.map((r) => (r.id === confirmado.id ? { ...r, ...confirmado } : r))
            : [confirmado, ...lista];
          return { ...d, [tabla]: nueva };
        });
        return { data: confirmado, error: null };
      }
    } catch (e) {
      console.error(`❌ Fallo crítico guardarEnSupa (${tabla}):`, e);
      toast.error("Error de conexión con el servidor. Por favor, revisa tu internet.");
      return { data: null, error: e };
    }
  };

  const eliminarDeSupa = async (tabla, id) => {
    try {
      const { error } = await sb.from(tabla).delete().eq("id", id);
      if (error) {
        console.warn(`Error eliminando de ${tabla}:`, error.message);
      } else {
        setDb((d) => {
          const lista = Array.isArray(d[tabla]) ? d[tabla] : [];
          return { ...d, [tabla]: lista.filter((r) => r.id !== id) };
        });
      }
    } catch (e) {
      console.warn("Supabase no disponible:", e.message);
    }
  };

  const sendBroadcast = async (event, payload) => {
    if (channelRef.current) {
      return await channelRef.current.send({
        type: 'broadcast',
        event,
        payload
      });
    }
  };

  return { db, setDb, session, estadoSupa, cargando, isAppReady, guardarEnSupa, eliminarDeSupa, sendBroadcast, recargar: cargarDeSupa };
}
