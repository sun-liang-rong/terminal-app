<template>
  <DynamicScroller
    ref="scrollerRef"
    :items="messagesWithStreaming"
    :min-item-size="80"
    key-field="id"
    class="virtual-message-list"
    @scroll="onScroll"
  >
    <template #default="{ item, index, active }">
      <DynamicScrollerItem
        v-if="item && item.id"
        :item="item"
        :active="active"
        :data-index="index"
        :size-dependencies="[item.content, item.id]"
      >
        <ChatMessageItem
          :message="item"
          :is-streaming="item.isStreaming"
          :show-actions="!item.isStreaming"
          @regenerate="onRegenerate"
        />
      </DynamicScrollerItem>
    </template>
  </DynamicScroller>
</template>

<script setup lang="ts">
import { ref, computed, watch, nextTick } from 'vue'
import { DynamicScroller, DynamicScrollerItem } from 'vue-virtual-scroller'
import 'vue-virtual-scroller/dist/vue-virtual-scroller.css'
import ChatMessageItem from './ChatMessageItem.vue'
import type { ChatMessage } from '../utils/aiChatService'

const props = defineProps<{
  messages: ChatMessage[]
  streamingMessage?: string
  isStreaming?: boolean
}>()

const emit = defineEmits<{
  regenerate: [messageId: string]
  scrollTop: []
}>()

const scrollerRef = ref<any>(null)

// 合并普通消息和流式消息
const messagesWithStreaming = computed(() => {
  // 确保 base messages 不为空且有效
  const msgs = props.messages.filter(m => m && m.id)
  if (props.isStreaming && props.streamingMessage) {
    msgs.push({
      id: 'streaming',
      role: 'assistant',
      content: props.streamingMessage,
      timestamp: Date.now(),
      isStreaming: true
    } as ChatMessage)
  }
  return msgs
})

// 滚动到底部
const scrollToBottom = () => {
  nextTick(() => {
    try {
      if (scrollerRef.value && scrollerRef.value.scrollToBottom) {
        scrollerRef.value.scrollToBottom()
      }
    } catch (e) {
      console.warn('[VirtualMessageList] scrollToBottom error:', e)
    }
  })
}

// 滚动到顶部
const scrollToTop = () => {
  nextTick(() => {
    try {
      if (scrollerRef.value && scrollerRef.value.scrollToItem) {
        scrollerRef.value.scrollToItem(0)
      }
    } catch (e) {
      console.warn('[VirtualMessageList] scrollToTop error:', e)
    }
  })
}

// 滚动到指定消息
const scrollToItem = (index: number) => {
  nextTick(() => {
    try {
      if (scrollerRef.value && scrollerRef.value.scrollToItem) {
        scrollerRef.value.scrollToItem(index)
      }
    } catch (e) {
      console.warn('[VirtualMessageList] scrollToItem error:', e)
    }
  })
}

// 监听滚动
const onScroll = (event: Event) => {
  const target = event.target as HTMLElement
  if (target.scrollTop === 0) {
    emit('scrollTop')
  }
}

// 重新生成回调
const onRegenerate = (messageId: string) => {
  emit('regenerate', messageId)
}

// 监听新消息自动滚动
watch(() => props.messages.length, (newLen, oldLen) => {
  if (newLen > oldLen) {
    scrollToBottom()
  }
})

// 监听流式消息滚动
watch(() => props.streamingMessage, () => {
  if (props.isStreaming) {
    scrollToBottom()
  }
})

// 暴露方法
defineExpose({
  scrollToBottom,
  scrollToTop,
  scrollToItem
})
</script>

<style scoped>
.virtual-message-list {
  width: 100%;
  height: 100%;
  overflow-y: auto;
  padding: 16px;
  box-sizing: border-box;
}

:deep(.vue-recycle-scroller__item-wrapper) {
  display: flex;
  flex-direction: column;
  gap: 16px;
}
</style>
