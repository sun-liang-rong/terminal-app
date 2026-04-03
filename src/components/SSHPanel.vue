<template>
  <div class="ssh-panel">
    <!-- 连接中 Loading 遮罩 -->
    <div class="connecting-overlay" v-if="connecting">
      <div class="connecting-content">
        <div class="connecting-spinner">
          <div class="spinner-ring"></div>
          <div class="spinner-ring"></div>
          <div class="spinner-ring"></div>
        </div>
        <div class="connecting-title">正在连接</div>
        <div class="connecting-host">{{ connectingHost?.name || connectingHost?.host }}</div>
        <div class="connecting-info">{{ connectingHost?.username }}@{{ connectingHost?.host }}:{{ connectingHost?.port || 22 }}</div>
      </div>
    </div>

    <!-- 顶部工具栏 -->
    <div class="ssh-toolbar">
      <div class="toolbar-left">
        <button class="toolbar-btn primary" @click="showNewHostModal = true">
          <i class="iconfont icon-add"></i>
          <span>NEW HOST</span>
        </button>
      </div>
      <div class="toolbar-right">
        <div class="search-box">
          <i class="iconfont icon-search"></i>
          <input type="text" placeholder="搜索主机..." v-model="searchQuery" />
        </div>
      </div>
    </div>

    <!-- 主机列表 -->
    <div class="hosts-section">
      <h2 class="section-title">Hosts</h2>
      <div class="hosts-grid">
        <div
          v-for="host in filteredHosts"
          :key="host.id"
          class="host-card"
          @click="connectToHost(host)"
        >
          <div class="host-icon">
            <i class="iconfont icon-linux"></i>
          </div>
          <div class="host-info">
            <div class="host-name">{{ host.name || host.host }}</div>
            <div class="host-detail">{{ host.protocol }}, {{ host.username }}</div>
          </div>
          <div class="host-actions" @click.stop>
            <button class="action-btn" @click="editHost(host)" title="编辑">
              <i class="iconfont icon-edit"></i>
            </button>
            <button class="action-btn" @click="deleteHost(host.id)" title="删除">
              <i class="iconfont icon-delete"></i>
            </button>
          </div>
        </div>

        <!-- 添加新主机卡片 -->
        <div class="host-card add-card" @click="showNewHostModal = true">
          <div class="add-icon">
            <i class="iconfont icon-add"></i>
          </div>
          <div class="add-text">添加新主机</div>
        </div>
      </div>
    </div>

    <!-- 新建/编辑主机模态框 -->
    <div class="modal-overlay" v-if="showNewHostModal" @click.self="closeModal">
      <div class="modal-container">
        <div class="modal-header">
          <h3>{{ editingHost ? '编辑主机' : '新建主机' }}</h3>
          <button class="close-btn" @click="closeModal">
            <i class="iconfont icon-close"></i>
          </button>
        </div>
        <div class="modal-body">
          <form @submit.prevent="saveHost">
            <div class="form-group">
              <label>主机名称</label>
              <input
                type="text"
                v-model="hostForm.name"
                placeholder="例如: 生产服务器"
              />
            </div>
            <div class="form-row">
              <div class="form-group">
                <label>主机地址 *</label>
                <input
                  type="text"
                  v-model="hostForm.host"
                  placeholder="IP 或域名"
                  required
                />
              </div>
              <div class="form-group small">
                <label>端口</label>
                <input
                  type="number"
                  v-model="hostForm.port"
                  placeholder="22"
                />
              </div>
            </div>
            <div class="form-group">
              <label>用户名 *</label>
              <input
                type="text"
                v-model="hostForm.username"
                placeholder="root"
                required
              />
            </div>
            <div class="form-group">
              <label>认证方式</label>
              <div class="auth-tabs">
                <button
                  type="button"
                  class="auth-tab"
                  :class="{ active: hostForm.authType === 'password' }"
                  @click="hostForm.authType = 'password'"
                >
                  密码
                </button>
                <button
                  type="button"
                  class="auth-tab"
                  :class="{ active: hostForm.authType === 'key' }"
                  @click="hostForm.authType = 'key'"
                >
                  私钥
                </button>
              </div>
            </div>
            <div class="form-group" v-if="hostForm.authType === 'password'">
              <label>密码</label>
              <input
                type="password"
                v-model="hostForm.password"
                placeholder="输入密码"
              />
            </div>
            <div class="form-group" v-if="hostForm.authType === 'key'">
              <label>私钥路径</label>
              <div class="file-input">
                <input
                  type="text"
                  v-model="hostForm.privateKey"
                  placeholder="选择私钥文件"
                  readonly
                />
                <button type="button" class="file-btn" @click="selectKeyFile">
                  浏览
                </button>
              </div>
            </div>
            <div class="form-group">
              <label class="checkbox-label">
                <input type="checkbox" v-model="hostForm.savePassword" />
                <span>保存密码（本地加密存储）</span>
              </label>
            </div>
          </form>
        </div>
        <div class="modal-footer">
          <button class="btn secondary" @click="closeModal">取消</button>
          <button class="btn primary" @click="saveHost" :disabled="!isFormValid">
            {{ editingHost ? '保存' : '添加' }}
          </button>
        </div>
      </div>
    </div>

    <!-- 连接状态提示 -->
    <div class="toast-container">
      <transition-group name="toast">
        <div
          v-for="toast in toasts"
          :key="toast.id"
          class="toast"
          :class="toast.type"
        >
          <i class="iconfont" :class="toast.icon"></i>
          <span>{{ toast.message }}</span>
        </div>
      </transition-group>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'

const emit = defineEmits(['connect'])

// 搜索状态
const searchQuery = ref('')
const showNewHostModal = ref(false)
const editingHost = ref(null)

// 主机列表
const hosts = ref([])

// 表单数据
const hostForm = ref({
  name: '',
  host: '',
  port: 22,
  username: 'root',
  authType: 'password',
  password: '',
  privateKey: '',
  savePassword: false,
  protocol: 'ssh'
})

// Toast 提示
const toasts = ref([])

// 过滤后的主机列表
const filteredHosts = computed(() => {
  if (!searchQuery.value) return hosts.value
  const query = searchQuery.value.toLowerCase()
  return hosts.value.filter(
    h =>
      h.name?.toLowerCase().includes(query) ||
      h.host.toLowerCase().includes(query) ||
      h.username.toLowerCase().includes(query)
  )
})

// 表单验证
const isFormValid = computed(() => {
  return hostForm.value.host && hostForm.value.username
})

// 从本地存储加载主机列表
const loadHosts = () => {
  const saved = localStorage.getItem('ssh-hosts')
  if (saved) {
    try {
      hosts.value = JSON.parse(saved)
    } catch (e) {
      console.error('Failed to load hosts:', e)
    }
  } else {
    // 添加示例数据
    hosts.value = [
      {
        id: 1,
        name: '38.76.197.116',
        host: '38.76.197.116',
        port: 22,
        username: 'root',
        authType: 'password',
        password: '',
        privateKey: '',
        savePassword: false,
        protocol: 'ssh'
      },
      {
        id: 2,
        name: '156.226.28.65',
        host: '156.226.28.65',
        port: 22,
        username: 'root',
        authType: 'password',
        password: '',
        privateKey: '',
        savePassword: false,
        protocol: 'ssh'
      }
    ]
    saveHosts()
  }
}

// 保存主机列表到本地存储
const saveHosts = () => {
  localStorage.setItem('ssh-hosts', JSON.stringify(hosts.value))
}

// 显示提示
const showToast = (message, type = 'info') => {
  const icons = {
    success: 'icon-success',
    error: 'icon-error',
    info: 'icon-info',
    warning: 'icon-warning'
  }
  const toast = {
    id: Date.now(),
    message,
    type,
    icon: icons[type]
  }
  toasts.value.push(toast)
  setTimeout(() => {
    toasts.value = toasts.value.filter(t => t.id !== toast.id)
  }, 3000)
}

// 关闭模态框
const closeModal = () => {
  showNewHostModal.value = false
  editingHost.value = null
  resetForm()
}

// 重置表单
const resetForm = () => {
  hostForm.value = {
    name: '',
    host: '',
    port: 22,
    username: 'root',
    authType: 'password',
    password: '',
    privateKey: '',
    savePassword: false,
    protocol: 'ssh'
  }
}

// 保存主机
const saveHost = () => {
  if (!isFormValid.value) return

  const hostData = {
    ...hostForm.value,
    id: editingHost.value?.id || Date.now()
  }

  // 如果不保存密码，清空密码字段
  if (!hostData.savePassword) {
    hostData.password = ''
  }

  if (editingHost.value) {
    const index = hosts.value.findIndex(h => h.id === editingHost.value.id)
    if (index !== -1) {
      hosts.value[index] = hostData
    }
    showToast('主机已更新', 'success')
  } else {
    hosts.value.push(hostData)
    showToast('主机已添加', 'success')
  }

  saveHosts()
  closeModal()
}

// 编辑主机
const editHost = (host) => {
  editingHost.value = host
  hostForm.value = {
    name: host.name || '',
    host: host.host,
    port: host.port || 22,
    username: host.username,
    authType: host.authType || 'password',
    password: host.password || '',
    privateKey: host.privateKey || '',
    savePassword: !!host.password,
    protocol: host.protocol || 'ssh'
  }
  showNewHostModal.value = true
}

// 删除主机
const deleteHost = (id) => {
  if (confirm('确定要删除这个主机吗？')) {
    hosts.value = hosts.value.filter(h => h.id !== id)
    saveHosts()
    showToast('主机已删除', 'info')
  }
}

// 选择私钥文件
const selectKeyFile = async () => {
  // 这里应该调用 Electron 的文件选择对话框
  // 暂时使用 input 模拟
  const input = document.createElement('input')
  input.type = 'file'
  input.accept = '.pem,.key,.ppk'
  input.onchange = (e) => {
    const file = e.target.files[0]
    if (file) {
      hostForm.value.privateKey = file.path || file.name
    }
  }
  input.click()
}

// 连接到主机
const connecting = ref(false)
const connectingHost = ref(null)

const connectToHost = async (host) => {
  // 检查是否有密码
  if (!host.password) {
    showToast('请先编辑主机配置并保存密码', 'warning')
    return
  }

  // 显示 loading
  connecting.value = true
  connectingHost.value = host

  try {
    // 触发连接事件，等待父组件处理
    emit('connect', host)
  } catch (error) {
    connecting.value = false
    showToast(`连接失败: ${error.message}`, 'error')
  }
}

// 暴露方法供父组件调用（关闭 loading）
const hideConnecting = () => {
  connecting.value = false
  connectingHost.value = null
}

defineExpose({
  hideConnecting
})

onMounted(() => {
  loadHosts()
})
</script>

<style scoped>
.ssh-panel {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: linear-gradient(180deg, #0f0f16 0%, #0a0a0f 100%);
  color: #e0e0e0;
  position: relative;
}

/* 连接中 Loading 遮罩 */
.connecting-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(10, 10, 15, 0.95);
  backdrop-filter: blur(8px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 100;
}

.connecting-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
}

.connecting-spinner {
  position: relative;
  width: 80px;
  height: 80px;
}

.spinner-ring {
  position: absolute;
  width: 100%;
  height: 100%;
  border-radius: 50%;
  border: 3px solid transparent;
  animation: spin 1.5s linear infinite;
}

.spinner-ring:nth-child(1) {
  border-top-color: #00f0ff;
  animation-delay: 0s;
}

.spinner-ring:nth-child(2) {
  border-right-color: #00d4aa;
  animation-delay: 0.2s;
  width: 70%;
  height: 70%;
  top: 15%;
  left: 15%;
}

.spinner-ring:nth-child(3) {
  border-bottom-color: #3b82f6;
  animation-delay: 0.4s;
  width: 40%;
  height: 40%;
  top: 30%;
  left: 30%;
}

@keyframes spin {
  0% {
    transform: rotate(0deg);
  }
  100% {
    transform: rotate(360deg);
  }
}

.connecting-title {
  font-size: 20px;
  font-weight: 600;
  color: #e5e5e7;
  letter-spacing: 2px;
}

.connecting-host {
  font-size: 16px;
  color: #00f0ff;
  font-weight: 500;
}

.connecting-info {
  font-size: 13px;
  color: #6b6b78;
  font-family: 'JetBrains Mono', monospace;
}

/* 工具栏 */
.ssh-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 24px;
  background: linear-gradient(180deg, #12121a 0%, #0f0f14 100%);
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
  gap: 16px;
}

.toolbar-left {
  display: flex;
  align-items: center;
  gap: 10px;
}

.toolbar-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 18px;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 10px;
  color: #8b8b9a;
  font-size: 12px;
  font-weight: 600;
  letter-spacing: 0.5px;
  cursor: pointer;
  transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
}

.toolbar-btn:hover {
  background: rgba(255, 255, 255, 0.05);
  color: #e5e5e7;
  border-color: rgba(255, 255, 255, 0.1);
  transform: translateY(-1px);
}

.toolbar-btn.primary {
  background: linear-gradient(135deg, rgba(0, 240, 255, 0.18) 0%, rgba(59, 130, 246, 0.1) 100%);
  border-color: rgba(0, 240, 255, 0.25);
  color: #00f0ff;
  box-shadow: 0 4px 16px rgba(0, 240, 255, 0.12);
}

.toolbar-btn.primary:hover {
  background: linear-gradient(135deg, rgba(0, 240, 255, 0.22) 0%, rgba(59, 130, 246, 0.14) 100%);
  box-shadow: 0 6px 20px rgba(0, 240, 255, 0.18);
  transform: translateY(-2px);
}

.toolbar-btn.active {
  background: rgba(0, 240, 255, 0.1);
  color: #00f0ff;
  border-color: rgba(0, 240, 255, 0.2);
}

.toolbar-btn .badge {
  display: flex;
  align-items: center;
  justify-content: center;
  min-width: 20px;
  height: 20px;
  padding: 0 6px;
  background: rgba(0, 240, 255, 0.1);
  border-radius: 10px;
  font-size: 11px;
  color: #00f0ff;
  border: 1px solid rgba(0, 240, 255, 0.2);
}

.toolbar-right {
  display: flex;
  align-items: center;
}

.search-box {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 16px;
  background: rgba(255, 255, 255, 0.02);
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 10px;
  width: 260px;
  transition: all 0.25s ease;
}

.search-box:focus-within {
  border-color: rgba(0, 240, 255, 0.25);
  background: rgba(255, 255, 255, 0.03);
  box-shadow: 0 0 0 3px rgba(0, 240, 255, 0.08);
}

.search-box i {
  color: #6b6b78;
  font-size: 14px;
  transition: color 0.25s ease;
}

.search-box:focus-within i {
  color: #00f0ff;
}

.search-box input {
  flex: 1;
  background: transparent;
  border: none;
  outline: none;
  color: #e0e0e0;
  font-size: 13px;
}

.search-box input::placeholder {
  color: #5a5a68;
}

/* 主机列表区域 */
.hosts-section {
  flex: 1;
  padding: 28px;
  overflow-y: auto;
}

.hosts-section::-webkit-scrollbar {
  width: 8px;
}

.hosts-section::-webkit-scrollbar-track {
  background: transparent;
}

.hosts-section::-webkit-scrollbar-thumb {
  background: linear-gradient(180deg, rgba(0, 240, 255, 0.2), rgba(59, 130, 246, 0.2));
  border-radius: 4px;
}

.section-title {
  font-size: 20px;
  font-weight: 700;
  color: #e5e5e7;
  margin-bottom: 24px;
  letter-spacing: 0.3px;
}

.hosts-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 18px;
}

/* 主机卡片 */
.host-card {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 18px;
  background: rgba(255, 255, 255, 0.02);
  border: 1px solid rgba(255, 255, 255, 0.05);
  border-radius: 16px;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  position: relative;
  overflow: hidden;
}

.host-card::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: linear-gradient(135deg, rgba(0, 240, 255, 0.06) 0%, rgba(59, 130, 246, 0.03) 100%);
  opacity: 0;
  transition: opacity 0.3s ease;
  pointer-events: none;
}

.host-card:hover {
  background: rgba(255, 255, 255, 0.04);
  border-color: rgba(0, 240, 255, 0.15);
  transform: translateY(-4px);
  box-shadow: 0 12px 32px rgba(0, 240, 255, 0.08);
}

.host-card:hover::before {
  opacity: 1;
}

.host-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 52px;
  height: 52px;
  background: linear-gradient(135deg, rgba(0, 240, 255, 0.18) 0%, rgba(59, 130, 246, 0.1) 100%);
  border-radius: 14px;
  flex-shrink: 0;
  border: 1px solid rgba(0, 240, 255, 0.15);
}

.host-icon i {
  font-size: 26px;
  color: #00f0ff;
  filter: drop-shadow(0 0 8px rgba(0, 240, 255, 0.4));
}

.host-info {
  flex: 1;
  min-width: 0;
}

.host-name {
  font-size: 15px;
  font-weight: 600;
  color: #e5e5e7;
  margin-bottom: 5px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.host-detail {
  font-size: 12px;
  color: #6b6b78;
  font-weight: 500;
}

.host-actions {
  display: flex;
  gap: 6px;
  opacity: 0;
  transition: opacity 0.3s ease;
}

.host-card:hover .host-actions {
  opacity: 1;
}

.action-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 8px;
  color: #8b8b9a;
  cursor: pointer;
  transition: all 0.25s ease;
}

.action-btn:hover {
  background: rgba(0, 240, 255, 0.1);
  border-color: rgba(0, 240, 255, 0.2);
  color: #00f0ff;
  transform: scale(1.05);
}

/* 添加卡片 */
.add-card {
  flex-direction: column;
  justify-content: center;
  min-height: 88px;
  border-style: dashed;
  background: transparent;
  gap: 10px;
}

.add-card:hover {
  background: rgba(0, 240, 255, 0.05);
  border-color: rgba(0, 240, 255, 0.3);
}

.add-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 44px;
  height: 44px;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 12px;
  transition: all 0.3s ease;
}

.add-card:hover .add-icon {
  background: rgba(0, 240, 255, 0.1);
  border-color: rgba(0, 240, 255, 0.25);
}

.add-icon i {
  font-size: 22px;
  color: #8b8b9a;
  transition: all 0.3s ease;
}

.add-card:hover .add-icon i {
  color: #00f0ff;
  filter: drop-shadow(0 0 8px rgba(0, 240, 255, 0.4));
}

.add-text {
  font-size: 13px;
  color: #6b6b78;
  font-weight: 500;
  transition: color 0.3s ease;
}

.add-card:hover .add-text {
  color: #e5e5e7;
}

/* 模态框 */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.75);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  backdrop-filter: blur(8px);
  animation: fadeIn 0.25s ease;
}

@keyframes fadeIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

.modal-container {
  width: 520px;
  max-width: 90vw;
  max-height: 90vh;
  background: linear-gradient(180deg, #151520 0%, #0f0f16 100%);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 20px;
  overflow: hidden;
  box-shadow: 0 24px 64px rgba(0, 240, 255, 0.1), 0 0 0 1px rgba(0, 240, 255, 0.05);
  animation: slideUp 0.35s cubic-bezier(0.4, 0, 0.2, 1);
}

@keyframes slideUp {
  from {
    opacity: 0;
    transform: translateY(20px) scale(0.98);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px 24px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
}

.modal-header h3 {
  font-size: 18px;
  font-weight: 700;
  color: #e5e5e7;
  letter-spacing: 0.3px;
}

.close-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 10px;
  color: #8b8b9a;
  cursor: pointer;
  transition: all 0.25s ease;
}

.close-btn:hover {
  background: rgba(255, 95, 87, 0.12);
  border-color: rgba(255, 95, 87, 0.25);
  color: #ff5f57;
  transform: scale(1.05);
}

.modal-body {
  padding: 24px;
  overflow-y: auto;
  max-height: 60vh;
}

.modal-body::-webkit-scrollbar {
  width: 6px;
}

.modal-body::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.1);
  border-radius: 3px;
}

.form-group {
  margin-bottom: 20px;
}

.form-row {
  display: flex;
  gap: 16px;
}

.form-row .form-group {
  flex: 1;
}

.form-row .form-group.small {
  flex: 0 0 120px;
}

.form-group label {
  display: block;
  font-size: 13px;
  font-weight: 600;
  color: #9b9ba5;
  margin-bottom: 8px;
  letter-spacing: 0.2px;
}

.form-group input[type="text"],
.form-group input[type="password"],
.form-group input[type="number"] {
  width: 100%;
  padding: 12px 14px;
  background: rgba(255, 255, 255, 0.02);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 10px;
  color: #e0e0e0;
  font-size: 14px;
  transition: all 0.25s ease;
}

.form-group input:focus {
  outline: none;
  border-color: rgba(0, 240, 255, 0.3);
  background: rgba(255, 255, 255, 0.03);
  box-shadow: 0 0 0 3px rgba(0, 240, 255, 0.1);
}

.form-group input::placeholder {
  color: #5a5a68;
}

/* 认证方式标签 */
.auth-tabs {
  display: flex;
  gap: 10px;
}

.auth-tab {
  flex: 1;
  padding: 12px;
  background: rgba(255, 255, 255, 0.02);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 10px;
  color: #8b8b9a;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.25s ease;
}

.auth-tab:hover {
  background: rgba(255, 255, 255, 0.04);
  color: #e5e5e7;
}

.auth-tab.active {
  background: rgba(0, 240, 255, 0.12);
  border-color: rgba(0, 240, 255, 0.3);
  color: #00f0ff;
  box-shadow: 0 4px 12px rgba(0, 240, 255, 0.1);
}

/* 文件输入 */
.file-input {
  display: flex;
  gap: 10px;
}

.file-input input {
  flex: 1;
}

.file-btn {
  padding: 12px 20px;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 10px;
  color: #8b8b9a;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.25s ease;
  white-space: nowrap;
}

.file-btn:hover {
  background: rgba(0, 240, 255, 0.1);
  border-color: rgba(0, 240, 255, 0.25);
  color: #00f0ff;
}

/* 复选框 */
.checkbox-label {
  display: flex;
  align-items: center;
  gap: 10px;
  cursor: pointer;
}

.checkbox-label input[type="checkbox"] {
  width: 20px;
  height: 20px;
  accent-color: #00f0ff;
  cursor: pointer;
}

.checkbox-label span {
  font-size: 13px;
  color: #9b9ba5;
  font-weight: 500;
}

/* 模态框底部 */
.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  padding: 20px 24px;
  border-top: 1px solid rgba(255, 255, 255, 0.06);
}

.btn {
  padding: 12px 24px;
  border-radius: 10px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.25s ease;
  letter-spacing: 0.3px;
}

.btn.secondary {
  background: transparent;
  border: 1px solid rgba(255, 255, 255, 0.1);
  color: #9b9ba5;
}

.btn.secondary:hover {
  background: rgba(255, 255, 255, 0.04);
  color: #e5e5e7;
  border-color: rgba(255, 255, 255, 0.15);
}

.btn.primary {
  background: linear-gradient(135deg, rgba(0, 240, 255, 0.2) 0%, rgba(59, 130, 246, 0.12) 100%);
  border: 1px solid rgba(0, 240, 255, 0.3);
  color: #00f0ff;
  box-shadow: 0 4px 16px rgba(0, 240, 255, 0.15);
}

.btn.primary:hover:not(:disabled) {
  background: linear-gradient(135deg, rgba(0, 240, 255, 0.25) 0%, rgba(59, 130, 246, 0.16) 100%);
  box-shadow: 0 6px 20px rgba(0, 240, 255, 0.2);
  transform: translateY(-1px);
}

.btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

/* Toast 提示 */
.toast-container {
  position: fixed;
  bottom: 32px;
  right: 32px;
  z-index: 1100;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.toast {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px 20px;
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.05) 0%, rgba(255, 255, 255, 0.02) 100%);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 14px;
  color: #e0e0e0;
  font-size: 14px;
  font-weight: 500;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.35);
  animation: toastIn 0.35s cubic-bezier(0.4, 0, 0.2, 1);
  backdrop-filter: blur(10px);
}

@keyframes toastIn {
  from {
    transform: translateX(100%);
    opacity: 0;
  }
  to {
    transform: translateX(0);
    opacity: 1;
  }
}

.toast.success {
  border-color: rgba(40, 202, 65, 0.4);
  background: linear-gradient(135deg, rgba(40, 202, 65, 0.15) 0%, rgba(255, 255, 255, 0.02) 100%);
  color: #28ca41;
}

.toast.error {
  border-color: rgba(255, 95, 87, 0.4);
  background: linear-gradient(135deg, rgba(255, 95, 87, 0.15) 0%, rgba(255, 255, 255, 0.02) 100%);
  color: #ff5f57;
}

.toast.warning {
  border-color: rgba(250, 204, 21, 0.4);
  background: linear-gradient(135deg, rgba(250, 204, 21, 0.15) 0%, rgba(255, 255, 255, 0.02) 100%);
  color: #facc15;
}

.toast.info {
  border-color: rgba(96, 165, 250, 0.4);
  background: linear-gradient(135deg, rgba(96, 165, 250, 0.15) 0%, rgba(255, 255, 255, 0.02) 100%);
  color: #60a5fa;
}

.toast-enter-active,
.toast-leave-active {
  transition: all 0.35s cubic-bezier(0.4, 0, 0.2, 1);
}

.toast-enter-from,
.toast-leave-to {
  transform: translateX(100%);
  opacity: 0;
}
</style>
