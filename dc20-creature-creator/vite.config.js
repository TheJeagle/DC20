import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      html2canvas: 'html2canvas/dist/html2canvas.esm.js',
      jspdf: 'jspdf/dist/jspdf.es.min.js',
    },
  },
})
