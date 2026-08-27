# 🎨 Guía de Diseño Premium ENSING

Para mantener la estética **ensign-glassmorphism** consistente, utiliza siempre los tokens del sistema y sigue estas reglas visuales.

## 1. Uso de Tokens de Tema (`T`)

Importa siempre `T` desde `../theme.js`. **NUNCA utilices colores en hexadecimal directo (hardcoded)**.

- `T.bg0`: Fondo maestro (Obsidian).
- `T.bg1`: Fondo de tarjetas/contenedores (Glass).
- `T.teal`: Color de acento principal.
- `T.grad`: Degradado característico de ENSING.

```javascript
import { T } from "../theme";

<div style={{ background: T.bg1, border: `1px solid ${T.borderHi}`, color: T.white }}>
  <span style={{ color: T.teal }}>Destacado</span>
</div>
```

## 2. Tipografía de Alto Impacto

Para valores monetarios o números críticos (como en el Lead Modal), usa:
- **Font Size:** `32px`
- **Weight:** `900`
- **Color:** `T.white` o `T.teal` para acentuar.

## 3. Efecto de Vidrio (Glassmorphism)

Para que las tarjetas se sientan "premium", usa bordes sutiles con `T.borderHi` y sombras suaves (o el componente `<Tarjeta />`).

## 4. Scrollbars de ENSING

Añade siempre este estilo a tus contenedores que tengan `overflowY: auto`:

```css
::-webkit-scrollbar { width: 5px; }
::-webkit-scrollbar-thumb { background: var(--borderHi); border-radius: 10px; }
::-webkit-scrollbar-thumb:hover { background: var(--teal); }
```

---
*El diseño es lo que separa a ENSING CRM de ser "otro Bitrix". Mantenlo limpio, oscuro y elegante.*
