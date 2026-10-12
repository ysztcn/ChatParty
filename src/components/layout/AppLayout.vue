<template>
  <div
    class="app-layout"
    :class="{ 'dark-mode': isDarkMode, 'multi-screen': isMultiScreen }"
    :style="layoutVars"
  >
    <!-- 顶部导航栏 -->
    <AppHeader />

    <!-- 主内容区域：两个视图常驻，用 v-show 切换，避免路由切换卸载 Chat 导致 webview 重建 -->
    <main class="main-content">
      <ChatView v-show="route.path === '/chat'" />
      <SettingsView v-show="route.path === '/settings'" />
    </main>

    <!-- 底部状态栏 -->
    <AppFooter />
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { useAppStore, useLayoutStore } from '../../stores'
import AppHeader from './AppHeader.vue'
import AppFooter from './AppFooter.vue'
import ChatView from '../../views/Chat.vue'
import SettingsView from '../../views/Settings.vue'

const route = useRoute()
const appStore = useAppStore()
const layoutStore = useLayoutStore()

// 计算属性
const isDarkMode = computed(() => appStore.isDarkMode)
const isMultiScreen = computed(() => layoutStore.isMultiScreenFullScreen)

const layoutVars = computed(() => {
  if (!isMultiScreen.value) return {}
  const primary = layoutStore.primaryScreen
  return {
    '--primary-x': `${primary.x}px`,
    '--primary-w': `${primary.width}px`
  }
})
</script>

<style scoped>
.app-layout {
  display: flex;
  flex-direction: column;
  height: 100vh;
  background-color: var(--el-bg-color);
  color: var(--el-text-color-primary);
  transition:
    background-color 0.3s ease,
    color 0.3s ease;
}

.main-content {
  flex: 1;
  overflow: hidden;
  position: relative;
}

.multi-screen :deep(.app-header) {
  position: fixed;
  top: 0;
  left: var(--primary-x);
  width: var(--primary-w);
  height: 60px;
  z-index: 200;
}

.multi-screen :deep(.app-footer) {
  position: fixed;
  bottom: 0;
  left: var(--primary-x);
  width: var(--primary-w);
  height: 32px;
  z-index: 200;
}

.dark-mode {
  --el-bg-color: #1a1a1a;
  --el-text-color-primary: #e5e5e5;
  --el-border-color: #333;
}
</style>
