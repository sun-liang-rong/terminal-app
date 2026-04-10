<template>
  <div class="terminal-container">
    <div ref="terminalRef" class="terminal"></div>

    <!-- 空态引导层 -->
    <Transition name="guide-fade">
      <div v-if="showGuide" class="terminal-guide" @click="hideGuide">
        <div class="guide-content">
          <div class="guide-logo">
            <img src="/favicon.svg" alt="Logo" class="logo-icon" />
          </div>
          <h2 class="guide-title">欢迎使用神经终端</h2>
          <p class="guide-subtitle">高效、智能的现代化终端体验</p>

          <div class="guide-divider"></div>

          <div class="guide-actions">
            <div class="action-item">
              <div class="action-icon">
                <i class="iconfont icon-terminal"></i>
              </div>
              <div class="action-info">
                <span class="action-title">输入命令</span>
                <span class="action-desc">直接输入命令开始使用</span>
              </div>
            </div>
            <div class="action-item">
              <div class="action-icon ai">
                <i class="iconfont icon-ai"></i>
              </div>
              <div class="action-info">
                <span class="action-title">AI 助手</span>
                <span class="action-desc">切换到助手面板获取智能帮助</span>
              </div>
            </div>
            <div class="action-item">
              <div class="action-icon">
                <div class="key-badge">⌘K</div>
              </div>
              <div class="action-info">
                <span class="action-title">命令面板</span>
                <span class="action-desc">快速搜索进程、命令、主机</span>
              </div>
            </div>
          </div>

          <div class="guide-shortcuts">
            <div class="shortcut">
              <kbd>Ctrl</kbd>+<kbd>T</kbd>
              <span>新建会话</span>
            </div>
            <div class="shortcut">
              <kbd>Ctrl</kbd>+<kbd>Shift</kbd>+<kbd>C</kbd>
              <span>复制</span>
            </div>
            <div class="shortcut">
              <kbd>Ctrl</kbd>+<kbd>Shift</kbd>+<kbd>V</kbd>
              <span>粘贴</span>
            </div>
            <div class="shortcut">
              <kbd>Ctrl</kbd>+<kbd>1-9</kbd>
              <span>切换会话</span>
            </div>
          </div>

          <p class="guide-hint">点击任意位置或输入命令开始</p>
        </div>
      </div>
    </Transition>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch } from 'vue'
import { Terminal } from '@xterm/xterm'
import { FitAddon } from '@xterm/addon-fit'
import { WebLinksAddon } from '@xterm/addon-web-links'
import { initSettings, getSettings, getCurrentTheme } from '../utils/settingsStore'
import { updateStatus } from '../utils/terminalStatus'
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

const emit = defineEmits(['title-change', 'new-session', 'close-session', 'switch-session', 'shell-change'])

const terminalRef = ref<HTMLDivElement | null>(null)
let terminal: Terminal | null = null
let fitAddon: FitAddon | null = null
let resizeHandler: (() => void) | null = null
const terminalId = ref<string>(`session-${1}`)
let ptyDataListenerId: number | null = null
let ptyExitListenerId: number | null = null
let themeChangeListener: ((e: Event) => void) | null = null
let settingsChangeListener: ((e: Event) => void) | null = null

// PTY 状态跟踪
let ptyReady = false
let simulationMode = false
let onDataDisposable: { dispose: () => void } | null = null

// 空态引导层
const showGuide = ref(true)
const hideGuide = () => {
  showGuide.value = false
}

// 获取 electron API (通过 preload 暴露) - 每次访问都从 window 获取
const getElectronAPI = () => {
  const api = window.electronAPI
  if (!api) {
    console.error('[Terminal] electronAPI not found on window!')
    console.log('[Terminal] window keys:', Object.keys(window))
  }
  return api
}

// 检测 shell 名称
const getShellName = (): string => {
  // Windows 默认使用 PowerShell
  if (navigator.platform.toLowerCase().includes('win')) {
    return 'PowerShell'
  }
  // 其他系统根据环境变量判断
  return 'bash'
}

const shellName = getShellName()

// 设置变量（在 onMounted 中初始化）
let settings = getSettings()

onMounted(async () => {
  // 初始化设置
  await initSettings()
  settings = getSettings()

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
    convertEol: true,
    // 允许透明背景
    allowTransparency: true
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
      console.log('[Terminal] Theme changing to:', newTheme?.name || 'unknown')
      // 强制更新主题 - 使用 Object.assign 确保主题对象被正确应用
      Object.assign(terminal.options, { theme: newTheme })
      // 刷新终端显示 - 确保 rows 有效
      if (terminal.rows > 0) {
        terminal.refresh(0, terminal.rows - 1)
      }
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
        Object.assign(terminal.options, { theme: getCurrentTheme() })
        if (terminal.rows > 0) {
          terminal.refresh(0, terminal.rows - 1)
        }
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

  // 欢迎横幅显示后，延迟隐藏引导层（给用户时间看到引导信息）
  setTimeout(() => {
    hideGuide()
  }, 3000)

  const term = terminal
  const fit = fitAddon
  const tid = terminalId.value

  // 监听 PTY 输出 (在 PTY 创建前注册监听器)
  const electronAPI = getElectronAPI()
  if (electronAPI) {
    ptyDataListenerId = electronAPI.onPtyData(({ id, data }) => {
      if (id === terminalId.value && terminal) {
        terminal.write(data)
        // 隐藏引导层
        hideGuide()
      }
    })

    ptyExitListenerId = electronAPI.onPtyExit(({ id, exitCode }) => {
      if (id === terminalId.value && terminal) {
        terminal.writeln(`\r\n\x1b[31m进程已退出，退出码: ${exitCode}\x1b[0m`)
        emit('title-change', `已退出 (${exitCode})`)
        ptyReady = false
      }
    })
  }

  // 获取实际尺寸后自适应并创建 PTY
  setTimeout(async () => {
    if (!props.active || !term || !fit) return

    // 检查 electronAPI 是否可用
    const api = getElectronAPI()
    if (!api) {
      term.writeln('\r\n\x1b[33mElectron API 未加载，切换到模拟模式.\x1b[0m\r\n')
      initSimulationMode()
      return
    }

    fit.fit()
    const { cols, rows } = term

    // 创建真实 PTY 进程
    try {
      const result = await api.ptyCreate({ id: tid, cols, rows })
      if (result.success) {
        console.log('PTY created, PID:', result.pid)
        emit('title-change', `Shell — ${result.pid}`)
        emit('shell-change', shellName)
        ptyReady = true

        // PTY 创建成功后，绑定 onData 监听器
        if (terminal) {
          onDataDisposable = terminal.onData((data) => {
            // 隐藏引导层
            hideGuide()
            // 只有在 PTY 就绪时才发送数据
            if (ptyReady) {
              api.ptyWrite({ id: terminalId.value, data })
            }
          })
          // 更新状态
          updateStatus({
            connected: true,
            shell: shellName,
            activeSessionType: 'local',
            cols: terminal.cols,
            rows: terminal.rows,
            encoding: 'UTF-8'
          })
        }
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

  // 复制功能：选择文本后自动复制，或 Ctrl+Shift+C 复制
  terminal.onSelectionChange(() => {
    const electronAPI = getElectronAPI()
    if (!settings.autoCopy) return
    if (terminal && terminal.hasSelection()) {
      const selection = terminal.getSelection()
      if (selection && electronAPI) {
        electronAPI.clipboardWrite(selection)
      }
    }
  })

  // 键盘快捷键
  terminal.attachCustomKeyEventHandler((event) => {
    const electronAPI = getElectronAPI()
    // 只处理 keydown 事件，避免重复
    if (event.type !== 'keydown') return true

    // Ctrl+Shift+C 复制
    if (event.ctrlKey && event.shiftKey) {
      if (event.key === 'C' || event.key === 'c') {
        if (terminal && electronAPI) {
          const selection = terminal.getSelection()
          if (selection) {
            electronAPI.clipboardWrite(selection)
          }
        }
        return false
      }
      // Ctrl+Shift+V 粘贴 - 使用 xterm 的 paste 方法，避免重复发送
      if (event.key === 'V' || event.key === 'v') {
        if (electronAPI && terminal) {
          const text = electronAPI.clipboardRead()
          if (text) {
            // 使用 terminal.paste() 而不是 ptyWrite
            // 这样 xterm 会通过 onData 正确处理，避免重复
            terminal.paste(text)
          }
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
    const electronAPI = getElectronAPI()
    if (fitAddon && terminal && props.active && electronAPI) {
      fitAddon.fit()
      const { cols, rows } = terminal
      electronAPI.ptyResize({ id: terminalId.value, cols, rows })
      updateStatus({
        connected: ptyReady,
        shell: shellName,
        activeSessionType: 'local',
        cols,
        rows,
        encoding: 'UTF-8'
      })
    }
  }
  window.addEventListener('resize', resizeHandler)
})

// 当会话变为活跃时，调整终端大小并确保 PTY 已创建
watch(() => props.active, async (active, wasActive) => {
  const electronAPI = getElectronAPI()
  if (active && terminal && fitAddon) {
    setTimeout(() => {
      const api = getElectronAPI()
      if (!terminal || !fitAddon || !api || !ptyReady) return
      fitAddon.fit()
      const { cols, rows } = terminal
      api.ptyResize({ id: terminalId.value, cols, rows })
      // 更新状态栏
      updateStatus({
        connected: ptyReady,
        shell: shellName,
        activeSessionType: 'local',
        cols,
        rows,
        encoding: 'UTF-8'
      })
    }, 50)

    // 如果之前没有活跃过且 PTY 未创建，需要创建 PTY
    if (!wasActive && electronAPI && !ptyReady && !simulationMode) {
      if (!terminal) return
      fitAddon.fit()
      const { cols, rows } = terminal
      try {
        const result = await electronAPI.ptyCreate({ id: terminalId.value, cols, rows })
        if (result.success) {
          emit('title-change', `Shell — ${result.pid}`)
          ptyReady = true

          // PTY 创建成功后，绑定 onData 监听器
          if (terminal) {
            onDataDisposable = terminal.onData((data) => {
              if (ptyReady) {
                electronAPI.ptyWrite({ id: terminalId.value, data })
              }
            })
            // 更新状态栏
            updateStatus({
              connected: true,
              shell: shellName,
              activeSessionType: 'local',
              cols: terminal.cols,
              rows: terminal.rows,
              encoding: 'UTF-8'
            })
          }
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
  const electronAPI = getElectronAPI()
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

  // 清理 onData 监听器
  if (onDataDisposable) {
    onDataDisposable.dispose()
    onDataDisposable = null
  }

  // 移除 PTY 监听器
  if (electronAPI) {
    if (ptyDataListenerId && electronAPI.removePtyListener) {
      electronAPI.removePtyListener(ptyDataListenerId)
    }
    if (ptyExitListenerId && electronAPI.removePtyListener) {
      electronAPI.removePtyListener(ptyExitListenerId)
    }

    // 关闭 PTY 进程
    electronAPI.ptyKill({ id: terminalId.value })
  }

  if (terminal) {
    terminal.dispose()
    terminal = null
  }
})

// 显示欢迎横幅
async function showWelcomeBanner() {
  const electronAPI = getElectronAPI()
  if (!terminal) return

  const now = new Date()
  const dateStr = now.toLocaleDateString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit' })
  const timeStr = now.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })

  // 获取系统信息
  let sysInfo = null
  try {
    if (electronAPI && electronAPI.getSystemInfo) {
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

  // 设置模拟模式标志
  simulationMode = true
  ptyReady = false

  let commandBuffer = ''
  const prompt = '\x1b[36m➜ \x1b[34m神经终端\x1b[0m \x1b[33m~\x1b[0m $ '

  terminal.writeln('')
  terminal.writeln('\x1b[36m╭─────────────────────────────────────────╮\x1b[0m')
  terminal.writeln('\x1b[36m│\x1b[0m  \x1b[1m\x1b[33m终端模拟模式\x1b[0m              \x1b[36m│\x1b[0m')
  terminal.writeln('\x1b[36m╰─────────────────────────────────────────╯\x1b[0m')
  terminal.writeln('')
  terminal.write(prompt)

  emit('title-change', '模拟模式')

  // 绑定模拟模式的 onData（终端实例会自动处理多个监听器）
  terminal.onData((data) => {
    if (!terminal || !simulationMode) return
    // 隐藏引导层
    hideGuide()
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
.terminal-container {
  width: 100%;
  height: 100%;
  position: relative;
  overflow: hidden;
}

.terminal {
  width: 100%;
  height: 100%;
  padding: 0;
  margin: 0;
  overflow: hidden;
  box-shadow: var(--terminal-glow);
  /* 让 xterm 自己控制背景色 */
  background: transparent;
}

/* 空态引导层 */
.terminal-guide {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.95);
  backdrop-filter: var(--blur-md, blur(20px));
  z-index: 10;
  cursor: pointer;
}

.guide-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  max-width: 420px;
  padding: 40px;
  text-align: center;
}

/* Logo - 入场动画 */
.guide-logo {
  margin-bottom: 20px;
  animation: logo-enter 400ms cubic-bezier(0.25, 1, 0.5, 1) forwards;
  opacity: 0;
  transform: scale(0.8) translateY(20px);
}

@keyframes logo-enter {
  to {
    opacity: 1;
    transform: scale(1) translateY(0);
  }
}

.guide-logo .logo-icon {
  width: 56px;
  height: 56px;
  border-radius: 14px;
  object-fit: contain;
  box-shadow: var(--shadow-primary);
}

/* 标题 - 交错入场 */
.guide-title {
  font-size: 22px;
  font-weight: 600;
  color: var(--color-text-primary, #f5f5f7);
  margin-bottom: 6px;
  letter-spacing: -0.3px;
  animation: text-enter 300ms cubic-bezier(0.25, 1, 0.5, 1) 100ms forwards;
  opacity: 0;
  transform: translateY(10px);
}

.guide-subtitle {
  font-size: 13px;
  color: var(--color-text-tertiary, #6e6e73);
  margin-bottom: 24px;
  animation: text-enter 300ms cubic-bezier(0.25, 1, 0.5, 1) 150ms forwards;
  opacity: 0;
  transform: translateY(10px);
}

@keyframes text-enter {
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* 分隔线 */
.guide-divider {
  width: 100%;
  height: 1px;
  background: linear-gradient(90deg, transparent, var(--color-border-default, rgba(255, 255, 255, 0.12)), transparent);
  margin-bottom: 24px;
  animation: divider-enter 300ms cubic-bezier(0.25, 1, 0.5, 1) 200ms forwards;
  opacity: 0;
  transform: scaleX(0);
}

@keyframes divider-enter {
  to {
    opacity: 1;
    transform: scaleX(1);
  }
}

/* 操作项 - 交错入场 */
.guide-actions {
  display: flex;
  flex-direction: column;
  gap: 10px;
  width: 100%;
  margin-bottom: 24px;
}

.action-item {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 12px 16px;
  background: var(--color-bg-surface, rgba(255, 255, 255, 0.06));
  border: 1px solid var(--color-border-subtle, rgba(255, 255, 255, 0.08));
  border-radius: var(--radius-md, 10px);
  transition: all 150ms cubic-bezier(0.25, 1, 0.5, 1);
  text-align: left;
  animation: action-enter 300ms cubic-bezier(0.25, 1, 0.5, 1) forwards;
  opacity: 0;
  transform: translateX(-20px);
}

.action-item:nth-child(1) { animation-delay: 250ms; }
.action-item:nth-child(2) { animation-delay: 300ms; }
.action-item:nth-child(3) { animation-delay: 350ms; }

@keyframes action-enter {
  to {
    opacity: 1;
    transform: translateX(0);
  }
}

.action-item:hover {
  background: var(--color-bg-elevated, rgba(255, 255, 255, 0.08));
  border-color: var(--color-border-default, rgba(255, 255, 255, 0.12));
  transform: translateX(4px);
}

.action-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  background: rgba(183, 159, 255, 0.1);
  border-radius: var(--radius-md, 10px);
  flex-shrink: 0;
}

.action-icon i {
  font-size: 16px;
  color: var(--color-primary);
}

.action-icon.ai {
  background: rgba(255, 134, 195, 0.1);
}

.action-icon.ai i {
  color: var(--color-tertiary);
}

.action-icon .key-badge {
  font-size: 10px;
  font-weight: 600;
  color: var(--color-primary);
  letter-spacing: 0.3px;
}

.action-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.action-title {
  font-size: 13px;
  font-weight: 500;
  color: var(--color-text-primary, #f5f5f7);
}

.action-desc {
  font-size: 11px;
  color: var(--color-text-tertiary, #6e6e73);
}

/* 快捷键 - 入场动画 */
.guide-shortcuts {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 12px;
  margin-bottom: 24px;
  animation: shortcuts-enter 300ms cubic-bezier(0.25, 1, 0.5, 1) 400ms forwards;
  opacity: 0;
}

@keyframes shortcuts-enter {
  to {
    opacity: 1;
  }
}

.shortcut {
  display: flex;
  align-items: center;
  gap: 5px;
  font-size: 10px;
  color: var(--color-text-tertiary, #6e6e73);
}

.shortcut kbd {
  padding: 2px 5px;
  background: var(--color-bg-surface, rgba(255, 255, 255, 0.06));
  border: 1px solid var(--color-border-default, rgba(255, 255, 255, 0.12));
  border-radius: 3px;
  font-size: 9px;
  font-family: inherit;
  color: var(--color-text-secondary, #a1a1a6);
}

/* 提示 */
.guide-hint {
  font-size: 11px;
  color: var(--color-text-disabled, #48484a);
  animation: hint-enter 300ms cubic-bezier(0.25, 1, 0.5, 1) 500ms forwards;
  opacity: 0;
}

@keyframes hint-enter {
  to {
    opacity: 1;
  }
}

/* 引导层动画 */
.guide-fade-enter-active {
  transition: all 250ms cubic-bezier(0.25, 1, 0.5, 1);
}

.guide-fade-leave-active {
  transition: all 200ms cubic-bezier(0.25, 1, 0.5, 1);
}

.guide-fade-enter-from,
.guide-fade-leave-to {
  opacity: 0;
}

.guide-fade-leave-to {
  backdrop-filter: blur(0px);
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
  width: 6px;
}

.terminal :deep(.xterm-viewport::-webkit-scrollbar-track) {
  background: transparent;
}

.terminal :deep(.xterm-viewport::-webkit-scrollbar-thumb) {
  background: var(--color-border-default, rgba(255, 255, 255, 0.12));
  border-radius: 3px;
  transition: background 150ms cubic-bezier(0.25, 1, 0.5, 1);
}

.terminal :deep(.xterm-viewport::-webkit-scrollbar-thumb:hover) {
  background: var(--color-secondary);
}

/* 滚动条角落 */
.terminal :deep(.xterm-viewport::-webkit-scrollbar-corner) {
  background: transparent;
}
</style>