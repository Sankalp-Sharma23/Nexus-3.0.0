import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
// Import routing  for client-side navigation
import { BrowserRouter } from 'react-router-dom'
  // Import authentication for managing user auth state
import { AuthProvider } from './contexts/AuthContext'
// Import notification provider for displaying messages
import { ToastProvider } from './components/Toast'
import './styles/index.css'
import App from './App.jsx'

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