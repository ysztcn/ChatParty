<template>
  <div
    class="webview-wrapper"
    :class="{ loading: isLoading, error: hasError }"
  >
    <!-- 加载状态 -->
    <div
      v-if="isLoading"
      class="loading-overlay"
    >
      <el-icon class="loading-icon">
        <Loading />
      </el-icon>
      <p>正在加载 {{ provider.name }}...</p>
    </div>

    <!-- 错误状态 -->
    <div
      v-if="hasError"
      class="error-overlay"
    >
      <el-icon class="error-icon">
        <Warning />
      </el-icon>
      <p>{{ errorMessage }}</p>
      <el-button
        type="primary"
        @click="retry"
      >
        重试
      </el-button>
    </div>

    <!-- WebView容器 -->
    <div
      :id="webviewId"
      class="webview-container"
      :style="{
        visibility: hasError ? 'hidden' : 'visible',
        opacity: isLoading && isInitialLoad ? '0.5' : '1'
      }"
    />
  </div>
</template>

<script setup lang="ts">
import {
  ref, computed, onMounted, onUnmounted, watch
} from 'vue'
import { Loading, Warning } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import type { AIProvider } from '@/types'
import { getSendMessageScript } from '@/utils/MessageScripts.ts'
import { getLoginCheckScript } from '@/utils/LoginCheckScripts.ts'

// Props
interface Props {
  provider: AIProvider
  width?: number
  height?: number
  autoLoad?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  width: 800,
  height: 600,
  autoLoad: true
})

// Emits
interface Emits {
  (e: 'ready'): void
  (e: 'loading', loading: boolean): void
  (e: 'error', error: string): void
  (e: 'login-status-changed', isLoggedIn: boolean): void
  (e: 'title-changed', title: string): void
  (e: 'url-changed', url: string): void
}

const emit = defineEmits<Emits>()

// 响应式数据
const isLoading = ref(false)
const hasError = ref(false)
const errorMessage = ref('')
const webviewElement = ref<Electron.WebviewTag | null>(null)
const retryCount = ref(0)
const maxRetries = 3
const saveSessionTimer = ref<NodeJS.Timeout | null>(null)
const loginCheckTimer = ref<NodeJS.Timeout | null>(null)
const sessionLoaded = ref(false)
const isInitialLoad = ref(true)
const currentUrl = ref('')

// 计算属性
const webviewId = computed(() => `webview-${props.provider.id}`)

// 计算原始 providerId（处理 summary- 前缀）
const originalProviderId = computed(() => {
  let providerId = props.provider.id
  // 对于总结模型，使用原模型的 providerId
  if (providerId.startsWith('summary-')) {
    providerId = providerId.replace('summary-', '')
  }
  return providerId
})

// 计算 partition - 对于总结模型，使用原模型的 partition
const partition = computed(() => `persist:${originalProviderId.value}`)

/**
 * 创建WebView元素
 */
const createWebView = async(): Promise<void> => {
  console.log(`Creating WebView for ${props.provider.name}`)

  const container = document.getElementById(webviewId.value)
  if (!container) {
    console.error(`WebView container not found: ${webviewId.value}`)
    return
  }

  // 清空容器
  container.innerHTML = ''

  // 创建webview元素
  const webview = document.createElement('webview') as Electron.WebviewTag
  webview.id = `${webviewId.value}-element`
  webview.src = props.provider.url
  webview.style.width = '100%'
  webview.style.height = '100%'
  webview.style.border = 'none'

  // 初始化URL状态
  currentUrl.value = props.provider.url
  isInitialLoad.value = true

  // 设置webview属性
  webview.setAttribute('nodeintegration', 'false')
  webview.setAttribute('websecurity', 'true')
  webview.setAttribute('allowpopups', 'true')
  webview.setAttribute('useragent', getUserAgent())
  webview.setAttribute('partition', partition.value)

  // 设置preload脚本
  if (window.electronAPI) {
    try {
      const preloadPath = await window.electronAPI.getPreloadPath('webview-preload.js')
      webview.setAttribute('preload', `file://${preloadPath}`)
      console.log(`Preload script set for ${props.provider.name}: file://${preloadPath}`)
    } catch (e) {
      console.error('Failed to get preload path:', e)
    }
  }

  // 加载前先应用代理配置，避免页面先以其他出口IP完成加载与验证再切换代理
  await applyStoredProxy()

  console.log(`WebView created for ${props.provider.name}, URL: ${props.provider.url}`)

  // 绑定事件（在插入DOM前绑定，避免did-attach等早期事件在appendChild时触发而丢失）
  bindWebViewEvents(webview)

  // 添加到容器
  container.appendChild(webview)
  webviewElement.value = webview
}

/**
 * 获取用户代理字符串
 * Gemini与Grok使用固定UA，与主进程会话伪装一致；其他provider移除Electron标识
 */
const getUserAgent = (): string => {
  if (originalProviderId.value === 'gemini') {
    return GEMINI_USER_AGENT
  }
  if (originalProviderId.value === 'grok') {
    return GROK_USER_AGENT
  }
  const baseUA = navigator.userAgent
  return baseUA.replace(/Electron\/[\d.]+\s/, '')
}

/**
 * 加载前应用已保存的代理配置，与AICard代理对话框使用同一份存储
 */
interface StoredProxyConfig {
  enabled?: boolean
  protocol?: string
  address?: string
  port?: string
}

const applyStoredProxy = async(): Promise<void> => {
  if (!window.electronAPI) return

  const stored = localStorage.getItem(`proxy-config-${originalProviderId.value}`)
  const config: StoredProxyConfig = stored
    ? JSON.parse(stored)
    : {
      enabled: false,
      protocol: 'http',
      address: '127.0.0.1',
      port: '7897'
    }

  const proxyRules = config.enabled
    ? `${config.protocol}://${config.address}:${config.port}`
    : 'direct://'

  await window.electronAPI.setProxy({
    webviewId: props.provider.webviewId,
    proxyRules,
    enabled: config.enabled === true
  })
  console.log(`Applied proxy before load for ${props.provider.name}: ${proxyRules}`)
}

/**
 * 绑定WebView事件
 */
/**
 * 主世界注入 UA 与 navigator.userAgentData 品牌修正
 * preload 运行在隔离世界，其修改无法到达页面；
 * UA声称Chrome但brands缺少Google Chrome会被Cloudflare Turnstile判定为自动化环境
 */
const GROK_USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
// Gemini伪装为Windows Chrome 134，与SessionManager请求头伪装、主进程Emulation元数据保持一致
const GEMINI_USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/134.0.0.0 Safari/537.36'

const UA_DATA_SPOOF_SCRIPT = `(() => {
  Object.defineProperty(navigator, 'userAgent', {
    get: () => '${GROK_USER_AGENT}',
    configurable: true
  })
  const original = navigator.userAgentData
  if (!original || original.brands.some((b) => b.brand === 'Google Chrome')) return
  const brands = [
    { brand: 'Not_A Brand', version: '8' },
    { brand: 'Chromium', version: '120' },
    { brand: 'Google Chrome', version: '120' }
  ]
  const fullVersionList = [
    { brand: 'Not_A Brand', version: '8.0.0.0' },
    { brand: 'Chromium', version: '120.0.6099.291' },
    { brand: 'Google Chrome', version: '120.0.6099.291' }
  ]
  const patched = {
    brands,
    mobile: original.mobile,
    platform: 'Windows',
    getHighEntropyValues: (hints) =>
      original.getHighEntropyValues(hints).then((values) => ({
        ...values,
        brands,
        platform: 'Windows',
        platformVersion: values.platformVersion || '10.0.0',
        uaFullVersion: values.uaFullVersion || '120.0.6099.291',
        ...(values.fullVersionList ? { fullVersionList } : {})
      }))
  }
  Object.defineProperty(navigator, 'userAgentData', { get: () => patched, configurable: true })
})()`

const bindWebViewEvents = (webview: Electron.WebviewTag): void => {
  // Grok：导航完成后在主世界注入UA与brands修正（webContents UA由主进程web-contents-created统一设置）
  if (originalProviderId.value === 'grok') {
    webview.addEventListener('did-navigate', () => {
      webview.executeJavaScript(UA_DATA_SPOOF_SCRIPT).catch((e) => {
        console.error(`UA spoof injection failed for ${props.provider.name}:`, e)
      })
    })
  }

  // 页面开始加载
  webview.addEventListener('did-start-loading', () => {
    const isSignificant = isInitialLoad.value
    console.log(`${props.provider.name} did-start-loading, significant: ${isSignificant}, URL: ${webview.src}`)

    // 只有在初始加载或URL发生重大变化时才显示加载状态
    if (isSignificant) {
      isLoading.value = true
      hasError.value = false
      emit('loading', true)
    }
  })

  // 页面加载完成
  webview.addEventListener('did-finish-load', () => {
    const newUrl = webview.src
    const wasInitialLoad = isInitialLoad.value

    // 更新当前URL
    currentUrl.value = newUrl

    const isSignificant = wasInitialLoad
    console.log(`${props.provider.name} did-finish-load, significant: ${isSignificant}, URL: ${newUrl}`)

    // 只有在初始加载或重大导航时才更新加载状态
    if (isSignificant) {
      isLoading.value = false
      hasError.value = false
      retryCount.value = 0
      emit('loading', false)
      emit('ready')

      // 检查登录状态
      checkLoginStatus()

      // 设置定期保存会话（每15分钟），但只设置一次
      if (!saveSessionTimer.value) {
        saveSessionTimer.value = setInterval(
          () => {
            // 只有在登录状态下才保存会话
            if (props.provider.isLoggedIn) {
              saveSession()
            }
          },
          15 * 60 * 1000
        )
      }

      // 设置定期检查登录状态（每10秒）
      if (!loginCheckTimer.value) {
        loginCheckTimer.value = setInterval(() => {
          if (webviewElement.value && !isLoading.value) {
            checkLoginStatus()
          }
        }, 10 * 1000) // 10秒检查一次
      }
    }

    // 标记初始加载完成
    isInitialLoad.value = false
  })

  // 页面加载失败
  webview.addEventListener('did-fail-load', (event) => {
    if (event.errorCode === -3) return // 用户取消加载，忽略

    isLoading.value = false
    hasError.value = true
    // errorMessage.value = `加载失败: ${event.errorDescription || '未知错误'}`
    emit('loading', false)
    // emit('error', errorMessage.value)
  })

  // 页面标题变化
  webview.addEventListener('page-title-updated', (event) => {
    emit('title-changed', event.title)
  })

  // URL变化
  webview.addEventListener('will-navigate', (event) => {
    console.log(`${props.provider.name} navigating to: ${event.url}`)
    emit('url-changed', event.url)
  })

  // 新窗口请求
  webview.addEventListener('new-window', (event) => {
    const { url } = event as Event & { url: string }
    // 在默认浏览器中打开新窗口
    if (window.electronAPI) {
      window.electronAPI.openExternal(url)
    }
  })

  // 控制台消息（用于调试）
  webview.addEventListener('console-message', (event) => {
    if (event.level === 0) {
      // 错误级别
      console.error(`WebView Console [${props.provider.name}]:`, event.message)
    }
  })
}

/**
 * 检查登录状态
 */
const checkLoginStatus = async(): Promise<void> => {
  if (!webviewElement.value) return

  try {
    let isLoggedIn = false

    if (props.provider.id === 'chatgpt') {
      // chatgpt 有较强的脚本执行检测，频繁执行脚本会导致页面不可用，这里默认设置为已登录
      isLoggedIn = true
    } else {
      // 对于总结模式的provider（id格式为summary-{originalId}），使用原始provider的登录检测脚本
      const providerId = props.provider.id.startsWith('summary-')
        ? props.provider.id.replace('summary-', '')
        : props.provider.id
      const loginCheckScript = getLoginCheckScript(providerId)
      const result = await webviewElement.value.executeJavaScript(loginCheckScript)
      isLoggedIn = Boolean(result)
    }

    if (isLoggedIn !== props.provider.isLoggedIn) {
      emit('login-status-changed', isLoggedIn)

      if (isLoggedIn && window.electronAPI) {
        await saveSession()
      }
    }
  } catch (error) {
    console.warn(`Failed to check login status for ${props.provider.name}:`, error)
  }
}

/**
 * 保存会话数据
 */
const saveSession = async(): Promise<void> => {
  if (!window.electronAPI) return

  try {
    await window.electronAPI.saveSession({ providerId: originalProviderId.value })
    console.log(`Session saved for ${props.provider.name}`)
  } catch (error) {
    console.warn(`Failed to save session for ${props.provider.name}:`, error)
  }
}

/**
 * 加载会话数据
 */
const loadSession = async(): Promise<void> => {
  if (!window.electronAPI || sessionLoaded.value) return

  sessionLoaded.value = true

  try {
    const response = await window.electronAPI.loadSession({ providerId: originalProviderId.value })
    if (response.exists && response.sessionData) {
      console.log(`Session loaded for ${props.provider.name}`)
      // 会话数据已经在后端恢复，这里只需要检查登录状态
      setTimeout(() => {
        checkLoginStatus()
      }, 2000) // 等待页面加载完成后检查
    }
  } catch (error) {
    console.warn(`Failed to load session for ${props.provider.name}:`, error)
  }
}

/**
 * 重试加载
 */
const retry = (): void => {
  if (retryCount.value >= maxRetries) {
    ElMessage.error(`${props.provider.name} 重试次数已达上限`)
    return
  }

  retryCount.value++
  hasError.value = false
  errorMessage.value = ''

  if (webviewElement.value) {
    webviewElement.value.reload()
  } else {
    createWebView()
  }
}

/**
 * 刷新WebView
 */
const refresh = (): void => {
  if (webviewElement.value) {
    webviewElement.value.reload()
  }
}

/**
 * 导航到指定URL
 */
const navigateTo = (url: string): void => {
  if (webviewElement.value) {
    webviewElement.value.src = url
  }
}

/**
 * 执行JavaScript代码
 */
const executeScript = async(script: string): Promise<any> => {
  if (!webviewElement.value) {
    throw new Error('WebView not ready')
  }

  return webviewElement.value.executeJavaScript(script)
}

/**
 * 发送消息到WebView
 */
const sendMessage = async(message: string): Promise<void> => {
  if (!webviewElement.value) {
    throw new Error('WebView not ready')
  }

  try {
    console.log('[WebView] Sending message:', message)
    const sendScript = getSendMessageScript(props.provider.id, message)
    console.log('[WebView] Send script:', sendScript)
    await webviewElement.value.executeJavaScript(sendScript)
  } catch (error) {
    console.error(`Failed to send message to ${props.provider.name}:`, error)
    throw error
  }
}

/**
 * 销毁WebView
 */
const destroy = (): void => {
  console.log(`[WebView] destroy ${props.provider.name} at ${new Date().toISOString()}`)
  // 清除定时器
  if (saveSessionTimer.value) {
    clearInterval(saveSessionTimer.value)
    saveSessionTimer.value = null
  }

  if (loginCheckTimer.value) {
    clearInterval(loginCheckTimer.value)
    loginCheckTimer.value = null
  }

  if (webviewElement.value) {
    const container = document.getElementById(webviewId.value)
    if (container) {
      container.innerHTML = ''
    }
    webviewElement.value = null
  }
}

/**
 * 手动创建WebView（用于按需加载）
 */
const create = async(): Promise<void> => {
  console.log(`Manual create WebView for ${props.provider.name}`)

  if (!webviewElement.value) {
    console.log(`Loading session and creating WebView for ${props.provider.name}`)
    await loadSession()

    // 等待一小段时间确保DOM已经渲染
    await new Promise((resolve) => {
      setTimeout(resolve, 100)
    })

    createWebView()
  } else {
    console.log(`WebView already exists for ${props.provider.name}`)
  }
}

// 暴露方法给父组件
defineExpose({
  refresh,
  navigateTo,
  executeScript,
  sendMessage,
  destroy,
  checkLoginStatus,
  saveSession,
  loadSession,
  create
})

// 生命周期
onMounted(async() => {
  console.log(`WebView mounted for ${props.provider.name}, autoLoad: ${props.autoLoad}`)

  if (props.autoLoad) {
    // 先尝试加载保存的会话
    await loadSession()
    // 然后创建WebView
    createWebView()
  }
})

onUnmounted(() => {
  destroy()
})

// 监听provider变化
watch(
  () => props.provider.url,
  (newUrl) => {
    if (webviewElement.value && newUrl) {
      navigateTo(newUrl)
    }
  }
)
</script>

<style scoped>
.webview-wrapper {
  position: relative;
  width: 100%;
  height: 100%;
  background: var(--el-bg-color-page);
}

.webview-container {
  width: 100%;
  height: 100%;
}

.loading-overlay,
.error-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background: var(--el-bg-color-page);
  z-index: 10;
}

.loading-icon {
  font-size: 32px;
  color: var(--el-color-primary);
  animation: rotate 1s linear infinite;
  margin-bottom: 12px;
}

.error-icon {
  font-size: 32px;
  color: var(--el-color-danger);
  margin-bottom: 12px;
}

@keyframes rotate {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

.loading-overlay p,
.error-overlay p {
  color: var(--el-text-color-secondary);
  margin-bottom: 16px;
}

.webview-wrapper.loading .webview-container {
  opacity: 0.5;
}

.webview-wrapper.error .webview-container {
  display: none;
}
</style>
