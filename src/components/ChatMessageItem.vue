<template>
  <div
    class="message-item"
    :class="[message.role, { streaming: isStreaming }]"
  >
    <!-- 头像 -->
    <div class="message-avatar">
      <div v-if="message.role === 'assistant' || isStreaming" class="avatar-ai">
        <svg viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
        </svg>
      </div>
      <div v-else class="avatar-user">
        <svg viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
        </svg>
      </div>
    </div>

    <!-- 内容 -->
    <div class="message-content">
      <div class="message-header">
        <span class="message-author">{{ authorLabel }}</span>
        <span v-if="!isStreaming" class="message-time">{{ formatTime }}</span>
        <span v-else class="typing-indicator">思考中<span class="dots">...</span></span>
      </div>
      <div
        class="message-body"
        v-html="renderedContent"
        ref="contentRef"
      />

      <!-- 消息操作 -->
      <div v-if="showActions && !isStreaming" class="message-actions">
        <button
          class="action-btn"
          @click="copyContent"
          title="复制内容"
        >
          <svg viewBox="0 0 24 24" fill="currentColor">
            <path d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z"/>
          </svg>
        </button>
        <button
          v-if="message.role === 'assistant'"
          class="action-btn"
          @click="regenerate"
          title="重新生成"
        >
          <svg viewBox="0 0 24 24" fill="currentColor">
            <path d="M17.65 6.35C16.2 4.9 14.21 4 12 4c-4.42 0-7.99 3.58-7.99 8s3.57 8 7.99 8c3.73 0 6.84-2.55 7.73-6h-2.08c-.82 2.33-3.04 4-5.65 4-3.31 0-6-2.69-6-6s2.69-6 6-6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35z"/>
          </svg>
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, nextTick } from 'vue'
import { marked } from 'marked'
import hljs from 'highlight.js'
import type { ChatMessage } from '../utils/aiChatService'

// 配置 marked（只配置一次，在父组件中配置）
const props = defineProps<{
  message: ChatMessage
  isStreaming?: boolean
  showActions?: boolean
}>()

const emit = defineEmits<{
  regenerate: [messageId: string]
}>()

const contentRef = ref<HTMLDivElement | null>(null)

// 作者标签
const authorLabel = computed(() => {
  if (props.isStreaming) return 'AI'
  return props.message.role === 'assistant' ? 'AI' : '您'
})

// 格式化时间
const formatTime = computed(() => {
  const timestamp = props.isStreaming ? Date.now() : props.message.timestamp
  return new Date(timestamp).toLocaleTimeString('zh-CN', {
    hour: '2-digit',
    minute: '2-digit'
  })
})

// 渲染 Markdown
const renderedContent = computed(() => {
  const content = props.isStreaming ? props.message.content : props.message.content
  return marked.parse(content) as string
})

// 复制内容
const copyContent = async () => {
  try {
    await navigator.clipboard.writeText(props.message.content)
    // 可以添加 toast 提示
  } catch (e) {
    console.error('复制失败:', e)
  }
}

// 重新生成
const regenerate = () => {
  emit('regenerate', props.message.id)
}

// 代码高亮（延迟执行，提高性能）
onMounted(() => {
  nextTick(() => {
    if (contentRef.value) {
      const codeBlocks = contentRef.value.querySelectorAll('pre code')
      codeBlocks.forEach((block) => {
        hljs.highlightElement(block as HTMLElement)
      })
    }
  })
})
</script>

<style scoped>
.message-item {
  display: flex;
  gap: 12px;
  animation: messageIn 0.3s ease;
}

@keyframes messageIn {
  from {
    opacity: 0;
    transform: translateY(8px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.message-item.user {
  flex-direction: row-reverse;
}

/* 头像 */
.message-avatar {
  flex-shrink: 0;
}

.avatar-ai,
.avatar-user {
  width: 32px;
  height: 32px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.avatar-ai {
  background: rgba(183, 159, 255, 0.15);
  color: var(--color-primary, #b79fff);
}

.avatar-user {
  background: rgba(45, 183, 242, 0.15);
  color: var(--color-secondary, #2db7f2);
}

.avatar-ai svg,
.avatar-user svg {
  width: 18px;
  height: 18px;
}

/* 消息内容 */
.message-content {
  flex: 1;
  min-width: 0;
}

.message-item.user .message-content {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
}

.message-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 4px;
}

.message-item.user .message-header {
  flex-direction: row-reverse;
}

.message-author {
  font-size: 12px;
  font-weight: 500;
  color: var(--color-on-surface, #f6f6fc);
}

.message-time {
  font-size: 11px;
  color: var(--color-on-surface-variant, #aaabb0);
}

.typing-indicator {
  font-size: 11px;
  color: var(--color-primary, #b79fff);
}

.dots {
  animation: dots 1.5s infinite;
}

@keyframes dots {
  0%, 20% { opacity: 0.2; }
  40% { opacity: 1; }
  60%, 100% { opacity: 0.2; }
}

/* 消息体 */
.message-body {
  background: rgba(29, 32, 37, 0.6);
  border: 1px solid rgba(70, 72, 77, 0.15);
  border-radius: 12px;
  padding: 12px 14px;
  font-size: 13px;
  line-height: 1.6;
  color: var(--color-on-surface, #f6f6fc);
  max-width: 100%;
  word-wrap: break-word;
}

.message-item.user .message-body {
  background: rgba(183, 159, 255, 0.1);
  border-color: rgba(183, 159, 255, 0.2);
}

.message-item.assistant .message-body {
  border-bottom-left-radius: 4px;
}

.message-item.user .message-body {
  border-bottom-right-radius: 4px;
}

/* Markdown 样式 */
.message-body :deep(p) {
  margin: 0 0 8px 0;
}

.message-body :deep(p:last-child) {
  margin-bottom: 0;
}

.message-body :deep(code) {
  font-family: var(--font-mono, 'Fira Code', monospace);
  font-size: 12px;
  padding: 2px 6px;
  background: rgba(0, 0, 0, 0.3);
  border-radius: 4px;
  color: var(--color-secondary, #2db7f2);
}

.message-body :deep(pre) {
  margin: 8px 0;
  padding: 12px;
  background: rgba(0, 0, 0, 0.4);
  border-radius: 8px;
  overflow-x: auto;
}

.message-body :deep(pre code) {
  background: transparent;
  padding: 0;
  color: var(--color-on-surface, #f6f6fc);
}

.message-body :deep(ul),
.message-body :deep(ol) {
  margin: 8px 0;
  padding-left: 20px;
}

.message-body :deep(li) {
  margin: 4px 0;
}

.message-body :deep(a) {
  color: var(--color-primary, #b79fff);
  text-decoration: none;
}

.message-body :deep(a:hover) {
  text-decoration: underline;
}

.message-body :deep(table) {
  width: 100%;
  border-collapse: collapse;
  margin: 8px 0;
}

.message-body :deep(th),
.message-body :deep(td) {
  padding: 6px 10px;
  border: 1px solid rgba(70, 72, 77, 0.3);
  text-align: left;
}

.message-body :deep(th) {
  background: rgba(29, 32, 37, 0.8);
  font-weight: 600;
}

.message-body :deep(blockquote) {
  margin: 8px 0;
  padding: 8px 12px;
  border-left: 3px solid var(--color-primary, #b79fff);
  background: rgba(183, 159, 255, 0.05);
  color: var(--color-on-surface-variant, #aaabb0);
}

/* 消息操作 */
.message-actions {
  display: flex;
  gap: 4px;
  margin-top: 6px;
  opacity: 0;
  transition: opacity 0.2s ease;
}

.message-item:hover .message-actions {
  opacity: 1;
}

.action-btn {
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: transparent;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  color: var(--color-on-surface-variant, #aaabb0);
  transition: all 0.2s ease;
}

.action-btn:hover {
  background: rgba(70, 72, 77, 0.3);
  color: var(--color-on-surface, #f6f6fc);
}

.action-btn svg {
  width: 14px;
  height: 14px;
}
</style>
