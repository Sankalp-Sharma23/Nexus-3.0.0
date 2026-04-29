import { Component } from 'react';

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    console.error('[ErrorBoundary] caught:', error, info?.componentStack);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
    window.location.href = '/';
  };

  render() {
    if (this.state.hasError) {
      return (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            background: '#09090b',
            color: '#e4e4e7',
            fontFamily: "'Inter', system-ui, sans-serif",
            padding: '2rem',
            textAlign: 'center',
            zIndex: 99999,
          }}
        >
          <h1
            style={{
              fontSize: '2rem',
              fontWeight: 700,
              background: 'linear-gradient(135deg, #8b5cf6, #a78bfa)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              marginBottom: '0.75rem',
            }}
          >
            Something went wrong
          </h1>
          <p style={{ color: '#a1a1aa', maxWidth: 420, marginBottom: '1.5rem' }}>
            An unexpected error occurred. Click below to return to the home page.
          </p>
          {import.meta.env.DEV && this.state.error && (
            <pre
              style={{
                background: 'rgba(139,92,246,0.08)',
                border: '1px solid rgba(139,92,246,0.2)',
                borderRadius: 8,
                padding: '1rem',
                maxWidth: 600,
                overflow: 'auto',
                fontSize: '0.8rem',
                color: '#f87171',
                marginBottom: '1.5rem',
                textAlign: 'left',
              }}
            >
              {this.state.error.toString()}
            </pre>
          )}
          <button
            onClick={this.handleReset}
            style={{
              background: 'linear-gradient(135deg, #8b5cf6, #6366f1)',
              color: '#fff',
              border: 'none',
              borderRadius: 12,
              padding: '0.75rem 2rem',
              fontSize: '0.95rem',
              fontWeight: 600,
              cursor: 'pointer',
              boxShadow: '0 0 24px rgba(139,92,246,0.3)',
              transition: 'transform 0.2s',
            }}
            onMouseEnter={e => (e.target.style.transform = 'translateY(-2px)')}
            onMouseLeave={e => (e.target.style.transform = 'translateY(0)')}
          >
            Return Home
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
