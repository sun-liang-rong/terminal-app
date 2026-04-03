<template>
  <div ref="terminalRef" class="terminal"></div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch } from 'vue'
import { Terminal } from '@xterm/xterm'
import { FitAddon } from '@xterm/addon-fit'
import { WebLinksAddon } from '@xterm/addon-web-links'
import { initSettings, getSettings, getCurrentTheme } from '../utils/settingsStore'
// @ts-ignore - CSS import
import '@xterm/xterm/css/xterm.css'

const props = defineProps({
  sessionId: {
    type: Number,
    default: 1
  },
  active: {
    type: Boolean,
    default: true
  }
})

const emit = defineEmits(['title-change', 'new-session', 'close-session', 'switch-session'])

const terminalRef = ref<HTMLDivElement | null>(null)
let terminal: Terminal | null = null
let fitAddon: FitAddon | null = null
let resizeHandler: (() => void) | null = null
const terminalId = ref<string>(`session-${1}`)
let ptyDataListenerId: number | null = null
let ptyExitListenerId: number | null = null
let themeChangeListener: ((e: Event) => void) | null = null
let settingsChangeListener: ((e: Event) => void) | null = null

// 获取 electron API (通过 preload 暴露)
const electronAPI = window.electronAPI

// 初始化设置
initSettings()
const settings = getSettings()

onMounted(async () => {
  terminalId.value = `session-${props.sessionId}`
  const element = terminalRef.value
  if (!element) return

  // 获取当前主题
  const theme = getCurrentTheme()

  // 创建终端实例 - 使用设置中的配置
  terminal = new Terminal({
    fontSize: settings.fontSize,
    fontFamily: settings.fontFamily,
    fontWeight: '400',
    fontWeightBold: '600',
    cursorStyle: settings.cursorStyle,
    cursorBlink: settings.cursorBlink,
    theme,
    allowProposedApi: true,
    scrollback: 10000,
    cols: 80,
    rows: 24,
    letterSpacing: 0.5,
    lineHeight: 1.2,
    // 确保正确处理 ANSI 颜色转义序列
    convertEol: true
  })

  // 添加插件
  fitAddon = new FitAddon()
  terminal.loadAddon(fitAddon)
  terminal.loadAddon(new WebLinksAddon())

  // 打开终端
  terminal.open(element)

  // 监听主题变化
  themeChangeListener = () => {
    if (terminal) {
      const newTheme = getCurrentTheme()
      terminal.options.theme = newTheme
    }
  }
  window.addEventListener('theme-change', themeChangeListener as EventListener)

  // 监听设置变化
  settingsChangeListener = (e: Event) => {
    const customEvent = e as CustomEvent
    if (!terminal) return

    const { key, value } = customEvent.detail || {}

    switch (key) {
      case 'fontSize':
        terminal.options.fontSize = value
        break
      case 'fontFamily':
        terminal.options.fontFamily = value
        break
      case 'cursorBlink':
        terminal.options.cursorBlink = value
        break
      case 'cursorStyle':
        terminal.options.cursorStyle = value
        break
      case 'theme':
        terminal.options.theme = getCurrentTheme()
        break
    }

    // 字体变化后重新适应大小
    if (fitAddon && (key === 'fontSize' || key === 'fontFamily')) {
      fitAddon.fit()
    }
  }
  window.addEventListener('settings-change', settingsChangeListener as EventListener)

  // 显示欢迎横幅
  await showWelcomeBanner()

  const term = terminal
  const fit = fitAddon
  const tid = terminalId.value

  // 获取实际尺寸后自适应并创建 PTY
  setTimeout(async () => {
    if (!props.active || !term || !fit) return

    fit.fit()
    const { cols, rows } = term

    // 创建真实 PTY 进程
    try {
      const result = await electronAPI.ptyCreate({ id: tid, cols, rows })
      if (result.success) {
        console.log('PTY created, PID:', result.pid)
        emit('title-change', `Shell — ${result.pid}`)
      } else {
        term.writeln(`\r\n\x1b[31m无法创建 Shell: ${result.error}\x1b[0m`)
        term.writeln('\x1b[33m切换到模拟模式.\x1b[0m\r\n')
        initSimulationMode()
      }
    } catch (error) {
      console.error('Error creating PTY:', error)
      term.writeln(`\r\n\x1b[31m错误: ${(error as Error).message}\x1b[0m`)
      term.writeln('\x1b[33m切换到模拟模式.\x1b[0m\r\n')
      initSimulationMode()
    }
  }, 800)

  // 监听 PTY 输出
  ptyDataListenerId = electronAPI.onPtyData(({ id, data }) => {
    if (id === terminalId.value && terminal) {
      terminal.write(data)
    }
  })

  ptyExitListenerId = electronAPI.onPtyExit(({ id, exitCode }) => {
    if (id === terminalId.value && terminal) {
      terminal.writeln(`\r\n\x1b[31m进程已退出，退出码: ${exitCode}\x1b[0m`)
      emit('title-change', `已退出 (${exitCode})`)
    }
  })

  // 用户输入转发到 PTY
  terminal.onData((data) => {
    electronAPI.ptyWrite({ id: terminalId.value, data })
  })

  // 复制功能：选择文本后自动复制，或 Ctrl+Shift+C 复制
  terminal.onSelectionChange(() => {
    if (!settings.autoCopy) return
    if (terminal && terminal.hasSelection()) {
      const selection = terminal.getSelection()
      if (selection) {
        electronAPI.clipboardWrite(selection)
      }
    }
  })

  // 键盘快捷键
  terminal.attachCustomKeyEventHandler((event) => {
    // 只处理 keydown 事件，避免重复
    if (event.type !== 'keydown') return true

    // Ctrl+Shift+C 复制
    if (event.ctrlKey && event.shiftKey) {
      if (event.key === 'C' || event.key === 'c') {
        if (terminal) {
          const selection = terminal.getSelection()
          if (selection) {
            electronAPI.clipboardWrite(selection)
          }
        }
        return false
      }
      // Ctrl+Shift+V 粘贴
      if (event.key === 'V' || event.key === 'v') {
        const text = electronAPI.clipboardRead()
        if (text) {
          electronAPI.ptyWrite({ id: terminalId.value, data: text })
        }
        return false
      }
    }

    // Ctrl+T 新建会话
    if (event.ctrlKey && !event.shiftKey && (event.key === 't' || event.key === 'T')) {
      emit('new-session')
      return false
    }

    // Ctrl+W 关闭会话
    if (event.ctrlKey && !event.shiftKey && (event.key === 'w' || event.key === 'W')) {
      emit('close-session')
      return false
    }

    // Ctrl+1-9 切换会话
    if (event.ctrlKey && event.key >= '1' && event.key <= '9') {
      emit('switch-session', parseInt(event.key))
      return false
    }

    return true
  })

  // 窗口大小改变时调整 PTY
  resizeHandler = () => {
    if (fitAddon && terminal && props.active) {
      fitAddon.fit()
      const { cols, rows } = terminal
      electronAPI.ptyResize({ id: terminalId.value, cols, rows })
    }
  }
  window.addEventListener('resize', resizeHandler)
})

// 当会话变为活跃时，调整终端大小并确保 PTY 已创建
watch(() => props.active, async (active, wasActive) => {
  if (active && terminal && fitAddon) {
    setTimeout(() => {
      if (!terminal || !fitAddon) return
      fitAddon.fit()
      const { cols, rows } = terminal
      electronAPI.ptyResize({ id: terminalId.value, cols, rows })
    }, 50)

    // 如果之前没有活跃过，需要创建 PTY
    if (!wasActive) {
      if (!terminal) return
      const { cols, rows } = terminal
      try {
        const result = await electronAPI.ptyCreate({ id: terminalId.value, cols, rows })
        if (result.success) {
          emit('title-change', `Shell — ${result.pid}`)
        } else {
          initSimulationMode()
        }
      } catch (error) {
        initSimulationMode()
      }
    }
  }
})

onUnmounted(() => {
  if (resizeHandler) {
    window.removeEventListener('resize', resizeHandler)
  }

  // 移除主题监听器
  if (themeChangeListener) {
    window.removeEventListener('theme-change', themeChangeListener as EventListener)
  }

  // 移除设置监听器
  if (settingsChangeListener) {
    window.removeEventListener('settings-change', settingsChangeListener as EventListener)
  }

  // 移除 PTY 监听器
  if (ptyDataListenerId && electronAPI.removePtyListener) {
    electronAPI.removePtyListener(ptyDataListenerId)
  }
  if (ptyExitListenerId && electronAPI.removePtyListener) {
    electronAPI.removePtyListener(ptyExitListenerId)
  }

  if (terminal) {
    terminal.dispose()
    terminal = null
  }

  // 关闭 PTY 进程
  electronAPI.ptyKill({ id: terminalId.value })
})

// 显示欢迎横幅
async function showWelcomeBanner() {
  if (!terminal) return

  const now = new Date()
  const dateStr = now.toLocaleDateString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit' })
  const timeStr = now.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })

  // 获取系统信息
  let sysInfo = null
  try {
    if (electronAPI.getSystemInfo) {
      sysInfo = await electronAPI.getSystemInfo()
    }
  } catch (e) {
    console.error('Failed to get system info:', e)
  }

  // 格式化字节数
  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i]
  }

  terminal.writeln('')
  // ASCII Logo - 神经终端
  terminal.writeln('\x1b[36m    ███╗   ██╗██████╗ ███████╗██████╗ ███████╗██╗███╗   ███╗███████╗\x1b[0m')
  terminal.writeln('\x1b[36m    ████╗  ██║██╔══██╗██╔════╝██╔══██╗██╔════╝██║████╗ ████║██╔════╝\x1b[0m')
  terminal.writeln('\x1b[36m    ██╔██╗ ██║██████╔╝█████╗  ██████╔╝█████╗  ██║██╔████╔██║█████╗  \x1b[0m')
  terminal.writeln('\x1b[36m    ██║╚██╗██║██╔══██╗██╔══╝  ██╔══██╗██╔══╝  ██║██║╚██╗╚██║██╔══╝  \x1b[0m')
  terminal.writeln('\x1b[36m    ██║ ╚████║██████╔╝███████╗██║  ██║███████╗██║██║ ╚████║███████╗\x1b[0m')
  terminal.writeln('\x1b[36m    ╚═╝  ╚═══╝╚═════╝ ╚══════╝╚═╝  ╚═╝╚══════╝╚═╝╚═╝  ╚═══╝╚══════╝\x1b[0m')
  terminal.writeln('')

  // 信息面板
  terminal.writeln('\x1b[36m╭─────────────────────────────────────────────────────────────────────╮\x1b[0m')
  terminal.writeln('\x1b[36m│\x1b[0m  \x1b[1m\x1b[35m神经终端\x1b[0m \x1b[33mNeural Terminal\x1b[0m          \x1b[32m版本 v4.0.2\x1b[0m              \x1b[36m│\x1b[0m')
  terminal.writeln('\x1b[36m├─────────────────────────────────────────────────────────────────────┤\x1b[0m')
  terminal.writeln('\x1b[36m│\x1b[0m  \x1b[34m▸\x1b[0m \x1b[37m系统时间:\x1b[0m \x1b[33m' + dateStr + ' ' + timeStr + '\x1b[0m                                         \x1b[36m│\x1b[0m')
  terminal.writeln('\x1b[36m│\x1b[0m  \x1b[34m▸\x1b[0m \x1b[37m会话编号:\x1b[0m \x1b[33m终端 ' + props.sessionId + '\x1b[0m                                         \x1b[36m│\x1b[0m')

  // 系统信息
  if (sysInfo) {
    terminal.writeln('\x1b[36m├─────────────────────────────────────────────────────────────────────┤\x1b[0m')
    const cpuInfo = sysInfo.cpu.cores + '核 ' + sysInfo.cpu.speed
    const cpuUsage = sysInfo.cpu.usage.toFixed(1) + '%'
    terminal.writeln('\x1b[36m│\x1b[0m  \x1b[34m▸\x1b[0m \x1b[37mCPU:\x1b[0m \x1b[33m' + cpuInfo.padEnd(20) + '\x1b[37m占用:\x1b[0m \x1b[31m' + cpuUsage.padEnd(10) + '                    \x1b[36m│\x1b[0m')

    const memTotal = formatBytes(sysInfo.memory.total)
    const memUsed = formatBytes(sysInfo.memory.used)
    const memPercent = sysInfo.memory.usagePercent.toFixed(1) + '%'
    terminal.writeln('\x1b[36m│\x1b[0m  \x1b[34m▸\x1b[0m \x1b[37m内存:\x1b[0m \x1b[33m' + memUsed + ' / ' + memTotal + '\x1b[0m      \x1b[37m占用:\x1b[0m \x1b[31m' + memPercent.padEnd(10) + '             \x1b[36m│\x1b[0m')

    const diskTotal = formatBytes(sysInfo.storage.total)
    const diskUsed = formatBytes(sysInfo.storage.used)
    const diskPercent = sysInfo.storage.usagePercent.toFixed(1) + '%'
    terminal.writeln('\x1b[36m│\x1b[0m  \x1b[34m▸\x1b[0m \x1b[37m存储:\x1b[0m \x1b[33m' + diskUsed + ' / ' + diskTotal + '\x1b[0m      \x1b[37m占用:\x1b[0m \x1b[31m' + diskPercent.padEnd(10) + '             \x1b[36m│\x1b[0m')
  }

  terminal.writeln('\x1b[36m├─────────────────────────────────────────────────────────────────────┤\x1b[0m')
  terminal.writeln('\x1b[36m│\x1b[0m  \x1b[37m快捷键:\x1b[0m                                                            \x1b[36m│\x1b[0m')
  terminal.writeln('\x1b[36m│\x1b[0m    \x1b[32mCtrl+T\x1b[0m  新建会话    \x1b[32mCtrl+W\x1b[0m  关闭会话    \x1b[32mCtrl+1-9\x1b[0m  切换会话 \x1b[36m│\x1b[0m')
  terminal.writeln('\x1b[36m│\x1b[0m    \x1b[32mCtrl+Shift+C\x1b[0m  复制    \x1b[32mCtrl+Shift+V\x1b[0m  粘贴              \x1b[36m│\x1b[0m')
  terminal.writeln('\x1b[36m╰─────────────────────────────────────────────────────────────────────╯\x1b[0m')
  terminal.writeln('')
}

// 模拟模式（当 PTY 不可用时）
function initSimulationMode() {
  if (!terminal) return

  let commandBuffer = ''
  const prompt = '\x1b[36m➜ \x1b[34m神经终端\x1b[0m \x1b[33m~\x1b[0m $ '

  terminal.writeln('')
  terminal.writeln('\x1b[36m╭─────────────────────────────────────────╮\x1b[0m')
  terminal.writeln('\x1b[36m│\x1b[0m  \x1b[1m\x1b[33m终端模拟模式\x1b[0m              \x1b[36m│\x1b[0m')
  terminal.writeln('\x1b[36m╰─────────────────────────────────────────╯\x1b[0m')
  terminal.writeln('')
  terminal.write(prompt)

  emit('title-change', '模拟模式')

  terminal.onData((data) => {
    if (!terminal) return
    const code = data.charCodeAt(0)

    if (code === 13) { // Enter
      terminal.writeln('')
      processSimulatedCommand(commandBuffer.trim())
      commandBuffer = ''
      terminal.write(prompt)
    } else if (code === 127) { // Backspace
      if (commandBuffer.length > 0) {
        commandBuffer = commandBuffer.slice(0, -1)
        terminal.write('\b \b')
      }
    } else if (code === 3) { // Ctrl+C
      commandBuffer = ''
      terminal.writeln('^C')
      terminal.write(prompt)
    } else if (code >= 32 && code < 127) { // Regular character
      commandBuffer += data
      terminal.write(data)
    }
  })
}

function processSimulatedCommand(cmd: string) {
  if (!terminal || !cmd) return

  const args = cmd.split(' ')
  const command = args[0].toLowerCase()

  switch (command) {
    case 'help':
      terminal.writeln('\x1b[36m可用命令:\x1b[0m')
      terminal.writeln('  \x1b[32mhelp\x1b[0m     - 显示帮助信息')
      terminal.writeln('  \x1b[32mclear\x1b[0m    - 清屏')
      terminal.writeln('  \x1b[32mdate\x1b[0m     - 显示日期')
      terminal.writeln('  \x1b[32mwhoami\x1b[0m   - 显示用户')
      terminal.writeln('  \x1b[32mls\x1b[0m       - 列出文件')
      terminal.writeln('  \x1b[32mpwd\x1b[0m      - 显示目录')
      terminal.writeln('  \x1b[32mecho\x1b[0m     - 输出文本')
      break
    case 'clear':
      terminal.clear()
      break
    case 'date':
      terminal.writeln(`\x1b[33m${new Date().toLocaleString('zh-CN')}\x1b[0m`)
      break
    case 'whoami':
      terminal.writeln('\x1b[35m用户@神经终端\x1b[0m')
      break
    case 'pwd':
      terminal.writeln('\x1b[34m/用户/项目/神经终端\x1b[0m')
      break
    case 'ls':
      terminal.writeln('\x1b[34m配置文件/\x1b[0m  \x1b[34m日志/\x1b[0m  \x1b[32m启动.sh\x1b[0m  \x1b[32m主程序.sh\x1b[0m  \x1b[36m说明.md\x1b[0m')
      break
    case 'echo':
      terminal.writeln(args.slice(1).join(' '))
      break
    default:
      terminal.writeln(`\x1b[31m命令未找到: ${command}\x1b[0m`)
      terminal.writeln(`输入 \x1b[32mhelp\x1b[0m 查看可用命令`)
  }
}
</script>

<style scoped>
.terminal {
  width: 100%;
  height: 100%;
  background: #0f0f14;
  padding: 0;
  margin: 0;
  overflow: hidden;
}

/* 确保终端内容从左上角开始 */
.terminal :deep(.xterm) {
  padding: 0;
  margin: 0;
}

.terminal :deep(.xterm-screen) {
  padding: 0 !important;
  margin: 0 !important;
}

.terminal :deep(.xterm-rows) {
  padding: 0 !important;
  margin: 0 !important;
}

.terminal :deep(.xterm-row) {
  padding: 0 !important;
  margin: 0 !important;
  height: 1.4em;
  line-height: 1.4;
}

/* 移除 xterm 默认内边距 */
.terminal :deep(.xterm-viewport) {
  padding: 0 !important;
  margin: 0 !important;
}

/* 自定义滚动条样式 */
.terminal :deep(.xterm-viewport::-webkit-scrollbar) {
  width: 8px;
}

.terminal :deep(.xterm-viewport::-webkit-scrollbar-track) {
  background: #0f0f14;
}

.terminal :deep(.xterm-viewport::-webkit-scrollbar-thumb) {
  background: #23232c;
  border-radius: 4px;
}

.terminal :deep(.xterm-viewport::-webkit-scrollbar-thumb:hover) {
  background: #00f0ff;
}
</style>