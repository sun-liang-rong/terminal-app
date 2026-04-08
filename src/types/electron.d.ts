// 系统信息类型
interface SystemInfo {
  cpu: {
    model: string
    cores: number
    speed: string
    usage: number
  }
  memory: {
    total: number
    used: number
    free: number
    usagePercent: number
  }
  storage: {
    total: number
    used: number
    free: number
    usagePercent: number
  }
}

// SSH 配置类型
interface SshConfig {
  id?: string
  name?: string
  host: string
  port: number
  username: string
  password?: string
  authType?: 'password' | 'key'
  privateKey?: string
  savePassword?: boolean
  protocol?: string
}

// 加密相关类型
interface EncryptResult {
  success: boolean
  data?: string
  error?: string
}

interface DecryptResult {
  success: boolean
  data?: string
  error?: string
}

// 存储相关类型
interface StorageResult {
  success: boolean
  data?: SshHost[]
  error?: string
}

// SSH 主机配置类型
interface SshHost {
  id: number | string
  name: string
  host: string
  port: number
  username: string
  authType: 'password' | 'key'
  password?: string
  privateKey?: string
  savePassword: boolean
  protocol: string
}

declare global {
  interface Window {
    electronAPI: {
      // PTY 相关
      ptyCreate: (options: { id: string; cols?: number; rows?: number }) => Promise<{ success: boolean; pid?: number; error?: string }>
      ptyWrite: (options: { id: string; data: string }) => Promise<{ success: boolean; error?: string }>
      ptyResize: (options: { id: string; cols: number; rows: number }) => Promise<{ success: boolean; error?: string }>
      ptyKill: (options: { id: string }) => Promise<{ success: boolean; error?: string }>
      onPtyData: (callback: (data: { id: string; data: string }) => void) => number
      onPtyExit: (callback: (data: { id: string; exitCode: number; signal?: number }) => void) => number
      removePtyListener: (id: number) => void

      // 平台和系统信息
      getPlatform: () => Promise<string>
      getCpuUsage: () => Promise<number>
      getSystemInfo: () => Promise<SystemInfo>

      // 剪贴板
      clipboardWrite: (text: string) => void
      clipboardRead: () => string

      // SSH 相关
      sshConnect: (config: SshConfig) => Promise<{ success: boolean; id?: string; error?: string }>
      sshWrite: (options: { id: string; data: string }) => Promise<{ success: boolean; error?: string }>
      sshResize: (options: { id: string; cols: number; rows: number }) => Promise<{ success: boolean; error?: string }>
      sshDisconnect: (options: { id: string }) => Promise<{ success: boolean; error?: string }>
      onSshData: (callback: (data: { id: string; data: string }) => void) => number
      onSshClose: (callback: (data: { id: string }) => void) => number
      removeSshListener: (id: number) => void

      // 密码加密相关
      encryptPassword: (password: string) => Promise<EncryptResult>
      decryptPassword: (encrypted: string) => Promise<DecryptResult>

      // 主机存储相关
      getHosts: () => Promise<StorageResult>
      saveHosts: (hosts: SshHost[]) => Promise<{ success: boolean; error?: string }>

      // AI 设置存储相关
      getAISettings: () => Promise<{ success: boolean; data?: unknown; error?: string }>
      saveAISettings: (settings: unknown) => Promise<{ success: boolean; error?: string }>

      // AI 对话流相关
      aiChatStream: (request: {
        provider: string
        apiKey?: string
        baseUrl?: string
        model: string
        messages: Array<{ role: string; content: string }>
      }) => Promise<{ success: boolean; streamId?: string; error?: string }>
      onAIStreamData: (callback: (data: { streamId: string; data?: string; done?: boolean; error?: string }) => void) => number
      removeAIStreamListener: (id: number) => void
      aiAbortStream: (streamId: string) => Promise<{ success: boolean; error?: string }>

      // 终端设置存储相关
      getTerminalSettings: () => Promise<{ success: boolean; data?: unknown; error?: string }>
      saveTerminalSettings: (settings: unknown) => Promise<{ success: boolean; error?: string }>

      // 窗口控制相关
      windowMinimize: () => Promise<{ success: boolean; error?: string }>
      windowMaximize: () => Promise<{ success: boolean; error?: string }>
      windowClose: () => Promise<{ success: boolean; error?: string }>
      isMaximized: () => Promise<boolean>
      onWindowStateChange: (callback: (state: { maximized: boolean }) => void) => number
      removeWindowStateListener: (id: number) => void
    }
  }
}

export { SystemInfo, SshConfig, EncryptResult, DecryptResult, StorageResult, SshHost }