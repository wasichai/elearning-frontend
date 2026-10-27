import { WasichaiApp } from '@wasichai/core'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { createConfig } from './config'
import { modules } from './modules'
import './index.css'

// una sola app y un solo router: los de WasichaiApp (ADR-0005 del backend)
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <WasichaiApp config={createConfig()} modules={modules} />
  </StrictMode>
)
