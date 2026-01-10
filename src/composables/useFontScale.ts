// src/composables/useFontScale.ts
import { ref, computed, watch } from 'vue'

const FONT_KEY = 'mh_font_px'
const FONT_STEPS = [15, 18, 22, 28, 36, 44, 52, 60] as const
export type FontPx = (typeof FONT_STEPS)[number]

const DEFAULT_FONT: FontPx = 15

const isFontPx = (n: number): n is FontPx => (FONT_STEPS as readonly number[]).includes(n)

const readFontPx = (): FontPx => {
  const raw = localStorage.getItem(FONT_KEY)
  const n = raw ? Number(raw) : NaN
  return isFontPx(n) ? n : DEFAULT_FONT
}

const clampIndex = (i: number) => Math.max(0, Math.min(FONT_STEPS.length - 1, i))

const fontPx = ref<FontPx>(readFontPx())

watch(fontPx, (v) => localStorage.setItem(FONT_KEY, String(v)), { immediate: true })

const incFont = () => {
  const idx = FONT_STEPS.indexOf(fontPx.value)
  const next = FONT_STEPS[clampIndex(idx + 1)]
  fontPx.value = next
}

const decFont = () => {
  const idx = FONT_STEPS.indexOf(fontPx.value)
  const prev = FONT_STEPS[clampIndex(idx - 1)]
  fontPx.value = prev
}

export function useFontScale() {
  const scale = computed(() => String(fontPx.value / 15))
  return { fontPx, scale, incFont, decFont }
}
