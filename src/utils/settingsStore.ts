// 终端设置状态管理 - 统一管理所有终端配置
import { reactive, readonly } from 'vue'
import { terminalThemes } from './themes'

// 设置类型定义
interface TerminalSettings {
  // 主题
  theme: string
  // 字体设置
  fontSize: number
  fontFamily: string
  // 行为设置
  autoCopy: boolean
  cursorBlink: boolean
  cursorStyle: 'block' | 'underline' | 'bar'
}

// 默认设置
const defaultSettings: TerminalSettings = {
  theme: 'darkPro',
  fontSize: 14,
  fontFamily: "'JetBrains Mono', monospace",
  autoCopy: true,
  cursorBlink: true,
  cursorStyle: 'block'
}

// 响应式状态
const state = reactive<TerminalSettings>({ ...defaultSettings })

// 保存设置到 localStorage
function saveSettings() {
  localStorage.setItem('terminal-settings', JSON.stringify(state))
}

// 初始化设置（从 localStorage 恢复）
export function initSettings() {
  const saved = localStorage.getItem('terminal-settings')
  if (saved) {
    try {
      const parsed = JSON.parse(saved)
      // 合并保存的设置，保留默认值
      Object.assign(state, {
        ...defaultSettings,
        ...parsed
      })
    } catch (e) {
      console.error('Failed to load settings:', e)
    }
  }

  // 兼容旧的主题存储
  const savedTheme = localStorage.getItem('terminal-theme')
  if (savedTheme && terminalThemes[savedTheme]) {
    state.theme = savedTheme
  }
}

// 获取所有设置（只读）
export function getSettings(): Readonly<TerminalSettings> {
  return readonly(state)
}

// 获取单个设置
export function getSetting<K extends keyof TerminalSettings>(key: K): TerminalSettings[K] {
  return state[key]
}

// 更新单个设置
export function updateSetting<K extends keyof TerminalSettings>(
  key: K,
  value: TerminalSettings[K]
) {
  state[key] = value
  saveSettings()

  // 触发事件通知终端更新
  window.dispatchEvent(new CustomEvent('settings-change', {
    detail: { key, value }
  }))

  // 如果是主题变更，同时触发 theme-change 事件
  if (key === 'theme') {
    window.dispatchEvent(new CustomEvent('theme-change', {
      detail: value
    }))
  }
}

// 批量更新设置
export function updateAllSettings(settings: Partial<TerminalSettings>) {
  Object.assign(state, settings)
  saveSettings()

  // 触发事件
  window.dispatchEvent(new CustomEvent('settings-change', {
    detail: { ...state }
  }))
}

// 重置为默认设置
export function resetSettings() {
  Object.assign(state, defaultSettings)
  saveSettings()

  window.dispatchEvent(new CustomEvent('settings-change', {
    detail: { ...state }
  }))
  window.dispatchEvent(new CustomEvent('theme-change', {
    detail: state.theme
  }))
}

// ========== 主题相关方法 ==========

// 获取当前主题配置
export function getCurrentTheme() {
  return terminalThemes[state.theme]
}

// 获取当前主题名称
export function getCurrentThemeName() {
  return state.theme
}

// 获取所有主题列表
export function getThemeList() {
  return Object.keys(terminalThemes).map(key => ({
    key,
    name: terminalThemes[key].name
  }))
}

// 切换主题
export function setTheme(themeKey: string) {
  if (terminalThemes[themeKey]) {
    updateSetting('theme', themeKey)
  }
}

// 导出只读状态（供组件使用）
export const settingsState = readonly(state)

// 兼容旧 API
export { initSettings as initTheme }