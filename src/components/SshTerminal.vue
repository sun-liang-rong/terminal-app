<template>
  <div ref="terminalRef" class="terminal"></div>
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

// 设置变量（在 onMounted 中初始化）
let settings = getSettings()

onMounted(async () => {
  // 初始化设置
  await initSettings()
  settings = getSettings()

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
  themeChangeListener = () => {
    if (terminal) {
      const newTheme = getCurrentTheme()
      terminal.options.theme = newTheme
      // 刷新终端显示
      terminal.refresh(0, terminal.rows - 1)
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
        terminal.refresh(0, terminal.rows - 1)
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

  // 更新状态：SSH 已连接
  updateStatus({
    connected: true,
    shell: 'ssh',
    activeSessionType: 'ssh',
    cols: terminal.cols,
    rows: terminal.rows,
    encoding: 'UTF-8'
  })

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
        // 更新状态：SSH 已断开
        updateStatus({
          connected: false,
          shell: 'ssh',
          activeSessionType: 'ssh'
        })
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
      // Ctrl+Shift+V 粘贴 - 使用 xterm 的 paste 方法，避免重复发送
      if (event.key === 'V' || event.key === 'v') {
        if (electronAPI && terminal) {
          const text = electronAPI.clipboardRead()
          if (text) {
            // 使用 terminal.paste() 而不是 sshWrite
            // 这样 xterm 会通过 onData 正确处理，避免重复
            terminal.paste(text)
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
      updateStatus({
        connected: true,
        shell: 'ssh',
        activeSessionType: 'ssh',
        cols,
        rows,
        encoding: 'UTF-8'
      })
    }
  }
  window.addEventListener('resize', resizeHandler)

  // 初始调整大小
  setTimeout(() => {
    if (fitAddon && terminal && electronAPI) {
      fitAddon.fit()
      const { cols, rows } = terminal
      electronAPI.sshResize({ id: props.sshId, cols, rows })
      updateStatus({
        connected: true,
        shell: 'ssh',
        activeSessionType: 'ssh',
        cols,
        rows,
        encoding: 'UTF-8'
      })
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
      updateStatus({
        connected: true,
        shell: 'ssh',
        activeSessionType: 'ssh',
        cols,
        rows,
        encoding: 'UTF-8'
      })
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
  background: var(--color-bg-base, #0f0f14);
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
  overflow-y: auto !important;
}

/* 自定义滚动条样式 - 使用 CSS 变量 */
.terminal :deep(.xterm-viewport::-webkit-scrollbar) {
  width: 6px;
}

.terminal :deep(.xterm-viewport::-webkit-scrollbar-track) {
  background: transparent;
}

.terminal :deep(.xterm-viewport::-webkit-scrollbar-thumb) {
  background: var(--color-border-default, rgba(255, 255, 255, 0.08));
  border-radius: 3px;
  transition: background 0.2s ease;
}

.terminal :deep(.xterm-viewport::-webkit-scrollbar-thumb:hover) {
  background: var(--color-secondary, #2db7f2);
}

.terminal :deep(.xterm-viewport::-webkit-scrollbar-corner) {
  background: transparent;
}
</style>