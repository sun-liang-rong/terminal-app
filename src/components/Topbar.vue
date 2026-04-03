<template>
  <div class="topbar">
    <div class="topbar-left">
    </div>

    <div class="search-container">
      <div class="search-box">
        <i class="iconfont icon-search search-icon"></i>
        <input type="text" placeholder="搜索进程、命令、主机..." class="search-input" />
        <div class="search-hint">⌘K</div>
      </div>
    </div>

    <div class="topbar-right">
      <!-- 主题选择器 -->
      <div class="theme-selector">
        <button class="action-btn theme-btn" @click="showThemeMenu = !showThemeMenu" title="切换主题">
          <i class="iconfont icon-theme"></i>
        </button>
        <div class="theme-menu" v-show="showThemeMenu">
          <div class="theme-menu-header">终端主题</div>
          <div
            class="theme-option"
            v-for="theme in themeList"
            :key="theme.key"
            :class="{ active: currentTheme === theme.key }"
            @click="selectTheme(theme.key)"
          >
            <span class="theme-preview" :style="getThemePreviewStyle(theme.key)"></span>
            <span class="theme-name">{{ theme.name }}</span>
            <span class="theme-check" v-if="currentTheme === theme.key">✓</span>
          </div>
        </div>
      </div>
      <button class="action-btn" title="通知">
        <i class="iconfont icon-notification"></i>
        <span class="notification-dot"></span>
      </button>
      <button class="action-btn" title="设置" @click="emit('open-settings')">
        <i class="iconfont icon-settings"></i>
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { getThemeList, setTheme, getCurrentThemeName } from '../utils/settingsStore'
import { terminalThemes, ThemeKey } from '../utils/themes'

const emit = defineEmits(['open-settings'])

const showThemeMenu = ref(false)
const themeList = getThemeList()
const currentTheme = ref(getCurrentThemeName())

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
  currentTheme.value = themeKey
  showThemeMenu.value = false
}

// 点击外部关闭菜单
const handleClickOutside = (e: MouseEvent) => {
  if (!(e.target as HTMLElement).closest('.theme-selector')) {
    showThemeMenu.value = false
  }
}

onMounted(() => {
  document.addEventListener('click', handleClickOutside)
})

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside)
})
</script>

<style scoped>
.topbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 52px;
  background: linear-gradient(180deg, #151520 0%, #0f0f16 100%);
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
  padding: 0 20px;
  -webkit-app-region: drag;
  position: relative;
}

.topbar::before {
  content: '';
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  height: 1px;
  background: linear-gradient(90deg, transparent, rgba(0, 240, 255, 0.1), transparent);
  pointer-events: none;
}

.topbar-left,
.topbar-right {
  display: flex;
  align-items: center;
  gap: 12px;
  -webkit-app-region: no-drag;
}

.search-container {
  flex: 1;
  display: flex;
  justify-content: center;
  max-width: 520px;
  -webkit-app-region: no-drag;
}

.search-box {
  display: flex;
  align-items: center;
  width: 100%;
  height: 36px;
  background: linear-gradient(135deg, rgba(13, 13, 18, 0.8) 0%, rgba(18, 18, 26, 0.8) 100%);
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 10px;
  padding: 0 14px;
  gap: 10px;
  transition: all 0.2s ease;
  position: relative;
  overflow: hidden;
}

.search-box::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 1px;
  background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.1), transparent);
  pointer-events: none;
}

.search-box:focus-within {
  border-color: rgba(0, 240, 255, 0.3);
  box-shadow: 0 0 0 3px rgba(0, 240, 255, 0.1), 0 0 20px rgba(0, 240, 255, 0.1);
  background: linear-gradient(135deg, rgba(13, 13, 18, 0.95) 0%, rgba(18, 18, 26, 0.95) 100%);
}

.search-icon {
  font-size: 14px;
  color: #6b6b78;
  transition: color 0.2s ease;
}

.search-box:focus-within .search-icon {
  color: #00f0ff;
}

.search-input {
  flex: 1;
  background: transparent;
  border: none;
  outline: none;
  color: #e5e5e7;
  font-size: 13px;
  letter-spacing: 0.3px;
}

.search-input::placeholder {
  color: #5a5a68;
}

.search-hint {
  font-size: 11px;
  color: #5a5a68;
  padding: 3px 8px;
  background: rgba(255, 255, 255, 0.04);
  border-radius: 4px;
  border: 1px solid rgba(255, 255, 255, 0.06);
  letter-spacing: 0.5px;
}

.action-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.05);
  border-radius: 8px;
  color: #8b8b9a;
  cursor: pointer;
  transition: all 0.2s ease;
  position: relative;
}

.action-btn:hover {
  background: rgba(0, 240, 255, 0.08);
  color: #00f0ff;
  border-color: rgba(0, 240, 255, 0.15);
  transform: translateY(-1px);
}

.action-btn .iconfont {
  font-size: 18px;
}

.notification-dot {
  position: absolute;
  top: 8px;
  right: 8px;
  width: 8px;
  height: 8px;
  background: linear-gradient(135deg, #ff5f57 0%, #ff3b30 100%);
  border-radius: 50%;
  border: 1.5px solid #0f0f16;
  box-shadow: 0 0 8px rgba(255, 95, 87, 0.6);
  animation: pulse 2s ease-in-out infinite;
}

@keyframes pulse {
  0%, 100% {
    transform: scale(1);
    opacity: 1;
  }
  50% {
    transform: scale(1.2);
    opacity: 0.8;
  }
}

/* 主题选择器 */
.theme-selector {
  position: relative;
}

.theme-btn {
  position: relative;
}

.theme-menu {
  position: absolute;
  top: 44px;
  right: 0;
  width: 200px;
  background: linear-gradient(135deg, #151520 0%, #0f0f16 100%);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 12px;
  padding: 8px;
  z-index: 100;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4), 0 0 0 1px rgba(0, 240, 255, 0.05);
}

.theme-menu::before {
  content: '';
  position: absolute;
  top: -6px;
  right: 12px;
  width: 12px;
  height: 12px;
  background: #151520;
  border-left: 1px solid rgba(255, 255, 255, 0.08);
  border-top: 1px solid rgba(255, 255, 255, 0.08);
  transform: rotate(45deg);
}

.theme-menu-header {
  font-size: 11px;
  color: #6b6b78;
  padding: 8px 12px;
  letter-spacing: 0.5px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
  margin-bottom: 6px;
}

.theme-option {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s ease;
  color: #8b8b9a;
}

.theme-option:hover {
  background: rgba(255, 255, 255, 0.04);
  color: #e5e5e7;
}

.theme-option.active {
  background: rgba(0, 240, 255, 0.08);
  color: #00f0ff;
}

.theme-preview {
  width: 24px;
  height: 24px;
  border-radius: 6px;
  flex-shrink: 0;
}

.theme-name {
  flex: 1;
  font-size: 13px;
}

.theme-check {
  font-size: 12px;
  color: #00f0ff;
}
</style>
