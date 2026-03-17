import React, { useState } from 'react';
import { T } from '../theme';
import { sb, useSupaState } from '../hooks/useSupaState';
import { Btn, Ico } from '../components/ui';

export function Login() {
  const { db, setDb } = useSupaState();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async (e) => {
    e.preventDefault();
    setCargando(true);
    setError('');

    const { error } = await sb.auth.signInWithPassword({
      email,
      password,
    });

    if (!error) {
      sessionStorage.setItem("just_logged_in", "true");
      window.location.reload();
      return;
    }

    if (error) {
      const locUser = db.usuariosApp?.find(u => u.email === email && (u.password === password || (!u.password && password === "admin123")));
      if (locUser) {
        if (!locUser.activo) {
          setError('Tu cuenta local ha sido suspendida/revocada.');
        } else {
          setDb(d => ({ ...d, usuario: { name: locUser.name, email: locUser.email, role: locUser.role, avatar: locUser.name.charAt(0) } }));
          setTimeout(() => window.location.reload(), 100);
          return;
        }
      } else {
        setError('Credenciales incorrectas o problema de conexión.');
      }
    }
    setCargando(false);
  };

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '100vh',
      background: '#0F172A',
      position: 'relative',
      overflow: 'hidden',
      fontFamily: 'Inter, system-ui, sans-serif'
    }}>
      {/* BACKGROUND ANIMATION */}
      <div style={{
        position: 'absolute',
        inset: 0,
        background: 'radial-gradient(circle at 0% 0%, #1E293B 0%, transparent 50%), radial-gradient(circle at 100% 100%, #06B6D422 0%, transparent 50%), radial-gradient(circle at 50% 50%, #0F172A 0%, #020617 100%)',
        zIndex: 0
      }} />
      
      {/* FLOATING BLOBS */}
      <div className="blob" style={{ position: 'absolute', top: '10%', left: '15%', width: 300, height: 300, background: '#06B6D411', borderRadius: '50%', filter: 'blur(60px)', animation: 'float 20s infinite alternate' }} />
      <div className="blob" style={{ position: 'absolute', bottom: '15%', right: '10%', width: 400, height: 400, background: '#3B82F608', borderRadius: '50%', filter: 'blur(80px)', animation: 'float 25s infinite alternate-reverse' }} />

      <style>{`
        @keyframes float {
          from { transform: translate(0, 0) scale(1); }
          to { transform: translate(100px, 50px) scale(1.1); }
        }
        @keyframes fadeInDown {
          from { opacity: 0; transform: translateY(-20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes shine {
          0% { left: -100%; }
          20% { left: 100%; }
          100% { left: 100%; }
        }
        .premium-input:focus-within {
          border-color: #06B6D4 !important;
          box-shadow: 0 0 0 4px rgba(6, 182, 212, 0.1) !important;
        }
        .login-card {
          animation: fadeInDown 0.6s cubic-bezier(0.16, 1, 0.3, 1);
        }
      `}</style>

      <div className="login-card" style={{
        background: 'rgba(30, 41, 59, 0.5)',
        backdropFilter: 'blur(20px) saturate(180%)',
        border: '1px solid rgba(255, 255, 255, 0.08)',
        borderRadius: 24,
        padding: '48px',
        width: '100%',
        maxWidth: 420,
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
        zIndex: 1,
        position: 'relative'
      }}>
        <div style={{ textAlign: 'center', marginBottom: 40 }}>
          <div style={{ 
            display: 'inline-flex', 
            alignItems: 'center', 
            justifyContent: 'center', 
            width: '100%',
            marginBottom: 20
          }}>
            <img 
              src="https://res.cloudinary.com/dtmqftcsr/image/upload/v1772584406/ENSIG_PRINCIPAL_BALCK-artguru_yitvru.png" 
              alt="Logo" 
              style={{ maxHeight: 80, width: 'auto', filter: 'drop-shadow(0 0 10px rgba(6, 182, 212, 0.4))' }} 
            />
          </div>
          <h1 style={{ margin: 0, fontSize: 32, fontWeight: 800, letterSpacing: '0.1em', color: '#06B6D4' }}>
            CRM
          </h1>
          <p style={{ margin: '10px 0 0', color: 'rgba(255,255,255,0.6)', fontSize: 15, fontWeight: 500 }}>
            Bienvenido de nuevo
          </p>
        </div>

        {error && (
          <div style={{
            background: 'rgba(239, 68, 68, 0.1)',
            border: '1px solid rgba(239, 68, 68, 0.2)',
            color: '#F87171',
            padding: '14px',
            borderRadius: 12,
            marginBottom: 24,
            fontSize: 13,
            fontWeight: 600,
            textAlign: 'center',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            justifyContent: 'center'
          }}>
            <Ico k="x" size={16} /> {error}
          </div>
        )}

        <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div>
            <label style={{ display: 'block', marginBottom: 8, fontSize: 13, fontWeight: 700, color: 'rgba(255,255,255,0.8)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Correo Electrónico</label>
            <div className="premium-input" style={{ position: 'relative', background: 'rgba(15, 23, 42, 0.5)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12, transition: 'all 0.2s' }}>
              <div style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'rgba(255,255,255,0.4)' }}>
                <Ico k="user" size={18} />
              </div>
              <input
                type="email"
                required
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="nombre@ejemplo.com"
                style={{
                  width: '100%',
                  padding: '14px 16px 14px 44px',
                  background: 'transparent',
                  border: 'none',
                  color: '#FFF',
                  outline: 'none',
                  fontSize: 15,
                  fontFamily: 'inherit'
                }}
              />
            </div>
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: 8, fontSize: 13, fontWeight: 700, color: 'rgba(255,255,255,0.8)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Contraseña</label>
            <div className="premium-input" style={{ position: 'relative', background: 'rgba(15, 23, 42, 0.5)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12, transition: 'all 0.2s' }}>
              <div style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'rgba(255,255,255,0.4)' }}>
                <Ico k="lock" size={18} />
              </div>
              <input
                type="password"
                required
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                style={{
                  width: '100%',
                  padding: '14px 16px 14px 44px',
                  background: 'transparent',
                  border: 'none',
                  color: '#FFF',
                  outline: 'none',
                  fontSize: 15,
                  fontFamily: 'inherit'
                }}
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={cargando}
            style={{ 
              width: '100%', 
              marginTop: 12, 
              padding: '14px', 
              fontSize: 16, 
              fontWeight: 800, 
              color: '#FFF', 
              background: 'linear-gradient(135deg, #06B6D4 0%, #3B82F6 100%)',
              border: 'none',
              borderRadius: 12,
              cursor: cargando ? 'not-allowed' : 'pointer',
              boxShadow: '0 4px 15px rgba(6, 182, 212, 0.4)',
              transition: 'all 0.2s',
              position: 'relative',
              overflow: 'hidden'
            }}
            onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 6px 20px rgba(6, 182, 212, 0.5)'; }}
            onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 4px 15px rgba(6, 182, 212, 0.4)'; }}
            onMouseDown={e => e.currentTarget.style.transform = 'scale(0.98)'}
            onMouseUp={e => e.currentTarget.style.transform = 'scale(1)'}
          >
            {cargando ? 'Accediendo...' : 'Entrar al CRM'}
            <div style={{ position: 'absolute', top: 0, height: '100%', width: '50%', background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent)', animation: 'shine 3s infinite' }} />
          </button>
        </form>

        <div style={{ marginTop: 32, textAlign: 'center', fontSize: 13, color: 'rgba(255,255,255,0.4)' }}>
          ENSING CRM v2.0 &bull; Platform Built for Growth
        </div>
      </div>
    </div>
  );
}

