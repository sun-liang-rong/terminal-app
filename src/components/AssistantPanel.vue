<template>
  <div class="assistant-panel">
    <!-- 顶部搜索区 -->
    <div class="search-section">
      <div class="system-select">
        <select v-model="selectedPlatform" :disabled="loading">
          <option value="auto">自动</option>
          <option value="windows">Windows</option>
          <option value="macos">macOS</option>
          <option value="linux">Linux</option>
        </select>
      </div>
      <div class="search-box">
        <i class="iconfont icon-search"></i>
        <input
          type="text"
          v-model="searchQuery"
          placeholder="描述你的场景，如：查看端口占用..."
          @keyup.enter="generateCommands"
          :disabled="loading"
        />
      </div>
      <button class="generate-btn ai-button" @click="generateCommands" :disabled="loading || !searchQuery.trim()">
        <i class="iconfont icon-ai" :class="{ 'ai-glow': !loading }" v-if="!loading"></i>
        <span class="loading-spinner" v-else></span>
        <span>{{ loading ? '生成中...' : '生成' }}</span>
      </button>
      <button class="settings-btn" @click="showSettings = true" title="AI 设置">
        <i class="iconfont icon-settings"></i>
      </button>
    </div>

    <!-- 热门场景 -->
    <div class="hot-scenes" v-if="!searchQuery || (commands.length === 0 && !loading)">
      <div class="section-label">热门场景</div>
      <div class="scene-tags">
        <button
          v-for="scene in hotScenes"
          :key="scene"
          class="scene-tag"
          @click="quickSearch(scene)"
        >
          {{ scene }}
        </button>
      </div>
    </div>

    <!-- 加载中 Skeleton -->
    <div class="loading-section" v-if="loading">
      <div class="section-label">正在生成命令...</div>
      <div class="skeleton-list">
        <div class="skeleton-card">
          <div class="skeleton-header">
            <div class="skeleton-title"></div>
            <div class="skeleton-badge"></div>
          </div>
          <div class="skeleton-code"></div>
          <div class="skeleton-desc">
            <div class="skeleton-line"></div>
            <div class="skeleton-line short"></div>
          </div>
        </div>
        <div class="skeleton-card">
          <div class="skeleton-header">
            <div class="skeleton-title"></div>
            <div class="skeleton-badge"></div>
          </div>
          <div class="skeleton-code short"></div>
          <div class="skeleton-desc">
            <div class="skeleton-line"></div>
          </div>
        </div>
        <div class="skeleton-card">
          <div class="skeleton-header">
            <div class="skeleton-title"></div>
            <div class="skeleton-badge"></div>
          </div>
          <div class="skeleton-code"></div>
          <div class="skeleton-desc">
            <div class="skeleton-line"></div>
            <div class="skeleton-line short"></div>
          </div>
        </div>
      </div>
    </div>

    <!-- 未配置提示 -->
    <EmptyState
      v-if="!isConfigured"
      type="config"
      icon="icon-settings"
      title="请先配置 AI API Key"
      description="配置 AI 服务后即可使用智能命令生成功能"
    >
      <template #actions>
        <button class="primary" @click="showSettings = true">打开设置</button>
      </template>
    </EmptyState>

    <!-- 命令列表 -->
    <div class="commands-section" v-if="commands.length > 0 && !loading">
      <div class="section-label">相关命令</div>
      <div class="commands-list">
        <div
          v-for="(cmd, index) in commands"
          :key="index"
          class="command-card"
        >
          <div class="command-header">
            <span class="command-name">{{ cmd.name }}</span>
            <span class="command-platform" :class="cmd.platform">{{ getPlatformLabel(cmd.platform) }}</span>
          </div>
          <div class="command-code">
            <code>{{ cmd.command }}</code>
          </div>
          <div class="command-desc">{{ cmd.description }}</div>
          <button class="copy-btn" @click="copyCommand(cmd.command)" :class="{ copied: copiedIndex === index }">
            <i class="iconfont" :class="copiedIndex === index ? 'icon-check' : 'icon-copy'"></i>
            <span>{{ copiedIndex === index ? '已复制' : '复制' }}</span>
          </button>
        </div>
      </div>
    </div>

    <!-- 空状态 -->
    <EmptyState
      v-if="searchQuery && !loading && commands.length === 0 && isConfigured"
      type="search"
      icon="icon-search"
      title="准备就绪"
      description="点击「生成」按钮，AI 将为您推荐相关命令"
      size="large"
    />

    <!-- 设置弹窗 -->
    <div class="settings-modal" v-if="showSettings" @click.self="showSettings = false">
      <div class="modal-content">
        <div class="modal-header">
          <h3>AI 设置</h3>
          <button class="close-btn" @click="showSettings = false">×</button>
        </div>
        <div class="modal-body">
          <div class="form-group">
            <label>AI 服务</label>
            <div class="provider-tabs">
              <button
                class="provider-tab"
                :class="{ active: settings.provider === 'ollama' }"
                @click="settings.provider = 'ollama'"
              >
                Ollama
              </button>
              <button
                class="provider-tab"
                :class="{ active: settings.provider === 'claude' }"
                @click="settings.provider = 'claude'"
              >
                Claude
              </button>
              <button
                class="provider-tab"
                :class="{ active: settings.provider === 'openai' }"
                @click="settings.provider = 'openai'"
              >
                OpenAI
              </button>
            </div>
          </div>
          <div class="form-group" v-if="settings.provider !== 'ollama'">
            <label>API Key</label>
            <input
              type="password"
              v-model="settings.apiKey"
              :placeholder="settings.provider === 'claude' ? 'sk-ant-...' : 'sk-...'"
            />
          </div>
          <div class="form-group" v-if="settings.provider === 'ollama'">
            <label>Ollama 服务地址</label>
            <input
              type="text"
              v-model="settings.baseUrl"
              placeholder="http://localhost:11434 或 http://192.168.x.x:11434"
            />
          </div>
          <div class="form-group">
            <label>模型</label>
            <input
              type="text"
              v-model="settings.model"
              :placeholder="getDefaultModel()"
            />
          </div>
          <div class="form-group" v-if="settings.provider === 'openai'">
            <label>API 地址（可选）</label>
            <input
              type="text"
              v-model="settings.baseUrl"
              placeholder="https://api.openai.com/v1"
            />
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn secondary" @click="showSettings = false">取消</button>
          <button class="btn primary" @click="saveSettings">保存</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { aiService, type Command, type AISettings } from '../utils/ai'
import { toast } from '../utils/notification'
import EmptyState from './EmptyState.vue'

// 获取 electron API
const electronAPI = window.electronAPI

// 状态
const searchQuery = ref('')
const commands = ref<Command[]>([])
const loading = ref(false)
const copiedIndex = ref<number | null>(null)
const showSettings = ref(false)
const selectedPlatform = ref('auto')

// 设置
const settings = ref<AISettings>(aiService.getSettings())
const isConfigured = computed(() => aiService.isConfigured())

// 热门场景
const hotScenes = [
  '查看端口占用',
  '查找大文件',
  '杀死进程',
  '查看磁盘空间',
  '解压文件',
  'Git撤销提交',
  'Docker清理',
  '查看日志'
]

// 获取平台
const getPlatform = (): string => {
  if (selectedPlatform.value !== 'auto') {
    return selectedPlatform.value
  }
  return navigator.platform.toLowerCase().includes('win') ? 'windows' :
         navigator.platform.toLowerCase().includes('mac') ? 'macos' : 'linux'
}

// 获取平台标签
const getPlatformLabel = (platform: string): string => {
  const labels: Record<string, string> = {
    'all': '通用',
    'macos': 'macOS',
    'windows': 'Windows',
    'linux': 'Linux'
  }
  return labels[platform] || platform
}

// 获取默认模型
const getDefaultModel = (): string => {
  if (settings.value.provider === 'ollama') return 'llama3'
  return settings.value.provider === 'claude' ? 'claude-3-haiku-20240307' : 'gpt-3.5-turbo'
}

// 快速搜索
const quickSearch = (scene: string) => {
  searchQuery.value = scene
  generateCommands()
}

// 生成命令
const generateCommands = async () => {
  if (!searchQuery.value.trim() || loading.value) return
  if (!isConfigured.value) {
    showSettings.value = true
    return
  }

  loading.value = true
  commands.value = []

  try {
    const platform = getPlatform()
    const result = await aiService.generateCommands(searchQuery.value, platform)
    if (result.length === 0) {
      toast.warning('未找到相关命令，请尝试其他描述')
    }
    commands.value = result
  } catch (e: any) {
    toast.error(e.message || '生成失败，请重试')
  } finally {
    loading.value = false
  }
}

// 复制命令
const copyCommand = async (command: string) => {
  try {
    await electronAPI.clipboardWrite(command)
    copiedIndex.value = commands.value.findIndex(c => c.command === command)
    toast.success('命令已复制')
    setTimeout(() => {
      copiedIndex.value = null
    }, 1500)
  } catch (e) {
    toast.error('复制失败')
  }
}

// 保存设置
const saveSettings = async () => {
  await aiService.saveSettings(settings.value)
  toast.success('AI 设置已保存')
  showSettings.value = false
}

// 加载设置
const loadSettings = async () => {
  // 等待设置加载完成
  settings.value = await aiService.waitForSettings()
}

onMounted(() => {
  loadSettings()
})
</script>

<style scoped>
.assistant-panel {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: var(--color-bg-surface, #1a1a24);
  color: var(--color-text-input, #e0e0e0);
  overflow: hidden;
}

/* 搜索区 */
.search-section {
  padding: 16px 20px;
  background: var(--color-bg-elevated, #15151b);
  border-bottom: 1px solid var(--color-border-default, #23232c);
  display: flex;
  align-items: stretch;
  gap: 12px;
}

.system-select select {
  min-height: 44px;
  padding: 0 14px;
  background: var(--color-bg-input, #0d0d12);
  border: 1px solid var(--color-border-input, #23232c);
  border-radius: 10px;
  color: var(--color-text-input, #e0e0e0);
  font-size: 13px;
  cursor: pointer;
  outline: none;
  transition: all 0.2s ease;
}

.system-select select:hover {
  border-color: var(--color-brand-primary, #00f0ff);
}

.system-select select:focus {
  border-color: var(--color-brand-primary, #00f0ff);
}

.system-select select option {
  background: var(--color-bg-surface, #1a1a24);
  color: var(--color-text-input, #e0e0e0);
}

.search-box {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 0 16px;
  background: var(--color-bg-input, #0d0d12);
  border: 1px solid var(--color-border-input, #23232c);
  border-radius: 10px;
  flex: 1;
  min-height: 44px;
}

.search-box i {
  color: var(--color-text-tertiary, #6b6b78);
  font-size: 16px;
}

.search-box input {
  flex: 1;
  width: 100%;
  background: transparent;
  border: none;
  outline: none;
  color: var(--color-text-input, #e0e0e0);
  font-size: 14px;
  min-height: 44px;
}

.search-box input::placeholder {
  color: var(--color-text-disabled, #5a5a68);
}

.settings-btn {
  min-width: 44px;
  min-height: 44px;
  border-radius: 10px;
  border: 1px solid var(--color-border-input, #23232c);
  background: transparent;
  color: var(--color-text-tertiary, #6b6b78);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
}

.settings-btn:hover {
  background: var(--color-border-input, #23232c);
  color: var(--color-brand-primary, #00f0ff);
  border-color: var(--color-brand-primary, #00f0ff);
}

.generate-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 0 20px;
  min-height: 44px;
  background: var(--color-ai-gradient, linear-gradient(135deg, rgba(139, 92, 246, 0.25) 0%, rgba(0, 240, 255, 0.15) 100%));
  border: 1px solid rgba(139, 92, 246, 0.35);
  border-radius: 10px;
  color: var(--color-ai-secondary, #a78bfa);
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
}

.generate-btn:hover:not(:disabled) {
  background: linear-gradient(135deg, rgba(139, 92, 246, 0.35) 0%, rgba(0, 240, 255, 0.2) 100%);
  border-color: rgba(139, 92, 246, 0.5);
  box-shadow: 0 4px 16px rgba(139, 92, 246, 0.25);
  transform: translateY(-1px);
}

.generate-btn:active:not(:disabled) {
  transform: translateY(0);
}

.generate-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.loading-spinner {
  width: 14px;
  height: 14px;
  border: 2px solid var(--color-bg-base, #0f0f14);
  border-top-color: transparent;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

/* 热门场景 */
.hot-scenes {
  padding: 16px 20px;
  border-bottom: 1px solid var(--color-border-default, #23232c);
}

.section-label {
  font-size: 12px;
  color: var(--color-text-tertiary, #6b6b78);
  margin-bottom: 12px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

/* 加载中 Skeleton */
.loading-section {
  flex: 1;
  padding: 16px 20px;
  overflow-y: auto;
}

.skeleton-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.skeleton-card {
  background: var(--color-bg-hover, #23232c);
  border: 1px solid var(--color-border-default, #2a2a35);
  border-radius: 8px;
  padding: 16px;
  animation: skeleton-pulse 1.5s ease-in-out infinite;
}

@keyframes skeleton-pulse {
  0%, 100% {
    opacity: 1;
  }
  50% {
    opacity: 0.6;
  }
}

.skeleton-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 10px;
}

.skeleton-title {
  width: 120px;
  height: 16px;
  background: linear-gradient(90deg, rgba(255, 255, 255, 0.05) 0%, rgba(255, 255, 255, 0.1) 50%, rgba(255, 255, 255, 0.05) 100%);
  background-size: 200% 100%;
  animation: skeleton-shimmer 1.5s ease-in-out infinite;
  border-radius: 4px;
}

.skeleton-badge {
  width: 60px;
  height: 18px;
  background: linear-gradient(90deg, rgba(255, 255, 255, 0.03) 0%, rgba(255, 255, 255, 0.08) 50%, rgba(255, 255, 255, 0.03) 100%);
  background-size: 200% 100%;
  animation: skeleton-shimmer 1.5s ease-in-out infinite;
  border-radius: 4px;
}

.skeleton-code {
  height: 36px;
  background: linear-gradient(90deg, rgba(0, 240, 255, 0.03) 0%, rgba(0, 240, 255, 0.08) 50%, rgba(0, 240, 255, 0.03) 100%);
  background-size: 200% 100%;
  animation: skeleton-shimmer 1.5s ease-in-out infinite;
  border-radius: 4px;
  margin-bottom: 10px;
}

.skeleton-code.short {
  height: 28px;
  width: 80%;
}

.skeleton-desc {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.skeleton-line {
  height: 12px;
  width: 100%;
  background: linear-gradient(90deg, rgba(255, 255, 255, 0.03) 0%, rgba(255, 255, 255, 0.06) 50%, rgba(255, 255, 255, 0.03) 100%);
  background-size: 200% 100%;
  animation: skeleton-shimmer 1.5s ease-in-out infinite;
  border-radius: 3px;
}

.skeleton-line.short {
  width: 60%;
}

@keyframes skeleton-shimmer {
  0% {
    background-position: 200% 0;
  }
  100% {
    background-position: -200% 0;
  }
}

.scene-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.scene-tag {
  padding: 6px 12px;
  background: var(--color-bg-hover, #23232c);
  border: 1px solid var(--color-border-default, #2a2a35);
  border-radius: 16px;
  color: var(--color-text-secondary, #9b9ba5);
  font-size: 12px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.scene-tag:hover {
  background: var(--color-bg-active, #2a2a35);
  color: var(--color-brand-primary, #00f0ff);
  border-color: var(--color-brand-primary, #00f0ff);
}

/* 未配置提示 - 已改用 EmptyState 组件 */

/* 命令列表 */
.commands-section {
  flex: 1;
  padding: 16px 20px;
  overflow-y: auto;
}

.commands-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.command-card {
  background: var(--color-bg-hover, #23232c);
  border: 1px solid var(--color-border-default, #2a2a35);
  border-radius: 8px;
  padding: 16px;
  position: relative;
}

.command-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 10px;
}

.command-name {
  font-size: 14px;
  font-weight: 600;
  color: var(--color-text-input, #e0e0e0);
}

.command-platform {
  font-size: 10px;
  padding: 2px 8px;
  border-radius: 4px;
  background: var(--color-bg-active, #3a3a48);
  color: var(--color-text-secondary, #9b9ba5);
}

.command-platform.macos {
  background: rgba(0, 240, 255, 0.1);
  color: var(--color-brand-primary, #00f0ff);
}

.command-platform.windows {
  background: rgba(0, 212, 170, 0.1);
  color: #00d4aa;
}

.command-platform.linux {
  background: rgba(255, 199, 0, 0.1);
  color: #ffc700;
}

.command-code {
  background: var(--color-bg-input, #0d0d12);
  border-radius: 4px;
  padding: 10px 12px;
  margin-bottom: 10px;
  overflow-x: auto;
}

.command-code code {
  font-family: 'SF Mono', Menlo, Monaco, monospace;
  font-size: 13px;
  color: var(--color-brand-primary, #00f0ff);
  white-space: pre-wrap;
  word-break: break-all;
}

.command-desc {
  font-size: 12px;
  color: var(--color-text-tertiary, #6b6b78);
  margin-bottom: 12px;
}

.copy-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  background: transparent;
  border: 1px solid var(--color-border-default, #2a2a35);
  border-radius: 4px;
  color: var(--color-text-tertiary, #6b6b78);
  font-size: 12px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.copy-btn:hover {
  background: var(--color-bg-active, #2a2a35);
  color: var(--color-text-input, #e0e0e0);
}

.copy-btn.copied {
  background: rgba(0, 212, 170, 0.1);
  border-color: #00d4aa;
  color: #00d4aa;
}

/* 空状态 - 已改用 EmptyState 组件 */

/* 设置弹窗 */
.settings-modal {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: var(--z-modal-overlay, 3001);
  backdrop-filter: blur(4px);
}

.modal-content {
  width: 400px;
  max-width: 90vw;
  background: var(--color-bg-surface, #1a1a24);
  border: 1px solid var(--color-border-default, #2a2a35);
  border-radius: 12px;
  overflow: hidden;
}

.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  border-bottom: 1px solid var(--color-border-input, #23232c);
}

.modal-header h3 {
  font-size: 16px;
  font-weight: 600;
  color: var(--color-text-input, #e0e0e0);
}

.modal-header .close-btn {
  background: transparent;
  border: none;
  color: var(--color-text-tertiary, #6b6b78);
  font-size: 20px;
  cursor: pointer;
}

.modal-header .close-btn:hover {
  color: var(--color-text-input, #e0e0e0);
}

.modal-body {
  padding: 20px;
}

.form-group {
  margin-bottom: 16px;
}

.form-group label {
  display: block;
  font-size: 13px;
  color: var(--color-text-secondary, #9b9ba5);
  margin-bottom: 8px;
}

.form-group input {
  width: 100%;
  padding: 10px 12px;
  background: var(--color-bg-input, #0d0d12);
  border: 1px solid var(--color-border-input, #23232c);
  border-radius: 6px;
  color: var(--color-text-input, #e0e0e0);
  font-size: 14px;
}

.form-group input:focus {
  outline: none;
  border-color: var(--color-brand-primary, #00f0ff);
}

.form-group input::placeholder {
  color: var(--color-text-disabled, #5a5a68);
}

.provider-tabs {
  display: flex;
  gap: 8px;
}

.provider-tab {
  flex: 1;
  padding: 10px;
  background: var(--color-bg-input, #0d0d12);
  border: 1px solid var(--color-border-input, #23232c);
  border-radius: 6px;
  color: var(--color-text-tertiary, #6b6b78);
  font-size: 13px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.provider-tab:hover {
  background: var(--color-bg-hover, #23232c);
}

.provider-tab.active {
  background: rgba(0, 240, 255, 0.1);
  border-color: var(--color-brand-primary, #00f0ff);
  color: var(--color-brand-primary, #00f0ff);
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  padding: 16px 20px;
  border-top: 1px solid var(--color-border-input, #23232c);
}

.btn {
  padding: 10px 20px;
  border-radius: 6px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
}

.btn.secondary {
  background: transparent;
  border: 1px solid var(--color-border-default, #2a2a35);
  color: var(--color-text-secondary, #9b9ba5);
}

.btn.secondary:hover {
  background: var(--color-bg-hover, #23232c);
  color: var(--color-text-input, #e0e0e0);
}

.btn.primary {
  background: linear-gradient(135deg, var(--color-brand-primary) 0%, #00d4ff 100%);
  border: none;
  color: var(--color-bg-base, #0f0f14);
}

.btn.primary:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(var(--color-brand-primary-rgb), 0.3);
}
</style>