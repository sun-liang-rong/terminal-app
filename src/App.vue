<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import Sidebar from './components/Sidebar.vue'
import Topbar from './components/Topbar.vue'
import Terminal from './components/Terminal.vue'
import Statusbar from './components/Statusbar.vue'

const activeTab = ref('terminal')

// 会话管理
const sessions = ref([
  { id: 1, title: '终端 1', active: true }
])
const activeSessionId = ref(1)
let nextSessionId = 2

// 创建新会话
const createNewSession = () => {
  const newId = nextSessionId++
  sessions.value.push({
    id: newId,
    title: `终端 ${newId}`,
    active: false
  })
  activeSessionId.value = newId
  activeTab.value = 'terminal'
}

// 切换会话
const switchSession = (id) => {
  activeSessionId.value = id
  activeTab.value = 'terminal'
}

// 关闭会话
const closeSession = (id) => {
  if (sessions.value.length <= 1) return

  const index = sessions.value.findIndex(s => s.id === id)
  sessions.value.splice(index, 1)

  if (activeSessionId.value === id) {
    activeSessionId.value = sessions.value[0].id
  }
}

// 更新会话标题（根据终端内容）
const updateSessionTitle = (id, title) => {
  const session = sessions.value.find(s => s.id === id)
  if (session && title) {
    session.title = title
  }
}

// 快捷键支持
const handleKeydown = (e) => {
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
</script>

<template>
  <div class="app">
    <Sidebar
      :active-tab="activeTab"
      @tab-change="activeTab = $event"
      @new-session="createNewSession"
    />
    <div class="main-container">
      <Topbar />

      <!-- 会话标签栏 -->
      <div class="session-tabs" v-show="activeTab === 'terminal'">
        <div class="tabs-list">
          <div
            v-for="session in sessions"
            :key="session.id"
            class="tab-item"
            :class="{ active: activeSessionId === session.id }"
            @click="switchSession(session.id)"
          >
            <span class="tab-icon">▸</span>
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
          <Terminal
            :session-id="session.id"
            :active="activeSessionId === session.id && activeTab === 'terminal'"
            @title-change="updateSessionTitle(session.id, $event)"
          />
        </div>

        <!-- 其他功能面板占位 -->
        <div class="placeholder-panel" v-show="activeTab !== 'terminal'">
          <div class="placeholder-content">
            <span class="placeholder-icon">{{
              activeTab === 'assistant' ? '◉' :
              activeTab === 'explorer' ? '📁' :
              activeTab === 'debugger' ? '⚙' : '⚙'
            }}</span>
            <span class="placeholder-text">
              {{
                activeTab === 'assistant' ? 'AI 助手功能开发中...' :
                activeTab === 'explorer' ? '资源管理器功能开发中...' :
                activeTab === 'debugger' ? '调试器功能开发中...' : '设置功能开发中...'
              }}
            </span>
          </div>
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
}

.app {
  display: flex;
  height: 100vh;
  background: #0f0f14;
}

.main-container {
  display: flex;
  flex-direction: column;
  flex: 1;
  overflow: hidden;
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
  height: 36px;
  background: #15151b;
  border-bottom: 1px solid #23232c;
  padding: 0 8px;
}

.tabs-list {
  display: flex;
  flex: 1;
  gap: 2px;
  overflow-x: auto;
}

.tabs-list::-webkit-scrollbar {
  height: 4px;
}

.tabs-list::-webkit-scrollbar-thumb {
  background: #23232c;
  border-radius: 2px;
}

.tab-item {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  min-width: 100px;
  max-width: 180px;
  background: #15151b;
  border-radius: 4px 4px 0 0;
  cursor: pointer;
  color: #6b6b78;
  font-size: 12px;
  transition: all 0.15s ease;
  border: 1px solid transparent;
  border-bottom: none;
}

.tab-item:hover {
  background: #1a1a22;
  color: #9b9ba5;
}

.tab-item.active {
  background: #0f0f14;
  color: #e0e0e0;
  border-color: #23232c;
}

.tab-icon {
  font-size: 10px;
  color: #28ca41;
}

.tab-title {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.tab-close {
  width: 18px;
  height: 18px;
  border-radius: 3px;
  border: none;
  background: transparent;
  color: #6b6b78;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  opacity: 0;
  transition: opacity 0.15s ease;
}

.tab-item:hover .tab-close {
  opacity: 1;
}

.tab-close:hover {
  background: #ff5f57;
  color: #fff;
}

.tab-add {
  width: 28px;
  height: 28px;
  border-radius: 4px;
  border: none;
  background: transparent;
  color: #6b6b78;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 16px;
  transition: all 0.15s ease;
}

.tab-add:hover {
  background: #00f0ff;
  color: #0f0f14;
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
  background: #0f0f14;
}

.placeholder-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
  color: #6b6b78;
}

.placeholder-icon {
  font-size: 48px;
}

.placeholder-text {
  font-size: 14px;
}
</style>