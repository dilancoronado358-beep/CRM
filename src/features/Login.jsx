import React, { useState } from 'react';
import { T } from '../theme';
import { sb, useSupaState } from '../hooks/useSupaState';
import { Btn, Ico } from '../components/ui';

export function Login({ forceView }) {
  const { db, setDb } = useSupaState();
  const [view, setView] = useState(forceView || 'login'); // 'login' | 'recovery' | 'new-password'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleLogin = async (e) => {
    if (e) e.preventDefault();
    setCargando(true);
    setError('');
    setSuccess('');

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

  const handleRecovery = async (e) => {
    e.preventDefault();
    setCargando(true);
    setError('');
    setSuccess('');

    const { error } = await sb.auth.resetPasswordForEmail(email, {
      redirectTo: window.location.origin + window.location.pathname + '#/recovery-confirm',
    });

    if (error) {
      setError('Error al enviar el correo: ' + error.message);
    } else {
      setSuccess('¡Correo enviado! Revisa tu bandeja de entrada para restablecer tu contraseña.');
    }
    setCargando(false);
  };

  const handleUpdatePassword = async (e) => {
    e.preventDefault();
    setCargando(true);
    setError('');
    setSuccess('');

    const { error } = await sb.auth.updateUser({ password: newPassword });

    if (error) {
      setError('No se pudo actualizar: ' + error.message);
    } else {
      setSuccess('¡Contraseña actualizada con éxito! Ya puedes entrar.');
      setTimeout(() => setView('login'), 2000);
    }
    setCargando(false);
  };

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '100vh',
      background: '#F8FAFC',
      position: 'relative',
      overflow: 'hidden',
      fontFamily: 'Inter, system-ui, sans-serif'
    }}>
      {/* BACKGROUND ANIMATION - LIGHT MODE */}
      <div style={{
        position: 'absolute',
        inset: 0,
        background: 'radial-gradient(circle at 0% 0%, #E2E8F0 0%, transparent 50%), radial-gradient(circle at 100% 100%, #CFFAFE 0%, transparent 50%), radial-gradient(circle at 50% 50%, #F8FAFC 0%, #F1F5F9 100%)',
        zIndex: 0
      }} />

      {/* FLOATING BLOBS - SOFT COLORS */}
      <div className="blob" style={{ position: 'absolute', top: '10%', left: '15%', width: 300, height: 300, background: '#06B6D408', borderRadius: '50%', filter: 'blur(60px)', animation: 'float 20s infinite alternate' }} />
      <div className="blob" style={{ position: 'absolute', bottom: '15%', right: '10%', width: 400, height: 400, background: '#3B82F605', borderRadius: '50%', filter: 'blur(80px)', animation: 'float 25s infinite alternate-reverse' }} />

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
          box-shadow: 0 0 0 4px rgba(6, 182, 212, 0.08) !important;
          background: #FFF !important;
        }
        .login-card {
          animation: fadeInDown 0.6s cubic-bezier(0.16, 1, 0.3, 1);
        }
      `}</style>

      <div className="login-card" style={{
        background: 'rgba(255, 255, 255, 0.8)',
        backdropFilter: 'blur(20px) saturate(180%)',
        border: '1px solid rgba(255, 255, 255, 0.5)',
        borderRadius: 24,
        padding: '48px',
        width: '100%',
        maxWidth: 420,
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.08)',
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
              style={{ maxHeight: 110, width: 'auto' }}
            />
          </div>
          <h1 style={{ margin: 0, fontSize: 32, fontWeight: 800, letterSpacing: '0.1em', color: '#1E293B' }}>
            CRM
          </h1>
          <p style={{ margin: '10px 0 0', color: '#64748B', fontSize: 15, fontWeight: 500 }}>
            {view === 'login' ? 'Inicia sesión para continuar' : 'Recuperar contraseña'}
          </p>
        </div>

        {error && (
          <div style={{
            background: '#FEF2F2',
            border: '1px solid #FEE2E2',
            color: '#EF4444',
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

        {success && (
          <div style={{
            background: '#F0FDF4',
            border: '1px solid #DCFCE7',
            color: '#16A34A',
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
            <Ico k="check" size={16} /> {success}
          </div>
        )}

        {view === 'login' ? (
          <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <div>
              <label style={{ display: 'block', marginBottom: 8, fontSize: 12, fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Correo Electrónico</label>
              <div className="premium-input" style={{ position: 'relative', background: '#F1F5F9', border: '1px solid #E2E8F0', borderRadius: 12, transition: 'all 0.2s' }}>
                <div style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: '#94A3B8' }}>
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
                    color: '#1E293B',
                    outline: 'none',
                    fontSize: 15,
                    fontFamily: 'inherit'
                  }}
                />
              </div>
            </div>

            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <label style={{ fontSize: 12, fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Contraseña</label>
                <button
                  type="button"
                  onClick={() => setView('recovery')}
                  style={{ border: 'none', background: 'none', color: '#06B6D4', fontSize: 12, fontWeight: 600, cursor: 'pointer', padding: 0 }}
                >
                  ¿Olvidaste tu contraseña?
                </button>
              </div>
              <div className="premium-input" style={{ position: 'relative', background: '#F1F5F9', border: '1px solid #E2E8F0', borderRadius: 12, transition: 'all 0.2s' }}>
                <div style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: '#94A3B8' }}>
                  <Ico k="lock" size={18} />
                </div>
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  style={{
                    width: '100%',
                    padding: '14px 44px 14px 44px',
                    background: 'transparent',
                    border: 'none',
                    color: '#1E293B',
                    outline: 'none',
                    fontSize: 15,
                    fontFamily: 'inherit'
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{
                    position: 'absolute',
                    right: 12,
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    color: '#94A3B8',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    padding: 4
                  }}
                >
                  <Ico k={showPassword ? "eyeOff" : "eye"} size={18} />
                </button>
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
                boxShadow: '0 4px 15px rgba(6, 182, 212, 0.3)',
                transition: 'all 0.2s',
                position: 'relative',
                overflow: 'hidden'
              }}
              onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 6px 20px rgba(6, 182, 212, 0.4)'; }}
              onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 4px 15px rgba(6, 182, 212, 0.3)'; }}
              onMouseDown={e => e.currentTarget.style.transform = 'scale(0.98)'}
              onMouseUp={e => e.currentTarget.style.transform = 'scale(1)'}
            >
              {cargando ? 'Accediendo...' : 'Entrar al CRM'}
              <div style={{ position: 'absolute', top: 0, height: '100%', width: '50%', background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent)', animation: 'shine 3s infinite' }} />
            </button>
          </form>
        ) : view === 'recovery' ? (
          <form onSubmit={handleRecovery} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <div>
              <label style={{ display: 'block', marginBottom: 8, fontSize: 12, fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Correo Electrónico</label>
              <div className="premium-input" style={{ position: 'relative', background: '#F1F5F9', border: '1px solid #E2E8F0', borderRadius: 12, transition: 'all 0.2s' }}>
                <div style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: '#94A3B8' }}>
                  <Ico k="mail" size={18} />
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
                    color: '#1E293B',
                    outline: 'none',
                    fontSize: 15,
                    fontFamily: 'inherit'
                  }}
                />
              </div>
              <p style={{ marginTop: 8, fontSize: 12, color: '#64748B', lineHeight: 1.5 }}>
                Te enviaremos un correo con las instrucciones para restablecer tu cuenta.
              </p>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <button
                type="submit"
                disabled={cargando}
                style={{
                  width: '100%',
                  padding: '14px',
                  fontSize: 16,
                  fontWeight: 800,
                  color: '#FFF',
                  background: 'linear-gradient(135deg, #06B6D4 0%, #3B82F6 100%)',
                  border: 'none',
                  borderRadius: 12,
                  cursor: cargando ? 'not-allowed' : 'pointer',
                  boxShadow: '0 4px 15px rgba(6, 182, 212, 0.3)',
                  transition: 'all 0.2s'
                }}
              >
                {cargando ? 'Enviando...' : 'Enviar Instrucciones'}
              </button>

              <button
                type="button"
                onClick={() => { setView('login'); setError(''); setSuccess(''); }}
                style={{
                  width: '100%',
                  padding: '12px',
                  fontSize: 14,
                  fontWeight: 600,
                  color: '#64748B',
                  background: 'transparent',
                  border: '1px solid #E2E8F0',
                  borderRadius: 12,
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
                onMouseEnter={e => e.currentTarget.style.background = '#F8FAFC'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
              >
                Volver al inicio
              </button>
            </div>
          </form>
        ) : (
          <form onSubmit={handleUpdatePassword} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <div>
              <label style={{ display: 'block', marginBottom: 8, fontSize: 12, fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Nueva Contraseña</label>
              <div className="premium-input" style={{ position: 'relative', background: '#F1F5F9', border: '1px solid #E2E8F0', borderRadius: 12, transition: 'all 0.2s' }}>
                <div style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: '#94A3B8' }}>
                  <Ico k="lock" size={18} />
                </div>
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                  placeholder="Mínimo 6 caracteres"
                  style={{
                    width: '100%',
                    padding: '14px 44px 14px 44px',
                    background: 'transparent',
                    border: 'none',
                    color: '#1E293B',
                    outline: 'none',
                    fontSize: 15,
                    fontFamily: 'inherit'
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{
                    position: 'absolute',
                    right: 12,
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    color: '#94A3B8',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    padding: 4
                  }}
                >
                  <Ico k={showPassword ? "eyeOff" : "eye"} size={18} />
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={cargando}
              style={{
                width: '100%',
                padding: '14px',
                fontSize: 16,
                fontWeight: 800,
                color: '#FFF',
                background: 'linear-gradient(135deg, #06B6D4 0%, #3B82F6 100%)',
                border: 'none',
                borderRadius: 12,
                cursor: cargando ? 'not-allowed' : 'pointer',
                boxShadow: '0 4px 15px rgba(6, 182, 212, 0.3)',
                transition: 'all 0.2s'
              }}
            >
              {cargando ? 'Actualizando...' : 'Guardar Nueva Contraseña'}
            </button>
          </form>
        )}

        <div style={{ marginTop: 32, textAlign: 'center', fontSize: 13, color: '#94A3B8' }}>
          Platform Built for Growth &bull; CRM v2.0
        </div>
      </div>
    </div>
  );
}

