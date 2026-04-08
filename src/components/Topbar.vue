<template>
  <div class="topbar">
    <!-- 左侧：空白区域（macOS 窗口控制按钮区域） -->
    <div class="topbar-left"></div>

    <!-- 中央：搜索入口 -->
    <div class="topbar-center">
      <div class="search-container" @click="openCommandPalette">
        <div class="search-box">
          <div class="search-icon-wrapper">
            <i class="iconfont icon-search"></i>
          </div>
          <span class="search-placeholder">命令、主机、AI...</span>
          <kbd class="search-shortcut">⌘K</kbd>
        </div>
      </div>
    </div>

    <!-- 右侧：工具栏 -->
    <div class="topbar-right">
      <button class="action-btn primary" @click="emit('new-session')" title="新建会话">
        <i class="iconfont icon-plus"></i>
      </button>
      <button class="action-btn" @click="showThemeMenu = !showThemeMenu" title="主题">
        <i class="iconfont icon-theme"></i>
      </button>

      <!-- 主题菜单 -->
      <Transition name="menu-fade">
        <div class="theme-menu" v-show="showThemeMenu">
          <div class="theme-menu-header">
            <span>主题</span>
          </div>
          <div class="theme-grid">
            <div
              class="theme-card"
              v-for="theme in themeList"
              :key="theme.key"
              :class="{ active: currentTheme === theme.key }"
              @click="selectTheme(theme.key)"
            >
              <span class="theme-preview" :style="getThemePreviewStyle(theme.key)"></span>
              <span class="theme-name">{{ theme.name }}</span>
            </div>
          </div>
        </div>
      </Transition>

      <button class="action-btn" @click="emit('open-settings')" title="设置">
        <i class="iconfont icon-settings"></i>
      </button>

      <button class="action-btn" @click="toggleFullscreen" title="全屏">
        <i class="iconfont" :class="isFullscreen ? 'icon-exit-fullscreen' : 'icon-fullscreen'"></i>
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { getThemeList, setTheme } from '../utils/settingsStore'
import { settingsState } from '../utils/settingsStore'
import { terminalThemes, ThemeKey } from '../utils/themes'

const emit = defineEmits(['open-settings', 'open-palette', 'new-session'])

const showThemeMenu = ref(false)
const isFullscreen = ref(false)
const themeList = getThemeList()

// 使用响应式状态获取当前主题
const currentTheme = computed(() => settingsState.theme)

// 打开命令面板
const openCommandPalette = () => {
  emit('open-palette')
}

// 切换全屏
const toggleFullscreen = () => {
  if (document.fullscreenElement) {
    document.exitFullscreen()
    isFullscreen.value = false
  } else {
    document.documentElement.requestFullscreen()
    isFullscreen.value = true
  }
}

// 获取主题预览样式
const getThemePreviewStyle = (themeKey: string) => {
  const theme = terminalThemes[themeKey as ThemeKey]
  if (!theme) return {}
  return {
    background: `linear-gradient(135deg, ${theme.background} 0%, ${theme.black} 100%)`,
    borderLeft: `3px solid ${theme.cyan}`,
    boxShadow: `inset 0 0 0 1px ${theme.foreground}20`
  }
}

// 选择主题
const selectTheme = (themeKey: string) => {
  setTheme(themeKey)
  showThemeMenu.value = false
}

// 点击外部关闭菜单
const handleClickOutside = (e: MouseEvent) => {
  if (!(e.target as HTMLElement).closest('.theme-menu') && !(e.target as HTMLElement).closest('.action-btn')) {
    showThemeMenu.value = false
  }
}

// 监听全屏变化
const handleFullscreenChange = () => {
  isFullscreen.value = !!document.fullscreenElement
}

onMounted(() => {
  document.addEventListener('click', handleClickOutside)
  document.addEventListener('fullscreenchange', handleFullscreenChange)
})

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside)
  document.removeEventListener('fullscreenchange', handleFullscreenChange)
})
</script>

<style scoped>
.topbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  min-height: 52px;
  background: transparent;
  padding: 0 12px;
  -webkit-app-region: drag;
}

/* ========== 三栏布局 ========== */
.topbar-left {
  flex: 1;
  min-width: 80px;
}

.topbar-center {
  display: flex;
  align-items: center;
  justify-content: center;
}

.topbar-right {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 8px;
  -webkit-app-region: no-drag;
}

/* ========== 搜索框 ========== */
.search-container {
  -webkit-app-region: no-drag;
}

.search-box {
  display: flex;
  align-items: center;
  width: 280px;
  min-height: 44px;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.05);
  border-radius: 8px;
  padding: 0 12px;
  gap: 8px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.search-box:hover {
  background: rgba(255, 255, 255, 0.05);
  border-color: rgba(0, 240, 255, 0.12);
}

.search-icon-wrapper {
  display: flex;
  align-items: center;
  justify-content: center;
  min-width: 20px;
  min-height: 20px;
  background: rgba(0, 240, 255, 0.1);
  border-radius: 5px;
  flex-shrink: 0;
}

.search-icon-wrapper .iconfont {
  font-size: 11px;
  color: #00f0ff;
}

.search-placeholder {
  flex: 1;
  color: #5a5a68;
  font-size: 12px;
}

.search-shortcut {
  padding: 4px 8px;
  background: rgba(0, 240, 255, 0.08);
  border-radius: 4px;
  font-size: 10px;
  color: #00f0ff;
  font-family: inherit;
  font-weight: 500;
  min-height: 20px;
}

/* ========== 操作按钮 ========== */
.action-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  min-width: 44px;
  min-height: 44px;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.05);
  border-radius: 8px;
  color: #6b6b78;
  cursor: pointer;
  transition: all 0.2s ease;
  position: relative;
}

.action-btn:hover {
  background: rgba(255, 255, 255, 0.06);
  color: #a0a0a8;
}

.action-btn.primary {
  background: rgba(0, 240, 255, 0.1);
  border-color: rgba(0, 240, 255, 0.15);
  color: #00f0ff;
}

.action-btn.primary:hover {
  background: rgba(0, 240, 255, 0.15);
  border-color: rgba(0, 240, 255, 0.25);
}

.action-btn .iconfont {
  font-size: 16px;
}

/* ========== 主题菜单 ========== */
.theme-menu {
  position: absolute;
  top: 48px;
  right: 0;
  width: 200px;
  background: #14141e;
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 10px;
  padding: 8px;
  z-index: var(--z-dropdown, 1000);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.4);
}

.theme-menu-header {
  font-size: 10px;
  color: #6b6b78;
  padding: 6px 8px;
  letter-spacing: 0.3px;
  margin-bottom: 6px;
}

.theme-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 6px;
}

.theme-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: 10px;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s ease;
  border: 1px solid transparent;
  min-height: 44px;
}

.theme-card:hover {
  background: rgba(255, 255, 255, 0.03);
}

.theme-card.active {
  background: rgba(0, 240, 255, 0.08);
  border-color: rgba(0, 240, 255, 0.15);
}

.theme-preview {
  width: 100%;
  height: 24px;
  border-radius: 4px;
}

.theme-name {
  font-size: 10px;
  color: #8b8b9a;
}

.theme-card.active .theme-name {
  color: #00f0ff;
}

/* ========== 动画 ========== */
.menu-fade-enter-active,
.menu-fade-leave-active {
  transition: all 0.15s ease;
}

.menu-fade-enter-from,
.menu-fade-leave-to {
  opacity: 0;
  transform: translateY(-4px);
}
</style>