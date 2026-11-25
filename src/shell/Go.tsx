import type { ComponentPropsWithoutRef } from 'react'

import { type Dive, type To, useShell } from './context.ts'

export function Go({ to, dive, onClick, ...rest }: { to: To; dive?: () => Dive | undefined } & Omit<ComponentPropsWithoutRef<'a'>, 'href'>) {
  const { go } = useShell()

  return (
    <a
      href={to}
      {...rest}
      onClick={(e) => {
        onClick?.(e)

        if (e.defaultPrevented || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return

        e.preventDefault()
        void go(to, dive?.())
      }}
    />
  )
}
