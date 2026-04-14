<template>
  <div class="remote-file-browser" role="region" aria-label="远程文件浏览器">
    <!-- 连接状态指示 -->
    <div class="connection-status" v-if="!sshConnected">
      <PhPlug class="status-icon disconnected" weight="regular" />
      <span class="status-text">未连接 SSH</span>
      <span class="status-hint">请先连接 SSH 主机</span>
    </div>

    <!-- 工具栏 -->
    <div class="browser-toolbar" v-if="sshConnected">
      <button class="toolbar-btn" @click="refresh" title="刷新" aria-label="刷新">
        <PhArrowClockwise class="toolbar-icon" weight="regular" />
      </button>
      <button class="toolbar-btn" @click="goParent" :disabled="!canGoParent" title="上级目录" aria-label="上级目录">
        <PhArrowUp class="toolbar-icon" weight="regular" />
      </button>
      <button class="toolbar-btn" @click="openNewDirDialog" title="新建目录" aria-label="新建目录">
        <PhFolderPlus class="toolbar-icon" weight="regular" />
      </button>
      <button class="toolbar-btn" @click="startDownloadSelected" :disabled="!selectedFiles.length" title="下载选中文件" aria-label="下载选中文件">
        <PhDownload class="toolbar-icon" weight="regular" />
      </button>
    </div>

    <!-- 路径导航 -->
    <PathBreadcrumb
      v-if="sshConnected"
      :path="currentPath"
      type="remote"
      home-label="根目录"
      @navigate="navigateTo"
    />

    <!-- 文件列表 -->
    <div
      class="file-list"
      v-if="sshConnected"
      role="list"
      aria-label="远程文件列表"
      @dragover.prevent="handleDragOver"
      @dragleave="handleDragLeave"
      @drop.prevent="handleDrop"
      :class="{ 'drag-active': dragActive }"
    >
      <!-- 加载状态 -->
      <div class="loading-state" v-if="loading">
        <PhSpinner class="loading-icon" weight="regular" />
        <span>加载中...</span>
      </div>

      <!-- 错误状态 -->
      <div class="error-state" v-else-if="error">
        <PhWarning class="error-icon" weight="regular" />
        <span>{{ error }}</span>
        <button class="retry-btn" @click="refresh">重试</button>
      </div>

      <!-- 空目录 -->
      <div class="empty-state" v-else-if="files.length === 0">
        <PhFolder class="empty-icon" weight="regular" />
        <span>目录为空</span>
      </div>

      <!-- 文件列表 -->
      <FileListItem
        v-for="file in files"
        :key="file.name"
        :file="file"
        :selected="selectedFiles.has(file.name)"
        :draggable="true"
        source-type="remote"
        @click="handleFileClick(file, $event)"
        @double-click="handleFileDoubleClick(file, $event)"
        @context-menu="handleContextMenu(file, $event)"
        @drag-start="handleDragStart"
        @drop="handleDropOnDir"
      />
    </div>

    <!-- 新建目录对话框 -->
    <div class="dialog-overlay" v-if="showNewDirDialog" @click.self="showNewDirDialog = false">
      <div class="dialog-content">
        <div class="dialog-header">
          <h3>新建目录</h3>
          <button class="close-btn" @click="showNewDirDialog = false">
            <PhX weight="regular" />
          </button>
        </div>
        <div class="dialog-body">
          <input
            type="text"
            v-model="newDirName"
            placeholder="目录名称"
            @keydown.enter="createDir"
            ref="newDirInputRef"
          />
        </div>
        <div class="dialog-footer">
          <button class="btn secondary" @click="showNewDirDialog = false">取消</button>
          <button class="btn primary" @click="createDir" :disabled="!newDirName">创建</button>
        </div>
      </div>
    </div>

    <!-- 右键菜单 -->
    <div class="context-menu" v-if="contextMenuVisible" :style="contextMenuStyle">
      <button class="menu-item" @click="handleDelete">
        <PhTrash class="menu-icon" weight="regular" />
        <span>删除</span>
      </button>
      <button class="menu-item" @click="handleRename">
        <PhPencil class="menu-icon" weight="regular" />
        <span>重命名</span>
      </button>
      <button class="menu-item" v-if="contextFile?.type === 'directory'" @click="enterDir(contextFile)">
        <PhArrowRight class="menu-icon" weight="regular" />
        <span>进入目录</span>
      </button>
      <button class="menu-item" v-if="contextFile?.type === 'file'" @click="handleDownload">
        <PhDownload class="menu-icon" weight="regular" />
        <span>下载</span>
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted, nextTick } from 'vue'
import {
  PhArrowClockwise, PhArrowUp, PhFolderPlus, PhDownload,
  PhSpinner, PhWarning, PhFolder, PhX, PhTrash, PhPencil, PhArrowRight,
  PhPlug
} from '@phosphor-icons/vue'
import PathBreadcrumb from './PathBreadcrumb.vue'
import FileListItem from './FileListItem.vue'
import {
  sftpState, loadRemoteFiles, enterRemoteDir, goRemoteParent,
  toggleRemoteSelection, selectRemoteFile, clearRemoteSelection, startDownload
} from '../utils/sftpStore'
import { joinPath } from '../utils/fileUtils'
import { toast } from '../utils/notification'
import type { SftpItem } from '../types/electron'

const emit = defineEmits(['download', 'drop-receive'])

// SSH 连接状态
const sshConnected = computed(() => sftpState.sshConnected)
const sshId = computed(() => sftpState.sshId)

// 文件列表状态
const loading = computed(() => sftpState.remoteLoading)
const error = computed(() => sftpState.remoteError)
const files = computed(() => sftpState.remoteFiles)
const currentPath = computed(() => sftpState.remotePath)
const selectedFiles = computed(() => sftpState.selectedRemoteFiles)

// 是否可以返回上级
const canGoParent = computed(() => {
  return currentPath.value && currentPath.value !== '/'
})

// 新建目录对话框
const showNewDirDialog = ref(false)
const newDirName = ref('')
const newDirInputRef = ref<HTMLInputElement | null>(null)

// 右键菜单
const contextMenuVisible = ref(false)
const contextMenuStyle = ref({ top: '0px', left: '0px' })
const contextFile = ref<SftpItem | null>(null)

// 拖拽状态
const dragActive = ref(false)

// 刷新
const refresh = () => {
  if (!sshConnected.value) return
  loadRemoteFiles()
}

// 返回上级
const goParent = () => {
  goRemoteParent()
}

// 导航到指定路径
const navigateTo = (path: string) => {
  loadRemoteFiles(path)
}

// 进入目录
const enterDir = (file: SftpItem) => {
  if (file.type === 'directory') {
    enterRemoteDir(file.name)
  }
}

// 打开新建目录对话框
const openNewDirDialog = async () => {
  showNewDirDialog.value = true
  newDirName.value = ''
  await nextTick()
  newDirInputRef.value?.focus()
}

// 创建目录
const createDir = async () => {
  if (!newDirName.value || !sshId.value) return

  const newPath = joinPath(currentPath.value, newDirName.value)
  const result = await window.electronAPI.sftpMkdir({
    sshId: sshId.value,
    path: newPath
  })

  if (result.success) {
    toast.success('目录已创建')
    showNewDirDialog.value = false
    refresh()
  } else {
    toast.error('创建失败: ' + result.error)
  }
}

// 开始下载选中文件
const startDownloadSelected = () => {
  if (selectedFiles.value.size === 0) return
  emit('download', Array.from(selectedFiles.value))
}

// 文件点击
const handleFileClick = (file: SftpItem, event: MouseEvent) => {
  // Ctrl+点击: 多选切换
  if (event.ctrlKey || event.metaKey) {
    toggleRemoteSelection(file.name)
  } else {
    // 普通点击: 单选
    selectRemoteFile(file.name)
  }
}

// 文件双击
const handleFileDoubleClick = (file: SftpItem, _event: MouseEvent) => {
  if (file.type === 'directory') {
    enterDir(file)
  } else {
    // 文件: 准备下载
    selectRemoteFile(file.name)
    emit('download', [file.name])
  }
}

// 右键菜单
const handleContextMenu = (file: SftpItem, event: MouseEvent) => {
  contextFile.value = file
  contextMenuStyle.value = {
    top: `${event.clientY}px`,
    left: `${event.clientX}px`
  }
  contextMenuVisible.value = true
}

// 删除文件
const handleDelete = async () => {
  if (!contextFile.value || !sshId.value) return

  const filePath = joinPath(currentPath.value, contextFile.value.name)
  const result = contextFile.value.type === 'directory'
    ? await window.electronAPI.sftpRmdir({ sshId: sshId.value, path: filePath })
    : await window.electronAPI.sftpDelete({ sshId: sshId.value, path: filePath })

  if (result.success) {
    toast.success('已删除')
    contextMenuVisible.value = false
    refresh()
  } else {
    toast.error('删除失败: ' + result.error)
  }
}

// 重命名
const handleRename = () => {
  toast.info('重命名功能开发中')
  contextMenuVisible.value = false
}

// 下载文件
const handleDownload = () => {
  if (!contextFile.value) return
  emit('download', [contextFile.value.name])
}

// 拖拽开始
const handleDragStart = (file: SftpItem) => {
  // 自动选中拖拽的文件
  clearRemoteSelection()
  toggleRemoteSelection(file.name)
}

// 拖拽悬停
const handleDragOver = (e: DragEvent) => {
  // 检查是否来自本地浏览器
  const data = e.dataTransfer?.getData('application/json')
  if (data) {
    try {
      const parsed = JSON.parse(data)
      if (parsed.sourceType === 'local') {
        dragActive.value = true
        if (e.dataTransfer) {
          e.dataTransfer.dropEffect = 'copy'
        }
      }
    } catch {}
  }
}

// 拖拽离开
const handleDragLeave = () => {
  dragActive.value = false
}

// 拖放接收 (从本地上传)
const handleDrop = (e: DragEvent) => {
  dragActive.value = false

  const data = e.dataTransfer?.getData('application/json')
  if (!data) return

  try {
    const parsed = JSON.parse(data)
    if (parsed.sourceType === 'local' && parsed.file) {
      // 发出上传请求
      emit('drop-receive', {
        file: parsed.file,
        targetPath: currentPath.value
      })
    }
  } catch {}
}

// 拖放到目录上
const handleDropOnDir = (dir: SftpItem) => {
  // 目录接收拖放，进入目录后处理
  enterDir(dir)
}

// 关闭右键菜单
const closeContextMenu = () => {
  contextMenuVisible.value = false
  contextFile.value = null
}

// 点击外部关闭右键菜单
const handleClickOutside = (e: MouseEvent) => {
  if (contextMenuVisible.value) {
    closeContextMenu()
  }
}

// 监听 SSH 连接状态，连接后自动加载
watch(sshConnected, (connected) => {
  if (connected) {
    refresh()
  }
})

onMounted(() => {
  document.addEventListener('click', handleClickOutside)
})

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside)
})
</script>

<style scoped>
.remote-file-browser {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: var(--color-bg-surface, #111318);
  border-radius: var(--radius-lg, 14px);
  overflow: hidden;
}

/* 连接状态 */
.connection-status {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 60px 20px;
  color: var(--color-on-surface-variant, #aaabb0);
}

.status-icon {
  width: 48px;
  height: 48px;
}

.status-icon.disconnected {
  color: var(--color-error, #ff6e84);
  opacity: 0.6;
}

.status-text {
  font-size: 16px;
  font-weight: 600;
  color: var(--color-on-surface, #f6f6fc);
}

.status-hint {
  font-size: 13px;
  color: var(--color-on-surface-variant, #aaabb0);
}

/* 工具栏 */
.browser-toolbar {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 8px 12px;
  background: rgba(29, 32, 37, 0.5);
  border-bottom: 1px solid rgba(70, 72, 77, 0.1);
}

.toolbar-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  padding: 0;
  background: transparent;
  border: 1px solid transparent;
  border-radius: 6px;
  color: var(--color-on-surface-variant, #aaabb0);
  cursor: pointer;
  transition: all 0.15s ease;
}

.toolbar-btn:hover:not(:disabled) {
  background: rgba(45, 183, 242, 0.1);
  border-color: rgba(45, 183, 242, 0.2);
  color: var(--color-secondary, #2db7f2);
}

.toolbar-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.toolbar-icon {
  width: 18px;
  height: 18px;
}

/* 文件列表 */
.file-list {
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden;
  padding: 8px;
}

.file-list::-webkit-scrollbar {
  width: 6px;
}

.file-list::-webkit-scrollbar-track {
  background: transparent;
}

.file-list::-webkit-scrollbar-thumb {
  background: rgba(70, 72, 77, 0.3);
  border-radius: 3px;
}

.file-list.drag-active {
  background: rgba(183, 159, 255, 0.05);
  border: 2px dashed rgba(183, 159, 255, 0.3);
}

/* 状态提示 */
.loading-state,
.error-state,
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 40px 20px;
  color: var(--color-on-surface-variant, #aaabb0);
}

.loading-icon {
  width: 24px;
  height: 24px;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.error-icon,
.empty-icon {
  width: 32px;
  height: 32px;
  opacity: 0.6;
}

.error-state {
  color: var(--color-error, #ff6e84);
}

.retry-btn {
  padding: 8px 16px;
  background: rgba(255, 110, 132, 0.1);
  border: 1px solid rgba(255, 110, 132, 0.2);
  border-radius: 6px;
  color: var(--color-error, #ff6e84);
  cursor: pointer;
  font-size: 12px;
}

.retry-btn:hover {
  background: rgba(255, 110, 132, 0.2);
}

/* 对话框 */
.dialog-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 100;
}

.dialog-content {
  width: 300px;
  background: var(--color-bg-surface, #1c1f26);
  border: 1px solid rgba(70, 72, 77, 0.2);
  border-radius: var(--radius-lg, 14px);
  overflow: hidden;
}

.dialog-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px;
  border-bottom: 1px solid rgba(70, 72, 77, 0.1);
}

.dialog-header h3 {
  font-size: 14px;
  font-weight: 600;
  color: var(--color-on-surface, #f6f6fc);
}

.close-btn {
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: transparent;
  border: none;
  color: var(--color-on-surface-variant, #aaabb0);
  cursor: pointer;
}

.dialog-body {
  padding: 16px;
}

.dialog-body input {
  width: 100%;
  padding: 10px 12px;
  background: rgba(29, 32, 37, 0.6);
  border: 1px solid rgba(70, 72, 77, 0.2);
  border-radius: 8px;
  color: var(--color-on-surface, #f6f6fc);
  font-size: 13px;
  outline: none;
}

.dialog-body input:focus {
  border-color: var(--color-secondary, #2db7f2);
}

.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  padding: 16px;
  border-top: 1px solid rgba(70, 72, 77, 0.1);
}

.btn {
  padding: 8px 16px;
  border-radius: 8px;
  font-size: 13px;
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

/* 右键菜单 */
.context-menu {
  position: fixed;
  background: var(--color-bg-surface, #1c1f26);
  border: 1px solid rgba(70, 72, 77, 0.2);
  border-radius: 8px;
  padding: 4px;
  z-index: 200;
  min-width: 140px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
}

.menu-item {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  padding: 8px 12px;
  background: transparent;
  border: none;
  border-radius: 6px;
  color: var(--color-on-surface-variant, #aaabb0);
  font-size: 13px;
  cursor: pointer;
  transition: all 0.15s ease;
}

.menu-item:hover {
  background: rgba(45, 183, 242, 0.1);
  color: var(--color-secondary, #2db7f2);
}

.menu-icon {
  width: 16px;
  height: 16px;
}
</style>