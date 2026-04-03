// AI Provider 接口
interface AIProvider {
  generateCommands(prompt: string, platform: string): Promise<Command[]>
}

// 命令结构
export interface Command {
  name: string
  command: string
  description: string
  platform: string
}

// AI 设置
export interface AISettings {
  provider: 'claude' | 'openai' | 'ollama'
  apiKey: string
  model?: string
  baseUrl?: string
}

// 默认设置
const DEFAULT_SETTINGS: AISettings = {
  provider: 'ollama',
  apiKey: '',
  model: 'llama3',
  baseUrl: 'http://localhost:11434'
}

// 系统提示词
const SYSTEM_PROMPT = `你是一个终端命令助手。用户会描述一个使用场景，请返回相关的终端命令。

返回格式要求（必须是有效的纯JSON数组，不要包含任何注释）：
[
  {
    "name": "命令名称",
    "command": "实际命令",
    "description": "命令说明",
    "platform": "macos/windows/linux/all"
  }
]

规则：
1. 返回1-5个最相关的命令
2. 命令要实用、准确
3. 如果涉及路径或参数，使用占位符如 \${参数名}
4. platform 根据用户系统返回
5. 只返回纯JSON数组，不要有其他文字、注释或代码块标记

重要：JSON中不要包含任何注释（如 // 或 /* */），必须是可直接解析的标准JSON格式。`

// Claude Provider
class ClaudeProvider implements AIProvider {
  private apiKey: string
  private model: string

  constructor(apiKey: string, model: string = 'claude-3-haiku-20240307') {
    this.apiKey = apiKey
    this.model = model
  }

  async generateCommands(prompt: string, platform: string): Promise<Command[]> {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': this.apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: this.model,
        max_tokens: 1024,
        system: SYSTEM_PROMPT,
        messages: [
          {
            role: 'user',
            content: `用户场景：${prompt}\n系统平台：${platform}`
          }
        ]
      })
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error?.message || 'Claude API 调用失败')
    }

    const data = await response.json()
    const content = data.content[0]?.text || '[]'

    return this.parseResponse(content)
  }

  private parseResponse(content: string): Command[] {
    try {
      // 尝试提取 JSON 数组
      const jsonMatch = content.match(/\[[\s\S]*\]/)
      if (jsonMatch) {
        // 移除 JSON 中的注释（AI 可能返回带注释的 JSON）
        let jsonStr = jsonMatch[0]
        // 移除单行注释 // ...
        jsonStr = jsonStr.replace(/\/\/[^\n]*\n/g, '\n')
        // 移除行内注释 // ...
        jsonStr = jsonStr.replace(/\/\/[^\n,}\]]*/g, '')
        return JSON.parse(jsonStr)
      }
      return JSON.parse(content)
    } catch (e) {
      console.error('Failed to parse AI response:', content, e)
      return []
    }
  }
}

// OpenAI Provider
class OpenAIProvider implements AIProvider {
  private apiKey: string
  private model: string
  private baseUrl: string

  constructor(apiKey: string, model: string = 'gpt-3.5-turbo', baseUrl?: string) {
    this.apiKey = apiKey
    this.model = model
    this.baseUrl = baseUrl || 'https://api.openai.com/v1'
  }

  async generateCommands(prompt: string, platform: string): Promise<Command[]> {
    const response = await fetch(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`
      },
      body: JSON.stringify({
        model: this.model,
        messages: [
          {
            role: 'system',
            content: SYSTEM_PROMPT
          },
          {
            role: 'user',
            content: `用户场景：${prompt}\n系统平台：${platform}`
          }
        ],
        temperature: 0.7,
        max_tokens: 1024
      })
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error?.message || 'OpenAI API 调用失败')
    }

    const data = await response.json()
    const content = data.choices[0]?.message?.content || '[]'

    return this.parseResponse(content)
  }

  private parseResponse(content: string): Command[] {
    try {
      // 尝试提取 JSON 数组
      const jsonMatch = content.match(/\[[\s\S]*\]/)
      if (jsonMatch) {
        // 移除 JSON 中的注释（AI 可能返回带注释的 JSON）
        let jsonStr = jsonMatch[0]
        // 移除单行注释 // ...
        jsonStr = jsonStr.replace(/\/\/[^\n]*\n/g, '\n')
        // 移除行内注释 // ...
        jsonStr = jsonStr.replace(/\/\/[^\n,}\]]*/g, '')
        return JSON.parse(jsonStr)
      }
      return JSON.parse(content)
    } catch (e) {
      console.error('Failed to parse AI response:', content, e)
      return []
    }
  }
}

// Ollama Provider (本地部署)
class OllamaProvider implements AIProvider {
  private model: string
  private baseUrl: string
  private timeout: number = 60000 // 1 分钟超时

  constructor(model: string = 'llama3', baseUrl: string = 'http://localhost:11434') {
    this.model = model
    this.baseUrl = baseUrl
  }

  async generateCommands(prompt: string, platform: string): Promise<Command[]> {
    const fullPrompt = `${SYSTEM_PROMPT}\n\n用户场景：${prompt}\n系统平台：${platform}`

    // 创建超时控制器
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), this.timeout)

    try {
      const response = await fetch(`${this.baseUrl}/api/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: this.model,
          prompt: fullPrompt,
          stream: false
        }),
        signal: controller.signal
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Ollama API 调用失败，请确保 Ollama 服务正在运行')
      }

      const data = await response.json()
      const content = data.response || '[]'

      return this.parseResponse(content)
    } catch (e) {
      if (e instanceof Error && e.name === 'AbortError') {
        throw new Error('Ollama API 调用超时，请检查服务是否正常运行')
      }
      throw e
    } finally {
      clearTimeout(timeoutId)
    }
  }

  private parseResponse(content: string): Command[] {
    try {
      // 尝试提取 JSON 数组
      const jsonMatch = content.match(/\[[\s\S]*\]/)
      if (jsonMatch) {
        // 移除 JSON 中的注释（AI 可能返回带注释的 JSON）
        let jsonStr = jsonMatch[0]
        // 移除单行注释 // ...
        jsonStr = jsonStr.replace(/\/\/[^\n]*\n/g, '\n')
        // 移除行内注释 // ...
        jsonStr = jsonStr.replace(/\/\/[^\n,}\]]*/g, '')
        return JSON.parse(jsonStr)
      }
      return JSON.parse(content)
    } catch (e) {
      console.error('Failed to parse AI response:', content, e)
      return []
    }
  }
}

// AI 服务管理器
class AIService {
  private settings: AISettings
  private provider: AIProvider | null = null

  constructor() {
    this.settings = this.loadSettings()
  }

  // 加载设置
  loadSettings(): AISettings {
    try {
      const saved = localStorage.getItem('ai-settings')
      if (saved) {
        return { ...DEFAULT_SETTINGS, ...JSON.parse(saved) }
      }
    } catch {
      console.error('Failed to load AI settings')
    }
    return { ...DEFAULT_SETTINGS }
  }

  // 保存设置
  saveSettings(settings: Partial<AISettings>): void {
    this.settings = { ...this.settings, ...settings }
    localStorage.setItem('ai-settings', JSON.stringify(this.settings))
    this.provider = null // 重置 provider
  }

  // 获取当前设置
  getSettings(): AISettings {
    return { ...this.settings }
  }

  // 检查是否已配置
  isConfigured(): boolean {
    // Ollama 不需要 API Key
    if (this.settings.provider === 'ollama') {
      return true
    }
    return !!this.settings.apiKey
  }

  // 获取 Provider
  private getProvider(): AIProvider {
    if (!this.provider) {
      if (this.settings.provider === 'ollama') {
        this.provider = new OllamaProvider(
          this.settings.model || 'llama3',
          this.settings.baseUrl || 'http://localhost:11434'
        )
      } else {
        if (!this.settings.apiKey) {
          throw new Error('请先配置 API Key')
        }

        if (this.settings.provider === 'claude') {
          this.provider = new ClaudeProvider(
            this.settings.apiKey,
            this.settings.model || 'claude-3-haiku-20240307'
          )
        } else {
          this.provider = new OpenAIProvider(
            this.settings.apiKey,
            this.settings.model || 'gpt-3.5-turbo',
            this.settings.baseUrl
          )
        }
      }
    }
    return this.provider
  }

  // 生成命令
  async generateCommands(prompt: string, platform: string): Promise<Command[]> {
    const provider = this.getProvider()
    return provider.generateCommands(prompt, platform)
  }
}

// 导出单例
export const aiService = new AIService()