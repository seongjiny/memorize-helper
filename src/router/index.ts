import { createRouter, createWebHistory } from 'vue-router'
import HomeView from '@/views/HomeView.vue'
import ScriptView from '@/views/ScriptView.vue'
import KakaoCallbackView from '@/views/KakaoCallbackView.vue'
import RecordsView from '@/views/RecordsView.vue'
import UpdateNotesView from '@/views/UpdateNotesView.vue'
import AchievementsView from '@/views/AchievementsView.vue'

const AdminView = () => import('@/views/AdminView.vue')

export default createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', name: 'home', component: HomeView },
    { path: '/script/:id', name: 'script', component: ScriptView, props: true },
    { path: '/records', name: 'records', component: RecordsView },
    { path: '/achievements', name: 'achievements', component: AchievementsView },
    { path: '/updates', name: 'updates', component: UpdateNotesView },
    { path: '/admin', name: 'admin', component: AdminView },
    { path: '/admin/users', name: 'admin-users', component: AdminView },
    { path: '/admin/users/:userId', name: 'admin-user', component: AdminView },
    { path: '/oauth/kakao/callback', name: 'kakao-callback', component: KakaoCallbackView },
    { path: '/:pathMatch(.*)*', redirect: '/' },
  ],
})
