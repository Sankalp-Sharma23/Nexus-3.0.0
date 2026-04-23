// Import React and DOM rendering utilities
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
// Import routing provider for client-side navigation
import { BrowserRouter } from 'react-router-dom'
  // Import authentication context for managing user auth state
import { AuthProvider } from './contexts/AuthContext'
// Import toast notification provider for displaying messages
import { ToastProvider } from './components/Toast'
// Import global styles
import './styles/index.css'
// Import main App component
import App from './App.jsx'

// Create React root and render the entire application
// StrictMode: Development tool that highlights potential issues
// BrowserRouter: Enables routing throughout the app
// AuthProvider: Manages authentication state globally
// ToastProvider: Enables toast notifications globally
// App: Main application component
createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <ToastProvider>
          <App />
        </ToastProvider>
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>,
)