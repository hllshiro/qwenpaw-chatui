import { defineComponent, h } from 'vue'
import MarkdownRender, { MarkdownCodeBlockNode, setCustomComponents } from 'markstream-vue'
import 'markstream-vue/index.css'

setCustomComponents({ code_block: MarkdownCodeBlockNode })

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
