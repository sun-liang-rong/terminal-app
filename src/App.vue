<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch } from 'vue'
import Sidebar from './components/Sidebar.vue'
import Topbar from './components/Topbar.vue'
import Terminal from './components/Terminal.vue'
import SshTerminal from './components/SshTerminal.vue'
import SSHPanel from './components/SSHPanel.vue'
import AssistantPanel from './components/AssistantPanel.vue'
import Statusbar from './components/Statusbar.vue'
import SettingsPanel from './components/SettingsPanel.vue'
import type { SshConfig } from './types/electron'

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
}

// SSH Panel 类型定义
interface SSHPanelExposed {
  hideConnecting: () => void
}

const activeTab = ref('terminal')
const sshPanelRef = ref<SSHPanelExposed | null>(null)

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

// 处理 SSH 断线
const handleSSHDisconnected = (sessionId: number) => {
  const session = sessions.value.find(s => s.id === sessionId)
  if (session) {
    session.disconnected = true
  }
}

// 处理 SSH 连接
const handleSSHConnect = async (host: { host: string; port?: number; username: string; password?: string; name?: string }) => {
  // 如果没有密码，提示用户
  if (!host.password) {
    sshPanelRef.value?.hideConnecting()
    alert('请在主机设置中保存密码后再连接\n\n点击主机卡片的编辑按钮，输入密码并勾选"保存密码"')
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
    } else {
      alert(`连接失败: ${result.error}`)
    }
  } catch (error) {
    sshPanelRef.value?.hideConnecting()
    alert(`连接错误: ${(error as Error).message}`)
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
  // Cmd/Ctrl + 数字: 切换会话
  if ((e.metaKey || e.ctrlKey) && e.key >= '1' && e.key <= '9') {
    e.preventDefault()
    const sessionIndex = parseInt(e.key) - 1
    if (sessionIndex < sessions.value.length) {
      switchSession(sessions.value[sessionIndex].id)
    }
  }
}

onMounted(() => {
  window.addEventListener('keydown', handleKeydown)
})

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeydown)
})

// 监听 tab 切换，离开 SSH 面板时关闭 loading
watch(activeTab, (newTab) => {
  if (newTab !== 'ssh') {
    sshPanelRef.value?.hideConnecting()
  }
})
</script>

<template>
  <div class="app">
    <Sidebar
      :active-tab="activeTab"
      @tab-change="activeTab = $event"
    />
    <div class="main-container">
      <Topbar @open-settings="activeTab = 'settings'" />

      <!-- 会话标签栏 -->
      <div class="session-tabs" v-show="activeTab === 'terminal'">
        <div class="tabs-list">
          <div
            v-for="session in sessions"
            :key="session.id"
            class="tab-item"
            :class="{ active: activeSessionId === session.id, disconnected: session.disconnected }"
            @click="switchSession(session.id)"
          >
            <span class="tab-status-dot" :class="{ 'online': !session.disconnected, 'offline': session.disconnected }"></span>
            <span class="tab-title">{{ session.title }}</span>
            <button
              class="tab-close"
              @click.stop="closeSession(session.id)"
              v-show="sessions.length > 1"
            >×</button>
          </div>
        </div>
        <button class="tab-add" @click="createNewSession" title="新建会话 (Cmd+T)">
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
  </div>
</template>

<style>
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif;
  overflow: hidden;
  background: #0a0a0f;
}

.app {
  display: flex;
  height: 100vh;
  background: linear-gradient(135deg, #0a0a0f 0%, #0f0f16 100%);
  position: relative;
}

.app::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: 
    radial-gradient(circle at 20% 20%, rgba(0, 240, 255, 0.03) 0%, transparent 50%),
    radial-gradient(circle at 80% 80%, rgba(59, 130, 246, 0.02) 0%, transparent 50%);
  pointer-events: none;
  z-index: 0;
}

.main-container {
  display: flex;
  flex-direction: column;
  flex: 1;
  overflow: hidden;
  position: relative;
  z-index: 1;
}

.terminal-wrapper {
  flex: 1;
  overflow: hidden;
  position: relative;
}

/* 会话标签栏 */
.session-tabs {
  display: flex;
  align-items: center;
  height: 42px;
  background: linear-gradient(180deg, #12121a 0%, #0f0f14 100%);
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
  padding: 0 12px;
  gap: 8px;
  overflow: hidden;
  box-sizing: border-box;
}

.tabs-list {
  display: flex;
  flex: 1;
  gap: 6px;
  overflow-x: auto;
  overflow-y: hidden;
  height: 100%;
  align-items: center;
}

.tabs-list::-webkit-scrollbar {
  height: 3px;
}

.tabs-list::-webkit-scrollbar-track {
  background: transparent;
}

.tabs-list::-webkit-scrollbar-thumb {
  background: linear-gradient(90deg, rgba(0, 240, 255, 0.2), rgba(59, 130, 246, 0.2));
  border-radius: 2px;
}

.tab-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 0 14px;
  height: 32px;
  min-width: 120px;
  max-width: 200px;
  background: rgba(255, 255, 255, 0.02);
  border-radius: 8px;
  cursor: pointer;
  color: #8b8b9a;
  font-size: 12px;
  font-weight: 500;
  letter-spacing: 0.2px;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  border: 1px solid rgba(255, 255, 255, 0.03);
  position: relative;
  box-sizing: border-box;
  flex-shrink: 0;
}

.tab-item::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  border-radius: 8px;
  background: linear-gradient(135deg, rgba(0, 240, 255, 0.04), rgba(59, 130, 246, 0.02));
  opacity: 0;
  transition: opacity 0.2s ease;
  pointer-events: none;
}

.tab-item:hover {
  background: rgba(255, 255, 255, 0.04);
  color: #e5e5e7;
  border-color: rgba(255, 255, 255, 0.08);
  transform: translateY(-1px);
}

.tab-item:hover::before {
  opacity: 1;
}

.tab-item.active {
  background: linear-gradient(135deg, rgba(0, 240, 255, 0.12) 0%, rgba(59, 130, 246, 0.06) 100%);
  color: #00f0ff;
  border-color: rgba(0, 240, 255, 0.2);
  box-shadow: 0 4px 16px rgba(0, 240, 255, 0.1), inset 0 0 0 1px rgba(0, 240, 255, 0.15);
}

.tab-item.active::after {
  content: '';
  position: absolute;
  bottom: -8px;
  left: 50%;
  transform: translateX(-50%);
  width: 4px;
  height: 4px;
  background: linear-gradient(135deg, #00f0ff, #3b82f6);
  border-radius: 50%;
  box-shadow: 0 0 12px rgba(0, 240, 255, 0.6);
}

/* 状态点 - 绿色在线/红色断线 */
.tab-status-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex-shrink: 0;
  transition: all 0.2s ease;
}

.tab-status-dot.online {
  background: #28ca41;
  box-shadow: 0 0 6px rgba(40, 202, 65, 0.5);
}

.tab-status-dot.offline {
  background: #ff5f57;
  box-shadow: 0 0 6px rgba(255, 95, 87, 0.5);
  animation: blink 1.5s ease-in-out infinite;
}

/* 断线状态 Tab */
.tab-item.disconnected {
  border-color: rgba(255, 95, 87, 0.2);
}

.tab-item.disconnected .tab-title {
  color: #ff5f57;
}

@keyframes blink {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.4; }
}

.tab-title {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.tab-close {
  width: 20px;
  height: 20px;
  border-radius: 4px;
  border: none;
  background: transparent;
  color: #6b6b78;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  opacity: 0;
  transition: all 0.2s ease;
  flex-shrink: 0;
}

.tab-item:hover .tab-close {
  opacity: 1;
}

.tab-close:hover {
  background: rgba(255, 95, 87, 0.15);
  color: #ff5f57;
  transform: scale(1.1);
}

.tab-add {
  width: 32px;
  height: 32px;
  border-radius: 8px;
  border: 1px solid rgba(255, 255, 255, 0.06);
  background: rgba(255, 255, 255, 0.02);
  color: #8b8b9a;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
  font-weight: 300;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  flex-shrink: 0;
  box-sizing: border-box;
}

.tab-add:hover {
  background: linear-gradient(135deg, rgba(0, 240, 255, 0.15) 0%, rgba(59, 130, 246, 0.08) 100%);
  color: #00f0ff;
  border-color: rgba(0, 240, 255, 0.25);
  transform: scale(1.05);
  box-shadow: 0 4px 12px rgba(0, 240, 255, 0.15);
}

/* 终端面板 */
.terminal-panel {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  display: none;
}

.terminal-panel.active {
  display: block;
}

/* 占位面板 */
.placeholder-panel {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #0a0a0f 0%, #0f0f16 100%);
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
