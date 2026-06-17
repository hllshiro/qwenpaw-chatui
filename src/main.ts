import './assets/css/main.css'
import 'markstream-vue/index.css'
import 'katex/dist/katex.min.css'

import { createApp } from 'vue'
import { createHead } from '@unhead/vue/client'
import ui from '@nuxt/ui/vue-plugin'
import i18n from './locales'

import App from './App.vue'
import router from './router'

const app = createApp(App)

const head = createHead()

app.use(head)
app.use(router)
app.use(ui)
app.use(i18n)

app.mount('#app')
