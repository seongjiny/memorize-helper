// src\composables\useFontScale.ts
import { ref, watch } from 'vue'

const FONT_KEY = 'mh_font_px'
const FONT_STEPS = [15, 18, 22, 28, 36, 44, 52, 60] as const
type FontPx = (typeof FONT_STEPS)[number]

const readFontPx = (): FontPx => {
  const raw = localStorage.getItem(FONT_KEY)
  const n = raw ? Number(raw) : NaN
  return (FONT_STEPS as readonly number[]).includes(n) ? (n as FontPx) : 15
}

const fontPx = ref<FontPx>(readFontPx())
watch(fontPx, (v) => localStorage.setItem(FONT_KEY, String(v)), { immediate: true })

const incFont = () => {
  const idx = FONT_STEPS.indexOf(fontPx.value)
  fontPx.value = FONT_STEPS[Math.min(FONT_STEPS.length - 1, idx + 1)]
}
const decFont = () => {
  const idx = FONT_STEPS.indexOf(fontPx.value)
  fontPx.value = FONT_STEPS[Math.max(0, idx - 1)]
}

export function useFontScale() {
  return {
    fontPx,
    scale: () => String(fontPx.value / 15),
    incFont,
    decFont,
  }
}
