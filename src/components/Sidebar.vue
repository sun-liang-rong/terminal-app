<template>
  <div class="sidebar">
    <div class="sidebar-header">
      <div class="logo">
        <div class="logo-icon"></div>
        <span class="logo-text">神经<span class="logo-accent">终端</span></span>
      </div>
      <div class="version">v4.0.2-测试版</div>
    </div>

    <button class="new-thread-btn" @click="$emit('new-session')">
      <span class="plus-icon">+</span>
      新建会话
    </button>

    <nav class="nav-menu">
      <div
        v-for="item in menuItems"
        :key="item.id"
        class="nav-item"
        :class="{ active: activeTab === item.id }"
        @click="$emit('tab-change', item.id)"
      >
        <span class="nav-icon" :class="`icon-${item.id}`"></span>
        <span class="nav-label">{{ item.label }}</span>
      </div>
    </nav>

    <div class="sidebar-footer">
      <div class="footer-menu">
        <div class="footer-item">
          <span class="footer-icon icon-help"></span>
          <span>帮助</span>
        </div>
        <div class="footer-item">
          <span class="footer-icon icon-logs"></span>
          <span>日志</span>
        </div>
      </div>
      <div class="user-profile">
        <div class="user-avatar"></div>
        <div class="user-info">
          <div class="user-name">管理员</div>
          <div class="user-status">已验证节点</div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'

const props = defineProps({
  activeTab: {
    type: String,
    default: 'terminal'
  }
})

defineEmits(['tab-change', 'new-session'])

const menuItems = ref([
  { id: 'terminal', label: '终端' },
  { id: 'assistant', label: '助手' },
  { id: 'explorer', label: '资源管理器' },
  { id: 'debugger', label: '调试器' },
  { id: 'settings', label: '设置' }
])
</script>

<style scoped>
.sidebar {
  display: flex;
  flex-direction: column;
  width: 240px;
  background: #15151b;
  border-right: 1px solid #23232c;
  padding: 16px;
}

.sidebar-header {
  margin-bottom: 24px;
}

.logo {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 4px;
}

.logo-icon {
  width: 28px;
  height: 28px;
  background: linear-gradient(135deg, #00f0ff 0%, #3b82f6 100%);
  border-radius: 4px;
  position: relative;
}

.logo-icon::after {
  content: '';
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 12px;
  height: 12px;
  background: #0f0f14;
  border-radius: 2px;
}

.logo-text {
  font-size: 18px;
  font-weight: 600;
  color: #e0e0e0;
  letter-spacing: -0.5px;
}

.logo-accent {
  color: #00f0ff;
}

.version {
  font-size: 11px;
  color: #6b6b78;
  margin-left: 36px;
  letter-spacing: 0.5px;
}

.new-thread-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  width: 100%;
  padding: 12px 16px;
  background: linear-gradient(135deg, #00f0ff 0%, #00d4ff 100%);
  border: none;
  border-radius: 6px;
  font-size: 12px;
  font-weight: 600;
  color: #0f0f14;
  cursor: pointer;
  margin-bottom: 16px;
  letter-spacing: 0.5px;
  transition: transform 0.15s ease, box-shadow 0.15s ease;
}

.new-thread-btn:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(0, 240, 255, 0.3);
}

.plus-icon {
  font-size: 16px;
  font-weight: 400;
}

.nav-menu {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.nav-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 12px;
  border-radius: 6px;
  cursor: pointer;
  transition: background 0.15s ease;
  position: relative;
}

.nav-item:hover {
  background: rgba(255, 255, 255, 0.03);
}

.nav-item.active {
  background: linear-gradient(90deg, rgba(0, 240, 255, 0.1) 0%, transparent 100%);
  border-left: 2px solid #00f0ff;
  padding-left: 10px;
}

.nav-item.active::before {
  content: '';
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  width: 2px;
  background: #00f0ff;
}

.nav-icon {
  width: 18px;
  height: 18px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.icon-terminal::before {
  content: '▸';
  color: #00f0ff;
  font-size: 14px;
}

.icon-assistant::before {
  content: '◉';
  color: #6b6b78;
  font-size: 10px;
}

.icon-explorer::before {
  content: '📁';
  font-size: 14px;
}

.icon-debugger::before {
  content: '⚙';
  color: #6b6b78;
  font-size: 14px;
}

.icon-settings::before {
  content: '⚙';
  color: #6b6b78;
  font-size: 14px;
}

.nav-item.active .nav-icon::before {
  color: #00f0ff;
}

.nav-label {
  font-size: 12px;
  font-weight: 500;
  color: #6b6b78;
  letter-spacing: 0.3px;
}

.nav-item.active .nav-label {
  color: #e0e0e0;
}

.sidebar-footer {
  margin-top: auto;
  padding-top: 16px;
  border-top: 1px solid #23232c;
}

.footer-menu {
  display: flex;
  flex-direction: column;
  gap: 4px;
  margin-bottom: 16px;
}

.footer-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 12px;
  border-radius: 4px;
  font-size: 11px;
  color: #6b6b78;
  cursor: pointer;
  transition: background 0.15s ease;
}

.footer-item:hover {
  background: rgba(255, 255, 255, 0.03);
}

.footer-icon {
  width: 16px;
  height: 16px;
}

.icon-help::before {
  content: '?';
  color: #6b6b78;
  font-size: 12px;
  font-weight: 600;
}

.icon-logs::before {
  content: '📋';
  font-size: 12px;
}

.user-profile {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 12px;
}

.user-avatar {
  width: 32px;
  height: 32px;
  background: linear-gradient(135deg, #00f0ff 0%, #3b82f6 100%);
  border-radius: 6px;
  position: relative;
}

.user-avatar::after {
  content: '👤';
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  font-size: 16px;
}

.user-info {
  display: flex;
  flex-direction: column;
}

.user-name {
  font-size: 12px;
  font-weight: 600;
  color: #e0e0e0;
}

.user-status {
  font-size: 10px;
  color: #6b6b78;
}
</style>