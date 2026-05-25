import type { RouteRecordRaw } from 'vue-router'
import { createRouter, createWebHistory } from 'vue-router'
import { routes, handleHotUpdate } from 'vue-router/auto-routes'
import { setupLayouts } from 'virtual:generated-layouts'
import { useSessions } from '../composables/useSessions'
import { useI18n } from '../composables/useI18n'

const router = createRouter({
  routes: setupLayouts(routes as RouteRecordRaw[]),
  history: createWebHistory()
})

router.beforeEach((to) => {
  if ('lang' in to.query) {
    const lang = to.query.lang as string
    if (['zh-CN', 'en'].includes(lang)) {
      const { setLocale } = useI18n()
      setLocale(lang)
    }
  }

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
