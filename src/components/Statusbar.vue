<template>
  <div class="statusbar">
    <div class="status-left">
      <span class="status-item connected">
        <i class="iconfont icon-dot status-icon"></i>
        <span>已连接</span>
      </span>
      <span class="status-item">
        <i class="iconfont icon-bolt status-icon"></i>
        <span>PTY: zsh</span>
      </span>
      <div class="status-divider"></div>
      <span class="status-item">
        <i class="iconfont icon-terminal status-icon"></i>
        <span>4 会话</span>
      </span>
    </div>
    <div class="status-right">
      <span class="status-item">
        <i class="iconfont icon-language status-icon"></i>
        <span>bash</span>
      </span>
      <span class="status-item">
        <i class="iconfont icon-encoding status-icon"></i>
        <span>UTF-8</span>
      </span>
      <span class="status-item">
        <i class="iconfont icon-size status-icon"></i>
        <span>80×24</span>
      </span>
      <span class="status-item time-item">
        <i class="iconfont icon-time status-icon"></i>
        <span>{{ currentTime }}</span>
      </span>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'

const currentTime = ref('')
let timeInterval = null

const updateTime = () => {
  const now = new Date()
  currentTime.value = now.toLocaleTimeString('zh-CN', { 
    hour: '2-digit', 
    minute: '2-digit',
    hour12: false
  })
}

onMounted(() => {
  updateTime()
  timeInterval = setInterval(updateTime, 1000)
})

onUnmounted(() => {
  if (timeInterval) {
    clearInterval(timeInterval)
  }
})
</script>

<style scoped>
.statusbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 32px;
  background: linear-gradient(180deg, #0f0f14 0%, #0a0a0f 100%);
  border-top: 1px solid rgba(255, 255, 255, 0.06);
  padding: 0 16px;
  font-size: 11px;
  color: #6b6b78;
  position: relative;
}

.statusbar::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 1px;
  background: linear-gradient(90deg, transparent, rgba(0, 240, 255, 0.08), transparent);
  pointer-events: none;
}

.status-left,
.status-right {
  display: flex;
  align-items: center;
  gap: 12px;
}

.status-item {
  display: flex;
  align-items: center;
  gap: 5px;
  padding: 3px 8px;
  border-radius: 4px;
  transition: all 0.2s ease;
  cursor: default;
}

.status-item:hover {
  background: rgba(255, 255, 255, 0.03);
  color: #8b8b9a;
}

.status-item.connected {
  color: #28ca41;
}

.status-icon {
  font-size: 10px;
  filter: drop-shadow(0 0 4px rgba(0, 240, 255, 0.2));
}

.status-item.connected .status-icon {
  filter: drop-shadow(0 0 6px rgba(40, 202, 65, 0.5));
  animation: blink 2s ease-in-out infinite;
}

@keyframes blink {
  0%, 100% {
    opacity: 1;
  }
  50% {
    opacity: 0.5;
  }
}

.status-divider {
  width: 1px;
  height: 16px;
  background: linear-gradient(180deg, transparent, rgba(255, 255, 255, 0.1), transparent);
}

.time-item {
  background: rgba(0, 240, 255, 0.05);
  border: 1px solid rgba(0, 240, 255, 0.1);
  color: #00f0ff;
}

.time-item:hover {
  background: rgba(0, 240, 255, 0.1);
  border-color: rgba(0, 240, 255, 0.2);
}
</style>
