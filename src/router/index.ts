import { createRouter, createWebHistory } from 'vue-router'
import HomeView from '@/views/HomeView.vue'
import ScriptView from '@/views/ScriptView.vue'

export default createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', name: 'home', component: HomeView },
    { path: '/script/:id', name: 'script', component: ScriptView, props: true },
    { path: '/:pathMatch(.*)*', redirect: '/' },
  ],
})
