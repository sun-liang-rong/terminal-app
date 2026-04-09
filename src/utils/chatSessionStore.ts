// 对话会话状态管理
import { ref, computed, watch, nextTick } from 'vue'
import type { ChatMessage } from './aiChatService'

// 会话接口
export interface ChatSession {
  id: string
  title: string
  messages: ChatMessage[]
  createdAt: number
  updatedAt: number
  modelId: string
}

// 存储键
const STORAGE_KEY = 'neural-terminal-chat-sessions'
const STORAGE_VERSION = '1'

// 响应式状态
export const chatSessions = ref<ChatSession[]>([])
export const currentSessionId = ref<string>('')

// 当前会话
export const currentSession = computed<ChatSession | null>(() => {
  return chatSessions.value.find(s => s.id === currentSessionId.value) || null
})

// 当前会话的消息
export const activeMessages = computed<ChatMessage[]>(() => {
  return currentSession.value?.messages || []
})

// 是否已初始化
let initialized = false

// 生成唯一 ID
const generateId = () => `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

// 生成会话标题（基于首条消息）
const generateTitle = (content: string): string => {
  // 截取前 20 个字符，超出加省略号
  if (content.length <= 20) return content
  return content.slice(0, 20) + '...'
}

// 从存储加载
const loadFromStorage = () => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) {
      const data = JSON.parse(stored)
      if (data.version === STORAGE_VERSION) {
        chatSessions.value = data.sessions || []
        currentSessionId.value = data.currentSessionId || ''
      } else {
        // 版本不兼容，清空
        chatSessions.value = []
        currentSessionId.value = ''
      }
    }
  } catch (e) {
    console.error('Failed to load chat sessions:', e)
  }

  // 如果没有会话，创建一个默认的
  if (chatSessions.value.length === 0) {
    createSession('新对话 1', '')
  }

  // 如果没有选中会话，选中第一个
  if (!currentSessionId.value && chatSessions.value.length > 0) {
    currentSessionId.value = chatSessions.value[0].id
  }
}

// 保存到存储
const saveToStorage = () => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      version: STORAGE_VERSION,
      sessions: chatSessions.value,
      currentSessionId: currentSessionId.value
    }))
  } catch (e) {
    console.error('Failed to save chat sessions:', e)
  }
}

// 初始化
export const initChatSessions = () => {
  if (initialized) return
  initialized = true
  loadFromStorage()

  // 监听变化自动保存
  watch([chatSessions, currentSessionId], () => {
    saveToStorage()
  }, { deep: true })
}

// 创建新会话
export const createSession = (title?: string, modelId: string = ''): string => {
  const session: ChatSession = {
    id: generateId(),
    title: title || `新对话 ${chatSessions.value.length + 1}`,
    messages: [],
    createdAt: Date.now(),
    updatedAt: Date.now(),
    modelId
  }
  chatSessions.value.unshift(session)
  currentSessionId.value = session.id
  return session.id
}

// 切换会话
export const switchSession = (sessionId: string) => {
  if (chatSessions.value.some(s => s.id === sessionId)) {
    currentSessionId.value = sessionId
  }
}

// 删除会话
export const deleteSession = (sessionId: string) => {
  const index = chatSessions.value.findIndex(s => s.id === sessionId)
  if (index !== -1) {
    chatSessions.value.splice(index, 1)
    // 如果删除的是当前会话，切换到第一个或清空
    if (currentSessionId.value === sessionId) {
      currentSessionId.value = chatSessions.value[0]?.id || ''
      // 如果没有会话了，创建一个默认的
      if (!currentSessionId.value) {
        createSession('新对话 1', '')
      }
    }
  }
}

// 重命名会话
export const renameSession = (sessionId: string, newTitle: string) => {
  const session = chatSessions.value.find(s => s.id === sessionId)
  if (session) {
    session.title = newTitle.trim() || session.title
    session.updatedAt = Date.now()
  }
}

// 添加消息到当前会话
export const addMessageToSession = (message: ChatMessage) => {
  const session = currentSession.value
  if (!session) return

  session.messages.push(message)
  session.updatedAt = Date.now()

  // 如果这是第一条用户消息且标题是默认的，自动更新标题
  if (session.messages.length === 1 && message.role === 'user') {
    const isDefaultTitle = session.title.startsWith('新对话 ')
    if (isDefaultTitle) {
      session.title = generateTitle(message.content)
    }
  }
}

// 清空当前会话
export const clearCurrentSession = () => {
  const session = currentSession.value
  if (session) {
    session.messages = []
    session.updatedAt = Date.now()
    // 重置标题
    session.title = '新对话'
  }
}

// 导出会话为 Markdown
export const exportSessionAsMarkdown = (sessionId: string): string => {
  const session = chatSessions.value.find(s => s.id === sessionId)
  if (!session) return ''

  let markdown = `# ${session.title}\n\n`
  markdown += `创建时间: ${new Date(session.createdAt).toLocaleString()}\n\n`
  markdown += `---\n\n`

  for (const msg of session.messages) {
    const time = new Date(msg.timestamp).toLocaleTimeString()
    if (msg.role === 'user') {
      markdown += `**用户** (${time}):\n\n${msg.content}\n\n---\n\n`
    } else if (msg.role === 'assistant') {
      markdown += `**AI** (${time}):\n\n${msg.content}\n\n---\n\n`
    }
  }

  return markdown
}

// 导出会话为 JSON
export const exportSessionAsJSON = (sessionId: string): string => {
  const session = chatSessions.value.find(s => s.id === sessionId)
  if (!session) return ''
  return JSON.stringify(session, null, 2)
}

// 搜索会话
export const searchSessions = (query: string): ChatSession[] => {
  const lowerQuery = query.toLowerCase().trim()
  if (!lowerQuery) return chatSessions.value

  return chatSessions.value.filter(session => {
    // 搜索标题
    if (session.title.toLowerCase().includes(lowerQuery)) return true
    // 搜索消息内容
    return session.messages.some(msg =>
      msg.content.toLowerCase().includes(lowerQuery)
    )
  })
}

// 获取会话总数
export const getSessionCount = () => chatSessions.value.length

// 获取所有会话（按更新时间排序）
export const getSortedSessions = () => {
  return [...chatSessions.value].sort((a, b) => b.updatedAt - a.updatedAt)
}
