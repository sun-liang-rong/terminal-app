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
    }
  }
}

export { SystemInfo, SshConfig, EncryptResult, DecryptResult }