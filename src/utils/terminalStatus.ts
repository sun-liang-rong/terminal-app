// 终端状态类型
export interface TerminalStatus {
  connected: boolean           // 是否已连接
  shell: string                // shell 类型 (zsh/bash/powershell/cmd)
  sessionCount: number         // 会话总数
  activeSessionType: string    // 当前活动会话类型 (local/ssh)
  cols: number                 // 终端列数
  rows: number                 // 终端行数
  encoding: string             // 编码
  // 新增状态
  sshConnections: number       // SSH 连接数
  sshConnected: boolean        // 当前 SSH 是否连接
  sshHost?: string             // 当前 SSH 主机名
  aiReady: boolean             // AI 服务是否就绪
  aiModel?: string             // AI 模型名称
  // 系统资源状态
  memoryUsage: number          // 内存使用百分比
  memoryStatus: 'normal' | 'warning' | 'critical' // 内存状态
  cpuUsage: number             // CPU 使用百分比
  cpuStatus: 'normal' | 'warning' | 'critical'    // CPU 状态
  storageUsage: number         // 存储使用百分比
}

// 默认状态
const defaultStatus: TerminalStatus = {
  connected: false,
  shell: 'bash',
  sessionCount: 1,
  activeSessionType: 'local',
  cols: 80,
  rows: 24,
  encoding: 'UTF-8',
  sshConnections: 0,
  sshConnected: false,
  aiReady: false,
  memoryUsage: 0,
  memoryStatus: 'normal',
  cpuUsage: 0,
  cpuStatus: 'normal',
  storageUsage: 0
}

// 状态存储
let currentStatus: TerminalStatus = { ...defaultStatus }
const listeners: Set<(status: TerminalStatus) => void> = new Set()

// 获取当前状态
export const getStatus = (): TerminalStatus => {
  return { ...currentStatus }
}

// 更新状态
export const updateStatus = (updates: Partial<TerminalStatus>) => {
  currentStatus = { ...currentStatus, ...updates }
  listeners.forEach(listener => listener(currentStatus))
}

// 订阅状态变化
export const subscribeStatus = (listener: (status: TerminalStatus) => void): (() => void) => {
  listeners.add(listener)
  // 立即通知当前状态
  listener(currentStatus)
  // 返回取消订阅函数
  return () => listeners.delete(listener)
}

// 检测 shell 名称
export const detectShellName = (platform: string): string => {
  if (platform === 'win32') {
    // Windows: 检测 PowerShell 或 CMD
    const psPath = process.env.ProgramFiles + '\\PowerShell\\7\\pwsh.exe'
    if (typeof window !== 'undefined') {
      // 在渲染进程中，默认显示 PowerShell
      return 'PowerShell'
    }
    return 'cmd'
  }
  // Unix: 检测 zsh/bash
  const shell = typeof process !== 'undefined' ? process.env.SHELL : '/bin/bash'
  if (shell?.includes('zsh')) return 'zsh'
  if (shell?.includes('bash')) return 'bash'
  return 'sh'
}