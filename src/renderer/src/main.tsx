import React from 'react';
import ReactDOM from 'react-dom/client';
import { ThemeProvider } from './context/ThemeContext';
import { AppProvider } from './context/AppContext';
import { MainApp } from './App';
import './styles/variables.css';
import './styles/reset.css';
import './styles/typography.css';
import './styles/titlebar.css';
import './styles/tooltips.css';
import './styles/markdown.css';

console.log('[Renderer] Starting LLM HTML Bench renderer process...');
console.log('[Renderer] window.electronAPI available:', typeof window !== 'undefined' && !!window.electronAPI);

// Global Error Catchers in Renderer
window.addEventListener('error', (event) => {
  console.error('[Renderer Global Error]:', event.error || event.message, event.filename, event.lineno);
});

window.addEventListener('unhandledrejection', (event) => {
  console.error('[Renderer Unhandled Rejection]:', event.reason);
});

class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error: Error | null; errorInfo: React.ErrorInfo | null }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('[Renderer React ErrorBoundary caught an error]:', error, errorInfo);
    this.setState({ errorInfo });
  }

  render() {
    if (this.state.hasError) {
      return (
        <div
          style={{
            padding: '30px',
            backgroundColor: '#0f172a',
            color: '#f8fafc',
            fontFamily: 'system-ui, sans-serif',
            height: '100vh',
            boxSizing: 'border-box',
            overflowY: 'auto',
          }}
        >
          <h1 style={{ color: '#ef4444', fontSize: '20px', marginBottom: '12px' }}>
            Application Error Caught by ErrorBoundary
          </h1>
          <p style={{ fontSize: '13px', color: '#94a3b8', marginBottom: '16px' }}>
            {this.state.error?.message || 'An unexpected rendering error occurred.'}
          </p>
          <pre
            style={{
              padding: '16px',
              backgroundColor: '#1e293b',
              borderRadius: '6px',
              fontSize: '11px',
              fontFamily: 'monospace',
              color: '#fca5a5',
              overflowX: 'auto',
              whiteSpace: 'pre-wrap',
            }}
          >
            {this.state.error?.stack}
            {this.state.errorInfo?.componentStack}
          </pre>
          <button
            onClick={() => window.location.reload()}
            style={{
              marginTop: '16px',
              padding: '8px 16px',
              backgroundColor: '#3b82f6',
              color: '#ffffff',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontWeight: 600,
            }}
          >
            Reload Application
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

const rootElement = document.getElementById('root');
if (!rootElement) {
  console.error('[Renderer] Root DOM node #root not found in document!');
} else {
  console.log('[Renderer] Mounting React tree to #root...');
  ReactDOM.createRoot(rootElement).render(
    <React.StrictMode>
      <ErrorBoundary>
        <ThemeProvider>
          <AppProvider>
            <MainApp />
          </AppProvider>
        </ThemeProvider>
      </ErrorBoundary>
    </React.StrictMode>
  );
  console.log('[Renderer] React root rendered.');
}
