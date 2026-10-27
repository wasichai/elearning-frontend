import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { appName } from './config'
import './index.css'

// provisional: E6.2 monta aquí <WasichaiApp>
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <main className="flex h-screen items-center justify-center text-2xl font-semibold">{appName()}</main>
  </StrictMode>
)
