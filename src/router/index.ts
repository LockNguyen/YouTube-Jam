import { createRouter, createWebHistory } from 'vue-router'
import GuestView from '@/views/GuestView.vue'
import HostView from '@/views/HostView.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'guest',
      component: GuestView,
    },
    {
      path: '/host',
      name: 'host',
      component: HostView,
    },
  ],
})

export default router
