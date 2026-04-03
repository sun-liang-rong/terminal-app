// 主题状态管理
import { reactive, readonly } from 'vue'
import { terminalThemes } from './themes'

// 创建响应式主题状态
const state = reactive({
  currentTheme: 'neural',
  themes: terminalThemes
})

// 获取当前主题配置
export function getCurrentTheme() {
  return state.themes[state.currentTheme]
}

// 获取当前主题名称
export function getCurrentThemeName() {
  return state.currentTheme
}

// 获取所有主题列表
export function getThemeList() {
  return Object.keys(state.themes).map(key => ({
    key,
    name: state.themes[key].name
  }))
}

// 切换主题
export function setTheme(themeKey: string) {
  if (state.themes[themeKey]) {
    state.currentTheme = themeKey
    // 保存到 localStorage
    localStorage.setItem('terminal-theme', themeKey)
  }
}

// 初始化主题（从 localStorage 恢复）
export function initTheme() {
  const saved = localStorage.getItem('terminal-theme')
  if (saved && state.themes[saved]) {
    state.currentTheme = saved
  }
}

// 导出只读状态，防止外部直接修改
export const themeState = readonly(state)