<template>
  <div class="path-breadcrumb" role="navigation" aria-label="路径导航">
    <button
      class="breadcrumb-btn home"
      @click="navigateToHome"
      :title="homeLabel"
      aria-label="返回主目录"
    >
      <PhHouse class="breadcrumb-icon" weight="regular" />
    </button>

    <div class="breadcrumb-parts" ref="partsRef">
      <template v-for="(part, index) in pathParts" :key="index">
        <span class="breadcrumb-separator" aria-hidden="true">{{ separator }}</span>
        <button
          class="breadcrumb-btn"
          :class="{ current: index === pathParts.length - 1 }"
          @click="navigateToPart(index)"
          :title="getFullPath(index)"
          :aria-label="`进入 ${part}`"
        >
          <span class="part-text">{{ part }}</span>
        </button>
      </template>
    </div>

    <!-- 可编辑路径 -->
    <button
      class="edit-path-btn"
      @click="toggleEditMode"
      :title="editMode ? '确认' : '编辑路径'"
      aria-label="编辑路径"
    >
      <PhPencil class="edit-icon" weight="regular" />
    </button>

    <!-- 编辑模式 -->
    <Transition name="edit-slide">
      <div class="path-editor" v-if="editMode">
        <input
          ref="pathInputRef"
          type="text"
          v-model="editPath"
          @keydown.enter="confirmEdit"
          @keydown.escape="cancelEdit"
          @blur="cancelEdit"
          placeholder="输入路径"
          aria-label="路径输入"
        />
      </div>
    </Transition>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, nextTick } from 'vue'
import { PhHouse, PhPencil } from '@phosphor-icons/vue'

interface Props {
  path: string
  type: 'local' | 'remote'
  homeLabel?: string
}

const props = withDefaults(defineProps<Props>(), {
  homeLabel: '主目录'
})

const emit = defineEmits(['navigate'])

// 编辑模式
const editMode = ref(false)
const editPath = ref('')
const pathInputRef = ref<HTMLInputElement | null>(null)
const partsRef = ref<HTMLDivElement | null>(null)

// 分隔符
const separator = computed(() => {
  return props.type === 'remote' || props.path.includes('/') ? '/' : '\\'
})

// 路径分段
const pathParts = computed(() => {
  if (!props.path) return []

  const sep = separator.value
  const parts = props.path.split(sep).filter(Boolean)

  // Windows 根目录处理 (如 C:)
  if (props.type === 'local' && props.path.match(/^[A-Za-z]:\\/)) {
    const root = props.path.match(/^([A-Za-z]:)/)?.[1]
    if (root && parts[0]?.startsWith(root)) {
      parts[0] = root
    }
  }

  return parts
})

// 获取指定索引的完整路径
const getFullPath = (index: number): string => {
  const sep = separator.value
  const parts = pathParts.value.slice(0, index + 1)

  if (props.type === 'remote') {
    return '/' + parts.join('/')
  }

  // Windows 路径
  if (props.path.match(/^[A-Za-z]:\\/)) {
    const root = props.path.match(/^([A-Za-z]:)/)?.[1] || ''
    if (parts[0] === root) {
      return root + '\\'
    }
    return root + '\\' + parts.slice(1).join('\\')
  }

  return parts.join(sep)
}

// 导航到主目录
const navigateToHome = () => {
  emit('navigate', props.type === 'remote' ? '/' : '')
}

// 导航到指定层级
const navigateToPart = (index: number) => {
  if (index === pathParts.value.length - 1) return // 当前层级不跳转
  emit('navigate', getFullPath(index))
}

// 切换编辑模式
const toggleEditMode = async () => {
  if (editMode.value) {
    confirmEdit()
  } else {
    editPath.value = props.path
    editMode.value = true
    await nextTick()
    pathInputRef.value?.focus()
    pathInputRef.value?.select()
  }
}

// 确认编辑
const confirmEdit = () => {
  if (editPath.value && editPath.value !== props.path) {
    emit('navigate', editPath.value)
  }
  editMode.value = false
}

// 取消编辑
const cancelEdit = () => {
  editMode.value = false
  editPath.value = ''
}

// 路径变化时重置编辑模式
watch(() => props.path, () => {
  editMode.value = false
})
</script>

<style scoped>
.path-breadcrumb {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 8px 12px;
  background: rgba(29, 32, 37, 0.5);
  border: 1px solid rgba(70, 72, 77, 0.15);
  border-radius: var(--radius-md, 10px);
  min-height: 36px;
  overflow: hidden;
  flex-shrink: 0;
}

.breadcrumb-parts {
  display: flex;
  align-items: center;
  gap: 2px;
  flex: 1;
  overflow-x: auto;
  overflow-y: hidden;
  scrollbar-width: none;
}

.breadcrumb-parts::-webkit-scrollbar {
  display: none;
}

.breadcrumb-btn {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 4px 8px;
  background: transparent;
  border: none;
  border-radius: 6px;
  color: var(--color-on-surface-variant, #aaabb0);
  font-size: 12px;
  font-family: var(--font-mono, 'Fira Code', monospace);
  cursor: pointer;
  transition: all 0.15s ease;
  white-space: nowrap;
  min-height: 24px;
}

.breadcrumb-btn:hover {
  background: rgba(45, 183, 242, 0.1);
  color: var(--color-secondary, #2db7f2);
}

.breadcrumb-btn.home {
  padding: 4px 6px;
}

.breadcrumb-icon {
  width: 16px;
  height: 16px;
}

.breadcrumb-btn.current {
  color: var(--color-primary, #b79fff);
  font-weight: 600;
}

.breadcrumb-separator {
  color: var(--color-outline-variant, #46484d);
  font-size: 12px;
  user-select: none;
}

.part-text {
  max-width: 100px;
  overflow: hidden;
  text-overflow: ellipsis;
}

.edit-path-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 4px 6px;
  background: transparent;
  border: none;
  border-radius: 6px;
  color: var(--color-on-surface-variant, #aaabb0);
  cursor: pointer;
  transition: all 0.15s ease;
  min-height: 24px;
}

.edit-path-btn:hover {
  background: rgba(45, 183, 242, 0.1);
  color: var(--color-secondary, #2db7f2);
}

.edit-icon {
  width: 14px;
  height: 14px;
}

.path-editor {
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  margin-top: 4px;
  z-index: 10;
}

.path-editor input {
  width: 100%;
  padding: 8px 12px;
  background: rgba(17, 19, 24, 0.95);
  border: 1px solid rgba(45, 183, 242, 0.3);
  border-radius: var(--radius-md, 10px);
  color: var(--color-on-surface, #f6f6fc);
  font-size: 12px;
  font-family: var(--font-mono, 'Fira Code', monospace);
  outline: none;
}

.path-editor input:focus {
  border-color: var(--color-secondary, #2db7f2);
  box-shadow: 0 0 0 2px rgba(45, 183, 242, 0.15);
}

/* 编辑模式过渡 */
.edit-slide-enter-active,
.edit-slide-leave-active {
  transition: all 0.2s ease;
}

.edit-slide-enter-from,
.edit-slide-leave-to {
  opacity: 0;
  transform: translateY(-4px);
}
</style>