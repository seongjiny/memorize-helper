import { shallowRef } from 'vue'

type ScriptRevealControls = {
  hideAll: () => void
  revealAll: () => void
  getRecordLabel: () => string
  openRecord: () => void
}

const controls = shallowRef<ScriptRevealControls | null>(null)

export function useScriptRevealControls() {
  const register = (nextControls: ScriptRevealControls) => {
    controls.value = nextControls
  }

  const unregister = () => {
    controls.value = null
  }

  return { controls, register, unregister }
}
