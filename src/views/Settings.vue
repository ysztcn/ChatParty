<template>
  <div
    class="settings-view"
    :style="viewStyle"
  >
    <div class="settings-container">
      <el-card class="settings-card">
        <template #header>
          <div class="card-header">
            <el-icon>
              <Setting />
            </el-icon>
            <span>应用设置</span>
          </div>
        </template>

        <el-tabs
          v-model="activeTab"
          class="settings-tabs"
        >
          <!-- 通用设置 -->
          <el-tab-pane
            label="通用"
            name="general"
          >
            <div class="settings-section">
              <h3>外观设置</h3>
              <el-form label-width="120px">
                <el-form-item label="主题模式">
                  <el-radio-group
                    v-model="userPreferences.theme"
                    @change="handleThemeChange"
                  >
                    <el-radio label="light">
                      浅色
                    </el-radio>
                    <el-radio label="dark">
                      深色
                    </el-radio>
                    <el-radio label="auto">
                      跟随系统
                    </el-radio>
                  </el-radio-group>
                </el-form-item>
              </el-form>
            </div>

            <el-divider />

            <div class="settings-section">
              <h3>功能设置</h3>
              <el-form label-width="120px">
                <el-form-item label="自动保存">
                  <el-switch
                    v-model="userPreferences.autoSave"
                    @change="handleAutoSaveChange"
                  />
                </el-form-item>

                <el-form-item label="桌面通知">
                  <el-switch
                    v-model="userPreferences.notifications"
                    @change="handleNotificationsChange"
                  />
                </el-form-item>
              </el-form>
            </div>
          </el-tab-pane>

          <!-- 会话管理 -->
          <el-tab-pane
            label="会话管理"
            name="sessions"
          >
            <SessionStatus :providers="providers" />
          </el-tab-pane>

          <!-- 布局设置 -->
          <el-tab-pane
            label="布局"
            name="layout"
          >
            <div class="settings-section">
              <h3>网格布局</h3>
              <el-form label-width="120px">
                <el-form-item label="列数">
                  <el-input-number
                    v-model="gridSettings.columns"
                    :min="1"
                    :max="6"
                    @change="handleGridChange"
                  />
                </el-form-item>

                <el-form-item label="间距">
                  <el-input-number
                    v-model="gridSettings.gap"
                    :min="8"
                    :max="32"
                    @change="handleGridChange"
                  />
                </el-form-item>
              </el-form>

              <el-button
                type="primary"
                @click="resetLayout"
              >
                重置布局
              </el-button>
            </div>
          </el-tab-pane>

          <!-- 关于 -->
          <el-tab-pane
            label="关于"
            name="about"
          >
            <div class="about-page">
              <div class="about-section">
                <h3>版本信息</h3>
                <p>当前版本：v{{ appStore.appVersion || '未知' }}</p>
              </div>

              <el-divider />

              <div class="about-section">
                <h3>问题或建议反馈</h3>
                <p>如有任何问题或功能建议，欢迎提交 Issue：</p>
                <div class="copy-link-row">
                  <el-link
                    type="primary"
                    href="https://github.com/ysztcn/ChatParty/issues"
                    target="_blank"
                  >
                    GitHub Issues →
                  </el-link>
                  <el-button
                    size="small"
                    text
                    @click="copyToClipboard('https://github.com/ysztcn/ChatParty/issues')"
                  >
                    复制链接
                  </el-button>
                </div>
              </div>
            </div>
          </el-tab-pane>
        </el-tabs>
      </el-card>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { Setting } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import SessionStatus from '../components/session/SessionStatus.vue'
import { useAppStore, useLayoutStore, useChatStore } from '../stores'

const appStore = useAppStore()
const layoutStore = useLayoutStore()
const chatStore = useChatStore()

// 响应式数据
const activeTab = ref('general')

// 计算属性
const userPreferences = computed(() => appStore.userPreferences)
const gridSettings = computed(() => layoutStore.gridSettings)
const providers = computed(() => chatStore.providers)

// 多屏全屏时，设置页限制在主屏内
const viewStyle = computed(() => {
  if (!layoutStore.isMultiScreenFullScreen) return {}
  const primary = layoutStore.primaryScreen
  return {
    position: 'fixed' as const,
    top: '0',
    left: `${primary.x}px`,
    width: `${primary.width}px`,
    height: '100%',
    zIndex: '100'
  }
})

const handleThemeChange = (theme: string): void => {
  appStore.updateTheme(theme as 'light' | 'dark' | 'auto')
  ElMessage.success('主题设置已更新')
}

const handleAutoSaveChange = (_value: boolean): void => {
  appStore.saveUserPreferences()
  ElMessage.success('设置已更新')
}

/**
 * 处理通知变化
 */
const handleNotificationsChange = (value: boolean): void => {
  appStore.saveUserPreferences()
  ElMessage.success(`桌面通知已${value ? '开启' : '关闭'}`)
}

/**
 * 处理网格设置变化
 */
const handleGridChange = (): void => {
  layoutStore.updateGridSettings(gridSettings.value)
  ElMessage.success('布局设置已更新')
}

/**
 * 重置布局
 */
const resetLayout = (): void => {
  layoutStore.resetLayout()
  ElMessage.success('布局已重置')
}

const copyToClipboard = async(text: string): Promise<void> => {
  try {
    await navigator.clipboard.writeText(text)
    ElMessage.success('链接已复制')
  } catch {
    const textarea = document.createElement('textarea')
    textarea.value = text
    textarea.style.position = 'fixed'
    textarea.style.opacity = '0'
    document.body.appendChild(textarea)
    textarea.select()
    document.execCommand('copy')
    document.body.removeChild(textarea)
    ElMessage.success('链接已复制')
  }
}
</script>

<style scoped>
.settings-view {
  height: 100%;
  padding: 20px;
  overflow-y: auto;
}

.settings-container {
  max-width: 800px;
  margin: 0 auto;
}

.settings-card {
  box-shadow: var(--el-box-shadow-light);
}

.card-header {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 16px;
  font-weight: 600;
}

.settings-tabs {
  margin-top: 20px;
}

.settings-section {
  margin-bottom: 24px;
}

.settings-section h3 {
  margin: 0 0 16px 0;
  color: var(--el-text-color-primary);
  font-size: 14px;
  font-weight: 600;
}

.about-page {
  max-width: 520px;
  margin: 0 auto;
}

.about-section {
  margin-bottom: 20px;
}

.about-section h3 {
  margin: 0 0 8px;
  font-size: 14px;
  font-weight: 600;
  color: var(--el-text-color-primary);
}

.about-section p {
  margin: 4px 0;
  font-size: 13px;
  color: var(--el-text-color-regular);
  line-height: 1.6;
}

</style>
