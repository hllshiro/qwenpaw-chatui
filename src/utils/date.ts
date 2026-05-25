import dayjs from 'dayjs'
import 'dayjs/locale/zh-cn'
import 'dayjs/locale/en'
import relativeTime from 'dayjs/plugin/relativeTime'

dayjs.extend(relativeTime)

export function formatDate(date: Date | string | number, locale: string): string {
  return dayjs(date).locale(locale).format('YYYY-MM-DD')
}

export function formatDateTime(date: Date | string | number, locale: string): string {
  return dayjs(date).locale(locale).format('YYYY-MM-DD HH:mm')
}

export function formatRelativeTime(date: Date | string | number, locale: string): string {
  return dayjs(date).locale(locale).fromNow()
}
