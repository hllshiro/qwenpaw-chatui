import { defineComponent, h, computed } from 'vue'
import MarkdownRender from 'markstream-vue'

export default defineComponent({
  name: 'ChatMarkdownRenderer',
  props: {
    markdown: {
      type: String,
      required: true
    },
    streaming: {
      type: Boolean,
      default: false
    }
  },
  setup(props) {
    const renderProps = computed(() => {
      if (props.streaming) {
        return {
          content: props.markdown,
          final: false,
          smoothStreaming: 'auto' as const,
          fade: false,
          typewriter: true,
          maxLiveNodes: 0
        }
      }
      return {
        content: props.markdown,
        final: true,
        smoothStreaming: false,
        fade: true,
        typewriter: false
      }
    })

    return () => h(MarkdownRender, renderProps.value)
  }
})
