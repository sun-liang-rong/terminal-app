<template>
  <Teleport to="body">
    <div v-if="visible" class="ssh-modal-overlay" :style="overlayStyle" @click.self="close" @click="handleFocus">
      <div class="ssh-modal" :style="modalStyle">
        <div class="modal-header">
          <h3>SSH 连接</h3>
          <button class="close-btn" @click="close">×</button>
        </div>

        <div class="modal-body">
          <div class="form-group">
            <label>服务器地址</label>
            <input
              v-model="config.host"
              type="text"
              placeholder="例如: 192.168.1.100"
              @keyup.enter="connect"
            />
          </div>

          <div class="form-row">
            <div class="form-group">
              <label>端口</label>
              <input
                v-model.number="config.port"
                type="number"
                placeholder="22"
              />
            </div>
            <div class="form-group">
              <label>用户名</label>
              <input
                v-model="config.username"
                type="text"
                placeholder="root"
                @keyup.enter="connect"
              />
            </div>
          </div>

          <div class="form-group">
            <label>密码</label>
            <input
              v-model="config.password"
              type="password"
              placeholder="输入密码"
              @keyup.enter="connect"
            />
          </div>

          <div v-if="error" class="error-message">
            {{ error }}
          </div>
        </div>

        <div class="modal-footer">
          <button class="btn btn-secondary" @click="close">取消</button>
          <button class="btn btn-primary" @click="connect" :disabled="connecting">
            {{ connecting ? '连接中...' : '连接' }}
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, reactive, computed, watch, onUnmounted } from 'vue'
import { registerModal, unregisterModal, bringToFront } from '../utils/modalManager'

const props = defineProps({
  visible: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['close', 'connect'])

const config = reactive({
  host: '',
  port: 22,
  username: 'root',
  password: ''
})

const error = ref('')
const connecting = ref(false)
let modalId: string | null = null
let modalZIndex: number = 3000

// 动态样式
const overlayStyle = computed(() => ({
  zIndex: modalZIndex
}))

const modalStyle = computed(() => ({
  zIndex: modalZIndex + 1
}))

// 当 visible 变化时注册/取消注册模态框
watch(() => props.visible, (newVal) => {
  if (newVal) {
    const registration = registerModal('ssh-modal', true)
    modalId = registration.id
    modalZIndex = registration.zIndex
  } else if (modalId) {
    unregisterModal(modalId)
    modalId = null
  }
})

const handleFocus = () => {
  if (modalId) {
    bringToFront(modalId)
    modalZIndex = registerModal('ssh-modal-focus', true).zIndex
  }
}

onUnmounted(() => {
  if (modalId) {
    unregisterModal(modalId)
  }
})

function close() {
  error.value = ''
  emit('close')
}

async function connect() {
  if (!config.host) {
    error.value = '请输入服务器地址'
    return
  }
  if (!config.username) {
    error.value = '请输入用户名'
    return
  }
  if (!config.password) {
    error.value = '请输入密码'
    return
  }

  connecting.value = true
  error.value = ''

  try {
    const result = await window.electronAPI.sshConnect({
      host: config.host,
      port: config.port,
      username: config.username,
      password: config.password
    })

    if (result.success) {
      emit('connect', { ...config, id: result.id })
      close()
    } else {
      error.value = result.error || '连接失败'
    }
  } catch (e) {
    error.value = (e as Error).message
  } finally {
    connecting.value = false
  }
}
</script>

<style scoped>
.ssh-modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  backdrop-filter: blur(4px);
  /* z-index 由 modalManager 动态管理 */
}

.ssh-modal {
  background: #1a1a22;
  border: 1px solid #23232c;
  border-radius: 12px;
  width: 400px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
}

.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  border-bottom: 1px solid #23232c;
}

.modal-header h3 {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  color: #e0e0e0;
}

.close-btn {
  width: 28px;
  height: 28px;
  border: none;
  background: transparent;
  color: #6b6b78;
  font-size: 20px;
  cursor: pointer;
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.15s;
}

.close-btn:hover {
  background: rgba(255, 255, 255, 0.1);
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
  margin-bottom: 6px;
  font-size: 12px;
  color: #9b9ba5;
  font-weight: 500;
}

.form-group input {
  width: 100%;
  padding: 10px 12px;
  background: #0d0d12;
  border: 1px solid #23232c;
  border-radius: 6px;
  color: #e0e0e0;
  font-size: 14px;
  transition: border-color 0.15s;
}

.form-group input:focus {
  outline: none;
  border-color: #00f0ff;
}

.form-group input::placeholder {
  color: #5a5a68;
}

.form-row {
  display: flex;
  gap: 16px;
}

.form-row .form-group {
  flex: 1;
}

.error-message {
  padding: 10px 12px;
  background: rgba(255, 107, 107, 0.1);
  border: 1px solid rgba(255, 107, 107, 0.3);
  border-radius: 6px;
  color: #ff6b6b;
  font-size: 13px;
  margin-top: 8px;
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
  border: none;
  border-radius: 6px;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.15s;
}

.btn-secondary {
  background: #23232c;
  color: #9b9ba5;
}

.btn-secondary:hover {
  background: #2a2a35;
  color: #e0e0e0;
}

.btn-primary {
  background: linear-gradient(135deg, #00f0ff 0%, #00d4ff 100%);
  color: #0f0f14;
}

.btn-primary:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(0, 240, 255, 0.3);
}

.btn-primary:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
</style>