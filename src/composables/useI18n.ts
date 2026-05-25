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
  function setLocale(newLocale: string) {
    locale.value = newLocale
    setValue('appearance.language.locale', newLocale)
  }

  return {
    locale,
    setLocale
  }
}
