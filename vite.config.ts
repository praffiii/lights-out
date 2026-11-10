import { cloudflare } from '@cloudflare/vite-plugin'
import { tanstackStart } from '@tanstack/react-start/plugin/vite'
import viteReact from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

export default defineConfig({
  resolve: { tsconfigPaths: true },
  plugins: [
    cloudflare({ viteEnvironment: { name: 'ssr' } }),
    tanstackStart({
      pages: [{ path: '/weekend' }, ...['interlagos', 'vegas', 'losail', 'yas_marina', 'albert_park'].map((id) => ({ path: `/lap/${id}` }))],
      prerender: {
        enabled: true,
        crawlLinks: true,
        filter: ({ path }) => !path.startsWith('/api/'),
      },
    }),
    viteReact(),
  ],
})
