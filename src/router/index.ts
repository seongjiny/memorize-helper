import { createRouter, createWebHistory } from 'vue-router'
import HomeView from '@/views/HomeView.vue'
import ScriptView from '@/views/ScriptView.vue'
import KakaoCallbackView from '@/views/KakaoCallbackView.vue'
import RecordsView from '@/views/RecordsView.vue'
import UpdateNotesView from '@/views/UpdateNotesView.vue'

export default createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', name: 'home', component: HomeView },
    { path: '/script/:id', name: 'script', component: ScriptView, props: true },
    { path: '/records', name: 'records', component: RecordsView },
    { path: '/updates', name: 'updates', component: UpdateNotesView },
    { path: '/oauth/kakao/callback', name: 'kakao-callback', component: KakaoCallbackView },
    { path: '/:pathMatch(.*)*', redirect: '/' },
  ],
})
