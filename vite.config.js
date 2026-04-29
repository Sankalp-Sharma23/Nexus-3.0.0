import { defineConfig } from 'vite'  // helper provite typescript support 
                                     // and ide autocomplete for completion
import react from '@vitejs/plugin-react' // enable vit eto process jsx 
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      // Forward all /api/* requests to the Express backend
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
    },
  },
})
