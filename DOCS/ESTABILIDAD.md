# 🛡️ Guía de Estabilidad (Safe-Rendering)

El núcleo de la estabilidad de ENSING CRM reside en la prevención proactiva de errores de renderizado. Aquí explicamos el patrón indispensable para mantener el sistema **100% libre de errores de "pantalla azul/negra"**.

## 1. Patrón Opcional Chaining (`?.`)

**REGLA DE ORO:** Nunca accedas a propiedades anidadas de la base de datos (`db`) sin usar `?.`.

❌ **Incorrecto:**
```javascript
const pipeline = db.pipelines.find(p => p.id === id); // Puede fallar si db.pipelines es null/undefined
const nombre = pipeline.nombre; // Puede fallar si find() no encontró nada
```

✅ **Correcto:**
```javascript
const pipeline = db.pipelines?.find(p => p.id === id); 
const nombre = pipeline?.nombre || "Sin nombre"; // Manejo seguro de fallback
```

## 2. Tipados de Datos (Ejemplo: Etiquetas)

Evita asumir que un campo siempre será del mismo tipo al cargar de Supabase. El campo `etiquetas` fue una fuente de errores crítica:

- Al editar: Es un String (`"tag1, tag2"`).
- Al guardar: Se convierte a Array (`["tag1", "tag2"]`).
- Al renderizar: Debe soportar AMBOS.

**Solución Implementada:**
```javascript
{Array.isArray(f.etiquetas) ? f.etiquetas.join(", ") : (f.etiquetas || "")}
```

## 3. Estados Iniciales Seguros

En `App.jsx` y `Pipeline.jsx`, los estados ahora se inicializan con verificaciones de `localStorage` y `optional chaining` para evitar que el componente renderice nulos en el primer ciclo de renderizado.

---
*Si el sistema muestra una pantalla vacía, revisa la consola (F12) y aplica 'Optional Chaining' al objeto que cause el error.*
