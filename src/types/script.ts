export interface ScriptIndex {
  id: string
  title: string
  description?: string
  meta?: string[]
  source: string // json 경로
}
export interface MemorizationScript {
  id: string
  title: string
  description?: string
  meta?: string[] // 번역본, 출처, 참고사항 등 자유 텍스트
  blocks: MemorizationBlock[]
}

export interface MemorizationBlock {
  id: number
  label?: string // "마태복음 5장", "팔복", "서론" 등 자유
  lines: string[] // 암송 최소 단위 (한 절, 한 문장, 한 행)
}
