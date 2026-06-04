import { createRouter, createWebHistory } from 'vue-router'
import GuestView from '@/views/GuestView.vue'
import HostView from '@/views/HostView.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      redirect: '/rooms/default',
    },
    {
      path: '/host',
      redirect: '/rooms/default/host',
    },
    {
      path: '/rooms/:roomId',
      name: 'guest',
      component: GuestView,
      props: true,
    },
    {
      path: '/rooms/:roomId/host',
      name: 'host',
      component: HostView,
      props: true,
    },
  ],
})

export default router

