<template>
  <header class="topbar">
    <!-- 左侧：拖拽区域 -->
    <div class="topbar-left" :class="{ 'mac-logo': isMac }">
      <!-- Logo 已移至侧边栏 -->
    </div>

    <!-- 右侧：工具栏 -->
    <div class="topbar-right">
      <!-- 切换侧边栏按钮 -->
      <button class="tool-btn" @click="toggleSidebar" title="切换左侧边栏">
        <PhList class="tool-icon" weight="regular" />
      </button>

      <!-- 切换AI助手按钮 -->
      <button class="tool-btn" @click="toggleAiPanel" title="切换AI助手">
        <PhRobot class="tool-icon" weight="regular" />
      </button>

      <!-- 设置按钮 -->
      <button class="tool-btn" @click="emit('open-settings')" title="设置">
        <PhGear class="tool-icon" weight="regular" />
      </button>

      <!-- 用户头像 -->
      <div class="user-avatar">
        <div class="avatar-placeholder">
          <PhUser weight="regular" />
        </div>
      </div>

      <!-- 窗口控制按钮（仅 Windows） -->
      <div v-if="isWindows" class="window-controls">
        <button class="window-btn minimize" @click="minimizeWindow" title="最小化">
          <PhMinus weight="regular" />
        </button>
        <button class="window-btn maximize" @click="maximizeWindow" title="最大化/还原">
          <PhCopy v-if="isMaximized" weight="regular" />
          <PhSquare v-else weight="regular" />
        </button>
        <button class="window-btn close" @click="closeWindow" title="关闭">
          <PhX weight="regular" />
        </button>
      </div>
    </div>
  </header>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { toggleSidebarCollapsed, toggleAssistantPanel } from '../utils/layoutStore'
import { PhList, PhRobot, PhGear, PhUser, PhMinus, PhSquare, PhCopy, PhX } from '@phosphor-icons/vue'

const emit = defineEmits(['open-settings', 'open-palette', 'new-session', 'switch-tab'])

// 检测平台
const platform = ref('unknown')
const isMac = ref(false)
const isWindows = ref(false)

// 窗口最大化状态
const isMaximized = ref(false)
let stateListenerId: number | null = null

onMounted(async () => {
  // 获取平台信息
  if (window.electronAPI?.getPlatform) {
    const plat = await window.electronAPI.getPlatform()
    platform.value = plat
    isMac.value = plat === 'darwin'
    isWindows.value = plat === 'win32'
  }

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

// 切换侧边栏
const toggleSidebar = () => {
  toggleSidebarCollapsed()
}

// 切换AI面板
const toggleAiPanel = () => {
  toggleAssistantPanel()
}

// 窗口控制函数（仅 Windows）
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

/* Mac 系统下拖拽区域向右偏移，给系统按钮留空间 */
.topbar-left.mac-logo {
  padding-left: 72px;
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

.avatar-placeholder :deep(svg) {
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

.window-btn :deep(svg) {
  width: 14px;
  height: 14px;
}
</style>
