import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { setupPwa } from './pwa/register'
import { runMigrations } from './db/migrations'

async function bootstrap() {
  try {
    await runMigrations()
  } catch (e) {
    console.error('[bootstrap] migration failed', e)
  }
  await setupPwa()
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <App />
    </StrictMode>,
  )
}

bootstrap()
