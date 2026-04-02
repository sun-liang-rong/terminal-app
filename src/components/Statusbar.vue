<template>
  <div class="statusbar">
    <div class="status-left">
      <span class="status-item">
        <span class="status-icon">●</span>
        <span>已连接</span>
      </span>
      <span class="status-item">
        <span class="status-icon">⚡</span>
        <span>PTY: zsh</span>
      </span>
    </div>
    <div class="status-right">
      <span class="status-item">
        <span>bash</span>
      </span>
      <span class="status-item">
        <span>UTF-8</span>
      </span>
      <span class="status-item">
        <span>80×24</span>
      </span>
    </div>
  </div>
</template>

<script setup>
</script>

<style scoped>
.statusbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 28px;
  background: #15151b;
  border-top: 1px solid #23232c;
  padding: 0 16px;
  font-size: 11px;
  color: #6b6b78;
}

.status-left,
.status-right {
  display: flex;
  align-items: center;
  gap: 16px;
}

.status-item {
  display: flex;
  align-items: center;
  gap: 6px;
}

.status-icon {
  color: #28ca41;
  font-size: 8px;
}
</style>