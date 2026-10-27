import { app, BrowserWindow } from 'electron'
import { WindowManager } from './managers/WindowManager'
import {
  SessionManager, GROK_USER_AGENT, GEMINI_USER_AGENT, GEMINI_USER_AGENT_METADATA
} from './managers/SessionManager'
import { IPCHandler } from './managers/IPCHandler'

/**
 * Emulation.setUserAgentOverride的Client Hints元数据
 */
interface UserAgentMetadata {
  brands: Array<{ brand: string; version: string }>
  fullVersionList: Array<{ brand: string; version: string }>
  fullVersion: string
  platform: string
  platformVersion: string
  architecture: string
  bitness: string
  model: string
  mobile: boolean
  wow64: boolean
}

/**
 * 配置Electron命令行开关
 * 解决Gemini登录的Cookie和第三方Cookie拦截问题
 */
function configureCommandLineSwitches(): void {
  console.log('[Main] Configuring command line switches for Gemini compatibility')

  // 禁用第三方Cookie拦截与SameSite默认限制 - 解决Google/Grok登录的Cookie问题
  // 注意：Chromium对重复的disable-features开关取最后一次的值，必须合并为一次调用
  app.commandLine.appendSwitch(
    'disable-features',
    'ThirdPartyCookieBlocking,SameSiteByDefaultCookies,CookiesWithoutSameSiteMustBeSecure'
  )

  // 禁用站点隔离试验 - 减少跨域限制
  app.commandLine.appendSwitch('disable-site-isolation-trials')

  // 本地代理对HTTP/2多路复用处理有缺陷（WINDOW_UPDATE invalid stream导致响应流损坏、字体等资源下载不完整），
  // 降级到HTTP/1.1保证资源完整性
  app.commandLine.appendSwitch('disable-http2')

  console.log('[Main] Command line switches configured')
}

// 在应用ready之前配置命令行开关
configureCommandLineSwitches()

// webview guest创建时（文档生成前）统一UA，确保navigator.userAgent（含iframe）与会话UA一致
// webContents.setUserAgent只作用于网络请求头，renderer端navigator须用Emulation覆盖
app.on('web-contents-created', (_event, webContents) => {
  if (webContents.getType() !== 'webview') return

  const sessionUA = webContents.session.getUserAgent()
  let overrideUA: string
  let userAgentMetadata: UserAgentMetadata | undefined

  if (sessionUA === GROK_USER_AGENT) {
    overrideUA = GROK_USER_AGENT
    userAgentMetadata = {
      brands: [
        { brand: 'Not_A Brand', version: '8' },
        { brand: 'Chromium', version: '120' },
        { brand: 'Google Chrome', version: '120' }
      ],
      fullVersionList: [
        { brand: 'Not_A Brand', version: '8.0.0.0' },
        { brand: 'Chromium', version: '120.0.6099.291' },
        { brand: 'Google Chrome', version: '120.0.6099.291' }
      ],
      fullVersion: '120.0.6099.291',
      platform: 'Windows',
      platformVersion: '10.0.0',
      architecture: 'x86',
      bitness: '64',
      model: '',
      mobile: false,
      wow64: false
    }
  } else if (sessionUA === GEMINI_USER_AGENT) {
    overrideUA = GEMINI_USER_AGENT
    userAgentMetadata = GEMINI_USER_AGENT_METADATA
  } else {
    return
  }

  try {
    webContents.debugger.attach('1.3')
  } catch (error) {
    console.error('[Main] Failed to attach debugger for UA override:', error)
    return
  }

  const applyUserAgentOverride = (): void => {
    webContents.debugger
      .sendCommand('Emulation.setUserAgentOverride', {
        userAgent: overrideUA,
        platform: 'Windows',
        userAgentMetadata
      })
      .catch((error) => console.error('[Main] Failed to apply UA override:', error))
  }

  // 首次导航前renderer可能尚未创建，did-navigate时补发
  applyUserAgentOverride()
  webContents.on('did-navigate', applyUserAgentOverride)
  console.log(`[Main] Applied UA to webview guest: ${overrideUA}`)
})

/**
 * 应用管理器实例
 */
let windowManager: WindowManager | null = null
let sessionManager: SessionManager | null = null
let ipcHandler: IPCHandler | null = null

/**
 * 初始化应用
 */
async function initializeApp(): Promise<void> {
  try {
    // 创建管理器实例
    windowManager = new WindowManager()
    sessionManager = new SessionManager()
    ipcHandler = new IPCHandler(windowManager, sessionManager)

    // 创建主窗口
    const mainWindow = await windowManager.createMainWindow()

    // 开发环境自动打开主窗口 DevTools，方便查看渲染进程日志
    if (process.env.NODE_ENV === 'development') {
      mainWindow.webContents.openDevTools()
    }

    // 设置事件监听
    setupEventListeners()

    console.log('Application initialized successfully')
  } catch (error) {
    console.error('Failed to initialize application:', error)
    app.quit()
  }
}

/**
 * 设置事件监听器
 */
function setupEventListeners(): void {
  if (!windowManager || !sessionManager || !ipcHandler) return

  // 窗口管理器事件
  windowManager.on('window-created', ({ id }) => {
    console.log(`Window created: ${id}`)
  })

  windowManager.on('window-destroyed', ({ id }) => {
    console.log(`Window destroyed: ${id}`)
  })

  // 会话管理器事件
  sessionManager.on('session-created', ({ providerId }) => {
    console.log(`Session created for provider: ${providerId}`)
  })

  sessionManager.on('session-saved', ({ providerId }) => {
    console.log(`Session saved for provider: ${providerId}`)
  })

  sessionManager.on('session-loaded', ({ providerId }) => {
    console.log(`Session loaded for provider: ${providerId}`)
  })

  // IPC处理器事件
  ipcHandler.on('error-reported', (error) => {
    console.error('Error reported from renderer:', error)
  })

  ipcHandler.on('message-received', ({ messageId, providerId }) => {
    console.log(`Message received: ${messageId} from ${providerId}`)
  })
}

/**
 * 应用准备就绪时初始化
 */
app.whenReady().then(() => {
  initializeApp()
  app.on('activate', async() => {
    // 在 macOS 上，当点击 dock 图标并且没有其他窗口打开时，
    // 通常在应用程序中重新创建一个窗口。
    if (BrowserWindow.getAllWindows().length === 0) {
      if (windowManager) {
        await windowManager.createMainWindow()
      }
    }
  })
})

/**
 * 当所有窗口都被关闭时退出应用
 */
app.on('window-all-closed', () => {
  // 在 macOS 上，除非用户用 Cmd + Q 确定地退出，
  // 否则绝大部分应用及其菜单栏会保持激活。
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

/**
 * 应用即将退出时的清理工作
 */
app.on('before-quit', async() => {
  console.log('Application is quitting, performing cleanup...')

  try {
    // 保存所有会话
    if (sessionManager) {
      await sessionManager.destroy()
    }

    // 销毁IPC处理器
    if (ipcHandler) {
      ipcHandler.destroy()
    }

    // 销毁所有窗口
    if (windowManager) {
      windowManager.destroyAllWindows()
    }

    console.log('Cleanup completed')
  } catch (error) {
    console.error('Error during cleanup:', error)
  }
})

// 处理未捕获的异常
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error)
  app.quit()
})

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason)
  app.quit()
})
