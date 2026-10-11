import type { UpdateNote } from '@/types/updateNote'

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null
const isString = (value: unknown): value is string => typeof value === 'string'

export const parseUpdateNote = (value: unknown): UpdateNote => {
  if (
    !isObject(value) ||
    !isString(value.id) ||
    !/^[a-z0-9][a-z0-9-]*$/.test(value.id) ||
    !isString(value.app_version) ||
    !/^\d+\.\d+\.\d+$/.test(value.app_version) ||
    !isString(value.title) ||
    !value.title.trim() ||
    !isString(value.introduction) ||
    !isString(value.published_at) ||
    !Number.isFinite(Date.parse(value.published_at)) ||
    !Array.isArray(value.items) ||
    !value.items.length
  ) {
    throw new Error('업데이트 노트 형식을 확인해 주세요.')
  }
  const items = value.items.map((item: unknown) => {
    if (
      !isObject(item) ||
      !isString(item.icon) ||
      !isString(item.title) ||
      !item.title.trim() ||
      !isString(item.description)
    )
      throw new Error('업데이트 항목 형식을 확인해 주세요.')
    return { icon: item.icon, title: item.title, description: item.description }
  })
  return {
    id: value.id,
    appVersion: value.app_version,
    title: value.title,
    introduction: value.introduction,
    publishedAt: value.published_at,
    items,
  }
}

export const isCompatibleUpdate = (version: string, appVersion: string) => {
  const release = version.split('.').map(Number)
  const app = appVersion.split('.').map(Number)
  for (let index = 0; index < 3; index += 1) {
    if (release[index]! !== app[index]!) return release[index]! < app[index]!
  }
  return true
}

export const updateNoteStorageKey = (id: string) => `mh_hide_update_${id}`
