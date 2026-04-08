<template>
  <aside class="ai-sidebar">
    <!-- 标题栏 -->
    <div class="ai-header">
      <div class="ai-title-wrapper">
        <svg class="ai-icon" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
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
    <div class="ai-messages" ref="messagesRef">
      <!-- 欢迎消息 -->
      <div v-if="chatMessages.length === 0" class="welcome-message">
        <div class="welcome-icon">
          <svg viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
          </svg>
        </div>
        <h4>有什么可以帮您的？</h4>
        <p>配置好模型后，我们可以开始对话了</p>
      </div>

      <!-- 消息列表 -->
      <template v-else>
        <div
          v-for="message in chatMessages"
          :key="message.id"
          class="message-item"
          :class="message.role"
        >
          <!-- 头像 -->
          <div class="message-avatar">
            <div v-if="message.role === 'assistant'" class="avatar-ai">
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
              <span class="message-author">{{ message.role === 'assistant' ? 'AI' : '您' }}</span>
              <span class="message-time">{{ formatTime(message.timestamp) }}</span>
            </div>
            <div class="message-body" v-html="renderMarkdown(message.content)"></div>
          </div>
        </div>

        <!-- 流式消息 -->
        <div v-if="isLoading && currentStreamingMessage" class="message-item assistant streaming">
          <div class="message-avatar">
            <div class="avatar-ai">
              <svg viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
              </svg>
            </div>
          </div>
          <div class="message-content">
            <div class="message-header">
              <span class="message-author">AI</span>
              <span class="typing-indicator">思考中<span class="dots">...</span></span>
            </div>
            <div class="message-body" v-html="renderMarkdown(currentStreamingMessage)"></div>
          </div>
        </div>
      </template>

      <div ref="messagesEndRef"></div>
    </div>

    <!-- 输入区域 -->
    <div class="ai-input-area">
      <!-- 工具栏 -->
      <div class="input-toolbar">
        <div class="model-selector" @click="showModelMenu = !showModelMenu">
          <div class="model-icon-wrapper">
            <svg class="model-icon" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
            </svg>
          </div>
          <span class="model-name">{{ currentModel?.name || '选择模型' }}</span>
          <svg class="dropdown-icon" viewBox="0 0 24 24" fill="currentColor">
            <path d="M7 10l5 5 5-5z"/>
          </svg>
        </div>

        <!-- 模型菜单 -->
        <div class="model-menu" v-if="showModelMenu" v-click-outside="() => showModelMenu = truncate">
          <div
            v-for="model in modelList"
            :key="model.id"
            class="model-option"
            :class="{ active: currentModelId === model.id }"
            @click="selectModel(model.id)"
          >
            <div class="model-option-content">
              <div class="model-info">
                <span class="model-option-name">{{ model.name }}</span>
                <span class="model-option-id">{{ model.model }}</span>
              </div>
              <span class="model-badge" :class="model.provider">{{ getProviderLabel(model.provider) }}</span>
            </div>
          </div>
          <div v-if="modelList.length === 0" class="model-option-empty">
            <svg viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z"/>
            </svg>
            <span>暂无配置模型<br>请先在设置中添加</span>
          </div>
        </div>
      </div>

      <!-- 文本输入 -->
      <div class="input-wrapper">
        <textarea
          v-model="inputMessage"
          class="message-input"
          :placeholder="currentModel ? '输入消息...' : '请先选择一个模型'"
          rows="1"
          :disabled="isLoading || !currentModel"
          @keydown.enter.prevent="handleSend"
        ></textarea>
        <button
          class="send-btn"
          @click="handleSend"
          :disabled="!inputMessage.trim() || isLoading || !currentModel"
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
import { ref, watch, nextTick, onMounted, computed } from 'vue'
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
  chatMessages,
  isLoading,
  currentStreamingMessage,
  sendMessage as sendToAI,
  clearChat
} from '../utils/aiChatService'
import { truncate } from 'original-fs'

// 配置 marked
marked.setOptions({
  breaks: true,
  gfm: true,
  headerIds: false,
  highlight: (code, lang) => {
    if (lang && hljs.getLanguage(lang)) {
      return hljs.highlight(code, { language: lang }).value
    }
    return hljs.highlightAuto(code).value
  }
})

const props = defineProps<{
  visible: boolean
}>()

const emit = defineEmits(['close'])

// refs
const inputMessage = ref('')
const messagesRef = ref<HTMLDivElement | null>(null)
const messagesEndRef = ref<HTMLDivElement | null>(null)
const showModelMenu = ref(false)

// 初始化
onMounted(() => {
  initAIModels()
})

// 计算属性
const currentModel = computed<AIModelConfig | null>(() => getCurrentModel())
const modelList = computed<AIModelConfig[]>(() => aiModelsState.value)

// 渲染 Markdown
const renderMarkdown = (content: string): string => {
  return marked.parse(content) as string
}

// 格式化时间
const formatTime = (timestamp: number): string => {
  return new Date(timestamp).toLocaleTimeString('zh-CN', {
    hour: '2-digit',
    minute: '2-digit'
  })
}

// 获取提供商标签
const getProviderLabel = (provider: string): string => {
  const labels: Record<string, string> = {
    openai: 'OpenAI',
    claude: 'Claude',
    ollama: 'Ollama',
    custom: 'Custom'
  }
  return labels[provider] || provider
}

// 发送消息
const handleSend = async () => {
  if (!inputMessage.value.trim() || isLoading.value || !currentModel.value) return

  const content = inputMessage.value.trim()
  inputMessage.value = ''

  await sendToAI(content, currentModel.value, () => {
    scrollToBottom()
  })
}

// 选择模型
const selectModel = (modelId: string) => {
  setCurrentModel(modelId)
  showModelMenu.value = false
}

// 清空消息
const clearMessages = () => {
  clearChat()
}

// 滚动到底部
const scrollToBottom = () => {
  nextTick(() => {
    if (messagesEndRef.value) {
      messagesEndRef.value.scrollIntoView({ behavior: 'smooth' })
    }
  })
}


// 关闭面板
const onClose = () => {
  emit('close')
}

// 监听消息变化自动滚动
watch(chatMessages, () => {
  scrollToBottom()
}, { deep: true })

// v-click-outside 指令
const vClickOutside = {
  mounted(el: HTMLElement, binding: any) {
    el._clickOutside = (event: Event) => {
      if (!(el === event.target || el.contains(event.target as Node))) {
        binding.value()
      }
    }
    document.addEventListener('click', el._clickOutside)
  },
  unmounted(el: HTMLElement) {
    document.removeEventListener('click', el._clickOutside)
  }
}
</script>

<style scoped>
/* ========== 基础布局 ========== */
.ai-sidebar {
  width: 360px;
  height: 100%;
  padding: 0 10px;
  border-left: 1px solid rgba(70, 72, 77, 0.15);
  display: flex;
  flex-direction: column;
  position: relative;
  flex-shrink: 0;
  backdrop-filter: blur(20px);
  box-sizing: border-box;
  overflow: hidden; /* 防止内容溢出 */
}

/* ========== Header ========== */
.ai-header {
  height: 52px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 16px;
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
  width: 100%;
  height: 100%;
  overflow-y: auto;
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

/* 欢迎消息 */
.welcome-message {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
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

/* 消息项 */
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

/* ========== Input Area ========== */
.ai-input-area {
  padding: 12px 16px;
  background: rgba(17, 19, 24, 0.6);
  border-top: 1px solid rgba(70, 72, 77, 0.1);
  box-sizing: border-box;
 
}

.input-toolbar {
  position: relative;
  margin-bottom: 8px;
  width: 100%;
  box-sizing: border-box;
}

/* 模型选择器 */
.model-selector {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 10px;
  background: rgba(29, 32, 37, 0.6);
  border: 1px solid rgba(70, 72, 77, 0.2);
  border-radius: 10px;
  cursor: pointer;
  transition: all 0.2s ease;
  box-sizing: border-box;
  width: 100%;
}

.model-selector:hover {
  border-color: rgba(183, 159, 255, 0.3);
}

.model-icon-wrapper {
  width: 20px;
  height: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(183, 159, 255, 0.1);
  border-radius: 6px;
  color: var(--color-primary, #b79fff);
}

.model-icon {
  width: 14px;
  height: 14px;
}

.model-name {
  flex: 1;
  font-size: 12px;
  color: var(--color-on-surface-variant, #aaabb0);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  min-width: 0;
}

.dropdown-icon {
  width: 16px;
  height: 16px;
  color: var(--color-on-surface-variant, #aaabb0);
}

/* 模型菜单 */
.model-menu {
  position: absolute;
  bottom: calc(100% + 8px);
  left: 0;
  right: 0;
  background: rgba(29, 32, 37, 0.98);
  border: 1px solid rgba(70, 72, 77, 0.2);
  border-radius: 12px;
  padding: 6px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5);
  z-index: 100;
  max-height: 280px;
  overflow-y: auto;
}

.model-option {
  padding: 10px 12px;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.15s ease;
}

.model-option:hover {
  background: rgba(183, 159, 255, 0.1);
}

.model-option.active {
  background: rgba(183, 159, 255, 0.15);
}

.model-option-content {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.model-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.model-option-name {
  font-size: 12px;
  font-weight: 500;
  color: var(--color-on-surface, #f6f6fc);
}

.model-option.active .model-option-name {
  color: var(--color-primary, #b79fff);
}

.model-option-id {
  font-size: 10px;
  color: var(--color-on-surface-variant, #aaabb0);
  opacity: 0.7;
}

.model-badge {
  font-size: 10px;
  padding: 2px 6px;
  border-radius: 4px;
  font-weight: 500;
  text-transform: uppercase;
}

.model-badge.openai {
  background: rgba(16, 163, 127, 0.2);
  color: #10a37f;
}

.model-badge.claude {
  background: rgba(215, 168, 116, 0.2);
  color: #d7a874;
}

.model-badge.ollama {
  background: rgba(255, 134, 195, 0.2);
  color: #ff86c3;
}

.model-badge.custom {
  background: rgba(45, 183, 242, 0.2);
  color: #2db7f2;
}

.model-option-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 24px;
  text-align: center;
  color: var(--color-on-surface-variant, #aaabb0);
  gap: 8px;
}

.model-option-empty svg {
  width: 24px;
  height: 24px;
  opacity: 0.5;
}

.model-option-empty span {
  font-size: 12px;
  line-height: 1.5;
}

/* 输入框 */
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

/* ========== Scrollbar ========== */
.ai-messages::-webkit-scrollbar {
  width: 4px;
}

.ai-messages::-webkit-scrollbar-track {
  background: transparent;
}

.ai-messages::-webkit-scrollbar-thumb {
  background: rgba(70, 72, 77, 0.4);
  border-radius: 2px;
}

.ai-messages::-webkit-scrollbar-thumb:hover {
  background: rgba(70, 72, 77, 0.6);
}

.model-menu::-webkit-scrollbar {
  width: 3px;
}

.model-menu::-webkit-scrollbar-thumb {
  background: rgba(70, 72, 77, 0.4);
  border-radius: 2px;
}
</style>
