import React from 'react';
import { T } from '../theme';

export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    this.setState({ error, errorInfo });
    console.error("ErrorBoundary caught an error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: 20, background: '#7F1D1D', color: 'white', height: '100vh', width: '100vw', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
          <h1 style={{ fontSize: 24, marginBottom: 10 }}>Algo salió mal (React Error)</h1>
          <p style={{ marginBottom: 20 }}>Por favor toma una captura de pantalla de este error y envíala al soporte.</p>
          <div style={{ background: 'rgba(0,0,0,0.3)', padding: 16, borderRadius: 8, maxWidth: '90%', overflow: 'auto', textAlign: 'left', fontFamily: 'monospace', fontSize: 12 }}>
            <div style={{ fontWeight: 'bold', marginBottom: 8, color: '#FECACA' }}>{this.state.error && this.state.error.toString()}</div>
            <pre style={{ whiteSpace: 'pre-wrap', margin: 0 }}>{this.state.errorInfo && this.state.errorInfo.componentStack}</pre>
          </div>
          <button 
            onClick={() => window.location.reload()}
            style={{ marginTop: 24, padding: '10px 20px', background: 'white', color: '#7F1D1D', border: 'none', borderRadius: 6, fontWeight: 'bold', cursor: 'pointer' }}
          >
            Recargar Página
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
