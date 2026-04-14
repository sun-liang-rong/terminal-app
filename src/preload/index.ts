import { contextBridge, ipcRenderer, clipboard } from 'electron'
import type { SystemInfo, SshConfig, EncryptResult, DecryptResult, StorageResult, SshHost } from '../types/electron'

// 通知主进程 preload 已加载
ipcRenderer.send('preload-loaded')

console.log('[Preload] Starting preload script...')
console.log('[Preload] contextBridge available:', !!contextBridge)

// 存储每个终端的监听器
interface ListenerInfo {
  type: 'data' | 'exit' | 'ssh-data' | 'ssh-close' | 'window-state' | 'ai-stream' | 'sftp-progress'
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
  // AI 对话流
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
  // AI 聊天记录持久化
  getAIChatHistory: () => Promise<{ success: boolean; data?: unknown[]; error?: string }>
  saveAIChatHistory: (messages: unknown[]) => Promise<{ success: boolean; error?: string }>
  clearAIChatHistory: () => Promise<{ success: boolean; error?: string }>
  // 窗口控制相关
  windowMinimize: () => Promise<{ success: boolean; error?: string }>
  windowMaximize: () => Promise<{ success: boolean; error?: string }>
  windowClose: () => Promise<{ success: boolean; error?: string }>
  isMaximized: () => Promise<boolean>
  // 窗口状态变化监听
  onWindowStateChange: (callback: (state: { maximized: boolean }) => void) => number
  removeWindowStateListener: (id: number) => void
  // SFTP 文件传输相关
  sftpList: (options: { sshId: string; path: string }) => Promise<{ success: boolean; items?: SftpItem[]; path?: string; error?: string }>
  sftpDownload: (options: { sshId: string; remotePath: string; localPath: string }) => Promise<{ success: boolean; error?: string }>
  sftpUpload: (options: { sshId: string; localPath: string; remotePath: string }) => Promise<{ success: boolean; error?: string }>
  sftpMkdir: (options: { sshId: string; path: string }) => Promise<{ success: boolean; error?: string }>
  sftpDelete: (options: { sshId: string; path: string }) => Promise<{ success: boolean; error?: string }>
  sftpRmdir: (options: { sshId: string; path: string }) => Promise<{ success: boolean; error?: string }>
  sftpRename: (options: { sshId: string; oldPath: string; newPath: string }) => Promise<{ success: boolean; error?: string }>
  sftpStat: (options: { sshId: string; path: string }) => Promise<{ success: boolean; info?: SftpItem; error?: string }>
  sftpClose: (options: { sshId: string }) => Promise<{ success: boolean; error?: string }>
  onSftpProgress: (callback: (data: SftpProgressData) => void) => number
  removeSftpProgressListener: (id: number) => void
  // 本地文件系统相关
  getHomeDir: () => Promise<string>
  localList: (path: string) => Promise<{ success: boolean; items?: LocalFileItem[]; path?: string; error?: string }>
  localMkdir: (path: string) => Promise<{ success: boolean; error?: string }>
  localDelete: (path: string) => Promise<{ success: boolean; error?: string }>
  localExists: (path: string) => Promise<boolean>
  dialogOpen: (options: DialogOptions) => Promise<string[] | null>
  dialogSave: (options: DialogOptions) => Promise<string | null>
}

// SFTP 文件项类型
interface SftpItem {
  name: string
  type: 'file' | 'directory' | 'symlink'
  size: number
  modifyTime: number
  accessTime: number
  permissions: string
  owner: string
  group: string
}

// SFTP 传输进度
interface SftpProgressData {
  type: 'upload' | 'download'
  remotePath: string
  localPath: string
  percent: number
  total: number
  downloaded?: number
  uploaded?: number
}

// 本地文件项类型
interface LocalFileItem {
  name: string
  type: 'file' | 'directory'
  size: number
  modifyTime: number
  path: string
  isHidden?: boolean
}

// 文件对话框选项
interface DialogOptions {
  title?: string
  defaultPath?: string
  filters?: Array<{ name: string; extensions: string[] }>
  properties?: Array<'openFile' | 'openDirectory' | 'multiSelections' | 'createDirectory'>
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

  // AI 对话流相关
  aiChatStream: (request) => ipcRenderer.invoke('ai-chat-stream', request),
  onAIStreamData: (callback): number => {
    const handler = (_event: Electron.IpcRendererEvent, data: unknown) => callback(data as { streamId: string; data?: string; done?: boolean; error?: string })
    ipcRenderer.on('ai-stream-data', handler)
    const id = Date.now() + 5
    listeners.set(id, { type: 'ai-stream' as const, handler })
    return id
  },
  removeAIStreamListener: (id: number): void => {
    const info = listeners.get(id)
    if (info && info.type === 'ai-stream') {
      ipcRenderer.removeListener('ai-stream-data', info.handler)
      listeners.delete(id)
    }
  },
  aiAbortStream: (streamId: string) => ipcRenderer.invoke('ai-abort-stream', streamId),

  // 终端设置存储相关
  getTerminalSettings: () => ipcRenderer.invoke('get-terminal-settings'),
  saveTerminalSettings: (settings: unknown) => ipcRenderer.invoke('save-terminal-settings', settings),

  // AI 聊天记录持久化
  getAIChatHistory: () => ipcRenderer.invoke('get-ai-chat-history'),
  saveAIChatHistory: (messages: unknown[]) => ipcRenderer.invoke('save-ai-chat-history', messages),
  clearAIChatHistory: () => ipcRenderer.invoke('clear-ai-chat-history'),

  // 窗口控制相关
  windowMinimize: () => ipcRenderer.invoke('window-minimize'),
  windowMaximize: () => ipcRenderer.invoke('window-maximize'),
  windowClose: () => ipcRenderer.invoke('window-close'),
  isMaximized: () => ipcRenderer.invoke('is-maximized'),
  // 窗口状态变化监听
  onWindowStateChange: (callback: (state: { maximized: boolean }) => void): number => {
    const handler = (_event: Electron.IpcRendererEvent, state: unknown) => callback(state as { maximized: boolean })
    ipcRenderer.on('window-state-change', handler)
    const id = Date.now() + 4
    listeners.set(id, { type: 'window-state' as const, handler })
    return id
  },
  removeWindowStateListener: (id: number): void => {
    const info = listeners.get(id)
    if (info && info.type === 'window-state') {
      ipcRenderer.removeListener('window-state-change', info.handler)
      listeners.delete(id)
    }
  },

  // SFTP 文件传输相关
  sftpList: (options) => ipcRenderer.invoke('sftp-list', options),
  sftpDownload: (options) => ipcRenderer.invoke('sftp-download', options),
  sftpUpload: (options) => ipcRenderer.invoke('sftp-upload', options),
  sftpMkdir: (options) => ipcRenderer.invoke('sftp-mkdir', options),
  sftpDelete: (options) => ipcRenderer.invoke('sftp-delete', options),
  sftpRmdir: (options) => ipcRenderer.invoke('sftp-rmdir', options),
  sftpRename: (options) => ipcRenderer.invoke('sftp-rename', options),
  sftpStat: (options) => ipcRenderer.invoke('sftp-stat', options),
  sftpClose: (options) => ipcRenderer.invoke('sftp-close', options),

  onSftpProgress: (callback: (data: SftpProgressData) => void): number => {
    const handler = (_event: Electron.IpcRendererEvent, data: unknown) => callback(data as SftpProgressData)
    ipcRenderer.on('sftp-progress', handler)
    const id = Date.now() + 6
    listeners.set(id, { type: 'sftp-progress' as const, handler })
    return id
  },
  removeSftpProgressListener: (id: number): void => {
    const info = listeners.get(id)
    if (info && info.type === 'sftp-progress') {
      ipcRenderer.removeListener('sftp-progress', info.handler)
      listeners.delete(id)
    }
  },

  // 本地文件系统相关
  getHomeDir: () => ipcRenderer.invoke('get-home-dir'),
  localList: (path: string) => ipcRenderer.invoke('local-list', path),
  localMkdir: (path: string) => ipcRenderer.invoke('local-mkdir', path),
  localDelete: (path: string) => ipcRenderer.invoke('local-delete', path),
  localExists: (path: string) => ipcRenderer.invoke('local-exists', path),
  dialogOpen: (options: DialogOptions) => ipcRenderer.invoke('dialog-open', options),
  dialogSave: (options: DialogOptions) => ipcRenderer.invoke('dialog-save', options)
}

contextBridge.exposeInMainWorld('electronAPI', electronAPI)
console.log('[Preload] electronAPI exposed to main world successfully!')