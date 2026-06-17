import { defineComarkComponent } from '@comark/vue'
import { defineComarkPlugin } from '@comark/vue/parse'
import highlight from '@comark/vue/plugins/highlight'
import html from '@shikijs/langs/html'
import css from '@shikijs/langs/css'
import python from '@shikijs/langs/python'
import sql from '@shikijs/langs/sql'
import go from '@shikijs/langs/go'
import rust from '@shikijs/langs/rust'
import java from '@shikijs/langs/java'
import c from '@shikijs/langs/c'
import cpp from '@shikijs/langs/cpp'
import ruby from '@shikijs/langs/ruby'
import php from '@shikijs/langs/php'
import swift from '@shikijs/langs/swift'
import kotlin from '@shikijs/langs/kotlin'
import diff from '@shikijs/langs/diff'
import dockerfile from '@shikijs/langs/dockerfile'
import xml from '@shikijs/langs/xml'
import toml from '@shikijs/langs/toml'
import graphql from '@shikijs/langs/graphql'

// Plugin to prevent --- at the start from being parsed as frontmatter
// AI output never contains frontmatter, so we convert leading --- to - - - (horizontal rule)
const noFrontmatter = defineComarkPlugin(() => ({
  name: 'no-frontmatter',
  pre(state: { markdown: string }) {
    if (state.markdown.startsWith('---')) {
      state.markdown = '- - -' + state.markdown.slice(3)
    }
  }
}))

export default defineComarkComponent({
  name: 'ChatComark',
  plugins: [
    noFrontmatter(),
    highlight({
      languages: [html, css, python, sql, go, rust, java, c, cpp, ruby, php, swift, kotlin, diff, dockerfile, xml, toml, graphql]
    })
  ],
  class: '*:first:mt-0 *:last:mb-0'
})
