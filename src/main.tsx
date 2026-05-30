import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import './index.css'
import App from './App.tsx'
import { AdminAuthProvider } from './auth/AdminAuthProvider.tsx'
import { initializeSentry, SentryErrorBoundary } from './lib/sentry.ts'

initializeSentry()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <SentryErrorBoundary fallback={<div className="app-fallback">MegaPromo charge une reprise sécurisée...</div>}>
      <BrowserRouter>
        <AdminAuthProvider>
          <App />
        </AdminAuthProvider>
      </BrowserRouter>
    </SentryErrorBoundary>
  </StrictMode>,
)
