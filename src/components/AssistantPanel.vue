<template>
  <aside class="ai-sidebar">
    <!-- 标题栏 -->
    <div class="ai-header">
      <div class="ai-title-wrapper">
        <svg class="ai-icon" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z"/>
          <circle cx="12" cy="10" r="2"/>
          <path d="M12 13c-2.33 0-4.31 1.46-5.11 3.5h10.22c-.8-2.04-2.78-3.5-5.11-3.5z" opacity="0.6"/>
        </svg>
        <h3 class="ai-title">AI 助手</h3>
      </div>
      <div class="header-actions">
        <button class="header-btn" @click="clearMessages" title="清空对话">
          <svg viewBox="0 0 24 24" fill="currentColor">
            <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/>
          </svg>
        </button>
        <button class="header-btn" @click="onClose" title="关闭">
          <svg viewBox="0 0 24 24" fill="currentColor">
            <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
          </svg>
        </button>
      </div>
    </div>

    <!-- 消息区域 -->
    <div class="ai-messages">
      <!-- 欢迎消息 -->
      <div v-if="chatMessages.length === 0" class="welcome-message">
        <div class="welcome-icon">
          <svg viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z"/>
            <circle cx="12" cy="10" r="2"/>
            <path d="M12 13c-2.33 0-4.31 1.46-5.11 3.5h10.22c-.8-2.04-2.78-3.5-5.11-3.5z" opacity="0.6"/>
          </svg>
        </div>
        <h4>有什么可以帮您的？</h4>
        <p>配置好模型后，我们可以开始对话了</p>
      </div>

      <!-- 虚拟滚动消息列表 -->
      <VirtualMessageList
        v-else
        ref="messageListRef"
        :messages="chatMessages"
        :streaming-message="currentStreamingMessage"
        :is-streaming="isLoading"
      />
    </div>

    <!-- 输入区域 -->
    <div class="ai-input-area">
      <div class="input-wrapper">
        <textarea
          v-model="inputMessage"
          class="message-input"
          placeholder="输入消息..."
          rows="1"
          :disabled="isLoading"
          @keydown.enter.prevent="handleSend"
          @input="autoResize"
          ref="textareaRef"
        ></textarea>
        <button
          class="send-btn"
          @click="handleSend"
          :disabled="!inputMessage.trim() || isLoading"
          :class="{ loading: isLoading }"
        >
          <svg v-if="!isLoading" viewBox="0 0 24 24" fill="currentColor">
            <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/>
          </svg>
          <svg v-else class="spinner" viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-dasharray="31.416" stroke-dashoffset="10"/>
          </svg>
        </button>
      </div>
    </div>
  </aside>
</template>

<script setup lang="ts">
import { ref, onMounted, computed, nextTick } from 'vue'
import { marked } from 'marked'
import hljs from 'highlight.js'
import {
  initAIModels,
  aiModelsState,
  currentModelId,
  getCurrentModel,
  setCurrentModel,
  type AIModelConfig
} from '../utils/aiModelsStore'
import {
  isLoading,
  currentStreamingMessage,
  sendMessage as sendToAI,
  clearChat,
  chatMessages
} from '../utils/aiChatService'
import VirtualMessageList from './VirtualMessageList.vue'

// 配置 marked - 使用自定义 renderer 处理代码高亮
const renderer = new marked.Renderer()
renderer.code = ({ text, lang }: { text: string; lang?: string }) => {
  const language = lang || 'plaintext'
  const highlighted = language && hljs.getLanguage(language)
    ? hljs.highlight(text, { language }).value
    : hljs.highlightAuto(text).value
  return `<pre><code class="hljs language-${language}">${highlighted}</code></pre>`
}

marked.setOptions({
  breaks: true,
  gfm: true,
  renderer
})

const props = defineProps<{
  visible: boolean
}>()

const emit = defineEmits(['close'])

// refs
const inputMessage = ref('')
const textareaRef = ref<HTMLTextAreaElement | null>(null)
const messageListRef = ref<InstanceType<typeof VirtualMessageList> | null>(null)

// 初始化
onMounted(() => {
  initAIModels()
})

// 计算属性
const currentModel = computed<AIModelConfig | null>(() => getCurrentModel())

// 使用从 aiChatService 导入的消息列表

// 发送消息
const handleSend = async () => {
  if (!inputMessage.value.trim() || isLoading.value || !currentModel.value) return

  const content = inputMessage.value.trim()
  inputMessage.value = ''
  resetTextareaHeight()

  await sendToAI(content, currentModel.value, () => {
    // 滚动到底部由 VirtualMessageList 组件处理
  })
}

// 自动调整文本框高度
const autoResize = () => {
  const textarea = textareaRef.value
  if (!textarea) return

  textarea.style.height = 'auto'
  const newHeight = Math.min(Math.max(textarea.scrollHeight, 44), 200)
  textarea.style.height = newHeight + 'px'
}

// 重置文本框高度
const resetTextareaHeight = () => {
  const textarea = textareaRef.value
  if (textarea) {
    textarea.style.height = '44px'
  }
}

// 清空消息
const clearMessages = () => {
  clearChat()
}

// 关闭面板
const onClose = () => {
  emit('close')
}

// 键盘快捷键
defineExpose({
  focusInput: () => {
    textareaRef.value?.focus()
  }
})
</script>

<style scoped>
/* ========== 基础布局 ========== */
.ai-sidebar {
  width: 320px;
  height: 100%;
  padding: 0 10px;
  border-left: 1px solid rgba(70, 72, 77, 0.15);
  display: flex;
  flex-direction: column;
  position: relative;
  flex-shrink: 0;
  backdrop-filter: blur(20px);
  box-sizing: border-box;
  overflow: hidden;
}

/* ========== Header ========== */
.ai-header {
  height: 52px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: rgba(17, 19, 24, 0.6);
  border-bottom: 1px solid rgba(70, 72, 77, 0.1);
  min-width: 0;
}

.ai-title-wrapper {
  display: flex;
  align-items: center;
  gap: 10px;
  flex: 1;
  min-width: 0;
  overflow: hidden;
}

.ai-icon {
  width: 22px;
  height: 22px;
  color: var(--color-primary, #b79fff);
}

.ai-title {
  font-family: var(--font-headline, 'Space Grotesk', sans-serif);
  font-size: 14px;
  font-weight: 600;
  color: var(--color-on-surface, #f6f6fc);
  letter-spacing: -0.2px;
  margin: 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 4px;
  flex-shrink: 0;
}

.header-btn {
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: transparent;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  color: var(--color-on-surface-variant, #aaabb0);
  transition: all 0.2s ease;
}

.header-btn:hover {
  background: rgba(29, 32, 37, 0.6);
  color: var(--color-on-surface, #f6f6fc);
}

.header-btn svg {
  width: 18px;
  height: 18px;
}

/* ========== Messages ========== */
.ai-messages {
  flex: 1;
  overflow: hidden;
  position: relative;
}

/* 欢迎消息 */
.welcome-message {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  padding: 48px 24px;
  text-align: center;
  opacity: 0.6;
}

.welcome-icon {
  width: 56px;
  height: 56px;
  border-radius: 16px;
  background: rgba(183, 159, 255, 0.1);
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 16px;
  color: var(--color-primary, #b79fff);
}

.welcome-icon svg {
  width: 28px;
  height: 28px;
}

.welcome-message h4 {
  font-size: 16px;
  font-weight: 600;
  color: var(--color-on-surface, #f6f6fc);
  margin: 0 0 8px 0;
}

.welcome-message p {
  font-size: 13px;
  color: var(--color-on-surface-variant, #aaabb0);
  margin: 0;
}

/* ========== Input Area ========== */
.ai-input-area {
  padding: 8px 0;
  background: rgba(17, 19, 24, 0.6);
  border-top: 1px solid rgba(70, 72, 77, 0.1);
  box-sizing: border-box;
}

.input-wrapper {
  display: flex;
  align-items: flex-end;
  gap: 8px;
  width: 100%;
  min-width: 0;
}

.message-input {
  flex: 1;
  min-height: 44px;
  max-height: 200px;
  padding: 12px 14px;
  background: rgba(29, 32, 37, 0.6);
  border: 1px solid rgba(70, 72, 77, 0.2);
  border-radius: 12px;
  color: var(--color-on-surface, #f6f6fc);
  font-size: 13px;
  font-family: var(--font-body, 'Inter', sans-serif);
  resize: none;
  outline: none;
  transition: all 0.2s ease;
  line-height: 1.5;
  min-width: 0;
}

.message-input:focus {
  border-color: rgba(183, 159, 255, 0.4);
  box-shadow: 0 0 0 1px rgba(183, 159, 255, 0.1);
}

.message-input:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.message-input::placeholder {
  color: var(--color-on-surface-variant, #aaabb0);
  opacity: 0.5;
}

.send-btn {
  width: 44px;
  height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, var(--color-primary, #b79fff) 0%, var(--color-primary-dim, #a88cfb) 100%);
  border: none;
  border-radius: 12px;
  cursor: pointer;
  color: var(--color-on-primary, #361083);
  transition: all 0.2s ease;
  flex-shrink: 0;
}

.send-btn:hover:not(:disabled) {
  filter: brightness(1.1);
  transform: scale(1.02);
}

.send-btn:active:not(:disabled) {
  transform: scale(0.98);
}

.send-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.send-btn.loading {
  opacity: 0.8;
}

.send-btn svg {
  width: 20px;
  height: 20px;
}

.spinner {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}
</style>
