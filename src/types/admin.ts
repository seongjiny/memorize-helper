export type MonitoringEnvironment = 'dev' | 'prod'
export type AdminMember = {
  id: string
  name: string
  createdAt: string
  lastSignInAt: string | null
  status: 'active' | 'banned'
  recordCount: number
  lastRecordDate: string | null
}
export type AdminMemberDetail = AdminMember & {
  email: string | null
  isAdmin: boolean
  activeDays30: number
  recentActivity: { date: string; count: number }[]
}
export type AdminMembers = { total: number; page: number; pageSize: number; users: AdminMember[] }
export type AdminDashboard = {
  environment: MonitoringEnvironment
  days: number
  timezone: string
  collectedSince: string | null
  summary: {
    visits: number
    visitors: number
    pageViews: number
    totalUsers: number
    newUsers: number
    activeRecordUsers: number
    totalRecords: number
    periodRecords: number
  }
  daily: {
    date: string
    visits: number
    visitors: number
    pageViews: number
    recordCount: number
    recordUsers: number
  }[]
  pages: { page: string; pageViews: number; visitors: number }[]
}
