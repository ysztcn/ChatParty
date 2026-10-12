/**
 * AI评审提示词模板
 */

/** 综合评审模板 */
const COMPREHENSIVE_REVIEW_PROMPT = `你是一个专业的AI回答评审专家。请对以下AI模型的回答进行严格评审。

## 原始问题
{originalQuery}

## 待评审的回答
{responses}

## 评审要求
请对每个AI的回答从以下维度评分（1-10分）：

| 维度 | 说明 |
|------|------|
| 准确性 | 事实是否正确，有无错误信息 |
| 完整性 | 是否全面覆盖了问题的各个方面 |
| 逻辑性 | 论证是否清晰，推理是否合理 |
| 可读性 | 表达是否清晰，结构是否合理 |
| 实用性 | 回答的实际参考价值 |

请严格按以下格式输出（不要遗漏任何模型）：

## 评审结果

### 各模型评分
| 模型 | 准确性 | 完整性 | 逻辑性 | 可读性 | 实用性 | 总分 |
|------|--------|--------|--------|--------|--------|------|
{scoreTableRows}

### 最佳回答
**最佳模型**: [模型名]
**理由**: [选择理由]

### 各模型改进建议
{improvementSection}`

/**
 * 生成评审提示词
 */
export function generateReviewPrompt(
  originalQuery: string,
  responses: { providerName: string; content: string }[],
  customPrompt?: string
): string {
  const prompt = customPrompt || COMPREHENSIVE_REVIEW_PROMPT

  const formattedResponses = responses
    .filter((r) => r.content.trim())
    .map((r, index) => `### AI ${index + 1}: ${r.providerName}\n${r.content}`)
    .join('\n\n---\n\n')

  return prompt
    .replace(/\{originalQuery\}/g, originalQuery)
    .replace(/\{responses\}/g, formattedResponses)
}
