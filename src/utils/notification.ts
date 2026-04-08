import { ref } from 'vue'

// Toast 消息类型
export type ToastType = 'info' | 'success' | 'warning' | 'error' | 'action'

// Toast 操作按钮
export interface ToastAction {
  label: string
  onClick: () => void
}

// Toast 消息接口
export interface ToastMessage {
  id: number
  type: ToastType
  message: string
  duration: number
  action?: ToastAction
  showProgress?: boolean
}

// 全局 toast 列表
export const toasts = ref<ToastMessage[]>([])

// 显示 toast
export function showToast(
  message: string,
  type: ToastType = 'info',
  duration: number = 4000,
  options?: { action?: ToastAction; showProgress?: boolean }
): void {
  const id = Date.now()
  const toast: ToastMessage = {
    id,
    type,
    message,
    duration,
    action: options?.action,
    showProgress: options?.showProgress
  }

  toasts.value.push(toast)

  // 自动移除
  if (duration > 0) {
    setTimeout(() => {
      removeToast(id)
    }, duration)
  }
}

// 移除 toast
export function removeToast(id: number): void {
  toasts.value = toasts.value.filter(t => t.id !== id)
}

// 快捷方法
export const toast = {
  info: (msg: string, duration?: number) => showToast(msg, 'info', duration),
  success: (msg: string, duration?: number) => showToast(msg, 'success', duration),
  warning: (msg: string, duration?: number) => showToast(msg, 'warning', duration),
  error: (msg: string, duration?: number) => showToast(msg, 'error', duration),
  action: (msg: string, action: ToastAction, duration?: number) =>
    showToast(msg, 'action', duration ?? 8000, { action }),
  // 内存警告专用
  memoryWarning: (usage: number) => {
    showToast(
      `内存占用较高 (${usage.toFixed(0)}%)，建议关闭冗余会话`,
      'warning',
      8000,
      {
        showProgress: true,
        action: {
          label: '查看设置',
          onClick: () => {
            // 触发打开设置面板的事件
            window.dispatchEvent(new CustomEvent('open-settings'))
          }
        }
      }
    )
  }
}