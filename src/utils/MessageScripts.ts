/**
 * 消息发送脚本工具类
 * 提供不同AI网站的消息发送脚本
 *
 * @author 月上中天
 * @since 2024-12-19 14:30
 * @version 1.0
 */

/**
 * 安全转义字符串，用于JavaScript字符串字面量
 * @param str 要转义的字符串
 * @returns 转义后的安全字符串
 */
function escapeJavaScriptString(str: string): string {
  // 使用更安全的转义方式，确保字符串在JavaScript中安全使用
  return str
    .replace(/\\/g, '\\\\') // 转义反斜杠
    .replace(/'/g, '\\\'') // 转义单引号
    .replace(/"/g, '\\"') // 转义双引号
    .replace(/\n/g, '\\n') // 转义换行符
    .replace(/\r/g, '\\r') // 转义回车符
    .replace(/\t/g, '\\t') // 转义制表符
    .replace(/\f/g, '\\f') // 转义换页符
    .replace(/\v/g, '\\v') // 转义垂直制表符
}

/**
 * 获取发送消息的脚本
 * @param providerId AI提供商ID
 * @param message 要发送的消息
 * @returns 对应的JavaScript脚本字符串
 */
export function getSendMessageScript(providerId: string, message: string): string {
  const escapedMessage = escapeJavaScriptString(message)
  const scripts: Record<string, string> = {
    kimi: getKimiScript(escapedMessage),
    grok: getGrokScript(escapedMessage),
    deepseek: getDeepSeekScript(escapedMessage),
    doubao: getDouBaoScript(escapedMessage),
    qwen: getQwenScript(escapedMessage),
    copilot: getCopilotScript(escapedMessage),
    glm: getGLMScript(escapedMessage),
    yuanbao: getYuanBaoScript(escapedMessage),
    miromind: getMiromindScript(escapedMessage),
    gemini: getGeminiScript(escapedMessage),
    chatgpt: getChatGPTScript(escapedMessage),
    mimo: getMimoScript(escapedMessage)
  }

  const defaultScript = scripts[providerId] || getGenericScript(escapedMessage)
  return defaultScript
}

/**
 * kimi发送脚本
 */
function getKimiScript(escapedMessage: string): string {
  return `
    (function() {
        function setKimiInputValue(text = '${escapedMessage}') {
          const input = document.querySelector('[role="textbox"][contenteditable="true"]'); 
          
          if (input) { 
              input.focus();
              document.execCommand('selectAll', false, null);
              document.execCommand('delete', false, null);
              const success = document.execCommand('insertText', false, text);
              if (success) {
                  ['input', 'change', 'keydown', 'keyup', 'keypress', 'focus', 'blur'].forEach(eventType => {
                      const event = new Event(eventType, { bubbles: true });
                      input.dispatchEvent(event);
                  });
                  return '使用execCommand成功设置文本: ' + text;
              }
          } else {
              return '未找到输入框'; 
          }
        } 

    function sendKimiMessage(text = '${escapedMessage}') {
        const result = setKimiInputValue(text);
        console.log(result);
        setTimeout(() => {
            const sendButton = document.querySelector('[class="send-button-container"]')
            
            if (sendButton && !sendButton.disabled) {
                sendButton.click();
                console.log('已点击发送按钮');
            } else {
                console.error('未找到可用的发送按钮或按钮被禁用');
                console.log('找到的按钮:', sendButton);
            }
        }, 500);
      }
      sendKimiMessage('${escapedMessage}');
      return true;
    })()
  `
}

/**
 * yuanbao发送脚本
 */
function getYuanBaoScript(escapedMessage: string): string {
  return `
    (function() {
      function setYuanbaoInputValue(text = '${escapedMessage}') {
        const input = document.querySelector('.ql-editor');
    
        if (input) {
          input.focus();
          document.execCommand('selectAll', false, null);
          document.execCommand('delete', false, null);
          // quill 编辑器中 execCommand insertText 会丢失换行后的内容，优先走 quill 原生 paste 处理
          let handled = false;
          try {
            const dt = new DataTransfer();
            dt.setData('text/plain', text);
            const pasteEvent = new ClipboardEvent('paste', { clipboardData: dt, bubbles: true, cancelable: true });
            handled = !input.dispatchEvent(pasteEvent);
          } catch (e) {
            handled = false;
          }
          if (!handled) {
            const success = document.execCommand('insertText', false, text);
            if (!success) {
              return '插入文本失败';
            }
          }
          ['input', 'change', 'keydown', 'keyup', 'keypress', 'focus', 'blur'].forEach(eventType => {
            const event = new Event(eventType, { bubbles: true });
            input.dispatchEvent(event);
          });
          return '成功设置文本: ' + text;
        } else {
          return '未找到输入框';
        }
      }
    
      function sendYuanbaoMessage(text = '${escapedMessage}') {
        const result = setYuanbaoInputValue(text);
        console.log(result);
        setTimeout(() => {
          const sendButton = document.querySelector('#yuanbao-send-btn')
    
          if (sendButton && !sendButton.disabled) {
            sendButton.click();
            console.log('已点击发送按钮');
          } else {
            console.error('未找到可用的发送按钮或按钮被禁用');
            console.log('找到的按钮:', sendButton);
          }
        }, 500);
      }
      sendYuanbaoMessage('${escapedMessage}');
      return true;
    })()
  `
}

/**
 * grok发送脚本
 */
function getGrokScript(escapedMessage: string): string {
  return getChatGPTScript(escapedMessage, '[contenteditable="true"]', '[type="submit"]')
}

/**
 * GLM发送脚本
 */
function getGLMScript(escapedMessage: string): string {
  return getDeepSeekScript(escapedMessage)
}

/**
 * DeepSeek发送脚本
 */
function getDeepSeekScript(escapedMessage: string): string {
  return `
    (function() {
      // --- Configuration ---
      const CHAT_INPUT_SELECTOR = 'textarea';
      const INPUT_SEND_DELAY_MS = 500;

      // --- Input Handling ---
      function findChatInput() {
        const element = document.querySelector(CHAT_INPUT_SELECTOR);
        if (element && element.tagName === 'TEXTAREA') {
          return element;
        }
        return null;
      }

      const inputElement = findChatInput();

      if (!inputElement) {
        console.error("[Input] Chat input TEXTAREA element not found using selector:", CHAT_INPUT_SELECTOR);
        return false;
      }

      try {
        inputElement.focus();
        console.log("[Input] Focused the textarea element.");

        const newValue = '${escapedMessage}';

        // 使用更可靠的方式设置input值
        try {
          const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
            window.HTMLTextAreaElement.prototype, 'value'
          ).set;
          if (nativeInputValueSetter) {
            nativeInputValueSetter.call(inputElement, newValue);
            console.log("Successfully set input value using native setter:", newValue);
          } else {
            inputElement.value = newValue;
            console.warn("Native value setter not available. Set input value using direct assignment as a fallback.");
          }
        } catch (e) {
          console.error("Error setting input value using native setter or direct assignment:", e);
          if (inputElement.value !== newValue) {
            inputElement.value = newValue;
            console.warn("Forced input value setting after error.");
          }
        }

        // 触发input事件
        const inputEvent = new Event('input', {
          bubbles: true,
          cancelable: false,
        });

        inputElement.dispatchEvent(inputEvent);
        console.log("Simulated 'input' event dispatched.");

        // 延迟后发送Enter键事件
        setTimeout(() => {
          const enterEvent = new KeyboardEvent('keydown', {
            bubbles: true,
            cancelable: true,
            key: 'Enter',
            code: 'Enter',
            keyCode: 13,
            which: 13,
          });

          const dispatched = inputElement.dispatchEvent(enterEvent);
          console.log("[Input] Dispatched 'keydown' (Enter) after delay. Event cancellation status: " + !dispatched + '.');
        }, INPUT_SEND_DELAY_MS);

        return true;
      } catch (e) {
        console.error("[Input] Error during input simulation:", e);
        return false;
      }
    })()
  `
}

/**
 * 豆包发送脚本
 */
function getDouBaoScript(escapedMessage: string): string {
  return `
    (function() {
      const MESSAGE = '${escapedMessage}';
      const INPUT_SEND_DELAY_MS = 300;

      function isVisible(el) {
        if (!el) return false;
        const rect = el.getBoundingClientRect();
        return rect.width > 0 && rect.height > 0;
      }

      function findChatInput() {
        const contentEditable = Array.from(document.querySelectorAll('[contenteditable="true"], [contenteditable="plaintext-only"], [contenteditable=""]'));
        for (const el of contentEditable) {
          if (isVisible(el)) return { el: el, type: 'contenteditable' };
        }
        const roleTextbox = Array.from(document.querySelectorAll('[role="textbox"]'));
        for (const el of roleTextbox) {
          if (isVisible(el)) return { el: el, type: 'contenteditable' };
        }
        const textareas = Array.from(document.querySelectorAll('textarea'));
        for (const el of textareas) {
          if (isVisible(el)) return { el: el, type: 'textarea' };
        }
        return null;
      }

      const found = findChatInput();

      if (!found) {
        console.error('[DouBao] Chat input element not found');
        return false;
      }

      const existingButtons = new Set();
      document.querySelectorAll('button, [role="button"]').forEach((b) => {
        if (isVisible(b)) existingButtons.add(b);
      });

      function setValue(el, type) {
        el.focus();
        if (type === 'contenteditable') {
          try { el.textContent = ''; } catch (e) {}
          let inserted = false;
          try {
            const selection = window.getSelection();
            const range = document.createRange();
            range.selectNodeContents(el);
            selection.removeAllRanges();
            selection.addRange(range);
            inserted = document.execCommand('insertText', false, MESSAGE);
          } catch (e) {}
          if (!inserted) {
            el.textContent = MESSAGE;
          }
          try {
            el.dispatchEvent(new InputEvent('beforeinput', { bubbles: true, cancelable: true, inputType: 'insertText', data: MESSAGE }));
          } catch (e) {}
          try {
            el.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertText', data: MESSAGE }));
          } catch (e) {
            el.dispatchEvent(new Event('input', { bubbles: true }));
          }
          return true;
        }
        const setter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value').set;
        setter.call(el, MESSAGE);
        el.dispatchEvent(new Event('input', { bubbles: true }));
        return true;
      }

      function findSendButton(el) {
        const semanticSelectors = [
          '[aria-label="发送"]',
          '[aria-label*="发送"]',
          '[aria-label*="send"]',
          '[aria-label*="Send"]',
          'button[type="submit"]',
          '[data-testid*="send"]',
          '[data-testid*="Send"]'
        ];
        for (const selector of semanticSelectors) {
          const btn = document.querySelector(selector);
          if (btn && isVisible(btn)) return btn;
        }
        let node = el;
        const candidates = [];
        const seen = new Set();
        for (let i = 0; i < 6 && node; i++) {
          node = node.parentElement;
          if (!node) break;
          const btns = node.querySelectorAll('button');
          btns.forEach((b) => {
            if (seen.has(b)) return;
            seen.add(b);
            if (isVisible(b)) candidates.push(b);
          });
          if (candidates.length > 0) break;
        }
        for (let i = candidates.length - 1; i >= 0; i--) {
          if (candidates[i].querySelector('svg')) return candidates[i];
        }
        return candidates.length > 0 ? candidates[candidates.length - 1] : null;
      }

      function send(el) {
        let btn = null;
        const newButtons = [];
        document.querySelectorAll('button, [role="button"]').forEach((b) => {
          if (isVisible(b) && !existingButtons.has(b)) newButtons.push(b);
        });
        for (let i = newButtons.length - 1; i >= 0; i--) {
          if (newButtons[i].querySelector('svg')) { btn = newButtons[i]; break; }
        }
        if (!btn && newButtons.length > 0) btn = newButtons[newButtons.length - 1];
        if (!btn) btn = findSendButton(el);
        if (btn) {
          try {
            btn.disabled = false;
            btn.removeAttribute('disabled');
            if (btn.getAttribute('aria-disabled') === 'true') btn.setAttribute('aria-disabled', 'false');
          } catch (e) {}
          ['mousedown', 'mouseup', 'click'].forEach((eventType) => {
            btn.dispatchEvent(new MouseEvent(eventType, { bubbles: true, cancelable: true, view: window }));
          });
          return true;
        }
        ['keydown', 'keypress', 'keyup'].forEach((eventType) => {
          const ev = new KeyboardEvent(eventType, {
            bubbles: true,
            cancelable: true,
            key: 'Enter',
            code: 'Enter',
            keyCode: 13,
            which: 13
          });
          el.dispatchEvent(ev);
        });
        return false;
      }

      try {
        setValue(found.el, found.type);
        setTimeout(() => { send(found.el); }, INPUT_SEND_DELAY_MS);
        return true;
      } catch (e) {
        console.error('[DouBao] Error during send:', e);
        return false;
      }
    })()
  `
}

/**
 * 通义千问发送脚本
 */
function getQwenScript(escapedMessage: string): string {
  return `
    (function() {
      const MESSAGE = '${escapedMessage}';
      const INPUT_SEND_DELAY_MS = 300;

      function isVisible(el) {
        if (!el) return false;
        const rect = el.getBoundingClientRect();
        return rect.width > 0 && rect.height > 0;
      }

      function findChatInput() {
        const contentEditable = Array.from(document.querySelectorAll('[contenteditable="true"], [contenteditable="plaintext-only"], [contenteditable=""]'));
        for (const el of contentEditable) {
          if (isVisible(el)) return { el: el, type: 'contenteditable' };
        }
        const roleTextbox = Array.from(document.querySelectorAll('[role="textbox"]'));
        for (const el of roleTextbox) {
          if (isVisible(el)) return { el: el, type: 'contenteditable' };
        }
        const textareas = Array.from(document.querySelectorAll('textarea'));
        const withPlaceholder = textareas.filter((el) => el.hasAttribute('placeholder'));
        for (const el of withPlaceholder) {
          if (isVisible(el)) return { el: el, type: 'textarea' };
        }
        for (const el of textareas) {
          if (isVisible(el)) return { el: el, type: 'textarea' };
        }
        return null;
      }

      const found = findChatInput();

      if (!found) {
        console.error('[Qwen] Chat input element not found');
        return false;
      }

      function setValue(el, type) {
        el.focus();
        if (type === 'contenteditable') {
          try { el.textContent = ''; } catch (e) {}
          let inserted = false;
          try {
            const selection = window.getSelection();
            const range = document.createRange();
            range.selectNodeContents(el);
            selection.removeAllRanges();
            selection.addRange(range);
            inserted = document.execCommand('insertText', false, MESSAGE);
          } catch (e) {
            console.warn('[Qwen] execCommand failed:', e);
          }
          if (!inserted) {
            el.textContent = MESSAGE;
          }
          try {
            el.dispatchEvent(new InputEvent('beforeinput', { bubbles: true, cancelable: true, inputType: 'insertText', data: MESSAGE }));
          } catch (e) {}
          try {
            el.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertText', data: MESSAGE }));
          } catch (e) {
            el.dispatchEvent(new Event('input', { bubbles: true }));
          }
          return true;
        }
        const setter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value').set;
        setter.call(el, MESSAGE);
        el.dispatchEvent(new Event('input', { bubbles: true }));
        return true;
      }

      function findSendButton(el) {
        const exact = document.querySelector('[aria-label="发送消息"]');
        if (exact && isVisible(exact)) return exact;
        const semanticSelectors = [
          '[aria-label="发送"]',
          '[aria-label*="发送"]',
          '[aria-label*="send"]',
          '[aria-label*="Send"]',
          'button[type="submit"]'
        ];
        for (const selector of semanticSelectors) {
          const btn = document.querySelector(selector);
          if (btn && !btn.disabled && isVisible(btn)) return btn;
        }
        let node = el;
        const candidates = [];
        const seen = new Set();
        for (let i = 0; i < 6 && node; i++) {
          node = node.parentElement;
          if (!node) break;
          const btns = node.querySelectorAll('button');
          btns.forEach((b) => {
            if (seen.has(b)) return;
            seen.add(b);
            if (!b.disabled && isVisible(b)) candidates.push(b);
          });
          if (candidates.length > 0) break;
        }
        for (let i = candidates.length - 1; i >= 0; i--) {
          if (candidates[i].querySelector('svg')) return candidates[i];
        }
        return candidates.length > 0 ? candidates[candidates.length - 1] : null;
      }

      function send(el) {
        const btn = findSendButton(el);
        if (btn) {
          try {
            btn.disabled = false;
            btn.removeAttribute('disabled');
            if (btn.getAttribute('aria-disabled') === 'true') btn.setAttribute('aria-disabled', 'false');
          } catch (e) {}
          ['mousedown', 'mouseup', 'click'].forEach((eventType) => {
            btn.dispatchEvent(new MouseEvent(eventType, { bubbles: true, cancelable: true, view: window }));
          });
          return true;
        }
        ['keydown', 'keypress', 'keyup'].forEach((eventType) => {
          const ev = new KeyboardEvent(eventType, {
            bubbles: true,
            cancelable: true,
            key: 'Enter',
            code: 'Enter',
            keyCode: 13,
            which: 13
          });
          el.dispatchEvent(ev);
        });
        return false;
      }

      try {
        setValue(found.el, found.type);
        setTimeout(() => { send(found.el); }, INPUT_SEND_DELAY_MS);
        return true;
      } catch (e) {
        console.error('[Qwen] Error during send:', e);
        return false;
      }
    })()
  `
}

/**
 * Copilot发送脚本
 * 兼容 textarea 与 contenteditable 两类输入框，穿透 open shadow root，仅匹配可见元素
 */
function getCopilotScript(escapedMessage: string): string {
  return `
    (function() {
      const MESSAGE = '${escapedMessage}';
      const INPUT_SEND_DELAY_MS = 800;

      function isVisible(el) {
        if (!el || !el.getClientRects) return false;
        if (el.getClientRects().length === 0) return false;
        const style = window.getComputedStyle(el);
        if (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0') return false;
        return true;
      }

      function deepQuery(selector) {
        const direct = document.querySelector(selector);
        if (direct) return direct;
        const all = document.querySelectorAll('*');
        for (const el of all) {
          if (el.tagName && el.tagName.indexOf('-') !== -1 && el.shadowRoot) {
            const found = el.shadowRoot.querySelector(selector);
            if (found) return found;
          }
        }
        return null;
      }

      function findChatInput() {
        const selectors = [
          'textarea[data-testid="composer-input"]',
          'textarea#userInput',
          'textarea[placeholder*="Ask"]',
          'textarea[placeholder*="Copilot"]',
          'textarea[placeholder*="Message"]',
          '#userInput',
          '[data-testid="composer-input"]',
          'div[contenteditable="true"][role="textbox"]',
          '[contenteditable="true"][data-placeholder]',
          'textarea',
          '[contenteditable="true"][role="textbox"]'
        ];
        for (const sel of selectors) {
          const el = deepQuery(sel);
          if (el && isVisible(el)) return el;
        }
        return null;
      }

      function setValue(el) {
        el.focus();
        const isTextarea = el.tagName === 'TEXTAREA' || el.tagName === 'INPUT';
        if (isTextarea) {
          try {
            const proto = el.tagName === 'TEXTAREA' ? window.HTMLTextAreaElement.prototype : window.HTMLInputElement.prototype;
            const setter = Object.getOwnPropertyDescriptor(proto, 'value').set;
            setter.call(el, MESSAGE);
          } catch (e) {
            el.value = MESSAGE;
          }
          try {
            el.dispatchEvent(new InputEvent('input', { bubbles: true, cancelable: false, inputType: 'insertText', data: MESSAGE }));
          } catch (e) {
            el.dispatchEvent(new Event('input', { bubbles: true }));
          }
          el.dispatchEvent(new Event('change', { bubbles: true }));
        } else {
          el.textContent = '';
          let inserted = false;
          try {
            document.execCommand('selectAll', false, null);
            document.execCommand('delete', false, null);
            inserted = document.execCommand('insertText', false, MESSAGE);
          } catch (e) {
            inserted = false;
          }
          if (!inserted) {
            el.textContent = MESSAGE;
          }
          try {
            el.dispatchEvent(new InputEvent('input', { bubbles: true, cancelable: false, inputType: 'insertText', data: MESSAGE }));
          } catch (e) {
            el.dispatchEvent(new Event('input', { bubbles: true }));
          }
        }
      }

      function findSendButton() {
        const selectors = [
          'button[data-testid="submit-button"]',
          'button[data-testid="send-button"]',
          'button[aria-label*="Submit"]',
          'button[aria-label*="Send"]',
          'button[aria-label*="submit"]',
          'button[aria-label*="send"]',
          'button[type="submit"]'
        ];
        for (const sel of selectors) {
          const el = deepQuery(sel);
          if (el && isVisible(el)) return el;
        }
        const buttons = document.querySelectorAll('button');
        for (const b of buttons) {
          if (!isVisible(b)) continue;
          const label = (b.getAttribute('aria-label') || '').toLowerCase();
          if (label.includes('submit') || label.includes('send') || label.includes('发送') || label.includes('提交')) {
            return b;
          }
        }
        return null;
      }

      function send(el) {
        const btn = findSendButton();
        if (btn) {
          try {
            btn.removeAttribute('disabled');
            btn.disabled = false;
            if (btn.getAttribute('aria-disabled') === 'true') btn.setAttribute('aria-disabled', 'false');
          } catch (e) {}
          ['mousedown', 'mouseup', 'click'].forEach((type) => {
            btn.dispatchEvent(new MouseEvent(type, { bubbles: true, cancelable: true, view: window }));
          });
          return true;
        }
        el.focus();
        ['keydown', 'keypress', 'keyup'].forEach((type) => {
          el.dispatchEvent(new KeyboardEvent(type, {
            bubbles: true, cancelable: true, key: 'Enter', code: 'Enter', keyCode: 13, which: 13, shiftKey: false
          }));
        });
        return true;
      }

      const input = findChatInput();
      if (!input) {
        console.error('[Copilot] 未找到输入框');
        return false;
      }

      try {
        setValue(input);
        setTimeout(() => { send(input); }, INPUT_SEND_DELAY_MS);
        return true;
      } catch (e) {
        console.error('[Copilot] 发送失败:', e);
        return false;
      }
    })()
  `
}

/**
 * 通用发送脚本（用于未知提供商）
 */
function getGenericScript(escapedMessage: string): string {
  return `
    (function() {
      // 尝试多种选择器
      const selectors = [
        'textarea[placeholder*="Message"]',
        'textarea[placeholder*="消息"]',
        'textarea',
        '[contenteditable="true"]',
        '.chat-input',
        '.input-box'
      ];
      
      let inputElement = null;
      for (const selector of selectors) {
        inputElement = document.querySelector(selector);
        if (inputElement) break;
      }
      
      if (!inputElement) {
        console.error('No suitable input element found');
        return false;
      }
      
      try {
        inputElement.focus();
        
        if (inputElement.tagName === 'TEXTAREA') {
          inputElement.value = '${escapedMessage}';
        } else {
          inputElement.textContent = '${escapedMessage}';
        }
        
        inputElement.dispatchEvent(new Event('input', { bubbles: true }));
        
        // 尝试发送
        setTimeout(() => {
          const enterEvent = new KeyboardEvent('keydown', {
            bubbles: true,
            cancelable: true,
            key: 'Enter',
            code: 'Enter',
            keyCode: 13,
            which: 13,
          });
          inputElement.dispatchEvent(enterEvent);
        }, 100);
        
        return true;
      } catch (e) {
        console.error('Error in generic script:', e);
        return false;
      }
    })()
  `
}

/**
 * Copilot发送脚本
 */
function getMiromindScript(escapedMessage: string): string {
  return getDeepSeekScript(escapedMessage)
}

/**
 * Gemini发送脚本
 */
function getGeminiScript(escapedMessage: string): string {
  return `
      (function() {
      // --- Configuration ---
      const CHAT_INPUT_SELECTOR = '[data-placeholder="Ask Gemini"]';
      const SEND_BUTTON_SELECTOR = '[aria-label="Send message"]';
      const INPUT_SEND_DELAY_MS = 500;

      // --- Input Handling ---
      function findChatInput() {
        const element = document.querySelector(CHAT_INPUT_SELECTOR);
        if (element) {
          return element;
        }
        return null;
      }

      const inputElement = findChatInput();

      if (!inputElement) {
        console.error("[Input] Chat input TEXTAREA element not found using selector:", CHAT_INPUT_SELECTOR);
        return false;
      }

      try {
        inputElement.focus();
        console.log("[Input] Focused the textarea element.");

        const newValue = '${escapedMessage}';

        // 使用更可靠的方式设置input值
        try {
          inputElement.innerText = newValue;
        } catch (e) {
          console.error("Error setting input value using native setter or direct assignment:", e);
          if (inputElement.innerText !== newValue) {
            inputElement.value = newValue;
            console.warn("Forced input value setting after error.");
          }
        }

        // 延迟后发送Enter键事件
        setTimeout(() => {
          const sendButton = document.querySelector(SEND_BUTTON_SELECTOR);
          if (sendButton) {
            sendButton.click();
            console.log("Simulated 'click' event on send button.");
          } else {
            console.error("[Input] Send button element not found using selector:", SEND_BUTTON_SELECTOR);
          }
        }, INPUT_SEND_DELAY_MS);
        return true;
      } catch (e) {
        console.error("[Input] Error during input simulation:", e);
        return false;
      }
    })()
  `
}

/**
 * ChatGPT发送脚本
 * 输入框为 contenteditable（ProseMirror），直接赋 innerText 不会触发框架状态更新，
 * 发送按钮保持禁用导致发送失效；这里按 textarea/contenteditable 分别写入并派发输入事件
 */
function getChatGPTScript(escapedMessage: string, chatInputSelector: string = 'div.ProseMirror[contenteditable="true"]', sendButtonSelector: string = 'button[type="submit"]'): string {
  return `
      (function() {
      // --- Configuration ---
      const CHAT_INPUT_SELECTOR = '${chatInputSelector}';
      const SEND_BUTTON_SELECTORS = ['${sendButtonSelector}', '[data-testid="send-button"]', 'button[type="submit"]', '[aria-label="发送"]', '[aria-label*="Send"]'];
      const INPUT_SEND_DELAY_MS = 500;
      const MAX_SEND_ATTEMPTS = 10;

      // --- Input Handling ---
      // 选择器可能命中多个（含用于测量的隐藏 ProseMirror），优先取可见的，否则取最后一个
      function findChatInput() {
        const list = Array.from(document.querySelectorAll(CHAT_INPUT_SELECTOR));
        if (list.length === 0) {
          return null;
        }
        const visible = list.find((el) => el.getClientRects && el.getClientRects().length > 0);
        return visible || list[list.length - 1];
      }

      const inputElement = findChatInput();

      if (!inputElement) {
        console.error("[Input] Chat input element not found using selector:", CHAT_INPUT_SELECTOR);
        return false;
      }

      function setInputValue(element, text) {
        element.focus();
        const tag = element.tagName;
        if (tag === 'TEXTAREA' || tag === 'INPUT') {
          const proto = tag === 'TEXTAREA' ? window.HTMLTextAreaElement.prototype : window.HTMLInputElement.prototype;
          const setter = Object.getOwnPropertyDescriptor(proto, 'value').set;
          if (setter) {
            setter.call(element, text);
          } else {
            element.value = text;
          }
          element.dispatchEvent(new Event('input', { bubbles: true }));
          return true;
        }

        // contenteditable：优先走 execCommand，其次 paste 事件，最后兜底赋 textContent 并补派发事件
        element.textContent = '';
        const selection = window.getSelection();
        const range = document.createRange();
        range.selectNodeContents(element);
        selection.removeAllRanges();
        selection.addRange(range);

        let inserted = false;
        try {
          inserted = document.execCommand('insertText', false, text);
        } catch (e) {
          inserted = false;
        }
        if (!inserted) {
          try {
            const dt = new DataTransfer();
            dt.setData('text/plain', text);
            const pasteEvent = new ClipboardEvent('paste', { clipboardData: dt, bubbles: true, cancelable: true });
            inserted = !element.dispatchEvent(pasteEvent);
          } catch (e) {
            inserted = false;
          }
        }
        if (!inserted) {
          element.textContent = text;
          try {
            element.dispatchEvent(new InputEvent('beforeinput', { bubbles: true, cancelable: true, inputType: 'insertText', data: text }));
          } catch (e) {}
          try {
            element.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertText', data: text }));
          } catch (e) {
            element.dispatchEvent(new Event('input', { bubbles: true }));
          }
        }
        return true;
      }

      // 发送按钮优先在输入框所在表单内查找，避免命中页面其他表单的提交按钮
      function findSendButton() {
        const form = inputElement.closest('form');
        for (const sel of SEND_BUTTON_SELECTORS) {
          if (form) {
            const inForm = form.querySelector(sel);
            if (inForm) {
              return inForm;
            }
          }
        }
        for (const sel of SEND_BUTTON_SELECTORS) {
          const global = document.querySelector(sel);
          if (global) {
            return global;
          }
        }
        return null;
      }

      // 输入后发送按钮由框架异步启用，轮询等待可点击再点击，超时回退 Enter
      function sendMessage() {
        let attempts = 0;
        function attemptSend() {
          const sendButton = findSendButton();
          if (sendButton && !sendButton.disabled && sendButton.getAttribute('aria-disabled') !== 'true') {
            sendButton.click();
            console.log("Simulated 'click' event on send button.");
            return;
          }
          attempts += 1;
          if (attempts < MAX_SEND_ATTEMPTS) {
            setTimeout(attemptSend, 200);
          } else {
            const enterEvent = new KeyboardEvent('keydown', {
              bubbles: true,
              cancelable: true,
              key: 'Enter',
              code: 'Enter',
              keyCode: 13,
              which: 13,
            });
            inputElement.dispatchEvent(enterEvent);
            console.error("[Input] Send button not enabled, dispatched Enter as fallback.");
          }
        }
        attemptSend();
      }

      try {
        setInputValue(inputElement, '${escapedMessage}');
        setTimeout(sendMessage, INPUT_SEND_DELAY_MS);
        return true;
      } catch (e) {
        console.error("[Input] Error during input simulation:", e);
        return false;
      }
    })()
  `
}

/**
 * mimo发送脚本
 */
function getMimoScript(escapedMessage: string): string {
  return getDeepSeekScript(escapedMessage)
}
