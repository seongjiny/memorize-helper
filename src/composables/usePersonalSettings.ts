import { ref, watch } from 'vue'

const DARK_MODE_KEY = 'mh_dark_mode'
const HIDE_SUBTITLES_KEY = 'mh_hide_subtitles'
const RESUME_FROM_LAST_KEY = 'mh_resume_from_last'

const readBoolean = (key: string) => localStorage.getItem(key) === '1'

const isDarkMode = ref(readBoolean(DARK_MODE_KEY))
const hideSubtitles = ref(readBoolean(HIDE_SUBTITLES_KEY))
const resumeFromLast = ref(readBoolean(RESUME_FROM_LAST_KEY))

watch(isDarkMode, (value) => localStorage.setItem(DARK_MODE_KEY, value ? '1' : '0'))
watch(hideSubtitles, (value) => localStorage.setItem(HIDE_SUBTITLES_KEY, value ? '1' : '0'))
watch(resumeFromLast, (value) => localStorage.setItem(RESUME_FROM_LAST_KEY, value ? '1' : '0'))

export function usePersonalSettings() {
  return { isDarkMode, hideSubtitles, resumeFromLast }
}
