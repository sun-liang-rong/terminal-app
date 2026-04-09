<template>
  <aside class="sidebar" :class="{ collapsed: isCollapsed }" role="navigation" aria-label="主导航">
    <!-- Logo 区域 -->
    <div class="sidebar-header">
      <div class="logo" @click="isCollapsed && toggleCollapse()" role="banner">
        <div class="logo-icon" aria-hidden="true">
          <img src="/icon.png" alt="Logo" class="logo-img" />
        </div>
        <div class="logo-text" v-if="!isCollapsed">
          <h2 class="logo-title">终端MVP</h2>
        </div>
      </div>
    </div>

    <!-- 导航菜单 -->
    <nav class="nav-menu" role="menubar" aria-label="主导航菜单">
      <!-- 核心工具 -->
      <div class="nav-section" role="group" aria-label="核心工具">
        <div class="section-label" v-if="!isCollapsed">核心工具</div>
        <button
          v-for="(item) in navItems"
          :key="item.id"
          class="nav-item"
          :class="{ active: activeTab === item.id }"
          role="menuitem"
          :aria-label="item.label"
          :aria-current="activeTab === item.id ? 'page' : undefined"
          @click="$emit('tab-change', item.id)"
        >
          <div class="nav-icon-wrapper">
            <!-- SSH 连接图标 -->
            <svg class="nav-icon" viewBox="0 0 24 24" fill="currentColor" v-if="item.icon === 'ssh'">
              <path d="M20 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 14H4V6h16v12z"/>
              <path d="M6 9l4 3-4 3V9zm6 7h6v-1h-6v1zm-2-4H8v2h2v-2z"/>
              <circle cx="18" cy="8" r="1.5" fill="currentColor"/>
            </svg>
            <!-- 本地终端图标 -->
            <svg class="nav-icon" viewBox="0 0 24 24" fill="currentColor" v-else-if="item.icon === 'terminal'">
              <path d="M20 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 14H4V6h16v12z"/>
              <path d="M6 9l4 3-4 3V9zm6 7h6v-1h-6v1z"/>
            </svg>
            <!-- AI 助手图标 -->
            <svg class="nav-icon" viewBox="0 0 24 24" fill="currentColor" v-else-if="item.icon === 'ai'">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z"/>
              <circle cx="12" cy="10" r="2"/>
              <path d="M12 13c-2.33 0-4.31 1.46-5.11 3.5h10.22c-.8-2.04-2.78-3.5-5.11-3.5z" opacity="0.6"/>
            </svg>
          </div>
          <Transition name="nav-label">
            <span class="nav-label" v-if="!isCollapsed">{{ item.label }}</span>
          </Transition>
        </button>
      </div>
    </nav>

    <!-- 底部操作 -->
    <div class="sidebar-footer" v-if="!isCollapsed">
      <button class="footer-item" @click="$emit('tab-change', 'help')">
        <svg class="footer-icon" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 17h-2v-2h2v2zm2.07-7.75l-.9.92C13.45 12.9 13 13.5 13 15h-2v-.5c0-1.1.45-2.1 1.17-2.83l1.24-1.26c.37-.36.59-.86.59-1.41 0-1.1-.9-2-2-2s-2 .9-2 2H8c0-2.21 1.79-4 4-4s4 1.79 4 4c0 .88-.36 1.68-.93 2.25z"/>
        </svg>
        <span>帮助</span>
      </button>
      <button class="footer-item" @click="$emit('tab-change', 'status')">
        <svg class="footer-icon" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
        </svg>
        <span>状态</span>
      </button>
    </div>

    <!-- 折叠按钮 -->
    <button
      class="collapse-btn"
      @click="toggleCollapse"
      :aria-label="isCollapsed ? '展开侧边栏' : '折叠侧边栏'"
    >
      <svg class="collapse-icon" viewBox="0 0 24 24" fill="currentColor" :style="{ transform: isCollapsed ? 'rotate(180deg)' : 'none' }">
        <path d="M11 17l-5-5 5-5v10zm7 0l-5-5 5-5v10z"/>
      </svg>
    </button>
  </aside>
</template>

<script setup>
import { ref, computed } from 'vue'
import { layoutState, setSidebarCollapsed } from '../utils/layoutStore'

const props = defineProps({
  activeTab: {
    type: String,
    default: 'terminal'
  },
  sshCount: {
    type: Number,
    default: 0
  }
})

const emit = defineEmits(['tab-change'])

// 计算实际折叠状态
const isCollapsed = computed(() => {
  return layoutState.value.sidebarCollapsed
})

const toggleCollapse = () => {
  setSidebarCollapsed(!layoutState.value.sidebarCollapsed)
}

// 导航项
const navItems = ref([
  {
    id: 'ssh',
    label: 'SSH 连接',
    icon: 'ssh'
  },
  {
    id: 'terminal',
    label: '本地终端',
    icon: 'terminal'
  }
])
</script>

<style scoped>
.sidebar {
  display: flex;
  flex-direction: column;
  width: 256px;
  min-width: 256px;
  height: 100vh;
  background: rgba(17, 19, 24, 0.6);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  padding: 24px 16px;
  position: fixed;
  left: 0;
  top: 0;
  z-index: 50;
  transition: width 0.3s ease, min-width 0.3s ease, padding 0.3s ease;
  box-shadow: 0 0 40px rgba(0, 0, 0, 0.4);
}

.sidebar.collapsed {
  width: 72px;
  min-width: 72px;
  padding: 24px 12px;
}

/* ========== Header ========== */
.sidebar-header {
  margin-bottom: 32px;
  padding-left: 8px;
}

.logo {
  display: flex;
  align-items: center;
  gap: 12px;
  cursor: pointer;
}

.logo-icon {
  width: 40px;
  height: 40px;
  background: linear-gradient(135deg, var(--color-primary, #b79fff) 0%, var(--color-primary-container, #ab8ffe) 100%);
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  box-shadow: 0 0 20px rgba(183, 159, 255, 0.2);
}

.logo-img {
  width: 28px;
  height: 28px;
  object-fit: contain;
  border-radius: 6px;
}

.logo-text {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.logo-title {
  font-family: var(--font-headline, 'Space Grotesk', sans-serif);
  font-size: 14px;
  font-weight: 700;
  color: var(--color-on-surface, #f6f6fc);
  letter-spacing: -0.3px;
  line-height: 1;
  margin: 0;
}

.logo-subtitle {
  font-family: var(--font-mono, 'Fira Code', monospace);
  font-size: 10px;
  text-transform: uppercase;
  letter-spacing: 0.15em;
  color: var(--color-secondary, #2db7f2);
  margin: 0;
  line-height: 1;
}

/* ========== Navigation ========== */
.nav-menu {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.nav-section {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.section-label {
  font-size: 10px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.15em;
  color: var(--color-on-surface-variant, #aaabb0);
  padding: 0 12px 8px;
}

/* ========== Nav Items ========== */
.nav-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 12px;
  border-radius: 10px;
  cursor: pointer;
  transition: all 0.2s ease;
  position: relative;
  color: var(--color-on-surface-variant, #aaabb0);
  background: transparent;
  border: none;
  font-family: inherit;
  text-align: left;
  width: 100%;
}

.sidebar.collapsed .nav-item {
  justify-content: center;
  padding: 10px;
}

.nav-item:hover {
  background: rgba(29, 32, 37, 0.5);
  color: var(--color-on-surface, #f6f6fc);
}

.nav-item.active {
  background: rgba(29, 32, 37, 0.8);
  color: var(--color-on-surface, #f6f6fc);
  box-shadow: 0 0 10px rgba(45, 183, 242, 0.15), inset 0 0 0 1px rgba(45, 183, 242, 0.2);
}

.nav-icon-wrapper {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  flex-shrink: 0;
}

.nav-icon {
  width: 20px;
  height: 20px;
  opacity: 0.9;
}

.nav-label {
  font-size: 13px;
  font-weight: 500;
  letter-spacing: 0.1px;
  white-space: nowrap;
  font-family: var(--font-body, 'Inter', sans-serif);
}

/* ========== Footer ========== */
.sidebar-footer {
  margin-top: auto;
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding-top: 16px;
  border-top: 1px solid rgba(70, 72, 77, 0.15);
}

.footer-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 8px 12px;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.15s ease;
  color: var(--color-on-surface-variant, #aaabb0);
  background: transparent;
  border: none;
  font-family: inherit;
  text-align: left;
  font-size: 13px;
}

.footer-item:hover {
  color: var(--color-on-surface, #f6f6fc);
}

.footer-icon {
  width: 20px;
  height: 20px;
  opacity: 0.8;
}

/* ========== Collapse Button ========== */
.collapse-btn {
  position: absolute;
  right: -12px;
  top: 50%;
  transform: translateY(-50%);
  width: 24px;
  height: 48px;
  background: rgba(35, 38, 44, 0.8);
  border: 1px solid rgba(70, 72, 77, 0.3);
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  color: var(--color-on-surface-variant, #aaabb0);
  transition: all 0.15s ease;
  opacity: 0;
}

.sidebar:hover .collapse-btn {
  opacity: 1;
}

.collapse-btn:hover {
  background: rgba(45, 183, 242, 0.1);
  border-color: rgba(45, 183, 242, 0.3);
  color: var(--color-secondary, #2db7f2);
}

.collapse-icon {
  width: 16px;
  height: 16px;
  transition: transform 0.2s ease;
}

/* ========== Transitions ========== */
.nav-label-enter-active,
.nav-label-leave-active {
  transition: all 0.2s ease;
}

.nav-label-enter-from,
.nav-label-leave-to {
  opacity: 0;
  transform: translateX(-6px);
}
</style>
