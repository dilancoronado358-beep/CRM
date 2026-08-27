import { T } from "./theme";

export default function AppMinimal() {
  console.error("🚀 [AppMinimal.jsx] Renderizando SIN SUPABASE!");

  return <div style={{ background: T.teal, color: T.white, height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>APP MINIMAL CARGADA CORRECTAMENTE (Sin Supabase)</div>;
}
