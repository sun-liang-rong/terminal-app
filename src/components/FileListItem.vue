<template>
  <div
    class="file-item"
    :class="{
      selected: selected,
      directory: file.type === 'directory',
      hidden: file.isHidden,
      'drag-over': dragOver
    }"
    role="listitem"
    :aria-label="`${file.name}, ${file.type === 'directory' ? '目录' : '文件'}, ${fileSize}`"
    :aria-selected="selected"
    @click="handleClick($event)"
    @dblclick="handleDoubleClick($event)"
    @contextmenu.prevent="handleContextMenu"
    @dragstart="handleDragStart"
    @dragover.prevent="handleDragOver"
    @dragleave="handleDragLeave"
    @drop.prevent="handleDrop"
    :draggable="draggable"
  >
    <!-- 文件图标 -->
    <div class="file-icon" :class="iconType" aria-hidden="true">
      <PhFolder v-if="file.type === 'directory'" class="icon" weight="regular" />
      <PhFileCode v-else-if="iconType === 'code'" class="icon" weight="regular" />
      <PhFileText v-else-if="iconType === 'config'" class="icon" weight="regular" />
      <PhFileText v-else-if="iconType === 'document'" class="icon" weight="regular" />
      <PhImage v-else-if="iconType === 'image'" class="icon" weight="regular" />
      <PhArchive v-else-if="iconType === 'archive'" class="icon" weight="regular" />
      <PhMusicNotes v-else-if="iconType === 'audio'" class="icon" weight="regular" />
      <PhVideoCamera v-else-if="iconType === 'video'" class="icon" weight="regular" />
      <PhTerminal v-else-if="iconType === 'shell'" class="icon" weight="regular" />
      <PhLink v-else-if="file.type === 'symlink'" class="icon" weight="regular" />
      <PhFile v-else class="icon" weight="regular" />
    </div>

    <!-- 文件信息 -->
    <div class="file-info">
      <span class="file-name" :title="file.name">{{ file.name }}</span>
      <span class="file-size" v-if="file.type !== 'directory'">{{ fileSize }}</span>
    </div>

    <!-- 文件详情 -->
    <div class="file-details">
      <span class="file-time">{{ fileTime }}</span>
      <span class="file-permissions" v-if="permissions">{{ permissions }}</span>
    </div>

    <!-- 拖拽指示器 -->
    <div class="drag-indicator" v-if="dragOver">
      <PhArrowDown class="drag-icon" weight="bold" />
      <span class="drag-text">拖放传输</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import {
  PhFolder, PhFile, PhFileCode, PhFileText,
  PhImage, PhArchive, PhMusicNotes, PhVideoCamera,
  PhTerminal, PhLink, PhArrowDown
} from '@phosphor-icons/vue'
import { formatFileSize, formatFileTime, getFileIconType, parsePermissions } from '../utils/fileUtils'
import type { SftpItem, LocalFileItem } from '../types/electron'

interface Props {
  file: LocalFileItem | SftpItem
  selected?: boolean
  draggable?: boolean
  sourceType?: 'local' | 'remote'
}

const props = withDefaults(defineProps<Props>(), {
  selected: false,
  draggable: true,
  sourceType: 'local'
})

const emit = defineEmits<{
  click: [file: LocalFileItem | SftpItem, event: MouseEvent]
  doubleClick: [file: LocalFileItem | SftpItem, event: MouseEvent]
  contextMenu: [file: LocalFileItem | SftpItem, event: MouseEvent]
  dragStart: [file: LocalFileItem | SftpItem]
  drop: [file: LocalFileItem | SftpItem]
}>()

// 拖拽状态
const dragOver = ref(false)

// 图标类型
const iconType = computed(() => {
  return getFileIconType(props.file.name, props.file.type)
})

// 文件大小
const fileSize = computed(() => {
  return formatFileSize(props.file.size)
})

// 文件时间
const fileTime = computed(() => {
  return formatFileTime(props.file.modifyTime)
})

// 权限显示 (仅远程文件)
const permissions = computed(() => {
  if ('permissions' in props.file && props.file.permissions) {
    const parsed = parsePermissions(props.file.permissions)
    return parsed.type + parsed.owner.slice(0, 1) + parsed.group.slice(0, 1) + parsed.others.slice(0, 1)
  }
  return null
})

// 单击事件
const handleClick = (e: MouseEvent) => {
  emit('click', props.file, e)
}

// 双击事件
const handleDoubleClick = (e: MouseEvent) => {
  emit('doubleClick', props.file, e)
}

// 右键菜单
const handleContextMenu = (e: MouseEvent) => {
  emit('contextMenu', props.file, e)
}

// 拖拽开始
const handleDragStart = (e: DragEvent) => {
  if (!props.draggable) return

  // 设置拖拽数据
  const data = JSON.stringify({
    file: props.file,
    sourceType: props.sourceType
  })
  if (e.dataTransfer) {
    e.dataTransfer.setData('application/json', data)
    e.dataTransfer.setData('text/plain', props.file.name)
    e.dataTransfer.effectAllowed = 'copy'
  }

  emit('dragStart', props.file)
}

// 拖拽悬停
const handleDragOver = (e: DragEvent) => {
  // 只有目录可以接收拖拽
  if (props.file.type !== 'directory') return

  const data = e.dataTransfer?.getData('application/json')
  if (data) {
    try {
      const parsed = JSON.parse(data)
      // 不能拖到自己
      if (parsed.file.name === props.file.name) return
    } catch {}
  }

  dragOver.value = true
  if (e.dataTransfer) {
    e.dataTransfer.dropEffect = 'copy'
  }
}

// 拖拽离开
const handleDragLeave = () => {
  dragOver.value = false
}

// 拖放事件
const handleDrop = (e: DragEvent) => {
  dragOver.value = false

  if (props.file.type !== 'directory') return

  emit('drop', props.file)
}
</script>

<style scoped>
.file-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 14px;
  background: transparent;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.15s ease;
  position: relative;
  user-select: none;
}

.file-item:hover {
  background: rgba(29, 32, 37, 0.6);
}

.file-item.selected {
  background: rgba(45, 183, 242, 0.15);
  border: 1px solid rgba(45, 183, 242, 0.3);
}

.file-item.hidden {
  opacity: 0.6;
}

.file-item.drag-over {
  background: rgba(10, 132, 255, 0.1);
  border: 2px dashed rgba(45, 183, 242, 0.5);
}

/* 文件图标 */
.file-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border-radius: 6px;
  flex-shrink: 0;
  transition: all 0.15s ease;
}

.file-icon.folder {
  background: rgba(45, 183, 242, 0.1);
  color: var(--color-secondary, #2db7f2);
}

.file-icon.code {
  background: rgba(255, 134, 195, 0.1);
  color: var(--color-tertiary, #ff86c3);
}

.file-icon.config {
  background: rgba(183, 159, 255, 0.1);
  color: var(--color-primary, #b79fff);
}

.file-icon.document {
  background: rgba(255, 255, 255, 0.05);
  color: var(--color-on-surface-variant, #aaabb0);
}

.file-icon.image {
  background: rgba(52, 211, 153, 0.1);
  color: #34d399;
}

.file-icon.archive {
  background: rgba(251, 191, 36, 0.1);
  color: #fbbf24;
}

.file-icon.audio {
  background: rgba(236, 72, 153, 0.1);
  color: #ec4899;
}

.file-icon.video {
  background: rgba(239, 68, 68, 0.1);
  color: #ef4444;
}

.file-icon.shell {
  background: rgba(34, 197, 94, 0.1);
  color: #22c55e;
}

.icon {
  width: 18px;
  height: 18px;
}

/* 文件信息 */
.file-info {
  flex: 1;
  min-width: 0;
  display: flex;
  align-items: baseline;
  gap: 8px;
}

.file-name {
  font-size: 13px;
  font-weight: 500;
  color: var(--color-on-surface, #f6f6fc);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.file-item.directory .file-name {
  font-weight: 600;
  color: var(--color-secondary, #2db7f2);
}

.file-size {
  font-size: 11px;
  color: var(--color-on-surface-variant, #aaabb0);
  font-family: var(--font-mono, 'Fira Code', monospace);
  flex-shrink: 0;
}

/* 文件详情 */
.file-details {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-shrink: 0;
}

.file-time {
  font-size: 11px;
  color: var(--color-on-surface-variant, #aaabb0);
  min-width: 60px;
  text-align: right;
}

.file-permissions {
  font-size: 10px;
  color: var(--color-outline-variant, #46484d);
  font-family: var(--font-mono, 'Fira Code', monospace);
  padding: 2px 6px;
  background: rgba(255, 255, 255, 0.03);
  border-radius: 4px;
}

/* 拖拽指示器 */
.drag-indicator {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 4px;
  background: rgba(10, 132, 255, 0.2);
  border-radius: 8px;
  z-index: 1;
}

.drag-icon {
  width: 20px;
  height: 20px;
  color: var(--color-secondary, #2db7f2);
}

.drag-text {
  font-size: 11px;
  color: var(--color-secondary, #2db7f2);
  font-weight: 600;
}
</style>