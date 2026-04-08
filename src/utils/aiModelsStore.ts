// AI 模型配置存储
import { ref, watch } from 'vue'

// 模型配置类型
export interface AIModelConfig {
  id: string
  name: string
  provider: 'openai' | 'claude' | 'ollama' | 'custom'
  apiKey?: string
  baseUrl?: string
  model: string
  icon?: string
}

// 默认模型列表
const defaultModels: AIModelConfig[] = [
  {
    id: 'gpt-4o',
    name: 'GPT-4o',
    provider: 'openai',
    model: 'gpt-4o',
    icon: 'gpt'
  },
  {
    id: 'claude-3-5-sonnet',
    name: 'Claude 3.5 Sonnet',
    provider: 'claude',
    model: 'claude-3-5-sonnet-20241022',
    icon: 'claude'
  },
  {
    id: 'llama3',
    name: 'Llama 3',
    provider: 'ollama',
    model: 'llama3',
    baseUrl: 'http://localhost:11434',
    icon: 'local'
  }
]

// 存储键
const STORAGE_KEY = 'neural-terminal-ai-models'

// 响应式状态
export const aiModelsState = ref<AIModelConfig[]>([...defaultModels])

// 当前选中的模型
export const currentModelId = ref<string>(aiModelsState.value[0]?.id || '')

// 是否已初始化
let initialized = false

// 从存储加载
const loadFromStorage = () => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) {
      const parsed = JSON.parse(stored)
      aiModelsState.value = parsed.models || [...defaultModels]
      currentModelId.value = parsed.currentModelId || aiModelsState.value[0]?.id || ''
    }
  } catch (e) {
    console.error('Failed to load AI models:', e)
  }
}

// 保存到存储
const saveToStorage = () => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      models: aiModelsState.value,
      currentModelId: currentModelId.value
    }))
  } catch (e) {
    console.error('Failed to save AI models:', e)
  }
}

// 初始化
export const initAIModels = () => {
  if (initialized) return
  initialized = true
  loadFromStorage()

  // 监听变化自动保存
  watch([aiModelsState, currentModelId], () => {
    saveToStorage()
  }, { deep: true })
}

// 获取模型列表
export const getAIModels = (): AIModelConfig[] => {
  return [...aiModelsState.value]
}

// 获取当前模型
export const getCurrentModel = (): AIModelConfig | null => {
  return aiModelsState.value.find(m => m.id === currentModelId.value) || aiModelsState.value[0] || null
}

// 设置当前模型
export const setCurrentModel = (id: string) => {
  if (aiModelsState.value.some(m => m.id === id)) {
    currentModelId.value = id
  }
}

// 添加模型
export const addAIModel = (model: Omit<AIModelConfig, 'id'>): string => {
  const id = `model-${Date.now()}`
  aiModelsState.value.push({
    ...model,
    id
  })
  return id
}

// 更新模型
export const updateAIModel = (id: string, updates: Partial<AIModelConfig>) => {
  const index = aiModelsState.value.findIndex(m => m.id === id)
  if (index !== -1) {
    aiModelsState.value[index] = { ...aiModelsState.value[index], ...updates }
  }
}

// 删除模型
export const removeAIModel = (id: string) => {
  const index = aiModelsState.value.findIndex(m => m.id === id)
  if (index !== -1) {
    aiModelsState.value.splice(index, 1)
    // 如果删除的是当前选中的模型，重置为第一个
    if (currentModelId.value === id && aiModelsState.value.length > 0) {
      currentModelId.value = aiModelsState.value[0].id
    }
  }
}

// 重置为默认
export const resetAIModels = () => {
  aiModelsState.value = [...defaultModels]
  currentModelId.value = defaultModels[0]?.id || ''
}
