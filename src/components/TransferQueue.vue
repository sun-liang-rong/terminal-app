<template>
  <div class="transfer-queue" :class="{ expanded: expanded }" role="region" aria-label="传输队列">
    <!-- 队列头部 -->
    <div class="queue-header" @click="toggleExpanded">
      <div class="header-info">
        <PhArrowsDownUp class="header-icon" weight="regular" />
        <span class="header-title">传输队列</span>
        <span class="header-count" v-if="hasActiveTasks">{{ activeCount }} 个任务</span>
      </div>

      <div class="header-actions">
        <!-- 总进度 -->
        <div class="total-progress" v-if="hasActiveTasks">
          <div class="progress-bar">
            <div class="progress-fill" :style="{ width: totalProgress + '%' }"></div>
          </div>
          <span class="progress-text">{{ totalProgress }}%</span>
        </div>

        <!-- 队列控制 -->
        <button
          class="action-btn"
          :class="{ active: paused }"
          @click.stop="togglePaused"
          :title="paused ? '继续队列' : '暂停队列'"
          aria-label="暂停/继续队列"
        >
          <PhPause v-if="!paused" weight="regular" />
          <PhPlay v-else weight="regular" />
        </button>

        <button
          class="action-btn"
          @click.stop="clearCompleted"
          :disabled="completedCount === 0"
          title="清除已完成"
          aria-label="清除已完成任务"
        >
          <PhTrash weight="regular" />
        </button>
      </div>
    </div>

    <!-- 队列内容 -->
    <Transition name="expand">
      <div class="queue-body" v-if="expanded">
        <!-- 空队列提示 -->
        <div class="empty-queue" v-if="tasks.length === 0">
          <PhFolderOpen class="empty-icon" weight="regular" />
          <span>暂无传输任务</span>
        </div>

        <!-- 任务列表 -->
        <div class="task-list" v-else>
          <div
            v-for="task in tasks"
            :key="task.id"
            class="task-item"
            :class="{ [task.status]: true }"
          >
            <!-- 任务图标 -->
            <div class="task-icon">
              <PhUpload v-if="task.type === 'upload'" class="icon upload" weight="regular" />
              <PhDownload v-else class="icon download" weight="regular" />
            </div>

            <!-- 任务信息 -->
            <div class="task-info">
              <span class="task-name" :title="task.fileName">{{ task.fileName }}</span>
              <div class="task-progress" v-if="task.status === 'running' || task.status === 'pending'">
                <div class="progress-bar">
                  <div class="progress-fill" :style="{ width: task.percent + '%' }"></div>
                </div>
                <span class="progress-text">{{ task.percent }}%</span>
              </div>
              <span class="task-error" v-if="task.status === 'failed' && task.error">{{ task.error }}</span>
              <span class="task-time" v-if="task.startTime">
                {{ task.status === 'completed' ? '完成于 ' + formatTime(task.endTime) : '开始于 ' + formatTime(task.startTime) }}
              </span>
            </div>

            <!-- 任务状态 -->
            <div class="task-status">
              <PhSpinner v-if="task.status === 'running'" class="status-icon spinning" weight="regular" />
              <PhCheck v-else-if="task.status === 'completed'" class="status-icon completed" weight="regular" />
              <PhWarning v-else-if="task.status === 'failed'" class="status-icon failed" weight="regular" />
              <PhPause v-else-if="task.status === 'paused'" class="status-icon paused" weight="regular" />
              <PhHourglassMedium v-else-if="task.status === 'pending'" class="status-icon pending" weight="regular" />
            </div>

            <!-- 任务操作 -->
            <div class="task-actions">
              <button
                v-if="task.status === 'running'"
                class="task-btn"
                @click="pauseTask(task.id)"
                title="暂停"
              >
                <PhPause weight="regular" />
              </button>
              <button
                v-if="task.status === 'paused'"
                class="task-btn"
                @click="resumeTask(task.id)"
                title="继续"
              >
                <PhPlay weight="regular" />
              </button>
              <button
                v-if="task.status === 'failed'"
                class="task-btn retry"
                @click="retryTask(task.id)"
                title="重试"
              >
                <PhArrowClockwise weight="regular" />
              </button>
              <button
                class="task-btn remove"
                @click="removeTask(task.id)"
                :title="task.status === 'running' ? '取消' : '删除'"
              >
                <PhX weight="regular" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </Transition>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import {
  PhArrowsDownUp, PhPause, PhPlay, PhTrash, PhUpload, PhDownload,
  PhSpinner, PhCheck, PhWarning, PhHourglassMedium, PhX,
  PhArrowClockwise, PhFolderOpen
} from '@phosphor-icons/vue'
import {
  sftpState, toggleQueueExpanded, clearCompletedTasks,
  pauseTask as pauseTaskInStore, resumeTask as resumeTaskInStore,
  retryTask as retryTaskInStore, removeTransferTask
} from '../utils/sftpStore'

// Props
interface Props {
  expanded?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  expanded: false
})

const emit = defineEmits(['toggle-expanded'])

// 状态
const tasks = computed(() => sftpState.transferTasks)
const paused = ref(false)
const hasActiveTasks = computed(() => tasks.value.some(t => t.status === 'running' || t.status === 'pending'))
const activeCount = computed(() => tasks.value.filter(t => t.status === 'running' || t.status === 'pending').length)
const completedCount = computed(() => tasks.value.filter(t => t.status === 'completed').length)
const totalProgress = computed(() => {
  const active = tasks.value.filter(t => t.status === 'running' || t.status === 'completed')
  if (active.length === 0) return 0

  const total = active.reduce((sum, t) => sum + t.percent, 0)
  return Math.round(total / active.length)
})

// 切换展开
const toggleExpanded = () => {
  toggleQueueExpanded()
}

// 切换暂停
const togglePaused = () => {
  paused.value = !paused.value
}

// 清除已完成
const clearCompleted = () => {
  clearCompletedTasks()
}

// 暂停任务
const pauseTask = (id: string) => {
  pauseTaskInStore(id)
}

// 继续任务
const resumeTask = (id: string) => {
  resumeTaskInStore(id)
}

// 删除任务
const removeTask = (id: string) => {
  removeTransferTask(id)
}

// 重试任务
const retryTask = (id: string) => {
  retryTaskInStore(id)
}

// 格式化时间
const formatTime = (timestamp?: number): string => {
  if (!timestamp) return '-'

  const date = new Date(timestamp)
  return date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
}
</script>

<style scoped>
.transfer-queue {
  background: rgba(17, 19, 24, 0.8);
  border: 1px solid rgba(70, 72, 77, 0.15);
  border-radius: var(--radius-lg, 14px);
  overflow: hidden;
  flex-shrink: 0;
}

/* 队列头部 */
.queue-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  cursor: pointer;
  transition: background 0.15s ease;
}

.queue-header:hover {
  background: rgba(29, 32, 37, 0.5);
}

.header-info {
  display: flex;
  align-items: center;
  gap: 8px;
}

.header-icon {
  width: 18px;
  height: 18px;
  color: var(--color-on-surface-variant, #aaabb0);
}

.header-title {
  font-size: 13px;
  font-weight: 600;
  color: var(--color-on-surface, #f6f6fc);
}

.header-count {
  font-size: 12px;
  color: var(--color-secondary, #2db7f2);
  padding: 2px 8px;
  background: rgba(45, 183, 242, 0.1);
  border-radius: 4px;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 12px;
}

/* 总进度 */
.total-progress {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 120px;
}

.progress-bar {
  flex: 1;
  height: 4px;
  background: rgba(70, 72, 77, 0.3);
  border-radius: 2px;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, var(--color-secondary, #2db7f2), var(--color-primary, #b79fff));
  border-radius: 2px;
  transition: width 0.3s ease;
}

.progress-text {
  font-size: 11px;
  font-family: var(--font-mono, 'Fira Code', monospace);
  color: var(--color-on-surface-variant, #aaabb0);
  min-width: 30px;
}

/* 操作按钮 */
.action-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  padding: 0;
  background: transparent;
  border: 1px solid transparent;
  border-radius: 6px;
  color: var(--color-on-surface-variant, #aaabb0);
  cursor: pointer;
  transition: all 0.15s ease;
}

.action-btn:hover:not(:disabled) {
  background: rgba(45, 183, 242, 0.1);
  border-color: rgba(45, 183, 242, 0.2);
  color: var(--color-secondary, #2db7f2);
}

.action-btn.active {
  background: rgba(255, 110, 132, 0.15);
  border-color: rgba(255, 110, 132, 0.3);
  color: var(--color-error, #ff6e84);
}

.action-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

/* 队列内容 */
.queue-body {
  padding: 8px;
  max-height: 200px;
  overflow-y: auto;
}

.queue-body::-webkit-scrollbar {
  width: 6px;
}

.queue-body::-webkit-scrollbar-thumb {
  background: rgba(70, 72, 77, 0.3);
  border-radius: 3px;
}

/* 空队列 */
.empty-queue {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 20px;
  color: var(--color-on-surface-variant, #aaabb0);
}

.empty-icon {
  width: 32px;
  height: 32px;
  opacity: 0.5;
}

/* 任务列表 */
.task-list {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

/* 任务项 */
.task-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 12px;
  background: rgba(29, 32, 37, 0.5);
  border-radius: 8px;
  transition: background 0.15s ease;
}

.task-item:hover {
  background: rgba(29, 32, 37, 0.8);
}

.task-item.completed {
  opacity: 0.7;
}

.task-item.failed {
  background: rgba(255, 110, 132, 0.05);
}

/* 任务图标 */
.task-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  border-radius: 4px;
}

.task-icon .icon {
  width: 16px;
  height: 16px;
}

.task-icon .upload {
  color: var(--color-primary, #b79fff);
}

.task-icon .download {
  color: var(--color-secondary, #2db7f2);
}

/* 任务信息 */
.task-info {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.task-name {
  font-size: 12px;
  color: var(--color-on-surface, #f6f6fc);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.task-progress {
  display: flex;
  align-items: center;
  gap: 8px;
}

.task-progress .progress-bar {
  flex: 1;
  height: 3px;
  background: rgba(70, 72, 77, 0.3);
  border-radius: 2px;
  overflow: hidden;
}

.task-progress .progress-fill {
  height: 100%;
  background: var(--color-secondary, #2db7f2);
  border-radius: 2px;
  transition: width 0.3s ease;
}

.task-progress .progress-text {
  font-size: 10px;
  font-family: var(--font-mono, 'Fira Code', monospace);
  color: var(--color-on-surface-variant, #aaabb0);
  min-width: 28px;
}

.task-error {
  font-size: 11px;
  color: var(--color-error, #ff6e84);
}

.task-time {
  font-size: 10px;
  color: var(--color-outline-variant, #46484d);
}

/* 任务状态图标 */
.task-status {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
}

.status-icon {
  width: 16px;
  height: 16px;
}

.status-icon.spinning {
  animation: spin 1s linear infinite;
}

.status-icon.completed {
  color: var(--color-success, #34d399);
}

.status-icon.failed {
  color: var(--color-error, #ff6e84);
}

.status-icon.paused {
  color: var(--color-warning, #fbbf24);
}

.status-icon.pending {
  color: var(--color-on-surface-variant, #aaabb0);
  opacity: 0.6;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

/* 任务操作按钮 */
.task-actions {
  display: flex;
  align-items: center;
  gap: 4px;
}

.task-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  padding: 0;
  background: transparent;
  border: 1px solid transparent;
  border-radius: 4px;
  color: var(--color-on-surface-variant, #aaabb0);
  cursor: pointer;
  transition: all 0.15s ease;
}

.task-btn:hover {
  background: rgba(45, 183, 242, 0.1);
  color: var(--color-secondary, #2db7f2);
}

.task-btn.retry:hover {
  background: rgba(255, 134, 195, 0.1);
  color: var(--color-tertiary, #ff86c3);
}

.task-btn.remove:hover {
  background: rgba(255, 110, 132, 0.1);
  color: var(--color-error, #ff6e84);
}

/* 展开过渡 */
.expand-enter-active,
.expand-leave-active {
  transition: all 0.3s ease;
}

.expand-enter-from,
.expand-leave-to {
  opacity: 0;
  max-height: 0;
}
</style>