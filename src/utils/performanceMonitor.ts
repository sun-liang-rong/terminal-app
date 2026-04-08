// 性能监控服务
import { ref } from 'vue'
import { toast } from './notification'

// 阈值配置类型
export interface ThresholdConfig {
  warning: number
  critical: number
}

// 默认阈值
const DEFAULT_THRESHOLDS: ThresholdConfig = {
  warning: 60,
  critical: 80
}

// 存储键
const THRESHOLD_STORAGE_KEY = 'neural-terminal-thresholds'

// 阈值配置（可自定义）
export const thresholds = ref<ThresholdConfig>({ ...DEFAULT_THRESHOLDS })

// 加载阈值配置
export const loadThresholds = () => {
  try {
    const stored = localStorage.getItem(THRESHOLD_STORAGE_KEY)
    if (stored) {
      thresholds.value = { ...DEFAULT_THRESHOLDS, ...JSON.parse(stored) }
    }
  } catch (e) {
    console.error('Failed to load thresholds:', e)
  }
}

// 保存阈值配置
export const saveThresholds = (newThresholds: Partial<ThresholdConfig>) => {
  thresholds.value = { ...thresholds.value, ...newThresholds }
  try {
    localStorage.setItem(THRESHOLD_STORAGE_KEY, JSON.stringify(thresholds.value))
  } catch (e) {
    console.error('Failed to save thresholds:', e)
  }
}

// 重置阈值
export const resetThresholds = () => {
  thresholds.value = { ...DEFAULT_THRESHOLDS }
  localStorage.removeItem(THRESHOLD_STORAGE_KEY)
}

// 内存状态类型
export interface MemoryStatus {
  usage: number
  status: 'normal' | 'warning' | 'critical'
  trend: 'stable' | 'increasing' | 'decreasing'
}

// 性能状态
export const memoryStatus = ref<MemoryStatus>({
  usage: 0,
  status: 'normal',
  trend: 'stable'
})

// 内存历史记录（用于趋势分析）
const memoryHistory: number[] = []
const MAX_HISTORY = 10

// 上次警告时间（防止频繁提示）
let lastWarningTime = 0
const WARNING_COOLDOWN = 60000 // 1 分钟冷却

// 会话警告阈值
const SESSION_WARNING_THRESHOLD = 5

// 根据阈值判断状态
const getStatusByThreshold = (usage: number): 'normal' | 'warning' | 'critical' => {
  if (usage >= thresholds.value.critical) return 'critical'
  if (usage >= thresholds.value.warning) return 'warning'
  return 'normal'
}

// 更新内存状态
export const updateMemoryStatus = (usage: number): MemoryStatus => {
  // 记录历史
  memoryHistory.push(usage)
  if (memoryHistory.length > MAX_HISTORY) {
    memoryHistory.shift()
  }

  // 计算趋势
  let trend: 'stable' | 'increasing' | 'decreasing' = 'stable'
  if (memoryHistory.length >= 3) {
    const recent = memoryHistory.slice(-3)
    const avg = recent.reduce((a, b) => a + b, 0) / recent.length
    const oldest = memoryHistory[0]
    if (avg > oldest + 5) {
      trend = 'increasing'
    } else if (avg < oldest - 5) {
      trend = 'decreasing'
    }
  }

  // 使用阈值配置确定状态
  const status = getStatusByThreshold(usage)

  memoryStatus.value = { usage, status, trend }

  // 触发警告（带冷却）
  const now = Date.now()
  if (status === 'critical' && now - lastWarningTime > WARNING_COOLDOWN) {
    lastWarningTime = now
    toast.memoryWarning(usage)
  } else if (status === 'warning' && trend === 'increasing' && now - lastWarningTime > WARNING_COOLDOWN * 2) {
    lastWarningTime = now
    toast.warning(`内存占用较高 (${usage.toFixed(0)}%)，建议关闭不用的会话`)
  }

  return memoryStatus.value
}

// 会话数量警告
export const checkSessionCount = (count: number): boolean => {
  if (count > SESSION_WARNING_THRESHOLD) {
    toast.warning(
      `当前有 ${count} 个会话，可能影响性能`,
      5000
    )
    return true
  }
  return false
}

// 获取优化建议
export const getOptimizationSuggestions = (sessionCount: number): string[] => {
  const suggestions: string[] = []

  if (memoryStatus.value.status !== 'normal') {
    suggestions.push('关闭不使用的终端会话')
    suggestions.push('检查是否有大量输出的命令')
  }

  if (sessionCount > 5) {
    suggestions.push(`当前有 ${sessionCount} 个会话，建议保持在 5 个以内`)
  }

  if (memoryStatus.value.trend === 'increasing') {
    suggestions.push('内存使用呈上升趋势，建议重启应用')
  }

  return suggestions
}

// 导出
export { memoryHistory }