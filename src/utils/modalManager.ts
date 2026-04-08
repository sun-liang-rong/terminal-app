/**
 * 模态框管理器
 * 统一管理所有模态框的 z-index 层级，避免堆叠冲突
 */

import { ref, computed, readonly } from 'vue'

// 模态框层级配置
const MODAL_BASE_Z_INDEX = 3000
const MODAL_STEP = 10 // 每个模态框递增的层级

// 当前打开的模态框列表
const openModals = ref<Array<{
  id: string
  name: string
  zIndex: number
  closable: boolean
}>>([])

// 当前最高层级
const topZIndex = computed(() => {
  if (openModals.value.length === 0) {
    return MODAL_BASE_Z_INDEX
  }
  return Math.max(...openModals.value.map(m => m.zIndex))
})

// 活动模态框 ID
const activeModalId = computed(() => {
  const topModal = openModals.value.find(m => m.zIndex === topZIndex.value)
  return topModal?.id || null
})

// 生成唯一 ID
const generateId = () => `modal-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`

/**
 * 注册模态框（打开时调用）
 * @param name 模态框名称（用于调试）
 * @param closable 是否可通过 ESC 关闭
 * @returns 模态框 ID 和 z-index
 */
export const registerModal = (name: string = 'unnamed', closable: boolean = true) => {
  const id = generateId()
  const zIndex = topZIndex.value + MODAL_STEP

  openModals.value.push({
    id,
    name,
    zIndex,
    closable
  })

  console.debug(`[ModalManager] Registered modal "${name}" with z-index ${zIndex}`)

  return {
    id,
    zIndex
  }
}

/**
 * 取消注册模态框（关闭时调用）
 * @param id 模态框 ID
 */
export const unregisterModal = (id: string) => {
  const index = openModals.value.findIndex(m => m.id === id)
  if (index !== -1) {
    const modal = openModals.value[index]
    openModals.value.splice(index, 1)
    console.debug(`[ModalManager] Unregistered modal "${modal.name}"`)
  }
}

/**
 * 将模态框置顶（点击模态框时调用）
 * @param id 模态框 ID
 */
export const bringToFront = (id: string) => {
  const modal = openModals.value.find(m => m.id === id)
  if (modal && modal.zIndex !== topZIndex.value) {
    modal.zIndex = topZIndex.value + MODAL_STEP
    console.debug(`[ModalManager] Brought modal "${modal.name}" to front with z-index ${modal.zIndex}`)
  }
}

/**
 * 获取模态框的 z-index
 * @param id 模态框 ID
 */
export const getModalZIndex = (id: string): number | undefined => {
  const modal = openModals.value.find(m => m.id === id)
  return modal?.zIndex
}

/**
 * 关闭所有可关闭的模态框
 */
export const closeAllModals = () => {
  const closableModals = openModals.value.filter(m => m.closable)
  closableModals.forEach(m => unregisterModal(m.id))
  return closableModals.length
}

/**
 * 关闭最顶层的模态框（ESC 键处理）
 * @returns 是否有模态框被关闭
 */
export const closeTopModal = (): boolean => {
  const topModal = openModals.value.find(m => m.zIndex === topZIndex.value && m.closable)
  if (topModal) {
    unregisterModal(topModal.id)
    return true
  }
  return false
}

/**
 * 检查是否有打开的模态框
 */
export const hasOpenModals = computed(() => openModals.value.length > 0)

/**
 * 获取打开的模态框数量
 */
export const modalCount = computed(() => openModals.value.length)

/**
 * 获取所有打开的模态框信息（只读）
 */
export const allModals = readonly(openModals)

// 全局 ESC 键处理
let escHandlerAttached = false

const handleEscKey = (e: KeyboardEvent) => {
  if (e.key === 'Escape' && hasOpenModals.value) {
    closeTopModal()
  }
}

/**
 * 初始化全局 ESC 键监听
 */
export const initModalManager = () => {
  if (!escHandlerAttached) {
    document.addEventListener('keydown', handleEscKey)
    escHandlerAttached = true
    console.debug('[ModalManager] Initialized with ESC key handler')
  }
}

/**
 * 销毁模态框管理器
 */
export const destroyModalManager = () => {
  if (escHandlerAttached) {
    document.removeEventListener('keydown', handleEscKey)
    escHandlerAttached = false
  }
  openModals.value = []
}

// 导出 composable hook
export function useModalManager() {
  return {
    registerModal,
    unregisterModal,
    bringToFront,
    getModalZIndex,
    closeAllModals,
    closeTopModal,
    hasOpenModals,
    modalCount,
    activeModalId,
    allModals
  }
}

// 导出 CSS 变量名（方便组件使用）
export const CSS_Z_INDEX_VARS = {
  modalOverlay: 'var(--z-modal-overlay)',
  modalBase: 'var(--z-modal-base)',
  dropdown: 'var(--z-dropdown)',
  popover: 'var(--z-popover)',
  toast: 'var(--z-toast)',
  tooltip: 'var(--z-tooltip)',
  commandPalette: 'var(--z-command-palette)',
  topmost: 'var(--z-topmost)'
}