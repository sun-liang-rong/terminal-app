<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch, computed } from 'vue'
import 'highlight.js/styles/github-dark.css' // 代码高亮样式
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
import SftpPanel from './components/SftpPanel.vue'
import type { SshConfig } from './types/electron'
import { updateStatus } from './utils/terminalStatus'
import { toast } from './utils/notification'
import { useResponsive } from './utils/useResponsive'
import { initLayout, layoutState, toggleAssistantPanel, setCustomThemeColor } from './utils/layoutStore'
import { initModalManager, destroyModalManager } from './utils/modalManager'
import { setSSHConnection } from './utils/sftpStore'
import { PhX, PhPlus } from '@phosphor-icons/vue'

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

// 当前活跃的 SSH ID
const currentSSHId = computed(() => {
  const activeSession = sessions.value.find(s => s.id === activeSessionId.value)
  if (activeSession && activeSession.type === 'ssh' && !activeSession.disconnected) {
    return activeSession.sshId || null
  }
  return null
})

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

    // 同步 SSH 断开状态到 SFTP
    setSSHConnection(null, false)
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

      // 同步 SSH 连接状态到 SFTP
      setSSHConnection(sshId, true)
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

// 处理顶部栏标签页切换
const handleTopbarSwitchTab = (tab: string) => {
  if (tab === 'terminal' || tab === 'network' || tab === 'logs') {
    activeTab.value = tab
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
  // 应用自定义主题色（如果已设置）
  if (layoutState.value.customThemeColor) {
    setCustomThemeColor(layoutState.value.customThemeColor)
  }
  // 初始化模态框管理器
  initModalManager()
  // 初始化会话数量
  updateStatus({ sessionCount: sessions.value.length })
  // 加载主机列表
  await loadHostsList()
  // 启动系统监控
  startSystemMonitor()
})

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeydown)
  destroyModalManager()
  // 停止系统监控
  stopSystemMonitor()
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

// 计算左侧边栏是否折叠
const sidebarCollapsed = computed(() => layoutState.value.sidebarCollapsed)

// 计算 AI 面板是否可见
const assistantPanelVisible = computed(() => layoutState.value.assistantPanelVisible)

// 系统监控数据
const cpuUsage = ref(0)
const memoryUsage = ref(0)
const memoryUsed = ref(0)
const memoryTotal = ref(0)

// 格式化字节
const formatBytes = (bytes: number): string => {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i]
}

// 获取系统状态文本
const systemStatusText = computed(() => {
  if (cpuUsage.value >= 80 || memoryUsage.value >= 80) return '高负载'
  if (cpuUsage.value >= 60 || memoryUsage.value >= 60) return '中等'
  return '稳定'
})

// 刷新系统数据
const refreshSystemData = async () => {
  try {
    if (window.electronAPI?.getSystemInfo) {
      const sysInfo = await window.electronAPI.getSystemInfo()
      cpuUsage.value = sysInfo.cpu.usage
      memoryUsage.value = sysInfo.memory.usagePercent
      memoryUsed.value = sysInfo.memory.used
      memoryTotal.value = sysInfo.memory.total
    }
  } catch (e) {
    console.error('Failed to refresh system data:', e)
  }
}

// 系统监控定时器
let systemMonitorInterval: ReturnType<typeof setInterval> | null = null

// 启动系统监控
const startSystemMonitor = () => {
  refreshSystemData()
  systemMonitorInterval = setInterval(refreshSystemData, 2000)
}

// 停止系统监控
const stopSystemMonitor = () => {
  if (systemMonitorInterval) {
    clearInterval(systemMonitorInterval)
    systemMonitorInterval = null
  }
}
</script>

<template>
  <div class="app" :class="{
    immersive: immersiveMode,
    'sidebar-collapsed': sidebarCollapsed,
    'assistant-visible': assistantPanelVisible
  }">
    <!-- 左侧边栏 -->
    <Sidebar
      :active-tab="activeTab"
      @tab-change="activeTab = $event"
    />

    <!-- 主内容区 -->
    <main class="main-content">
      <!-- 顶部栏 -->
      <Topbar
        @open-settings="activeTab = 'settings'"
        @open-palette="showCommandPalette = true"
        @new-session="createNewSession"
        @switch-tab="handleTopbarSwitchTab"
      />

      <!-- 内容区域 -->
      <div class="content-area">
        <!-- 左侧主要内容 -->
        <div class="main-panel">
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
                >
                  <PhX weight="regular" />
                </button>
              </div>
            </div>
            <!-- 添加新 Shell Tab 按钮 -->
            <button
              class="add-tab-btn"
              @click="createNewSession"
              title="新建会话 (Ctrl+T)"
            >
              <PhPlus weight="regular" />
            </button>
          </div>

          <!-- 终端包装器 -->
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

            <!-- SFTP 文件管理面板 -->
            <div class="panel-container" v-show="activeTab === 'sftp'">
              <SftpPanel :ssh-id="currentSSHId" />
            </div>

            <!-- 设置面板 -->
            <div class="panel-container" v-show="activeTab === 'settings'">
              <SettingsPanel />
            </div>
          </div>

          <!-- 系统状态栏 -->
          <div class="system-monitor" v-show="activeTab === 'terminal'">
            <div class="monitor-header">
              <span class="monitor-title">系统负载</span>
              <span class="monitor-status" :class="{ 'high': cpuUsage >= 80 || memoryUsage >= 80, 'medium': (cpuUsage >= 60 && cpuUsage < 80) || (memoryUsage >= 60 && memoryUsage < 80) }">{{ systemStatusText }}</span>
            </div>
            <div class="progress-bar">
              <div class="progress-fill" :style="{ width: Math.max(cpuUsage, memoryUsage) + '%' }" :class="{ 'high': cpuUsage >= 80 || memoryUsage >= 80, 'medium': (cpuUsage >= 60 && cpuUsage < 80) || (memoryUsage >= 60 && memoryUsage < 80) }"></div>
            </div>
            <div class="monitor-stats">
              <span>CPU: {{ cpuUsage.toFixed(0) }}%</span>
              <span>RAM: {{ formatBytes(memoryUsed) }} / {{ formatBytes(memoryTotal) }}</span>
            </div>
          </div>
        </div>

        <!-- 右侧 AI 助手面板 -->
        <div class="ai-panel-wrapper" v-show="assistantPanelVisible">
          <AssistantPanel
            :visible="assistantPanelVisible"
            @close="toggleAssistantPanel()"
          />
        </div>
      </div>
    </main>

    <!-- 底部状态栏 -->
    <Statusbar />

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

    <!-- 背景光效 -->
    <div class="ambient-glow primary"></div>
    <div class="ambient-glow secondary"></div>
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
  font-family: var(--font-body);
  overflow: hidden;
  background: var(--color-surface);
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}
</style>

<style scoped>
.app {
  display: flex;
  height: 100vh;
  background: var(--color-surface, #0c0e12);
  position: relative;
  overflow: hidden;
}

/* 背景光效 */
.ambient-glow {
  position: fixed;
  border-radius: 50%;
  pointer-events: none;
  z-index: 0;
}

.ambient-glow.primary {
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 600px;
  height: 600px;
  background: rgba(183, 159, 255, 0.05);
  filter: blur(120px);
}

.ambient-glow.secondary {
  bottom: 0;
  right: 0;
  width: 400px;
  height: 400px;
  background: rgba(45, 183, 242, 0.05);
  filter: blur(100px);
}

/* 主内容区 */
.main-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  margin-left: 256px;
  margin-bottom: 24px;
  transition: margin-left 0.3s ease;
  z-index: 1;
  position: relative;
}

.app.sidebar-collapsed .main-content {
  margin-left: 72px;
}

/* 内容区域 */
.content-area {
  flex: 1;
  display: flex;
  overflow: hidden;
  padding: 0 16px 16px;
}

.main-panel {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 16px;
  overflow: hidden;
  min-width: 0;
}

/* AI面板包装器 */
.ai-panel-wrapper {
  display: flex;
  width: 320px;
  transition: width 0.3s ease;
  overflow: hidden;
  flex-shrink: 0;
}

.ai-panel-wrapper[v-show="false"] {
  width: 0;
}

/* 会话标签栏 */
.session-tabs {
  display: flex;
  align-items: center;
  height: 40px;
  gap: 8px;
  overflow: hidden;
  flex-shrink: 0;
}

.tabs-list {
  display: flex;
  gap: 4px;
  overflow-x: auto;
  overflow-y: hidden;
  flex: 1;
  height: 100%;
  align-items: center;
}

.tabs-list::-webkit-scrollbar {
  height: 4px;
}

.tabs-list::-webkit-scrollbar-track {
  background: transparent;
}

.tabs-list::-webkit-scrollbar-thumb {
  background: var(--color-outline-variant, #46484d);
  border-radius: 10px;
}

/* 添加 Tab 按钮 */
.add-tab-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  padding: 0;
  margin-right: 8px;
  background: transparent;
  border: 1px solid var(--color-outline-variant, #46484d);
  border-radius: 6px;
  color: var(--color-on-surface-variant, #aaabb0);
  cursor: pointer;
  transition: all 0.15s ease;
  flex-shrink: 0;
}

.add-tab-btn:hover {
  background: var(--color-surface-container-high, #1d2025);
  border-color: var(--color-primary, #b79fff);
  color: var(--color-primary, #b79fff);
}

.add-tab-btn:active {
  transform: scale(0.95);
}

.add-tab-btn :deep(svg) {
  width: 16px;
  height: 16px;
}

/* Tab 样式 */
.tab-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 14px;
  height: 32px;
  min-width: 100px;
  max-width: 180px;
  background: rgba(29, 32, 37, 0.6);
  border-radius: 8px;
  cursor: pointer;
  color: var(--color-on-surface-variant, #aaabb0);
  font-size: 11px;
  font-family: var(--font-mono, 'Fira Code', monospace);
  font-weight: 600;
  transition: all 0.15s ease;
  border: none;
  position: relative;
  flex-shrink: 0;
}

.tab-item:hover {
  background: rgba(29, 32, 37, 0.8);
  color: var(--color-on-surface, #f6f6fc);
}

.tab-item.active {
  background: rgba(29, 32, 37, 0.8);
  color: var(--color-primary, #b79fff);
}

.tab-item.active::after {
  content: '';
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  height: 2px;
  background: var(--color-primary, #b79fff);
  box-shadow: 0 0 10px var(--color-primary, #b79fff);
  border-radius: 1px;
}

.tab-item.ssh-tab.active {
  color: var(--color-secondary, #2db7f2);
}

.tab-item.ssh-tab.active::after {
  background: var(--color-secondary, #2db7f2);
  box-shadow: 0 0 10px var(--color-secondary, #2db7f2);
}

.tab-item.disconnected {
  opacity: 0.6;
}

.tab-status-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  flex-shrink: 0;
}

.tab-status-dot.online {
  background: var(--color-secondary, #2db7f2);
  box-shadow: 0 0 5px var(--color-secondary, #2db7f2);
}

.tab-status-dot.offline {
  background: var(--color-error, #ff6e84);
}

.tab-type {
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.5px;
  text-transform: uppercase;
}

.tab-separator {
  color: var(--color-outline-variant, #46484d);
  font-size: 9px;
  opacity: 0.5;
}

.tab-info {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 11px;
}

.tab-close {
  width: 16px;
  height: 16px;
  border-radius: 4px;
  border: none;
  background: transparent;
  color: var(--color-on-surface-variant, #aaabb0);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0;
  transition: all 0.15s ease;
  flex-shrink: 0;
}

.tab-close :deep(svg) {
  width: 12px;
  height: 12px;
}

.tab-item:hover .tab-close {
  opacity: 0.6;
}

.tab-close:hover {
  opacity: 1;
  background: rgba(255, 110, 132, 0.15);
  color: var(--color-error, #ff6e84);
}

/* 终端包装器 */
.terminal-wrapper {
  flex: 1;
  overflow: hidden;
  position: relative;
  border-radius: 0;
  background: var(--color-surface-container-lowest, #000000);
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.4), 0 0 15px -3px rgba(45, 183, 242, 0.2);
  border: 1px solid rgba(70, 72, 77, 0.15);
}

/* 终端面板 */
.terminal-panel {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  display: none;
  border-radius: 0;
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
  border-radius: 0;
}

/* 系统监控栏 */
.system-monitor {
  background: rgba(17, 19, 24, 0.6);
  border: 1px solid rgba(70, 72, 77, 0.15);
  border-radius: 12px;
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.monitor-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.monitor-title {
  font-size: 10px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.15em;
  color: var(--color-on-surface-variant, #aaabb0);
}

.monitor-status {
  font-size: 10px;
  font-family: var(--font-mono, 'Fira Code', monospace);
  color: var(--color-secondary, #2db7f2);
}

.monitor-status.medium {
  color: var(--color-tertiary, #ff86c3);
}

.monitor-status.high {
  color: var(--color-error, #ff6e84);
}

.progress-bar {
  width: 100%;
  height: 6px;
  background: rgba(29, 32, 37, 0.8);
  border-radius: 3px;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, var(--color-secondary, #2db7f2), var(--color-primary, #b79fff));
  border-radius: 3px;
  transition: width 0.3s ease;
}

.progress-fill.medium {
  background: linear-gradient(90deg, var(--color-tertiary, #ff86c3), var(--color-tertiary-fixed, #ff8bc5));
}

.progress-fill.high {
  background: linear-gradient(90deg, var(--color-error, #ff6e84), var(--color-error-dim, #d73357));
}

.monitor-stats {
  display: flex;
  justify-content: space-between;
  font-size: 10px;
  font-family: var(--font-mono, 'Fira Code', monospace);
  color: var(--color-on-surface-variant, #aaabb0);
}

/* 沉浸模式 */
.app.immersive {
  background: var(--color-surface-container-lowest, #000000);
}

.app.immersive .main-content {
  margin: 0;
}

.app.immersive .session-tabs,
.app.immersive :deep(.topbar) {
  display: none;
}

.app.immersive .system-monitor {
  display: none;
}

/* 响应式 */
@media (max-width: 800px) {
  .tab-item {
    min-width: 80px;
    max-width: 120px;
    padding: 6px 10px;
  }

  .tab-info {
    display: none;
  }

  .app.assistant-visible .main-content {
    margin-right: 0;
  }
}
</style>
