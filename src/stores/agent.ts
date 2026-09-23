import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { Agent, Skill } from '../types/agent'
import { defaultAgents, defaultSkills } from '../config/defaultAgents'

/**
 * Agent/Skill 状态管理
 */
export const useAgentStore = defineStore('agent', () => {
  // 当前激活的智能体
  const activeAgent = ref<Agent | null>(null)
  // 当前激活的Skills
  const activeSkills = ref<Skill[]>([])
  // 所有智能体列表
  const agents = ref<Agent[]>([])
  // 所有Skill列表
  const skills = ref<Skill[]>([])

  // 计算属性
  const hasActiveAgent = computed(() => activeAgent.value !== null)
  const activeSkillCount = computed(() => activeSkills.value.length)
  const hasActiveTransform = computed(() => hasActiveAgent.value || activeSkillCount.value > 0)

  /**
   * 初始化 - 加载默认配置和用户自定义配置
   */
  function initialize() {
    // 加载默认智能体
    agents.value = [...defaultAgents]
    // 加载默认Skills
    skills.value = [...defaultSkills]
    // 从localStorage恢复状态
    loadState()
  }

  /**
   * 消息内容转换核心方法
   * @param content 原始消息内容
   * @param providerId AI提供商ID
   * @returns 转换后的消息内容
   */
  function transformMessage(content: string, providerId: string): string {
    let result = content

    // 1. Agent前缀拼接
    if (activeAgent.value) {
      const agent = activeAgent.value
      const shouldApply = agent.targetProviders.length === 0
        || agent.targetProviders.includes(providerId)
      if (shouldApply) {
        let { systemPrompt } = agent
        // 替换智能体变量
        agent.variables.forEach((v) => {
          systemPrompt = systemPrompt.replace(
            new RegExp(`\\{\\{${v.name}\\}\\}`, 'g'),
            v.defaultValue
          )
        })
        result = `${systemPrompt}\n\n${result}`
      }
    }

    // 2. Skill拼接
    activeSkills.value.forEach((skill) => {
      const shouldApply = skill.targetProviders.length === 0
        || skill.targetProviders.includes(providerId)
      if (shouldApply && skill.isEnabled) {
        switch (skill.mode) {
          case 'prefix':
            result = skill.template.replace(/\{\{user_input\}\}/g, result)
            break
          case 'suffix':
            result = `${result}\n\n${skill.template.replace(/\{\{user_input\}\}/g, result)}`
            break
          case 'wrap':
            result = skill.template.replace(/\{\{user_input\}\}/g, result)
            break
        }
      }
    })

    return result
  }

  /**
   * 设置当前智能体
   */
  function setActiveAgent(agent: Agent | null) {
    activeAgent.value = agent
    saveState()
  }

  /**
   * 切换Skill
   */
  function toggleSkill(skill: Skill, enabled: boolean) {
    if (enabled) {
      if (!activeSkills.value.find((s) => s.id === skill.id)) {
        activeSkills.value.push(skill)
      }
    } else {
      activeSkills.value = activeSkills.value.filter((s) => s.id !== skill.id)
    }
    saveState()
  }

  /**
   * 清除所有激活状态
   */
  function clearAll() {
    activeAgent.value = null
    activeSkills.value = []
    saveState()
  }

  /**
   * 保存状态到localStorage
   */
  function saveState() {
    try {
      const state = {
        activeAgentId: activeAgent.value?.id || null,
        activeSkillIds: activeSkills.value.map((s) => s.id)
      }
      localStorage.setItem('agent-skill-state', JSON.stringify(state))
    } catch (error) {
      console.error('保存Agent/Skill状态失败:', error)
    }
  }

  /**
   * 从localStorage恢复状态
   */
  function loadState() {
    try {
      const stored = localStorage.getItem('agent-skill-state')
      if (stored) {
        const state = JSON.parse(stored)
        if (state.activeAgentId) {
          activeAgent.value = agents.value.find((a) => a.id === state.activeAgentId) || null
        }
        if (state.activeSkillIds) {
          activeSkills.value = skills.value.filter((s) => state.activeSkillIds.includes(s.id))
        }
      }
    } catch (error) {
      console.error('加载Agent/Skill状态失败:', error)
    }
  }

  // 初始化
  initialize()

  return {
    activeAgent,
    activeSkills,
    agents,
    skills,
    hasActiveAgent,
    activeSkillCount,
    hasActiveTransform,
    setActiveAgent,
    toggleSkill,
    clearAll,
    transformMessage,
    initialize
  }
})
