import type { ComponentPropsWithoutRef } from 'react'

import { type To, useShell } from './context.ts'

export function Go({ to, onClick, ...rest }: { to: To } & Omit<ComponentPropsWithoutRef<'a'>, 'href'>) {
  const { go } = useShell()

  return (
    <a
      href={to}
      {...rest}
      onClick={(e) => {
        onClick?.(e)

        if (e.defaultPrevented || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return

        e.preventDefault()
        void go(to)
      }}
    />
  )
}

export function Soon({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <span className={className ? `${className} is-soon` : 'is-soon'} aria-disabled="true">
      {children}
      <span className="soon mono">Soon</span>
    </span>
  )
}
