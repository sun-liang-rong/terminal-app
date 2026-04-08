// 布局偏好存储
import { ref, watch } from 'vue'

// 布局设置类型
export interface LayoutSettings {
  sidebarPosition: 'left' | 'right'
  sidebarCollapsed: boolean
  sidebarWidth: number
  statusBarHeight: number
  customThemeColor: string | null
  compactMode: boolean
}

// 默认设置
const defaultSettings: LayoutSettings = {
  sidebarPosition: 'left',
  sidebarCollapsed: false,
  sidebarWidth: 200,
  statusBarHeight: 28,
  customThemeColor: null,
  compactMode: false
}

// 存储键
const STORAGE_KEY = 'neural-terminal-layout'

// 响应式状态
export const layoutState = ref<LayoutSettings>({ ...defaultSettings })

// 是否已初始化
let initialized = false

// 监听器集合
const listeners = new Set<(settings: LayoutSettings) => void>()

// 从存储加载
const loadFromStorage = () => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) {
      const parsed = JSON.parse(stored)
      layoutState.value = { ...defaultSettings, ...parsed }
    }
  } catch (e) {
    console.error('Failed to load layout settings:', e)
  }
}

// 保存到存储
const saveToStorage = () => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(layoutState.value))
  } catch (e) {
    console.error('Failed to save layout settings:', e)
  }
}

// 初始化
export const initLayout = () => {
  if (initialized) return
  initialized = true
  loadFromStorage()

  // 监听变化自动保存
  watch(layoutState, () => {
    saveToStorage()
    listeners.forEach(listener => listener(layoutState.value))
  }, { deep: true })
}

// 获取设置
export const getLayoutSettings = (): LayoutSettings => {
  return { ...layoutState.value }
}

// 更新设置
export const updateLayoutSetting = <K extends keyof LayoutSettings>(
  key: K,
  value: LayoutSettings[K]
) => {
  layoutState.value[key] = value
}

// 切换侧边栏折叠
export const toggleSidebarCollapsed = () => {
  layoutState.value.sidebarCollapsed = !layoutState.value.sidebarCollapsed
}

// 设置侧边栏折叠状态
export const setSidebarCollapsed = (collapsed: boolean) => {
  layoutState.value.sidebarCollapsed = collapsed
}

// 切换侧边栏位置
export const toggleSidebarPosition = () => {
  layoutState.value.sidebarPosition = layoutState.value.sidebarPosition === 'left' ? 'right' : 'left'
}

// 设置自定义主题色
export const setCustomThemeColor = (color: string | null) => {
  layoutState.value.customThemeColor = color
  if (color) {
    // 更新 CSS 变量
    document.documentElement.style.setProperty('--color-brand-primary', color)
    // 计算辅助色
    const r = parseInt(color.slice(1, 3), 16)
    const g = parseInt(color.slice(3, 5), 16)
    const b = parseInt(color.slice(5, 7), 16)
    document.documentElement.style.setProperty('--color-brand-primary-rgb', `${r}, ${g}, ${b}`)
  } else {
    // 恢复默认
    document.documentElement.style.setProperty('--color-brand-primary', '#00f0ff')
    document.documentElement.style.setProperty('--color-brand-primary-rgb', '0, 240, 255')
  }
}

// 切换紧凑模式
export const toggleCompactMode = () => {
  layoutState.value.compactMode = !layoutState.value.compactMode
}

// 订阅设置变化
export const subscribeLayout = (listener: (settings: LayoutSettings) => void): (() => void) => {
  listeners.add(listener)
  listener(layoutState.value)
  return () => listeners.delete(listener)
}

// 重置设置
export const resetLayoutSettings = () => {
  layoutState.value = { ...defaultSettings }
  setCustomThemeColor(null)
}