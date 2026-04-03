<template>
  <div class="assistant-panel">
    <!-- 顶部搜索区 -->
    <div class="search-section">
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
      <button class="generate-btn" @click="generateCommands" :disabled="loading || !searchQuery.trim()">
        <i class="iconfont icon-ai" v-if="!loading"></i>
        <span class="loading-spinner" v-else></span>
        <span>{{ loading ? '生成中...' : '生成' }}</span>
      </button>
      <button class="settings-btn" @click="showSettings = true" title="AI 设置">
        <i class="iconfont icon-settings"></i>
      </button>
    </div>

    <!-- 热门场景 -->
    <div class="hot-scenes" v-if="!searchQuery || commands.length === 0">
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

    <!-- 未配置提示 -->
    <div class="not-configured" v-if="!isConfigured">
      <div class="config-icon">
        <i class="iconfont icon-settings"></i>
      </div>
      <div class="config-text">请先配置 AI API Key</div>
      <button class="config-btn" @click="showSettings = true">
        打开设置
      </button>
    </div>

    <!-- 命令列表 -->
    <div class="commands-section" v-if="commands.length > 0">
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
    <div class="empty-state" v-if="searchQuery && !loading && commands.length === 0 && isConfigured">
      <div class="empty-icon">🔍</div>
      <div class="empty-text">点击"生成"获取相关命令</div>
    </div>

    <!-- 错误提示 -->
    <div class="error-toast" v-if="error">
      <i class="iconfont icon-error"></i>
      <span>{{ error }}</span>
      <button class="close-btn" @click="error = ''">×</button>
    </div>

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

// 获取 electron API
const electronAPI = window.electronAPI

// 状态
const searchQuery = ref('')
const commands = ref<Command[]>([])
const loading = ref(false)
const error = ref('')
const copiedIndex = ref<number | null>(null)
const showSettings = ref(false)

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
  error.value = ''
  commands.value = []

  try {
    const platform = getPlatform()
    const result = await aiService.generateCommands(searchQuery.value, platform)
    commands.value = result
  } catch (e: any) {
    error.value = e.message || '生成失败，请重试'
  } finally {
    loading.value = false
  }
}

// 复制命令
const copyCommand = async (command: string) => {
  try {
    await electronAPI.clipboardWrite(command)
    copiedIndex.value = commands.value.findIndex(c => c.command === command)
    setTimeout(() => {
      copiedIndex.value = null
    }, 1500)
  } catch (e) {
    error.value = '复制失败'
  }
}

// 保存设置
const saveSettings = () => {
  aiService.saveSettings(settings.value)
  showSettings.value = false
}

onMounted(() => {
  settings.value = aiService.getSettings()
})
</script>

<style scoped>
.assistant-panel {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: #1a1a24;
  color: #e0e0e0;
  overflow: hidden;
}

/* 搜索区 */
.search-section {
  padding: 16px 20px;
  background: #15151b;
  border-bottom: 1px solid #23232c;
  display: flex;
  align-items: stretch;
  gap: 12px;
}

.search-box {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 0 16px;
  background: #0d0d12;
  border: 1px solid #23232c;
  border-radius: 8px;
  flex: 1;
  min-height: 40px;
}

.search-box i {
  color: #6b6b78;
  font-size: 16px;
}

.search-box input {
  flex: 1;
  width: 100%;
  background: transparent;
  border: none;
  outline: none;
  color: #e0e0e0;
  font-size: 14px;
  height: 40px;
  line-height: 40px;
}

.search-box input::placeholder {
  color: #5a5a68;
}

.settings-btn {
  width: 40px;
  height: 40px;
  border-radius: 8px;
  border: 1px solid #23232c;
  background: transparent;
  color: #6b6b78;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
}

.settings-btn:hover {
  background: #23232c;
  color: #00f0ff;
  border-color: #00f0ff;
}

.generate-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 0 20px;
  height: 40px;
  background: linear-gradient(135deg, #00f0ff 0%, #00d4ff 100%);
  border: none;
  border-radius: 8px;
  color: #0f0f14;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
}

.generate-btn:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(0, 240, 255, 0.3);
}

.generate-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.loading-spinner {
  width: 14px;
  height: 14px;
  border: 2px solid #0f0f14;
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
  border-bottom: 1px solid #23232c;
}

.section-label {
  font-size: 12px;
  color: #6b6b78;
  margin-bottom: 12px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.scene-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.scene-tag {
  padding: 6px 12px;
  background: #23232c;
  border: 1px solid #2a2a35;
  border-radius: 16px;
  color: #9b9ba5;
  font-size: 12px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.scene-tag:hover {
  background: #2a2a35;
  color: #00f0ff;
  border-color: #00f0ff;
}

/* 未配置提示 */
.not-configured {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  flex: 1;
  gap: 16px;
  color: #6b6b78;
}

.config-icon {
  font-size: 48px;
  color: #3a3a48;
}

.config-text {
  font-size: 14px;
}

.config-btn {
  padding: 10px 20px;
  background: #23232c;
  border: 1px solid #2a2a35;
  border-radius: 6px;
  color: #00f0ff;
  font-size: 13px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.config-btn:hover {
  background: #2a2a35;
}

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
  background: #23232c;
  border: 1px solid #2a2a35;
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
  color: #e0e0e0;
}

.command-platform {
  font-size: 10px;
  padding: 2px 8px;
  border-radius: 4px;
  background: #3a3a48;
  color: #9b9ba5;
}

.command-platform.macos {
  background: rgba(0, 240, 255, 0.1);
  color: #00f0ff;
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
  background: #0d0d12;
  border-radius: 4px;
  padding: 10px 12px;
  margin-bottom: 10px;
  overflow-x: auto;
}

.command-code code {
  font-family: 'SF Mono', Menlo, Monaco, monospace;
  font-size: 13px;
  color: #00f0ff;
  white-space: pre-wrap;
  word-break: break-all;
}

.command-desc {
  font-size: 12px;
  color: #6b6b78;
  margin-bottom: 12px;
}

.copy-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  background: transparent;
  border: 1px solid #2a2a35;
  border-radius: 4px;
  color: #6b6b78;
  font-size: 12px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.copy-btn:hover {
  background: #2a2a35;
  color: #e0e0e0;
}

.copy-btn.copied {
  background: rgba(0, 212, 170, 0.1);
  border-color: #00d4aa;
  color: #00d4aa;
}

/* 空状态 */
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  flex: 1;
  gap: 12px;
  color: #6b6b78;
}

.empty-icon {
  font-size: 48px;
}

.empty-text {
  font-size: 14px;
}

/* 错误提示 */
.error-toast {
  position: fixed;
  bottom: 24px;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 20px;
  background: rgba(255, 107, 107, 0.1);
  border: 1px solid #ff6b6b;
  border-radius: 8px;
  color: #ff6b6b;
  font-size: 13px;
  z-index: 100;
}

.error-toast .close-btn {
  background: transparent;
  border: none;
  color: #ff6b6b;
  font-size: 16px;
  cursor: pointer;
  opacity: 0.6;
}

.error-toast .close-btn:hover {
  opacity: 1;
}

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
  z-index: 1000;
  backdrop-filter: blur(4px);
}

.modal-content {
  width: 400px;
  max-width: 90vw;
  background: #1a1a24;
  border: 1px solid #2a2a35;
  border-radius: 12px;
  overflow: hidden;
}

.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  border-bottom: 1px solid #23232c;
}

.modal-header h3 {
  font-size: 16px;
  font-weight: 600;
  color: #e0e0e0;
}

.modal-header .close-btn {
  background: transparent;
  border: none;
  color: #6b6b78;
  font-size: 20px;
  cursor: pointer;
}

.modal-header .close-btn:hover {
  color: #e0e0e0;
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
  color: #9b9ba5;
  margin-bottom: 8px;
}

.form-group input {
  width: 100%;
  padding: 10px 12px;
  background: #0d0d12;
  border: 1px solid #23232c;
  border-radius: 6px;
  color: #e0e0e0;
  font-size: 14px;
}

.form-group input:focus {
  outline: none;
  border-color: #00f0ff;
}

.form-group input::placeholder {
  color: #5a5a68;
}

.provider-tabs {
  display: flex;
  gap: 8px;
}

.provider-tab {
  flex: 1;
  padding: 10px;
  background: #0d0d12;
  border: 1px solid #23232c;
  border-radius: 6px;
  color: #6b6b78;
  font-size: 13px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.provider-tab:hover {
  background: #23232c;
}

.provider-tab.active {
  background: rgba(0, 240, 255, 0.1);
  border-color: #00f0ff;
  color: #00f0ff;
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  padding: 16px 20px;
  border-top: 1px solid #23232c;
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
  border: 1px solid #2a2a35;
  color: #9b9ba5;
}

.btn.secondary:hover {
  background: #23232c;
  color: #e0e0e0;
}

.btn.primary {
  background: linear-gradient(135deg, #00f0ff 0%, #00d4ff 100%);
  border: none;
  color: #0f0f14;
}

.btn.primary:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(0, 240, 255, 0.3);
}
</style>