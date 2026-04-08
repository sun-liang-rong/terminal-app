<template>
  <Teleport to="body">
    <Transition name="modal-fade">
      <div v-if="visible" class="modal-overlay" :style="overlayStyle" @click.self="handleCancel">
        <Transition name="modal-slide">
          <div v-if="visible" class="modal-container" :class="type" :style="containerStyle" @click="handleFocus">
            <!-- 图标 -->
            <div class="modal-icon" :class="type">
              <i v-if="type === 'info'" class="iconfont icon-info"></i>
              <i v-else-if="type === 'warning'" class="iconfont icon-warning"></i>
              <i v-else-if="type === 'error'" class="iconfont icon-error"></i>
              <i v-else-if="type === 'success'" class="iconfont icon-success"></i>
              <i v-else-if="type === 'confirm'" class="iconfont icon-question"></i>
            </div>

            <!-- 标题 -->
            <div class="modal-title" v-if="title">{{ title }}</div>

            <!-- 内容 -->
            <div class="modal-content">
              <p>{{ message }}</p>
            </div>

            <!-- 按钮 -->
            <div class="modal-actions">
              <button
                v-if="type === 'confirm'"
                class="modal-btn secondary"
                @click="handleCancel"
              >
                取消
              </button>
              <button
                class="modal-btn"
                :class="type === 'error' || type === 'warning' ? 'danger' : 'primary'"
                @click="handleConfirm"
              >
                {{ confirmText || '确定' }}
              </button>
            </div>
          </div>
        </Transition>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, computed, watch, onUnmounted } from 'vue'
import { registerModal, unregisterModal, bringToFront, CSS_Z_INDEX_VARS } from '../utils/modalManager'

interface Props {
  type?: 'info' | 'warning' | 'error' | 'success' | 'confirm'
  title?: string
  message?: string
  confirmText?: string
}

const props = withDefaults(defineProps<Props>(), {
  type: 'info',
  title: '',
  message: '',
  confirmText: '确定'
})

const visible = ref(false)
let resolvePromise: ((value: boolean) => void) | null = null
let modalId: string | null = null
let modalZIndex: number = 0

// 计算样式（使用动态 z-index）
const overlayStyle = computed(() => ({
  zIndex: modalZIndex
}))

const containerStyle = computed(() => ({
  zIndex: modalZIndex + 1
}))

const show = (): Promise<boolean> => {
  visible.value = true
  // 注册模态框，获取动态 z-index
  const registration = registerModal(`modal-${props.type}`, props.type !== 'error')
  modalId = registration.id
  modalZIndex = registration.zIndex

  return new Promise((resolve) => {
    resolvePromise = resolve
  })
}

const hide = () => {
  visible.value = false
  // 取消注册模态框
  if (modalId) {
    unregisterModal(modalId)
    modalId = null
  }
}

const handleFocus = () => {
  // 点击模态框时将其置顶
  if (modalId) {
    bringToFront(modalId)
    modalZIndex = registerModal(`modal-${props.type}-focus`, props.type !== 'error').zIndex
  }
}

const handleConfirm = () => {
  hide()
  if (resolvePromise) {
    resolvePromise(true)
    resolvePromise = null
  }
}

const handleCancel = () => {
  hide()
  if (resolvePromise) {
    resolvePromise(false)
    resolvePromise = null
  }
}

onUnmounted(() => {
  if (modalId) {
    unregisterModal(modalId)
  }
})

defineExpose({ show, hide })
</script>

<style scoped>
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.75);
  backdrop-filter: blur(12px);
  display: flex;
  align-items: center;
  justify-content: center;
  /* z-index 由 modalManager 动态管理 */
}

.modal-container {
  min-width: 360px;
  max-width: 480px;
  background: var(--color-bg-surface, #2c2c2e);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: var(--radius-xl, 20px);
  padding: var(--space-8);
  text-align: center;
  box-shadow: var(--shadow-xl, 0 16px 48px rgba(0, 0, 0, 0.3));
}

/* 图标区域 */
.modal-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 56px;
  height: 56px;
  margin: 0 auto var(--space-6);
  border-radius: 50%;
  font-size: 24px;
}

.modal-icon.info {
  background: rgba(183, 159, 255, 0.15);
  color: var(--color-primary, #b79fff);
}

.modal-icon.warning {
  background: rgba(255, 134, 195, 0.15);
  color: var(--color-tertiary, #ff86c3);
}

.modal-icon.error {
  background: rgba(255, 110, 132, 0.15);
  color: var(--color-error, #ff6e84);
}

.modal-icon.success {
  background: rgba(45, 183, 242, 0.15);
  color: var(--color-secondary, #2db7f2);
}

.modal-icon.confirm {
  background: rgba(183, 159, 255, 0.15);
  color: var(--color-primary, #b79fff);
}

/* 标题 */
.modal-title {
  font-size: var(--font-size-xl);
  font-weight: var(--font-weight-semibold);
  color: var(--color-text-primary);
  margin-bottom: var(--space-3);
  letter-spacing: -0.3px;
}

/* 内容 */
.modal-content {
  color: var(--color-text-secondary);
  font-size: var(--font-size-md);
  line-height: var(--line-height-relaxed);
  margin-bottom: var(--space-8);
}

.modal-content p {
  margin: 0;
}

/* 按钮 */
.modal-actions {
  display: flex;
  gap: var(--space-4);
  justify-content: center;
}

.modal-btn {
  min-width: 100px;
  padding: var(--space-3) var(--space-6);
  border-radius: var(--radius-md, 10px);
  font-size: var(--font-size-md);
  font-weight: var(--font-weight-medium);
  cursor: pointer;
  transition: all 150ms cubic-bezier(0.25, 1, 0.5, 1);
  border: none;
}

.modal-btn.secondary {
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(255, 255, 255, 0.1);
  color: var(--color-text-secondary, #a1a1a6);
}

.modal-btn.secondary:hover {
  background: rgba(255, 255, 255, 0.1);
  color: var(--color-text-primary, #f5f5f7);
}

.modal-btn.primary {
  background: var(--color-primary, #b79fff);
  color: var(--color-on-primary, #361083);
}

.modal-btn.primary:hover {
  background: var(--color-primary-dim, #a88cfb);
}

.modal-btn.danger {
  background: rgba(255, 110, 132, 0.15);
  border: 1px solid rgba(255, 110, 132, 0.3);
  color: var(--color-error, #ff6e84);
}

.modal-btn.danger:hover {
  background: rgba(255, 110, 132, 0.25);
  border-color: rgba(255, 110, 132, 0.4);
}

/* 动画 */
.modal-fade-enter-active,
.modal-fade-leave-active {
  transition: opacity 150ms cubic-bezier(0.25, 1, 0.5, 1);
}

.modal-fade-enter-from,
.modal-fade-leave-to {
  opacity: 0;
}

.modal-slide-enter-active,
.modal-slide-leave-active {
  transition: all 200ms cubic-bezier(0.25, 1, 0.5, 1);
}

.modal-slide-enter-from,
.modal-slide-leave-to {
  opacity: 0;
  transform: scale(0.92) translateY(16px);
}
</style>