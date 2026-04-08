<template>
  <div class="statusbar">
    <!-- 左侧：最高优先级告警 -->
    <div class="status-left">
      <!-- 系统告警 - RAM/CPU 高占用 -->
      <Transition name="alert-slide">
        <div
          v-if="hasCriticalAlert"
          class="status-alert critical"
          @click="openResourceMonitor"
          title="点击查看详情"
        >
          <span class="alert-icon"><i class="iconfont icon-warning"></i></span>
          <span class="alert-value" :class="{ flash: criticalValue >= 90 }">{{ criticalValue }}%</span>
        </div>
      </Transition>

      <Transition name="alert-slide">
        <div
          v-if="hasWarning && !hasCriticalAlert"
          class="status-alert warning"
          @click="openResourceMonitor"
          title="点击查看详情"
        >
          <span class="alert-icon"><i class="iconfont icon-bolt"></i></span>
          <span class="alert-value">{{ warningValue }}%</span>
        </div>
      </Transition>

      <!-- 核心状态：连接 + Shell + AI（纯图标） -->
      <div class="status-core">
        <div
          class="core-item connection"
          :class="status.connected ? 'connected' : 'disconnected'"
          :title="status.connected ? '已连接' : '离线'"
        >
          <span class="status-dot" :class="status.connected ? 'online' : 'offline'"></span>
        </div>

        <div
          class="core-item shell"
          @contextmenu.prevent="openShellMenu"
          :title="`Shell: ${status.shell}`"
        >
          <i class="iconfont icon-terminal"></i>
        </div>

        <!-- AI 模型状态 -->
        <div
          class="core-item ai"
          :class="status.aiReady ? 'ready' : 'offline'"
          @click="openModelSelector"
          :title="status.aiReady ? `AI: ${status.aiModel}` : 'AI 未配置'"
        >
          <i class="iconfont icon-ai"></i>
        </div>
      </div>
    </div>

    <!-- 中间：辅助信息（图标化） -->
    <div class="status-center">
      <!-- 连接状态组 -->
      <div class="status-group" v-if="status.sshConnections > 0 || status.sessionCount > 1">
        <!-- SSH 连接状态 -->
        <Transition name="status-fade">
          <div
            v-if="status.sshConnections > 0"
            class="group-item ssh"
            :class="status.sshConnected ? 'active' : 'inactive'"
            :title="status.sshConnected ? `SSH: ${status.sshHost}` : 'SSH 断线'"
          >
            <span class="group-dot" :class="status.sshConnected ? 'active' : 'inactive'"></span>
          </div>
        </Transition>

        <!-- 会话数 -->
        <div class="group-item sessions" :title="`会话: ${status.sessionCount}`">
          <i class="iconfont icon-layers"></i>
          <span class="group-value">{{ status.sessionCount }}</span>
        </div>
      </div>
    </div>

    <!-- 右侧：时间 + hover显示详细信息 -->
    <div class="status-right">
      <!-- 时间 - 分离显示避免闪烁 -->
      <div
        class="low-item time"
        :title="`终端尺寸: ${status.cols}×${status.rows} | 编码: ${status.encoding}`"
      >
        <span class="time-hour">{{ timeHour }}</span><span class="time-separator">:</span><span class="time-minute">{{ timeMinute }}</span>
      </div>
    </div>

    <!-- 资源监控弹出面板 -->
    <Teleport to="body">
      <Transition name="popover-fade">
        <div
          v-if="showResourceMonitor"
          class="statusbar-popover-overlay"
          @click="closeResourceMonitor"
        >
          <div
            class="statusbar-popover"
            :style="popoverStyle"
            @click.stop
          >
            <ResourceMonitor @close="closeResourceMonitor" />
          </div>
        </div>
      </Transition>
    </Teleport>

    <!-- AI 模型选择器 -->
    <Transition name="menu-fade">
      <div
        v-if="showModelSelector"
        class="dropdown-menu model-selector"
        :style="menuStyle"
      >
        <div class="menu-header">
          <span>AI 模型</span>
        </div>
        <div class="menu-options">
          <div
            v-for="model in availableModels"
            :key="model.id"
            class="menu-option"
            :class="{ active: currentModel === model.id }"
            @click="selectModel(model.id)"
          >
            <i class="iconfont" :class="model.icon"></i>
            <span class="option-label">{{ model.name }}</span>
            <span class="option-check" v-if="currentModel === model.id">✓</span>
          </div>
        </div>
      </div>
    </Transition>

    <!-- Shell 选择菜单 -->
    <Transition name="menu-fade">
      <div
        v-if="showShellMenu"
        class="dropdown-menu shell-menu"
        :style="shellMenuStyle"
      >
        <div class="menu-header">
          <span>切换 Shell</span>
        </div>
        <div class="menu-options">
          <div
            v-for="shell in availableShells"
            :key="shell.id"
            class="menu-option"
            :class="{ active: status.shell === shell.id }"
            @click="selectShell(shell.id)"
          >
            <i class="iconfont icon-terminal"></i>
            <span class="option-label">{{ shell.name }}</span>
            <span class="option-check" v-if="status.shell === shell.id">✓</span>
          </div>
        </div>
      </div>
    </Transition>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { subscribeStatus, updateStatus } from '../utils/terminalStatus'
import { aiService } from '../utils/ai'
import { updateMemoryStatus, checkSessionCount, loadThresholds, thresholds } from '../utils/performanceMonitor'
import ResourceMonitor from './ResourceMonitor.vue'

// 时间显示 - 分离小时和分钟，避免整体闪烁
const timeHour = ref('')
const timeMinute = ref('')
const prevMinute = ref('')
let timeInterval: ReturnType<typeof setInterval> | null = null

// 状态订阅
const status = ref({
  connected: false,
  shell: 'bash',
  sessionCount: 1,
  activeSessionType: 'local',
  cols: 80,
  rows: 24,
  encoding: 'UTF-8',
  sshConnections: 0,
  sshConnected: false,
  sshHost: '',
  aiReady: false,
  aiModel: '',
  memoryUsage: 0,
  memoryStatus: 'normal' as 'normal' | 'warning' | 'critical',
  cpuUsage: 0,
  cpuStatus: 'normal' as 'normal' | 'warning' | 'critical',
  storageUsage: 0
})

let unsubscribe: (() => void) | null = null

// 弹出面板状态
const showResourceMonitor = ref(false)
const showModelSelector = ref(false)
const showShellMenu = ref(false)
const popoverPosition = ref({ x: 0, y: 0 })

// 告警计算
const hasCriticalAlert = computed(() => {
  return status.value.memoryStatus === 'critical' || status.value.cpuStatus === 'critical'
})

const hasWarning = computed(() => {
  return status.value.memoryStatus === 'warning' || status.value.cpuStatus === 'warning'
})

const criticalValue = computed(() => {
  if (status.value.memoryStatus === 'critical') return Math.round(status.value.memoryUsage)
  if (status.value.cpuStatus === 'critical') return Math.round(status.value.cpuUsage)
  return 0
})

const criticalType = computed(() => {
  if (status.value.memoryStatus === 'critical') return 'RAM'
  if (status.value.cpuStatus === 'critical') return 'CPU'
  return ''
})

const warningValue = computed(() => {
  if (status.value.memoryStatus === 'warning') return Math.round(status.value.memoryUsage)
  if (status.value.cpuStatus === 'warning') return Math.round(status.value.cpuUsage)
  return 0
})

const warningType = computed(() => {
  if (status.value.memoryStatus === 'warning') return 'RAM'
  if (status.value.cpuStatus === 'warning') return 'CPU'
  return ''
})

// AI 模型配置
const currentModel = ref('')

// 可用模型列表
const availableModels = [
  { id: 'claude-3-haiku-20240307', name: 'Claude Haiku', icon: 'icon-ai' },
  { id: 'claude-3-sonnet-20240229', name: 'Claude Sonnet', icon: 'icon-ai' },
  { id: 'gpt-3.5-turbo', name: 'GPT-3.5', icon: 'icon-ai' },
  { id: 'gpt-4', name: 'GPT-4', icon: 'icon-ai' },
  { id: 'llama3', name: 'Llama 3 (本地)', icon: 'icon-ai' }
]

// 可用 Shell 列表
const availableShells = computed(() => {
  const platform = navigator.platform.toLowerCase()
  if (platform.includes('win')) {
    return [
      { id: 'PowerShell', name: 'PowerShell' },
      { id: 'CMD', name: '命令提示符' },
      { id: 'pwsh', name: 'PowerShell Core' }
    ]
  }
  return [
    { id: 'bash', name: 'Bash' },
    { id: 'zsh', name: 'Zsh' },
    { id: 'sh', name: 'Shell' }
  ]
})

// 弹出面板样式
const popoverStyle = computed(() => ({
  position: 'fixed' as const,
  bottom: '40px',
  left: `${popoverPosition.value.x}px`
}))

const menuStyle = computed(() => ({
  position: 'fixed' as const,
  bottom: '40px',
  left: `${popoverPosition.value.x}px`
}))

const shellMenuStyle = computed(() => ({
  position: 'fixed' as const,
  bottom: '40px',
  left: `${popoverPosition.value.x}px`
}))

// 更新时间 - 分离显示，避免闪烁
const updateTime = () => {
  const now = new Date()
  const hour = now.getHours().toString().padStart(2, '0')
  const minute = now.getMinutes().toString().padStart(2, '0')

  timeHour.value = hour

  // 分钟变化时添加动画
  if (minute !== prevMinute.value) {
    prevMinute.value = minute
  }
  timeMinute.value = minute
}

// 获取系统资源信息
const updateSystemInfo = async () => {
  try {
    if (window.electronAPI?.getSystemInfo) {
      const sysInfo = await window.electronAPI.getSystemInfo()

      // 使用性能监控服务更新内存状态（会自动触发警告）
      const memStatus = updateMemoryStatus(sysInfo.memory.usagePercent)

      // 检查会话数量
      checkSessionCount(status.value.sessionCount)

      const getCpuStatus = (usage: number): 'normal' | 'warning' | 'critical' => {
        if (usage >= 80) return 'critical'
        if (usage >= 60) return 'warning'
        return 'normal'
      }

      updateStatus({
        memoryUsage: sysInfo.memory.usagePercent,
        memoryStatus: memStatus.status,
        cpuUsage: sysInfo.cpu.usage,
        cpuStatus: getCpuStatus(sysInfo.cpu.usage),
        storageUsage: sysInfo.storage.usagePercent
      })
    }
  } catch (e) {
    console.error('Failed to get system info:', e)
  }
}

// 检查 AI 状态
const checkAIStatus = async () => {
  try {
    const settings = await aiService.waitForSettings()
    const isReady = aiService.isConfigured()

    updateStatus({
      aiReady: isReady,
      aiModel: isReady ? settings.model || settings.provider : ''
    })

    currentModel.value = settings.model || ''
  } catch (e) {
    updateStatus({
      aiReady: false,
      aiModel: ''
    })
  }
}

// 打开资源监控
const openResourceMonitor = (event: MouseEvent) => {
  const rect = (event.currentTarget as HTMLElement).getBoundingClientRect()
  popoverPosition.value = { x: rect.left, y: rect.top }
  showResourceMonitor.value = true
}

const closeResourceMonitor = () => {
  showResourceMonitor.value = false
}

// 打开模型选择器
const openModelSelector = (event: MouseEvent) => {
  const rect = (event.currentTarget as HTMLElement).getBoundingClientRect()
  popoverPosition.value = { x: rect.left, y: rect.top }
  showModelSelector.value = true
}

// 选择模型
const selectModel = async (modelId: string) => {
  currentModel.value = modelId
  await aiService.saveSettings({ model: modelId })
  showModelSelector.value = false

  // 更新状态
  updateStatus({
    aiModel: modelId
  })
}

// 打开 Shell 菜单
const openShellMenu = (event: MouseEvent) => {
  const rect = (event.currentTarget as HTMLElement).getBoundingClientRect()
  popoverPosition.value = { x: rect.left, y: rect.top }
  showShellMenu.value = true
}

// 选择 Shell
const selectShell = (shellId: string) => {
  updateStatus({ shell: shellId })
  showShellMenu.value = false
  // TODO: 实际切换 Shell 需要重启 PTY
}

// 点击外部关闭菜单
const handleClickOutside = (e: MouseEvent) => {
  const target = e.target as HTMLElement

  if (!target.closest('.core-item.ai') && !target.closest('.model-selector')) {
    showModelSelector.value = false
  }

  if (!target.closest('.core-item.shell') && !target.closest('.shell-menu')) {
    showShellMenu.value = false
  }
}

let systemInterval: ReturnType<typeof setInterval> | null = null

onMounted(async () => {
  // 加载阈值配置
  loadThresholds()

  updateTime()
  timeInterval = setInterval(updateTime, 1000)

  // 每 5 秒更新系统信息
  await updateSystemInfo()
  systemInterval = setInterval(updateSystemInfo, 5000)

  // 检查 AI 状态
  await checkAIStatus()

  // 订阅状态变化
  unsubscribe = subscribeStatus((newStatus) => {
    status.value = { ...newStatus }
  })

  document.addEventListener('click', handleClickOutside)
})

onUnmounted(() => {
  if (timeInterval) clearInterval(timeInterval)
  if (systemInterval) clearInterval(systemInterval)
  if (unsubscribe) unsubscribe()

  document.removeEventListener('click', handleClickOutside)
})
</script>

<style scoped>
.statusbar {
  display: flex;
  align-items: center;
  justify-content:space-between;
  height: 32px;
  background: linear-gradient(180deg, var(--color-bg-base, #0a0a0f) 0%, var(--color-bg-base, #08080c) 100%);
  border-top: 1px solid var(--color-border-subtle, rgba(255, 255, 255, 0.05));
  padding: 0 16px;
  font-size: 11px;
  color: var(--color-text-disabled, #5a5a68);
  position: relative;
}

/* ========== 左侧：告警 + 核心状态 ========== */
.status-left {
  display: flex;
  align-items: center;
  gap: 12px;
}

/* 告警样式 */
.status-alert {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 5px 12px;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s ease;
  animation: alert-enter 0.3s ease-out;
}

@keyframes alert-enter {
  from {
    opacity: 0;
    transform: scale(0.9);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}

.status-alert.critical {
  background: linear-gradient(135deg, rgba(239, 68, 68, 0.25) 0%, rgba(248, 113, 113, 0.15) 100%);
  border: 1px solid rgba(239, 68, 68, 0.4);
  box-shadow: 0 0 20px rgba(239, 68, 68, 0.3);
  animation: alert-enter 0.3s ease-out, critical-pulse 1s ease-in-out infinite;
}

.status-alert.warning {
  background: linear-gradient(135deg, rgba(245, 158, 11, 0.2) 0%, rgba(251, 191, 36, 0.1) 100%);
  border: 1px solid rgba(245, 158, 11, 0.3);
  box-shadow: 0 0 16px rgba(245, 158, 11, 0.2);
}

@keyframes critical-pulse {
  0%, 100% {
    box-shadow: 0 0 20px rgba(239, 68, 68, 0.3);
  }
  50% {
    box-shadow: 0 0 30px rgba(239, 68, 68, 0.5);
  }
}

.alert-icon {
  display: flex;
  align-items: center;
}

.alert-icon .iconfont {
  font-size: 12px;
}

.alert-value {
  font-size: 14px;
  font-weight: 700;
  color: #f87171;
  text-shadow: 0 0 8px rgba(239, 68, 68, 0.5);
}

.alert-value.flash {
  animation: value-flash 0.5s ease-in-out infinite;
}

@keyframes value-flash {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.7; }
}

.status-alert.warning .alert-value {
  color: #fbbf24;
  text-shadow: 0 0 8px rgba(245, 158, 11, 0.5);
}

.alert-label {
  font-size: 9px;
  font-weight: 600;
  letter-spacing: 0.5px;
  color: inherit;
  opacity: 0.9;
}

.status-alert.critical .alert-label {
  color: #ef4444;
}

.status-alert.warning .alert-label {
  color: #f59e0b;
}

/* 核心状态组 - 纯图标，紧凑布局 */
.status-core {
  display: flex;
  align-items: center;
  gap: 4px;
}

.core-item {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  border-radius: 6px;
  transition: all 0.2s ease;
  cursor: default;
}

.core-item:hover {
  background: rgba(255, 255, 255, 0.05);
}

.core-item.connection {
  cursor: default;
}

.core-item.shell,
.core-item.ai {
  cursor: pointer;
}

.core-item.shell:hover,
.core-item.ai:hover {
  background: rgba(139, 92, 246, 0.1);
}

.core-item.ai.ready .iconfont {
  color: #a78bfa;
}

.core-item.ai.offline .iconfont {
  color: var(--color-text-tertiary, #6b6b78);
}

.core-item .iconfont {
  font-size: 14px;
}

.status-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
}

.status-dot.online {
  background: #10b981;
  box-shadow: 0 0 6px rgba(16, 185, 129, 0.6);
}

.status-dot.offline {
  background: #ff5f57;
  box-shadow: 0 0 6px rgba(255, 95, 87, 0.6);
  animation: dot-blink 1.5s ease-in-out infinite;
}

/* ========== 中间：辅助信息 ========== */
.status-center {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
}

/* 状态组样式 - 紧凑 */
.status-group {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 2px 8px;
  background: rgba(255, 255, 255, 0.02);
  border-radius: 4px;
}

.group-item {
  display: flex;
  align-items: center;
  gap: 3px;
  cursor: default;
}

.group-item.ssh.active {
  color: #3b82f6;
}

.group-item.ssh.inactive {
  color: #ff5f57;
}

.group-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
}

.group-dot.active {
  background: #3b82f6;
  box-shadow: 0 0 6px rgba(59, 130, 246, 0.5);
}

.group-dot.inactive {
  background: #ff5f57;
}

.group-value {
  font-size: 10px;
  font-weight: 500;
  color: var(--color-text-tertiary, #8b8b9a);
}

.group-item .iconfont {
  font-size: 11px;
  color: var(--color-text-tertiary, #6b6b78);
}

/* ========== 右侧：时间 ========== */
.status-right {
  display: flex;
  align-items: center;
  gap: 10px;
}

.low-item {
  display: flex;
  align-items: center;
  padding: 3px 8px;
  background: rgba(255, 255, 255, 0.02);
  border-radius: 4px;
}

.low-item.time {
  background: rgba(0, 240, 255, 0.05);
  border: 1px solid rgba(0, 240, 255, 0.1);
  font-family: 'JetBrains Mono', 'SF Mono', monospace;
  cursor: default;
}

.time-hour,
.time-minute {
  font-size: 11px;
  color: #00f0ff;
  font-weight: 500;
  transition: opacity 0.15s ease;
}

.time-separator {
  font-size: 11px;
  color: #00f0ff;
  opacity: 0.5;
  animation: blink-separator 1s ease-in-out infinite;
}

@keyframes blink-separator {
  0%, 100% { opacity: 0.5; }
  50% { opacity: 0.2; }
}

@keyframes dot-blink {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.4; }
}

/* ========== 弹出面板 ========== */
.statusbar-popover-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: var(--z-modal-base, 3000);
}

.statusbar-popover {
  position: fixed;
  z-index: calc(var(--z-modal-base, 3000) + 1);
}

/* ========== 下拉菜单 ========== */
.dropdown-menu {
  position: fixed;
  min-width: 180px;
  background: linear-gradient(180deg, var(--color-bg-elevated, #14141e) 0%, var(--color-bg-surface, #0e0e14) 100%);
  border: 1px solid var(--color-border-default, rgba(255, 255, 255, 0.08));
  border-radius: 10px;
  overflow: hidden;
  box-shadow: var(--shadow-lg, 0 8px 32px rgba(0, 0, 0, 0.5));
  z-index: var(--z-dropdown, 1000);
}

.menu-header {
  padding: 10px 14px;
  font-size: 11px;
  font-weight: 600;
  color: var(--color-text-tertiary, #6b6b78);
  border-bottom: 1px solid var(--color-border-subtle, rgba(255, 255, 255, 0.05));
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.menu-options {
  padding: 6px;
}

.menu-option {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.15s ease;
}

.menu-option:hover {
  background: rgba(255, 255, 255, 0.05);
}

.menu-option.active {
  background: rgba(139, 92, 246, 0.1);
  color: #a78bfa;
}

.menu-option .iconfont {
  font-size: 14px;
  color: var(--color-text-tertiary, #6b6b78);
}

.menu-option.active .iconfont {
  color: var(--color-ai-primary, #a78bfa);
}

.option-label {
  flex: 1;
  font-size: 12px;
  color: var(--color-text-secondary, #b0b0b8);
}

.menu-option.active .option-label {
  color: var(--color-ai-secondary, #c4b5fd);
}

.option-check {
  font-size: 12px;
  color: var(--color-ai-primary, #a78bfa);
}

/* ========== 过渡动画 ========== */
.alert-slide-enter-active,
.alert-slide-leave-active {
  transition: all 0.3s ease;
}

.alert-slide-enter-from,
.alert-slide-leave-to {
  opacity: 0;
  transform: translateX(-10px);
}

.status-fade-enter-active,
.status-fade-leave-active {
  transition: all 0.2s ease;
}

.status-fade-enter-from,
.status-fade-leave-to {
  opacity: 0;
  transform: scale(0.9);
}

.menu-fade-enter-active,
.menu-fade-leave-active {
  transition: all 0.2s ease;
}

.menu-fade-enter-from,
.menu-fade-leave-to {
  opacity: 0;
  transform: translateY(8px);
}

.popover-fade-enter-active,
.popover-fade-leave-active {
  transition: opacity 0.2s ease;
}

.popover-fade-enter-from,
.popover-fade-leave-to {
  opacity: 0;
}
</style>