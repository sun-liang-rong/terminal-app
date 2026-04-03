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
  sshId: {
    type: String,
    required: true
  },
  host: {
    type: String,
    default: ''
  },
  active: {
    type: Boolean,
    default: true
  }
})

const emit = defineEmits(['title-change', 'close-session', 'disconnected'])

const terminalRef = ref<HTMLDivElement | null>(null)
let terminal: Terminal | null = null
let fitAddon: FitAddon | null = null
let resizeHandler: (() => void) | null = null
let sshDataListenerId: number | null = null
let sshCloseListenerId: number | null = null
let themeChangeListener: ((e: Event) => void) | null = null
let settingsChangeListener: ((e: Event) => void) | null = null

const electronAPI = window.electronAPI

// 初始化设置
initSettings()
const settings = getSettings()

onMounted(async () => {
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
    // 启用鼠标事件支持（对 htop/tmux 等交互式程序很重要）
    mouseEvents: true,
    // 不转换 EOL，让远程服务器处理
    convertEol: false
  })

  fitAddon = new FitAddon()
  terminal.loadAddon(fitAddon)
  terminal.loadAddon(new WebLinksAddon())
  terminal.open(element)

  // 监听主题变化
  themeChangeListener = (e: Event) => {
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

  // 连接已经建立，显示提示
  terminal.writeln(`\x1b[32m✓ 已连接到 ${props.host}\x1b[0m`)
  terminal.writeln('')

  // 监听 SSH 数据 (仅在 electronAPI 可用时)
  if (electronAPI) {
    sshDataListenerId = electronAPI.onSshData(({ id, data }) => {
      if (id === props.sshId && terminal) {
        terminal.write(data)
      }
    })

    // 监听 SSH 关闭
    sshCloseListenerId = electronAPI.onSshClose(({ id }) => {
      if (id === props.sshId && terminal) {
        terminal.writeln('')
        terminal.writeln('\x1b[31m连接已关闭\x1b[0m')
        emit('title-change', '已断开')
        emit('disconnected')
      }
    })

    // 用户输入转发到 SSH
    terminal.onData((data) => {
      electronAPI.sshWrite({ id: props.sshId, data })
    })
  }

  // 复制功能：选择文本后自动复制
  terminal.onSelectionChange(() => {
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
      // Ctrl+Shift+V 粘贴
      if (event.key === 'V' || event.key === 'v') {
        if (electronAPI) {
          const text = electronAPI.clipboardRead()
          if (text) {
            electronAPI.sshWrite({ id: props.sshId, data: text })
          }
        }
        return false
      }
    }
    return true
  })

  // 窗口大小改变
  resizeHandler = () => {
    if (fitAddon && terminal && props.active && electronAPI) {
      fitAddon.fit()
      const { cols, rows } = terminal
      electronAPI.sshResize({ id: props.sshId, cols, rows })
    }
  }
  window.addEventListener('resize', resizeHandler)

  // 初始调整大小
  setTimeout(() => {
    if (fitAddon && terminal && electronAPI) {
      fitAddon.fit()
      const { cols, rows } = terminal
      electronAPI.sshResize({ id: props.sshId, cols, rows })
    }
  }, 100)
})

// 当会话变为活跃时调整大小
watch(() => props.active, (active) => {
  if (active && terminal && fitAddon) {
    setTimeout(() => {
      if (!terminal || !fitAddon || !electronAPI) return
      fitAddon.fit()
      const { cols, rows } = terminal
      electronAPI.sshResize({ id: props.sshId, cols, rows })
    }, 50)
  }
})

// 监听 sshId 变化（重连时）
watch(() => props.sshId, (newSshId, oldSshId) => {
  if (newSshId && newSshId !== oldSshId && terminal && electronAPI) {
    // 移除旧的监听器
    if (sshDataListenerId && electronAPI.removeSshListener) {
      electronAPI.removeSshListener(sshDataListenerId)
    }
    if (sshCloseListenerId && electronAPI.removeSshListener) {
      electronAPI.removeSshListener(sshCloseListenerId)
    }

    // 显示重连消息
    terminal.writeln('')
    terminal.writeln(`\x1b[32m✓ 已重新连接到 ${props.host}\x1b[0m`)
    terminal.writeln('')

    // 添加新的监听器
    sshDataListenerId = electronAPI.onSshData(({ id, data }) => {
      if (id === newSshId && terminal) {
        terminal.write(data)
      }
    })

    sshCloseListenerId = electronAPI.onSshClose(({ id }) => {
      if (id === newSshId && terminal) {
        terminal.writeln('')
        terminal.writeln('\x1b[31m连接已关闭\x1b[0m')
        emit('title-change', '已断开')
        emit('disconnected')
      }
    })
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

  if (electronAPI) {
    if (sshDataListenerId && electronAPI.removeSshListener) {
      electronAPI.removeSshListener(sshDataListenerId)
    }
    if (sshCloseListenerId && electronAPI.removeSshListener) {
      electronAPI.removeSshListener(sshCloseListenerId)
    }

    // 断开 SSH 连接
    electronAPI.sshDisconnect({ id: props.sshId })
  }

  if (terminal) {
    terminal.dispose()
    terminal = null
  }
})
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

.terminal :deep(.xterm) {
  padding: 0;
  margin: 0;
  height: 100%;
}

.terminal :deep(.xterm-screen) {
  padding: 0 !important;
  margin: 0 !important;
}

.terminal :deep(.xterm-viewport) {
  padding: 0 !important;
  margin: 0 !important;
  /* 确保滚动条可用 */
  overflow-y: auto !important;
}

/* 自定义滚动条样式 */
.terminal :deep(.xterm-viewport::-webkit-scrollbar) {
  width: 8px;
}

.terminal :deep(.xterm-viewport::-webkit-scrollbar-track) {
  background: #0d1117;
}

.terminal :deep(.xterm-viewport::-webkit-scrollbar-thumb) {
  background: #30363d;
  border-radius: 4px;
}

.terminal :deep(.xterm-viewport::-webkit-scrollbar-thumb:hover) {
  background: #58a6ff;
}
</style>