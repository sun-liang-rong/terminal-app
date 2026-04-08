<template>
  <aside class="sidebar" :class="{ collapsed: isCollapsed }" role="navigation" aria-label="主导航">
    <!-- Logo 区域 -->
    <div class="sidebar-header">
      <div class="logo" @click="isCollapsed && toggleCollapse()" role="banner">
        <div class="logo-icon" aria-hidden="true">
          <svg class="logo-svg" viewBox="0 0 24 24" fill="currentColor">
            <path d="M4 17h6v2H4v-2zm13-9h-10v2h10V8zm0 4H8v2h9v-2zM7 8H4v2h3V8zm0 4H4v2h3v-2z"/>
            <path d="M20 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 14H4V6h16v12z" opacity="0.3"/>
          </svg>
        </div>
        <div class="logo-text" v-if="!isCollapsed">
          <h2 class="logo-title">架构师</h2>
          <p class="logo-subtitle">管理员模式</p>
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
            <svg class="nav-icon" viewBox="0 0 24 24" fill="currentColor" v-if="item.icon === 'dns'">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/>
            </svg>
            <svg class="nav-icon" viewBox="0 0 24 24" fill="currentColor" v-else-if="item.icon === 'terminal'">
              <path d="M20 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 14H4V6h16v12z"/>
              <path d="M6 9l4 3-4 3V9zm6 7h6v-1h-6v1z"/>
            </svg>
            <svg class="nav-icon" viewBox="0 0 24 24" fill="currentColor" v-else-if="item.icon === 'smart_toy'">
              <path d="M19.98 11.62c.01-.09.02-.18.02-.28V7c0-1.1-.9-2-2-2h-4.52L12 2l-2 3H6c-1.1 0-2 .9-2 2v4c0 .1.01.19.02.28C2.55 12.1 1 13.88 1 16c0 2.76 2.24 5 5 5 1.36 0 2.6-.55 3.5-1.44.9.89 2.14 1.44 3.5 1.44s2.6-.55 3.5-1.44c.9.89 2.14 1.44 3.5 1.44 2.76 0 5-2.24 5-5 0-2.12-1.55-3.9-3.52-4.38zM6 17c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm6-5c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm6 5c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2z"/>
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
          <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zM9 17H7v-7h2v7zm4 0h-2V7h2v10zm4 0h-2v-4h2v4z"/>
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
    icon: 'dns'
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

.logo-svg {
  width: 24px;
  height: 24px;
  color: var(--color-on-primary, #361083);
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
