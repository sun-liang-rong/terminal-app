// AI 对话服务 - 支持多提供商 API 调用 (通过主进程代理)
import { ref } from 'vue'
import type { AIModelConfig } from './aiModelsStore'

// 消息类型
export interface ChatMessage {
  id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  timestamp: number
  isStreaming?: boolean
  error?: string
}

// 对话状态
export const chatMessages = ref<ChatMessage[]>([])
export const isLoading = ref(false)
export const currentStreamingMessage = ref('')

// 当前活跃的流 ID
let currentStreamId: string | null = null
let streamListenerId: number | null = null
let currentProvider: string = ''

// 生成唯一 ID
const generateId = () => `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

// 添加消息
export const addMessage = (role: 'user' | 'assistant' | 'system', content: string) => {
  const message: ChatMessage = {
    id: generateId(),
    role,
    content,
    timestamp: Date.now()
  }
  chatMessages.value.push(message)
  return message
}

// 清空对话
export const clearChat = () => {
  chatMessages.value = []
}

// 解析 OpenAI 格式的流数据
const parseOpenAIStream = (chunk: string): string => {
  let result = ''
  const lines = chunk.split('\n').filter(line => line.trim())

  for (const line of lines) {
    if (line.startsWith('data: ')) {
      const data = line.slice(6)
      if (data === '[DONE]') continue

      try {
        const parsed = JSON.parse(data)
        const content = parsed.choices?.[0]?.delta?.content || ''
        result += content
      } catch (e) {
        // 忽略解析错误
      }
    }
  }

  return result
}

// 解析 Claude 格式的流数据
const parseClaudeStream = (chunk: string): string => {
  let result = ''
  const lines = chunk.split('\n').filter(line => line.trim())

  for (const line of lines) {
    if (line.startsWith('data: ')) {
      const data = line.slice(6)

      try {
        const parsed = JSON.parse(data)
        // Claude 的流格式
        if (parsed.type === 'content_block_delta') {
          result += parsed.delta?.text || ''
        } else if (parsed.delta?.text) {
          result += parsed.delta.text
        }
      } catch (e) {
        // 忽略解析错误
      }
    }
  }

  return result
}

// 解析 Ollama 格式的流数据
const parseOllamaStream = (chunk: string): string => {
  let result = ''
  const lines = chunk.split('\n').filter(line => line.trim())

  for (const line of lines) {
    try {
      const parsed = JSON.parse(line)
      const content = parsed.message?.content || ''
      result += content
    } catch (e) {
      // 忽略解析错误
    }
  }

  return result
}

// 发送消息到 AI
export const sendMessage = async (
  content: string,
  model: AIModelConfig,
  onStream?: (chunk: string) => void
): Promise<void> => {
  if (!content.trim()) return

  // 验证配置
  if (!model.apiKey && model.provider !== 'ollama') {
    addMessage('assistant', '**错误**: 请先配置 API Key。在设置 → 模型配置中添加您的 API Key。')
    return
  }

  // 验证模型 ID
  if (!model.model) {
    addMessage('assistant', '**错误**: 模型 ID 不能为空')
    return
  }

  // 添加用户消息
  addMessage('user', content)
  isLoading.value = true
  currentStreamingMessage.value = ''
  currentProvider = model.provider

  try {
    // 构建消息历史 - 确保消息格式正确
    const messages: Array<{ role: string; content: string }> = [
      { role: 'system', content: '你是一个有用的 AI 助手。' }
    ]

    // 添加历史消息（排除刚刚添加的用户消息）
    for (const msg of chatMessages.value.slice(0, -1)) {
      if (msg.role === 'user' || msg.role === 'assistant') {
        messages.push({ role: msg.role, content: msg.content })
      }
    }

    // 添加当前用户消息
    messages.push({ role: 'user', content })

    console.log('[AI Service] Sending request:', {
      provider: model.provider,
      model: model.model,
      messageCount: messages.length
    })

    // 调用主进程代理
    if (!window.electronAPI?.aiChatStream) {
      throw new Error('AI API 不可用，请检查应用版本')
    }

    const result = await window.electronAPI.aiChatStream({
      provider: model.provider,
      apiKey: model.apiKey,
      baseUrl: model.baseUrl,
      model: model.model,
      messages
    })

    if (!result.success || !result.streamId) {
      // 处理特定错误
      let errorMsg = result.error || '启动对话失败'
      if (errorMsg.includes('404')) {
        errorMsg += '\n\n可能原因：\n1. 模型 ID 不存在，请检查设置中的模型 ID\n2. API Key 无效\n3. 对于 Claude，请确保使用正确的模型名称（如 claude-3-5-sonnet-20241022）'
      } else if (errorMsg.includes('401')) {
        errorMsg += '\n\nAPI Key 无效，请检查设置中的 API Key'
      } else if (errorMsg.includes('429')) {
        errorMsg += '\n\n请求过于频繁或额度不足'
      }
      throw new Error(errorMsg)
    }

    currentStreamId = result.streamId

    // 监听流数据
    if (window.electronAPI?.onAIStreamData) {
      streamListenerId = window.electronAPI.onAIStreamData((data) => {
        if (data.streamId !== currentStreamId) return

        if (data.error) {
          addMessage('assistant', `**错误**: ${data.error}`)
          isLoading.value = false
          currentStreamingMessage.value = ''
          cleanupStream()
          return
        }

        if (data.done) {
          if (currentStreamingMessage.value) {
            addMessage('assistant', currentStreamingMessage.value)
          }
          isLoading.value = false
          currentStreamingMessage.value = ''
          cleanupStream()
          return
        }

        if (data.data) {
          // 根据提供商解析流数据
          let delta = ''
          switch (currentProvider) {
            case 'claude':
              delta = parseClaudeStream(data.data)
              break
            case 'ollama':
              delta = parseOllamaStream(data.data)
              break
            case 'openai':
            case 'custom':
            default:
              delta = parseOpenAIStream(data.data)
              break
          }

          if (delta) {
            currentStreamingMessage.value += delta
            onStream?.(currentStreamingMessage.value)
          }
        }
      })
    }
  } catch (error) {
    console.error('AI 调用失败:', error)
    addMessage('assistant', `**错误**: ${error instanceof Error ? error.message : '未知错误'}`)
    isLoading.value = false
    currentStreamingMessage.value = ''
    cleanupStream()
  }
}

// 清理流监听
const cleanupStream = () => {
  if (streamListenerId !== null && window.electronAPI?.removeAIStreamListener) {
    window.electronAPI.removeAIStreamListener(streamListenerId)
    streamListenerId = null
  }
  currentStreamId = null
}

// 中止当前请求
export const abortCurrentRequest = async () => {
  if (currentStreamId && window.electronAPI?.aiAbortStream) {
    await window.electronAPI.aiAbortStream(currentStreamId)
  }
  cleanupStream()
  isLoading.value = false
  currentStreamingMessage.value = ''
}
