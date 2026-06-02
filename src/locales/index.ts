import { createI18n } from 'vue-i18n'
import zhCNCommon from './zh-CN/common.json'
import zhCNSettings from './zh-CN/settings.json'
import zhCNChat from './zh-CN/chat.json'
import zhCNComponents from './zh-CN/components.json'
import zhCNNotification from './zh-CN/notification.json'
import enCommon from './en/common.json'
import enSettings from './en/settings.json'
import enChat from './en/chat.json'
import enComponents from './en/components.json'
import enNotification from './en/notification.json'

const i18n = createI18n({
  legacy: false,
  locale: 'zh-CN',
  availableLocales: ['zh-CN', 'en'],
  messages: {
    'zh-CN': {
      ...zhCNCommon,
      ...zhCNSettings,
      ...zhCNChat,
      ...zhCNComponents,
      ...zhCNNotification
    },
    en: {
      ...enCommon,
      ...enSettings,
      ...enChat,
      ...enComponents,
      ...enNotification
    }
  }
})

export default i18n
