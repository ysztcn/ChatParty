<template>
  <div class="chat-view">
    <div class="chat-container">
      <!-- 统一输入区域 -->
      <div
        ref="inputSectionRef"
        class="input-section"
        :style="inputSectionStyle"
      >
        <UnifiedInput
          @summary="handleSummaryClick"
          @open-discussion="handleOpenDiscussion"
          @open-comparison="handleOpenComparison"
        />
      </div>

      <!-- AI卡片网格 -->
      <div
        v-if="isMultiScreen"
        class="cards-grid-multi"
      >
        <div
          v-for="(group, index) in screenGroups"
          :key="index"
          class="screen-grid"
          :style="getScreenGridStyle(index, group.length)"
        >
          <AICard
            v-for="provider in group"
            :key="provider.id"
            :provider="provider"
            :config="getCardConfig(provider.id)"
            class="card-item"
          />
        </div>
      </div>
      <div
        v-else
        class="cards-grid"
        :style="gridStyle"
      >
        <!-- 普通AI卡片 -->
        <AICard
          v-for="provider in visibleProviders"
          :key="provider.id"
          :provider="provider"
          :config="getCardConfig(provider.id)"
          class="card-item"
        />
      </div>
    </div>

    <!-- 侧边栏 - 总结 + 讨论 -->
    <SummarySidebar
      ref="sidebarRef"
      v-model:visible="sidebarVisible"
      :original-provider-id="selectedSummaryProvider?.id || ''"
      :original-provider-name="selectedSummaryProvider?.name || ''"
      :original-provider="selectedSummaryProvider"
      :available-providers="allProviders"
      :selected-provider-id="selectedSummaryProviderId"
      @model-change="handleSummaryModelChange"
    />
  </div>
</template>

<script setup lang="ts">
import {
  computed, onMounted, onUnmounted, ref
} from 'vue'
import type { CSSProperties } from 'vue'
import { useChatStore, useLayoutStore } from '../stores'
import { summaryService } from '../services/SummaryService'
import UnifiedInput from '../components/chat/UnifiedInput.vue'
import AICard from '../components/chat/AICard.vue'
import SummarySidebar from '../components/summary/SummarySidebar.vue'
import { ElMessage } from 'element-plus'
import type { AIProvider } from '../types'

const chatStore = useChatStore()
const layoutStore = useLayoutStore()

// 总结侧边栏显示状态 - 默认显示（收起状态）
const sidebarVisible = ref(true)

// 侧边栏引用
const sidebarRef = ref<InstanceType<typeof SummarySidebar> | null>(null)

// 选中的总结模型
const selectedSummaryProvider = ref<AIProvider | null>(null)

// 默认总结模型ID
const selectedSummaryProviderId = ref<string>('deepseek')

// 已登录的AI提供商
const loggedInProviders = computed(() => chatStore.loggedInProviders)

// 所有AI提供商（用于选择总结模型）
const allProviders = computed(() => chatStore.providers)

/**
 * 处理总结按钮点击
 */
const handleSummaryClick = (): void => {
  const providerId = selectedSummaryProviderId.value
  const selectedProvider = chatStore.providers.find((p) => p.id === providerId)

  if (!selectedProvider) {
    ElMessage.error('未找到默认总结模型')
    return
  }

  selectedSummaryProvider.value = selectedProvider

  // 先设置为 false，再设置为 true，触发 SummarySidebar 中的 watch
  if (sidebarVisible.value) {
    sidebarVisible.value = false
    setTimeout(() => {
      sidebarVisible.value = true
    }, 0)
  } else {
    sidebarVisible.value = true
  }

  executeSummary(providerId)
}

/**
 * 执行总结
 * @param providerId 总结模型ID
 */
const executeSummary = async(providerId: string): Promise<void> => {
  const originalQuery = chatStore.currentMessage || '总结各AI的回答'

  const selectedProvider = chatStore.providers.find((p) => p.id === providerId)
  if (!selectedProvider) {
    ElMessage.error('未找到选中的AI模型')
    return
  }

  // 构建providers列表：已登录的模型 + 选中的总结模型（如果不在已登录列表中）
  const providersForSummary = [...loggedInProviders.value]
  if (!providersForSummary.find((p) => p.id === providerId)) {
    providersForSummary.push(selectedProvider)
  }

  const success = await summaryService.executeSummary(
    {
      summaryProviderId: `summary-${providerId}`,
      originalQuery
    },
    providersForSummary
  )

  if (success) {
    ElMessage.success(`已创建 ${selectedProvider.name} (总结) 选项卡，请在侧边栏中查看`)
  }
}

/**
 * 处理总结模型切换
 * @param providerId 新的模型ID
 */
const handleSummaryModelChange = (providerId: string): void => {
  selectedSummaryProviderId.value = providerId
  const selectedProvider = chatStore.providers.find((p) => p.id === providerId)
  if (selectedProvider) {
    selectedSummaryProvider.value = selectedProvider
  }
}

/**
 * 处理打开讨论面板
 */
const handleOpenDiscussion = (): void => {
  if (sidebarRef.value) {
    sidebarRef.value.showDiscussion()
  }
}

/**
 * 处理打开对比面板
 */
const handleOpenComparison = (): void => {
  if (sidebarRef.value) {
    sidebarRef.value.showComparison()
  }
}

// 计算属性
const providers = computed(() => chatStore.providers)

const visibleProviders = computed(() => {
  const enabledProviders = providers.value.filter((provider) => {
    const config = getCardConfig(provider.id)
    // 只有当模型被选中且可见时才显示卡片
    return provider.isEnabled && config?.isVisible !== false
  })

  // 使用chatStore的selectedProviders进行排序
  const sortedProviders = [...enabledProviders].sort((a, b) => {
    const aSelected = chatStore.selectedProviders.includes(a.id)
    const bSelected = chatStore.selectedProviders.includes(b.id)

    if (aSelected && !bSelected) {
      return -1
    }
    if (!aSelected && bSelected) {
      return 1
    }

    if (aSelected && bSelected) {
      const aIndex = chatStore.selectedProviders.indexOf(a.id)
      const bIndex = chatStore.selectedProviders.indexOf(b.id)
      return bIndex - aIndex
    }

    return 0
  })

  return sortedProviders
})

const gridStyle = computed<CSSProperties>(() => {
  const { columns } = layoutStore.gridSettings
  const { gap } = layoutStore.gridSettings
  const cardCount = visibleProviders.value.length
  const rows = Math.max(1, Math.ceil(cardCount / columns))

  return {
    display: 'grid',
    gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`,
    // 行高自适应：所有行平分可用高度，但每行至少 minCardHeight，否则纵向滚动
    gridTemplateRows: `repeat(${rows}, minmax(${layoutStore.gridSettings.minCardHeight}px, 1fr))`,
    gap: `${gap}px`,
    padding: `${gap}px`,
    alignItems: 'stretch', // 让卡片纵向拉伸填满网格行
    height: '100%',
    boxSizing: 'border-box'
  }
})

/**
 * 是否处于多屏全屏
 */
const isMultiScreen = computed(() => layoutStore.isMultiScreenFullScreen)

// 输入区域引用与高度
const inputSectionRef = ref<HTMLElement | null>(null)
const inputHeight = ref(0)

/**
 * 输入区域样式（多屏时固定到主屏）
 */
const inputSectionStyle = computed(() => {
  if (!isMultiScreen.value) return {}
  const primary = layoutStore.primaryScreen
  return {
    position: 'fixed' as const,
    top: '60px',
    left: `${primary.x}px`,
    width: `${primary.width}px`,
    zIndex: '150'
  }
})

/**
 * 多屏时按屏幕分组的卡片列表
 */
const screenGroups = computed(() => {
  if (!isMultiScreen.value) return []
  const counts = layoutStore.getPerScreenCardCounts(visibleProviders.value.length)
  const groups: AIProvider[][] = []
  let offset = 0
  counts.forEach((count) => {
    groups.push(visibleProviders.value.slice(offset, offset + count))
    offset += count
  })
  return groups
})

/**
 * 单个屏幕网格样式
 */
const getScreenGridStyle = (index: number, cardCount: number) => {
  const { screens } = layoutStore.displayLayout
  const screen = screens[index] || { x: 0, width: 0 }
  const columns = Math.max(1, Math.min(layoutStore.gridSettings.columns, cardCount))
  const rows = Math.ceil(cardCount / columns)
  const { gap, minCardHeight } = layoutStore.gridSettings
  const isPrimary = index === layoutStore.displayLayout.primaryIndex
  const topOffset = isPrimary ? 60 + inputHeight.value : 0
  return {
    position: 'absolute' as const,
    left: `${screen.x}px`,
    top: `${topOffset}px`,
    width: `${screen.width}px`,
    height: isPrimary ? `calc(100% - ${topOffset}px)` : '100%',
    display: 'grid',
    gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`,
    gridTemplateRows: `repeat(${rows}, minmax(${minCardHeight}px, 1fr))`,
    gap: `${gap}px`,
    padding: `${gap}px`,
    boxSizing: 'border-box' as const
  }
}

/**
 * 获取卡片配置
 */
const getCardConfig = (providerId: string) => layoutStore.getCardConfig(providerId)

// 响应式布局处理
const handleResize = () => {
  layoutStore.updateWindowSize(window.innerWidth, window.innerHeight)
}

// 键盘事件处理
const handleKeyDown = (event: KeyboardEvent) => {
  // 检查是否按下了Ctrl或Cmd键
  const isModifierKey = event.ctrlKey || event.metaKey

  // 检查是否按下了数字键1-9
  if (isModifierKey && event.key >= '1' && event.key <= '9') {
    // 阻止默认行为，避免与浏览器快捷键冲突
    event.preventDefault()

    // 获取数字键对应的索引（从0开始）
    const index = parseInt(event.key, 10) - 1

    // 检查索引是否在可见卡片范围内
    if (index < visibleProviders.value.length) {
      // 获取对应的卡片provider
      const provider = visibleProviders.value[index]

      // 切换卡片最大化状态
      layoutStore.toggleCardMaximized(provider.id)
    }
  }
}

// 输入区域高度观察器
let inputResizeObserver: ResizeObserver | null = null

// 生命周期
onMounted(() => {
  // 初始化聊天数据
  chatStore.initializeConversations()

  // 初始化总结侧边栏 - 默认使用 deepseek
  // sidebarVisible 默认为 true，但 SummarySidebar 中的 isCollapsed 默认为 true（收起状态）
  const defaultProvider = chatStore.providers.find((p) => p.id === 'deepseek')
  if (defaultProvider) {
    selectedSummaryProvider.value = defaultProvider
  }

  // 立即更新窗口大小，确保初始布局计算正确
  layoutStore.updateWindowSize(window.innerWidth, window.innerHeight)

  // 立即加载布局配置，不要等待
  const initializeLayout = () => {
    console.log('开始初始化布局...')
    const providerIds = providers.value.map((p) => p.id)

    // 先加载保存的布局配置
    layoutStore.loadLayoutConfig()
    console.log('布局配置加载完成，当前网格设置:', layoutStore.gridSettings)

    // 清空现有卡片配置，强制重新初始化所有provider的配置
    console.log('清空现有卡片配置')
    // @ts-ignore - 直接访问cardConfigs以清空它
    layoutStore.cardConfigs = {}

    // 重新初始化所有卡片配置
    console.log('重新初始化所有卡片配置:', providerIds)
    layoutStore.initializeCardConfigs(providerIds)

    // 重新计算布局，确保所有卡片正确显示
    layoutStore.recalculateLayout()
    console.log('布局重新计算完成')
  }

  // 立即执行布局初始化
  initializeLayout()

  // 测量输入区域高度（用于多屏时主屏卡片偏移）
  if (inputSectionRef.value) {
    inputHeight.value = inputSectionRef.value.offsetHeight
    inputResizeObserver = new ResizeObserver(() => {
      inputHeight.value = inputSectionRef.value?.offsetHeight || 0
    })
    inputResizeObserver.observe(inputSectionRef.value)
  }

  // 监听窗口大小变化
  window.addEventListener('resize', handleResize)

  // 添加键盘事件监听
  window.addEventListener('keydown', handleKeyDown)
})

onUnmounted(() => {
  // 移除窗口大小变化监听器
  window.removeEventListener('resize', handleResize)

  // 移除键盘事件监听
  window.removeEventListener('keydown', handleKeyDown)

  // 断开输入区域高度观察器
  if (inputResizeObserver) {
    inputResizeObserver.disconnect()
    inputResizeObserver = null
  }
})
</script>

<style scoped>
.chat-view {
  /* 关键修复：父容器 .main-content 已是 (100vh - header - footer)，这里应继承可用高度 */
  height: 100%;
  display: flex;
  flex-direction: column;
  min-height: 0;
}

.chat-container {
  flex: 1;
  display: flex;
  flex-direction: column;
  padding: 6px;
  gap: 16px;
  min-height: 0; /* 允许flex子项收缩 */
}

.input-section {
  flex-shrink: 0;
  min-height: 0;
  max-height: 45vh;
  overflow-y: auto;
}

.cards-grid {
  flex: 1 1 auto;
  min-height: 0;       /* 关键：允许 grid 在 flex 容器中正确收缩，避免外部出现空白 */
  overflow-y: auto;
  overflow-x: hidden;
}

.cards-grid-multi {
  flex: 1 1 auto;
  min-height: 0;
  position: relative;
  overflow: hidden;
}

.screen-grid {
  overflow-y: auto;
  overflow-x: hidden;
}

.card-item {
  width: 100%;
  height: 100%;        /* 跟随网格行高自适应 */
  min-width: 0;        /* 配合 minmax(0,1fr) 防止子项撑破网格 */
  min-height: 0;
  grid-column: auto;
  grid-row: auto;
}

/* 响应式布局 */
@media (max-width: 1200px) {
  .cards-grid {
    grid-template-columns: repeat(2, 1fr) !important;
  }
}

@media (max-width: 800px) {
  .cards-grid {
    grid-template-columns: 1fr !important;
  }
}

/* 卡片动画 */
.card-item {
  animation: fadeInUp 0.3s ease-out;
}

@keyframes fadeInUp {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
</style>
