import { useI18n as useVueI18n } from 'vue-i18n'
import { watch } from 'vue'
import { useSettings } from './settings'

export function useI18n() {
  const { locale } = useVueI18n()
  const { getValue, setValue } = useSettings()

  // 监听设置变化，同步更新语言
  watch(
    () => getValue('appearance.language.locale'),
    (newLocale) => {
      if (newLocale && newLocale !== locale.value) {
        locale.value = newLocale
      }
    },
    { immediate: true }
  )

  // 切换语言
  async function setLocale(newLocale: string) {
    const oldLocale = locale.value
    locale.value = newLocale
    try {
      await setValue('appearance.language.locale', newLocale)
    } catch (error) {
      // 回滚到旧的语言设置
      locale.value = oldLocale
      throw error
    }
  }

  return {
    locale,
    setLocale
  }
}
