// 终端主题类型定义
export type ThemeKey = 'darkPro' | 'cyberNeon' | 'softNight' | 'lightClean' | 'matrix' | 'dracula' | 'nord'

export interface TerminalTheme {
  name: string
  description: string
  background: string
  foreground: string
  cursor: string
  cursorAccent: string
  selectionBackground: string
  selectionForeground: string
  black: string
  red: string
  green: string
  yellow: string
  blue: string
  magenta: string
  cyan: string
  white: string
  brightBlack: string
  brightRed: string
  brightGreen: string
  brightYellow: string
  brightBlue: string
  brightMagenta: string
  brightCyan: string
  brightWhite: string
}

// 终端主题配置 - 根据产品设计文档定义
export const terminalThemes: Record<ThemeKey, TerminalTheme> & Record<string, TerminalTheme> = {
  // 主题一：专业深色（Dark Pro）- 默认主题/开发首选
  darkPro: {
    name: '专业深色',
    description: '默认主题，适合日常开发',
    background: '#1e1e1e',
    foreground: '#d4d4d4',
    cursor: '#aeafad',
    cursorAccent: '#1e1e1e',
    selectionBackground: '#264f78',
    selectionForeground: '#d4d4d4',

    // ANSI 标准颜色 (0-7)
    black: '#000000',
    red: '#cd3131',
    green: '#0dbc79',
    yellow: '#e5e510',
    blue: '#2472c8',
    magenta: '#bc3fbc',
    cyan: '#11a8cd',
    white: '#e5e5e5',

    // 高亮颜色 (8-15)
    brightBlack: '#666666',
    brightRed: '#f14c4c',
    brightGreen: '#23d18b',
    brightYellow: '#f5f543',
    brightBlue: '#3b8eea',
    brightMagenta: '#d670d6',
    brightCyan: '#29b8db',
    brightWhite: '#e5e5e5'
  },

  // 主题二：赛博科技（Cyber Neon）- 科技感/AI终端推荐
  cyberNeon: {
    name: '赛博科技',
    description: '科技感强烈，适合展示',
    background: '#0a0e1a',
    foreground: '#e0e7ff',
    cursor: '#00f0ff',
    cursorAccent: '#0a0e1a',
    selectionBackground: '#1e3a5f',
    selectionForeground: '#e0e7ff',

    black: '#0a0e1a',
    red: '#ff3366',
    green: '#00ff88',
    yellow: '#ffcc00',
    blue: '#00b4ff',
    magenta: '#bf5af2',
    cyan: '#00f0ff',
    white: '#e0e7ff',

    brightBlack: '#3d4663',
    brightRed: '#ff5c8a',
    brightGreen: '#33ffaa',
    brightYellow: '#ffdd44',
    brightBlue: '#44ccff',
    brightMagenta: '#d68bff',
    brightCyan: '#44ffff',
    brightWhite: '#ffffff'
  },

  // 主题三：柔和夜间（Soft Night）- 护眼主题
  softNight: {
    name: '柔和夜间',
    description: '低饱和度，长时间使用护眼',
    background: '#1a1b26',
    foreground: '#a9b1d6',
    cursor: '#565f89',
    cursorAccent: '#1a1b26',
    selectionBackground: '#283457',
    selectionForeground: '#a9b1d6',

    black: '#15161e',
    red: '#f7768e',
    green: '#9ece6a',
    yellow: '#e0af68',
    blue: '#7aa2f7',
    magenta: '#bb9af7',
    cyan: '#7dcfff',
    white: '#a9b1d6',

    brightBlack: '#414868',
    brightRed: '#f7768e',
    brightGreen: '#9ece6a',
    brightYellow: '#e0af68',
    brightBlue: '#7aa2f7',
    brightMagenta: '#bb9af7',
    brightCyan: '#7dcfff',
    brightWhite: '#c0caf5'
  },

  // 主题四：浅色简洁（Light Clean）- 白天使用
  lightClean: {
    name: '浅色简洁',
    description: '清爽干净，适合白天办公',
    background: '#ffffff',
    foreground: '#383a42',
    cursor: '#383a42',
    cursorAccent: '#ffffff',
    selectionBackground: '#b4d5fe',
    selectionForeground: '#383a42',

    black: '#383a42',
    red: '#e45649',
    green: '#50a14f',
    yellow: '#c18401',
    blue: '#0184bc',
    magenta: '#a626a4',
    cyan: '#0997b3',
    white: '#fafafa',

    brightBlack: '#4f525e',
    brightRed: '#e06c75',
    brightGreen: '#98c379',
    brightYellow: '#e5c07b',
    brightBlue: '#61afef',
    brightMagenta: '#c678dd',
    brightCyan: '#56b6c2',
    brightWhite: '#ffffff'
  },

  // 主题五：黑客矩阵（Matrix）- 个性化展示
  matrix: {
    name: '黑客矩阵',
    description: '极客风格，绿色主题',
    background: '#000000',
    foreground: '#00ff00',
    cursor: '#00ff00',
    cursorAccent: '#000000',
    selectionBackground: '#003300',
    selectionForeground: '#00ff00',

    black: '#000000',
    red: '#00ff00',
    green: '#00ff00',
    yellow: '#00ff00',
    blue: '#00ff00',
    magenta: '#00ff00',
    cyan: '#00ff00',
    white: '#00ff00',

    brightBlack: '#003300',
    brightRed: '#00ff00',
    brightGreen: '#00ff00',
    brightYellow: '#33ff33',
    brightBlue: '#00ff00',
    brightMagenta: '#00ff00',
    brightCyan: '#00ff00',
    brightWhite: '#66ff66'
  },

  // 保留经典主题
  dracula: {
    name: 'Dracula',
    description: '经典紫色主题',
    background: '#282a36',
    foreground: '#f8f8f2',
    cursor: '#f8f8f0',
    cursorAccent: '#282a36',
    selectionBackground: '#44475a',
    selectionForeground: '#f8f8f2',

    black: '#21222c',
    red: '#ff5555',
    green: '#50fa7b',
    yellow: '#f1fa8c',
    blue: '#bd93f9',
    magenta: '#ff79c6',
    cyan: '#8be9fd',
    white: '#f8f8f2',

    brightBlack: '#6272a4',
    brightRed: '#ff6e6e',
    brightGreen: '#69ff94',
    brightYellow: '#ffffa5',
    brightBlue: '#d6acff',
    brightMagenta: '#ff92df',
    brightCyan: '#a4ffff',
    brightWhite: '#ffffff'
  },

  nord: {
    name: 'Nord',
    description: '北欧冷色调',
    background: '#2e3440',
    foreground: '#d8dee9',
    cursor: '#d8dee9',
    cursorAccent: '#2e3440',
    selectionBackground: '#434c5e',
    selectionForeground: '#d8dee9',

    black: '#3b4252',
    red: '#bf616a',
    green: '#a3be8c',
    yellow: '#ebcb8b',
    blue: '#81a1c1',
    magenta: '#b48ead',
    cyan: '#88c0d0',
    white: '#e5e9f0',

    brightBlack: '#4c566a',
    brightRed: '#bf616a',
    brightGreen: '#a3be8c',
    brightYellow: '#ebcb8b',
    brightBlue: '#81a1c1',
    brightMagenta: '#b48ead',
    brightCyan: '#8fbcbb',
    brightWhite: '#eceff4'
  }
}

// 获取默认主题
export function getDefaultTheme() {
  return terminalThemes.darkPro
}

// 获取所有主题名称
export function getThemeNames() {
  return Object.keys(terminalThemes).map(key => ({
    key,
    name: terminalThemes[key].name,
    description: terminalThemes[key].description
  }))
}