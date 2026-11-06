import React from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('🚨 [ErrorBoundary] Error capturado en panel:', error, errorInfo);
    this.setState({ errorInfo });
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          background: 'linear-gradient(145deg, rgba(30, 10, 15, 0.95), rgba(15, 23, 42, 0.98))',
          border: '1.5px solid #ef4444',
          borderRadius: '16px',
          padding: '24px',
          margin: '16px',
          color: '#f8fafc',
          boxShadow: '0 8px 32px rgba(239, 68, 68, 0.25)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          textAlign: 'center',
          gap: '14px',
          fontFamily: 'Inter, system-ui, sans-serif'
        }}>
          <div style={{
            width: '52px',
            height: '52px',
            borderRadius: '50%',
            background: 'rgba(239, 68, 68, 0.2)',
            border: '2px solid #ef4444',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '1.6rem'
          }}>
            <AlertTriangle size={28} color="#ef4444" />
          </div>

          <div>
            <h3 style={{ margin: '0 0 6px 0', fontSize: '1.15rem', color: '#f87171', fontWeight: 900 }}>
              Error al renderizar el módulo ({this.props.name || 'Componente'})
            </h3>
            <p style={{ margin: 0, fontSize: '0.82rem', color: '#94a3b8', maxWidth: '500px' }}>
              Se ha evitado que la pantalla se ponga en negro. Puedes reintentar la carga del módulo de inmediato.
            </p>
          </div>

          {this.state.error && (
            <div style={{
              background: 'rgba(0, 0, 0, 0.5)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: '8px',
              padding: '10px 14px',
              fontSize: '0.74rem',
              color: '#fca5a5',
              fontFamily: 'monospace',
              maxWidth: '650px',
              overflowX: 'auto',
              textAlign: 'left'
            }}>
              {this.state.error.toString()}
            </div>
          )}

          <button
            type="button"
            onClick={this.handleRetry}
            style={{
              background: 'linear-gradient(135deg, #ef4444, #b91c1c)',
              border: 'none',
              borderRadius: '10px',
              padding: '10px 20px',
              color: '#fff',
              fontWeight: 800,
              fontSize: '0.84rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              boxShadow: '0 0 16px rgba(239, 68, 68, 0.4)',
              transition: 'all 0.2s ease'
            }}
          >
            <RefreshCw size={16} />
            <span>Recargar Módulo</span>
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
