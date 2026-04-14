<template>
  <div class="ssh-panel" role="region" aria-label="SSH 主机管理">
    <!-- 连接中 Loading 遮罩 - Skeleton 风格 -->
    <Transition name="fade">
      <div
        class="connecting-overlay"
        v-if="connecting"
        role="alert"
        aria-live="polite"
        aria-busy="true"
        aria-label="正在连接主机"
      >
        <div class="connecting-content">
          <!-- Skeleton 终端预览 -->
          <div class="skeleton-terminal" aria-hidden="true">
            <div class="skeleton-header">
              <div class="skeleton-dots">
                <span class="dot red"></span>
                <span class="dot yellow"></span>
                <span class="dot green"></span>
              </div>
              <div class="skeleton-title">{{ connectingHost?.host || 'server' }}</div>
            </div>
            <div class="skeleton-body">
              <div class="skeleton-line" style="width: 60%"></div>
              <div class="skeleton-line" style="width: 80%"></div>
              <div class="skeleton-line" style="width: 45%"></div>
              <div class="skeleton-line highlight" style="width: 70%"></div>
              <div class="skeleton-line" style="width: 55%"></div>
            </div>
          </div>

          <!-- 连接状态 -->
          <div class="connecting-status">
            <div class="status-indicator" aria-hidden="true">
              <span class="pulse-ring"></span>
              <span class="pulse-ring delay"></span>
              <span class="status-dot"></span>
            </div>
            <div class="status-text">
              <span class="status-title">正在连接</span>
              <span class="status-host">{{ connectingHost?.name || connectingHost?.host }}</span>
              <span class="status-info">{{ connectingHost?.username }}@{{ connectingHost?.host }}:{{ connectingHost?.port || 22 }}</span>
            </div>
          </div>
        </div>
      </div>
    </Transition>

    <!-- 顶部工具栏 -->
    <div class="ssh-toolbar" role="toolbar" aria-label="主机管理工具栏">
      <div class="toolbar-left">
        <button
          class="toolbar-btn primary"
          @click="showNewHostModal = true"
          aria-label="新建主机"
        >
          <i class="iconfont icon-add" aria-hidden="true"></i>
          <span>NEW HOST</span>
        </button>
      </div>
      <div class="toolbar-right">
        <div class="search-box" role="search">
          <i class="iconfont icon-search" aria-hidden="true"></i>
          <input
            type="text"
            placeholder="搜索主机..."
            v-model="searchQuery"
            aria-label="搜索主机"
            @input="onSearchInput"
          />
        </div>
      </div>
    </div>

    <!-- 主机列表 -->
    <div class="hosts-section">
      <h2 class="section-title" id="hosts-heading">Hosts</h2>
      <div
        class="hosts-grid"
        role="list"
        aria-labelledby="hosts-heading"
        @keydown="handleHostsKeydown"
      >
        <button
          v-for="(host, index) in filteredHosts"
          :key="host.id"
          class="host-card"
          role="listitem"
          :aria-label="`${host.name || host.host}, ${host.protocol}, 用户 ${host.username}`"
          :tabindex="index === 0 ? 0 : -1"
          @click="connectToHost(host)"
          @keydown="handleHostKeydown($event, index)"
        >
          <div class="host-icon" aria-hidden="true">
            <i class="iconfont icon-linux"></i>
          </div>
          <div class="host-info">
            <div class="host-name">{{ host.name || host.host }}</div>
            <div class="host-detail">{{ host.protocol }}, {{ host.username }}</div>
          </div>
          <div class="host-actions" @click.stop>
            <button
              class="action-btn"
              @click="editHost(host)"
              :aria-label="`编辑 ${host.name || host.host}`"
              title="编辑"
            >
              <i class="iconfont icon-edit" aria-hidden="true"></i>
            </button>
            <button
              class="action-btn"
              :class="{ danger: deleteConfirmId === host.id }"
              @click="deleteHost(host.id)"
              :aria-label="deleteConfirmId === host.id ? `确认删除 ${host.name || host.host}` : `删除 ${host.name || host.host}`"
              :title="deleteConfirmId === host.id ? '再次点击确认删除' : '删除'"
            >
              <i class="iconfont icon-delete" aria-hidden="true"></i>
            </button>
          </div>
        </button>

        <!-- 添加新主机卡片 -->
        <button
          class="host-card add-card"
          @click="showNewHostModal = true"
          aria-label="添加新主机"
          :tabindex="filteredHosts.length === 0 ? 0 : -1"
        >
          <div class="add-icon" aria-hidden="true">
            <i class="iconfont icon-add"></i>
          </div>
          <div class="add-text">添加新主机</div>
        </button>
      </div>
    </div>

    <!-- 新建/编辑主机模态框 -->
    <div
      class="modal-overlay"
      v-if="showNewHostModal"
      @click.self="closeModal"
      role="dialog"
      aria-modal="true"
      :aria-labelledby="editingHost ? 'modal-title-edit' : 'modal-title-new'"
    >
      <div class="modal-container">
        <div class="modal-header">
          <h3 :id="editingHost ? 'modal-title-edit' : 'modal-title-new'">
            {{ editingHost ? '编辑主机' : '新建主机' }}
          </h3>
          <button
            class="close-btn"
            @click="closeModal"
            aria-label="关闭"
          >
            <i class="iconfont icon-close" aria-hidden="true"></i>
          </button>
        </div>
        <div class="modal-body">
          <form @submit.prevent="saveHost" aria-label="主机配置表单">
            <!-- 主机名称 -->
            <div class="form-group">
              <label>主机名称</label>
              <input
                type="text"
                v-model="hostForm.name"
                placeholder="例如: 生产服务器"
              />
            </div>

            <!-- 主机地址 + 端口 -->
            <div class="form-row">
              <div class="form-group" :class="{ 'has-error': errors.host }">
                <label for="host-address">主机地址 <span class="required">*</span></label>
                <input
                  id="host-address"
                  type="text"
                  v-model="hostForm.host"
                  placeholder="IP 或域名"
                  required
                  aria-required="true"
                  :aria-invalid="!!errors.host"
                  :aria-describedby="errors.host ? 'host-error' : undefined"
                  @blur="validateField('host')"
                  @input="clearError('host')"
                />
                <Transition name="error-slide">
                  <span class="error-message" v-if="errors.host" id="host-error" role="alert">
                    <i class="iconfont icon-warning" aria-hidden="true"></i>
                    {{ errors.host }}
                  </span>
                </Transition>
              </div>
              <div class="form-group small" :class="{ 'has-error': errors.port }">
                <label for="host-port">端口</label>
                <input
                  id="host-port"
                  type="number"
                  v-model="hostForm.port"
                  placeholder="22"
                  :aria-invalid="!!errors.port"
                  :aria-describedby="errors.port ? 'port-error' : undefined"
                  @blur="validateField('port')"
                  @input="clearError('port')"
                />
                <Transition name="error-slide">
                  <span class="error-message" v-if="errors.port" id="port-error" role="alert">
                    <i class="iconfont icon-warning" aria-hidden="true"></i>
                    {{ errors.port }}
                  </span>
                </Transition>
              </div>
            </div>

            <!-- 用户名 -->
            <div class="form-group" :class="{ 'has-error': errors.username }">
              <label for="host-username">用户名 <span class="required">*</span></label>
              <input
                id="host-username"
                type="text"
                v-model="hostForm.username"
                placeholder="root"
                required
                aria-required="true"
                :aria-invalid="!!errors.username"
                :aria-describedby="errors.username ? 'username-error' : undefined"
                @blur="validateField('username')"
                @input="clearError('username')"
              />
              <Transition name="error-slide">
                <span class="error-message" v-if="errors.username" id="username-error" role="alert">
                  <i class="iconfont icon-warning" aria-hidden="true"></i>
                  {{ errors.username }}
                </span>
              </Transition>
            </div>

            <!-- 认证方式 -->
            <div class="form-group">
              <span id="auth-label">认证方式</span>
              <div class="auth-tabs" role="radiogroup" aria-labelledby="auth-label">
                <button
                  type="button"
                  class="auth-tab"
                  :class="{ active: hostForm.authType === 'password' }"
                  role="radio"
                  :aria-checked="hostForm.authType === 'password'"
                  @click="hostForm.authType = 'password'"
                >
                  密码
                </button>
                <button
                  type="button"
                  class="auth-tab"
                  :class="{ active: hostForm.authType === 'key' }"
                  role="radio"
                  :aria-checked="hostForm.authType === 'key'"
                  @click="hostForm.authType = 'key'"
                >
                  私钥
                </button>
              </div>
            </div>

            <!-- 密码 -->
            <div class="form-group" v-if="hostForm.authType === 'password'" :class="{ 'has-error': errors.password }">
              <label>密码 <span class="required" v-if="!editingHost">*</span></label>
              <div class="password-input">
                <input
                  :type="showPassword ? 'text' : 'password'"
                  v-model="hostForm.password"
                  placeholder="输入密码"
                  @blur="validateField('password')"
                  @input="clearError('password')"
                />
                <button type="button" class="toggle-password" @click="showPassword = !showPassword">
                  <i class="iconfont" :class="showPassword ? 'icon-close' : 'icon-search'"></i>
                </button>
              </div>
              <Transition name="error-slide">
                <span class="error-message" v-if="errors.password">
                  <i class="iconfont icon-warning"></i>
                  {{ errors.password }}
                </span>
              </Transition>
              <!-- 密码强度指示器 -->
              <div class="password-strength" v-if="hostForm.password && !editingHost">
                <div class="strength-bar">
                  <div class="strength-fill" :class="passwordStrength.level" :style="{ width: passwordStrength.percent + '%' }"></div>
                </div>
                <span class="strength-text" :class="passwordStrength.level">{{ passwordStrength.text }}</span>
              </div>
            </div>

            <!-- 私钥 -->
            <div class="form-group" v-if="hostForm.authType === 'key'" :class="{ 'has-error': errors.privateKey }">
              <label>私钥路径 <span class="required">*</span></label>
              <div class="file-input">
                <input
                  type="text"
                  v-model="hostForm.privateKey"
                  placeholder="选择私钥文件"
                  readonly
                  @blur="validateField('privateKey')"
                />
                <button type="button" class="file-btn" @click="selectKeyFile">
                  浏览
                </button>
              </div>
              <Transition name="error-slide">
                <span class="error-message" v-if="errors.privateKey">
                  <i class="iconfont icon-warning"></i>
                  {{ errors.privateKey }}
                </span>
              </Transition>
            </div>

            <!-- 保存密码 -->
            <div class="form-group">
              <label class="checkbox-label">
                <input type="checkbox" v-model="hostForm.savePassword" />
                <span class="checkbox-custom"></span>
                <span>保存密码（本地加密存储）</span>
              </label>
            </div>
          </form>
        </div>
        <div class="modal-footer">
          <button class="btn secondary" @click="closeModal">取消</button>
          <button class="btn primary" @click="saveHost" :disabled="!isFormValid || hasErrors">
            {{ editingHost ? '保存' : '添加' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { toast } from '../utils/notification'

const emit = defineEmits(['connect'])

// 搜索状态
const searchQuery = ref('')
const showNewHostModal = ref(false)
const editingHost = ref(null)
const showPassword = ref(false)

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

// 表单验证错误
const errors = ref({
  host: '',
  port: '',
  username: '',
  password: '',
  privateKey: ''
})

// 验证规则
const validateField = (field) => {
  switch (field) {
    case 'host':
      if (!hostForm.value.host.trim()) {
        errors.value.host = '请输入主机地址'
      } else if (!/^[\w.-]+$/.test(hostForm.value.host)) {
        errors.value.host = '主机地址格式不正确'
      } else {
        errors.value.host = ''
      }
      break
    case 'port':
      const port = parseInt(hostForm.value.port)
      if (hostForm.value.port && (isNaN(port) || port < 1 || port > 65535)) {
        errors.value.port = '端口范围: 1-65535'
      } else {
        errors.value.port = ''
      }
      break
    case 'username':
      if (!hostForm.value.username.trim()) {
        errors.value.username = '请输入用户名'
      } else if (!/^[\w.-]+$/.test(hostForm.value.username)) {
        errors.value.username = '用户名格式不正确'
      } else {
        errors.value.username = ''
      }
      break
    case 'password':
      if (!editingHost.value && hostForm.value.authType === 'password' && !hostForm.value.password) {
        errors.value.password = '请输入密码'
      } else if (hostForm.value.password && hostForm.value.password.length < 6) {
        errors.value.password = '密码至少6位'
      } else {
        errors.value.password = ''
      }
      break
    case 'privateKey':
      if (hostForm.value.authType === 'key' && !hostForm.value.privateKey) {
        errors.value.privateKey = '请选择私钥文件'
      } else {
        errors.value.privateKey = ''
      }
      break
  }
}

// 清除错误
const clearError = (field) => {
  errors.value[field] = ''
}

// 密码强度计算
const passwordStrength = computed(() => {
  const pwd = hostForm.value.password
  if (!pwd) return { level: '', percent: 0, text: '' }

  let score = 0
  if (pwd.length >= 6) score += 20
  if (pwd.length >= 10) score += 20
  if (/[a-z]/.test(pwd)) score += 15
  if (/[A-Z]/.test(pwd)) score += 15
  if (/[0-9]/.test(pwd)) score += 15
  if (/[^a-zA-Z0-9]/.test(pwd)) score += 15

  if (score < 40) return { level: 'weak', percent: score, text: '弱' }
  if (score < 70) return { level: 'medium', percent: score, text: '中等' }
  return { level: 'strong', percent: Math.min(score, 100), text: '强' }
})

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

const hasErrors = computed(() => {
  return Object.values(errors.value).some(e => e)
})

// 键盘导航 - 主机列表
const handleHostKeydown = (event, index) => {
  const total = filteredHosts.value.length + 1 // +1 for add button
  let nextIndex = index

  switch (event.key) {
    case 'ArrowRight':
    case 'ArrowDown':
      nextIndex = (index + 1) % total
      event.preventDefault()
      break
    case 'ArrowLeft':
    case 'ArrowUp':
      nextIndex = (index - 1 + total) % total
      event.preventDefault()
      break
    case 'Home':
      nextIndex = 0
      event.preventDefault()
      break
    case 'End':
      nextIndex = total - 1
      event.preventDefault()
      break
    case 'Delete':
      event.preventDefault()
      deleteHost(filteredHosts.value[index].id)
      return
    default:
      return
  }

  // 聚焦下一个主机卡片
  const grid = event.currentTarget.closest('.hosts-grid')
  if (grid) {
    const cards = grid.querySelectorAll('.host-card')
    if (cards[nextIndex]) {
      cards[nextIndex].focus()
    }
  }
}

// 主机列表容器键盘事件
const handleHostsKeydown = (event) => {
  // Tab 键不拦截
  if (event.key === 'Tab') return
}

// 搜索结果公告（屏幕阅读器）
const onSearchInput = () => {
  // 结果数量变化时，可以在这里添加公告
}

// 从 Electron 存储加载主机列表
const loadHosts = async () => {
  try {
    const result = await window.electronAPI.getHosts()
    if (result.success && result.data) {
      hosts.value = result.data
    } else if (!result.data || result.data.length === 0) {
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
  } catch (e) {
    console.error('Failed to load hosts:', e)
    toast.error('加载主机列表失败')
  }
}

// 保存主机列表到 Electron 存储
const saveHosts = async () => {
  try {
    // 将响应式对象转换为普通对象，避免 IPC 序列化问题
    const plainHosts = JSON.parse(JSON.stringify(hosts.value))
    const result = await window.electronAPI.saveHosts(plainHosts)
    if (!result.success) {
      toast.error('保存失败: ' + result.error)
    }
  } catch (e) {
    console.error('Failed to save hosts:', e)
    toast.error('保存主机列表失败')
  }
}

// 删除确认状态
const deleteConfirmId = ref(null)

// 保存主机（带密码加密）
const saveHost = async () => {
  // 验证所有字段
  validateField('host')
  validateField('port')
  validateField('username')
  if (hostForm.value.authType === 'password') {
    validateField('password')
  } else {
    validateField('privateKey')
  }

  if (hasErrors.value) {
    toast.warning('请修正表单错误')
    return
  }

  if (!isFormValid.value) return

  const hostData = {
    ...hostForm.value,
    id: editingHost.value?.id || Date.now()
  }

  // 如果保存密码，先加密
  if (hostData.savePassword && hostData.password) {
    try {
      const encryptResult = await window.electronAPI.encryptPassword(hostData.password)
      if (encryptResult.success && encryptResult.data) {
        hostData.password = encryptResult.data
      } else {
        toast.error('密码加密失败')
        return
      }
    } catch (e) {
      toast.error('密码加密失败: ' + e.message)
      return
    }
  } else {
    hostData.password = ''
  }

  if (editingHost.value) {
    const index = hosts.value.findIndex(h => h.id === editingHost.value.id)
    if (index !== -1) {
      hosts.value[index] = hostData
    }
    toast.success('主机已更新')
  } else {
    hosts.value.push(hostData)
    toast.success('主机已添加')
  }

  await saveHosts()
  closeModal()
}

// 关闭模态框
const closeModal = () => {
  showNewHostModal.value = false
  editingHost.value = null
  showPassword.value = false
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
  errors.value = {
    host: '',
    port: '',
    username: '',
    password: '',
    privateKey: ''
  }
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
    password: '', // 编辑时密码字段为空，用户需要重新输入或使用保存的加密密码
    privateKey: host.privateKey || '',
    savePassword: !!host.password, // 如果之前保存了密码，显示为已保存
    protocol: host.protocol || 'ssh'
  }
  showNewHostModal.value = true
}

// 删除主机
const deleteHost = async (id) => {
  // 如果已经在确认状态，执行删除
  if (deleteConfirmId.value === id) {
    hosts.value = hosts.value.filter(h => h.id !== id)
    await saveHosts()
    toast.info('主机已删除')
    deleteConfirmId.value = null
  } else {
    // 设置确认状态
    deleteConfirmId.value = id
    setTimeout(() => {
      deleteConfirmId.value = null
    }, 3000)
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
      clearError('privateKey')
    }
  }
  input.click()
}

// 连接到主机
const connecting = ref(false)
const connectingHost = ref(null)

const connectToHost = async (host) => {
  // 如果有加密保存的密码，先解密
  let password = host.password
  if (host.savePassword && host.password) {
    try {
      const decryptResult = await window.electronAPI.decryptPassword(host.password)
      if (decryptResult.success && decryptResult.data) {
        password = decryptResult.data
      } else {
        toast.error('密码解密失败')
        return
      }
    } catch (e) {
      toast.error('密码解密失败: ' + e.message)
      return
    }
  }

  // 检查是否有密码
  if (!password) {
    toast.warning('请先编辑主机配置并保存密码')
    return
  }

  // 显示 loading
  connecting.value = true
  connectingHost.value = host

  try {
    // 触发连接事件，传递解密后的密码
    emit('connect', { ...host, password })
  } catch (error) {
    connecting.value = false
    toast.error(`连接失败: ${error.message}`)
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
  background: linear-gradient(135deg, #0c0e12 0%, #141820 50%, #0c0e12 100%);
  color: #e0e0e0;
  position: relative;
}

.ssh-panel::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: 
    radial-gradient(ellipse at 20% 20%, rgba(183, 159, 255, 0.03) 0%, transparent 50%),
    radial-gradient(ellipse at 80% 80%, rgba(45, 183, 242, 0.03) 0%, transparent 50%);
  pointer-events: none;
  z-index: 0;
}

/* ========== 连接中 Loading 遮罩 - Skeleton 风格 ========== */
.connecting-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(28, 28, 30, 0.95);
  backdrop-filter: blur(12px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: var(--z-popover, 2000);
}

.connecting-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 32px;
}

/* Skeleton 终端预览 */
.skeleton-terminal {
  width: 320px;
  background: var(--color-bg-surface, #2c2c2e);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: var(--radius-lg, 14px);
  overflow: hidden;
  box-shadow: var(--shadow-lg, 0 8px 32px rgba(0, 0, 0, 0.25));
}

.skeleton-header {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  background: rgba(255, 255, 255, 0.03);
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
}

.skeleton-dots {
  display: flex;
  gap: 6px;
}

.skeleton-dots .dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
}

.dot.red { background: #ff5f57; }
.dot.yellow { background: #febc2e; }
.dot.green { background: #28c840; }

.skeleton-title {
  flex: 1;
  font-size: 12px;
  color: #6b6b78;
  font-family: 'JetBrains Mono', monospace;
}

.skeleton-body {
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.skeleton-line {
  height: 12px;
  background: linear-gradient(90deg, rgba(255, 255, 255, 0.05) 0%, rgba(255, 255, 255, 0.1) 50%, rgba(255, 255, 255, 0.05) 100%);
  background-size: 200% 100%;
  border-radius: 4px;
  animation: skeleton-shimmer 1.5s ease-in-out infinite;
}

.skeleton-line.highlight {
  background: linear-gradient(90deg, rgba(10, 132, 255, 0.05) 0%, rgba(10, 132, 255, 0.15) 50%, rgba(10, 132, 255, 0.05) 100%);
  background-size: 200% 100%;
}

@keyframes skeleton-shimmer {
  0% { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}

/* 连接状态 */
.connecting-status {
  display: flex;
  align-items: center;
  gap: 16px;
}

.status-indicator {
  position: relative;
  width: 48px;
  height: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.pulse-ring {
  position: absolute;
  width: 100%;
  height: 100%;
  border: 2px solid rgba(10, 132, 255, 0.3);
  border-radius: 50%;
  animation: pulse-ring 2s ease-out infinite;
}

.pulse-ring.delay {
  animation-delay: 0.5s;
}

@keyframes pulse-ring {
  0% {
    transform: scale(0.8);
    opacity: 1;
  }
  100% {
    transform: scale(1.5);
    opacity: 0;
  }
}

.status-dot {
  width: 16px;
  height: 16px;
  background: var(--color-primary, #b79fff);
  border-radius: 50%;
  animation: dot-pulse 1s ease-in-out infinite;
}

@keyframes dot-pulse {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.1); }
}

.status-text {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.status-title {
  font-size: 18px;
  font-weight: 600;
  color: #e5e5e7;
  letter-spacing: 1px;
}

.status-host {
  font-size: 15px;
  color: var(--color-primary, #b79fff);
  font-weight: 500;
}

.status-info {
  font-size: 12px;
  color: #6b6b78;
  font-family: 'JetBrains Mono', monospace;
}

/* ========== 工具栏 ========== */
.ssh-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px 28px;
  background: rgba(20, 24, 32, 0.6);
  backdrop-filter: blur(20px);
  border-bottom: 1px solid rgba(183, 159, 255, 0.08);
  gap: 20px;
  position: relative;
  z-index: 1;
}

.toolbar-left {
  display: flex;
  align-items: center;
  gap: 12px;
}

.toolbar-btn {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 20px;
  min-height: 44px;
  background: rgba(183, 159, 255, 0.08);
  border: 1px solid rgba(183, 159, 255, 0.15);
  border-radius: 12px;
  color: var(--color-primary, #b79fff);
  font-size: 13px;
  font-weight: 600;
  letter-spacing: 0.5px;
  cursor: pointer;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  position: relative;
  overflow: hidden;
}

.toolbar-btn::before {
  content: '';
  position: absolute;
  top: 0;
  left: -100%;
  width: 100%;
  height: 100%;
  background: linear-gradient(90deg, transparent, rgba(183, 159, 255, 0.1), transparent);
  transition: left 0.5s ease;
}

.toolbar-btn:hover::before {
  left: 100%;
}

.toolbar-btn:hover {
  background: rgba(183, 159, 255, 0.12);
  border-color: rgba(183, 159, 255, 0.25);
  transform: translateY(-2px);
  box-shadow: 0 8px 20px rgba(183, 159, 255, 0.15);
}

.toolbar-btn.primary {
  background: linear-gradient(135deg, rgba(183, 159, 255, 0.15) 0%, rgba(183, 159, 255, 0.08) 100%);
  border-color: rgba(183, 159, 255, 0.2);
  color: var(--color-primary, #b79fff);
}

.toolbar-btn.primary:hover {
  background: linear-gradient(135deg, rgba(183, 159, 255, 0.2) 0%, rgba(183, 159, 255, 0.12) 100%);
  border-color: rgba(183, 159, 255, 0.35);
}

.toolbar-right {
  display: flex;
  align-items: center;
}

.search-box {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 18px;
  background: rgba(20, 24, 32, 0.5);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(183, 159, 255, 0.1);
  border-radius: 12px;
  width: 280px;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  position: relative;
}

.search-box::before {
  content: '';
  position: absolute;
  top: -1px;
  left: -1px;
  right: -1px;
  bottom: -1px;
  background: linear-gradient(135deg, rgba(183, 159, 255, 0.2), rgba(45, 183, 242, 0.2));
  border-radius: 12px;
  opacity: 0;
  transition: opacity 0.2s ease;
  z-index: -1;
}

.search-box:focus-within::before {
  opacity: 1;
}

.search-box:focus-within {
  border-color: rgba(183, 159, 255, 0.25);
  background: rgba(20, 24, 32, 0.7);
  box-shadow: 0 4px 16px rgba(183, 159, 255, 0.1);
}

.search-box i {
  color: rgba(183, 159, 255, 0.6);
  font-size: 16px;
  transition: color 0.2s ease;
}

.search-box:focus-within i {
  color: var(--color-primary, #b79fff);
}

.search-box input {
  flex: 1;
  background: transparent;
  border: none;
  outline: none;
  color: #e0e0e0;
  font-size: 14px;
}

.search-box input::placeholder {
  color: rgba(183, 159, 255, 0.4);
}

/* ========== 主机列表区域 ========== */
.hosts-section {
  flex: 1;
  padding: 32px;
  overflow-y: auto;
  position: relative;
  z-index: 1;
}

.hosts-section::-webkit-scrollbar {
  width: 8px;
}

.hosts-section::-webkit-scrollbar-track {
  background: rgba(183, 159, 255, 0.02);
  border-radius: 4px;
}

.hosts-section::-webkit-scrollbar-thumb {
  background: rgba(183, 159, 255, 0.15);
  border-radius: 4px;
}

.hosts-section::-webkit-scrollbar-thumb:hover {
  background: rgba(183, 159, 255, 0.25);
}

.section-title {
  font-size: 24px;
  font-weight: 700;
  color: #f6f6fc;
  margin-bottom: 28px;
  letter-spacing: 0.5px;
  position: relative;
  display: inline-block;
}

.section-title::after {
  content: '';
  position: absolute;
  bottom: -8px;
  left: 0;
  width: 60px;
  height: 3px;
  background: linear-gradient(90deg, var(--color-primary, #b79fff), var(--color-secondary, #2db7f2));
  border-radius: 2px;
}

/* CSS Grid 自适应布局 */
.hosts-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 20px;
}

/* 响应式断点 */
@media (max-width: 1200px) {
  .hosts-grid {
    grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  }
}

@media (max-width: 900px) {
  .hosts-grid {
    grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
  }
}

@media (max-width: 600px) {
  .hosts-grid {
    grid-template-columns: 1fr;
  }
}

/* ========== 主机卡片 ========== */
.host-card {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 20px;
  background: rgba(20, 24, 32, 0.4);
  backdrop-filter: blur(16px);
  border: 1px solid rgba(183, 159, 255, 0.08);
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
  background: linear-gradient(135deg, rgba(183, 159, 255, 0.05) 0%, rgba(45, 183, 242, 0.05) 100%);
  opacity: 0;
  transition: opacity 0.3s ease;
  pointer-events: none;
}

.host-card::after {
  content: '';
  position: absolute;
  top: -50%;
  left: -50%;
  width: 200%;
  height: 200%;
  background: radial-gradient(circle, rgba(183, 159, 255, 0.1) 0%, transparent 70%);
  opacity: 0;
  transition: opacity 0.3s ease;
  pointer-events: none;
}

.host-card:hover {
  background: rgba(20, 24, 32, 0.6);
  border-color: rgba(183, 159, 255, 0.2);
  transform: translateY(-6px) scale(1.02);
  box-shadow: 
    0 12px 32px rgba(183, 159, 255, 0.15),
    0 4px 12px rgba(0, 0, 0, 0.2),
    inset 0 1px 0 rgba(183, 159, 255, 0.1);
}

.host-card:hover::before {
  opacity: 1;
}

.host-card:hover::after {
  opacity: 0.5;
}

.host-card:focus {
  outline: none;
  border-color: rgba(183, 159, 255, 0.3);
  box-shadow: 
    0 0 0 3px rgba(183, 159, 255, 0.15),
    0 12px 32px rgba(183, 159, 255, 0.15);
}

.host-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 56px;
  height: 56px;
  background: linear-gradient(135deg, rgba(183, 159, 255, 0.12) 0%, rgba(45, 183, 242, 0.12) 100%);
  border-radius: 14px;
  flex-shrink: 0;
  border: 1px solid rgba(183, 159, 255, 0.15);
  position: relative;
  overflow: hidden;
}

.host-icon::before {
  content: '';
  position: absolute;
  top: -2px;
  left: -2px;
  right: -2px;
  bottom: -2px;
  background: linear-gradient(135deg, rgba(183, 159, 255, 0.3), rgba(45, 183, 242, 0.3));
  border-radius: 14px;
  opacity: 0;
  transition: opacity 0.3s ease;
  z-index: -1;
}

.host-card:hover .host-icon::before {
  opacity: 1;
}

.host-icon i {
  font-size: 28px;
  color: var(--color-primary, #b79fff);
  transition: all 0.3s ease;
}

.host-card:hover .host-icon i {
  transform: scale(1.1);
  color: var(--color-secondary, #2db7f2);
}

.host-info {
  flex: 1;
  min-width: 0;
}

.host-name {
  font-size: 16px;
  font-weight: 600;
  color: #f6f6fc;
  margin-bottom: 6px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  transition: color 0.3s ease;
}

.host-card:hover .host-name {
  color: var(--color-primary, #b79fff);
}

.host-detail {
  font-size: 13px;
  color: rgba(183, 159, 255, 0.6);
  font-weight: 500;
  display: flex;
  align-items: center;
  gap: 8px;
}

.host-detail::before {
  content: '';
  width: 4px;
  height: 4px;
  background: var(--color-secondary, #2db7f2);
  border-radius: 50%;
  opacity: 0.6;
}

.host-actions {
  display: flex;
  gap: 8px;
  opacity: 0;
  transition: opacity 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.host-card:hover .host-actions {
  opacity: 1;
}

.action-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  min-width: 44px;
  min-height: 44px;
  background: rgba(183, 159, 255, 0.08);
  border: 1px solid rgba(183, 159, 255, 0.12);
  border-radius: 12px;
  color: rgba(183, 159, 255, 0.8);
  cursor: pointer;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  position: relative;
  overflow: hidden;
}

.action-btn::before {
  content: '';
  position: absolute;
  top: 50%;
  left: 50%;
  width: 0;
  height: 0;
  background: rgba(183, 159, 255, 0.2);
  border-radius: 50%;
  transform: translate(-50%, -50%);
  transition: width 0.3s ease, height 0.3s ease;
}

.action-btn:hover::before {
  width: 100%;
  height: 100%;
}

.action-btn:hover {
  background: rgba(183, 159, 255, 0.15);
  border-color: rgba(183, 159, 255, 0.25);
  color: var(--color-primary, #b79fff);
  transform: scale(1.05);
}

.action-btn:focus {
  outline: none;
  box-shadow: 0 0 0 3px rgba(183, 159, 255, 0.2);
}

/* 添加卡片 */
.add-card {
  flex-direction: column;
  justify-content: center;
  min-height: 96px;
  border-style: dashed;
  background: rgba(183, 159, 255, 0.03);
  border-color: rgba(183, 159, 255, 0.15);
  gap: 12px;
}

.add-card:hover {
  background: rgba(183, 159, 255, 0.08);
  border-color: rgba(183, 159, 255, 0.3);
  transform: translateY(-6px) scale(1.02);
}

.add-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 48px;
  height: 48px;
  background: rgba(183, 159, 255, 0.08);
  border: 1px solid rgba(183, 159, 255, 0.12);
  border-radius: 12px;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  position: relative;
}

.add-icon::before {
  content: '';
  position: absolute;
  top: -2px;
  left: -2px;
  right: -2px;
  bottom: -2px;
  background: linear-gradient(135deg, rgba(183, 159, 255, 0.3), rgba(45, 183, 242, 0.3));
  border-radius: 12px;
  opacity: 0;
  transition: opacity 0.3s ease;
  z-index: -1;
}

.add-card:hover .add-icon {
  background: rgba(183, 159, 255, 0.15);
  border-color: rgba(183, 159, 255, 0.25);
  transform: scale(1.1);
}

.add-card:hover .add-icon::before {
  opacity: 1;
}

.add-icon i {
  font-size: 24px;
  color: rgba(183, 159, 255, 0.7);
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.add-card:hover .add-icon i {
  color: var(--color-primary, #b79fff);
  transform: rotate(90deg);
}

.add-text {
  font-size: 14px;
  color: rgba(183, 159, 255, 0.6);
  font-weight: 500;
  transition: color 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.add-card:hover .add-text {
  color: var(--color-primary, #b79fff);
}

/* ========== 模态框 ========== */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(12, 14, 18, 0.85);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: var(--z-modal-overlay, 3001);
  backdrop-filter: blur(12px);
  animation: fadeIn 0.2s cubic-bezier(0.4, 0, 0.2, 1);
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

.modal-container {
  width: 540px;
  max-width: 90vw;
  max-height: 90vh;
  background: rgba(20, 24, 32, 0.95);
  backdrop-filter: blur(20px);
  border: 1px solid rgba(183, 159, 255, 0.12);
  border-radius: 20px;
  overflow: hidden;
  box-shadow: 
    0 24px 64px rgba(183, 159, 255, 0.2),
    0 8px 24px rgba(0, 0, 0, 0.3),
    inset 0 1px 0 rgba(183, 159, 255, 0.1);
  animation: slideUp 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  position: relative;
}

.modal-container::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 1px;
  background: linear-gradient(90deg, transparent, rgba(183, 159, 255, 0.3), transparent);
}

@keyframes slideUp {
  from {
    opacity: 0;
    transform: translateY(24px) scale(0.96);
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
  padding: 24px 28px;
  border-bottom: 1px solid rgba(183, 159, 255, 0.08);
  background: rgba(183, 159, 255, 0.03);
}

.modal-header h3 {
  font-size: 20px;
  font-weight: 700;
  color: #f6f6fc;
  letter-spacing: 0.5px;
}

.close-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  min-width: 44px;
  min-height: 44px;
  background: rgba(183, 159, 255, 0.08);
  border: 1px solid rgba(183, 159, 255, 0.12);
  border-radius: 12px;
  color: rgba(183, 159, 255, 0.7);
  cursor: pointer;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
}

.close-btn:hover {
  background: rgba(255, 110, 132, 0.15);
  border-color: rgba(255, 110, 132, 0.25);
  color: var(--color-error, #ff6e84);
  transform: scale(1.05);
}

.modal-body {
  padding: 28px;
  overflow-y: auto;
  max-height: 60vh;
}

.modal-body::-webkit-scrollbar {
  width: 6px;
}

.modal-body::-webkit-scrollbar-thumb {
  background: rgba(183, 159, 255, 0.15);
  border-radius: 3px;
}

/* ========== 表单样式 ========== */
.form-group {
  margin-bottom: 24px;
}

.form-row {
  display: flex;
  gap: 20px;
}

.form-row .form-group {
  flex: 1;
}

.form-row .form-group.small {
  flex: 0 0 140px;
}

.form-group label {
  display: block;
  font-size: 14px;
  font-weight: 600;
  color: rgba(183, 159, 255, 0.8);
  margin-bottom: 10px;
  letter-spacing: 0.3px;
}

.form-group label .required {
  color: var(--color-error, #ff6e84);
  margin-left: 3px;
}

.form-group input[type="text"],
.form-group input[type="password"],
.form-group input[type="number"] {
  width: 100%;
  padding: 14px 16px;
  background: rgba(20, 24, 32, 0.5);
  border: 1px solid rgba(183, 159, 255, 0.12);
  border-radius: 12px;
  color: #f6f6fc;
  font-size: 15px;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
}

.form-group input:focus {
  outline: none;
  border-color: rgba(183, 159, 255, 0.3);
  background: rgba(20, 24, 32, 0.7);
  box-shadow: 0 0 0 3px rgba(183, 159, 255, 0.1);
}

.form-group input::placeholder {
  color: rgba(183, 159, 255, 0.4);
}

/* 错误状态 */
.form-group.has-error input {
  border-color: rgba(255, 110, 132, 0.5);
  background: rgba(255, 110, 132, 0.05);
}

.form-group.has-error input:focus {
  box-shadow: 0 0 0 3px rgba(255, 110, 132, 0.15);
}

.error-message {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 8px;
  font-size: 13px;
  color: var(--color-error, #ff6e84);
}

.error-message i {
  font-size: 14px;
}

.error-slide-enter-active,
.error-slide-leave-active {
  transition: all 0.2s ease;
}

.error-slide-enter-from,
.error-slide-leave-to {
  opacity: 0;
  transform: translateY(-6px);
}

/* 密码输入框 */
.password-input {
  position: relative;
  display: flex;
}

.password-input input {
  padding-right: 56px;
}

.toggle-password {
  position: absolute;
  right: 6px;
  top: 50%;
  transform: translateY(-50%);
  min-width: 44px;
  min-height: 44px;
  background: transparent;
  border: none;
  color: rgba(183, 159, 255, 0.6);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 10px;
  transition: all 0.2s ease;
}

.toggle-password:hover {
  color: var(--color-primary, #b79fff);
  background: rgba(183, 159, 255, 0.1);
}

/* 密码强度指示器 */
.password-strength {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-top: 10px;
}

.strength-bar {
  flex: 1;
  height: 5px;
  background: rgba(183, 159, 255, 0.1);
  border-radius: 3px;
  overflow: hidden;
}

.strength-fill {
  height: 100%;
  border-radius: 3px;
  transition: all 0.3s ease;
}

.strength-fill.weak {
  background: linear-gradient(90deg, #ff6e84, #ff8a9e);
}

.strength-fill.medium {
  background: linear-gradient(90deg, #ff86c3, #ffa3d7);
}

.strength-fill.strong {
  background: linear-gradient(90deg, #2db7f2, #5dd4ff);
}

.strength-text {
  font-size: 12px;
  font-weight: 600;
}

.strength-text.weak { color: #ff6e84; }
.strength-text.medium { color: #ff86c3; }
.strength-text.strong { color: #2db7f2; }

/* 认证方式标签 */
.auth-tabs {
  display: flex;
  gap: 12px;
}

.auth-tab {
  flex: 1;
  padding: 14px;
  min-height: 44px;
  background: rgba(20, 24, 32, 0.5);
  border: 1px solid rgba(183, 159, 255, 0.12);
  border-radius: 12px;
  color: rgba(183, 159, 255, 0.7);
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
}

.auth-tab:hover {
  background: rgba(183, 159, 255, 0.08);
  color: rgba(183, 159, 255, 0.9);
  border-color: rgba(183, 159, 255, 0.2);
}

.auth-tab.active {
  background: rgba(183, 159, 255, 0.15);
  border-color: rgba(183, 159, 255, 0.3);
  color: var(--color-primary, #b79fff);
  box-shadow: 0 0 0 3px rgba(183, 159, 255, 0.1);
}

/* 文件输入 */
.file-input {
  display: flex;
  gap: 12px;
}

.file-input input {
  flex: 1;
}

.file-btn {
  padding: 14px 22px;
  min-height: 44px;
  background: rgba(183, 159, 255, 0.08);
  border: 1px solid rgba(183, 159, 255, 0.12);
  border-radius: 12px;
  color: rgba(183, 159, 255, 0.8);
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  white-space: nowrap;
}

.file-btn:hover {
  background: rgba(183, 159, 255, 0.15);
  border-color: rgba(183, 159, 255, 0.25);
  color: var(--color-primary, #b79fff);
}

/* 复选框 */
.checkbox-label {
  display: flex;
  align-items: center;
  gap: 12px;
  cursor: pointer;
}

.checkbox-label input[type="checkbox"] {
  display: none;
}

.checkbox-custom {
  width: 22px;
  height: 22px;
  background: rgba(20, 24, 32, 0.5);
  border: 1px solid rgba(183, 159, 255, 0.15);
  border-radius: 8px;
  position: relative;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
}

.checkbox-label input:checked + .checkbox-custom {
  background: rgba(183, 159, 255, 0.2);
  border-color: rgba(183, 159, 255, 0.4);
}

.checkbox-label input:checked + .checkbox-custom::after {
  content: '✓';
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  font-size: 14px;
  color: var(--color-primary, #b79fff);
}

.checkbox-label span:last-child {
  font-size: 14px;
  color: rgba(183, 159, 255, 0.7);
  font-weight: 500;
}

/* 模态框底部 */
.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 14px;
  padding: 24px 28px;
  border-top: 1px solid rgba(183, 159, 255, 0.08);
  background: rgba(183, 159, 255, 0.02);
}

.btn {
  padding: 14px 28px;
  min-height: 44px;
  border-radius: 12px;
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  letter-spacing: 0.3px;
}

.btn.secondary {
  background: rgba(183, 159, 255, 0.08);
  border: 1px solid rgba(183, 159, 255, 0.12);
  color: rgba(183, 159, 255, 0.8);
}

.btn.secondary:hover {
  background: rgba(183, 159, 255, 0.12);
  color: var(--color-primary, #b79fff);
  border-color: rgba(183, 159, 255, 0.2);
}

.btn.primary {
  background: linear-gradient(135deg, rgba(183, 159, 255, 0.2) 0%, rgba(183, 159, 255, 0.15) 100%);
  border: 1px solid rgba(183, 159, 255, 0.3);
  color: var(--color-primary, #b79fff);
}

.btn.primary:hover:not(:disabled) {
  background: linear-gradient(135deg, rgba(183, 159, 255, 0.25) 0%, rgba(183, 159, 255, 0.2) 100%);
  border-color: rgba(183, 159, 255, 0.4);
  transform: translateY(-2px);
  box-shadow: 0 8px 20px rgba(183, 159, 255, 0.15);
}

.btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

/* 删除按钮确认状态 */
.action-btn.danger {
  background: rgba(255, 110, 132, 0.15);
  border-color: rgba(255, 110, 132, 0.3);
  color: var(--color-error, #ff6e84);
}

.action-btn.danger:hover {
  background: rgba(255, 110, 132, 0.25);
  border-color: rgba(255, 110, 132, 0.4);
}

/* 过渡动画 */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s cubic-bezier(0.4, 0, 0.2, 1);
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>