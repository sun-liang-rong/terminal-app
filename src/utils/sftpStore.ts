/**
 * SFTP 状态管理
 * 管理 SSH 连接、本地/远程路径、文件列表和传输任务
 */

import { reactive, computed, watch } from 'vue'
import type { SftpItem, LocalFileItem } from '../types/electron'
import { toast } from './notification'

// 传输任务类型
export interface TransferTask {
  id: string
  type: 'upload' | 'download'
  status: 'pending' | 'running' | 'paused' | 'completed' | 'failed' | 'cancelled'
  localPath: string
  remotePath: string
  fileName: string
  totalSize: number
  transferredSize: number
  percent: number
  startTime?: number
  endTime?: number
  error?: string
}

// SFTP 状态类型
export interface SftpState {
  // SSH 连接
  sshId: string | null
  sshConnected: boolean

  // 路径
  localPath: string
  remotePath: string

  // 文件列表
  localFiles: LocalFileItem[]
  remoteFiles: SftpItem[]
  localLoading: boolean
  remoteLoading: boolean

  // 选择状态
  selectedLocalFiles: Set<string>
  selectedRemoteFiles: Set<string>

  // 传输任务
  transferTasks: TransferTask[]
  queueExpanded: boolean

  // 错误信息
  localError: string | null
  remoteError: string | null
}

// 创建响应式状态
const state = reactive<SftpState>({
  sshId: null,
  sshConnected: false,
  localPath: '',
  remotePath: '',
  localFiles: [],
  remoteFiles: [],
  localLoading: false,
  remoteLoading: false,
  selectedLocalFiles: new Set(),
  selectedRemoteFiles: new Set(),
  transferTasks: [],
  queueExpanded: false,
  localError: null,
  remoteError: null
})

// 计算属性
export const hasActiveSSH = computed(() => state.sshId && state.sshConnected)
export const hasTransferTasks = computed(() => state.transferTasks.length > 0)
export const activeTasks = computed(() => state.transferTasks.filter(t => t.status === 'running' || t.status === 'pending'))
export const completedTasks = computed(() => state.transferTasks.filter(t => t.status === 'completed'))

// 初始化本地路径
export const initLocalPath = async () => {
  try {
    const homeDir = await window.electronAPI.getHomeDir()
    state.localPath = homeDir
    await loadLocalFiles()
  } catch (e) {
    console.error('[SftpStore] Failed to get home dir:', e)
    state.localError = '无法获取用户主目录'
  }
}

// 加载本地文件列表
export const loadLocalFiles = async (path?: string) => {
  const targetPath = path || state.localPath
  state.localLoading = true
  state.localError = null

  try {
    const result = await window.electronAPI.localList(targetPath)
    if (result.success && result.items) {
      state.localFiles = result.items
      state.localPath = result.path || targetPath
    } else {
      state.localError = result.error || '加载失败'
    }
  } catch (e) {
    console.error('[SftpStore] Failed to load local files:', e)
    state.localError = (e as Error).message
  } finally {
    state.localLoading = false
  }
}

// 加载远程文件列表
export const loadRemoteFiles = async (path?: string) => {
  if (!state.sshId) {
    state.remoteError = '未连接 SSH'
    return
  }

  const targetPath = path || state.remotePath || '/'
  state.remoteLoading = true
  state.remoteError = null

  try {
    const result = await window.electronAPI.sftpList({ sshId: state.sshId, path: targetPath })
    if (result.success && result.items) {
      state.remoteFiles = result.items
      state.remotePath = result.path || targetPath
    } else {
      state.remoteError = result.error || '加载失败'
    }
  } catch (e) {
    console.error('[SftpStore] Failed to load remote files:', e)
    state.remoteError = (e as Error).message
  } finally {
    state.remoteLoading = false
  }
}

// 设置 SSH 连接
export const setSSHConnection = (sshId: string | null, connected: boolean) => {
  state.sshId = sshId
  state.sshConnected = connected

  if (connected && sshId) {
    // SSH 连接后，加载远程根目录
    state.remotePath = '/'
    loadRemoteFiles('/')
  } else {
    // 断开时清理
    state.remoteFiles = []
    state.remotePath = ''
    state.selectedRemoteFiles.clear()
  }
}

// 刷新文件列表
export const refreshAll = async () => {
  await loadLocalFiles()
  if (state.sshConnected) {
    await loadRemoteFiles()
  }
}

// 导航到上级目录
export const goLocalParent = async () => {
  const parts = state.localPath.split(/[/\\]/)
  if (parts.length > 1) {
    parts.pop()
    const parentPath = parts.join(state.localPath.includes('/') ? '/' : '\\') || '/'
    await loadLocalFiles(parentPath)
  }
}

export const goRemoteParent = async () => {
  const parts = state.remotePath.split('/')
  if (parts.length > 1) {
    parts.pop()
    const parentPath = parts.join('/') || '/'
    await loadRemoteFiles(parentPath)
  }
}

// 进入子目录
export const enterLocalDir = async (name: string) => {
  const separator = state.localPath.includes('/') ? '/' : '\\'
  const newPath = state.localPath.endsWith(separator)
    ? state.localPath + name
    : state.localPath + separator + name
  await loadLocalFiles(newPath)
}

export const enterRemoteDir = async (name: string) => {
  const newPath = state.remotePath.endsWith('/')
    ? state.remotePath + name
    : state.remotePath + '/' + name
  await loadRemoteFiles(newPath)
}

// 文件选择 - 切换（用于多选）
export const toggleLocalSelection = (path: string) => {
  if (state.selectedLocalFiles.has(path)) {
    state.selectedLocalFiles.delete(path)
  } else {
    state.selectedLocalFiles.add(path)
  }
}

export const toggleRemoteSelection = (name: string) => {
  if (state.selectedRemoteFiles.has(name)) {
    state.selectedRemoteFiles.delete(name)
  } else {
    state.selectedRemoteFiles.add(name)
  }
}

// 文件选择 - 单选（清除其他选中，只选中当前）
export const selectLocalFile = (path: string) => {
  state.selectedLocalFiles.clear()
  state.selectedLocalFiles.add(path)
}

export const selectRemoteFile = (name: string) => {
  state.selectedRemoteFiles.clear()
  state.selectedRemoteFiles.add(name)
}

// 清除所有选中
export const clearLocalSelection = () => {
  state.selectedLocalFiles.clear()
}

export const clearRemoteSelection = () => {
  state.selectedRemoteFiles.clear()
}

// 传输任务管理
export const addTransferTask = (task: TransferTask) => {
  state.transferTasks.push(task)
}

export const updateTransferTask = (id: string, updates: Partial<TransferTask>) => {
  const task = state.transferTasks.find(t => t.id === id)
  if (task) {
    Object.assign(task, updates)
  }
}

export const removeTransferTask = (id: string) => {
  const index = state.transferTasks.findIndex(t => t.id === id)
  if (index !== -1) {
    state.transferTasks.splice(index, 1)
  }
}

export const clearCompletedTasks = () => {
  state.transferTasks = state.transferTasks.filter(t => t.status !== 'completed')
}

// 暂停任务
export const pauseTask = (id: string) => {
  const task = state.transferTasks.find(t => t.id === id)
  if (task && task.status === 'running') {
    task.status = 'paused'
  }
}

// 继续任务
export const resumeTask = (id: string) => {
  const task = state.transferTasks.find(t => t.id === id)
  if (task && task.status === 'paused') {
    task.status = 'running'
  }
}

// 重试任务
export const retryTask = (id: string) => {
  const task = state.transferTasks.find(t => t.id === id)
  if (task && task.status === 'failed') {
    task.status = 'running'
    task.error = undefined
    task.percent = 0
    task.transferredSize = 0
  }
}

// 开始上传
export const startUpload = async (localPath: string, remotePath: string) => {
  if (!state.sshId) return

  const fileName = localPath.split(/[/\\]/).pop() || ''
  const task: TransferTask = {
    id: `upload-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    type: 'upload',
    status: 'running',
    localPath,
    remotePath,
    fileName,
    totalSize: 0,
    transferredSize: 0,
    percent: 0,
    startTime: Date.now()
  }

  addTransferTask(task)

  // 展开传输队列
  state.queueExpanded = true

  try {
    const result = await window.electronAPI.sftpUpload({
      sshId: state.sshId,
      localPath,
      remotePath
    })

    if (result.success) {
      updateTransferTask(task.id, {
        status: 'completed',
        percent: 100,
        endTime: Date.now()
      })
      // 提示上传完成
      toast.success(`上传完成: ${fileName}`)
      // 刷新远程文件列表
      await loadRemoteFiles()
    } else {
      updateTransferTask(task.id, {
        status: 'failed',
        error: result.error || '上传失败'
      })
      toast.error(`上传失败: ${result.error || '未知错误'}`)
    }
  } catch (e) {
    updateTransferTask(task.id, {
      status: 'failed',
      error: (e as Error).message
    })
  }
}

// 开始下载
export const startDownload = async (remotePath: string, localPath: string) => {
  if (!state.sshId) return

  const fileName = remotePath.split('/').pop() || ''
  const task: TransferTask = {
    id: `download-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    type: 'download',
    status: 'running',
    localPath,
    remotePath,
    fileName,
    totalSize: 0,
    transferredSize: 0,
    percent: 0,
    startTime: Date.now()
  }

  addTransferTask(task)

  // 展开传输队列
  state.queueExpanded = true

  try {
    const result = await window.electronAPI.sftpDownload({
      sshId: state.sshId,
      remotePath,
      localPath
    })

    if (result.success) {
      updateTransferTask(task.id, {
        status: 'completed',
        percent: 100,
        endTime: Date.now()
      })
      // 提示下载完成
      toast.success(`下载完成: ${fileName}`)
      // 刷新本地文件列表
      await loadLocalFiles()
    } else {
      updateTransferTask(task.id, {
        status: 'failed',
        error: result.error || '下载失败'
      })
      toast.error(`下载失败: ${result.error || '未知错误'}`)
    }
  } catch (e) {
    updateTransferTask(task.id, {
      status: 'failed',
      error: (e as Error).message
    })
  }
}

// 切换传输队列展开状态
export const toggleQueueExpanded = () => {
  state.queueExpanded = !state.queueExpanded
}

// 监听传输进度
let progressListenerId: number | null = null

export const setupProgressListener = () => {
  if (progressListenerId) return

  progressListenerId = window.electronAPI.onSftpProgress((data) => {
    // 查找对应的任务
    const task = state.transferTasks.find(t =>
      t.localPath === data.localPath && t.remotePath === data.remotePath
    )

    if (task && task.status === 'running') {
      updateTransferTask(task.id, {
        totalSize: data.total,
        transferredSize: data.downloaded || data.uploaded || 0,
        percent: data.percent
      })
    }
  })
}

export const removeProgressListener = () => {
  if (progressListenerId) {
    window.electronAPI.removeSftpProgressListener(progressListenerId)
    progressListenerId = null
  }
}

// 导出状态
export const sftpState = state

export default state