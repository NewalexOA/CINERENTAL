import { createRouter, createWebHistory } from 'vue-router'

const router = createRouter({
  history: createWebHistory('/vue/'), // Base path for the Vue3 app
  routes: [
    {
      path: '/',
      name: 'dashboard',
      component: () => import('../views/DashboardView.vue'),
    },
    {
      path: '/equipment',
      name: 'equipment-list',
      component: () => import('../views/EquipmentListView.vue'),
    },
    {
      path: '/equipment/:id',
      name: 'equipment-detail',
      component: () => import('../views/EquipmentDetailView.vue'),
      props: true,
    },
    {
      path: '/projects',
      name: 'projects-list',
      component: () => import('../views/ProjectsListView.vue'),
    },
    {
      path: '/projects/:id',
      name: 'project-detail',
      component: () => import('../views/ProjectDetailView.vue'),
      props: true,
    },
    {
      path: '/scanner',
      name: 'scanner',
      component: () => import('../views/ScannerView.vue'),
    },
    {
      path: '/clients',
      name: 'clients',
      component: () => import('../views/ClientsView.vue'),
    },
    {
      path: '/bookings',
      name: 'bookings',
      component: () => import('../views/BookingsView.vue'),
    },
  ],
})

export default router
