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
  assistantPanelVisible: boolean
}

// 默认设置
const defaultSettings: LayoutSettings = {
  sidebarPosition: 'left',
  sidebarCollapsed: false,
  sidebarWidth: 200,
  statusBarHeight: 28,
  customThemeColor: null,
  compactMode: false,
  assistantPanelVisible: true
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

  const root = document.documentElement
  const style = root.style

  if (color) {
    // 解析颜色
    const r = parseInt(color.slice(1, 3), 16)
    const g = parseInt(color.slice(3, 5), 16)
    const b = parseInt(color.slice(5, 7), 16)

    // 计算 HSL 值用于生成变体
    const hsl = rgbToHsl(r, g, b)

    // 主色调 - 使用用户选择的颜色
    style.setProperty('--color-primary', color)
    style.setProperty('--color-primary-rgb', `${r}, ${g}, ${b}`)

    // 生成变体颜色
    const dimColor = hslToHex(hsl.h, hsl.s, Math.max(hsl.l - 10, 20))
    const containerColor = hslToHex(hsl.h, hsl.s, Math.min(hsl.l + 10, 90))
    style.setProperty('--color-primary-dim', dimColor)
    style.setProperty('--color-primary-fixed', color)
    style.setProperty('--color-primary-fixed-dim', dimColor)
    style.setProperty('--color-primary-container', containerColor)

    // 计算对比文字颜色
    const onColor = hsl.l > 50 ? '#1a1a2e' : '#ffffff'
    style.setProperty('--color-on-primary', onColor)
    style.setProperty('--color-on-primary-container', onColor)

    // 边框发光色
    style.setProperty('--color-border-primary', `rgba(${r}, ${g}, ${b}, 0.25)`)

    // 阴影发光
    style.setProperty('--shadow-primary', `0 0 24px rgba(${r}, ${g}, ${b}, 0.2)`)
  } else {
    // 恢复默认 - Nocturnal 紫色主题
    style.setProperty('--color-primary', '#b79fff')
    style.setProperty('--color-primary-rgb', '183, 159, 255')
    style.setProperty('--color-primary-dim', '#a88cfb')
    style.setProperty('--color-primary-fixed', '#ab8ffe')
    style.setProperty('--color-primary-fixed-dim', '#9d81f0')
    style.setProperty('--color-primary-container', '#ab8ffe')
    style.setProperty('--color-on-primary', '#361083')
    style.setProperty('--color-on-primary-container', '#290070')
    style.setProperty('--color-border-primary', 'rgba(183, 159, 255, 0.25)')
    style.setProperty('--shadow-primary', '0 0 24px rgba(183, 159, 255, 0.2)')
  }
}

// RGB 转 HSL
function rgbToHsl(r: number, g: number, b: number): { h: number; s: number; l: number } {
  r /= 255
  g /= 255
  b /= 255

  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  let h = 0
  let s = 0
  const l = (max + min) / 2

  if (max !== min) {
    const d = max - min
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min)

    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break
      case g: h = ((b - r) / d + 2) / 6; break
      case b: h = ((r - g) / d + 4) / 6; break
    }
  }

  return { h: h * 360, s: s * 100, l: l * 100 }
}

// HSL 转 Hex
function hslToHex(h: number, s: number, l: number): string {
  s /= 100
  l /= 100

  const c = (1 - Math.abs(2 * l - 1)) * s
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1))
  const m = l - c / 2

  let r = 0, g = 0, b = 0

  if (h >= 0 && h < 60) {
    r = c; g = x; b = 0
  } else if (h >= 60 && h < 120) {
    r = x; g = c; b = 0
  } else if (h >= 120 && h < 180) {
    r = 0; g = c; b = x
  } else if (h >= 180 && h < 240) {
    r = 0; g = x; b = c
  } else if (h >= 240 && h < 300) {
    r = x; g = 0; b = c
  } else {
    r = c; g = 0; b = x
  }

  const toHex = (n: number) => {
    const hex = Math.round((n + m) * 255).toString(16)
    return hex.length === 1 ? '0' + hex : hex
  }

  return `#${toHex(r)}${toHex(g)}${toHex(b)}`
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

// 切换AI面板显示
export const toggleAssistantPanel = () => {
  layoutState.value.assistantPanelVisible = !layoutState.value.assistantPanelVisible
}

// 设置AI面板显示状态
export const setAssistantPanelVisible = (visible: boolean) => {
  layoutState.value.assistantPanelVisible = visible
}

// 重置设置
export const resetLayoutSettings = () => {
  layoutState.value = { ...defaultSettings }
  setCustomThemeColor(null)
}