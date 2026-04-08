<template>
  <footer class="statusbar">
    <!-- 左侧：系统状态 -->
    <div class="status-left">
      <p class="system-info">
        系统就绪 | CPU: <span class="status-value">{{ cpuUsage }}%</span> | MEM: <span class="status-value">{{ memoryUsage }}</span>
      </p>
      <div class="connection-indicator" v-if="status.sshConnections > 0">
        <div class="status-dot" :class="status.sshConnected ? 'online' : 'offline'"></div>
        <span class="connection-text" :class="status.sshConnected ? 'online' : 'offline'">
          {{ status.sshConnected ? '远程连接中' : '连接断开' }}
        </span>
      </div>
    </div>

    <!-- 右侧：系统信息 -->
    <div class="status-right">
      <span class="status-item">Node v{{ nodeVersion }}</span>
      <span class="status-item git-info" v-if="gitBranch">
        <svg class="git-icon" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/>
        </svg>
        {{ gitBranch }}
      </span>
      <span class="status-item">UTF-8</span>
    </div>
  </footer>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed } from 'vue'
import { subscribeStatus } from '../utils/terminalStatus'

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

// Node 版本（模拟）
const nodeVersion = ref('20.1')

// Git 分支（模拟，实际可以从文件系统获取）
const gitBranch = ref('main')

// CPU 使用率显示
const cpuUsage = computed(() => {
  return Math.round(status.value.cpuUsage || 12)
})

// 内存使用显示
const memoryUsage = computed(() => {
  const used = 4.2 + (status.value.memoryUsage || 0) * 0.01
  return `${used.toFixed(1)}GB`
})

// 获取系统信息
const updateSystemInfo = async () => {
  try {
    if (window.electronAPI?.getSystemInfo) {
      const sysInfo = await window.electronAPI.getSystemInfo()
      status.value.cpuUsage = sysInfo.cpu.usage
      status.value.memoryUsage = sysInfo.memory.usagePercent
    }
  } catch (e) {
    // 模拟数据
    status.value.cpuUsage = 12
    status.value.memoryUsage = 26
  }
}

let systemInterval: ReturnType<typeof setInterval> | null = null

onMounted(async () => {
  // 订阅状态变化
  unsubscribe = subscribeStatus((newStatus) => {
    status.value = { ...status.value, ...newStatus }
  })

  // 每 5 秒更新系统信息
  await updateSystemInfo()
  systemInterval = setInterval(updateSystemInfo, 5000)
})

onUnmounted(() => {
  if (systemInterval) clearInterval(systemInterval)
  if (unsubscribe) unsubscribe()
})
</script>

<style scoped>
.statusbar {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  height: 24px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0 16px;
  background: var(--color-surface-container-lowest, #000000);
  border-top: 1px solid var(--color-outline-variant, #46484d);
  border-color: rgba(70, 72, 77, 0.15);
  z-index: 50;
  font-family: var(--font-mono, 'Fira Code', monospace);
}

/* 左侧状态 */
.status-left {
  display: flex;
  align-items: center;
  gap: 16px;
}

.system-info {
  font-size: 10px;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: var(--color-on-surface-variant, #aaabb0);
  margin: 0;
}

.status-value {
  color: var(--color-secondary, #2db7f2);
}

/* 连接指示器 */
.connection-indicator {
  display: flex;
  align-items: center;
  gap: 6px;
}

.status-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
}

.status-dot.online {
  background: var(--color-secondary, #2db7f2);
  box-shadow: 0 0 5px rgba(45, 183, 242, 0.8);
}

.status-dot.offline {
  background: var(--color-error, #ff6e84);
}

.connection-text {
  font-size: 10px;
  text-transform: uppercase;
  letter-spacing: 0.1em;
}

.connection-text.online {
  color: var(--color-secondary, #2db7f2);
}

.connection-text.offline {
  color: var(--color-error, #ff6e84);
}

/* 右侧信息 */
.status-right {
  display: flex;
  align-items: center;
  gap: 24px;
}

.status-item {
  font-size: 10px;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: var(--color-on-surface-variant, #aaabb0);
  cursor: default;
  transition: color 0.15s ease;
}

.status-item:hover {
  color: var(--color-on-surface, #f6f6fc);
}

.git-info {
  display: flex;
  align-items: center;
  gap: 4px;
}

.git-icon {
  width: 12px;
  height: 12px;
  opacity: 0.7;
}
</style>
