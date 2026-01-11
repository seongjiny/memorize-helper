// src/data/database.ts
import type { ScriptIndex } from '@/types/script'

export const scriptIndex: ScriptIndex[] = [
  {
    id: 'sermon-on-the-mount',
    title: '산상수훈',
    description: '예수님의 하나님 나라 백성을 위한 핵심 가르침',
    meta: ['마태복음 5–7장', '개역개정'],
    source: '/scripts/sermon-on-the-mount-kk.json',
  },
  {
    id: 'sermon-on-the-mount-esv',
    title: 'The Sermon on the Mount',
    description: 'Jesus’ Core Teachings for the People of the Kingdom of God',
    meta: ['Matthew 5–7', 'ESV'],
    source: '/scripts/sermon-on-the-mount-esv.json',
  },
  {
    id: 'romans-8',
    title: '로마서 8장',
    description: '성령 안에서의 생명과 확신',
    meta: ['로마서 8장', '개역개정'],
    source: '/scripts/romans-8-kk.json',
  },
]

export const listScripts = () => {
  return scriptIndex
}

export const getIndexById = (id: string) => {
  return scriptIndex.find((s) => s.id === id)
}
