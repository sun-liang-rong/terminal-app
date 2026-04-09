<template>
  <div class="settings-panel">
    <!-- 头部 + 搜索 -->
    <div class="settings-header">
      <h2 class="settings-title">设置</h2>
      <div class="search-wrapper">
        <i class="iconfont icon-search"></i>
        <input
          type="text"
          v-model="searchQuery"
          class="settings-search"
          placeholder="搜索设置..."
        />
        <kbd v-if="!searchQuery">/</kbd>
      </div>
    </div>

    <div class="settings-content">
      <!-- 主题设置 -->
      <section class="settings-section" v-show="matchesSearch('主题 外观 颜色')">
        <div class="section-header">
          <i class="iconfont icon-theme section-icon"></i>
          <h3 class="section-title">终端主题</h3>
          <span class="section-badge">{{ themeList.length }} 个主题</span>
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
              <div class="preview-header">
                <span class="preview-dot" :style="{ background: getThemeColor(theme.key, 'red') }"></span>
                <span class="preview-dot" :style="{ background: getThemeColor(theme.key, 'yellow') }"></span>
                <span class="preview-dot" :style="{ background: getThemeColor(theme.key, 'green') }"></span>
                <span class="preview-title">{{ theme.name }}</span>
              </div>
              <div class="preview-content">
                <div class="preview-line">
                  <span class="prompt" :style="{ color: getThemeColor(theme.key, 'green') }">→</span>
                  <span :style="{ color: getThemeColor(theme.key, 'cyan') }">npm</span>
                  <span :style="{ color: getThemeColor(theme.key, 'white') }">run dev</span>
                </div>
                <div class="preview-line">
                  <span :style="{ color: getThemeColor(theme.key, 'brightBlue') }">✓</span>
                  <span :style="{ color: getThemeColor(theme.key, 'brightGreen') }">Compiled</span>
                  <span :style="{ color: getThemeColor(theme.key, 'brightBlack') }">successfully</span>
                </div>
                <div class="preview-line">
                  <span :style="{ color: getThemeColor(theme.key, 'brightYellow') }">⚡</span>
                  <span :style="{ color: getThemeColor(theme.key, 'magenta') }">Ready</span>
                  <span :style="{ color: getThemeColor(theme.key, 'cyan') }">in 2.3s</span>
                </div>
              </div>
            </div>
            <div class="theme-check" v-if="currentTheme === theme.key">
              <i class="iconfont icon-check"></i>
            </div>
          </div>
        </div>
      </section>

      <!-- AI 模型配置 -->
      <section class="settings-section" v-show="matchesSearch('AI 模型 模型配置 GPT Claude')">
        <div class="section-header">
          <i class="iconfont icon-robot section-icon"></i>
          <h3 class="section-title">AI 模型配置</h3>
          <span class="section-badge">{{ aiModels.length }} 个模型</span>
        </div>
        <div class="section-desc">配置 AI 模型，支持 OpenAI、Claude、Ollama 等</div>

        <!-- 模型列表 -->
        <div class="models-list">
          <div
            v-for="model in aiModels"
            :key="model.id"
            class="model-card"
            :class="{ active: currentModelId === model.id }"
            @click="selectModel(model.id)"
          >
            <div class="model-info">
              <span class="model-name">{{ model.name }}</span>
              <span class="model-provider">{{ getProviderLabel(model.provider) }}</span>
            </div>
            <div class="model-actions">
              <button class="model-btn edit" @click.stop="editModel(model)" title="编辑">
                <i class="iconfont icon-edit"></i>
              </button>
              <button class="model-btn delete" @click.stop="deleteModel(model.id)" title="删除" v-if="aiModels.length > 1">
                <i class="iconfont icon-delete"></i>
              </button>
            </div>
          </div>
        </div>

        <!-- 添加模型按钮 -->
        <button class="add-model-btn" @click="openAddModal">
          <i class="iconfont icon-add"></i>
          <span>添加模型</span>
        </button>

        <!-- 添加/编辑模型弹窗 -->
        <div class="modal-overlay" v-if="showModelModal" @click.self="closeModelModal">
          <div class="model-modal">
            <div class="modal-header">
              <h4>{{ editingModel ? '编辑模型' : '添加模型' }}</h4>
              <button class="close-btn" @click="closeModelModal">
                <i class="iconfont icon-close"></i>
              </button>
            </div>
            <div class="modal-body">
              <div class="form-group">
                <label>模型名称</label>
                <input
                  type="text"
                  v-model="modelForm.name"
                  placeholder="例如：GPT-4o"
                />
              </div>
              <div class="form-group">
                <label>提供商</label>
                <div class="provider-options">
                  <button
                    v-for="provider in providerOptions"
                    :key="provider.value"
                    class="provider-btn"
                    :class="{ active: modelForm.provider === provider.value }"
                    @click="modelForm.provider = provider.value as 'openai' | 'claude' | 'ollama' | 'custom'"
                  >
                    {{ provider.label }}
                  </button>
                </div>
              </div>
              <div class="form-group">
                <label>模型 ID</label>
                <input
                  type="text"
                  v-model="modelForm.model"
                  placeholder="例如：gpt-4o"
                />
                <div class="form-hint">
                  <span v-if="modelForm.provider === 'openai'">常用：gpt-4o, gpt-4o-mini, gpt-4-turbo</span>
                  <span v-else-if="modelForm.provider === 'claude'">常用：claude-3-5-sonnet-20241022, claude-3-opus-20240229</span>
                  <span v-else-if="modelForm.provider === 'ollama'">常用：llama3, llama3.1, qwen2, mistral</span>
                  <span v-else>请输入模型 ID</span>
                </div>
              </div>
              <div class="form-group" v-if="modelForm.provider !== 'ollama'">
                <label>API Key</label>
                <input
                  type="password"
                  v-model="modelForm.apiKey"
                  placeholder="sk-..."
                />
              </div>
              <div class="form-group">
                <label>Base URL (可选)</label>
                <input
                  type="text"
                  v-model="modelForm.baseUrl"
                  :placeholder="modelForm.provider === 'ollama' ? 'http://localhost:11434' : 'https://api.openai.com/v1'"
                />
              </div>
            </div>
            <div class="modal-footer">
              <button class="btn secondary" @click="closeModelModal">取消</button>
              <button class="btn primary" @click="saveModel">保存</button>
            </div>
          </div>
        </div>
      </section>

      <!-- 字体设置 -->
      <section class="settings-section" v-show="matchesSearch('字体 大小 类型')">
        <div class="section-header">
          <i class="iconfont icon-font section-icon"></i>
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
          <div class="custom-select-wrapper">
            <button class="custom-select-trigger" @click="showFontDropdown = !showFontDropdown">
              <span>{{ getFontDisplayName(fontFamily) }}</span>
              <i class="iconfont icon-chevron-down"></i>
            </button>
            <Transition name="dropdown">
              <div class="custom-select-dropdown" v-if="showFontDropdown">
                <div
                  class="select-option"
                  v-for="font in fontOptions"
                  :key="font.value"
                  :class="{ active: fontFamily === font.value }"
                  @click="selectFont(font.value)"
                >
                  <span class="option-preview" :style="{ fontFamily: font.value }">Aa</span>
                  <span class="option-name">{{ font.label }}</span>
                  <i class="iconfont icon-check" v-if="fontFamily === font.value"></i>
                </div>
              </div>
            </Transition>
          </div>
        </div>
      </section>

      <!-- 行为设置 -->
      <section class="settings-section" v-show="matchesSearch('行为 光标 复制 自动')">
        <div class="section-header">
          <i class="iconfont icon-behavior section-icon"></i>
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
          <div class="custom-select-wrapper">
            <button class="custom-select-trigger small" @click="showCursorDropdown = !showCursorDropdown">
              <span>{{ cursorStyleLabels[cursorStyle] }}</span>
              <i class="iconfont icon-chevron-down"></i>
            </button>
            <Transition name="dropdown">
              <div class="custom-select-dropdown small" v-if="showCursorDropdown">
                <div
                  class="select-option"
                  v-for="(label, key) in cursorStyleLabels"
                  :key="key"
                  :class="{ active: cursorStyle === key }"
                  @click="selectCursorStyle(key as 'block' | 'underline' | 'bar')"
                >
                  <span class="cursor-preview" :class="'cursor-' + key"></span>
                  <span class="option-name">{{ label }}</span>
                  <i class="iconfont icon-check" v-if="cursorStyle === key"></i>
                </div>
              </div>
            </Transition>
          </div>
        </div>
      </section>

      <!-- 布局设置 -->
      <section class="settings-section" v-show="matchesSearch('布局 侧边栏 紧凑 主题色')">
        <div class="section-header">
          <i class="iconfont icon-layout section-icon"></i>
          <h3 class="section-title">布局设置</h3>
        </div>
        <div class="section-desc">自定义应用布局</div>
        <div class="setting-item">
          <label class="setting-label">侧边栏位置</label>
          <div class="custom-select-wrapper">
            <button class="custom-select-trigger small" @click="showLayoutDropdown = !showLayoutDropdown">
              <span>{{ layoutState.sidebarPosition === 'left' ? '左侧' : '右侧' }}</span>
              <i class="iconfont icon-chevron-down"></i>
            </button>
            <Transition name="dropdown">
              <div class="custom-select-dropdown small" v-if="showLayoutDropdown">
                <div
                  class="select-option"
                  :class="{ active: layoutState.sidebarPosition === 'left' }"
                  @click="updateLayoutSetting('sidebarPosition', 'left'); showLayoutDropdown = false"
                >
                  <span class="option-name">左侧</span>
                  <i class="iconfont icon-check" v-if="layoutState.sidebarPosition === 'left'"></i>
                </div>
                <div
                  class="select-option"
                  :class="{ active: layoutState.sidebarPosition === 'right' }"
                  @click="updateLayoutSetting('sidebarPosition', 'right'); showLayoutDropdown = false"
                >
                  <span class="option-name">右侧</span>
                  <i class="iconfont icon-check" v-if="layoutState.sidebarPosition === 'right'"></i>
                </div>
              </div>
            </Transition>
          </div>
        </div>
        <div class="setting-item">
          <label class="setting-label">紧凑模式</label>
          <div class="toggle-switch" :class="{ active: layoutState.compactMode }" @click="updateLayoutSetting('compactMode', !layoutState.compactMode)">
            <div class="toggle-slider"></div>
          </div>
        </div>
        <div class="setting-item">
          <label class="setting-label">自定义主题色</label>
          <div class="color-picker-group">
            <input
              type="color"
              :value="layoutState.customThemeColor || '#b79fff'"
              @input="handleThemeColorChange"
              class="color-picker"
            />
            <button
              class="reset-color-btn"
              @click="setCustomThemeColor(null)"
              v-if="layoutState.customThemeColor"
            >
              重置
            </button>
          </div>
        </div>
      </section>

      <!-- 性能设置 -->
      <section class="settings-section" v-show="matchesSearch('性能 内存 阈值 告警')">
        <div class="section-header">
          <i class="iconfont icon-cpu section-icon"></i>
          <h3 class="section-title">性能设置</h3>
        </div>
        <div class="section-desc">配置内存告警阈值</div>
        <div class="setting-item">
          <label class="setting-label">警告阈值 (%)</label>
          <div class="setting-control">
            <input type="range" min="40" max="80" :value="perfThresholds.warning" @input="updateWarningThreshold($event)" class="range-slider" />
            <span class="range-value">{{ perfThresholds.warning }}%</span>
          </div>
        </div>
        <div class="setting-item">
          <label class="setting-label">严重阈值 (%)</label>
          <div class="setting-control">
            <input type="range" min="60" max="95" :value="perfThresholds.critical" @input="updateCriticalThreshold($event)" class="range-slider" />
            <span class="range-value">{{ perfThresholds.critical }}%</span>
          </div>
        </div>
        <div class="threshold-hint">
          <i class="iconfont icon-info"></i>
          <span>内存占用超过阈值时会显示警告提示</span>
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
import { computed, onMounted, ref, reactive } from 'vue'
import {
  initSettings,
  getSettings,
  updateSetting,
  resetSettings,
  getThemeList,
  settingsState
} from '../utils/settingsStore'
import { terminalThemes } from '../utils/themes'
import {
  initLayout,
  layoutState,
  updateLayoutSetting,
  setCustomThemeColor
} from '../utils/layoutStore'
import {
  loadThresholds,
  thresholds as perfThresholds,
  saveThresholds
} from '../utils/performanceMonitor'
import {
  initAIModels,
  aiModelsState,
  currentModelId,
  getAIModels,
  addAIModel,
  updateAIModel,
  removeAIModel,
  setCurrentModel,
  type AIModelConfig
} from '../utils/aiModelsStore'

// 搜索
const searchQuery = ref('')

const matchesSearch = (keywords: string) => {
  if (!searchQuery.value) return true
  const query = searchQuery.value.toLowerCase()
  return keywords.toLowerCase().includes(query)
}

// 下拉菜单状态
const showFontDropdown = ref(false)
const showCursorDropdown = ref(false)
const showLayoutDropdown = ref(false)

// 字体选项
const fontOptions = [
  { value: "'JetBrains Mono', monospace", label: 'JetBrains Mono' },
  { value: "'Fira Code', monospace", label: 'Fira Code' },
  { value: "'SF Mono', monospace", label: 'SF Mono' },
  { value: "'Consolas', monospace", label: 'Consolas' },
  { value: "'Courier New', monospace", label: 'Courier New' }
]

const getFontDisplayName = (value: string) => {
  const font = fontOptions.find(f => f.value === value)
  return font?.label || 'JetBrains Mono'
}

// 光标样式标签
const cursorStyleLabels: Record<string, string> = {
  block: '方块',
  underline: '下划线',
  bar: '竖线'
}

// AI 模型相关
const aiModels = computed(() => aiModelsState.value)
const showModelModal = ref(false)
const editingModel = ref<AIModelConfig | null>(null)

const modelForm = reactive({
  name: '',
  provider: 'openai' as 'openai' | 'claude' | 'ollama' | 'custom',
  model: '',
  apiKey: '',
  baseUrl: ''
})

const providerOptions = [
  { value: 'openai', label: 'OpenAI' },
  { value: 'claude', label: 'Claude' },
  { value: 'ollama', label: 'Ollama' },
  { value: 'custom', label: '自定义' }
]

const getProviderLabel = (provider: string) => {
  const labels: Record<string, string> = {
    openai: 'OpenAI',
    claude: 'Claude',
    ollama: 'Ollama',
    custom: '自定义'
  }
  return labels[provider] || provider
}

const openAddModal = () => {
  editingModel.value = null
  modelForm.name = ''
  modelForm.provider = 'openai'
  modelForm.model = ''
  modelForm.apiKey = ''
  modelForm.baseUrl = ''
  showModelModal.value = true
}

const editModel = (model: AIModelConfig) => {
  editingModel.value = model
  modelForm.name = model.name
  modelForm.provider = model.provider
  modelForm.model = model.model
  modelForm.apiKey = model.apiKey || ''
  modelForm.baseUrl = model.baseUrl || ''
  showModelModal.value = true
}

const closeModelModal = () => {
  showModelModal.value = false
  editingModel.value = null
}

const saveModel = () => {
  if (!modelForm.name || !modelForm.model) return

  const modelData = {
    name: modelForm.name,
    provider: modelForm.provider,
    model: modelForm.model,
    apiKey: modelForm.apiKey || undefined,
    baseUrl: modelForm.baseUrl || undefined
  }

  if (editingModel.value) {
    updateAIModel(editingModel.value.id, modelData)
  } else {
    addAIModel(modelData)
  }

  closeModelModal()
}

const deleteModel = (id: string) => {
  if (aiModels.value.length > 1) {
    removeAIModel(id)
  }
}

const selectModel = (id: string) => {
  setCurrentModel(id)
}

// 初始化设置
onMounted(async () => {
  await initSettings()
  initLayout()
  loadThresholds()
  initAIModels()
})

// 获取设置
const settings = getSettings()

// 响应式获取设置值
const fontSize = computed(() => settings.fontSize)
const fontFamily = computed(() => settings.fontFamily)
const autoCopy = computed(() => settings.autoCopy)
const cursorBlink = computed(() => settings.cursorBlink)
const cursorStyle = computed(() => settings.cursorStyle)

// 使用响应式状态获取当前主题
const currentTheme = computed(() => settingsState.theme)
const themeList = getThemeList()

// 获取主题颜色
const getThemeColor = (themeKey: string, colorName: string) => {
  const theme = terminalThemes[themeKey]
  if (!theme) return '#ffffff'
  return ((theme as unknown) as Record<string, string>)[colorName] || theme.foreground
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

// 选择字体
const selectFont = (value: string) => {
  updateSetting('fontFamily', value)
  showFontDropdown.value = false
}

// 切换自动复制
const toggleAutoCopy = () => {
  updateSetting('autoCopy', !autoCopy.value)
}

// 切换光标闪烁
const toggleCursorBlink = () => {
  updateSetting('cursorBlink', !cursorBlink.value)
}

// 选择光标样式
const selectCursorStyle = (value: 'block' | 'underline' | 'bar') => {
  updateSetting('cursorStyle', value)
  showCursorDropdown.value = false
}

// 更新内存警告阈值
const updateWarningThreshold = (event: Event) => {
  const value = parseInt((event.target as HTMLInputElement).value)
  if (value < perfThresholds.value.critical) {
    saveThresholds({ warning: value })
  }
}

// 更新内存严重阈值
const updateCriticalThreshold = (event: Event) => {
  const value = parseInt((event.target as HTMLInputElement).value)
  if (value > perfThresholds.value.warning) {
    saveThresholds({ critical: value })
  }
}

// 重置设置
const handleReset = () => {
  resetSettings()
}

// 处理主题色变化
const handleThemeColorChange = (event: Event) => {
  const value = (event.target as HTMLInputElement).value
  setCustomThemeColor(value)
}
</script>

<style scoped>
.settings-panel {
  height: 100%;
  display: flex;
  flex-direction: column;
  background: var(--color-bg-base, #1c1c1e);
  overflow: hidden;
}

.settings-header {
  padding: 24px 32px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 24px;
}

.settings-title {
  font-size: 20px;
  font-weight: 600;
  color: var(--color-text-primary, #e5e5e7);
  letter-spacing: -0.3px;
}

.search-wrapper {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 0 12px;
  height: 32px;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: var(--radius-md, 10px);
  flex: 1;
  max-width: 280px;
  transition: all 150ms cubic-bezier(0.25, 1, 0.5, 1);
}

.search-wrapper:focus-within {
  border-color: rgba(183, 159, 255, 0.2);
  background: rgba(255, 255, 255, 0.05);
}

.search-wrapper .iconfont {
  font-size: 12px;
  color: var(--color-text-tertiary, #6b6b78);
}

.settings-search {
  flex: 1;
  background: transparent;
  border: none;
  outline: none;
  color: var(--color-text-primary, #e5e5e7);
  font-size: 12px;
}

.settings-search::placeholder {
  color: var(--color-text-disabled, #5a5a68);
}

.search-wrapper kbd {
  padding: 2px 6px;
  background: var(--color-bg-hover, rgba(255, 255, 255, 0.05));
  border-radius: 3px;
  font-size: 10px;
  color: var(--color-text-tertiary, #6b6b78);
}

.settings-content {
  flex: 1;
  overflow-y: auto;
  padding: 20px 32px;
}

.settings-content::-webkit-scrollbar {
  width: 5px;
}

.settings-content::-webkit-scrollbar-track {
  background: transparent;
}

.settings-content::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.08);
  border-radius: 3px;
}

.settings-section {
  margin-bottom: 28px;
}

.section-header {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 6px;
}

.section-icon {
  font-size: 16px;
  color: var(--color-primary, #b79fff);
}

.section-icon.svg-icon {
  width: 16px;
  height: 16px;
}

.section-title {
  font-size: 14px;
  font-weight: 600;
  color: var(--color-text-primary, #e5e5e7);
}

.section-badge {
  font-size: 10px;
  color: var(--color-text-tertiary, #6b6b78);
  padding: 2px 8px;
  background: var(--color-bg-hover, rgba(255, 255, 255, 0.04));
  border-radius: 10px;
  margin-left: auto;
}

.section-desc {
  font-size: 11px;
  color: var(--color-text-disabled, #5a5a68);
  margin-bottom: 16px;
  padding-left: 26px;
}

/* ========== 主题网格 ========== */
.theme-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 12px;
}

.theme-card {
  position: relative;
  background: rgba(255, 255, 255, 0.02);
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: var(--radius-md, 10px);
  cursor: pointer;
  transition: all 150ms cubic-bezier(0.25, 1, 0.5, 1);
  overflow: hidden;
}

.theme-card:hover {
  background: rgba(255, 255, 255, 0.04);
  border-color: rgba(255, 255, 255, 0.1);
}

.theme-card.active {
  border-color: var(--color-primary, #b79fff);
}

.theme-preview {
  height: 120px;
  padding: 8px;
  display: flex;
  flex-direction: column;
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
}

.preview-header {
  display: flex;
  align-items: center;
  gap: 5px;
  padding-bottom: 6px;
  margin-bottom: 6px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
}

.preview-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
}

.preview-title {
  margin-left: auto;
  font-size: 9px;
  color: var(--color-text-tertiary, #6b6b78);
  font-family: inherit;
}

.preview-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 3px;
  font-family: 'JetBrains Mono', monospace;
  font-size: 10px;
}

.preview-line {
  display: flex;
  align-items: center;
  gap: 4px;
}

.preview-line .prompt {
  font-weight: 600;
}

.theme-check {
  position: absolute;
  top: 8px;
  right: 8px;
  width: 22px;
  height: 22px;
  background: var(--color-primary, #b79fff);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.theme-check .iconfont {
  font-size: 11px;
  color: var(--color-on-primary, #361083);
}

/* ========== AI 模型配置 ========== */
.models-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-bottom: 16px;
}

.model-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 16px;
  background: rgba(255, 255, 255, 0.02);
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 10px;
  cursor: pointer;
  transition: all 0.15s ease;
}

.model-card:hover {
  background: rgba(255, 255, 255, 0.04);
  border-color: rgba(255, 255, 255, 0.1);
}

.model-card.active {
  border-color: var(--color-primary, #b79fff);
  background: rgba(183, 159, 255, 0.05);
}

.model-info {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.model-name {
  font-size: 13px;
  font-weight: 500;
  color: var(--color-text-primary, #e5e5e7);
}

.model-provider {
  font-size: 11px;
  color: var(--color-text-tertiary, #8b8b9a);
}

.model-actions {
  display: flex;
  gap: 6px;
}

.model-btn {
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: transparent;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  color: var(--color-text-tertiary, #8b8b9a);
  transition: all 0.15s ease;
}

.model-btn:hover {
  background: rgba(255, 255, 255, 0.05);
  color: var(--color-text-primary, #e5e5e7);
}

.model-btn.edit:hover {
  color: var(--color-primary, #b79fff);
}

.model-btn.delete:hover {
  color: #ff5f57;
}

.model-btn .iconfont {
  font-size: 12px;
}

.add-model-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  width: 100%;
  padding: 12px;
  background: rgba(183, 159, 255, 0.05);
  border: 1px dashed rgba(183, 159, 255, 0.3);
  border-radius: 10px;
  cursor: pointer;
  color: var(--color-primary, #b79fff);
  font-size: 13px;
  transition: all 0.15s ease;
}

.add-model-btn:hover {
  background: rgba(183, 159, 255, 0.1);
  border-color: rgba(183, 159, 255, 0.5);
}

.add-model-btn .iconfont {
  font-size: 14px;
}

/* ========== 模型弹窗 ========== */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10000;
}

.model-modal {
  width: 420px;
  max-width: 90vw;
  background: var(--color-bg-elevated, #14141e);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 16px;
  overflow: hidden;
}

.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
}

.modal-header h4 {
  font-size: 15px;
  font-weight: 600;
  color: var(--color-text-primary, #e5e5e7);
  margin: 0;
}

.close-btn {
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: transparent;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  color: var(--color-text-tertiary, #8b8b9a);
  transition: all 0.15s ease;
}

.close-btn:hover {
  background: rgba(255, 255, 255, 0.05);
  color: var(--color-text-primary, #e5e5e7);
}

.close-btn .iconfont {
  font-size: 12px;
}

.modal-body {
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.form-group label {
  font-size: 12px;
  font-weight: 500;
  color: var(--color-text-secondary, #a1a1a6);
}

.form-group input {
  padding: 10px 12px;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 8px;
  color: var(--color-text-primary, #e5e5e7);
  font-size: 13px;
  outline: none;
  transition: all 0.15s ease;
}

.form-group input:focus {
  border-color: var(--color-primary, #b79fff);
  background: rgba(255, 255, 255, 0.05);
}

.form-group input::placeholder {
  color: var(--color-text-disabled, #5a5a68);
}

.form-hint {
  font-size: 11px;
  color: var(--color-text-secondary, #a1a1a6);
  opacity: 0.8;
  margin-top: 2px;
}

.provider-options {
  display: flex;
  gap: 8px;
}

.provider-btn {
  flex: 1;
  padding: 8px 12px;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 8px;
  color: var(--color-text-tertiary, #8b8b9a);
  font-size: 12px;
  cursor: pointer;
  transition: all 0.15s ease;
}

.provider-btn:hover {
  background: rgba(255, 255, 255, 0.05);
}

.provider-btn.active {
  background: rgba(183, 159, 255, 0.1);
  border-color: var(--color-primary, #b79fff);
  color: var(--color-primary, #b79fff);
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  padding: 16px 20px;
  border-top: 1px solid rgba(255, 255, 255, 0.05);
}

.btn {
  padding: 8px 16px;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.15s ease;
}

.btn.secondary {
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.08);
  color: var(--color-text-secondary, #a1a1a6);
}

.btn.secondary:hover {
  background: rgba(255, 255, 255, 0.05);
  color: var(--color-text-primary, #e5e5e7);
}

.btn.primary {
  background: var(--color-primary, #b79fff);
  border: none;
  color: var(--color-on-primary, #361083);
}

.btn.primary:hover {
  filter: brightness(1.1);
}

/* ========== 设置项 ========== */
.setting-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 16px;
  background: rgba(255, 255, 255, 0.02);
  border: 1px solid rgba(255, 255, 255, 0.05);
  border-radius: 8px;
  margin-bottom: 8px;
  transition: all 0.2s ease;
}

.setting-item:hover {
  background: rgba(255, 255, 255, 0.03);
  border-color: rgba(255, 255, 255, 0.08);
}

.setting-label {
  font-size: 13px;
  color: var(--color-text-primary, #e5e5e7);
  font-weight: 500;
}

.setting-control {
  display: flex;
  align-items: center;
  gap: 10px;
}

.range-slider {
  width: 100px;
  height: 3px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 2px;
  appearance: none;
  cursor: pointer;
}

.range-slider::-webkit-slider-thumb {
  appearance: none;
  width: 14px;
  height: 14px;
  background: var(--color-primary, #b79fff);
  border-radius: 50%;
  cursor: pointer;
}

.range-value {
  font-size: 12px;
  color: var(--color-primary, #b79fff);
  font-weight: 500;
  min-width: 36px;
  text-align: right;
}

/* ========== 自定义下拉组件 ========== */
.custom-select-wrapper {
  position: relative;
}

.custom-select-trigger {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  min-width: 140px;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: var(--radius-md, 10px);
  color: #e5e5e7;
  font-size: 12px;
  cursor: pointer;
  transition: all 150ms cubic-bezier(0.25, 1, 0.5, 1);
}

.custom-select-trigger.small {
  min-width: 100px;
  padding: 6px 10px;
  font-size: 11px;
}

.custom-select-trigger:hover {
  background: rgba(255, 255, 255, 0.05);
  border-color: rgba(183, 159, 255, 0.2);
}

.custom-select-trigger .iconfont {
  font-size: 10px;
  color: #6b6b78;
  margin-left: auto;
}

.custom-select-dropdown {
  position: absolute;
  top: calc(100% + 4px);
  right: 0;
  min-width: 180px;
  background: var(--color-bg-elevated, #14141e);
  border: 1px solid var(--color-border-default, rgba(255, 255, 255, 0.1));
  border-radius: var(--radius-md, 10px);
  padding: 4px;
  z-index: var(--z-dropdown, 1000);
  box-shadow: var(--shadow-lg, 0 8px 24px rgba(0, 0, 0, 0.25));
}

.custom-select-dropdown.small {
  min-width: 120px;
}

.select-option {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 10px;
  min-height: 44px;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.15s ease;
  color: var(--color-text-tertiary, #8b8b9a);
  font-size: 12px;
}

.select-option:hover {
  background: var(--color-bg-hover, rgba(255, 255, 255, 0.05));
  color: var(--color-text-primary, #e5e5e7);
}

.select-option.active {
  background: rgba(183, 159, 255, 0.1);
  color: var(--color-primary, #b79fff);
}

.option-preview {
  font-size: 14px;
  font-weight: 600;
  color: var(--color-primary, #b79fff);
  width: 24px;
  text-align: center;
}

.option-name {
  flex: 1;
}

.select-option .iconfont {
  font-size: 11px;
  color: var(--color-primary, #b79fff);
}

.cursor-preview {
  width: 16px;
  height: 16px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 3px;
  position: relative;
}

.cursor-preview.cursor-block::after {
  content: '';
  position: absolute;
  top: 2px;
  left: 2px;
  width: 10px;
  height: 10px;
  background: var(--color-primary, #b79fff);
  border-radius: 2px;
}

.cursor-preview.cursor-underline::after {
  content: '';
  position: absolute;
  bottom: 2px;
  left: 2px;
  width: 10px;
  height: 2px;
  background: var(--color-primary, #b79fff);
  border-radius: 1px;
}

.cursor-preview.cursor-bar::after {
  content: '';
  position: absolute;
  top: 2px;
  left: 6px;
  width: 2px;
  height: 10px;
  background: var(--color-primary, #b79fff);
  border-radius: 1px;
}

/* ========== 开关 ========== */
.toggle-switch {
  width: 44px;
  height: 24px;
  padding: 10px 0;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  cursor: pointer;
  position: relative;
  transition: all 0.3s ease;
  display: flex;
  align-items: center;
  justify-content: center;
}

.toggle-switch.active {
  background: rgba(183, 159, 255, 0.25);
}

.toggle-slider {
  position: absolute;
  top: 4px;
  left: 4px;
  width: 16px;
  height: 16px;
  background: #6b6b78;
  border-radius: 50%;
  transition: all 300ms cubic-bezier(0.25, 1, 0.5, 1);
}

.toggle-switch.active .toggle-slider {
  left: 24px;
  background: var(--color-primary, #b79fff);
}

/* ========== 颜色选择器 ========== */
.color-picker-group {
  display: flex;
  align-items: center;
  gap: 10px;
}

.color-picker {
  min-width: 44px;
  min-height: 44px;
  padding: 8px;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 8px;
  cursor: pointer;
}

.color-picker::-webkit-color-swatch-wrapper {
  padding: 2px;
}

.color-picker::-webkit-color-swatch {
  border-radius: 3px;
  border: none;
}

.reset-color-btn {
  padding: 5px 10px;
  background: rgba(255, 95, 87, 0.1);
  border: 1px solid rgba(255, 95, 87, 0.2);
  border-radius: 5px;
  color: #ff5f57;
  font-size: 11px;
  cursor: pointer;
}

/* ========== 阈值提示 ========== */
.threshold-hint {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 14px;
  background: rgba(183, 159, 255, 0.05);
  border: 1px solid rgba(183, 159, 255, 0.1);
  border-radius: var(--radius-md, 10px);
  margin-top: 4px;
}

.threshold-hint .iconfont {
  font-size: 12px;
  color: var(--color-primary, #b79fff);
}

.threshold-hint span {
  font-size: 11px;
  color: var(--color-text-tertiary, #8b8b9a);
}

/* ========== 底部 ========== */
.settings-footer {
  padding: 16px 32px;
  border-top: 1px solid rgba(255, 255, 255, 0.05);
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.reset-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 16px;
  background: rgba(255, 95, 87, 0.08);
  border: 1px solid rgba(255, 95, 87, 0.15);
  border-radius: 6px;
  color: #ff5f57;
  font-size: 12px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.reset-btn:hover {
  background: rgba(255, 95, 87, 0.12);
  border-color: rgba(255, 95, 87, 0.25);
}

.reset-btn .iconfont {
  font-size: 12px;
}

.save-hint {
  font-size: 11px;
  color: var(--color-text-disabled, #5a5a68);
}

/* ========== 动画 ========== */
.dropdown-enter-active,
.dropdown-leave-active {
  transition: all 150ms cubic-bezier(0.25, 1, 0.5, 1);
}

.dropdown-enter-from,
.dropdown-leave-to {
  opacity: 0;
  transform: translateY(-4px);
}
</style>
