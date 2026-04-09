<template>
  <header class="topbar">
    <!-- 左侧：留白（窗口控制区域） -->
    <div class="topbar-left"></div>

    <!-- 右侧：工具栏 -->
    <div class="topbar-right">
      <!-- 切换侧边栏按钮 -->
      <button class="tool-btn" @click="toggleSidebar" title="切换左侧边栏">
        <svg class="tool-icon" viewBox="0 0 24 24" fill="currentColor">
          <path d="M4 6h16v2H4zm0 5h16v2H4zm0 5h16v2H4z"/>
        </svg>
      </button>

      <!-- 切换AI助手按钮 -->
      <button class="tool-btn" @click="toggleAiPanel" title="切换AI助手">
        <svg class="tool-icon" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z"/>
          <circle cx="12" cy="10" r="2"/>
          <path d="M12 13c-2.33 0-4.31 1.46-5.11 3.5h10.22c-.8-2.04-2.78-3.5-5.11-3.5z" opacity="0.6"/>
        </svg>
      </button>

      <!-- 设置按钮 -->
      <button class="tool-btn" @click="emit('open-settings')" title="设置">
        <svg class="tool-icon" viewBox="0 0 24 24" fill="currentColor">
          <path d="M19.14 12.94c.04-.3.06-.61.06-.94 0-.32-.02-.64-.07-.94l2.03-1.58c.18-.14.23-.41.12-.61l-1.92-3.32c-.12-.22-.37-.29-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54c-.04-.24-.24-.41-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L4.09 8.77c-.12.21-.08.47.12.61l2.03 1.58c-.05.3-.09.63-.09.94s.02.64.07.94l-2.03 1.58c-.18.14-.23.41-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z"/>
        </svg>
      </button>

      <!-- 用户头像 -->
      <div class="user-avatar">
        <div class="avatar-placeholder">
          <svg viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
          </svg>
        </div>
      </div>

      <!-- 窗口控制按钮 -->
      <div class="window-controls">
        <button class="window-btn minimize" @click="minimizeWindow" title="最小化">
          <svg viewBox="0 0 24 24" fill="currentColor">
            <path d="M20 14H4v-2h16v2z"/>
          </svg>
        </button>
        <button class="window-btn maximize" @click="maximizeWindow" title="最大化/还原">
          <svg v-if="isMaximized" viewBox="0 0 24 24" fill="currentColor">
            <path d="M5 16h3v3h2v-5H5v2zm3-8H5v2h5V5H8v3zm6 11h2v-3h3v-2h-5v5zm2-11V5h-2v5h5V8h-3z"/>
          </svg>
          <svg v-else viewBox="0 0 24 24" fill="currentColor">
            <path d="M7 14H5v5h5v-2H7v-3zm-2-4h2V7h3V5H5v5zm12 7h-3v2h5v-5h-2v3zM14 5v2h3v3h2V5h-5z"/>
          </svg>
        </button>
        <button class="window-btn close" @click="closeWindow" title="关闭">
          <svg viewBox="0 0 24 24" fill="currentColor">
            <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
          </svg>
        </button>
      </div>
    </div>
  </header>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { toggleSidebarCollapsed, toggleAssistantPanel } from '../utils/layoutStore'

const emit = defineEmits(['open-settings', 'open-palette', 'new-session', 'switch-tab'])

// 窗口最大化状态
const isMaximized = ref(false)
let stateListenerId: number | null = null

// 切换侧边栏
const toggleSidebar = () => {
  toggleSidebarCollapsed()
}

// 切换AI面板
const toggleAiPanel = () => {
  toggleAssistantPanel()
}

// 窗口控制函数
const minimizeWindow = async () => {
  if (window.electronAPI?.windowMinimize) {
    await window.electronAPI.windowMinimize()
  }
}

const maximizeWindow = async () => {
  if (window.electronAPI?.windowMaximize) {
    await window.electronAPI.windowMaximize()
  }
}

const closeWindow = async () => {
  if (window.electronAPI?.windowClose) {
    await window.electronAPI.windowClose()
  }
}

// 监听窗口状态变化
onMounted(async () => {
  // 获取初始窗口状态
  if (window.electronAPI?.isMaximized) {
    isMaximized.value = await window.electronAPI.isMaximized()
  }

  // 监听窗口状态变化
  if (window.electronAPI?.onWindowStateChange) {
    stateListenerId = window.electronAPI.onWindowStateChange((state) => {
      isMaximized.value = state.maximized
    })
  }
})

onUnmounted(() => {
  // 移除监听器
  if (stateListenerId !== null && window.electronAPI?.removeWindowStateListener) {
    window.electronAPI.removeWindowStateListener(stateListenerId)
  }
})
</script>

<style scoped>
.topbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 48px;
  background: var(--color-surface, #0c0e12);
  border-bottom: 1px solid rgba(70, 72, 77, 0.1);
  padding: 0 16px;
  z-index: 40;
}

/* ========== 左侧区域 ========== */
.topbar-left {
  flex: 1;
  min-width: 80px;
  -webkit-app-region: drag;
  height: 100%;
  display: flex;
  align-items: center;
}

/* ========== 右侧区域 ========== */
.topbar-right {
  display: flex;
  align-items: center;
  gap: 8px;
  -webkit-app-region: no-drag;
}

/* 工具按钮 */
.tool-btn {
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: transparent;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  color: var(--color-on-surface-variant, #aaabb0);
  transition: all 0.15s ease;
}

.tool-btn:hover {
  background: rgba(29, 32, 37, 0.6);
  color: var(--color-on-surface, #f6f6fc);
}

.tool-btn:active {
  transform: scale(0.95);
}

.tool-icon {
  width: 20px;
  height: 20px;
}

/* 用户头像 */
.user-avatar {
  margin-left: 8px;
}

.avatar-placeholder {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background: rgba(29, 32, 37, 0.8);
  border: 1px solid rgba(70, 72, 77, 0.3);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  color: var(--color-on-surface-variant, #aaabb0);
  transition: all 0.15s ease;
}

.avatar-placeholder:hover {
  border-color: rgba(183, 159, 255, 0.4);
  color: var(--color-primary, #b79fff);
}

.avatar-placeholder svg {
  width: 18px;
  height: 18px;
}

/* ========== 窗口控制按钮 ========== */
.window-controls {
  display: flex;
  align-items: center;
  gap: 0;
  margin-left: 12px;
  padding-left: 12px;
  border-left: 1px solid rgba(70, 72, 77, 0.3);
}

.window-btn {
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: transparent;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  color: var(--color-on-surface-variant, #aaabb0);
  transition: all 0.15s ease;
}

.window-btn:hover {
  background: rgba(255, 255, 255, 0.1);
  color: var(--color-on-surface, #f6f6fc);
}

.window-btn.close:hover {
  background: #e81123;
  color: white;
}

.window-btn svg {
  width: 14px;
  height: 14px;
}
</style>
