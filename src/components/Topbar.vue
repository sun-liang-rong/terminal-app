<template>
  <div class="topbar">
    <div class="topbar-left">
      <div class="window-controls">
        <div class="control-btn close"></div>
        <div class="control-btn minimize"></div>
        <div class="control-btn maximize"></div>
      </div>
      <div class="app-title">
        <span class="title-prefix">📺</span>
        <span class="title-main">神经终端</span>
        <span class="title-separator">—</span>
        <span class="title-file">main.sh</span>
      </div>
    </div>

    <div class="search-container">
      <div class="search-box">
        <span class="search-icon">🔍</span>
        <input type="text" placeholder="搜索进程..." class="search-input" />
      </div>
    </div>

    <div class="topbar-right">
      <button class="action-btn">
        <span>⟨⟩</span>
      </button>
      <button class="action-btn menu-btn">
        <span class="menu-dots">⋮</span>
      </button>
    </div>
  </div>
</template>

<script setup>
</script>

<style scoped>
.topbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 44px;
  background: #15151b;
  border-bottom: 1px solid #23232c;
  padding: 0 16px;
  -webkit-app-region: drag;
}

.topbar-left,
.topbar-right {
  display: flex;
  align-items: center;
  gap: 12px;
  -webkit-app-region: no-drag;
}

.window-controls {
  display: flex;
  gap: 8px;
  margin-right: 16px;
}

.control-btn {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  cursor: pointer;
  transition: opacity 0.15s ease;
}

.control-btn:hover {
  opacity: 0.8;
}

.control-btn.close {
  background: #ff5f57;
}

.control-btn.minimize {
  background: #ffbd2e;
}

.control-btn.maximize {
  background: #28ca41;
}

.app-title {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  color: #9b9ba5;
}

.title-prefix {
  font-size: 12px;
}

.title-main {
  font-weight: 500;
  color: #e0e0e0;
}

.title-separator {
  color: #5a5a68;
}

.title-file {
  color: #00f0ff;
}

.search-container {
  flex: 1;
  display: flex;
  justify-content: center;
  max-width: 400px;
  -webkit-app-region: no-drag;
}

.search-box {
  display: flex;
  align-items: center;
  width: 100%;
  height: 32px;
  background: #0d0d12;
  border: 1px solid #23232c;
  border-radius: 6px;
  padding: 0 12px;
  gap: 8px;
}

.search-icon {
  font-size: 12px;
  opacity: 0.6;
}

.search-input {
  flex: 1;
  background: transparent;
  border: none;
  outline: none;
  color: #e0e0e0;
  font-size: 12px;
  letter-spacing: 0.3px;
}

.search-input::placeholder {
  color: #5a5a68;
}

.action-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  background: transparent;
  border: none;
  border-radius: 6px;
  color: #9b9ba5;
  font-size: 14px;
  cursor: pointer;
  transition: background 0.15s ease;
}

.action-btn:hover {
  background: rgba(255, 255, 255, 0.05);
}

.menu-dots {
  font-size: 18px;
  line-height: 1;
  letter-spacing: 2px;
}
</style>