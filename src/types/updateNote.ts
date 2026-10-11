export interface UpdateNoteItem {
  icon: string
  title: string
  description: string
}

export interface UpdateNote {
  id: string
  appVersion: string
  title: string
  introduction: string
  publishedAt: string
  items: UpdateNoteItem[]
}
