import { createRootRoute, createRoute, createRouter, RouterProvider } from '@tanstack/react-router'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { Chapter } from './Chapter'
import { Home } from './Home'
import './index.css'
import { Shell } from './Shell'

// A refresh is a first visit: it starts at the top with the loader and intro, never flashing the old scroll position.
history.scrollRestoration = 'manual'

const rootRoute = createRootRoute({ component: Shell })
const routeTree = rootRoute.addChildren([
  createRoute({ getParentRoute: () => rootRoute, path: '/', component: Home }),
  createRoute({ getParentRoute: () => rootRoute, path: '/chapters/overtaking', component: Chapter }),
])
const router = createRouter({ routeTree })

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router
  }
}

const el = document.getElementById('root')
if (el)
  createRoot(el).render(
    <StrictMode>
      <RouterProvider router={router} />
    </StrictMode>,
  )
