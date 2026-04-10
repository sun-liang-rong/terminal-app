<template>
  <aside class="sidebar" :class="{ collapsed: isCollapsed }" role="navigation" aria-label="主导航">
    <!-- Logo 区域 -->
    <div class="sidebar-header">
      <div class="logo" @click="isCollapsed && toggleCollapse()" role="banner">
        <div class="logo-icon" aria-hidden="true">
          <img src="/favicon.svg" alt="Logo" class="logo-img" />
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
            <PhComputerTower v-if="item.icon === 'ssh'" class="nav-icon" weight="regular" />
            <!-- 本地终端图标 -->
            <PhTerminal v-else-if="item.icon === 'terminal'" class="nav-icon" weight="regular" />
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
        <PhQuestion class="footer-icon" weight="regular" />
        <span>帮助</span>
      </button>
      <button class="footer-item" @click="$emit('tab-change', 'status')">
        <PhCheckCircle class="footer-icon" weight="regular" />
        <span>状态</span>
      </button>
    </div>

    <!-- 折叠按钮 -->
    <button
      class="collapse-btn"
      @click="toggleCollapse"
      :aria-label="isCollapsed ? '展开侧边栏' : '折叠侧边栏'"
    >
      <PhCaretDoubleLeft class="collapse-icon" :style="{ transform: isCollapsed ? 'rotate(180deg)' : 'none' }" weight="bold" />
    </button>
  </aside>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { layoutState, setSidebarCollapsed } from '../utils/layoutStore'
import { PhTerminal, PhComputerTower, PhQuestion, PhCheckCircle, PhCaretDoubleLeft } from '@phosphor-icons/vue'

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

// 检测平台
const isMac = ref(false)

onMounted(async () => {
  if (window.electronAPI?.getPlatform) {
    const plat = await window.electronAPI.getPlatform()
    isMac.value = plat === 'darwin'
  }
})

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
  padding: 12px 16px 24px 16px;
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
  padding: 12px 12px 24px 12px;
}

/* ========== Header (Logo) ========== */
.sidebar-header {
  margin-bottom: 20px;
  padding-left: 8px;
  padding-top: 8px;
  height: 38px;
  display: flex;
  align-items: center;
}

.logo {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
}

.logo-icon {
  width: 20px;
  height: 20px;
  background: linear-gradient(135deg, var(--color-primary, #b79fff) 0%, var(--color-primary-container, #ab8ffe) 100%);
  border-radius: 5px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.logo-img {
  width: 14px;
  height: 14px;
  object-fit: contain;
  border-radius: 3px;
}

.logo-text {
  display: flex;
  flex-direction: column;
  gap: 1px;
}

.logo-title {
  font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Text', var(--font-headline, 'Space Grotesk', sans-serif);
  font-size: 13px;
  font-weight: 600;
  color: var(--color-on-surface, #f6f6fc);
  letter-spacing: -0.2px;
  line-height: 1;
  margin: 0;
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
  flex-shrink: 0;
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
