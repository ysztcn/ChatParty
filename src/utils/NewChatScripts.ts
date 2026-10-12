/**
 * 新建对话脚本工具类
 * 提供不同AI网站的新建对话脚本
 *
 * @author 月上中天
 * @since 2024-12-19 14:30
 * @version 1.0
 */

/**
 * 获取新建对话的脚本
 * @param providerId AI提供商ID
 * @returns 对应的JavaScript脚本字符串
 */
export function getNewChatScript(providerId: string): string {
  const scripts: Record<string, string> = {
    kimi: getKimiNewChatScript(),
    grok: getGrokNewChatScript(),
    deepseek: getDeepSeekNewChatScript(),
    doubao: getDouBaoNewChatScript(),
    qwen: getQwenNewChatScript(),
    copilot: getCopilotNewChatScript(),
    glm: getGLMNewChatScript(),
    yuanbao: getYuanBaoNewChatScript(),
    miromind: getMiromindNewChatScript(),
    gemini: getGeminiNewChatScript(),
    chatgpt: getChatGPTNewChatScript(),
    mimo: getMimoNewChatScript()
  }

  return scripts[providerId] || getGenericNewChatScript()
}

/**
 * kimi新建对话脚本
 */
function getKimiNewChatScript(): string {
  return `
    (function() {
      try {
        // 方法1: 优先尝试点击侧边栏隐藏时的新建会话按钮（加号图标）
        const addButton = document.querySelectorAll('[class="icon-button expand-btn"]')[1];
        if (addButton) {
          addButton.click();
          console.log('已点击侧边栏隐藏时的新建会话按钮');
          return true;
        }
        
        // 点击侧边栏
        const expandButton = document.querySelector('[class="icon-button expand-btn"]');
        if(expandButton) {
          expandButton.click();
        }

        // 方法2: 统一使用 Ctrl+K 快捷键
        const key = 'k';
        
        // 创建更精确的键盘事件
        const eventOptions = {
          key: key,
          code: 'KeyK',
          keyCode: 75,
          which: 75,
          ctrlKey: true,
          metaKey: false,
          altKey: false,
          shiftKey: false,
          bubbles: true,
          cancelable: true
        };
        
        // 尝试在多个目标上发送事件
        const targets = [
          document.activeElement,
          document.querySelector('input, textarea'),
          document.body,
          document
        ];
        
        for (const target of targets) {
          if (target) {
            try {
              target.dispatchEvent(new KeyboardEvent('keydown', eventOptions));
              target.dispatchEvent(new KeyboardEvent('keyup', eventOptions));
              console.log('已在目标上发送快捷键:', target);
            } catch (e) {
              console.log('目标事件发送失败:', target, e);
            }
          }
        }
        
        console.log('已发送快捷键: Ctrl+K');
        if(expandButton) {
          expandButton.click();
        }
        return true;
      } catch (error) {
        console.error('Kimi新建会话失败:', error);
        return false;
      }
    })()
  `
}

/**
 * yuanbao新建对话脚本
 * 选择器依据 OpenCLI yuanbao adapter（clis/yuanbao/new.js）
 */
function getYuanBaoNewChatScript(): string {
  return `
    (function() {
      function isVisible(el) {
        const rect = el.getBoundingClientRect();
        return rect.width > 0 && rect.height > 0;
      }

      const trigger = document.querySelector('.yb-common-nav__trigger[data-desc="new-chat"]');
      if (trigger && isVisible(trigger)) {
        trigger.click();
        console.log('已点击元宝新建对话按钮');
        return true;
      }

      // 未找到按钮（改版失效）时回退导航到首页，首页即空白新对话
      console.log('未找到元宝新建对话按钮，回退导航到首页');
      window.location.href = 'https://yuanbao.tencent.com/chat';
      return true;
    })()
  `
}

/**
 * grok新建对话脚本
 */
function getGrokNewChatScript(): string {
  return getDeepSeekNewChatScript()
}

/**
 * GLM新建对话脚本
 */
function getGLMNewChatScript(): string {
  return `
    (function() {
      try {
        // 精准选择智谱清言的新建对话按钮
        const newChatButton = document.querySelector('.create-text');
        
        if (newChatButton && newChatButton.offsetParent !== null) {
          newChatButton.click();
          console.log('已点击GLM新建对话按钮');
          return true;
        }
        
        console.log('未找到可见的新建对话按钮');
        return false;
      } catch (error) {
        console.error('GLM新建对话失败:', error);
        return false;
      }
    })()
  `
}

/**
 * DeepSeek新建对话脚本
 */
function getDeepSeekNewChatScript(): string {
  return `
    (function() {
      try {
        // 检测平台并设置相应的快捷键
        const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
        const key = 'j';
        const ctrlKey = !isMac;
        const metaKey = isMac;
        
        // 创建键盘事件
        const keydownEvent = new KeyboardEvent('keydown', {
          key: key,
          code: 'KeyJ',
          keyCode: 74,
          which: 74,
          ctrlKey: ctrlKey,
          metaKey: metaKey,
          altKey: false,
          shiftKey: false,
          bubbles: true,
          cancelable: true
        });
        
        const keyupEvent = new KeyboardEvent('keyup', {
          key: key,
          code: 'KeyJ',
          keyCode: 74,
          which: 74,
          ctrlKey: ctrlKey,
          metaKey: metaKey,
          altKey: false,
          shiftKey: false,
          bubbles: true,
          cancelable: true
        });
        
        // 发送键盘事件
        document.dispatchEvent(keydownEvent);
        document.dispatchEvent(keyupEvent);
        
        console.log('已发送快捷键: ' + (isMac ? 'Command+J' : 'Ctrl+J'));
        return true;
      } catch (error) {
        console.error('发送快捷键失败:', error);
        return false;
      }
    })()
  `
}

/**
 * doubao新建对话脚本
 */
function getDouBaoNewChatScript(): string {
  return `
    (function() {
      try {
        // 统一使用Ctrl+K快捷键
        const key = 'k';
        
        // 创建键盘事件
        const keydownEvent = new KeyboardEvent('keydown', {
          key: key,
          code: 'KeyK',
          keyCode: 75,
          which: 75,
          ctrlKey: true,
          metaKey: false,
          altKey: false,
          shiftKey: false,
          bubbles: true,
          cancelable: true
        });
        
        const keyupEvent = new KeyboardEvent('keyup', {
          key: key,
          code: 'KeyK',
          keyCode: 75,
          which: 75,
          ctrlKey: true,
          metaKey: false,
          altKey: false,
          shiftKey: false,
          bubbles: true,
          cancelable: true
        });
        
        // 发送键盘事件
        document.dispatchEvent(keydownEvent);
        document.dispatchEvent(keyupEvent);
        
        console.log('已发送快捷键: Ctrl+K');
        return true;
      } catch (error) {
        console.error('发送快捷键失败:', error);
        return false;
      }
    })()
  `
}

/**
 * qwen（千问 qianwen.com）新建对话脚本
 * 依次尝试 aria-label/title、文本匹配，均失败时回退导航到首页（首页即空白新对话）
 */
function getQwenNewChatScript(): string {
  return `
    (function() {
      try {
        const CANDIDATES = ['新对话', '新建对话'];

        function isVisible(el) {
          const rect = el.getBoundingClientRect();
          return rect.width > 0 && rect.height > 0;
        }

        // 方法1: aria-label / title 语义匹配
        const semantic = document.querySelector(
          '[aria-label="新对话"], [aria-label="新建对话"], [title="新对话"], [title="新建对话"]'
        );
        if (semantic && isVisible(semantic)) {
          semantic.click();
          console.log('已通过 aria-label 点击千问新建对话按钮');
          return true;
        }

        // 方法2: 查找精确文本节点，向上找可点击祖先（button/[role=button]/a），找不到则点击文本元素本身（事件冒泡）
        const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
        let node = walker.nextNode();
        while (node) {
          const text = (node.textContent || '').trim();
          if (CANDIDATES.includes(text)) {
            const el = node.parentElement;
            if (el && isVisible(el)) {
              const target = el.closest('button, [role="button"], a') || el;
              if (isVisible(target)) {
                target.click();
                console.log('已通过文本点击千问新建对话按钮:', text);
                return true;
              }
            }
          }
          node = walker.nextNode();
        }

        // 方法3: 回退导航到首页，保证新建对话生效
        console.log('未找到千问新建对话按钮，回退导航到首页');
        window.location.href = 'https://www.qianwen.com/';
        return true;
      } catch (error) {
        console.error('千问新建对话脚本执行失败:', error);
        return false;
      }
    })()
  `
}

/**
 * copilot新建对话脚本
 */
function getCopilotNewChatScript(): string {
  return `
    (function() {
      try {
        // 精准选择Copilot的新建对话按钮
        const newChatButton = document.querySelector('[aria-label="开始新聊天"]');
        
        if (newChatButton) {
          newChatButton.click();
          console.log('已点击Copilot新建对话按钮');
          return true;
        }
        
        console.log('未找到可见的新建对话按钮');
        return false;
      } catch (error) {
        console.error('Copilot新建对话失败:', error);
        return false;
      }
    })()
  `
}

/**
 * miromind新建对话脚本
 */
function getMiromindNewChatScript(): string {
  return `
    (function() {
      try {
        // 检查停止按钮是否存在
        let buttons = document.querySelectorAll('.items-center.justify-center button');
        let stopButton = Array.from(buttons).find(btn => btn.textContent.trim() === '取消');
        
        if (stopButton) {
          console.log('发现停止按钮，正在停止当前对话...');
          stopButton.click();
          
          // 等待3秒后点击新建对话按钮
          setTimeout(() => {
            try {
              // 1. 拿到 header 元素
              const header = document.querySelector('header');

              if (header) {
                  // 2. 找到 header 下的第三个 div
                  const divs = header.querySelectorAll('div');
                  const secondDiv = divs[2];
                  
                  if (secondDiv) {
                      // 3. 在这个 div 中寻找第一个 button
                      const targetButton = secondDiv.querySelector('button');
                      
                      if (targetButton) {
                          console.log('成功找到按钮:', targetButton);
                          targetButton.click();
                          return true;
                      }
                  }
              }
            } catch (error) {
              console.error('点击新建对话按钮失败:', error);
            }
          }, 3000);
          
          return true;
        } else {
          // 如果没有停止按钮，直接点击新建对话按钮
          // 1. 拿到 header 元素
          const header = document.querySelector('header');

          if (header) {
              // 2. 找到 header 下的第三个 div
              const divs = header.querySelectorAll('div');
              const secondDiv = divs[2];
              
              if (secondDiv) {
                  // 3. 在这个 div 中寻找第一个 button
                  const targetButton = secondDiv.querySelector('button');
                  
                  if (targetButton) {
                      console.log('成功找到按钮:', targetButton);
                      targetButton.click();
                      return true;
                  }
              }
          }
          
          console.log('未找到新建对话按钮');
          return false;
        }
      } catch (error) {
        console.error('miromind新建对话失败:', error);
        return false;
      }
    })()
  `
}

/**
 * 通用新建对话脚本
 */
function getGenericNewChatScript(): string {
  return `
    (function() {
      // 通用新建对话脚本模板
      // 尝试查找新建对话按钮
      const newChatButtons = [
        document.querySelector('[data-testid="new-chat-button"]'),
        document.querySelector('[aria-label*="new chat"]'),
        document.querySelector('[aria-label*="新建对话"]'),
        document.querySelector('button:contains("New chat")'),
        document.querySelector('button:contains("新建对话")'),
        document.querySelector('.new-chat'),
        document.querySelector('#new-chat')
      ].filter(Boolean)
      
      if (newChatButtons.length > 0) {
        newChatButtons[0].click()
        console.log('已点击新建对话按钮')
        return true
      } else {
        console.log('未找到新建对话按钮，尝试其他方式')
        // 后续将添加针对具体网站的实现
        return false
      }
    })()
  `
}

/**
 * Gemini新建对话脚本
 */
function getGeminiNewChatScript(): string {
  return `
    (function() {
      try {
        // 精准选择Gemini的新建对话按钮
        const newChatButton = document.querySelector('[data-test-id="side-nav-action-button-icon"]');
        
        if (newChatButton) {
          newChatButton.click();
          console.log('已点击Gemini新建对话按钮');
          return true;
        }
        
        console.log('未找到可见的新建对话按钮');
        return false;
      } catch (error) {
        console.error('Gemini新建对话失败:', error);
        return false;
      }
    })()
  `
}

/**
 * ChatGPT新建对话脚本
 */
function getChatGPTNewChatScript(): string {
  return `
    (function() {
      try {
        const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
        const key = 'o';
        const ctrlKey = !isMac;
        const metaKey = isMac;
        const shiftKey = true;
        
        const keydownEvent = new KeyboardEvent('keydown', {
          key: key,
          code: 'KeyO',
          keyCode: 79,
          which: 79,
          ctrlKey: ctrlKey,
          metaKey: metaKey,
          altKey: false,
          shiftKey: shiftKey,
          bubbles: true,
          cancelable: true
        });
        
        const keyupEvent = new KeyboardEvent('keyup', {
          key: key,
          code: 'KeyO',
          keyCode: 79,
          which: 79,
          ctrlKey: ctrlKey,
          metaKey: metaKey,
          altKey: false,
          shiftKey: shiftKey,
          bubbles: true,
          cancelable: true
        });
        
        document.dispatchEvent(keydownEvent);
        document.dispatchEvent(keyupEvent);
        
        console.log('已发送快捷键: ' + (isMac ? 'Command+Shift+O' : 'Ctrl+Shift+O'));
        return true;
      } catch (error) {
        console.error('发送快捷键失败:', error);
        return false;
      }
    })()
  `
}

/**
 * mimo新建对话脚本
 */
function getMimoNewChatScript(): string {
  return `
    (function() {
      try {
        const newButton = document.querySelector('[aria-label="新对话"]');
        
        if (newButton) {
          newButton.click();
          console.log('已点击mimo新建对话按钮');
          return true;
        } else {
          console.log('未找到新建对话按钮');
          return false;
        }
      } catch (error) {
        console.error('发送快捷键失败:', error);
        return false;
      }
    })()
  `
}
