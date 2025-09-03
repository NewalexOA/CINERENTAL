import './assets/main.css'

import { createApp } from 'vue'
import { createPinia } from 'pinia'

import App from './App.vue'
import router from './router'
import { httpClient } from './services/api/http-client'
import { useAuthStore } from './stores/auth'
import { performanceMonitor } from '@/utils/performance'
import { preloadCriticalChunks } from '@/composables/useAsyncComponents'

async function enableMocking() {
  // Disable MSW for now in development to avoid service worker issues
  return Promise.resolve()
}

const app = createApp(App)

app.use(createPinia())
app.use(router)

// Setup interceptors now that Pinia is installed
httpClient.client.interceptors.request.use(
  (config) => {
    const authStore = useAuthStore()
    if (authStore.token && config.headers) {
      config.headers.Authorization = `Bearer ${authStore.token}`
    }
    return config
  },
  (error) => Promise.reject(error)
)

httpClient.client.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      const authStore = useAuthStore()
      authStore.logout()
      // Optionally redirect to login page
      // router.push('/login')
    }
    return Promise.reject(httpClient.transformError(error))
  }
)

enableMocking().then(() => {
  // Mount the app
  app.mount('#app')

  // Initialize performance monitoring
  if (import.meta.env.DEV) {
    // Log initial performance metrics after mount
    setTimeout(() => {
      performanceMonitor.logPerformanceReport()
    }, 2000)
  }

  // Preload critical chunks after initial load
  preloadCriticalChunks()

  // Add performance dashboard in development mode
  if (import.meta.env.DEV) {
    // Dynamically import and mount performance dashboard
    import('@/components/dev/PerformanceDashboard.vue').then((module) => {
      const dashboard = createApp(module.default)
      const dashboardElement = document.createElement('div')
      dashboardElement.id = 'performance-dashboard'
      document.body.appendChild(dashboardElement)
      dashboard.mount(dashboardElement)
    })
  }

  // Set up performance monitoring for router
  router.afterEach((to) => {
    // Track route change performance
    if (import.meta.env.DEV && to.meta?.chunk) {
      setTimeout(() => {
        performanceMonitor.logPerformanceReport()
      }, 500)
    }
  })
})
