import { useState, useEffect, useRef } from "react";
import { T } from "../theme";
import { Ico, Btn } from "../components/ui";
import { sb } from "../hooks/useSupaState";
import { sileo as toast } from "../utils/sileo";

/**
 * FirmaPublica: El Portal de Legalidad (Pilar 2: Firma Digital)
 * Una vista minimalista y segura para que los clientes firmen contratos.
 */
export default function FirmaPublica({ token }) {
  const [doc, setDoc] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [signed, setSigned] = useState(false);
  const canvasRef = useRef(null);
  const [hasStroke, setHasStroke] = useState(false);

  useEffect(() => {
    cargarDocumento();
  }, [token]);

  const cargarDocumento = async () => {
    if (!token) return;
    setLoading(true);
    try {
      const { data, error } = await sb.from('documentos').select('*').eq('token_firma', token).single();
      if (error) throw error;
      setDoc(data);
      if (data.firmado) setSigned(true);
    } catch (e) {
      console.error(e);
      toast.error("Documento no encontrado o enlace expirado.");
    } finally {
      setLoading(false);
    }
  };

  // Lógica de Canvas para Firma
  useEffect(() => {
    if (!canvasRef.current || signed) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    let drawing = false;

    const getPos = (e) => {
      const rect = canvas.getBoundingClientRect();
      const clientX = e.touches ? e.touches[0].clientX : e.clientX;
      const clientY = e.touches ? e.touches[0].clientY : e.clientY;
      return { x: clientX - rect.left, y: clientY - rect.top };
    };

    const start = (e) => { drawing = true; draw(e); };
    const stop = () => { drawing = false; ctx.beginPath(); };
    const draw = (e) => {
      if (!drawing) return;
      setHasStroke(true);
      const { x, y } = getPos(e);
      ctx.lineWidth = 2;
      ctx.lineCap = 'round';
      ctx.strokeStyle = '#000';
      ctx.lineTo(x, y);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(x, y);
      e.preventDefault();
    };

    canvas.addEventListener('mousedown', start);
    canvas.addEventListener('mousemove', draw);
    canvas.addEventListener('mouseup', stop);
    canvas.addEventListener('touchstart', start);
    canvas.addEventListener('touchmove', draw, { passive: false });
    canvas.addEventListener('touchend', stop);

    return () => {
      canvas.removeEventListener('mousedown', start);
      canvas.removeEventListener('mousemove', draw);
      canvas.removeEventListener('mouseup', stop);
    };
  }, [loading, signed]);

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasStroke(false);
  };

  const handleSign = async () => {
    if (!hasStroke) return toast.error("Por favor, dibuja tu firma.");
    setSaving(true);
    try {
      const signatureData = canvasRef.current.toDataURL("image/png");
      const { error } = await sb.from('documentos')
        .update({ 
          firmado: true, 
          datos_firma: signatureData, 
          fecha_firma: new Date().toISOString() 
        })
        .eq('token_firma', token);
      
      if (error) throw error;
      setSigned(true);
      toast.success("¡Documento firmado correctamente!");
    } catch (e) {
      toast.error("Error al guardar la firma.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return (
    <div style={{ height: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#f8f9fa", color: "#333" }}>
       <Ico k="refresh" size={32} className="spin" />
    </div>
  );

  if (!doc) return (
    <div style={{ padding: 40, textAlign: "center", fontStyle: "italic" }}>Enlace de firma inválido o expirado.</div>
  );

  if (signed) return (
    <div style={{ minHeight: "100vh", background: "#f0fdf4", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 20 }}>
       <div style={{ width: 60, height: 60, background: "#22c55e", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 20 }}>
          <Ico k="check" size={32} style={{ color: "#fff" }} />
       </div>
       <h1 style={{ fontSize: 24, fontWeight: 800, color: "#166534", marginBottom: 10 }}>Documento Firmado</h1>
       <p style={{ color: "#166534", opacity: 0.8, textAlign: "center", maxWidth: 400 }}>Gracias por tu firma. El documento ha sido procesado legalmente y el equipo ha sido notificado.</p>
       {doc.datos_firma && (
         <div style={{ marginTop: 30, padding: 20, background: "#fff", borderRadius: 12, border: "1px solid #dcfce7", boxShadow: "0 4px 12px rgba(0,0,0,0.05)" }}>
            <div style={{ fontSize: 10, fontWeight: 800, color: "#aaa", marginBottom: 10 }}>TU FIRMA REGISTRADA:</div>
            <img src={doc.datos_firma} alt="Firma" style={{ maxWidth: 200, height: "auto" }} />
         </div>
       )}
    </div>
  );

  return (
    <div style={{ minHeight: "100vh", background: "#f8fafc", padding: "40px 20px" }}>
       <div style={{ maxWidth: 800, margin: "0 auto" }}>
          
          {/* Header */}
          <div style={{ textAlign: "center", marginBottom: 40 }}>
             <h1 style={{ fontSize: 28, fontWeight: 900, color: "#1e293b" }}>Portal de Firma Digital</h1>
             <p style={{ color: "#64748b", marginTop: 8 }}>Revisa el documento y firma en la parte inferior para completar el proceso.</p>
          </div>

          {/* Document Content */}
          <div style={{ 
            background: "#fff", borderRadius: 12, padding: "40px", border: "1px solid #e2e8f0", 
            boxShadow: "0 10px 15px -3px rgba(0,0,0,0.1)", marginBottom: 30, minHeight: 400 
          }}>
             <div style={{ fontSize: 20, fontWeight: 800, color: "#1e293b", marginBottom: 20, borderBottom: "2px solid #f1f5f9", pb: 15 }}>
                {doc.nombre}
             </div>
             <div style={{ fontSize: 14, lineHeight: 1.8, color: "#334155", whiteSpace: "pre-wrap" }}>
                {doc.cuerpo_contrato || "Cargando contenido del contrato..."}
             </div>
          </div>

          {/* Signature Pad */}
          <div style={{ background: "#fff", borderRadius: 12, padding: "30px", border: "1px solid #e2e8f0", boxShadow: "0 4px 6px -1px rgba(0,0,0,0.1)" }}>
             <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 15 }}>
                <span style={{ fontSize: 14, fontWeight: 700, color: "#1e293b" }}>TU FIRMA AQUÍ:</span>
                <button onClick={clearCanvas} style={{ background: "none", border: "none", color: "#ef4444", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>Borrar y Reintentar</button>
             </div>
             <div style={{ border: "2px dashed #cbd5e1", borderRadius: 12, overflow: "hidden", background: "#f1f5f9", touchAction: "none" }}>
                <canvas 
                   ref={canvasRef} 
                   width={Math.min(window.innerWidth - 80, 740)} 
                   height={200} 
                   style={{ display: "block", cursor: "crosshair" }} 
                />
             </div>
             <div style={{ marginTop: 24, textAlign: "center" }}>
                <Btn 
                  onClick={handleSign} 
                  disabled={saving || !hasStroke} 
                  variant="primario" 
                  style={{ width: "100%", padding: "16px", fontSize: 16, fontWeight: 800 }}
                >
                   {saving ? "PROCESANDO FIRMA..." : "FIRMAR CONTRATO AHORA"}
                </Btn>
                <p style={{ fontSize: 11, color: "#94a3b8", marginTop: 15 }}>
                   Al hacer clic en "Firmar Contrato Ahora", aceptas que esta es una firma digital legalmente válida y vinculante.
                </p>
             </div>
          </div>

       </div>
       <style>{`.spin { animation: spin 1s linear infinite; } @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
