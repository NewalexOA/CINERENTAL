import './assets/main.css'

import { createApp } from 'vue'
import { createPinia } from 'pinia'

import App from './App.vue'
import router from './router'
import { httpClient } from './services/api/http-client'
import { useAuthStore } from './stores/auth'

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
  app.mount('#app')
})
