import type { RouteRecordRaw } from 'vue-router'
import { createRouter, createWebHistory } from 'vue-router'
import { routes, handleHotUpdate } from 'vue-router/auto-routes'
import { setupLayouts } from 'virtual:generated-layouts'
import { useSessions } from '../composables/useSessions'

const router = createRouter({
  routes: setupLayouts(routes as RouteRecordRaw[]),
  history: createWebHistory()
})

router.beforeEach((to) => {
  if ('business_key' in to.query) {
    const businessKey = (to.query.business_key as string) || 'default'
    const { setBusinessKey } = useSessions()
    setBusinessKey(businessKey)
  }
})

if (import.meta.hot) {
  handleHotUpdate(router)
}

export default router
