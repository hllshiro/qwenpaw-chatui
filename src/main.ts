import './assets/css/main.css'

import { createApp } from 'vue'
import type { RouteRecordRaw } from 'vue-router'
import { createRouter, createWebHistory } from 'vue-router'
import { routes, handleHotUpdate } from 'vue-router/auto-routes'
import { setupLayouts } from 'virtual:generated-layouts'
import { createHead } from '@unhead/vue/client'
import ui from '@nuxt/ui/vue-plugin'

import App from './App.vue'
import { useSessions } from './composables/useSessions'

const app = createApp(App)

const head = createHead()
const router = createRouter({
  routes: setupLayouts(routes as RouteRecordRaw[]),
  history: createWebHistory()
})

router.beforeEach((to) => {
  const businessKey = to.query.business_key as string | undefined
  if (businessKey) {
    const { setBusinessKey } = useSessions()
    setBusinessKey(businessKey)
  }
})

app.use(head)
app.use(router)
app.use(ui)

app.mount('#app')

// This will update routes at runtime without reloading the page
if (import.meta.hot) {
  handleHotUpdate(router)
}
