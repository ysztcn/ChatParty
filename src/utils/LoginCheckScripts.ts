/**
 * 登录状态检查脚本工具类
 * 提供不同AI网站的登录状态检查脚本
 *
 * @author 月上中天
 * @since 2024-12-19 14:30
 * @version 1.0
 */

/**
 * 获取登录状态检查脚本
 * @param providerId AI提供商ID
 * @returns 对应的JavaScript脚本字符串
 */

export function getLoginCheckScript(providerId: string): string {
  const scripts: Record<string, string> = {
    kimi: `
      // 检查是否存在用户头像或登录相关元素
      !!(document.querySelector("[class='user-name']") && 
      document.querySelector("[class='user-name']").innerText != '登录')
    `,
    grok: `
      // 检查grok的登录状态: 未登录时页面存在 Sign in / Sign up 入口
      !(document.querySelector('a[href^="/sign-in"]') || document.querySelector('a[href^="/sign-up"]'))
    `,
    deepseek: `
      // 检查DeepSeek的登录状态: 未登录时存在 Log in / Sign up 登录入口
      !Array.from(document.querySelectorAll('button, a')).some(el => {
        const t = (el.textContent || '').trim();
        return t === 'Log in' || t === 'Log In' || t === 'Sign up' || t === '登录' || t === '注册';
      })
    `,
    doubao: `
      // 检查豆包的登录状态
      // 如果 .semi-button-content 元素存在且文本包含"登录"，则认为未登录
      !Array.from(document.querySelectorAll('.semi-button-content'))
        .some(el => el.textContent && el.textContent.includes('登录'))
    `,
    qwen: `
      // 检查通义千问的登录状态
      !Array.from(document.querySelectorAll('button'))
        .some(btn => {
          const text = (btn.textContent || '').trim();
          return text === '登录' || text === '立即登录';
        })
    `,
    copilot: `
      // 检查Copilot的登录状态: 仅当页面存在可见的 Sign in 入口时判定为未登录
      // 旧判定用 [class*="sign-in"] 子串匹配，会命中隐藏元素导致永远显示未登录
      (function () {
        var candidates = document.querySelectorAll('button, a, [role="button"], [data-testid*="sign-in"]');
        for (var i = 0; i < candidates.length; i++) {
          var el = candidates[i];
          if (!el.getClientRects || el.getClientRects().length === 0) continue;
          var label = el.getAttribute('aria-label') || '';
          var text = (el.textContent || '').trim();
          if (label.indexOf('Sign in') !== -1 || text === 'Sign in' || text === 'Sign In' || text === '登录') {
            return false;
          }
        }
        return true;
      })()
    `,
    glm: `
      // 检查GLM的登录状态: 优先读 vuex 持久化的用户信息，回退到 chatglm_token cookie
      // 站点改版后 .login-btn 已不存在，旧判定会永远返回已登录
      (function () {
        try {
          var raw = localStorage.getItem("vuex");
          var userInfo = raw ? ((JSON.parse(raw).Home || {}).userInfo || null) : null;
          if (userInfo) {
            return !!userInfo.phone && !userInfo.is_guest;
          }
        } catch (e) {}
        return /(?:^|;\\s*)chatglm_token=([^;]+)/.test(document.cookie);
      })()
    `,
    yuanbao: `
      // 检查yuanbao的登录状态
      !(document.querySelector('.agent-dialogue__tool__login') && 
      (document.querySelector('.agent-dialogue__tool__login').textContent === '登录'))
    `,
    miromind: `
      // 检查miromind的登录状态: 优先读 zustand 持久化的 token，回退到侧边栏 DOM
      // 未登录时 header 不渲染 Sign in 按钮（藏在 More options 弹层里），旧的按钮文本判定会永远返回已登录
      (function () {
        try {
          var raw = localStorage.getItem("mirage-auth-store");
          var state = raw ? (JSON.parse(raw).state || {}) : {};
          if (state.token) return true;
        } catch (e) {}
        return !!document.querySelector("[data-sidebar]");
      })()
    `,
    gemini: `
      !!document.querySelector('.gb_be')
    `,
    chatgpt: `
      !!document.querySelector('[alt="Profile image"]')
    `,
    mimo: `
      !Array.from(document.querySelectorAll('[type="button"]'))
                   .some(btn => btn.textContent.trim() === '立即登录');
    `
  }

  const defaultScript = scripts[providerId] || 'false'

  return defaultScript
}
