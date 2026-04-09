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

// 系统提示词生成函数
const getSystemPrompt = (platform: string): string => {
  const platformRules: Record<string, string> = {
    windows: `仅生成 Windows PowerShell 常用命令
   - 不允许返回 Linux / macOS 命令`,
    macos: `仅生成 macOS Terminal 常用命令
   - 不允许返回 Windows / Linux 命令`,
    linux: `仅生成 Linux Bash 常用命令
   - 不允许返回 Windows / macOS 命令`,
    all: `可生成跨平台通用命令`
  }

  return `你是 ${platform === 'windows' ? 'PowerShell / Windows Terminal' : platform === 'macos' ? 'macOS Terminal' : platform === 'linux' ? 'Linux Bash' : '终端'}命令生成助手。

## 输出格式
返回纯 JSON 数组，无代码块标记、无注释、无额外文本：
[
  {
    "name": "命令名称",
    "command": "完整可执行命令",
    "description": "一句话用途说明",
    "platform": "${platform}"
  }
]

## 核心规则
1. 仅返回 JSON 数组，无其他内容
2. 每次返回 1-5 个最相关命令
3. ${platformRules[platform] || platformRules.all}
4. 字段规范：
   - name：简洁明确
   - command：完整可执行命令
   - description：一句话说明用途
   - platform：必须是 windows / macos / linux / all 之一
5. JSON 必须合法：
   - 不允许注释（// 或 /* */）
   - 不允许多余逗号
   - 必须可被 JSON.parse 正确解析

禁止行为：
- 不要解释命令
- 不要输出示例
- 不要输出多段文本
- 不要返回无效 JSON
- 不要混用多个操作系统命令
- 不要生成虚假或不可执行命令
- 不要展示思考过程
- 不要解释步骤
- 只输出最终答案`
}

// 保留旧的 SYSTEM_PROMPT 供旧代码兼容（已废弃）
const SYSTEM_PROMPT = getSystemPrompt('windows')

// 解析 AI 响应的通用函数
function parseAIResponse(content: string, platform: string): Command[] {
  console.log('[AI] Raw response:', content)

  try {
    // 1. 尝试提取 JSON 数组
    const jsonMatch = content.match(/\[[\s\S]*\]/)
    if (jsonMatch) {
      try {
        let jsonStr = jsonMatch[0]
        // 移除 JSON 中的注释
        jsonStr = jsonStr.replace(/\/\/[^\n]*\n/g, '\n')
        jsonStr = jsonStr.replace(/\/\/[^\n,}\]]*/g, '')
        const parsed = JSON.parse(jsonStr)
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed
        }
      } catch (e) {
        console.warn('[AI] JSON parse failed, trying other formats')
      }
    }

    // 2. 尝试提取代码块中的命令（```powershell ... ``` 或 ```bash ... ```）
    const codeBlockMatch = content.match(/```(?:powershell|bash|sh|shell|cmd)?\s*([\s\S]*?)```/i)
    if (codeBlockMatch) {
      const command = codeBlockMatch[1].trim()
      if (command) {
        return [{
          name: '命令',
          command: command,
          description: '根据您的需求生成的命令',
          platform: platform
        }]
      }
    }

    // 3. 尝试提取纯命令（以换行分隔的多条命令）
    const lines = content.split('\n').filter(line => line.trim() && !line.startsWith('#') && !line.startsWith('//'))
    if (lines.length > 0) {
      // 检查是否看起来像命令（包含常见命令字符）
      const commands = lines.filter(line => /^[a-zA-Z$\-_\/\\]/.test(line.trim()))
      if (commands.length > 0) {
        return commands.slice(0, 5).map((cmd, index) => ({
          name: `命令 ${index + 1}`,
          command: cmd.trim(),
          description: '根据您的需求生成的命令',
          platform: platform
        }))
      }
    }

    console.error('[AI] Failed to parse response:', content)
    return []
  } catch (e) {
    console.error('[AI] Parse error:', e)
    return []
  }
}

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
        system: getSystemPrompt(platform),
        messages: [
          {
            role: 'user',
            content: `用户场景：${prompt}`
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

    return parseAIResponse(content, platform)
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
            content: getSystemPrompt(platform)
          },
          {
            role: 'user',
            content: `用户场景：${prompt}`
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

    return parseAIResponse(content, platform)
  }
}

// Ollama Provider (本地部署)
class OllamaProvider implements AIProvider {
  private model: string
  private baseUrl: string
  private timeout: number = 60000 // 1 分钟超时

  constructor(model: string = 'llama3', baseUrl: string = 'http://localhost:11434') {
    this.model = model
    this.baseUrl = (baseUrl || 'http://localhost:11434').replace(/\/$/, '')
  }

  async generateCommands(prompt: string, platform: string): Promise<Command[]> {
    const fullPrompt = `${getSystemPrompt(platform)}\n\n用户场景：${prompt}`

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

      return parseAIResponse(content, platform)
    } catch (e) {
      if (e instanceof Error && e.name === 'AbortError') {
        throw new Error('Ollama API 调用超时，请检查服务是否正常运行')
      }
      throw e
    } finally {
      clearTimeout(timeoutId)
    }
  }
}

// AI 服务管理器
class AIService {
  private settings: AISettings
  private provider: AIProvider | null = null
  private loadPromise: Promise<void> | null = null

  constructor() {
    this.settings = DEFAULT_SETTINGS
    this.loadPromise = this.loadSettingsAsync()
  }

  // 异步加载设置
  private async loadSettingsAsync(): Promise<void> {
    try {
      const result = await window.electronAPI.getAISettings()
      if (result.success && result.data) {
        this.settings = { ...DEFAULT_SETTINGS, ...result.data as AISettings }
        console.log('[AI] Settings loaded:', this.settings)
      }
    } catch (e) {
      console.error('Failed to load AI settings:', e)
    }
  }

  // 等待设置加载完成
  async waitForSettings(): Promise<AISettings> {
    if (this.loadPromise) {
      await this.loadPromise
    }
    return this.getSettings()
  }

  // 同步加载设置（用于初始化，返回默认值后异步更新）
  loadSettings(): AISettings {
    return { ...this.settings }
  }

  // 保存设置
  async saveSettings(settings: Partial<AISettings>): Promise<void> {
    this.settings = { ...this.settings, ...settings }
    try {
      const plainSettings = JSON.parse(JSON.stringify(this.settings))
      await window.electronAPI.saveAISettings(plainSettings)
      console.log('[AI] Settings saved:', plainSettings)
    } catch (e) {
      console.error('Failed to save AI settings:', e)
    }
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