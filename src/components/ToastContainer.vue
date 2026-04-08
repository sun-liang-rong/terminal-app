<template>
  <Teleport to="body">
    <div class="toast-container">
      <TransitionGroup name="toast-slide">
        <div
          v-for="toast in toasts"
          :key="toast.id"
          class="toast-item"
          :class="[toast.type, { 'has-action': toast.action }]"
        >
          <div class="toast-icon">
            <i class="iconfont" :class="getIconClass(toast.type)"></i>
          </div>
          <div class="toast-content">
            <span class="toast-message">{{ toast.message }}</span>
            <button
              v-if="toast.action"
              class="toast-action-btn"
              @click.stop="handleAction(toast)"
            >
              {{ toast.action.label }}
            </button>
          </div>
          <button class="toast-close" @click.stop="removeToast(toast.id)">
            <i class="iconfont icon-close"></i>
          </button>
          <div
            v-if="toast.showProgress !== false"
            class="toast-progress"
            :class="toast.type"
            :style="{ animationDuration: `${toast.duration}ms` }"
          ></div>
        </div>
      </TransitionGroup>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { toasts, removeToast } from '../utils/notification'
import type { ToastMessage } from '../utils/notification'

const getIconClass = (type: string): string => {
  const icons: Record<string, string> = {
    info: 'icon-info',
    success: 'icon-success',
    warning: 'icon-warning',
    error: 'icon-error',
    action: 'icon-info'
  }
  return icons[type] || 'icon-info'
}

const handleAction = (toast: ToastMessage) => {
  if (toast.action?.onClick) {
    toast.action.onClick()
  }
  removeToast(toast.id)
}
</script>

<style scoped>
.toast-container {
  position: fixed;
  bottom: 24px;
  right: 24px;
  z-index: var(--z-toast, 5000);
  display: flex;
  flex-direction: column-reverse;
  gap: 12px;
  pointer-events: auto;
}

.toast-item {
  display: flex;
  align-items: center;
  gap: var(--space-4);
  min-width: 320px;
  max-width: 420px;
  padding: var(--space-4) var(--space-5);
  background: var(--color-bg-surface, #2c2c2e);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: var(--radius-lg, 14px);
  color: var(--color-text-primary);
  font-size: var(--font-size-md);
  box-shadow: var(--shadow-lg, 0 8px 24px rgba(0, 0, 0, 0.25));
  cursor: default;
  transition: all 150ms cubic-bezier(0.25, 1, 0.5, 1);
  position: relative;
  overflow: hidden;
}

.toast-item:hover {
  transform: translateX(-4px);
  box-shadow: var(--shadow-xl, 0 16px 48px rgba(0, 0, 0, 0.3));
}

.toast-item.has-action {
  cursor: default;
}

/* 类型样式 */
.toast-item.info {
  border-color: rgba(45, 183, 242, 0.3);
}

.toast-item.info .toast-icon {
  color: var(--color-secondary, #2db7f2);
}

.toast-item.info .toast-progress {
  background: var(--color-secondary, #2db7f2);
}

.toast-item.success {
  border-color: rgba(45, 183, 242, 0.3);
}

.toast-item.success .toast-icon {
  color: var(--color-secondary, #2db7f2);
}

.toast-item.success .toast-progress {
  background: var(--color-secondary, #2db7f2);
}

.toast-item.warning {
  border-color: rgba(255, 134, 195, 0.3);
}

.toast-item.warning .toast-icon {
  color: var(--color-tertiary, #ff86c3);
}

.toast-item.warning .toast-progress {
  background: var(--color-tertiary, #ff86c3);
}

.toast-item.error {
  border-color: rgba(255, 110, 132, 0.3);
}

.toast-item.error .toast-icon {
  color: var(--color-error, #ff6e84);
}

.toast-item.error .toast-progress {
  background: var(--color-error, #ff6e84);
}

.toast-item.action {
  border-color: rgba(183, 159, 255, 0.3);
}

.toast-item.action .toast-icon {
  color: var(--color-primary, #b79fff);
}

.toast-item.action .toast-progress {
  background: var(--color-primary, #b79fff);
}

/* 图标 */
.toast-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.04);
  flex-shrink: 0;
}

.toast-icon .iconfont {
  font-size: 14px;
}

/* 内容 */
.toast-content {
  flex: 1;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.toast-message {
  display: block;
  line-height: var(--line-height-normal);
  color: var(--color-text-primary);
}

/* 操作按钮 */
.toast-action-btn {
  align-self: flex-start;
  padding: 6px 12px;
  background: rgba(45, 183, 242, 0.1);
  border: 1px solid rgba(45, 183, 242, 0.2);
  border-radius: var(--radius-sm, 6px);
  color: var(--color-secondary, #2db7f2);
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-medium);
  cursor: pointer;
  transition: all 150ms cubic-bezier(0.25, 1, 0.5, 1);
}

.toast-action-btn:hover {
  background: rgba(45, 183, 242, 0.15);
  border-color: rgba(45, 183, 242, 0.3);
}

/* 关闭按钮 */
.toast-close {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  background: transparent;
  border: none;
  border-radius: var(--radius-sm, 6px);
  color: var(--color-text-tertiary, #6e6e73);
  cursor: pointer;
  transition: all 150ms cubic-bezier(0.25, 1, 0.5, 1);
  flex-shrink: 0;
}

.toast-close:hover {
  background: rgba(255, 255, 255, 0.06);
  color: var(--color-text-primary);
}

.toast-close .iconfont {
  font-size: 10px;
}

/* 进度条 */
.toast-progress {
  position: absolute;
  bottom: 0;
  left: 0;
  height: 2px;
  width: 100%;
  animation: progressShrink linear forwards;
  opacity: 0.6;
}

@keyframes progressShrink {
  from { width: 100%; }
  to { width: 0%; }
}

/* 动画 */
.toast-slide-enter-active,
.toast-slide-leave-active {
  transition: all 250ms cubic-bezier(0.25, 1, 0.5, 1);
}

.toast-slide-enter-from {
  opacity: 0;
  transform: translateX(100%) scale(0.9);
}

.toast-slide-leave-to {
  opacity: 0;
  transform: translateX(100%) scale(0.9);
}

.toast-slide-move {
  transition: transform 250ms cubic-bezier(0.25, 1, 0.5, 1);
}

/* 响应式 */
@media (max-width: 480px) {
  .toast-container {
    bottom: 16px;
    right: 16px;
    left: 16px;
  }

  .toast-item {
    min-width: auto;
    max-width: none;
  }
}
</style>