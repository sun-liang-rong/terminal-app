<template>
  <div class="local-file-browser" role="region" aria-label="本地文件浏览器">
    <!-- 工具栏 -->
    <div class="browser-toolbar">
      <button class="toolbar-btn" @click="refresh" title="刷新" aria-label="刷新">
        <PhArrowClockwise class="toolbar-icon" weight="regular" />
      </button>
      <button class="toolbar-btn" @click="goParent" :disabled="!canGoParent" title="上级目录" aria-label="上级目录">
        <PhArrowUp class="toolbar-icon" weight="regular" />
      </button>
      <button class="toolbar-btn" @click="openNewDirDialog" title="新建目录" aria-label="新建目录">
        <PhFolderPlus class="toolbar-icon" weight="regular" />
      </button>
      <button class="toolbar-btn" @click="openUploadDialog" :disabled="!selectedFiles.length" title="上传选中文件" aria-label="上传选中文件">
        <PhUpload class="toolbar-icon" weight="regular" />
      </button>
    </div>

    <!-- 路径导航 -->
    <PathBreadcrumb
      :path="currentPath"
      type="local"
      home-label="主目录"
      @navigate="navigateTo"
    />

    <!-- 文件列表 -->
    <div
      class="file-list"
      role="list"
      aria-label="文件列表"
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
        :key="file.path"
        :file="file"
        :selected="selectedFiles.has(file.path)"
        :draggable="true"
        source-type="local"
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
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted, nextTick } from 'vue'
import {
  PhArrowClockwise, PhArrowUp, PhFolderPlus, PhUpload,
  PhSpinner, PhWarning, PhFolder, PhX, PhTrash, PhPencil, PhArrowRight
} from '@phosphor-icons/vue'
import PathBreadcrumb from './PathBreadcrumb.vue'
import FileListItem from './FileListItem.vue'
import { sftpState, loadLocalFiles, enterLocalDir, goLocalParent, toggleLocalSelection, selectLocalFile, clearLocalSelection, startUpload } from '../utils/sftpStore'
import { joinPath } from '../utils/fileUtils'
import { toast } from '../utils/notification'
import type { LocalFileItem } from '../types/electron'

const emit = defineEmits(['upload', 'drop-receive'])

// 状态
const loading = computed(() => sftpState.localLoading)
const error = computed(() => sftpState.localError)
const files = computed(() => sftpState.localFiles)
const currentPath = computed(() => sftpState.localPath)
const selectedFiles = computed(() => sftpState.selectedLocalFiles)

// 是否可以返回上级
const canGoParent = computed(() => {
  if (!currentPath.value) return false
  // Windows 根目录 (C:\ 等) 不能返回上级
  if (currentPath.value.match(/^[A-Za-z]:\\$/)) return false
  // Unix 根目录
  if (currentPath.value === '/' || currentPath.value === '') return false
  return true
})

// 新建目录对话框
const showNewDirDialog = ref(false)
const newDirName = ref('')
const newDirInputRef = ref<HTMLInputElement | null>(null)

// 右键菜单
const contextMenuVisible = ref(false)
const contextMenuStyle = ref({ top: '0px', left: '0px' })
const contextFile = ref<LocalFileItem | null>(null)

// 拖拽状态
const dragActive = ref(false)

// 刷新
const refresh = () => {
  loadLocalFiles()
}

// 返回上级
const goParent = () => {
  goLocalParent()
}

// 导航到指定路径
const navigateTo = (path: string) => {
  loadLocalFiles(path)
}

// 进入目录
const enterDir = (file: LocalFileItem) => {
  if (file.type === 'directory') {
    enterLocalDir(file.name)
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
  if (!newDirName.value) return

  const newPath = joinPath(currentPath.value, newDirName.value)
  const result = await window.electronAPI.localMkdir(newPath)

  if (result.success) {
    toast.success('目录已创建')
    showNewDirDialog.value = false
    refresh()
  } else {
    toast.error('创建失败: ' + result.error)
  }
}

// 打开上传对话框
const openUploadDialog = () => {
  if (selectedFiles.value.size === 0) return
  emit('upload', Array.from(selectedFiles.value))
}

// 文件点击
const handleFileClick = (file: LocalFileItem, event: MouseEvent) => {
  // Ctrl+点击: 多选切换
  if (event.ctrlKey || event.metaKey) {
    toggleLocalSelection(file.path)
  } else {
    // 普通点击: 单选
    selectLocalFile(file.path)
  }
}

// 文件双击
const handleFileDoubleClick = (file: LocalFileItem, _event: MouseEvent) => {
  if (file.type === 'directory') {
    enterDir(file)
  } else {
    // 文件: 准备上传
    selectLocalFile(file.path)
    emit('upload', [file.path])
  }
}

// 右键菜单
const handleContextMenu = (file: LocalFileItem, event: MouseEvent) => {
  contextFile.value = file
  contextMenuStyle.value = {
    top: `${event.clientY}px`,
    left: `${event.clientX}px`
  }
  contextMenuVisible.value = true
}

// 删除文件
const handleDelete = async () => {
  if (!contextFile.value) return

  const result = await window.electronAPI.localDelete(contextFile.value.path)

  if (result.success) {
    toast.success('已删除')
    contextMenuVisible.value = false
    refresh()
  } else {
    toast.error('删除失败: ' + result.error)
  }
}

// 重命名 (暂时简化，直接删除重建)
const handleRename = () => {
  toast.info('重命名功能开发中')
  contextMenuVisible.value = false
}

// 拖拽开始
const handleDragStart = (file: LocalFileItem) => {
  // 自动选中拖拽的文件
  clearLocalSelection()
  toggleLocalSelection(file.path)
}

// 拖拽悬停
const handleDragOver = (e: DragEvent) => {
  // 检查是否来自远程浏览器
  const data = e.dataTransfer?.getData('application/json')
  if (data) {
    try {
      const parsed = JSON.parse(data)
      if (parsed.sourceType === 'remote') {
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

// 拖放接收 (从远程下载)
const handleDrop = (e: DragEvent) => {
  dragActive.value = false

  const data = e.dataTransfer?.getData('application/json')
  if (!data) return

  try {
    const parsed = JSON.parse(data)
    if (parsed.sourceType === 'remote' && parsed.file) {
      // 发出下载请求
      emit('drop-receive', {
        file: parsed.file,
        targetPath: currentPath.value
      })
    }
  } catch {}
}

// 拖放到目录上
const handleDropOnDir = (dir: LocalFileItem) => {
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

onMounted(() => {
  document.addEventListener('click', handleClickOutside)
})

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside)
})
</script>

<style scoped>
.local-file-browser {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: var(--color-bg-surface, #111318);
  border-radius: var(--radius-lg, 14px);
  overflow: hidden;
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
  background: rgba(45, 183, 242, 0.05);
  border: 2px dashed rgba(45, 183, 242, 0.3);
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