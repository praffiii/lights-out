import type * as THREE from 'three'

const LABEL = /-label/

export const hideLabels = (scene: THREE.Object3D) => {
  const hidden: THREE.Object3D[] = []

  scene.traverse((o) => {
    if (LABEL.test(o.name) && o.visible) hidden.push(o)
  })

  for (const o of hidden) o.visible = false

  return () => {
    for (const o of hidden) o.visible = true
  }
}
