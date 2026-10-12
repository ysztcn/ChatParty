import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { CardConfig } from '../types'
import type { DisplayLayout } from '../types/ipc'

/**
 * 读取输入框某块的折叠状态
 */
const loadCollapsedState = (key: string): boolean => {
  try {
    const stored = localStorage.getItem(key)
    return stored !== null ? JSON.parse(stored) : false
  } catch (error) {
    console.error('读取输入框折叠状态失败:', error)
    return false
  }
}

/**
 * 保存输入框某块的折叠状态
 */
const saveCollapsedState = (key: string, collapsed: boolean): void => {
  try {
    localStorage.setItem(key, JSON.stringify(collapsed))
  } catch (error) {
    console.error('保存输入框折叠状态失败:', error)
  }
}

/**
 * 布局状态管理
 */
export const useLayoutStore = defineStore('layout', () => {
  // 卡片配置
  const cardConfigs = ref<Record<string, CardConfig>>({})

  // 网格布局设置 - 移除行数限制
  const gridSettings = ref({
    columns: 2,
    gap: 16,
    minCardWidth: 300,
    minCardHeight: 600
  })

  // 窗口尺寸
  const windowSize = ref({
    width: window.innerWidth,
    height: window.innerHeight
  })

  // 是否显示布局网格
  const showGrid = ref(false)

  // 统一输入框三块折叠状态
  const inputAgentCollapsed = ref(loadCollapsedState('chatallai_input_agent_collapsed'))
  const inputModelCollapsed = ref(loadCollapsedState('chatallai_input_model_collapsed'))
  const inputContentCollapsed = ref(loadCollapsedState('chatallai_input_content_collapsed'))

  // 卡片所属屏幕索引（多屏全屏时由视图层同步）
  const cardScreenIndex = ref<Record<string, number>>({})

  // 显示布局（多屏全屏时的屏幕数量与位置）
  const displayLayout = ref<DisplayLayout>({
    fullScreenState: 0,
    screenCount: 1,
    primaryIndex: 0,
    screens: []
  })

  /**
   * 主屏信息
   */
  const primaryScreen = computed(() => {
    const { screens } = displayLayout.value
    return screens[displayLayout.value.primaryIndex] || screens[0] || {
      x: 0, y: 0, width: 0, height: 0
    }
  })

  // 计算属性
  const availableWidth = computed(() => windowSize.value.width - gridSettings.value.gap * 2)
  const availableHeight = computed(() => windowSize.value.height - gridSettings.value.gap * 2)

  const cardWidth = computed(() => {
    const available = availableWidth.value - gridSettings.value.gap * 2 // 减去左右边距
    return Math.max(
      (available - gridSettings.value.gap * (gridSettings.value.columns - 1)) / gridSettings.value.columns,
      gridSettings.value.minCardWidth
    )
  })

  /**
   * 卡片高度（响应式）
   * - 根据当前可见卡片数自动算出行数
   * - 用可用高度均分给每一行，保证默认布局填满屏幕
   * - 不低于 minCardHeight
   * 注意：视图层已改为 CSS Grid 1fr 自适应，此值仅作为持久化的"默认尺寸快照"使用。
   */
  const cardHeight = computed(() => {
    const visibleCount = Object.values(cardConfigs.value).filter(
      (c) => c.isVisible && !c.isMaximized && !c.isMinimized
    ).length || 1
    const rows = Math.max(1, Math.ceil(visibleCount / gridSettings.value.columns))
    // 预留输入框（约 220px）与上下间距
    const reservedForInput = 240
    const availableForGrid = Math.max(0, availableHeight.value - reservedForInput)
    const perRow = (availableForGrid - gridSettings.value.gap * (rows - 1)) / rows
    return Math.max(gridSettings.value.minCardHeight, Math.floor(perRow))
  })

  /**
   * 初始化卡片配置
   */
  const initializeCardConfigs = (providerIds: string[]): void => {
    providerIds.forEach((providerId, index) => {
      if (!cardConfigs.value[providerId]) {
        const row = Math.floor(index / gridSettings.value.columns)
        const col = index % gridSettings.value.columns

        cardConfigs.value[providerId] = {
          id: `card-${providerId}`,
          providerId,
          position: {
            x: col * (cardWidth.value + gridSettings.value.gap) + gridSettings.value.gap,
            y: row * (cardHeight.value + gridSettings.value.gap) + gridSettings.value.gap
          },
          size: {
            width: cardWidth.value,
            height: cardHeight.value
          },
          isVisible: true,
          isMinimized: false,
          isMaximized: false,
          zIndex: 1,
          title: providerId
        }
      }
    })
  }

  /**
   * 更新卡片位置
   */
  const updateCardPosition = (providerId: string, position: { x: number; y: number }): void => {
    if (cardConfigs.value[providerId]) {
      cardConfigs.value[providerId].position = position
      saveLayoutConfig()
    }
  }

  /**
   * 更新卡片尺寸
   */
  const updateCardSize = (providerId: string, size: { width: number; height: number }): void => {
    if (cardConfigs.value[providerId]) {
      // 确保最小尺寸
      const newSize = {
        width: Math.max(size.width, gridSettings.value.minCardWidth),
        height: Math.max(size.height, gridSettings.value.minCardHeight)
      }
      cardConfigs.value[providerId].size = newSize
      saveLayoutConfig()
    }
  }

  /**
   * 切换卡片可见性
   */
  const toggleCardVisibility = (providerId: string): void => {
    if (cardConfigs.value[providerId]) {
      cardConfigs.value[providerId].isVisible = !cardConfigs.value[providerId].isVisible
      saveLayoutConfig()
    }
  }

  /**
   * 最小化/恢复卡片
   */
  const toggleCardMinimized = (providerId: string): void => {
    if (cardConfigs.value[providerId]) {
      // 如果卡片已经最大化，先恢复再最小化
      if (cardConfigs.value[providerId].isMaximized) {
        restoreCardFromMaximized(providerId)
      }
      cardConfigs.value[providerId].isMinimized = !cardConfigs.value[providerId].isMinimized
      // 重新计算布局以适应最小化状态
      recalculateLayout()
      saveLayoutConfig()
    }
  }

  /**
   * 计算卡片最大化目标矩形（多屏全屏时限制在卡片所属屏幕内）
   * 屏幕坐标与多屏全屏窗口的视口坐标对齐（WindowManager.getDisplayLayout）
   */
  const getMaximizeRect = (providerId: string): { x: number; y: number; width: number; height: number } => {
    const { fullScreenState, screenCount, screens } = displayLayout.value
    const index = cardScreenIndex.value[providerId]
    if (fullScreenState === 2 && screenCount > 1 && index !== undefined) {
      const screen = screens[index]
      if (screen) return screen
    }
    return {
      x: 0,
      y: 0,
      width: windowSize.value.width,
      height: windowSize.value.height
    }
  }

  /**
   * 应用最大化几何（位置与尺寸）
   */
  const applyMaximizeGeometry = (config: CardConfig): void => {
    const rect = getMaximizeRect(config.providerId)
    config.position = {
      x: rect.x + 16,
      y: rect.y + 16
    }
    config.size = {
      width: rect.width - 32,
      height: rect.height - 120
    }
  }

  /**
   * 同步卡片所属屏幕索引，并重新应用已最大化卡片的几何
   */
  const setCardScreenIndexes = (map: Record<string, number>): void => {
    cardScreenIndex.value = map
    Object.values(cardConfigs.value).forEach((config) => {
      if (config.isMaximized) {
        applyMaximizeGeometry(config)
      }
    })
  }

  /**
   * 最大化卡片
   */
  const maximizeCard = (providerId: string): void => {
    if (cardConfigs.value[providerId]) {
      const config = cardConfigs.value[providerId]

      // 保存原始状态
      config.originalSize = { ...config.size }
      config.originalPosition = { ...config.position }

      // 设置最大化状态
      config.isMaximized = true
      config.isMinimized = false

      // 设置最大化尺寸和位置（多屏全屏时只占卡片所属屏幕）
      applyMaximizeGeometry(config)
      config.zIndex = 1000 // 设置最高z-index

      // 设置其他卡片为隐藏状态（但不销毁WebView）
      Object.keys(cardConfigs.value).forEach((id) => {
        if (id !== providerId) {
          cardConfigs.value[id].isHidden = true // 使用isHidden而不是isVisible
        }
      })

      saveLayoutConfig()
    }
  }

  /**
   * 恢复卡片从最大化状态
   */
  const restoreCardFromMaximized = (providerId: string): void => {
    if (cardConfigs.value[providerId]) {
      const config = cardConfigs.value[providerId]

      if (config.isMaximized && config.originalSize && config.originalPosition) {
        // 恢复原始状态
        config.size = { ...config.originalSize }
        config.position = { ...config.originalPosition }
        config.isMaximized = false
        config.zIndex = 1

        // 删除保存的原始状态
        delete config.originalSize
        delete config.originalPosition

        // 显示所有卡片（清除隐藏状态）
        Object.keys(cardConfigs.value).forEach((id) => {
          cardConfigs.value[id].isHidden = false
        })

        // 重新计算布局
        recalculateLayout()
        saveLayoutConfig()
      }
    }
  }

  /**
   * 切换卡片最大化状态
   */
  const toggleCardMaximized = (providerId: string): void => {
    if (cardConfigs.value[providerId]) {
      if (cardConfigs.value[providerId].isMaximized) {
        restoreCardFromMaximized(providerId)
      } else {
        maximizeCard(providerId)
      }
    }
  }

  /**
   * 更新窗口尺寸
   */
  const updateWindowSize = (width: number, height: number): void => {
    windowSize.value = { width, height }

    // 已最大化的卡片跟随新窗口尺寸重新计算几何
    Object.values(cardConfigs.value).forEach((config) => {
      if (config.isMaximized) {
        applyMaximizeGeometry(config)
      }
    })

    recalculateLayout()
  }

  /**
   * 重新计算布局 - 支持自动扩展行数，无行数限制
   * 注意：视图层已使用 CSS Grid (1fr) 自适应，因此这里只更新 position 与
   * "默认尺寸快照"，不再强行覆盖手动调整后的尺寸，避免用户的拖拽被还原。
   */
  const recalculateLayout = (): void => {
    const visibleCards = Object.values(cardConfigs.value).filter((config) => config.isVisible && !config.isMaximized)

    visibleCards.forEach((config, index) => {
      const col = index % gridSettings.value.columns
      const row = Math.floor(index / gridSettings.value.columns)

      // 仅更新位置和可见性，size 由视图层负责
      config.isHidden = false
      config.position = {
        x: col * (cardWidth.value + gridSettings.value.gap) + gridSettings.value.gap,
        y: row * (cardHeight.value + gridSettings.value.gap) + gridSettings.value.gap
      }

      if (config.isMinimized) {
        // 最小化状态下，保持宽度但设置较小的高度
        Object.assign(config.size, {
          width: cardWidth.value,
          height: 60
        })
        return
      }

      // 普通模式：只在尺寸未被用户自定义时同步默认尺寸快照
      // 用 number 类型判断（"100%" 这种字符串表示由视图层接管，跳过）
      if (typeof config.size.width === 'number') {
        config.size.width = cardWidth.value
      }
      if (typeof config.size.height === 'number') {
        config.size.height = cardHeight.value
      }
    })
    saveLayoutConfig()
  }

  /**
   * 更新网格设置并重新计算布局 - 移除行数相关逻辑
   */
  const updateGridSettings = (newSettings: Partial<typeof gridSettings.value>): void => {
    gridSettings.value = { ...gridSettings.value, ...newSettings }

    // 如果列数发生变化，重新计算布局
    if (newSettings.columns !== undefined) {
      // 重新计算所有卡片布局，支持无限制行数
      recalculateLayout()
    }
    saveLayoutConfig()
  }

  /**
   * 重置布局
   */
  const resetLayout = (): void => {
    const providerIds = Object.keys(cardConfigs.value)
    cardConfigs.value = {}
    initializeCardConfigs(providerIds)
  }

  /**
   * 保存布局配置
   */
  const saveLayoutConfig = (): void => {
    try {
      const config = {
        cardConfigs: cardConfigs.value,
        gridSettings: gridSettings.value
      }
      localStorage.setItem('chatallai_layout_config', JSON.stringify(config))
    } catch (error) {
      console.error('Failed to save layout config:', error)
    }
  }

  /**
   * 加载布局配置
   */
  const loadLayoutConfig = (): void => {
    try {
      const saved = localStorage.getItem('chatallai_layout_config')
      if (saved) {
        const config = JSON.parse(saved)
        if (config.cardConfigs) {
          cardConfigs.value = config.cardConfigs
        }
        if (config.gridSettings) {
          gridSettings.value = { ...gridSettings.value, ...config.gridSettings }
          if (gridSettings.value.columns < 2) {
            gridSettings.value.columns = 2
          }
        }
        console.log('成功加载布局配置:', config.gridSettings)
      } else {
        console.log('未找到保存的布局配置，使用默认设置')
      }
    } catch (error) {
      console.error('Failed to load layout config:', error)
    }
  }

  /**
   * 获取卡片配置
   */
  const getCardConfig = (providerId: string): CardConfig | undefined => cardConfigs.value[providerId]

  /**
   * 更新卡片标题
   */
  const updateCardTitle = (providerId: string, title: string): void => {
    if (cardConfigs.value[providerId]) {
      cardConfigs.value[providerId].title = title
      saveLayoutConfig()
    }
  }

  /**
   * 是否处于多屏全屏
   */
  const isMultiScreenFullScreen = computed(
    () => displayLayout.value.fullScreenState === 2 && displayLayout.value.screenCount > 1
  )

  /**
   * 切换智能体与技能行折叠状态
   */
  const toggleInputAgent = (): void => {
    inputAgentCollapsed.value = !inputAgentCollapsed.value
    saveCollapsedState('chatallai_input_agent_collapsed', inputAgentCollapsed.value)
  }

  /**
   * 切换模型选择区折叠状态
   */
  const toggleInputModel = (): void => {
    inputModelCollapsed.value = !inputModelCollapsed.value
    saveCollapsedState('chatallai_input_model_collapsed', inputModelCollapsed.value)
  }

  /**
   * 切换输入区折叠状态
   */
  const toggleInputContent = (): void => {
    inputContentCollapsed.value = !inputContentCollapsed.value
    saveCollapsedState('chatallai_input_content_collapsed', inputContentCollapsed.value)
  }

  /**
   * 更新显示布局
   */
  const updateDisplayLayout = (layout: DisplayLayout): void => {
    displayLayout.value = layout
  }

  return {
    cardConfigs,
    cardScreenIndex,
    displayLayout,
    isMultiScreenFullScreen,
    primaryScreen,
    gridSettings,
    windowSize,
    showGrid,
    inputAgentCollapsed,
    inputModelCollapsed,
    inputContentCollapsed,
    toggleInputAgent,
    toggleInputModel,
    toggleInputContent,
    availableWidth,
    availableHeight,
    cardWidth,
    cardHeight,
    initializeCardConfigs,
    updateCardPosition,
    updateCardSize,
    toggleCardVisibility,
    toggleCardMinimized,
    maximizeCard,
    restoreCardFromMaximized,
    toggleCardMaximized,
    updateWindowSize,
    updateGridSettings,
    recalculateLayout,
    resetLayout,
    saveLayoutConfig,
    loadLayoutConfig,
    getCardConfig,
    updateCardTitle,
    updateDisplayLayout,
    setCardScreenIndexes
  }
})
