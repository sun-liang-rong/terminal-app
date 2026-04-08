<template>
  <div class="resource-monitor">
    <!-- 标题栏 -->
    <div class="monitor-header">
      <div class="header-title">
        <i class="iconfont icon-cpu"></i>
        <span>系统资源监控</span>
      </div>
      <button class="close-btn" @click="$emit('close')">
        <i class="iconfont icon-close"></i>
      </button>
    </div>

    <!-- 资源列表 -->
    <div class="monitor-content">
      <!-- CPU 使用率 -->
      <div class="resource-item" :class="cpuStatus">
        <div class="resource-header">
          <div class="resource-icon cpu">
            <i class="iconfont icon-cpu"></i>
          </div>
          <div class="resource-info">
            <span class="resource-label">CPU</span>
            <span class="resource-value">{{ cpuUsage.toFixed(1) }}%</span>
          </div>
          <div class="resource-status" :class="cpuStatus">
            {{ cpuStatusText }}
          </div>
        </div>
        <div class="progress-bar">
          <div
            class="progress-fill cpu"
            :style="{ width: cpuUsage + '%' }"
            :class="cpuStatus"
          ></div>
        </div>
        <div class="resource-detail">
          <span>{{ cpuModel }}</span>
          <span>{{ cpuCores }} 核心</span>
        </div>
      </div>

      <!-- 内存使用率 -->
      <div class="resource-item" :class="memoryStatus">
        <div class="resource-header">
          <div class="resource-icon memory">
            <i class="iconfont icon-terminal"></i>
          </div>
          <div class="resource-info">
            <span class="resource-label">内存</span>
            <span class="resource-value">{{ memoryUsage.toFixed(1) }}%</span>
          </div>
          <div class="resource-status" :class="memoryStatus">
            {{ memoryStatusText }}
          </div>
        </div>
        <div class="progress-bar">
          <div
            class="progress-fill memory"
            :style="{ width: memoryUsage + '%' }"
            :class="memoryStatus"
          ></div>
        </div>
        <div class="resource-detail">
          <span>{{ formatBytes(memoryUsed) }} / {{ formatBytes(memoryTotal) }}</span>
          <span>{{ formatBytes(memoryFree) }} 可用</span>
        </div>
      </div>

      <!-- 存储使用率 -->
      <div class="resource-item" :class="storageStatus">
        <div class="resource-header">
          <div class="resource-icon storage">
            <i class="iconfont icon-explorer"></i>
          </div>
          <div class="resource-info">
            <span class="resource-label">存储</span>
            <span class="resource-value">{{ storageUsage.toFixed(1) }}%</span>
          </div>
          <div class="resource-status" :class="storageStatus">
            {{ storageStatusText }}
          </div>
        </div>
        <div class="progress-bar">
          <div
            class="progress-fill storage"
            :style="{ width: storageUsage + '%' }"
            :class="storageStatus"
          ></div>
        </div>
        <div class="resource-detail">
          <span>{{ formatBytes(storageUsed) }} / {{ formatBytes(storageTotal) }}</span>
          <span>{{ formatBytes(storageFree) }} 可用</span>
        </div>
      </div>
    </div>

    <!-- 底部刷新时间 -->
    <div class="monitor-footer">
      <span class="refresh-time">
        <i class="iconfont icon-time"></i>
        最后更新: {{ lastUpdateTime }}
      </span>
      <button class="refresh-btn" @click="refreshData">
        <i class="iconfont icon-bolt"></i>
        刷新
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { updateStatus } from '../utils/terminalStatus'

const emit = defineEmits(['close'])

// 数据状态
const cpuUsage = ref(0)
const cpuModel = ref('未知')
const cpuCores = ref(0)
const memoryUsage = ref(0)
const memoryUsed = ref(0)
const memoryTotal = ref(0)
const memoryFree = ref(0)
const storageUsage = ref(0)
const storageUsed = ref(0)
const storageTotal = ref(0)
const storageFree = ref(0)
const lastUpdateTime = ref('--:--:--')

// 状态计算
const cpuStatus = computed(() => {
  if (cpuUsage.value >= 80) return 'critical'
  if (cpuUsage.value >= 60) return 'warning'
  return 'normal'
})

const memoryStatus = computed(() => {
  if (memoryUsage.value >= 80) return 'critical'
  if (memoryUsage.value >= 60) return 'warning'
  return 'normal'
})

const storageStatus = computed(() => {
  if (storageUsage.value >= 90) return 'critical'
  if (storageUsage.value >= 80) return 'warning'
  return 'normal'
})

// 状态文本
const cpuStatusText = computed(() => {
  if (cpuUsage.value >= 80) return '高负载'
  if (cpuUsage.value >= 60) return '中等负载'
  return '正常'
})

const memoryStatusText = computed(() => {
  if (memoryUsage.value >= 80) return '内存紧张'
  if (memoryUsage.value >= 60) return '内存适中'
  return '内存充足'
})

const storageStatusText = computed(() => {
  if (storageUsage.value >= 90) return '空间不足'
  if (storageUsage.value >= 80) return '空间紧张'
  return '空间充足'
})

// 格式化字节
const formatBytes = (bytes: number): string => {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i]
}

// 刷新数据
const refreshData = async () => {
  try {
    if (window.electronAPI?.getSystemInfo) {
      const sysInfo = await window.electronAPI.getSystemInfo()

      cpuUsage.value = sysInfo.cpu.usage
      cpuModel.value = sysInfo.cpu.model
      cpuCores.value = sysInfo.cpu.cores

      memoryUsage.value = sysInfo.memory.usagePercent
      memoryUsed.value = sysInfo.memory.used
      memoryTotal.value = sysInfo.memory.total
      memoryFree.value = sysInfo.memory.free

      storageUsage.value = sysInfo.storage.usagePercent
      storageUsed.value = sysInfo.storage.used
      storageTotal.value = sysInfo.storage.total
      storageFree.value = sysInfo.storage.free

      // 更新全局状态
      updateStatus({
        cpuUsage: sysInfo.cpu.usage,
        cpuStatus: cpuStatus.value,
        memoryUsage: sysInfo.memory.usagePercent,
        memoryStatus: memoryStatus.value,
        storageUsage: sysInfo.storage.usagePercent
      })

      // 更新时间
      const now = new Date()
      lastUpdateTime.value = now.toLocaleTimeString('zh-CN', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      })
    }
  } catch (e) {
    console.error('Failed to refresh system info:', e)
  }
}

// 定时刷新
let refreshInterval: ReturnType<typeof setInterval> | null = null

onMounted(() => {
  refreshData()
  // 每 2 秒刷新一次
  refreshInterval = setInterval(refreshData, 2000)
})

onUnmounted(() => {
  if (refreshInterval) {
    clearInterval(refreshInterval)
  }
})
</script>

<style scoped>
.resource-monitor {
  width: 280px;
  background: linear-gradient(180deg, #14141e 0%, #0e0e14 100%);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4), 0 0 60px rgba(0, 240, 255, 0.05);
}

/* 标题栏 */
.monitor-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  background: rgba(255, 255, 255, 0.02);
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
}

.header-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  font-weight: 600;
  color: #e5e5e7;
}

.header-title .iconfont {
  font-size: 14px;
  color: #00f0ff;
}

.close-btn {
  width: 24px;
  height: 24px;
  background: transparent;
  border: none;
  border-radius: 4px;
  color: #6b6b78;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
}

.close-btn:hover {
  background: rgba(255, 95, 87, 0.15);
  color: #ff5f57;
}

/* 内容区域 */
.monitor-content {
  padding: 12px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

/* 资源项 */
.resource-item {
  padding: 12px;
  background: rgba(255, 255, 255, 0.02);
  border: 1px solid rgba(255, 255, 255, 0.04);
  border-radius: 8px;
  transition: all 0.2s ease;
}

.resource-item:hover {
  background: rgba(255, 255, 255, 0.04);
}

.resource-item.critical {
  border-color: rgba(239, 68, 68, 0.3);
  background: rgba(239, 68, 68, 0.05);
}

.resource-item.warning {
  border-color: rgba(245, 158, 11, 0.3);
  background: rgba(245, 158, 11, 0.05);
}

.resource-header {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 10px;
}

.resource-icon {
  width: 32px;
  height: 32px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.resource-icon.cpu {
  background: rgba(59, 130, 246, 0.15);
  color: #3b82f6;
}

.resource-icon.memory {
  background: rgba(139, 92, 246, 0.15);
  color: #8b5cf6;
}

.resource-icon.storage {
  background: rgba(16, 185, 129, 0.15);
  color: #10b981;
}

.resource-icon .iconfont {
  font-size: 14px;
}

.resource-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.resource-label {
  font-size: 11px;
  color: #6b6b78;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.resource-value {
  font-size: 16px;
  font-weight: 700;
  color: #e5e5e7;
}

.resource-status {
  padding: 3px 8px;
  border-radius: 4px;
  font-size: 10px;
  font-weight: 600;
}

.resource-status.normal {
  background: rgba(16, 185, 129, 0.15);
  color: #10b981;
}

.resource-status.warning {
  background: rgba(245, 158, 11, 0.15);
  color: #f59e0b;
}

.resource-status.critical {
  background: rgba(239, 68, 68, 0.15);
  color: #ef4444;
  animation: status-pulse 1s ease-in-out infinite;
}

@keyframes status-pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.7; }
}

/* 进度条 */
.progress-bar {
  height: 4px;
  background: rgba(255, 255, 255, 0.08);
  border-radius: 2px;
  overflow: hidden;
  margin-bottom: 8px;
}

.progress-fill {
  height: 100%;
  border-radius: 2px;
  transition: width 0.3s ease;
}

.progress-fill.cpu {
  background: linear-gradient(90deg, #3b82f6, #60a5fa);
}

.progress-fill.memory {
  background: linear-gradient(90deg, #8b5cf6, #a78bfa);
}

.progress-fill.storage {
  background: linear-gradient(90deg, #10b981, #34d399);
}

.progress-fill.warning {
  background: linear-gradient(90deg, #f59e0b, #fbbf24);
}

.progress-fill.critical {
  background: linear-gradient(90deg, #ef4444, #f87171);
  animation: progress-pulse 1s ease-in-out infinite;
}

@keyframes progress-pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.8; }
}

/* 详细信息 */
.resource-detail {
  display: flex;
  justify-content: space-between;
  font-size: 10px;
  color: #5a5a68;
}

/* 底部 */
.monitor-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 16px;
  background: rgba(255, 255, 255, 0.02);
  border-top: 1px solid rgba(255, 255, 255, 0.05);
}

.refresh-time {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 10px;
  color: #5a5a68;
}

.refresh-time .iconfont {
  font-size: 10px;
}

.refresh-btn {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 5px 10px;
  background: rgba(0, 240, 255, 0.08);
  border: 1px solid rgba(0, 240, 255, 0.15);
  border-radius: 6px;
  color: #00f0ff;
  font-size: 10px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.refresh-btn:hover {
  background: rgba(0, 240, 255, 0.15);
  border-color: rgba(0, 240, 255, 0.25);
}

.refresh-btn .iconfont {
  font-size: 10px;
}
</style>