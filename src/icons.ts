import { addCollection } from '@iconify/vue'
import { icons as lucideIcons } from '@iconify-json/lucide'

// 使用 globalThis 赋值防止 Rollup tree-shaking 移除此模块
// addCollection 将图标数据注册到 @iconify/vue 的内部存储中，
// 使 Icon 组件无需从外部 API 加载图标
void ((globalThis as any).__lucideIconsLoaded = addCollection(lucideIcons as any))
