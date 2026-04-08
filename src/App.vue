<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch, computed } from 'vue'
import Sidebar from './components/Sidebar.vue'
import Topbar from './components/Topbar.vue'
import Terminal from './components/Terminal.vue'
import SshTerminal from './components/SshTerminal.vue'
import SSHPanel from './components/SSHPanel.vue'
import AssistantPanel from './components/AssistantPanel.vue'
import Statusbar from './components/Statusbar.vue'
import SettingsPanel from './components/SettingsPanel.vue'
import ToastContainer from './components/ToastContainer.vue'
import Modal from './components/Modal.vue'
import CommandPalette from './components/CommandPalette.vue'
import type { SshConfig } from './types/electron'
import { updateStatus } from './utils/terminalStatus'
import { toast } from './utils/notification'
import { useResponsive } from './utils/useResponsive'
import { initLayout, layoutState } from './utils/layoutStore'
import { initModalManager, destroyModalManager } from './utils/modalManager'

// 会话类型定义
interface Session {
  id: number
  title: string
  active: boolean
  type: 'local' | 'ssh'
  disconnected: boolean
  sshId?: string
  host?: string
  sshConfig?: SshConfig
  shellType?: string // 本地终端的 shell 类型（PowerShell, Bash, etc）
}

// SSH Panel 类型定义
interface SSHPanelExposed {
  hideConnecting: () => void
}

interface ModalExposed {
  show: () => Promise<boolean>
}

const activeTab = ref('terminal')
const sshPanelRef = ref<SSHPanelExposed | null>(null)
const modalRef = ref<ModalExposed | null>(null)

// 命令面板状态
const showCommandPalette = ref(false)
const hostsList = ref<Array<{ id: number | string; name: string; host: string }>>([])

// 沉浸模式
const immersiveMode = ref(false)
let immersiveTimeout: ReturnType<typeof setTimeout> | null = null

// 切换沉浸模式
const toggleImmersiveMode = () => {
  immersiveMode.value = !immersiveMode.value
  if (immersiveMode.value) {
    toast.info('已进入沉浸模式，按 F11 或 Ctrl+B 退出')
  }
}

// 会话管理
const sessions = ref<Session[]>([
  { id: 1, title: '终端 1', active: true, type: 'local', disconnected: false }
])
const activeSessionId = ref(1)
let nextSessionId = 2

// 创建新会话
const createNewSession = () => {
  const newId = nextSessionId++
  sessions.value.push({
    id: newId,
    title: `终端 ${newId}`,
    active: false,
    type: 'local',
    disconnected: false
  })
  activeSessionId.value = newId
  activeTab.value = 'terminal'
}

// 切换会话
const switchSession = async (id: number) => {
  activeSessionId.value = id
  activeTab.value = 'terminal'

  // 检查是否是断线的 SSH 会话，尝试自动重连
  const session = sessions.value.find(s => s.id === id)
  if (session && session.type === 'ssh' && session.disconnected && session.sshConfig) {
    await reconnectSSH(session)
  }
}

// 重连 SSH
const reconnectSSH = async (session: Session) => {
  const config = session.sshConfig!
  const newSshId = `ssh-reconnect-${session.id}-${Date.now()}`

  try {
    const result = await window.electronAPI.sshConnect({
      id: newSshId,
      host: config.host,
      port: config.port,
      username: config.username,
      password: config.password
    })

    if (result.success) {
      // 更新会话信息
      session.sshId = result.id || newSshId
      session.disconnected = false
      session.title = config.name || config.host
    } else {
      // 重连失败，保持断线状态
      console.error('SSH 重连失败:', result.error)
    }
  } catch (error) {
    console.error('SSH 重连错误:', (error as Error).message)
  }
}

// 通过索引切换会话 (Ctrl+1-9)
const switchSessionByIndex = (index: number) => {
  const sessionIndex = index - 1
  if (sessionIndex >= 0 && sessionIndex < sessions.value.length) {
    switchSession(sessions.value[sessionIndex].id)
  }
}

// 关闭会话
const closeSession = (id: number) => {
  if (sessions.value.length <= 1) return

  const session = sessions.value.find(s => s.id === id)

  // 如果是 SSH 会话，断开连接
  if (session && session.type === 'ssh' && session.sshId) {
    window.electronAPI.sshDisconnect({ id: session.sshId })
  }

  const index = sessions.value.findIndex(s => s.id === id)
  sessions.value.splice(index, 1)

  if (activeSessionId.value === id) {
    activeSessionId.value = sessions.value[0].id
  }
}

// 更新会话标题
const updateSessionTitle = (_id: number, _title: string) => {
  // 保持"终端 X"格式
}

// 更新会话 Shell 类型
const updateSessionShell = (id: number, shellType: string) => {
  const session = sessions.value.find(s => s.id === id)
  if (session && session.type === 'local') {
    session.shellType = shellType
  }
}

// 获取会话显示文本
const getSessionDisplay = (session: Session) => {
  if (session.type === 'ssh') {
    const username = session.sshConfig?.username || 'user'
    const host = session.host || 'unknown'
    return `${host} | ${username}`
  }
  // 本地终端
  const shell = session.shellType || 'Shell'
  return `本地 | ${shell}`
}

// 处理 SSH 断线
const handleSSHDisconnected = (sessionId: number) => {
  const session = sessions.value.find(s => s.id === sessionId)
  if (session) {
    session.disconnected = true
    // 更新 SSH 状态
    const sshSessions = sessions.value.filter(s => s.type === 'ssh')
    const activeSession = sessions.value.find(s => s.id === activeSessionId.value)
    updateStatus({
      sshConnections: sshSessions.length,
      sshConnected: activeSession?.type === 'ssh' && !activeSession?.disconnected,
      sshHost: activeSession?.host || ''
    })
  }
}

// 处理 SSH 连接
const handleSSHConnect = async (host: { host: string; port?: number; username: string; password?: string; name?: string }) => {
  // 如果没有密码，提示用户
  if (!host.password) {
    sshPanelRef.value?.hideConnecting()
    toast.warning('请在主机设置中保存密码后再连接')
    return
  }

  const newId = nextSessionId++
  const sessionId = `ssh-${newId}`

  // 先发起 SSH 连接
  try {
    const result = await window.electronAPI.sshConnect({
      id: sessionId,  // 传入 id
      host: host.host,
      port: host.port || 22,
      username: host.username,
      password: host.password
    })

    // 先关闭 loading
    sshPanelRef.value?.hideConnecting()

    if (result.success) {
      // 使用后端返回的 id（确保一致）
      const sshId = result.id || sessionId

      // 创建 SSH 会话
      sessions.value.push({
        id: newId,
        title: host.name || host.host,
        active: false,
        type: 'ssh',
        sshId: sshId,
        host: host.host,
        disconnected: false,
        sshConfig: {
          host: host.host,
          port: host.port || 22,
          username: host.username,
          password: host.password,
          name: host.name
        }
      })
      activeSessionId.value = newId
      activeTab.value = 'terminal'
      toast.success(`已连接到 ${host.name || host.host}`)
    } else {
      toast.error(`连接失败: ${result.error}`)
    }
  } catch (error) {
    sshPanelRef.value?.hideConnecting()
    toast.error(`连接错误: ${(error as Error).message}`)
  }
}

// 命令面板处理
const handlePaletteExecute = (command: string) => {
  if (command === 'new-session') {
    createNewSession()
  }
}

const handlePaletteConnectHost = async (hostId: number | string) => {
  const host = hostsList.value.find(h => h.id === hostId)
  if (host) {
    // 获取完整主机信息
    const result = await window.electronAPI.getHosts()
    if (result.success && result.data) {
      const fullHost = result.data.find(h => h.id === hostId)
      if (fullHost) {
        handleSSHConnect(fullHost)
      }
    }
  }
}

const handlePaletteAiQuery = (query: string) => {
  activeTab.value = 'assistant'
  // 触发 AI 查询（通过事件或直接调用）
  toast.info(`正在向 AI 查询: ${query}`)
}

const handlePaletteSwitchTab = (tab: string) => {
  activeTab.value = tab
}

// 加载主机列表
const loadHostsList = async () => {
  try {
    const result = await window.electronAPI.getHosts()
    if (result.success && result.data) {
      hostsList.value = result.data.map(h => ({
        id: h.id,
        name: h.name || h.host,
        host: h.host
      }))
    }
  } catch (e) {
    console.error('Failed to load hosts list:', e)
  }
}

// 快捷键支持
const handleKeydown = (e: KeyboardEvent) => {
  // Cmd/Ctrl + T: 新建会话
  if ((e.metaKey || e.ctrlKey) && e.key === 't') {
    e.preventDefault()
    createNewSession()
  }
  // Cmd/Ctrl + W: 关闭当前会话
  if ((e.metaKey || e.ctrlKey) && e.key === 'w') {
    e.preventDefault()
    closeSession(activeSessionId.value)
  }
  // Cmd/Ctrl + K: 打开命令面板
  if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
    e.preventDefault()
    showCommandPalette.value = !showCommandPalette.value
  }
  // Cmd/Ctrl + 数字: 切换会话
  if ((e.metaKey || e.ctrlKey) && e.key >= '1' && e.key <= '9') {
    e.preventDefault()
    const sessionIndex = parseInt(e.key) - 1
    if (sessionIndex < sessions.value.length) {
      switchSession(sessions.value[sessionIndex].id)
    }
  }
  // Ctrl+B 或 F11: 切换沉浸模式
  if ((e.ctrlKey && e.key === 'b') || e.key === 'F11') {
    e.preventDefault()
    toggleImmersiveMode()
  }
}

onMounted(async () => {
  window.addEventListener('keydown', handleKeydown)
  // 初始化布局设置
  initLayout()
  // 初始化模态框管理器
  initModalManager()
  // 初始化会话数量
  updateStatus({ sessionCount: sessions.value.length })
  // 加载主机列表
  await loadHostsList()
})

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeydown)
  destroyModalManager()
})

// 监听 sessions 变化，更新会话数量和 SSH 状态
watch(() => sessions.value.length, (count) => {
  updateStatus({ sessionCount: count })
})

// 监听 sessions 变化，更新 SSH 连接状态
watch([sessions, activeSessionId], () => {
  const sshSessions = sessions.value.filter(s => s.type === 'ssh')
  const sshCount = sshSessions.length
  const activeSession = sessions.value.find(s => s.id === activeSessionId.value)
  const sshConnected = activeSession?.type === 'ssh' && !activeSession?.disconnected
  const sshHost = activeSession?.host || ''

  updateStatus({
    sshConnections: sshCount,
    sshConnected,
    sshHost,
    activeSessionType: activeSession?.type || 'local'
  })
}, { deep: true })

// 监听 tab 切换，离开 SSH 面板时关闭 loading
watch(activeTab, (newTab) => {
  if (newTab !== 'ssh') {
    sshPanelRef.value?.hideConnecting()
  }
})
</script>

<template>
  <div class="app" :class="{ immersive: immersiveMode }">
    <Sidebar
      :active-tab="activeTab"
      @tab-change="activeTab = $event"
    />
    <div class="main-container">
      <Topbar
        @open-settings="activeTab = 'settings'"
        @open-palette="showCommandPalette = true"
        @new-session="createNewSession"
      />

      <!-- 会话标签栏 -->
      <div class="session-tabs" v-show="activeTab === 'terminal'">
        <div class="tabs-list">
          <div
            v-for="session in sessions"
            :key="session.id"
            class="tab-item"
            :class="{
              active: activeSessionId === session.id,
              'ssh-tab': session.type === 'ssh',
              disconnected: session.disconnected
            }"
            @click="switchSession(session.id)"
            :title="session.type === 'ssh' ? `${session.sshConfig?.username}@${session.host}` : '本地终端'"
          >
            <span class="tab-status-dot" :class="{ 'online': !session.disconnected, 'offline': session.disconnected }"></span>
            <span class="tab-type">{{ session.type === 'ssh' ? 'SSH' : '本地' }}</span>
            <span class="tab-separator">|</span>
            <span class="tab-info">{{ session.type === 'ssh' ? (session.host || 'server') : (session.shellType || 'Shell') }}</span>
            <button
              class="tab-close"
              @click.stop="closeSession(session.id)"
              v-show="sessions.length > 1"
              title="关闭会话"
            >×</button>
          </div>
        </div>
        <button class="tab-add" @click="createNewSession" title="新建会话 (Ctrl+T)">
          <span>+</span>
        </button>
      </div>

      <!-- 终端区域 -->
      <div class="terminal-wrapper">
        <div
          v-for="session in sessions"
          :key="session.id"
          class="terminal-panel"
          :class="{ active: activeSessionId === session.id && activeTab === 'terminal' }"
        >
          <!-- 本地终端 -->
          <Terminal
            v-if="session.type === 'local'"
            v-show="activeSessionId === session.id && activeTab === 'terminal'"
            :session-id="session.id"
            :active="activeSessionId === session.id && activeTab === 'terminal'"
            @title-change="updateSessionTitle(session.id, $event)"
            @shell-change="updateSessionShell(session.id, $event)"
            @new-session="createNewSession"
            @close-session="closeSession(activeSessionId)"
            @switch-session="switchSessionByIndex"
          />
          <!-- SSH 终端 -->
          <SshTerminal
            v-else-if="session.type === 'ssh'"
            v-show="activeSessionId === session.id && activeTab === 'terminal'"
            :session-id="session.id"
            :ssh-id="session.sshId || ''"
            :host="session.host"
            :active="activeSessionId === session.id && activeTab === 'terminal'"
            @title-change="updateSessionTitle(session.id, $event)"
            @close-session="closeSession(activeSessionId)"
            @disconnected="handleSSHDisconnected(session.id)"
          />
        </div>

        <!-- SSH 连接面板 -->
        <div class="panel-container" v-show="activeTab === 'ssh'">
          <SSHPanel ref="sshPanelRef" @connect="handleSSHConnect" />
        </div>

        <!-- 助手面板 -->
        <div class="panel-container" v-show="activeTab === 'assistant'">
          <AssistantPanel />
        </div>

        <!-- 设置面板 -->
        <div class="panel-container" v-show="activeTab === 'settings'">
          <SettingsPanel />
        </div>
      </div>

      <Statusbar />
    </div>

    <!-- 全局通知容器 -->
    <ToastContainer />

    <!-- 命令面板 -->
    <CommandPalette
      :visible="showCommandPalette"
      :hosts="hostsList"
      @close="showCommandPalette = false"
      @execute="handlePaletteExecute"
      @connect-host="handlePaletteConnectHost"
      @ai-query="handlePaletteAiQuery"
      @switch-tab="handlePaletteSwitchTab"
    />
  </div>
</template>

<style>
/* 导入设计系统 */
@import './styles/design-system.css';

* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: var(--font-sans);
  overflow: hidden;
  background: var(--color-bg-base);
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

.app {
  display: flex;
  height: 100vh;
  background: var(--color-bg-base);
  position: relative;
}

.main-container {
  display: flex;
  flex-direction: column;
  flex: 1;
  overflow: hidden;
  position: relative;
  background: linear-gradient(180deg, #0c0c12 0%, #08080c 100%);
  border-radius: 12px 0 0 0;
  margin: 6px 0 6px 0;
}

/* 终端区域容器 - 增加视觉边界 */
.terminal-wrapper {
  flex: 1;
  overflow: hidden;
  position: relative;
  margin: 0 8px;
  border-radius: 12px;
  background: #0a0a0f;
  box-shadow:
    inset 0 0 0 1px rgba(255, 255, 255, 0.04),
    0 0 0 1px rgba(0, 0, 0, 0.3),
    0 8px 32px rgba(0, 0, 0, 0.4);
}

.terminal-wrapper::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 1px;
  background: linear-gradient(90deg, transparent, rgba(0, 240, 255, 0.15), transparent);
  pointer-events: none;
  z-index: 10;
}

/* 会话标签栏 - 紧凑设计 */
.session-tabs {
  display: flex;
  align-items: center;
  height: 36px;
  background: transparent;
  border-bottom: 1px solid rgba(255, 255, 255, 0.04);
  padding: 0 8px;
  gap: 6px;
  overflow: hidden;
  box-sizing: border-box;
  flex-shrink: 0;
}

.tabs-list {
  display: flex;
  flex: 1;
  gap: 4px;
  overflow-x: auto;
  overflow-y: hidden;
  height: 100%;
  align-items: center;
  padding: 4px 0;
}

.tabs-list::-webkit-scrollbar {
  height: 2px;
}

.tabs-list::-webkit-scrollbar-track {
  background: transparent;
}

.tabs-list::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.1);
  border-radius: 1px;
}

/* Tab 样式 - 会话类型颜色区分 */
.tab-item {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 0 12px;
  height: 26px;
  min-width: 100px;
  max-width: 180px;
  background: rgba(255, 255, 255, 0.02);
  border-radius: 6px;
  cursor: pointer;
  color: #7a7a8a;
  font-size: 11px;
  font-weight: 500;
  transition: all 0.15s ease;
  border: 1px solid transparent;
  position: relative;
  box-sizing: border-box;
  flex-shrink: 0;
}

.tab-item:hover {
  background: rgba(255, 255, 255, 0.04);
  color: #b0b0c0;
}

/* 本地会话 - 青色主题 */
.tab-item.active:not(.ssh-tab) {
  background: rgba(0, 240, 255, 0.08);
  color: #00f0ff;
  border-color: rgba(0, 240, 255, 0.15);
}

.tab-item.active:not(.ssh-tab)::after {
  content: '';
  position: absolute;
  bottom: -4px;
  left: 50%;
  transform: translateX(-50%);
  width: 3px;
  height: 3px;
  background: #00f0ff;
  border-radius: 50%;
  box-shadow: 0 0 8px rgba(0, 240, 255, 0.6);
}

/* SSH 会话 - 绿色主题 */
.tab-item.ssh-tab.active {
  background: rgba(40, 202, 65, 0.08);
  color: #28ca41;
  border-color: rgba(40, 202, 65, 0.15);
}

.tab-item.ssh-tab.active::after {
  content: '';
  position: absolute;
  bottom: -4px;
  left: 50%;
  transform: translateX(-50%);
  width: 3px;
  height: 3px;
  background: #28ca41;
  border-radius: 50%;
  box-shadow: 0 0 8px rgba(40, 202, 65, 0.6);
}

/* 断线状态 */
.tab-item.disconnected {
  border-color: rgba(255, 95, 87, 0.15);
  opacity: 0.7;
}

.tab-item.disconnected:hover {
  opacity: 1;
}

/* 状态点 */
.tab-status-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  flex-shrink: 0;
}

.tab-status-dot.online {
  background: #28ca41;
  box-shadow: 0 0 4px rgba(40, 202, 65, 0.5);
}

.tab-status-dot.offline {
  background: #ff5f57;
  animation: blink 1.5s ease-in-out infinite;
}

@keyframes blink {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.4; }
}

/* Tab 内容 */
.tab-type {
  font-size: 10px;
  font-weight: 600;
  letter-spacing: 0.3px;
  text-transform: uppercase;
}

.tab-separator {
  color: #3a3a48;
  font-size: 9px;
}

.tab-info {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 11px;
  color: #5a5a68;
}

.tab-item.active .tab-info {
  color: inherit;
  opacity: 0.9;
}

/* 关闭按钮 */
.tab-close {
  width: 16px;
  height: 16px;
  border-radius: 3px;
  border: none;
  background: transparent;
  color: #5a5a68;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  opacity: 0;
  transition: all 0.15s ease;
  flex-shrink: 0;
}

.tab-item:hover .tab-close {
  opacity: 1;
}

.tab-close:hover {
  background: rgba(255, 95, 87, 0.15);
  color: #ff5f57;
}

/* 新建按钮 */
.tab-add {
  width: 26px;
  height: 26px;
  border-radius: 6px;
  border: 1px solid rgba(255, 255, 255, 0.04);
  background: rgba(255, 255, 255, 0.02);
  color: #6a6a78;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  transition: all 0.15s ease;
  flex-shrink: 0;
  box-sizing: border-box;
}

.tab-add:hover {
  background: rgba(0, 240, 255, 0.1);
  color: #00f0ff;
  border-color: rgba(0, 240, 255, 0.2);
}

/* 终端面板 */
.terminal-panel {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  display: none;
  border-radius: 12px;
  overflow: hidden;
}

.terminal-panel.active {
  display: block;
}

/* 面板容器 */
.panel-container {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  overflow: hidden;
  border-radius: 12px;
}

/* 沉浸模式 - 自动隐藏侧边栏，最大化终端区域 */
.app.immersive {
  background: #0a0a0f;
}

.app.immersive .main-container {
  margin: 0;
  border-radius: 0;
}

.app.immersive .terminal-wrapper {
  margin: 0;
  border-radius: 0;
  box-shadow: none;
  background: #0a0a0f;
}

.app.immersive .terminal-wrapper::before {
  display: none;
}

/* 沉浸模式隐藏标签栏 */
.app.immersive .session-tabs {
  height: 0;
  padding: 0;
  overflow: hidden;
  opacity: 0;
}

/* 沉浸模式隐藏顶部栏 */
.app.immersive :deep(.topbar) {
  height: 0;
  padding: 0;
  overflow: hidden;
  opacity: 0;
}

/* 响应式 */
@media (max-width: 800px) {
  .tab-item {
    min-width: 80px;
    max-width: 120px;
  }

  .tab-info {
    display: none;
  }
}

.placeholder-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 20px;
  color: #6b6b78;
  padding: 40px;
  border-radius: 16px;
  background: rgba(255, 255, 255, 0.02);
  border: 1px solid rgba(255, 255, 255, 0.04);
}

.placeholder-icon {
  font-size: 64px;
  opacity: 0.6;
  filter: drop-shadow(0 0 20px rgba(0, 240, 255, 0.1));
}

.placeholder-text {
  font-size: 14px;
  font-weight: 500;
  letter-spacing: 0.3px;
}

/* 面板容器 */
.panel-container {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  overflow: hidden;
}
</style>
