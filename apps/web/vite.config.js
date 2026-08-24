import { defineConfig } from 'vite'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [tailwindcss(), react()],
  define: {
    'process.env': {}
  },
  esbuild: {
    charset: 'ascii'
  },
  server: {
    host: true,
    port: 3000
  },
  preview: {
    host: true,
    port: 3000
  },
  build: {
    chunkSizeWarningLimit: 3500,
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom', 'react-router-dom', 'antd', '@ant-design/icons'],
        }
      }
    }
  }
})
