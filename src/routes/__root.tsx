import { createRootRoute, HeadContent, Scripts } from '@tanstack/react-router'

import { Shell } from '#/shell/Shell.tsx'
import { THEME_SCRIPT } from '#/shell/theme.ts'
import siteCss from '#/styles/site.css?url'

const FONTS = 'https://fonts.googleapis.com/css2?family=Archivo:wdth,wght@62..125,100..900&family=Martian+Mono:wght@400;500&display=swap'

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: 'utf-8' },
      { name: 'viewport', content: 'width=device-width, initial-scale=1' },
      { title: 'Lights Out' },
      { name: 'description', content: 'An unofficial guide to Formula 1 for newcomers, following the 2026 season.' },
    ],
    links: [
      { rel: 'icon', href: '/favicon.svg', type: 'image/svg+xml' },
      { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
      { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossOrigin: 'anonymous' },
      { rel: 'stylesheet', href: FONTS },
      { rel: 'stylesheet', href: siteCss },
    ],
    scripts: [{ children: THEME_SCRIPT }],
  }),
  component: Shell,
  shellComponent: RootDocument,
})

function RootDocument({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <HeadContent />
        <noscript>
          <style>{'.loader{display:none}'}</style>
        </noscript>
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  )
}
