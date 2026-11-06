import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import basicSsl from '@vitejs/plugin-basic-ssl'

// https://vite.dev/config/
export default defineConfig(() => {
  const backendPort = process.env.VITE_BACKEND_PORT || '8050'
  const frontendPort = parseInt(process.env.VITE_PORT || '5175', 10)
  const target = `http://127.0.0.1:${backendPort}`

  return {
    plugins: [react(), basicSsl()],
    server: {
      host: true,
      port: frontendPort,
      strictPort: false,
      proxy: {
        '/api': { target, ws: true },
        '/ws': { target, ws: true },
        '/media': { target },
        '/audio': { target },
        '/qr.png': { target }
      }
    }
  }
})
