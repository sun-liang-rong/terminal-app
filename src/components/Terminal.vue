<template>
  <div ref="terminalRef" class="terminal"></div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, watch } from 'vue'
import { Terminal } from '@xterm/xterm'
import { FitAddon } from '@xterm/addon-fit'
import { WebLinksAddon } from '@xterm/addon-web-links'
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

const emit = defineEmits(['title-change'])

const terminalRef = ref(null)
let terminal = null
let fitAddon = null
let resizeHandler = null
const terminalId = ref(null)

// 获取 electron API (通过 preload 暴露)
const electronAPI = window.electronAPI

onMounted(async () => {
  terminalId.value = `session-${props.sessionId}`

  // 创建终端实例 - 丰富配色
  terminal = new Terminal({
    fontSize: 14,
    fontFamily: 'SF Mono, Menlo, Monaco, "Courier New", monospace',
    cursorStyle: 'block',
    cursorBlink: true,
    theme: {
      background: '#0f0f14',
      foreground: '#e0e0e0',
      cursor: '#00f0ff',
      selectionBackground: '#264f78',
      // ANSI 标准颜色 - 更鲜明的配色
      black: '#1a1a22',
      red: '#ff6b6b',
      green: '#4ade80',
      yellow: '#facc15',
      blue: '#60a5fa',
      magenta: '#c084fc',
      cyan: '#22d3ee',
      white: '#f0f0f0',
      // 高亮颜色
      brightBlack: '#6b7280',
      brightRed: '#f87171',
      brightGreen: '#86efac',
      brightYellow: '#fde047',
      brightBlue: '#93c5fd',
      brightMagenta: '#d8b4fe',
      brightCyan: '#67e8f9',
      brightWhite: '#ffffff'
    },
    allowProposedApi: true,
    scrollback: 10000,
    cols: 80,
    rows: 24
  })

  // 添加插件
  fitAddon = new FitAddon()
  terminal.loadAddon(fitAddon)
  terminal.loadAddon(new WebLinksAddon())

  // 打开终端
  terminal.open(terminalRef.value)

  // 获取实际尺寸后自适应并创建 PTY
  setTimeout(async () => {
    if (!props.active) return

    fitAddon.fit()
    const { cols, rows } = terminal

    // 创建真实 PTY 进程
    try {
      const result = await electronAPI.ptyCreate({ id: terminalId.value, cols, rows })
      if (result.success) {
        console.log('PTY created, PID:', result.pid)
        emit('title-change', `zsh — ${result.pid}`)
      } else {
        terminal.writeln(`\r\n\x1b[31m无法创建 Shell: ${result.error}\x1b[0m`)
        terminal.writeln('\x1b[33m切换到模拟模式.\x1b[0m\r\n')
        initSimulationMode()
      }
    } catch (error) {
      console.error('Error creating PTY:', error)
      terminal.writeln(`\r\n\x1b[31m错误: ${error.message}\x1b[0m`)
      terminal.writeln('\x1b[33m切换到模拟模式.\x1b[0m\r\n')
      initSimulationMode()
    }
  }, 100)

  // 监听 PTY 输出
  electronAPI.onPtyData(({ id, data }) => {
    if (id === terminalId.value && terminal) {
      terminal.write(data)
    }
  })

  electronAPI.onPtyExit(({ id, exitCode }) => {
    if (id === terminalId.value && terminal) {
      terminal.writeln(`\r\n\x1b[31m进程已退出，退出码: ${exitCode}\x1b[0m`)
      emit('title-change', `已退出 (${exitCode})`)
    }
  })

  // 用户输入转发到 PTY
  terminal.onData((data) => {
    electronAPI.ptyWrite({ id: terminalId.value, data })
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
      fitAddon.fit()
      const { cols, rows } = terminal
      electronAPI.ptyResize({ id: terminalId.value, cols, rows })
    }, 50)

    // 如果之前没有活跃过，需要创建 PTY
    if (!wasActive) {
      const { cols, rows } = terminal
      try {
        const result = await electronAPI.ptyCreate({ id: terminalId.value, cols, rows })
        if (result.success) {
          emit('title-change', `zsh — ${result.pid}`)
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

  if (terminal) {
    terminal.dispose()
    terminal = null
  }

  // 关闭 PTY 进程
  electronAPI.ptyKill({ id: terminalId.value })
})

// 模拟模式（当 PTY 不可用时）
function initSimulationMode() {
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

function processSimulatedCommand(cmd) {
  if (!cmd) return

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
</style>