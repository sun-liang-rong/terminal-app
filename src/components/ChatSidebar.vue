<template>
  <aside class="chat-sidebar" :class="{ collapsed: isCollapsed }">
    <!-- 新建对话按钮 -->
    <div class="sidebar-header">
      <button
        class="new-chat-btn"
        @click="onNewChat"
        title="新建对话 (Ctrl+N)"
      >
        <svg viewBox="0 0 24 24" fill="currentColor">
          <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/>
        </svg>
        <span>新对话</span>
      </button>
      <button
        class="toggle-btn"
        @click="toggleCollapse"
        :title="isCollapsed ? '展开' : '收起'"
      >
        <svg viewBox="0 0 24 24" fill="currentColor">
          <path d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z" v-if="!isCollapsed"/>
          <path d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z" v-else/>
        </svg>
      </button>
    </div>

    <!-- 搜索框 -->
    <div class="search-box" v-show="!isCollapsed">
      <div class="search-input-wrapper">
        <svg class="search-icon" viewBox="0 0 24 24" fill="currentColor">
          <path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/>
        </svg>
        <input
          v-model="searchQuery"
          type="text"
          class="search-input"
          placeholder="搜索对话..."
          @keydown.enter="onSearch"
        />
        <button
          v-if="searchQuery"
          class="clear-btn"
          @click="clearSearch"
          title="清除搜索"
        >
          <svg viewBox="0 0 24 24" fill="currentColor">
            <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
          </svg>
        </button>
      </div>
    </div>

    <!-- 对话列表 -->
    <div class="session-list" v-show="!isCollapsed">
      <div
        v-for="session in filteredSessions"
        :key="session.id"
        class="session-item"
        :class="{ active: currentSessionId === session.id }"
        @click="selectSession(session.id)"
        @contextmenu.prevent="showContextMenu($event, session)"
      >
        <div class="session-icon">
          <svg viewBox="0 0 24 24" fill="currentColor">
            <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z"/>
          </svg>
        </div>
        <div class="session-info">
          <div class="session-title">{{ session.title }}</div>
          <div class="session-meta">
            {{ formatTime(session.updatedAt) }} · {{ session.messages.length }} 条消息
          </div>
        </div>
        <button
          class="session-menu-btn"
          @click.stop="showContextMenu($event, session)"
          title="更多操作"
        >
          <svg viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z"/>
          </svg>
        </button>
      </div>

      <!-- 空状态 -->
      <div v-if="filteredSessions.length === 0" class="empty-state">
        <svg viewBox="0 0 24 24" fill="currentColor">
          <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z"/>
        </svg>
        <span>{{ searchQuery ? '没有找到匹配的对话' : '暂无对话' }}</span>
      </div>
    </div>

    <!-- 底部操作 -->
    <div class="sidebar-footer" v-show="!isCollapsed">
      <button class="footer-btn" @click="onClearAll" title="清空所有对话">
        <svg viewBox="0 0 24 24" fill="currentColor">
          <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/>
        </svg>
        <span>清空全部</span>
      </button>
    </div>

    <!-- 右键菜单 -->
    <div
      v-if="contextMenu.visible"
      class="context-menu"
      :style="{ left: contextMenu.x + 'px', top: contextMenu.y + 'px' }"
      v-click-outside="hideContextMenu"
    >
      <div class="menu-item" @click="onRename">
        <svg viewBox="0 0 24 24" fill="currentColor">
          <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/>
        </svg>
        <span>重命名</span>
      </div>
      <div class="menu-item" @click="onExportMarkdown">
        <svg viewBox="0 0 24 24" fill="currentColor">
          <path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z"/>
        </svg>
        <span>导出 Markdown</span>
      </div>
      <div class="menu-item" @click="onExportJSON">
        <svg viewBox="0 0 24 24" fill="currentColor">
          <path d="M9.4 16.6L4.8 12l4.6-4.6L8 6l-6 6 6 6 1.4-1.4zm5.2 0l4.6-4.6-4.6-4.6L16 6l6 6-6 6-1.4-1.4z"/>
        </svg>
        <span>导出 JSON</span>
      </div>
      <div class="menu-divider"></div>
      <div class="menu-item danger" @click="onDelete">
        <svg viewBox="0 0 24 24" fill="currentColor">
          <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/>
        </svg>
        <span>删除</span>
      </div>
    </div>

    <!-- 重命名对话框 -->
    <div v-if="renameDialog.visible" class="rename-dialog-overlay" @click="cancelRename">
      <div class="rename-dialog" @click.stop>
        <h4>重命名对话</h4>
        <input
          ref="renameInputRef"
          v-model="renameDialog.newTitle"
          type="text"
          placeholder="输入新标题"
          @keydown.enter="confirmRename"
          @keydown.esc="cancelRename"
        />
        <div class="dialog-actions">
          <button class="btn-secondary" @click="cancelRename">取消</button>
          <button class="btn-primary" @click="confirmRename">确定</button>
        </div>
      </div>
    </div>
  </aside>
</template>

<script setup lang="ts">
import { ref, computed, nextTick, onMounted, onUnmounted } from 'vue'
import {
  chatSessions,
  currentSessionId,
  getSortedSessions,
  searchSessions,
  createSession,
  switchSession,
  deleteSession,
  renameSession,
  exportSessionAsMarkdown,
  exportSessionAsJSON,
  type ChatSession
} from '../utils/chatSessionStore'

const emit = defineEmits<{
  newChat: []
  clearAll: []
}>()

// 折叠状态
const isCollapsed = ref(false)

// 搜索
const searchQuery = ref('')

// 过滤后的会话列表
const filteredSessions = computed(() => {
  if (searchQuery.value) {
    return searchSessions(searchQuery.value)
  }
  return getSortedSessions()
})

// 上下文菜单
const contextMenu = ref({
  visible: false,
  x: 0,
  y: 0,
  session: null as ChatSession | null
})

// 重命名对话框
const renameDialog = ref({
  visible: false,
  sessionId: '',
  newTitle: ''
})
const renameInputRef = ref<HTMLInputElement | null>(null)

// 格式化时间
const formatTime = (timestamp: number): string => {
  const date = new Date(timestamp)
  const now = new Date()
  const isToday = date.toDateString() === now.toDateString()

  if (isToday) {
    return date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
  }
  return date.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' })
}

// 切换折叠
const toggleCollapse = () => {
  isCollapsed.value = !isCollapsed.value
}

// 新建对话
const onNewChat = () => {
  createSession()
  emit('newChat')
}

// 选择会话
const selectSession = (sessionId: string) => {
  switchSession(sessionId)
}

// 搜索
const onSearch = () => {
  // 搜索已在计算属性中处理
}

// 清除搜索
const clearSearch = () => {
  searchQuery.value = ''
}

// 显示右键菜单
const showContextMenu = (event: MouseEvent, session: ChatSession) => {
  contextMenu.value = {
    visible: true,
    x: event.clientX,
    y: event.clientY,
    session
  }
}

// 隐藏右键菜单
const hideContextMenu = () => {
  contextMenu.value.visible = false
}

// 删除
const onDelete = () => {
  if (contextMenu.value.session) {
    deleteSession(contextMenu.value.session.id)
  }
  hideContextMenu()
}

// 重命名
const onRename = () => {
  if (contextMenu.value.session) {
    renameDialog.value = {
      visible: true,
      sessionId: contextMenu.value.session.id,
      newTitle: contextMenu.value.session.title
    }
    nextTick(() => {
      renameInputRef.value?.focus()
      renameInputRef.value?.select()
    })
  }
  hideContextMenu()
}

// 确认重命名
const confirmRename = () => {
  if (renameDialog.value.sessionId && renameDialog.value.newTitle.trim()) {
    renameSession(renameDialog.value.sessionId, renameDialog.value.newTitle.trim())
  }
  renameDialog.value.visible = false
}

// 取消重命名
const cancelRename = () => {
  renameDialog.value.visible = false
}

// 导出 Markdown
const onExportMarkdown = () => {
  if (contextMenu.value.session) {
    const content = exportSessionAsMarkdown(contextMenu.value.session.id)
    if (content) {
      downloadFile(content, `${contextMenu.value.session.title}.md`, 'text/markdown')
    }
  }
  hideContextMenu()
}

// 导出 JSON
const onExportJSON = () => {
  if (contextMenu.value.session) {
    const content = exportSessionAsJSON(contextMenu.value.session.id)
    if (content) {
      downloadFile(content, `${contextMenu.value.session.title}.json`, 'application/json')
    }
  }
  hideContextMenu()
}

// 下载文件
const downloadFile = (content: string, filename: string, type: string) => {
  const blob = new Blob([content], { type })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

// 清空全部
const onClearAll = () => {
  emit('clearAll')
}

// 键盘快捷键处理
const handleKeyDown = (event: KeyboardEvent) => {
  // Ctrl/Cmd + N: 新建对话
  if ((event.ctrlKey || event.metaKey) && event.key === 'n') {
    event.preventDefault()
    onNewChat()
  }
  // Ctrl/Cmd + F: 聚焦搜索框
  else if ((event.ctrlKey || event.metaKey) && event.key === 'f') {
    event.preventDefault()
    const searchInput = document.querySelector('.search-input') as HTMLInputElement
    if (searchInput && !isCollapsed.value) {
      searchInput.focus()
    }
  }
  // Ctrl/Cmd + Shift + 上箭头: 上一个对话
  else if ((event.ctrlKey || event.metaKey) && event.shiftKey && event.key === 'ArrowUp') {
    event.preventDefault()
    const sessions = filteredSessions.value
    const currentIndex = sessions.findIndex(s => s.id === currentSessionId.value)
    if (currentIndex > 0) {
      switchSession(sessions[currentIndex - 1].id)
    }
  }
  // Ctrl/Cmd + Shift + 下箭头: 下一个对话
  else if ((event.ctrlKey || event.metaKey) && event.shiftKey && event.key === 'ArrowDown') {
    event.preventDefault()
    const sessions = filteredSessions.value
    const currentIndex = sessions.findIndex(s => s.id === currentSessionId.value)
    if (currentIndex < sessions.length - 1) {
      switchSession(sessions[currentIndex + 1].id)
    }
  }
}

// 生命周期钩子
onMounted(() => {
  document.addEventListener('keydown', handleKeyDown)
})

onUnmounted(() => {
  document.removeEventListener('keydown', handleKeyDown)
})

// v-click-outside 指令
const vClickOutside = {
  mounted(el: HTMLElement, binding: any) {
    ;(el as any)._clickOutside = (event: Event) => {
      if (!(el === event.target || el.contains(event.target as Node))) {
        binding.value()
      }
    }
    document.addEventListener('click', (el as any)._clickOutside)
  },
  unmounted(el: HTMLElement) {
    document.removeEventListener('click', (el as any)._clickOutside)
  }
}
</script>

<style scoped>
.chat-sidebar {
  width: 260px;
  height: 100%;
  background: rgba(17, 19, 24, 0.8);
  border-right: 1px solid rgba(70, 72, 77, 0.15);
  display: flex;
  flex-direction: column;
  flex-shrink: 0;
  transition: width 0.3s ease;
  overflow: hidden;
}

.chat-sidebar.collapsed {
  width: 60px;
}

/* 头部 */
.sidebar-header {
  padding: 12px;
  display: flex;
  gap: 8px;
  align-items: center;
}

.new-chat-btn {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 10px 16px;
  background: rgba(183, 159, 255, 0.15);
  border: 1px solid rgba(183, 159, 255, 0.3);
  border-radius: 10px;
  color: var(--color-primary, #b79fff);
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
}

.new-chat-btn:hover {
  background: rgba(183, 159, 255, 0.25);
  border-color: rgba(183, 159, 255, 0.5);
}

.new-chat-btn svg {
  width: 18px;
  height: 18px;
}

.collapsed .new-chat-btn span {
  display: none;
}

.toggle-btn {
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

.toggle-btn:hover {
  background: rgba(70, 72, 77, 0.3);
  color: var(--color-on-surface, #f6f6fc);
}

.toggle-btn svg {
  width: 18px;
  height: 18px;
}

/* 搜索框 */
.search-box {
  padding: 0 12px 12px;
}

.search-input-wrapper {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  background: rgba(29, 32, 37, 0.6);
  border: 1px solid rgba(70, 72, 77, 0.2);
  border-radius: 10px;
  transition: all 0.2s ease;
}

.search-input-wrapper:focus-within {
  border-color: rgba(183, 159, 255, 0.4);
}

.search-icon {
  width: 16px;
  height: 16px;
  color: var(--color-on-surface-variant, #aaabb0);
  flex-shrink: 0;
}

.search-input {
  flex: 1;
  min-width: 0;
  border: none;
  background: transparent;
  color: var(--color-on-surface, #f6f6fc);
  font-size: 13px;
  outline: none;
}

.search-input::placeholder {
  color: var(--color-on-surface-variant, #aaabb0);
  opacity: 0.6;
}

.clear-btn {
  width: 18px;
  height: 18px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: transparent;
  border: none;
  cursor: pointer;
  color: var(--color-on-surface-variant, #aaabb0);
  opacity: 0.6;
  transition: opacity 0.2s ease;
}

.clear-btn:hover {
  opacity: 1;
}

.clear-btn svg {
  width: 14px;
  height: 14px;
}

/* 会话列表 */
.session-list {
  flex: 1;
  overflow-y: auto;
  padding: 0 8px;
}

.session-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  border-radius: 10px;
  cursor: pointer;
  transition: all 0.2s ease;
  margin-bottom: 4px;
}

.session-item:hover {
  background: rgba(70, 72, 77, 0.2);
}

.session-item.active {
  background: rgba(183, 159, 255, 0.15);
}

.session-item.active .session-title {
  color: var(--color-primary, #b79fff);
}

.session-icon {
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(70, 72, 77, 0.3);
  border-radius: 8px;
  color: var(--color-on-surface-variant, #aaabb0);
  flex-shrink: 0;
}

.session-icon svg {
  width: 16px;
  height: 16px;
}

.session-info {
  flex: 1;
  min-width: 0;
  overflow: hidden;
}

.session-title {
  font-size: 13px;
  font-weight: 500;
  color: var(--color-on-surface, #f6f6fc);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.session-meta {
  font-size: 11px;
  color: var(--color-on-surface-variant, #aaabb0);
  opacity: 0.7;
  margin-top: 2px;
}

.session-menu-btn {
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
  opacity: 0;
  transition: all 0.2s ease;
}

.session-item:hover .session-menu-btn {
  opacity: 1;
}

.session-menu-btn:hover {
  background: rgba(70, 72, 77, 0.4);
  color: var(--color-on-surface, #f6f6fc);
}

.session-menu-btn svg {
  width: 16px;
  height: 16px;
}

/* 空状态 */
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 48px 24px;
  color: var(--color-on-surface-variant, #aaabb0);
  opacity: 0.5;
}

.empty-state svg {
  width: 32px;
  height: 32px;
  margin-bottom: 8px;
}

.empty-state span {
  font-size: 12px;
}

/* 底部 */
.sidebar-footer {
  padding: 12px;
  border-top: 1px solid rgba(70, 72, 77, 0.1);
}

.footer-btn {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 10px;
  background: transparent;
  border: 1px solid rgba(70, 72, 77, 0.3);
  border-radius: 8px;
  color: var(--color-on-surface-variant, #aaabb0);
  font-size: 12px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.footer-btn:hover {
  background: rgba(239, 68, 68, 0.1);
  border-color: rgba(239, 68, 68, 0.3);
  color: #ef4444;
}

.footer-btn svg {
  width: 16px;
  height: 16px;
}

/* 右键菜单 */
.context-menu {
  position: fixed;
  background: rgba(29, 32, 37, 0.98);
  border: 1px solid rgba(70, 72, 77, 0.3);
  border-radius: 10px;
  padding: 6px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5);
  z-index: 1000;
  min-width: 160px;
}

.menu-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  border-radius: 8px;
  cursor: pointer;
  font-size: 13px;
  color: var(--color-on-surface, #f6f6fc);
  transition: all 0.15s ease;
}

.menu-item:hover {
  background: rgba(70, 72, 77, 0.3);
}

.menu-item.danger {
  color: #ef4444;
}

.menu-item.danger:hover {
  background: rgba(239, 68, 68, 0.15);
}

.menu-item svg {
  width: 16px;
  height: 16px;
}

.menu-divider {
  height: 1px;
  background: rgba(70, 72, 77, 0.3);
  margin: 6px 0;
}

/* 重命名对话框 */
.rename-dialog-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2000;
}

.rename-dialog {
  background: rgba(29, 32, 37, 0.98);
  border: 1px solid rgba(70, 72, 77, 0.3);
  border-radius: 16px;
  padding: 24px;
  width: 320px;
  box-shadow: 0 16px 64px rgba(0, 0, 0, 0.5);
}

.rename-dialog h4 {
  margin: 0 0 16px 0;
  font-size: 16px;
  font-weight: 600;
  color: var(--color-on-surface, #f6f6fc);
}

.rename-dialog input {
  width: 100%;
  padding: 12px 16px;
  background: rgba(17, 19, 24, 0.6);
  border: 1px solid rgba(70, 72, 77, 0.3);
  border-radius: 10px;
  color: var(--color-on-surface, #f6f6fc);
  font-size: 14px;
  outline: none;
  margin-bottom: 16px;
  box-sizing: border-box;
}

.rename-dialog input:focus {
  border-color: rgba(183, 159, 255, 0.4);
}

.dialog-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}

.btn-secondary,
.btn-primary {
  padding: 10px 20px;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
}

.btn-secondary {
  background: transparent;
  border: 1px solid rgba(70, 72, 77, 0.3);
  color: var(--color-on-surface-variant, #aaabb0);
}

.btn-secondary:hover {
  background: rgba(70, 72, 77, 0.2);
}

.btn-primary {
  background: var(--color-primary, #b79fff);
  border: none;
  color: #361083;
}

.btn-primary:hover {
  filter: brightness(1.1);
}

/* 滚动条 */
.session-list::-webkit-scrollbar {
  width: 4px;
}

.session-list::-webkit-scrollbar-track {
  background: transparent;
}

.session-list::-webkit-scrollbar-thumb {
  background: rgba(70, 72, 77, 0.4);
  border-radius: 2px;
}

.session-list::-webkit-scrollbar-thumb:hover {
  background: rgba(70, 72, 77, 0.6);
}
</style>
