/**
 * AI总结提示词模板工具
 *
 * @author 月上中天
 * @since 2026-03-24
 * @version 1.0
 */

import type { AIResponse } from '../types/summary'

/**
 * 默认总结提示词模板
 */
const DEFAULT_SUMMARY_PROMPT = `请对以下多个AI助手的回答进行总结和分析。

## 原始问题
{originalQuery}

## 各AI回答
{responses}

## 总结要求
1. 核心观点总结：提炼各AI回答的核心观点和主要结论
2. 观点对比：分析各AI回答的异同点，指出共识和分歧
3. 详细程度：保持中等详细程度，既要有概括性又要保留关键细节
4. 结构要求：使用清晰的标题和 bullet points 组织内容
5. 语言风格：专业、客观、易于理解

请按以下格式输出总结：

# 回答总结

## 核心观点概述
[概括各AI的核心观点]

## 详细分析
### 共识点
[各AI都认同的观点]

### 差异点
[各AI观点不同的地方]

### 补充观点
[某些AI特有的观点]

## 建议与结论
[基于各AI回答的综合建议]`

/**
 * 生成总结提示词
 * @param originalQuery 原始问题
 * @param responses AI回答列表
 * @param customPrompt 自定义提示词模板（可选）
 * @returns 完整的提示词
 */
export function generateSummaryPrompt(
  originalQuery: string,
  responses: AIResponse[],
  customPrompt?: string
): string {
  const prompt = customPrompt || DEFAULT_SUMMARY_PROMPT

  const formattedResponses = responses
    .filter((r) => r.success && r.content.trim())
    .map((r, index) => `### AI ${index + 1}: ${r.providerName}\n${r.content}`)
    .join('\n\n')

  return prompt
    .replace(/\{originalQuery\}/g, originalQuery)
    .replace(/\{responses\}/g, formattedResponses)
}
