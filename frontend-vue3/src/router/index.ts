import { createRouter, createWebHistory } from 'vue-router'

/**
 * Enhanced router with chunk-based lazy loading and performance tracking
 */
const router = createRouter({
  history: createWebHistory('/'), // Base path for the Vue3 app in development
  routes: [
    {
      path: '/',
      name: 'dashboard',
      component: () => import(/* webpackChunkName: "dashboard" */ '../views/DashboardView.vue'),
      meta: {
        title: 'Dashboard',
        preload: true, // Preload this route
      }
    },
    {
      path: '/equipment',
      name: 'equipment-list',
      component: () => import(/* webpackChunkName: "equipment" */ '../views/EquipmentListView.vue'),
      meta: {
        title: 'Equipment List',
        chunk: 'equipment',
      }
    },
    {
      path: '/equipment/:id',
      name: 'equipment-detail',
      component: () => import(/* webpackChunkName: "equipment" */ '../views/EquipmentDetailView.vue'),
      props: true,
      meta: {
        title: 'Equipment Details',
        chunk: 'equipment',
      }
    },
    {
      path: '/projects',
      name: 'projects-list',
      component: () => import(/* webpackChunkName: "projects" */ '../views/ProjectsView.vue'),
      meta: {
        title: 'Projects',
        chunk: 'projects',
      }
    },
    {
      path: '/projects/:id',
      name: 'project-detail',
      component: () => import(/* webpackChunkName: "projects" */ '../views/ProjectDetailView.vue'),
      props: true,
      meta: {
        title: 'Project Details',
        chunk: 'projects',
      }
    },
    {
      path: '/scanner',
      name: 'scanner',
      component: () => import(/* webpackChunkName: "scanner" */ '../views/ScannerView.vue'),
      meta: {
        title: 'Barcode Scanner',
        chunk: 'scanner',
      }
    },
    {
      path: '/clients',
      name: 'clients',
      component: () => import(/* webpackChunkName: "admin" */ '../views/ClientsView.vue'),
      meta: {
        title: 'Clients Management',
        chunk: 'admin',
      }
    },
    {
      path: '/bookings',
      name: 'bookings',
      component: () => import(/* webpackChunkName: "admin" */ '../views/BookingsView.vue'),
      meta: {
        title: 'Bookings Management',
        chunk: 'admin',
      }
    },
    {
      path: '/demo/virtual-scrolling',
      name: 'virtual-scrolling-demo',
      component: () => import(/* webpackChunkName: "demo" */ '../components/demo/VirtualScrollingDemo.vue'),
      meta: {
        title: 'Virtual Scrolling Performance Demo',
        development: true,
        chunk: 'demo',
      }
    },
    {
      path: '/demo/cart',
      name: 'cart-demo',
      component: () => import(/* webpackChunkName: "demo" */ '../views/CartDemo.vue'),
      meta: {
        title: 'Universal Cart Core Engine Demo',
        development: true,
        chunk: 'demo',
      }
    },
  ],
})

// Performance tracking for route loading
if (import.meta.env.DEV) {
  router.beforeEach((to, from) => {
    if (to.meta?.chunk) {
      const startTime = performance.now()
      // Store start time for this route
      ;(window as any).__routeLoadStart = startTime
      console.log(`🛣️  Loading route: ${to.name} (chunk: ${to.meta.chunk})`)
    }
  })

  router.afterEach((to, from) => {
    if ((window as any).__routeLoadStart) {
      const loadTime = performance.now() - (window as any).__routeLoadStart
      console.log(`✅ Route loaded: ${to.name} in ${loadTime.toFixed(2)}ms`)
      delete (window as any).__routeLoadStart
    }
  })
}

// Route-based preloading for critical paths
router.beforeEach(async (to, from, next) => {
  // Preload related chunks based on current route
  if (to.name === 'dashboard' && 'requestIdleCallback' in window) {
    requestIdleCallback(() => {
      // Preload equipment since it's commonly accessed from dashboard
      import('../views/EquipmentListView.vue').catch(() => {})
      import('../components/cart/UniversalCart.vue').catch(() => {})
    })
  }

  next()
})

export default router
