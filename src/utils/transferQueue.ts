/**
 * 传输队列管理
 * 管理上传/下载任务的队列、进度、状态
 */

import { reactive, computed } from 'vue'
import { generateId } from './fileUtils'
import type { TransferTask } from './sftpStore'

// 队列状态
interface QueueState {
  tasks: TransferTask[]
  paused: boolean
  maxConcurrent: number
}

const state = reactive<QueueState>({
  tasks: [],
  paused: false,
  maxConcurrent: 3 // 最大并发任务数
})

// 计算属性
export const runningTasks = computed(() => state.tasks.filter(t => t.status === 'running'))
export const pendingTasks = computed(() => state.tasks.filter(t => t.status === 'pending'))
export const completedTasks = computed(() => state.tasks.filter(t => t.status === 'completed'))
export const failedTasks = computed(() => state.tasks.filter(t => t.status === 'failed'))
export const hasActiveTasks = computed(() => runningTasks.value.length > 0 || pendingTasks.value.length > 0)
export const totalProgress = computed(() => {
  const active = state.tasks.filter(t => t.status === 'running' || t.status === 'completed')
  if (active.length === 0) return 0

  const total = active.reduce((sum, t) => sum + t.percent, 0)
  return Math.round(total / active.length)
})

// 创建上传任务
export const createUploadTask = (
  localPath: string,
  remotePath: string,
  fileName: string,
  totalSize: number = 0
): TransferTask => {
  return {
    id: generateId(),
    type: 'upload',
    status: 'pending',
    localPath,
    remotePath,
    fileName,
    totalSize,
    transferredSize: 0,
    percent: 0
  }
}

// 创建下载任务
export const createDownloadTask = (
  remotePath: string,
  localPath: string,
  fileName: string,
  totalSize: number = 0
): TransferTask => {
  return {
    id: generateId(),
    type: 'download',
    status: 'pending',
    localPath,
    remotePath,
    fileName,
    totalSize,
    transferredSize: 0,
    percent: 0
  }
}

// 添加任务
export const addTask = (task: TransferTask): void => {
  state.tasks.push(task)

  // 如果队列未暂停且有空余并发槽，立即开始
  if (!state.paused && runningTasks.value.length < state.maxConcurrent) {
    startNextTask()
  }
}

// 开始下一个任务
export const startNextTask = async (): void => {
  const nextTask = pendingTasks.value[0]
  if (!nextTask) return

  nextTask.status = 'running'
  nextTask.startTime = Date.now()
}

// 更新任务进度
export const updateTaskProgress = (
  taskId: string,
  transferredSize: number,
  totalSize: number,
  percent: number
): void => {
  const task = state.tasks.find(t => t.id === taskId)
  if (task && task.status === 'running') {
    task.transferredSize = transferredSize
    task.totalSize = totalSize
    task.percent = percent
  }
}

// 完成任务
export const completeTask = (taskId: string): void => {
  const task = state.tasks.find(t => t.id === taskId)
  if (task) {
    task.status = 'completed'
    task.percent = 100
    task.endTime = Date.now()

    // 开始下一个任务
    if (!state.paused && pendingTasks.value.length > 0) {
      startNextTask()
    }
  }
}

// 任务失败
export const failTask = (taskId: string, error: string): void => {
  const task = state.tasks.find(t => t.id === taskId)
  if (task) {
    task.status = 'failed'
    task.error = error
    task.endTime = Date.now()

    // 开始下一个任务
    if (!state.paused && pendingTasks.value.length > 0) {
      startNextTask()
    }
  }
}

// 暂停任务
export const pauseTask = (taskId: string): void => {
  const task = state.tasks.find(t => t.id === taskId)
  if (task && task.status === 'running') {
    task.status = 'paused'
  }
}

// 继续任务
export const resumeTask = (taskId: string): void => {
  const task = state.tasks.find(t => t.id === taskId)
  if (task && task.status === 'paused') {
    task.status = 'pending'

    // 如果有空余并发槽，立即开始
    if (!state.paused && runningTasks.value.length < state.maxConcurrent) {
      startNextTask()
    }
  }
}

// 取消任务
export const cancelTask = (taskId: string): void => {
  const task = state.tasks.find(t => t.id === taskId)
  if (task) {
    task.status = 'cancelled'
    task.endTime = Date.now()
  }
}

// 重试失败任务
export const retryTask = (taskId: string): void => {
  const task = state.tasks.find(t => t.id === taskId)
  if (task && task.status === 'failed') {
    task.status = 'pending'
    task.error = undefined
    task.transferredSize = 0
    task.percent = 0

    // 如果有空余并发槽，立即开始
    if (!state.paused && runningTasks.value.length < state.maxConcurrent) {
      startNextTask()
    }
  }
}

// 删除任务
export const removeTask = (taskId: string): void => {
  const index = state.tasks.findIndex(t => t.id === taskId)
  if (index !== -1) {
    state.tasks.splice(index, 1)
  }
}

// 清除已完成任务
export const clearCompletedTasks = (): void => {
  state.tasks = state.tasks.filter(t => t.status !== 'completed')
}

// 清除所有任务
export const clearAllTasks = (): void => {
  state.tasks = []
}

// 暂停整个队列
export const pauseQueue = (): void => {
  state.paused = true

  // 暂停所有运行中的任务
  runningTasks.value.forEach(t => {
    t.status = 'paused'
  })
}

// 继续整个队列
export const resumeQueue = (): void => {
  state.paused = false

  // 继续所有暂停的任务
  state.tasks.filter(t => t.status === 'paused').forEach(t => {
    t.status = 'pending'
  })

  // 开始任务
  while (runningTasks.value.length < state.maxConcurrent && pendingTasks.value.length > 0) {
    startNextTask()
  }
}

// 获取任务
export const getTask = (taskId: string): TransferTask | undefined => {
  return state.tasks.find(t => t.id === taskId)
}

// 获取任务数量统计
export const getTaskStats = (): {
  total: number
  pending: number
  running: number
  completed: number
  failed: number
  paused: number
} => {
  return {
    total: state.tasks.length,
    pending: pendingTasks.value.length,
    running: runningTasks.value.length,
    completed: completedTasks.value.length,
    failed: failedTasks.value.length,
    paused: state.tasks.filter(t => t.status === 'paused').length
  }
}

// 导出状态
export const queueState = state

export default state