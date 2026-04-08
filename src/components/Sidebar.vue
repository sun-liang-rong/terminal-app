<template>
  <aside class="sidebar" :class="{ collapsed: isCollapsed }" role="navigation" aria-label="主导航">
    <!-- Logo 区域 -->
    <div class="sidebar-header">
      <div class="logo" @click="isCollapsed && toggleCollapse()" role="banner">
        <div class="logo-icon" aria-hidden="true">
          <div class="logo-shine"></div>
        </div>
        <Transition name="logo-text">
          <div class="logo-text" v-if="!isCollapsed">
            神经<span class="logo-accent">终端</span>
          </div>
        </Transition>
      </div>
      <!-- 折叠按钮 -->
      <button
        class="collapse-btn"
        @click="toggleCollapse"
        :aria-label="isCollapsed ? '展开侧边栏' : '折叠侧边栏'"
        :aria-expanded="!isCollapsed"
      >
        <i class="iconfont" :class="isCollapsed ? 'icon-expand' : 'icon-collapse'" aria-hidden="true"></i>
      </button>
    </div>

    <!-- 导航菜单 - 按优先级排序 -->
    <nav class="nav-menu" role="menubar" aria-label="主导航菜单">
      <!-- 核心功能 -->
      <div class="nav-section core" role="group" aria-label="核心功能">
        <button
          v-for="(item, index) in coreItems"
          :key="item.id"
          class="nav-item core-item"
          :class="{ active: activeTab === item.id, 'ai-core': item.isAI }"
          role="menuitem"
          :aria-label="item.label"
          :aria-current="activeTab === item.id ? 'page' : undefined"
          :tabindex="activeTab === item.id ? 0 : -1"
          @click="$emit('tab-change', item.id)"
          @keydown="handleNavKeydown($event, index, coreItems.length, 'core')"
          @mouseenter="hoveredItem = item.id"
          @mouseleave="hoveredItem = null"
        >
          <div class="nav-indicator" :class="{ ai: item.isAI }" v-if="activeTab === item.id" aria-hidden="true"></div>
          <div class="nav-icon-wrapper" :class="{ 'ai-icon': item.isAI }">
            <i class="iconfont nav-icon" :class="item.icon" aria-hidden="true"></i>
          </div>
          <Transition name="nav-label">
            <div class="nav-content" v-if="!isCollapsed">
              <span class="nav-label">{{ item.label }}</span>
              <span class="nav-desc">{{ item.desc }}</span>
            </div>
          </Transition>
          <Transition name="tooltip">
            <div class="nav-tooltip" :class="{ ai: item.isAI }" v-if="isCollapsed && hoveredItem === item.id" role="tooltip">
              {{ item.label }}
            </div>
          </Transition>
        </button>
      </div>

      <!-- 辅助功能 -->
      <Transition name="section-fade">
        <div class="nav-section secondary" v-if="!isCollapsed" role="group" aria-label="连接功能">
          <div class="section-label" id="secondary-label">连接</div>
          <button
            v-for="(item, index) in secondaryItems"
            :key="item.id"
            class="nav-item secondary-item"
            :class="{ active: activeTab === item.id }"
            role="menuitem"
            :aria-label="item.label + (item.id === 'ssh' && sshCount > 0 ? `, ${sshCount} 个连接` : '')"
            :aria-current="activeTab === item.id ? 'page' : undefined"
            :aria-describedby="item.id === 'ssh' && sshCount > 0 ? 'ssh-count' : undefined"
            :tabindex="activeTab === item.id ? 0 : -1"
            @click="$emit('tab-change', item.id)"
            @keydown="handleNavKeydown($event, index, secondaryItems.length, 'secondary')"
            @mouseenter="hoveredItem = item.id"
            @mouseleave="hoveredItem = null"
          >
            <div class="nav-indicator" v-if="activeTab === item.id" aria-hidden="true"></div>
            <div class="nav-icon-wrapper">
              <i class="iconfont nav-icon" :class="item.icon" aria-hidden="true"></i>
              <div class="connection-count" v-if="item.id === 'ssh' && sshCount > 0" id="ssh-count" aria-label="SSH 连接数">
                {{ sshCount }}
              </div>
            </div>
            <div class="nav-content">
              <span class="nav-label">{{ item.label }}</span>
            </div>
          </button>
        </div>
      </Transition>
    </nav>

    <!-- 底部 AI 状态卡片 -->
    <div class="sidebar-footer">
      <!-- 展开状态：AI 状态卡片 -->
      <Transition name="ai-card">
        <div class="ai-card" v-if="!isCollapsed">
          <div class="ai-card-header">
            <div class="ai-status-indicator" :class="aiReady ? 'ready' : 'offline'"></div>
            <span class="ai-card-title">AI 引擎</span>
            <button class="ai-switch-btn" @click="showModelSelector = !showModelSelector">
              <i class="iconfont icon-switch"></i>
            </button>
          </div>
          <div class="ai-card-body">
            <div class="ai-model-info">
              <span class="ai-model-name">{{ aiModel || '未配置' }}</span>
              <span class="ai-status-text" :class="aiReady ? 'ready' : 'offline'">
                {{ aiReady ? '运行中' : '离线' }}
              </span>
            </div>
            <div class="ai-stats" v-if="aiReady">
              <div class="stat-item">
                <span class="stat-label">响应</span>
                <span class="stat-value">{{ avgResponseTime }}ms</span>
              </div>
              <div class="stat-item">
                <span class="stat-label">请求</span>
                <span class="stat-value">{{ requestCount }}</span>
              </div>
            </div>
          </div>
          <!-- 快捷操作 -->
          <div class="ai-card-actions">
            <button class="ai-action-btn" @click="$emit('tab-change', 'settings')">
              <i class="iconfont icon-settings"></i>
              <span>配置</span>
            </button>
            <button class="ai-action-btn primary" @click="$emit('tab-change', 'assistant')">
              <i class="iconfont icon-ai"></i>
              <span>对话</span>
            </button>
          </div>
        </div>
      </Transition>

      <!-- 折叠状态 -->
      <Transition name="ai-card">
        <div class="ai-mini" v-if="isCollapsed">
          <div class="ai-mini-icon" :class="aiReady ? 'ready' : 'offline'">
            <i class="iconfont icon-ai"></i>
          </div>
          <div class="ai-mini-tooltip">
            <span>{{ aiReady ? 'AI 运行中' : 'AI 离线' }}</span>
            <span class="ai-mini-model">{{ aiModel }}</span>
          </div>
        </div>
      </Transition>

      <!-- 系统管理 - 设置入口 -->
      <Transition name="settings-fade">
        <div class="system-actions" v-if="!isCollapsed">
          <button class="system-btn" @click="$emit('tab-change', 'settings')">
            <i class="iconfont icon-settings"></i>
          </button>
          <button class="system-btn">
            <i class="iconfont icon-help"></i>
          </button>
        </div>
      </Transition>
    </div>
  </aside>
</template>

<script setup>
import { ref, onMounted, watch, computed } from 'vue'
import { aiService } from '../utils/ai'
import { useResponsive } from '../utils/useResponsive'
import { layoutState, initLayout, setSidebarCollapsed } from '../utils/layoutStore'

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

// 响应式布局
const responsive = useResponsive()

// 用户手动折叠状态（优先级高于响应式）
const manualCollapsed = ref(false)

// 计算实际折叠状态
const isCollapsed = computed(() => {
  // 如果用户手动折叠，使用手动状态
  if (manualCollapsed.value) return true
  // 否则根据响应式布局决定
  return responsive.shouldCollapseSidebar.value
})

const hoveredItem = ref(null)
const aiModel = ref('')
const aiReady = ref(false)
const showModelSelector = ref(false)
const avgResponseTime = ref(120)
const requestCount = ref(0)

const toggleCollapse = () => {
  manualCollapsed.value = !manualCollapsed.value
  setSidebarCollapsed(manualCollapsed.value)
}

// 键盘导航处理
const handleNavKeydown = (event, index, total, section) => {
  const items = section === 'core' ? coreItems.value : secondaryItems.value
  let nextIndex = index

  switch (event.key) {
    case 'ArrowDown':
    case 'ArrowRight':
      nextIndex = (index + 1) % total
      event.preventDefault()
      break
    case 'ArrowUp':
    case 'ArrowLeft':
      nextIndex = (index - 1 + total) % total
      event.preventDefault()
      break
    case 'Home':
      nextIndex = 0
      event.preventDefault()
      break
    case 'End':
      nextIndex = total - 1
      event.preventDefault()
      break
    case 'Enter':
    case ' ':
      event.preventDefault()
      emit('tab-change', items[index].id)
      return
    default:
      return
  }

  // 聚焦下一个元素
  const menuItems = event.currentTarget.parentElement.querySelectorAll('[role="menuitem"]')
  if (menuItems[nextIndex]) {
    menuItems[nextIndex].focus()
  }
}

// 核心功能（高频入口）
const coreItems = ref([
  {
    id: 'terminal',
    label: '智能终端',
    icon: 'icon-terminal',
    desc: '命令执行 · AI 增强',
    isAI: true
  },
  {
    id: 'assistant',
    label: 'AI 助手',
    icon: 'icon-assistant',
    desc: '自然语言交互',
    isAI: true
  }
])

// 辅助功能
const secondaryItems = ref([
  {
    id: 'ssh',
    label: 'SSH 连接',
    icon: 'icon-ssh'
  }
])

// 加载 AI 配置和布局设置
onMounted(async () => {
  initLayout()
  const settings = await aiService.waitForSettings()
  aiModel.value = settings.model || ''
  aiReady.value = aiService.isConfigured()

  // 恢复用户的折叠偏好
  manualCollapsed.value = layoutState.value.sidebarCollapsed
})
</script>

<style scoped>
.sidebar {
  display: flex;
  flex-direction: column;
  width: 200px;
  min-width: 200px;
  background: var(--color-bg-base, #0a0a0f);
  border-right: 1px solid var(--color-border-subtle, rgba(255, 255, 255, 0.05));
  padding: 16px 10px;
  transition: width 0.3s cubic-bezier(0.34, 1.56, 0.64, 1),
              min-width 0.3s cubic-bezier(0.34, 1.56, 0.64, 1),
              padding 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
  position: relative;
}

.sidebar.collapsed {
  width: 56px;
  min-width: 56px;
  padding: 16px 6px;
}

/* 折叠过渡动画增强 */
.sidebar::after {
  content: '';
  position: absolute;
  right: 0;
  top: 0;
  width: 1px;
  height: 100%;
  background: linear-gradient(180deg,
    rgba(139, 92, 246, 0) 0%,
    rgba(139, 92, 246, 0.15) 50%,
    rgba(139, 92, 246, 0) 100%);
  opacity: 0;
  transition: opacity 0.3s ease;
}

.sidebar:hover::after {
  opacity: 0.6;
}

/* ========== Header ========== */
.sidebar-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
  padding-bottom: 12px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
}

.logo {
  display: flex;
  align-items: center;
  gap: 8px;
}

.logo-icon {
  width: 28px;
  height: 28px;
  background: linear-gradient(135deg, #8b5cf6 0%, #00f0ff 100%);
  border-radius: 7px;
  position: relative;
  flex-shrink: 0;
  box-shadow: 0 4px 12px rgba(139, 92, 246, 0.25);
  overflow: hidden;
}

.logo-shine {
  position: absolute;
  top: -50%;
  left: -50%;
  width: 200%;
  height: 200%;
  background: linear-gradient(45deg, transparent, rgba(255, 255, 255, 0.25), transparent);
  transform: rotate(45deg);
  animation: shine 3s ease-in-out infinite;
}

@keyframes shine {
  0%, 100% { transform: translateX(-50%) rotate(45deg); }
  50% { transform: translateX(50%) rotate(45deg); }
}

.logo-text {
  font-size: 16px;
  font-weight: 700;
  color: var(--color-text-primary, #f5f5f7);
  letter-spacing: -0.3px;
}

.logo-accent {
  background: linear-gradient(135deg, #8b5cf6 0%, #00f0ff 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}

.collapse-btn {
  min-width: 44px;
  min-height: 44px;
  background: var(--color-bg-hover, rgba(255, 255, 255, 0.03));
  border: 1px solid var(--color-border-subtle, rgba(255, 255, 255, 0.06));
  border-radius: 8px;
  color: var(--color-text-tertiary, #6b6b78);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s cubic-bezier(0.34, 1.56, 0.64, 1);
  position: relative;
  overflow: hidden;
}

/* Hover 状态 - 更明显的视觉反馈 */
.collapse-btn::before {
  content: '';
  position: absolute;
  inset: 0;
  background: linear-gradient(135deg, rgba(139, 92, 246, 0.15) 0%, rgba(0, 240, 255, 0.1) 100%);
  opacity: 0;
  transition: opacity 0.25s ease;
  border-radius: 5px;
}

.collapse-btn:hover::before {
  opacity: 1;
}

.collapse-btn:hover {
  border-color: rgba(139, 92, 246, 0.35);
  color: #a78bfa;
  transform: scale(1.08);
  box-shadow: 0 2px 8px rgba(139, 92, 246, 0.2);
}

/* 活跃状态 */
.collapse-btn:active {
  transform: scale(0.95);
  box-shadow: 0 1px 4px rgba(139, 92, 246, 0.15);
}

/* 图标旋转过渡动画 */
.collapse-btn .iconfont {
  font-size: 12px;
  transition: transform 0.25s cubic-bezier(0.34, 1.56, 0.64, 1);
}

/* 折叠状态图标动画 */
.sidebar:not(.collapsed) .collapse-btn .iconfont {
  transform: rotate(0deg);
}

.sidebar.collapsed .collapse-btn .iconfont {
  transform: rotate(180deg);
}

/* 脉冲发光动画 */
.collapse-btn:focus-visible {
  outline: 2px solid rgba(139, 92, 246, 0.5);
  outline-offset: 2px;
}

/* 折叠状态脉冲提示 - 让用户注意到可以展开 */
.sidebar.collapsed .collapse-btn {
  animation: collapse-hint 2.5s ease-in-out infinite;
}

@keyframes collapse-hint {
  0%, 100% {
    box-shadow: 0 0 0 rgba(139, 92, 246, 0);
    border-color: rgba(255, 255, 255, 0.06);
  }
  50% {
    box-shadow: 0 0 6px rgba(139, 92, 246, 0.15);
    border-color: rgba(139, 92, 246, 0.15);
  }
}

/* 悬停时停止脉冲动画 */
.sidebar.collapsed .collapse-btn:hover {
  animation: none;
}

/* ========== Navigation ========== */
.nav-menu {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 4px;
  overflow-y: auto;
}

.nav-section {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.nav-section.secondary {
  margin-top: 8px;
  padding-top: 8px;
  border-top: 1px solid rgba(255, 255, 255, 0.04);
}

.section-label {
  font-size: 10px;
  color: var(--color-text-disabled, #5a5a68);
  text-transform: uppercase;
  letter-spacing: 0.5px;
  padding: 4px 12px;
  font-weight: 500;
}

/* ========== Nav Items ========== */
.nav-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 14px 12px;
  min-height: 44px;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.15s ease;
  position: relative;
  color: var(--color-text-tertiary, #8b8b9a);
}

.sidebar.collapsed .nav-item {
  justify-content: center;
  padding: 14px 8px;
}

/* Core items - stronger visual weight */
.nav-item.core-item {
  padding: 14px;
}

.nav-item.core-item:hover {
  background: rgba(139, 92, 246, 0.08);
  color: #c4b5fd;
}

.nav-item.core-item.active {
  background: rgba(139, 92, 246, 0.12);
  color: #c4b5fd;
}

.nav-item.ai-core .nav-icon-wrapper {
  background: linear-gradient(135deg, rgba(139, 92, 246, 0.2) 0%, rgba(0, 240, 255, 0.1) 100%);
  border: 1px solid rgba(139, 92, 246, 0.25);
  border-radius: 7px;
  width: 26px;
  height: 26px;
}

.nav-item.ai-core .nav-icon {
  font-size: 13px;
  color: #a78bfa;
}

/* Secondary items - lighter visual weight */
.nav-item.secondary-item {
  padding: 8px 12px;
}

.nav-item.secondary-item:hover {
  background: rgba(255, 255, 255, 0.03);
  color: #b0b0b8;
}

.nav-item.secondary-item.active {
  background: rgba(59, 130, 246, 0.08);
  color: #93c5fd;
}

/* Indicator */
.nav-indicator {
  position: absolute;
  left: 0;
  top: 50%;
  transform: translateY(-50%);
  width: 3px;
  height: 20px;
  background: linear-gradient(180deg, #8b5cf6 0%, #00f0ff 100%);
  border-radius: 0 3px 3px 0;
  box-shadow: 0 0 10px rgba(139, 92, 246, 0.5);
}

.nav-indicator.ai {
  box-shadow: 0 0 12px rgba(139, 92, 246, 0.6);
}

.sidebar.collapsed .nav-indicator {
  left: 1px;
  height: 18px;
}

/* Icon wrapper */
.nav-icon-wrapper {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  flex-shrink: 0;
  position: relative;
}

.nav-icon {
  font-size: 15px;
}

/* Connection count badge */
.connection-count {
  position: absolute;
  top: -4px;
  right: -6px;
  min-width: 14px;
  height: 14px;
  padding: 0 4px;
  background: #28ca41;
  border-radius: 7px;
  font-size: 9px;
  font-weight: 600;
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
}

/* Nav content */
.nav-content {
  display: flex;
  flex-direction: column;
  gap: 1px;
  min-width: 0;
  flex: 1;
}

.nav-label {
  font-size: 12px;
  font-weight: 500;
  letter-spacing: 0.1px;
  white-space: nowrap;
}

.nav-desc {
  font-size: 10px;
  color: var(--color-text-disabled, #5a5a68);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* Tooltip */
.nav-tooltip {
  position: absolute;
  left: calc(100% + 10px);
  top: 50%;
  transform: translateY(-50%);
  background: var(--color-bg-surface, #1a1a24);
  color: var(--color-text-primary, #e5e5e7);
  padding: 5px 10px;
  border-radius: 5px;
  font-size: 11px;
  font-weight: 500;
  white-space: nowrap;
  border: 1px solid var(--color-border-default, rgba(255, 255, 255, 0.08));
  box-shadow: var(--shadow-md, 0 4px 12px rgba(0, 0, 0, 0.3));
  z-index: var(--z-tooltip, 6000);
  pointer-events: none;
}

/* ========== Footer ========== */
.sidebar-footer {
  margin-top: auto;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

/* AI Status Card */
.ai-card {
  background: linear-gradient(135deg, rgba(139, 92, 246, 0.1) 0%, rgba(0, 240, 255, 0.05) 100%);
  border: 1px solid rgba(139, 92, 246, 0.2);
  border-radius: 10px;
  padding: 10px;
}

.ai-card-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
}

.ai-status-indicator {
  width: 8px;
  height: 8px;
  border-radius: 50%;
}

.ai-status-indicator.ready {
  background: #28ca41;
  box-shadow: 0 0 8px rgba(40, 202, 65, 0.6);
  animation: pulse-ready 2s ease-in-out infinite;
}

.ai-status-indicator.offline {
  background: var(--color-text-tertiary, #6b6b78);
}

@keyframes pulse-ready {
  0%, 100% { box-shadow: 0 0 6px rgba(40, 202, 65, 0.5); }
  50% { box-shadow: 0 0 10px rgba(40, 202, 65, 0.7); }
}

.ai-card-title {
  font-size: 11px;
  font-weight: 600;
  color: var(--color-text-primary, #e5e5e7);
  flex: 1;
}

.ai-switch-btn {
  min-width: 44px;
  min-height: 44px;
  background: var(--color-bg-hover, rgba(255, 255, 255, 0.05));
  border: 1px solid var(--color-border-default, rgba(255, 255, 255, 0.1));
  border-radius: 8px;
  color: var(--color-text-tertiary, #8b8b9a);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
}

.ai-switch-btn:hover {
  background: rgba(139, 92, 246, 0.15);
  color: #a78bfa;
  border-color: rgba(139, 92, 246, 0.3);
}

.ai-switch-btn .iconfont {
  font-size: 11px;
}

.ai-card-body {
  margin-bottom: 8px;
}

.ai-model-info {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 6px;
}

.ai-model-name {
  font-size: 12px;
  font-weight: 600;
  color: #c4b5fd;
}

.ai-status-text {
  font-size: 10px;
  padding: 2px 6px;
  border-radius: 4px;
}

.ai-status-text.ready {
  background: rgba(40, 202, 65, 0.15);
  color: #28ca41;
}

.ai-status-text.offline {
  background: var(--color-bg-hover, rgba(255, 255, 255, 0.05));
  color: var(--color-text-tertiary, #6b6b78);
}

.ai-stats {
  display: flex;
  gap: 12px;
}

.stat-item {
  display: flex;
  align-items: center;
  gap: 4px;
}

.stat-label {
  font-size: 9px;
  color: var(--color-text-tertiary, #6b6b78);
}

.stat-value {
  font-size: 10px;
  font-weight: 600;
  color: #a78bfa;
}

.ai-card-actions {
  display: flex;
  gap: 6px;
}

.ai-action-btn {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  padding: 6px;
  background: var(--color-bg-hover, rgba(255, 255, 255, 0.05));
  border: 1px solid var(--color-border-subtle, rgba(255, 255, 255, 0.08));
  border-radius: 6px;
  color: var(--color-text-tertiary, #8b8b9a);
  font-size: 10px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.ai-action-btn:hover {
  background: var(--color-bg-active, rgba(255, 255, 255, 0.08));
  color: var(--color-text-secondary, #b0b0b8);
}

.ai-action-btn.primary {
  background: rgba(139, 92, 246, 0.15);
  border-color: rgba(139, 92, 246, 0.25);
  color: #c4b5fd;
}

.ai-action-btn.primary:hover {
  background: rgba(139, 92, 246, 0.2);
}

.ai-action-btn .iconfont {
  font-size: 11px;
}

/* AI Mini (collapsed state) */
.ai-mini {
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
}

.ai-mini-icon {
  min-width: 44px;
  min-height: 44px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s ease;
}

.ai-mini-icon.ready {
  background: rgba(139, 92, 246, 0.15);
  border: 1px solid rgba(139, 92, 246, 0.25);
}

.ai-mini-icon.offline {
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.08);
}

.ai-mini-icon .iconfont {
  font-size: 14px;
  color: #a78bfa;
}

.ai-mini-icon:hover .ai-mini-tooltip {
  opacity: 1;
  visibility: visible;
}

.ai-mini-tooltip {
  position: absolute;
  left: calc(100% + 10px);
  top: 50%;
  transform: translateY(-50%);
  background: var(--color-bg-surface, #1a1a24);
  padding: 6px 10px;
  border-radius: 6px;
  border: 1px solid var(--color-border-default, rgba(255, 255, 255, 0.08));
  display: flex;
  flex-direction: column;
  gap: 2px;
  font-size: 10px;
  opacity: 0;
  visibility: hidden;
  transition: all 0.2s ease;
  white-space: nowrap;
  z-index: var(--z-tooltip, 6000);
}

.ai-mini-tooltip span:first-child {
  color: var(--color-text-primary, #e5e5e7);
  font-weight: 500;
}

.ai-mini-model {
  color: #a78bfa;
}

/* System Actions */
.system-actions {
  display: flex;
  justify-content: center;
  gap: 6px;
  padding-top: 8px;
  border-top: 1px solid rgba(255, 255, 255, 0.04);
}

.system-btn {
  min-width: 44px;
  min-height: 44px;
  background: var(--color-bg-hover, rgba(255, 255, 255, 0.03));
  border: 1px solid var(--color-border-subtle, rgba(255, 255, 255, 0.05));
  border-radius: 8px;
  color: var(--color-text-tertiary, #6b6b78);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
}

.system-btn:hover {
  background: var(--color-bg-active, rgba(255, 255, 255, 0.06));
  color: var(--color-text-secondary, #a0a0a8);
}

.system-btn .iconfont {
  font-size: 12px;
}

/* ========== Transitions ========== */
.logo-text-enter-active,
.logo-text-leave-active,
.nav-label-enter-active,
.nav-label-leave-active {
  transition: all 0.2s ease;
}

.logo-text-enter-from,
.logo-text-leave-to,
.nav-label-enter-from,
.nav-label-leave-to {
  opacity: 0;
  transform: translateX(-6px);
}

.tooltip-enter-active,
.tooltip-leave-active {
  transition: all 0.15s ease;
}

.tooltip-enter-from,
.tooltip-leave-to {
  opacity: 0;
  transform: translateY(-50%) translateX(-4px);
}

.section-fade-enter-active,
.section-fade-leave-active,
.ai-card-enter-active,
.ai-card-leave-active,
.settings-fade-enter-active,
.settings-fade-leave-active {
  transition: all 0.2s ease;
}

.section-fade-enter-from,
.section-fade-leave-to,
.ai-card-enter-from,
.ai-card-leave-to,
.settings-fade-enter-from,
.settings-fade-leave-to {
  opacity: 0;
  transform: translateY(6px);
}
</style>