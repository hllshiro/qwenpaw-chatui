import type { RouteRecordRaw } from 'vue-router'
import { createRouter, createWebHistory } from 'vue-router'
import { routes, handleHotUpdate } from 'vue-router/auto-routes'
import { setupLayouts } from 'virtual:generated-layouts'
import { useSessions } from '../composables/useSessions'
import i18n from '../locales'

const router = createRouter({
  routes: setupLayouts(routes as RouteRecordRaw[]),
  history: createWebHistory()
})

router.beforeEach((to) => {
  if ('lang' in to.query) {
    const lang = to.query.lang as string
    if (['zh-CN', 'en'].includes(lang)) {
      i18n.global.locale.value = lang as 'zh-CN' | 'en'
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
