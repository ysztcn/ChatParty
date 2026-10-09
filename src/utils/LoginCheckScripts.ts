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
      // 检查Copilot的登录状态: 未登录时存在 Sign in 入口
      !(document.querySelector('[data-testid*="sign-in"], [class*="sign-in"], [class*="signin"], [aria-label*="Sign in"]'))
    `,
    glm: '!document.querySelector(".login-btn")',
    yuanbao: `
      // 检查yuanbao的登录状态
      !(document.querySelector('.agent-dialogue__tool__login') && 
      (document.querySelector('.agent-dialogue__tool__login').textContent === '登录'))
    `,
    miromind: `
      // 检查miromind的登录状态: 未登录时存在 Sign in / Log in 入口
      !Array.from(document.querySelectorAll('button, a')).some(el => {
        const t = (el.textContent || '').trim();
        return t === 'Sign in' || t === 'Sign In' || t === 'Log in' || t === 'Login';
      })
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
