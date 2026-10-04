import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  // Relative asset paths so the build works under any sub-path (e.g. GitHub Pages)
  base: './',
  plugins: [react()],
  server: {
    proxy: {
      // Must come before /api/mtr to avoid prefix collision
      '/api/mtr-duration': {
        target: 'https://www.mtr.com.hk',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/mtr-duration/, '/share/customer/jp/api/HRRoutes'),
      },
      '/api/mtr': {
        target: 'https://rt.data.gov.hk',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/mtr/, '/v1/transport/mtr/getSchedule.php'),
      },
      '/api/citybus': {
        target: 'https://rt.data.gov.hk',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/citybus/, '/v2/transport/citybus'),
      },
      '/api/kmb': {
        target: 'https://data.etabus.gov.hk',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/kmb/, '/v1/transport/kmb'),
      },
      '/api/gmb': {
        target: 'https://data.etagmb.gov.hk',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/gmb/, ''),
      },
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: './src/setupTests.js',
  },
})
