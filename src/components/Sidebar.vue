<template>
  <div class="sidebar" :class="{ collapsed: isCollapsed }">
    <div class="sidebar-header">
      <div class="logo">
        <div class="logo-icon">
          <div class="logo-shine"></div>
        </div>
        <div class="logo-text" v-show="!isCollapsed">
          神经<span class="logo-accent">终端</span>
        </div>
      </div>
      <div class="version" v-show="!isCollapsed">v4.0.2-测试版</div>
      <button class="collapse-btn" @click="toggleCollapse" :title="isCollapsed ? '展开' : '折叠'">
        <i class="iconfont" :class="isCollapsed ? 'icon-expand' : 'icon-collapse'"></i>
      </button>
    </div>

    <nav class="nav-menu">
      <div
        v-for="item in menuItems"
        :key="item.id"
        class="nav-item"
        :class="{ active: activeTab === item.id }"
        @click="$emit('tab-change', item.id)"
        :title="isCollapsed ? item.label : ''"
      >
        <div class="nav-indicator" v-if="activeTab === item.id"></div>
        <i class="iconfont nav-icon" :class="item.icon"></i>
        <span class="nav-label" v-show="!isCollapsed">{{ item.label }}</span>
      </div>
    </nav>

    <div class="sidebar-footer">
      <div class="footer-menu">
        <div class="footer-item" :title="isCollapsed ? '帮助' : ''">
          <i class="iconfont icon-help"></i>
          <span v-show="!isCollapsed">帮助</span>
        </div>
        <div class="footer-item" :title="isCollapsed ? '日志' : ''">
          <i class="iconfont icon-logs"></i>
          <span v-show="!isCollapsed">日志</span>
        </div>
      </div>
      <div class="user-profile">
        <div class="user-avatar">
          <i class="iconfont icon-user"></i>
          <div class="avatar-status"></div>
        </div>
        <div class="user-info" v-show="!isCollapsed">
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

defineEmits(['tab-change'])

const isCollapsed = ref(false)

const toggleCollapse = () => {
  isCollapsed.value = !isCollapsed.value
}

const menuItems = ref([
  { id: 'terminal', label: '终端', icon: 'icon-terminal' },
  { id: 'assistant', label: '助手', icon: 'icon-assistant' },
  { id: 'ssh', label: 'SSH连接', icon: 'icon-ssh' },
  { id: 'settings', label: '设置', icon: 'icon-settings' }
])
</script>

<style scoped>
.sidebar {
  display: flex;
  flex-direction: column;
  width: 260px;
  background: linear-gradient(180deg, #12121a 0%, #0a0a0f 100%);
  border-right: 1px solid rgba(255, 255, 255, 0.06);
  padding: 20px 16px;
  transition: width 0.35s cubic-bezier(0.4, 0, 0.2, 1), padding 0.35s cubic-bezier(0.4, 0, 0.2, 1);
  position: relative;
}

.sidebar::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 1px;
  background: linear-gradient(90deg, transparent, rgba(0, 240, 255, 0.15), transparent);
  pointer-events: none;
}

.sidebar.collapsed {
  width: 72px;
  padding: 20px 12px;
}

.sidebar-header {
  margin-bottom: 28px;
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 8px;
}

.sidebar.collapsed .sidebar-header {
  flex-direction: column;
  align-items: center;
  gap: 12px;
}

.logo {
  display: flex;
  align-items: center;
  gap: 10px;
}

.sidebar.collapsed .logo {
  justify-content: center;
}

.logo-icon {
  width: 36px;
  height: 36px;
  background: linear-gradient(135deg, #00f0ff 0%, #3b82f6 50%, #8b5cf6 100%);
  border-radius: 10px;
  position: relative;
  flex-shrink: 0;
  box-shadow: 0 4px 16px rgba(0, 240, 255, 0.25), 0 0 0 1px rgba(0, 240, 255, 0.1) inset;
  overflow: hidden;
}

.logo-shine {
  position: absolute;
  top: -50%;
  left: -50%;
  width: 200%;
  height: 200%;
  background: linear-gradient(45deg, transparent, rgba(255, 255, 255, 0.25), transparent);
  transform: rotate(45deg);
  animation: shine 3s ease-in-out infinite;
}

@keyframes shine {
  0%, 100% { transform: translateX(-50%) rotate(45deg); }
  50% { transform: translateX(50%) rotate(45deg); }
}

.logo-icon::after {
  content: '';
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 14px;
  height: 14px;
  background: linear-gradient(135deg, #0a0a0f 0%, #12121a 100%);
  border-radius: 4px;
  box-shadow: 0 0 0 1px rgba(255, 255, 255, 0.1);
}

.logo-text {
  font-size: 20px;
  font-weight: 700;
  color: #f5f5f7;
  letter-spacing: -0.5px;
  white-space: nowrap;
}

.logo-accent {
  background: linear-gradient(135deg, #00f0ff 0%, #3b82f6 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.version {
  font-size: 11px;
  color: #6b6b78;
  margin-left: 46px;
  letter-spacing: 0.5px;
  white-space: nowrap;
  padding: 2px 8px;
  background: rgba(255, 255, 255, 0.03);
  border-radius: 4px;
  border: 1px solid rgba(255, 255, 255, 0.05);
}

.sidebar.collapsed .version {
  margin-left: 0;
  display: none;
}

.collapse-btn {
  width: 28px;
  height: 28px;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.05);
  border-radius: 6px;
  color: #8b8b9a;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
}

.collapse-btn:hover {
  background: rgba(0, 240, 255, 0.1);
  color: #00f0ff;
  border-color: rgba(0, 240, 255, 0.2);
  transform: scale(1.05);
}

.collapse-btn .iconfont {
  font-size: 14px;
}

.nav-menu {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 8px 0;
}

.nav-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 14px;
  border-radius: 10px;
  cursor: pointer;
  transition: all 0.2s ease;
  position: relative;
  color: #8b8b9a;
}

.nav-item::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  border-radius: 10px;
  background: linear-gradient(135deg, rgba(0, 240, 255, 0.04), rgba(59, 130, 246, 0.02));
  opacity: 0;
  transition: opacity 0.2s ease;
  pointer-events: none;
}

.nav-item:hover {
  color: #e5e5e7;
  transform: translateX(2px);
}

.nav-item:hover::before {
  opacity: 1;
}

.nav-item.active {
  color: #00f0ff;
  background: linear-gradient(135deg, rgba(0, 240, 255, 0.12) 0%, rgba(59, 130, 246, 0.06) 100%);
  box-shadow: 0 4px 16px rgba(0, 240, 255, 0.1), inset 0 0 0 1px rgba(0, 240, 255, 0.15);
}

.nav-indicator {
  position: absolute;
  left: -8px;
  top: 50%;
  transform: translateY(-50%);
  width: 4px;
  height: 24px;
  background: linear-gradient(180deg, #00f0ff 0%, #3b82f6 100%);
  border-radius: 2px;
  box-shadow: 0 0 12px rgba(0, 240, 255, 0.5);
}

.nav-icon {
  font-size: 18px;
  z-index: 1;
  filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.3));
}

.nav-item.active .nav-icon {
  filter: drop-shadow(0 0 8px rgba(0, 240, 255, 0.5));
}

.nav-label {
  font-size: 14px;
  font-weight: 500;
  letter-spacing: 0.2px;
  z-index: 1;
}

.sidebar-footer {
  margin-top: auto;
  padding-top: 16px;
  border-top: 1px solid rgba(255, 255, 255, 0.05);
}

.footer-menu {
  display: flex;
  gap: 8px;
  margin-bottom: 16px;
}

.footer-item {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 10px 12px;
  border-radius: 8px;
  color: #6b6b78;
  font-size: 13px;
  cursor: pointer;
  transition: all 0.2s ease;
  background: rgba(255, 255, 255, 0.02);
  border: 1px solid transparent;
}

.footer-item:hover {
  color: #00f0ff;
  background: rgba(0, 240, 255, 0.05);
  border-color: rgba(0, 240, 255, 0.1);
}

.user-profile {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  background: rgba(255, 255, 255, 0.02);
  border-radius: 12px;
  border: 1px solid rgba(255, 255, 255, 0.04);
  transition: all 0.2s ease;
}

.user-profile:hover {
  background: rgba(255, 255, 255, 0.03);
  border-color: rgba(255, 255, 255, 0.08);
}

.sidebar.collapsed .user-profile {
  justify-content: center;
  padding: 12px 8px;
}

.user-avatar {
  width: 40px;
  height: 40px;
  background: linear-gradient(135deg, #28ca41 0%, #16a34a 100%);
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  flex-shrink: 0;
  box-shadow: 0 4px 12px rgba(40, 202, 65, 0.25);
}

.user-avatar .iconfont {
  font-size: 20px;
  color: #fff;
}

.avatar-status {
  position: absolute;
  bottom: 2px;
  right: 2px;
  width: 12px;
  height: 12px;
  background: #28ca41;
  border-radius: 50%;
  border: 2px solid #0a0a0f;
  box-shadow: 0 0 8px rgba(40, 202, 65, 0.6);
}

.user-info {
  flex: 1;
  min-width: 0;
}

.user-name {
  font-size: 14px;
  font-weight: 600;
  color: #e5e5e7;
  margin-bottom: 2px;
}

.user-status {
  font-size: 12px;
  color: #28ca41;
}
</style>
