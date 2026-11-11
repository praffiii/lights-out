export const MODELLED = ['interlagos', 'vegas', 'losail', 'yas_marina', 'albert_park'] as const

export type ModelledId = (typeof MODELLED)[number]

const ids = new Set<string>(MODELLED)

export const isModelled = (id: string) => ids.has(id)
