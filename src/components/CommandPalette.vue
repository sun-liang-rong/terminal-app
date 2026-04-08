<template>
  <Teleport to="body">
    <Transition name="palette-fade">
      <div v-if="visible" class="palette-overlay" @click.self="handleClose">
        <Transition name="palette-slide">
          <div v-if="visible" class="palette-container">
            <!-- 输入框 -->
            <div class="palette-input-wrapper">
              <div class="palette-icon">
                <i class="iconfont icon-search"></i>
              </div>
              <input
                ref="inputRef"
                type="text"
                v-model="query"
                class="palette-input"
                placeholder="搜索命令、主机、输入 / AI指令..."
                @input="handleInput"
                @keydown="handleKeydown"
              />
              <div class="palette-hint">
                <kbd>ESC</kbd> 关闭
              </div>
            </div>

            <!-- 分类标签 -->
            <div class="palette-tabs" v-if="!query">
              <button
                v-for="tab in tabs"
                :key="tab.id"
                class="palette-tab"
                :class="{ active: activeTab === tab.id }"
                @click="activeTab = tab.id"
              >
                <i class="iconfont" :class="tab.icon"></i>
                <span>{{ tab.label }}</span>
              </button>
            </div>

            <!-- 结果列表 -->
            <div class="palette-results" v-if="filteredItems.length > 0">
              <div
                v-for="(item, index) in filteredItems"
                :key="item.id"
                class="palette-item"
                :class="{ selected: selectedIndex === index }"
                @click="handleSelect(item)"
                @mouseenter="selectedIndex = index"
              >
                <div class="item-icon" :class="item.type">
                  <i class="iconfont" :class="item.icon"></i>
                </div>
                <div class="item-content">
                  <div class="item-title">{{ item.title }}</div>
                  <div class="item-desc">{{ item.description }}</div>
                </div>
                <div class="item-shortcut" v-if="item.shortcut">
                  <kbd v-for="key in item.shortcut.split('+')" :key="key">{{ key }}</kbd>
                </div>
              </div>
            </div>

            <!-- 空状态 -->
            <EmptyState
              v-else-if="query"
              type="search"
              icon="icon-search"
              title="未找到相关结果"
              description="尝试使用其他关键词搜索"
              size="small"
            />

            <!-- AI 指令提示 -->
            <div class="palette-ai-hint" v-if="query.startsWith('/')">
              <div class="ai-hint-icon">
                <i class="iconfont icon-ai"></i>
              </div>
              <div class="ai-hint-content">
                <span class="ai-hint-title">AI 指令</span>
                <span class="ai-hint-desc">按 Enter 发送「{{ query.slice(1) }}」到 AI 助手</span>
              </div>
            </div>
          </div>
        </Transition>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import EmptyState from './EmptyState.vue'

interface CommandItem {
  id: string
  type: 'command' | 'host' | 'ai' | 'action'
  title: string
  description: string
  icon: string
  shortcut?: string
  action: () => void
}

const props = defineProps<{
  visible: boolean
  hosts: Array<{ id: number | string; name: string; host: string }>
}>()

const emit = defineEmits<{
  (e: 'close'): void
  (e: 'execute', command: string): void
  (e: 'connect-host', hostId: number | string): void
  (e: 'ai-query', query: string): void
  (e: 'switch-tab', tab: string): void
}>()

const inputRef = ref<HTMLInputElement | null>(null)
const query = ref('')
const selectedIndex = ref(0)
const activeTab = ref('all')

const tabs = [
  { id: 'all', label: '全部', icon: 'icon-terminal' },
  { id: 'commands', label: '命令', icon: 'icon-bolt' },
  { id: 'hosts', label: '主机', icon: 'icon-ssh' },
  { id: 'ai', label: 'AI', icon: 'icon-ai' }
]

// 命令列表
const commands: CommandItem[] = [
  {
    id: 'new-session',
    type: 'command',
    title: '新建终端会话',
    description: '创建一个新的本地终端',
    icon: 'icon-terminal',
    shortcut: 'Ctrl+T',
    action: () => emit('execute', 'new-session')
  },
  {
    id: 'switch-assistant',
    type: 'action',
    title: 'AI 助手',
    description: '切换到 AI 助手面板',
    icon: 'icon-assistant',
    action: () => emit('switch-tab', 'assistant')
  },
  {
    id: 'switch-ssh',
    type: 'action',
    title: 'SSH 连接',
    description: '切换到 SSH 连接面板',
    icon: 'icon-ssh',
    action: () => emit('switch-tab', 'ssh')
  },
  {
    id: 'switch-settings',
    type: 'action',
    title: '设置',
    description: '打开设置面板',
    icon: 'icon-settings',
    shortcut: 'Ctrl+,',
    action: () => emit('switch-tab', 'settings')
  },
  {
    id: 'port-check',
    type: 'ai',
    title: '检查端口占用',
    description: '查看指定端口被哪个进程占用',
    icon: 'icon-info',
    action: () => emit('ai-query', '查看端口占用')
  },
  {
    id: 'find-large',
    type: 'ai',
    title: '查找大文件',
    description: '搜索占用空间较大的文件',
    icon: 'icon-search',
    action: () => emit('ai-query', '查找大文件')
  },
  {
    id: 'docker-clean',
    type: 'ai',
    title: 'Docker 清理',
    description: '清理无用的 Docker 镜像和容器',
    icon: 'icon-delete',
    action: () => emit('ai-query', 'Docker清理')
  }
]

// 计算过滤后的结果
const filteredItems = computed(() => {
  const q = query.value.toLowerCase().trim()

  // 如果是 AI 指令（以 / 开头）
  if (q.startsWith('/')) {
    return []
  }

  let items: CommandItem[] = []

  // 根据标签过滤
  if (activeTab.value === 'all' || activeTab.value === 'commands') {
    items = [...items, ...commands.filter(c => c.type === 'command' || c.type === 'action')]
  }
  if (activeTab.value === 'all' || activeTab.value === 'ai') {
    items = [...items, ...commands.filter(c => c.type === 'ai')]
  }
  if (activeTab.value === 'all' || activeTab.value === 'hosts') {
    items = [...items, ...props.hosts.map(h => ({
      id: `host-${h.id}`,
      type: 'host' as const,
      title: h.name || h.host,
      description: `SSH 连接到 ${h.host}`,
      icon: 'icon-ssh',
      action: () => emit('connect-host', h.id)
    }))]
  }

  // 根据查询过滤
  if (q) {
    // 检查是否是 ssh 命令
    if (q === 'ssh' || q.startsWith('ssh ')) {
      items = props.hosts.map(h => ({
        id: `host-${h.id}`,
        type: 'host' as const,
        title: h.name || h.host,
        description: `SSH 连接到 ${h.host}`,
        icon: 'icon-ssh',
        action: () => emit('connect-host', h.id)
      }))
    } else {
      items = items.filter(item =>
        item.title.toLowerCase().includes(q) ||
        item.description.toLowerCase().includes(q)
      )
    }
  }

  return items.slice(0, 8)
})

// 监听显示状态，自动聚焦
watch(() => props.visible, (val) => {
  if (val) {
    query.value = ''
    selectedIndex.value = 0
    setTimeout(() => {
      inputRef.value?.focus()
    }, 50)
  }
})

// 处理输入
const handleInput = () => {
  selectedIndex.value = 0
}

// 处理键盘事件
const handleKeydown = (e: KeyboardEvent) => {
  if (e.key === 'Escape') {
    handleClose()
    return
  }

  if (e.key === 'Enter') {
    // 如果是 AI 指令
    if (query.value.startsWith('/')) {
      emit('ai-query', query.value.slice(1))
      handleClose()
      return
    }

    // 选择当前项
    if (filteredItems.value[selectedIndex.value]) {
      handleSelect(filteredItems.value[selectedIndex.value])
    }
    return
  }

  if (e.key === 'ArrowDown') {
    e.preventDefault()
    selectedIndex.value = Math.min(selectedIndex.value + 1, filteredItems.value.length - 1)
  }

  if (e.key === 'ArrowUp') {
    e.preventDefault()
    selectedIndex.value = Math.max(selectedIndex.value - 1, 0)
  }
}

// 选择项目
const handleSelect = (item: CommandItem) => {
  item.action()
  handleClose()
}

// 关闭面板
const handleClose = () => {
  emit('close')
}

// 全局快捷键
const handleGlobalKeydown = (e: KeyboardEvent) => {
  // Ctrl+K 打开命令面板
  if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
    e.preventDefault()
    if (props.visible) {
      handleClose()
    } else {
      // 通知父组件打开
      emit('close') // 先关闭再打开
    }
  }
}

onMounted(() => {
  window.addEventListener('keydown', handleGlobalKeydown)
})

onUnmounted(() => {
  window.removeEventListener('keydown', handleGlobalKeydown)
})
</script>

<style scoped>
.palette-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.6);
  backdrop-filter: blur(8px);
  z-index: var(--z-command-palette, 7000);
  display: flex;
  align-items: flex-start;
  justify-content: center;
  padding-top: 15vh;
}

.palette-container {
  width: 560px;
  max-width: 90vw;
  background: var(--color-bg-surface, #2c2c2e);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: var(--radius-lg, 14px);
  overflow: hidden;
  box-shadow: var(--shadow-xl, 0 16px 48px rgba(0, 0, 0, 0.3));
}

/* 输入框 */
.palette-input-wrapper {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px 20px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
}

.palette-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  background: rgba(45, 183, 242, 0.1);
  border-radius: var(--radius-md, 10px);
  flex-shrink: 0;
}

.palette-icon i {
  font-size: 16px;
  color: var(--color-secondary, #2db7f2);
}

.palette-input {
  flex: 1;
  background: transparent;
  border: none;
  outline: none;
  color: var(--color-text-primary, #f5f5f7);
  font-size: 16px;
  font-family: inherit;
}

.palette-input::placeholder {
  color: var(--color-text-disabled, #5a5a68);
}

.palette-hint {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 11px;
  color: var(--color-text-disabled, #5a5a68);
}

.palette-hint kbd {
  padding: 2px 6px;
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 4px;
  font-size: 10px;
  font-family: inherit;
}

/* 标签 */
.palette-tabs {
  display: flex;
  gap: 8px;
  padding: 12px 16px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
}

.palette-tab {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid transparent;
  border-radius: var(--radius-sm, 6px);
  color: var(--color-text-tertiary, #6e6e73);
  font-size: 12px;
  cursor: pointer;
  transition: all 150ms cubic-bezier(0.25, 1, 0.5, 1);
}

.palette-tab:hover {
  background: rgba(255, 255, 255, 0.06);
  color: var(--color-text-secondary, #a1a1a6);
}

.palette-tab.active {
  background: rgba(45, 183, 242, 0.1);
  border-color: rgba(45, 183, 242, 0.2);
  color: var(--color-secondary, #2db7f2);
}

.palette-tab i {
  font-size: 12px;
}

/* 结果列表 */
.palette-results {
  max-height: 320px;
  overflow-y: auto;
  padding: 8px;
}

.palette-results::-webkit-scrollbar {
  width: 6px;
}

.palette-results::-webkit-scrollbar-track {
  background: transparent;
}

.palette-results::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.1);
  border-radius: 3px;
}

.palette-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 14px;
  border-radius: var(--radius-md, 10px);
  cursor: pointer;
  transition: all 150ms cubic-bezier(0.25, 1, 0.5, 1);
}

.palette-item:hover,
.palette-item.selected {
  background: rgba(45, 183, 242, 0.08);
}

.palette-item.selected {
  box-shadow: inset 0 0 0 1px rgba(10, 132, 255, 0.2);
}

.item-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border-radius: 8px;
  flex-shrink: 0;
  background: var(--color-bg-hover, rgba(255, 255, 255, 0.05));
  color: var(--color-text-tertiary, #8b8b9a);
}

.item-icon.command {
  background: rgba(45, 183, 242, 0.1);
  color: var(--color-secondary, #2db7f2);
}

.item-icon.host {
  background: rgba(45, 183, 242, 0.1);
  color: var(--color-secondary, #2db7f2);
}

.item-icon.ai {
  background: rgba(183, 159, 255, 0.1);
  color: var(--color-primary, #b79fff);
}

.item-icon.action {
  background: rgba(45, 183, 242, 0.1);
  color: var(--color-secondary, #2db7f2);
}

.item-icon i {
  font-size: 14px;
}

.item-content {
  flex: 1;
  min-width: 0;
}

.item-title {
  font-size: 14px;
  font-weight: 500;
  color: var(--color-text-primary, #e5e5e7);
  margin-bottom: 2px;
}

.item-desc {
  font-size: 12px;
  color: var(--color-text-tertiary, #6b6b78);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.item-shortcut {
  display: flex;
  gap: 2px;
  flex-shrink: 0;
}

.item-shortcut kbd {
  padding: 3px 6px;
  background: var(--color-bg-hover, rgba(255, 255, 255, 0.05));
  border: 1px solid var(--color-border-default, rgba(255, 255, 255, 0.1));
  border-radius: 4px;
  font-size: 10px;
  color: var(--color-text-tertiary, #8b8b9a);
  font-family: inherit;
}

/* 空状态 - 已改用 EmptyState 组件 */

/* AI 提示 */
.palette-ai-hint {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px 20px;
  background: rgba(191, 90, 242, 0.08);
  border-top: 1px solid rgba(191, 90, 242, 0.15);
}

.ai-hint-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  background: rgba(191, 90, 242, 0.15);
  border-radius: var(--radius-md, 10px);
}

.ai-hint-icon i {
  font-size: 16px;
  color: var(--color-primary, #b79fff);
}

.ai-hint-content {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.ai-hint-title {
  font-size: 12px;
  font-weight: 600;
  color: var(--color-primary, #b79fff);
}

.ai-hint-desc {
  font-size: 13px;
  color: var(--color-text-secondary, #a1a1a6);
}

/* 动画 */
.palette-fade-enter-active,
.palette-fade-leave-active {
  transition: opacity 150ms cubic-bezier(0.25, 1, 0.5, 1);
}

.palette-fade-enter-from,
.palette-fade-leave-to {
  opacity: 0;
}

.palette-slide-enter-active,
.palette-slide-leave-active {
  transition: all 200ms cubic-bezier(0.25, 1, 0.5, 1);
}

.palette-slide-enter-from,
.palette-slide-leave-to {
  opacity: 0;
  transform: translateY(-20px) scale(0.96);
}
</style>