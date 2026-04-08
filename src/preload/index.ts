import { contextBridge, ipcRenderer, clipboard } from 'electron'
import type { SystemInfo, SshConfig, EncryptResult, DecryptResult, StorageResult, SshHost } from '../types/electron'

// 通知主进程 preload 已加载
ipcRenderer.send('preload-loaded')

console.log('[Preload] Starting preload script...')
console.log('[Preload] contextBridge available:', !!contextBridge)

// 存储每个终端的监听器
interface ListenerInfo {
  type: 'data' | 'exit' | 'ssh-data' | 'ssh-close'
  handler: (event: Electron.IpcRendererEvent, data: unknown) => void
}

const listeners = new Map<number, ListenerInfo>()

interface PtyDataCallback {
  (data: { id: string; data: string }): void
}

interface PtyExitCallback {
  (data: { id: string; exitCode: number; signal?: number }): void
}

interface SshDataCallback {
  (data: { id: string; data: string }): void
}

interface SshCloseCallback {
  (data: { id: string }): void
}

interface ElectronAPI {
  ptyCreate: (options: { id: string; cols?: number; rows?: number }) => Promise<{ success: boolean; pid?: number; error?: string }>
  ptyWrite: (options: { id: string; data: string }) => Promise<{ success: boolean; error?: string }>
  ptyResize: (options: { id: string; cols: number; rows: number }) => Promise<{ success: boolean; error?: string }>
  ptyKill: (options: { id: string }) => Promise<{ success: boolean; error?: string }>
  onPtyData: (callback: PtyDataCallback) => number
  onPtyExit: (callback: PtyExitCallback) => number
  removePtyListener: (id: number) => void
  getPlatform: () => Promise<string>
  getCpuUsage: () => Promise<number>
  getSystemInfo: () => Promise<SystemInfo>
  clipboardWrite: (text: string) => void
  clipboardRead: () => string
  // SSH 相关
  sshConnect: (config: SshConfig) => Promise<{ success: boolean; id?: string; error?: string }>
  sshWrite: (options: { id: string; data: string }) => Promise<{ success: boolean; error?: string }>
  sshResize: (options: { id: string; cols: number; rows: number }) => Promise<{ success: boolean; error?: string }>
  sshDisconnect: (options: { id: string }) => Promise<{ success: boolean; error?: string }>
  onSshData: (callback: SshDataCallback) => number
  onSshClose: (callback: SshCloseCallback) => number
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
  // 终端设置存储相关
  getTerminalSettings: () => Promise<{ success: boolean; data?: unknown; error?: string }>
  saveTerminalSettings: (settings: unknown) => Promise<{ success: boolean; error?: string }>
}

// 暴露安全的 API 到渲染进程
const electronAPI: ElectronAPI = {
  // PTY 相关
  ptyCreate: (options) => ipcRenderer.invoke('pty-create', options),
  ptyWrite: (options) => ipcRenderer.invoke('pty-write', options),
  ptyResize: (options) => ipcRenderer.invoke('pty-resize', options),
  ptyKill: (options) => ipcRenderer.invoke('pty-kill', options),

  // 监听 PTY 输出 - 每个终端独立监听
  onPtyData: (callback: PtyDataCallback): number => {
    const handler = (_event: Electron.IpcRendererEvent, data: unknown) => callback(data as { id: string; data: string })
    ipcRenderer.on('pty-data', handler)
    const id = Date.now()
    listeners.set(id, { type: 'data', handler })
    return id
  },

  onPtyExit: (callback: PtyExitCallback): number => {
    const handler = (_event: Electron.IpcRendererEvent, data: unknown) => callback(data as { id: string; exitCode: number; signal?: number })
    ipcRenderer.on('pty-exit', handler)
    const id = Date.now() + 1
    listeners.set(id, { type: 'exit', handler })
    return id
  },

  // 移除特定监听器
  removePtyListener: (id: number): void => {
    const info = listeners.get(id)
    if (info) {
      ipcRenderer.removeListener(info.type === 'data' ? 'pty-data' : 'pty-exit', info.handler)
      listeners.delete(id)
    }
  },

  // 平台信息
  getPlatform: () => ipcRenderer.invoke('get-platform'),

  // CPU 使用率
  getCpuUsage: () => ipcRenderer.invoke('get-cpu-usage'),

  // 系统信息
  getSystemInfo: () => ipcRenderer.invoke('get-system-info'),

  // 剪贴板操作
  clipboardWrite: (text: string) => clipboard.writeText(text),
  clipboardRead: () => clipboard.readText(),

  // SSH 相关
  sshConnect: (config: SshConfig) => ipcRenderer.invoke('ssh-connect', config),
  sshWrite: (options: { id: string; data: string }) => ipcRenderer.invoke('ssh-write', options),
  sshResize: (options: { id: string; cols: number; rows: number }) => ipcRenderer.invoke('ssh-resize', options),
  sshDisconnect: (options: { id: string }) => ipcRenderer.invoke('ssh-disconnect', options),

  onSshData: (callback: SshDataCallback): number => {
    const handler = (_event: Electron.IpcRendererEvent, data: unknown) => callback(data as { id: string; data: string })
    ipcRenderer.on('ssh-data', handler)
    const id = Date.now() + 2
    listeners.set(id, { type: 'ssh-data', handler })
    return id
  },

  onSshClose: (callback: SshCloseCallback): number => {
    const handler = (_event: Electron.IpcRendererEvent, data: unknown) => callback(data as { id: string })
    ipcRenderer.on('ssh-close', handler)
    const id = Date.now() + 3
    listeners.set(id, { type: 'ssh-close', handler })
    return id
  },

  removeSshListener: (id: number): void => {
    const info = listeners.get(id)
    if (info) {
      const channel = info.type === 'ssh-data' ? 'ssh-data' : 'ssh-close'
      ipcRenderer.removeListener(channel, info.handler)
      listeners.delete(id)
    }
  },

  // 密码加密相关
  encryptPassword: (password: string) => ipcRenderer.invoke('encrypt-password', password),
  decryptPassword: (encrypted: string) => ipcRenderer.invoke('decrypt-password', encrypted),

  // 主机存储相关
  getHosts: () => ipcRenderer.invoke('get-hosts'),
  saveHosts: (hosts: SshHost[]) => ipcRenderer.invoke('save-hosts', hosts),

  // AI 设置存储相关
  getAISettings: () => ipcRenderer.invoke('get-ai-settings'),
  saveAISettings: (settings: unknown) => ipcRenderer.invoke('save-ai-settings', settings),

  // 终端设置存储相关
  getTerminalSettings: () => ipcRenderer.invoke('get-terminal-settings'),
  saveTerminalSettings: (settings: unknown) => ipcRenderer.invoke('save-terminal-settings', settings)
}

contextBridge.exposeInMainWorld('electronAPI', electronAPI)
console.log('[Preload] electronAPI exposed to main world successfully!')