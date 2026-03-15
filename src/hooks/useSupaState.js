import { useState, useEffect, useCallback } from "react";
import { createClient } from "@supabase/supabase-js";
import { SEMILLA } from "../data/seed";
import { applyTheme } from "../theme";

/* ═══════════════════════════════════════════
   SUPABASE
═══════════════════════════════════════════ */
const SUPA_URL = "https://eoylgxwlhsmwqgadahvk.supabase.co";
const SUPA_KEY = "sb_publishable_wKUbf7IFOoH4HIUayIAJdQ_Boj1jgZa";
export const sb = createClient(SUPA_URL, SUPA_KEY);

// Tablas que se sincronizan con Supabase
const TABLAS_SUPA = [
  "contactos",
  "empresas",
  "deals",
  "actividades",
  "tareas",
  "emails",
  "notas",
  "productos",
  "pipelines",
  "plantillasEmail",
  "usuariosApp",
  "documentos",
  "chatbotRules",
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
    } catch (e) {}
    return SEMILLA;
  });

  const [estadoSupa, setEstadoSupa] = useState("conectando");
  const [cargando, setCargando] = useState(true);
  const [isAppReady, setIsAppReady] = useState(false);
  const [session, setSession] = useState(null);

  const setDb = useCallback((next) => {
    setDbRaw((prev) => {
      const v = typeof next === "function" ? next(prev) : next;

      // Persistir sesión de usuario activo en localStorage
      if (v?.usuario) {
        try {
          localStorage.setItem("crm_usuario_activo", JSON.stringify(v.usuario));
          // Guardar tema por separado para que persista
          if (v.usuario.temaActivo) {
            localStorage.setItem("crm_theme", v.usuario.temaActivo);
          }
        } catch (e) {}
      }

      // ── Auto-sync: detectar cambios en tablas de Supabase ─────────────────
      TABLAS_SUPA.forEach((tabla) => {
        const anterior = prev[tabla];
        const nuevo = v[tabla];
        if (!Array.isArray(nuevo) || nuevo === anterior) return;

        // Upsert registros nuevos o modificados
        const mapaAnterior = new Map((anterior || []).map((r) => [r.id, JSON.stringify(r)]));
        const cambiados = nuevo.filter((r) => mapaAnterior.get(r.id) !== JSON.stringify(r));
        if (cambiados.length > 0) {
          sb.from(tabla).upsert(cambiados).then(({ error }) => {
            if (error) console.error(`❌ Sync upsert '${tabla}':`, error.message);
            else console.log(`☁️ Sync '${tabla}': ${cambiados.length} registro(s) guardado(s)`);
          });
        }

        // Eliminar registros borrados
        const idsNuevos = new Set(nuevo.map((r) => r.id));
        const eliminados = (anterior || []).filter((r) => !idsNuevos.has(r.id));
        eliminados.forEach((r) => {
          sb.from(tabla).delete().eq("id", r.id).then(({ error }) => {
            if (error) console.error(`❌ Sync delete '${tabla}':`, error.message);
            else console.log(`🗑️ Sync '${tabla}': registro ${r.id} eliminado`);
          });
        });
      });

      return v;
    });
  }, []);


  // ── Cargar todos los datos desde Supabase ──────────────────────────────────
  const cargarDeSupa = useCallback(async () => {
    try {
      setCargando(true);
      console.log("🔌 Conectando a Supabase...", SUPA_URL);
      const resultados = await Promise.all(
        TABLAS_SUPA.map((tabla) => sb.from(tabla).select("*"))
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

      // Si las tablas principales están vacías, sembrar datos iniciales
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
  // ── Auth + Carga inicial ───────────────────────────────────────────────────
  useEffect(() => {
    let montado = true;

    const iniciarApp = async () => {
      // 1. Obtener sesión actual
      const { data: { session } } = await sb.auth.getSession();
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
        const { data: uLocal } = await sb.from("usuariosApp").select("*").eq("email", session.user.email).maybeSingle();
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
              activo: uLocal.activo !== false,
            };
            return { ...d, usuario: { ...d.usuario, ...mapped } };
          });
        }
      }

      // 2. Cargar datos desde Supabase
      if (montado) {
        await cargarDeSupa();
      }

      // 3. Marcar la app como lista
      if (montado) {
        setIsAppReady(true);
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

    return () => {
      montado = false;
      subscription.unsubscribe();
    };
  }, [cargarDeSupa, setDb]);

  // ── CRUD helper: guardar en Supabase y actualizar estado local ────────────
  const guardarEnSupa = async (tabla, registro) => {
    try {
      const { error } = await sb.from(tabla).upsert(registro);
      if (error) {
        console.warn(`Error guardando en ${tabla}:`, error.message);
      } else {
        // Actualizar el estado local con el nuevo registro
        setDb((d) => {
          const lista = Array.isArray(d[tabla]) ? d[tabla] : [];
          const idx = lista.findIndex((r) => r.id === registro.id);
          const nueva = idx >= 0
            ? lista.map((r) => (r.id === registro.id ? { ...r, ...registro } : r))
            : [...lista, registro];
          return { ...d, [tabla]: nueva };
        });
      }
    } catch (e) {
      console.warn("Supabase no disponible:", e.message);
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

  return { db, setDb, session, estadoSupa, cargando, guardarEnSupa, eliminarDeSupa, recargar: cargarDeSupa };
}
