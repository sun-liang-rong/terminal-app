<template>
  <div class="empty-state" :class="size">
    <div class="empty-icon" :class="type">
      <i class="iconfont" :class="icon"></i>
    </div>
    <div class="empty-content">
      <div class="empty-title" v-if="title">{{ title }}</div>
      <div class="empty-description" v-if="description">{{ description }}</div>
    </div>
    <div class="empty-actions" v-if="$slots.actions">
      <slot name="actions"></slot>
    </div>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  icon?: string
  type?: 'default' | 'search' | 'error' | 'config' | 'ai'
  title?: string
  description?: string
  size?: 'small' | 'medium' | 'large'
}>()
</script>

<style scoped>
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  padding: 32px 24px;
  gap: 16px;
}

.empty-state.small {
  padding: 24px 16px;
  gap: 12px;
}

.empty-state.large {
  padding: 48px 32px;
  gap: 20px;
}

.empty-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 64px;
  height: 64px;
  border-radius: 16px;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.06);
  transition: all 0.3s ease;
}

.empty-state.small .empty-icon {
  width: 48px;
  height: 48px;
  border-radius: 12px;
}

.empty-state.large .empty-icon {
  width: 80px;
  height: 80px;
  border-radius: 20px;
}

.empty-icon i {
  font-size: 28px;
  color: #5a5a68;
  transition: all 0.3s ease;
}

.empty-state.small .empty-icon i {
  font-size: 22px;
}

.empty-state.large .empty-icon i {
  font-size: 36px;
}

/* 类型变体 */
.empty-icon.default {
  background: rgba(255, 255, 255, 0.03);
}

.empty-icon.default i {
  color: #6b6b78;
}

.empty-icon.search {
  background: rgba(0, 240, 255, 0.08);
  border-color: rgba(0, 240, 255, 0.15);
}

.empty-icon.search i {
  color: #00f0ff;
}

.empty-icon.error {
  background: rgba(239, 68, 68, 0.08);
  border-color: rgba(239, 68, 68, 0.15);
}

.empty-icon.error i {
  color: #ef4444;
}

.empty-icon.config {
  background: rgba(139, 92, 246, 0.08);
  border-color: rgba(139, 92, 246, 0.15);
}

.empty-icon.config i {
  color: #8b5cf6;
}

.empty-icon.ai {
  background: linear-gradient(135deg, rgba(139, 92, 246, 0.1) 0%, rgba(0, 240, 255, 0.08) 100%);
  border-color: rgba(139, 92, 246, 0.2);
}

.empty-icon.ai i {
  color: #a78bfa;
}

/* 内容 */
.empty-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  max-width: 280px;
}

.empty-title {
  font-size: 15px;
  font-weight: 600;
  color: #8b8b9a;
  letter-spacing: -0.1px;
}

.empty-state.small .empty-title {
  font-size: 13px;
}

.empty-state.large .empty-title {
  font-size: 17px;
}

.empty-description {
  font-size: 13px;
  color: #5a5a68;
  line-height: 1.5;
}

.empty-state.small .empty-description {
  font-size: 12px;
}

.empty-state.large .empty-description {
  font-size: 14px;
}

/* 操作区 */
.empty-actions {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-top: 4px;
}

.empty-actions :deep(button) {
  padding: 8px 16px;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 8px;
  color: #8b8b9a;
  font-size: 13px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.empty-actions :deep(button:hover) {
  background: rgba(255, 255, 255, 0.08);
  color: #b0b0b8;
  border-color: rgba(255, 255, 255, 0.12);
}

.empty-actions :deep(button.primary) {
  background: rgba(0, 240, 255, 0.1);
  border-color: rgba(0, 240, 255, 0.2);
  color: #00f0ff;
}

.empty-actions :deep(button.primary:hover) {
  background: rgba(0, 240, 255, 0.15);
  border-color: rgba(0, 240, 255, 0.3);
}
</style>