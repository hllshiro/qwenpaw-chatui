import { defineComponent, h } from 'vue'
import MarkdownRender, { enableMermaid, enableKatex } from 'markstream-vue'
import 'markstream-vue/index.css'

enableMermaid()
enableKatex()

export default defineComponent({
  name: 'ChatComark',
  props: {
    markdown: {
      type: String,
      required: true
    }
  },
  setup(props) {
    return () => h(MarkdownRender, {
      content: props.markdown,
      mode: 'chat',
      final: true,
      smoothStreaming: 'auto',
      fade: false
    })
  }
})
