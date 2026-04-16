<template>
  <div class="sftp-panel" role="region" aria-label="SFTP 文件管理">
    <!-- 主面板头部 -->
    <div class="panel-header">
      <div class="header-title">
        <PhFolderOpen class="title-icon" weight="regular" />
        <h2>SFTP 文件管理</h2>
      </div>

      <div class="header-actions">
        <!-- SSH 连接状态 -->
        <div class="connection-indicator" :class="{ connected: sshConnected }">
          <PhPlug class="indicator-icon" weight="regular" />
          <span>{{ sshConnected ? '已连接' : '未连接' }}</span>
        </div>

        <!-- 刷新按钮 -->
        <button class="header-btn" @click="refreshAll" title="刷新">
          <PhArrowClockwise weight="regular" />
        </button>

        <!-- 新建目录 -->
        <button class="header-btn" @click="showNewDirDialog = true" :disabled="!sshConnected" title="新建目录">
          <PhFolderPlus weight="regular" />
        </button>
      </div>
    </div>

    <!-- 双栏文件浏览器 -->
    <div class="browsers-container">
      <!-- 本地文件浏览器 -->
      <div class="browser-wrapper local">
        <div class="browser-label">
          <PhHardDrive class="label-icon" weight="regular" />
          <span>本地</span>
        </div>
        <LocalFileBrowser
          @upload="handleUploadRequest"
          @drop-receive="handleLocalDropReceive"
        />
      </div>

      <!-- 远程文件浏览器 -->
      <div class="browser-wrapper remote">
        <div class="browser-label">
          <PhCloud class="label-icon" weight="regular" />
          <span>远程</span>
        </div>
        <RemoteFileBrowser
          @download="handleDownloadRequest"
          @drop-receive="handleRemoteDropReceive"
        />
      </div>
    </div>

    <!-- 传输队列 -->
    <TransferQueue
      :expanded="queueExpanded"
      @toggle-expanded="toggleQueueExpanded"
    />

    <!-- 新建目录对话框 (远程) -->
    <div class="dialog-overlay" v-if="showNewDirDialog" @click.self="showNewDirDialog = false">
      <div class="dialog-content">
        <div class="dialog-header">
          <h3>新建远程目录</h3>
          <button class="close-btn" @click="showNewDirDialog = false">
            <PhX weight="regular" />
          </button>
        </div>
        <div class="dialog-body">
          <input
            type="text"
            v-model="newDirName"
            placeholder="目录名称"
            @keydown.enter="createRemoteDir"
            ref="newDirInputRef"
          />
        </div>
        <div class="dialog-footer">
          <button class="btn secondary" @click="showNewDirDialog = false">取消</button>
          <button class="btn primary" @click="createRemoteDir" :disabled="!newDirName">创建</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, nextTick, watch } from 'vue'
import {
  PhFolderOpen, PhPlug, PhArrowClockwise, PhFolderPlus,
  PhHardDrive, PhCloud, PhX
} from '@phosphor-icons/vue'
import LocalFileBrowser from './LocalFileBrowser.vue'
import RemoteFileBrowser from './RemoteFileBrowser.vue'
import TransferQueue from './TransferQueue.vue'
import {
  sftpState, initLocalPath, refreshAll as refreshAllSftp, toggleQueueExpanded as toggleQueueExpandedSftp,
  startUpload, startDownload, loadRemoteFiles
} from '../utils/sftpStore'
import { setupProgressListener, removeProgressListener } from '../utils/sftpStore'
import { joinPath } from '../utils/fileUtils'
import { toast } from '../utils/notification'
import type { LocalFileItem, SftpItem } from '../types/electron'

// Props
interface Props {
  sshId?: string | undefined
}

const props = defineProps<Props>()

// 状态
const sshConnected = computed(() => sftpState.sshConnected)
const queueExpanded = computed(() => sftpState.queueExpanded)

// 新建目录对话框
const showNewDirDialog = ref(false)
const newDirName = ref('')
const newDirInputRef = ref<HTMLInputElement | null>(null)

// 初始化
onMounted(async () => {
  await initLocalPath()
  setupProgressListener()

  // 如果已有 SSH 连接，设置它
  if (props.sshId) {
    sftpState.sshId = props.sshId
    sftpState.sshConnected = true
    loadRemoteFiles('/')
  }
})

onUnmounted(() => {
  removeProgressListener()
})

// // 刷新所有
const refreshAll = () => {
  refreshAllSftp()
}

// 切换队列展开
const toggleQueueExpanded = () => {
  toggleQueueExpandedSftp()
}

// 处理上传请求
const handleUploadRequest = async (paths: string[]) => {
  if (!sshConnected.value) {
    toast.warning('请先连接 SSH')
    return
  }

  for (const localPath of paths) {
    const fileName = localPath.split(/[/\\]/).pop() || ''
    const remotePath = joinPath(sftpState.remotePath, fileName)

    startUpload(localPath, remotePath)
  }
}

// 处理下载请求
const handleDownloadRequest = async (fileNames: string[]) => {
  if (!sshConnected.value) {
    toast.warning('请先连接 SSH')
    return
  }

  for (const fileName of fileNames) {
    const remotePath = joinPath(sftpState.remotePath, fileName)
    const localPath = joinPath(sftpState.localPath, fileName)

    startDownload(remotePath, localPath)
  }
}

// 处理本地浏览器接收拖放 (从远程下载)
const handleLocalDropReceive = (data: { file: SftpItem; targetPath: string }) => {
  if (!sshConnected.value) return

  const remotePath = joinPath(sftpState.remotePath, data.file.name)
  const localPath = joinPath(data.targetPath, data.file.name)

  startDownload(remotePath, localPath)
}

// 处理远程浏览器接收拖放 (从本地上传)
const handleRemoteDropReceive = (data: { file: LocalFileItem; targetPath: string }) => {
  if (!sshConnected.value) return

  const remotePath = joinPath(data.targetPath, data.file.name)

  startUpload(data.file.path, remotePath)
}

// 创建远程目录
const createRemoteDir = async () => {
  if (!newDirName.value || !sftpState.sshId) return

  const newPath = joinPath(sftpState.remotePath, newDirName.value)
  const result = await window.electronAPI.sftpMkdir({
    sshId: sftpState.sshId,
    path: newPath
  })

  if (result.success) {
    toast.success('目录已创建')
    showNewDirDialog.value = false
    loadRemoteFiles()
  } else {
    toast.error('创建失败: ' + result.error)
  }
}

// 监听新建目录对话框打开
watch(showNewDirDialog, async (show) => {
  if (show) {
    newDirName.value = ''
    await nextTick()
    newDirInputRef.value?.focus()
  }
})
</script>

<style scoped>
.sftp-panel {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: var(--color-bg-base, #0c0e12);
  color: var(--color-on-surface, #f6f6fc);
  gap: 16px;
  padding: 16px;
  overflow: hidden;
}

/* 主面板头部 */
.panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  background: rgba(17, 19, 24, 0.6);
  border: 1px solid rgba(70, 72, 77, 0.15);
  border-radius: var(--radius-lg, 14px);
  flex-shrink: 0;
}

.header-title {
  display: flex;
  align-items: center;
  gap: 12px;
}

.title-icon {
  width: 24px;
  height: 24px;
  color: var(--color-primary, #b79fff);
}

.header-title h2 {
  font-size: 16px;
  font-weight: 700;
  color: var(--color-on-surface, #f6f6fc);
  letter-spacing: -0.3px;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 12px;
}

/* 连接状态指示 */
.connection-indicator {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  background: rgba(255, 110, 132, 0.1);
  border: 1px solid rgba(255, 110, 132, 0.2);
  border-radius: 8px;
  color: var(--color-error, #ff6e84);
  font-size: 12px;
  font-weight: 500;
}

.connection-indicator.connected {
  background: rgba(45, 183, 242, 0.1);
  border-color: rgba(45, 183, 242, 0.2);
  color: var(--color-secondary, #2db7f2);
}

.indicator-icon {
  width: 16px;
  height: 16px;
}

/* 头部按钮 */
.header-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  padding: 0;
  background: rgba(29, 32, 37, 0.5);
  border: 1px solid rgba(70, 72, 77, 0.2);
  border-radius: 8px;
  color: var(--color-on-surface-variant, #aaabb0);
  cursor: pointer;
  transition: all 0.15s ease;
}

.header-btn:hover:not(:disabled) {
  background: rgba(45, 183, 242, 0.1);
  border-color: rgba(45, 183, 242, 0.3);
  color: var(--color-secondary, #2db7f2);
}

.header-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

/* 双栏浏览器 */
.browsers-container {
  display: flex;
  gap: 16px;
  flex: 1;
  min-height: 0;
}

.browser-wrapper {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 8px;
  min-width: 0;
  overflow: hidden;
}

.browser-label {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  background: rgba(29, 32, 37, 0.5);
  border-radius: 8px;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.15em;
  color: var(--color-on-surface-variant, #aaabb0);
  text-transform: uppercase;
}

.browser-wrapper.local .browser-label {
  color: var(--color-tertiary, #ff86c3);
}

.browser-wrapper.remote .browser-label {
  color: var(--color-primary, #b79fff);
}

.label-icon {
  width: 16px;
  height: 16px;
}

/* 对话框 */
.dialog-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.75);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  backdrop-filter: blur(8px);
}

.dialog-content {
  width: 320px;
  background: var(--color-bg-surface, #1c1f26);
  border: 1px solid rgba(70, 72, 77, 0.2);
  border-radius: var(--radius-xl, 20px);
  overflow: hidden;
  box-shadow: 0 16px 48px rgba(0, 0, 0, 0.4);
}

.dialog-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  border-bottom: 1px solid rgba(70, 72, 77, 0.1);
}

.dialog-header h3 {
  font-size: 15px;
  font-weight: 600;
  color: var(--color-on-surface, #f6f6fc);
}

.close-btn {
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: transparent;
  border: 1px solid transparent;
  border-radius: 8px;
  color: var(--color-on-surface-variant, #aaabb0);
  cursor: pointer;
  transition: all 0.15s ease;
}

.close-btn:hover {
  background: rgba(255, 110, 132, 0.1);
  border-color: rgba(255, 110, 132, 0.2);
  color: var(--color-error, #ff6e84);
}

.dialog-body {
  padding: 20px;
}

.dialog-body input {
  width: 100%;
  padding: 12px 14px;
  background: rgba(29, 32, 37, 0.6);
  border: 1px solid rgba(70, 72, 77, 0.2);
  border-radius: 10px;
  color: var(--color-on-surface, #f6f6fc);
  font-size: 14px;
  outline: none;
  transition: border-color 0.15s ease;
}

.dialog-body input:focus {
  border-color: var(--color-secondary, #2db7f2);
  box-shadow: 0 0 0 2px rgba(45, 183, 242, 0.15);
}

.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  padding: 16px 20px;
  border-top: 1px solid rgba(70, 72, 77, 0.1);
}

.btn {
  padding: 10px 20px;
  border-radius: 10px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.15s ease;
}

.btn.secondary {
  background: transparent;
  border: 1px solid rgba(70, 72, 77, 0.3);
  color: var(--color-on-surface-variant, #aaabb0);
}

.btn.secondary:hover {
  background: rgba(29, 32, 37, 0.6);
}

.btn.primary {
  background: rgba(45, 183, 242, 0.15);
  border: 1px solid rgba(45, 183, 242, 0.3);
  color: var(--color-secondary, #2db7f2);
}

.btn.primary:hover:not(:disabled) {
  background: rgba(45, 183, 242, 0.25);
}

.btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}
</style>