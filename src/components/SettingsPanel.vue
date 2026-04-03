<template>
  <div class="settings-panel">
    <div class="settings-header">
      <h2 class="settings-title">设置</h2>
      <p class="settings-desc">配置终端外观和行为</p>
    </div>

    <div class="settings-content">
      <!-- 主题设置 -->
      <section class="settings-section">
        <div class="section-header">
          <i class="iconfont icon-theme section-icon"></i>
          <h3 class="section-title">终端主题</h3>
        </div>
        <div class="section-desc">选择终端的颜色主题，更改后立即生效</div>
        <div class="theme-grid">
          <div
            class="theme-card"
            v-for="theme in themeList"
            :key="theme.key"
            :class="{ active: currentTheme === theme.key }"
            @click="selectTheme(theme.key)"
          >
            <div class="theme-preview" :style="getThemePreviewStyle(theme.key)">
              <div class="preview-line">
                <span :style="{ color: getThemeColor(theme.key, 'green') }">$</span>
                <span :style="{ color: getThemeColor(theme.key, 'cyan') }">ls</span>
                <span :style="{ color: getThemeColor(theme.key, 'brightBlack') }">-la</span>
              </div>
              <div class="preview-line">
                <span :style="{ color: getThemeColor(theme.key, 'brightBlue') }">drwxr</span>
                <span :style="{ color: getThemeColor(theme.key, 'brightGreen') }">src/</span>
                <span :style="{ color: getThemeColor(theme.key, 'brightYellow') }">package.json</span>
              </div>
              <div class="preview-line">
                <span :style="{ color: getThemeColor(theme.key, 'brightCyan') }">-rw-r</span>
                <span :style="{ color: getThemeColor(theme.key, 'brightMagenta') }">README.md</span>
                <span :style="{ color: getThemeColor(theme.key, 'white') }">.gitignore</span>
              </div>
              <div class="preview-line">
                <span :style="{ color: getThemeColor(theme.key, 'red') }">error:</span>
                <span :style="{ color: getThemeColor(theme.key, 'brightRed') }">文件未找到</span>
              </div>
            </div>
            <div class="theme-info">
              <div class="theme-meta">
                <span class="theme-name">{{ theme.name }}</span>
                <span class="theme-desc" v-if="theme.description">{{ theme.description }}</span>
              </div>
              <span class="theme-check" v-if="currentTheme === theme.key">✓</span>
            </div>
          </div>
        </div>
      </section>

      <!-- 字体设置 -->
      <section class="settings-section">
        <div class="section-header">
          <i class="iconfont icon-terminal section-icon"></i>
          <h3 class="section-title">终端字体</h3>
        </div>
        <div class="section-desc">调整终端的字体大小和类型</div>
        <div class="setting-item">
          <label class="setting-label">字体大小</label>
          <div class="setting-control">
            <input type="range" min="10" max="24" :value="fontSize" @input="updateFontSize($event)" class="range-slider" />
            <span class="range-value">{{ fontSize }}px</span>
          </div>
        </div>
        <div class="setting-item">
          <label class="setting-label">字体族</label>
          <select :value="fontFamily" @change="updateFontFamily($event)" class="setting-select">
            <option value="'JetBrains Mono', monospace">JetBrains Mono</option>
            <option value="'Fira Code', monospace">Fira Code</option>
            <option value="'SF Mono', monospace">SF Mono</option>
            <option value="'Consolas', monospace">Consolas</option>
            <option value="'Courier New', monospace">Courier New</option>
          </select>
        </div>
      </section>

      <!-- 行为设置 -->
      <section class="settings-section">
        <div class="section-header">
          <i class="iconfont icon-bolt section-icon"></i>
          <h3 class="section-title">终端行为</h3>
        </div>
        <div class="section-desc">配置终端的交互行为</div>
        <div class="setting-item">
          <label class="setting-label">自动复制选中文本</label>
          <div class="toggle-switch" :class="{ active: autoCopy }" @click="toggleAutoCopy">
            <div class="toggle-slider"></div>
          </div>
        </div>
        <div class="setting-item">
          <label class="setting-label">光标闪烁</label>
          <div class="toggle-switch" :class="{ active: cursorBlink }" @click="toggleCursorBlink">
            <div class="toggle-slider"></div>
          </div>
        </div>
        <div class="setting-item">
          <label class="setting-label">光标样式</label>
          <select :value="cursorStyle" @change="updateCursorStyle($event)" class="setting-select">
            <option value="block">方块</option>
            <option value="underline">下划线</option>
            <option value="bar">竖线</option>
          </select>
        </div>
      </section>
    </div>

    <div class="settings-footer">
      <button class="reset-btn" @click="handleReset">
        <i class="iconfont icon-close"></i>
        <span>重置默认</span>
      </button>
      <div class="save-hint">更改自动保存</div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted } from 'vue'
import {
  initSettings,
  getSettings,
  updateSetting,
  resetSettings,
  getThemeList,
  getCurrentThemeName,
  settingsState
} from '../utils/settingsStore'
import { terminalThemes } from '../utils/themes'

// 初始化设置
onMounted(() => {
  initSettings()
})

// 获取设置
const settings = getSettings()

// 响应式获取设置值
const fontSize = computed(() => settings.fontSize)
const fontFamily = computed(() => settings.fontFamily)
const autoCopy = computed(() => settings.autoCopy)
const cursorBlink = computed(() => settings.cursorBlink)
const cursorStyle = computed(() => settings.cursorStyle)
const currentTheme = computed(() => getCurrentThemeName())
const themeList = getThemeList()

// 获取主题颜色
const getThemeColor = (themeKey: string, colorName: string) => {
  const theme = terminalThemes[themeKey]
  if (!theme) return '#ffffff'
  return theme[colorName] || theme.foreground
}

// 获取主题预览样式
const getThemePreviewStyle = (themeKey: string) => {
  const theme = terminalThemes[themeKey]
  if (!theme) return {}
  return {
    background: theme.background,
    borderColor: theme.black
  }
}

// 选择主题
const selectTheme = (themeKey: string) => {
  updateSetting('theme', themeKey)
}

// 更新字体大小
const updateFontSize = (event: Event) => {
  const value = parseInt((event.target as HTMLInputElement).value)
  updateSetting('fontSize', value)
}

// 更新字体族
const updateFontFamily = (event: Event) => {
  const value = (event.target as HTMLSelectElement).value
  updateSetting('fontFamily', value)
}

// 切换自动复制
const toggleAutoCopy = () => {
  updateSetting('autoCopy', !autoCopy.value)
}

// 切换光标闪烁
const toggleCursorBlink = () => {
  updateSetting('cursorBlink', !cursorBlink.value)
}

// 更新光标样式
const updateCursorStyle = (event: Event) => {
  const value = (event.target as HTMLSelectElement).value as 'block' | 'underline' | 'bar'
  updateSetting('cursorStyle', value)
}

// 重置设置
const handleReset = () => {
  resetSettings()
}
</script>

<style scoped>
.settings-panel {
  height: 100%;
  display: flex;
  flex-direction: column;
  background: linear-gradient(135deg, #0a0a0f 0%, #0f0f16 100%);
  overflow: hidden;
}

.settings-header {
  padding: 32px 40px 24px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
}

.settings-title {
  font-size: 24px;
  font-weight: 600;
  color: #e5e5e7;
  margin-bottom: 8px;
  letter-spacing: -0.5px;
}

.settings-desc {
  font-size: 13px;
  color: #6b6b78;
  letter-spacing: 0.3px;
}

.settings-content {
  flex: 1;
  overflow-y: auto;
  padding: 24px 40px;
}

.settings-content::-webkit-scrollbar {
  width: 6px;
}

.settings-content::-webkit-scrollbar-track {
  background: transparent;
}

.settings-content::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.1);
  border-radius: 3px;
}

.settings-content::-webkit-scrollbar-thumb:hover {
  background: rgba(0, 240, 255, 0.3);
}

.settings-section {
  margin-bottom: 32px;
}

.section-header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 8px;
}

.section-icon {
  font-size: 18px;
  color: #00f0ff;
  filter: drop-shadow(0 0 8px rgba(0, 240, 255, 0.3));
}

.section-title {
  font-size: 16px;
  font-weight: 600;
  color: #e5e5e7;
}

.section-desc {
  font-size: 12px;
  color: #5a5a68;
  margin-bottom: 20px;
  padding-left: 30px;
}

/* 主题网格 */
.theme-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
  gap: 16px;
}

.theme-card {
  background: rgba(255, 255, 255, 0.02);
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 12px;
  padding: 12px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.theme-card:hover {
  background: rgba(255, 255, 255, 0.04);
  border-color: rgba(255, 255, 255, 0.1);
  transform: translateY(-2px);
}

.theme-card.active {
  background: rgba(0, 240, 255, 0.08);
  border-color: rgba(0, 240, 255, 0.25);
  box-shadow: 0 4px 20px rgba(0, 240, 255, 0.15);
}

.theme-preview {
  height: 80px;
  border-radius: 8px;
  padding: 8px 10px;
  margin-bottom: 12px;
  font-family: 'JetBrains Mono', monospace;
  font-size: 10px;
  display: flex;
  flex-direction: column;
  gap: 4px;
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.preview-line {
  display: flex;
  align-items: center;
  gap: 6px;
}

.theme-info {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.theme-meta {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.theme-name {
  font-size: 13px;
  color: #8b8b9a;
  font-weight: 500;
}

.theme-desc {
  font-size: 10px;
  color: #5a5a68;
}

.theme-card.active .theme-name {
  color: #00f0ff;
}

.theme-card.active .theme-desc {
  color: #6b8b9a;
}

.theme-check {
  font-size: 14px;
  color: #00f0ff;
  font-weight: 600;
}

/* 设置项 */
.setting-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  background: rgba(255, 255, 255, 0.02);
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 10px;
  margin-bottom: 12px;
  transition: all 0.2s ease;
}

.setting-item:hover {
  background: rgba(255, 255, 255, 0.04);
  border-color: rgba(255, 255, 255, 0.08);
}

.setting-label {
  font-size: 14px;
  color: #e5e5e7;
  font-weight: 500;
}

.setting-control {
  display: flex;
  align-items: center;
  gap: 12px;
}

.range-slider {
  width: 120px;
  height: 4px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 2px;
  appearance: none;
  cursor: pointer;
}

.range-slider::-webkit-slider-thumb {
  appearance: none;
  width: 16px;
  height: 16px;
  background: #00f0ff;
  border-radius: 50%;
  cursor: pointer;
  box-shadow: 0 0 10px rgba(0, 240, 255, 0.4);
  transition: all 0.2s ease;
}

.range-slider::-webkit-slider-thumb:hover {
  transform: scale(1.2);
  box-shadow: 0 0 15px rgba(0, 240, 255, 0.6);
}

.range-value {
  font-size: 13px;
  color: #00f0ff;
  font-weight: 500;
  min-width: 40px;
  text-align: right;
}

.setting-select {
  padding: 8px 12px;
  background: rgba(13, 13, 18, 0.95);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 6px;
  color: #e5e5e7;
  font-size: 13px;
  cursor: pointer;
  outline: none;
  transition: all 0.2s ease;
}

.setting-select:hover {
  background: rgba(18, 18, 26, 0.95);
  border-color: rgba(0, 240, 255, 0.2);
}

.setting-select:focus {
  border-color: rgba(0, 240, 255, 0.3);
  box-shadow: 0 0 0 2px rgba(0, 240, 255, 0.1);
}

.setting-select option {
  background: #12121a;
  color: #e5e5e7;
  padding: 8px 12px;
}

/* 开关 */
.toggle-switch {
  width: 44px;
  height: 24px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  cursor: pointer;
  position: relative;
  transition: all 0.3s ease;
}

.toggle-switch.active {
  background: rgba(0, 240, 255, 0.2);
}

.toggle-slider {
  position: absolute;
  top: 3px;
  left: 3px;
  width: 18px;
  height: 18px;
  background: #6b6b78;
  border-radius: 50%;
  transition: all 0.3s ease;
}

.toggle-switch.active .toggle-slider {
  left: 23px;
  background: #00f0ff;
  box-shadow: 0 0 10px rgba(0, 240, 255, 0.5);
}

/* 底部 */
.settings-footer {
  padding: 20px 40px;
  border-top: 1px solid rgba(255, 255, 255, 0.06);
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.reset-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 20px;
  background: rgba(255, 95, 87, 0.08);
  border: 1px solid rgba(255, 95, 87, 0.2);
  border-radius: 8px;
  color: #ff5f57;
  font-size: 13px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.reset-btn:hover {
  background: rgba(255, 95, 87, 0.15);
  border-color: rgba(255, 95, 87, 0.3);
}

.reset-btn .iconfont {
  font-size: 14px;
}

.save-hint {
  font-size: 12px;
  color: #5a5a68;
}
</style>