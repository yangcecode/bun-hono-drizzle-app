import { ChatCloudflareWorkersAI } from '../lib/ChatCloudflareWorkersAI';
import * as z from 'zod';
import {
  StateGraph,
  START,
  END,
  MemorySaver,
  RetryPolicy,
  Command,
  interrupt,
} from '@langchain/langgraph';
import { HumanMessage } from '@langchain/core/messages';
const EmailClassificationSchema = z.object({
  intent: z.enum(['question', 'bug', 'billing', 'feature', 'complex']),
  urgency: z.enum(['low', 'medium', 'high', 'critical']),
  topic: z.string(),
  summary: z.string(),
});

const EmailAgentState = z.object({
  // Raw email data
  emailContent: z.string(),
  senderEmail: z.string(),
  emailId: z.string(),

  // Classification result
  classification: EmailClassificationSchema.optional(),

  // Raw search/API results
  searchResults: z.array(z.string()).optional(),
  customerHistory: z.record(z.any()).optional(),

  // Generated content
  responseText: z.string().optional(),

  // AI thinking/reasoning log
  thinking: z.string().optional(),
});

export type EmailAgentStateType = z.infer<typeof EmailAgentState>;
export type EmailClassificationType = z.infer<typeof EmailClassificationSchema>;
// Define the structure for email classification
export async function kefu(llm: ChatCloudflareWorkersAI) {
  async function readEmail(state: EmailAgentStateType) {
    console.log(`Processing email: ${state.emailContent}`);
    const thinking =
      `📨 开始处理邮件\n` +
      `发件人: ${state.senderEmail}\n` +
      `邮件ID: ${state.emailId}\n` +
      `内容长度: ${state.emailContent.length} 字符\n` +
      `正在解析邮件元数据和内容...`;
    return { thinking };
  }

  async function classifyIntent(state: EmailAgentStateType) {
    const classificationPrompt = `Analyze this customer email and classify it.

Email: ${state.emailContent}
From: ${state.senderEmail}

Classification guidelines:

INTENT:
- "question": General inquiry or how-to question
- "bug": Reporting a technical issue or error
- "billing": Payment, subscription, or refund related
- "feature": Feature request or suggestion
- "complex": Multiple issues or unclear intent

URGENCY (be careful to classify correctly):
- "low": General questions, feature suggestions, positive feedback, no time pressure
- "medium": Normal support requests, minor issues, standard inquiries
- "high": Customer frustrated, financial impact, repeated issues, time-sensitive
- "critical": System down, security breach, legal threat, VIP customer emergency

Examples:
- "How do I reset password?" → urgency: "low" (simple question)
- "I can't log in, tried resetting password" → urgency: "medium" (normal issue)
- "I was charged twice! Please fix immediately!" → urgency: "high" (financial + frustrated)
- "Our entire system is down, losing $10k/hour" → urgency: "critical" (major business impact)

You must respond with ONLY a valid JSON object (no markdown, no explanation), with these exact fields:
{
  "intent": "question" | "bug" | "billing" | "feature" | "complex",
  "urgency": "low" | "medium" | "high" | "critical",
  "topic": "brief topic description",
  "summary": "brief summary of the email"
}

Respond with the JSON only:`;

    let thinking = `🤔 正在分析邮件意图...\n\n`;
    thinking += `📝 发送给 AI 的提示词:\n"${classificationPrompt.substring(0, 200)}..."\n\n`;

    const response = await llm.invoke([new HumanMessage(classificationPrompt)]);
    const responseText = response.content.toString().trim();

    thinking += `💭 AI 原始回复:\n${responseText}\n\n`;

    let classification: EmailClassificationType;
    try {
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        classification = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('No JSON found in response');
      }
    } catch (e) {
      console.error('Failed to parse classification:', e, responseText);
      classification = {
        intent: 'complex',
        urgency: 'high',
        topic: 'unknown',
        summary: state.emailContent.substring(0, 100),
      };
    }

    let nextNode: 'searchDocumentation' | 'humanReview' | 'draftResponse' | 'bugTracking';

    if (classification.intent === 'billing' || classification.urgency === 'critical') {
      nextNode = 'humanReview';
    } else if (classification.intent === 'question' || classification.intent === 'feature') {
      nextNode = 'searchDocumentation';
    } else if (classification.intent === 'bug') {
      nextNode = 'bugTracking';
    } else {
      nextNode = 'draftResponse';
    }

    thinking +=
      `✅ 解析结果:\n` +
      `  意图: ${classification.intent}\n` +
      `  紧急程度: ${classification.urgency}\n` +
      `  主题: ${classification.topic}\n` +
      `  摘要: ${classification.summary}\n\n`;
    thinking += `➡️ 决策: 因为意图是 "${classification.intent}" 且紧急程度为 "${classification.urgency}"，下一步将执行 "${nextNode}"`;

    console.log('Classification:', classification, '-> Next:', nextNode);

    return new Command({
      update: { classification, thinking },
      goto: nextNode,
    });
  }

  async function searchDocumentation(state: EmailAgentStateType) {
    const classification = state.classification!;
    const query = `${classification.intent} ${classification.topic}`;

    let thinking = `🔍 搜索知识库...\n\n`;
    thinking += `查询关键词: "${query}"\n\n`;

    let searchResults: string[];

    try {
      searchResults = [
        'Reset password via Settings > Security > Change Password',
        'Password must be at least 12 characters',
        'Include uppercase, lowercase, numbers, and symbols',
      ];
      thinking += `✅ 找到 ${searchResults.length} 条相关文档:\n`;
      searchResults.forEach((doc, i) => {
        thinking += `  ${i + 1}. ${doc}\n`;
      });
    } catch (error) {
      searchResults = [`Search temporarily unavailable: ${error}`];
      thinking += `❌ 搜索失败: ${error}`;
    }

    thinking += `\n➡️ 下一步: draftResponse`;

    return new Command({
      update: { searchResults, thinking },
      goto: 'draftResponse',
    });
  }

  async function bugTracking(state: EmailAgentStateType) {
    const ticketId = 'BUG-12345';

    let thinking = `🐛 创建 Bug 工单...\n\n`;
    thinking += `工单系统: Jira\n`;
    thinking += `创建工单 ID: ${ticketId}\n`;
    thinking += `关联邮件: ${state.emailId}\n\n`;
    thinking += `✅ 工单创建成功\n`;
    thinking += `➡️ 下一步: draftResponse`;

    return new Command({
      update: { searchResults: [`Bug ticket ${ticketId} created`], thinking },
      goto: 'draftResponse',
    });
  }

  async function draftResponse(state: EmailAgentStateType) {
    const classification = state.classification!;
    const contextSections: string[] = [];

    let thinking = `✍️ 生成回复草稿...\n\n`;

    if (state.searchResults) {
      const formattedDocs = state.searchResults.map((doc) => `- ${doc}`).join('\n');
      contextSections.push(`Relevant documentation:\n${formattedDocs}`);
      thinking += `📚 使用的上下文文档:\n${formattedDocs}\n\n`;
    }

    if (state.customerHistory) {
      contextSections.push(`Customer tier: ${state.customerHistory.tier ?? 'standard'}`);
    }

    const draftPrompt = `
Draft a response to this customer email:
${state.emailContent}

Email intent: ${classification.intent}
Urgency level: ${classification.urgency}

${contextSections.join('\n\n')}

Guidelines:
- Be professional and helpful
- Address their specific concern
- Use the provided documentation when relevant
`;

    thinking += `📝 发送给 AI 的提示词:\n"${draftPrompt.substring(0, 300)}..."\n\n`;

    const response = await llm.invoke([new HumanMessage(draftPrompt)]);
    const responseText = response.content.toString();

    thinking += `💭 AI 生成的回复:\n${responseText.substring(0, 200)}...\n\n`;

    const needsReview =
      classification.urgency === 'high' ||
      classification.urgency === 'critical' ||
      classification.intent === 'complex';

    const nextNode = needsReview ? 'humanReview' : 'sendReply';

    thinking += `➡️ 决策: 因为紧急程度是 "${classification.urgency}"，${needsReview ? '需要人工审核' : '直接发送'}`;

    return new Command({
      update: { responseText, thinking },
      goto: nextNode,
    });
  }

  async function humanReview(state: EmailAgentStateType) {
    // Pause for human review using interrupt and route based on decision
    const classification = state.classification!;

    // interrupt() must come first - any code before it will re-run on resume
    const humanDecision = interrupt({
      emailId: state.emailId,
      originalEmail: state.emailContent,
      draftResponse: state.responseText,
      urgency: classification.urgency,
      intent: classification.intent,
      action: 'Please review and approve/edit this response',
    });

    // Now process the human's decision
    if (humanDecision.approved) {
      return new Command({
        update: { responseText: humanDecision.editedResponse || state.responseText },
        goto: 'sendReply',
      });
    } else {
      // Rejection means human will handle directly
      return new Command({ update: {}, goto: END });
    }
  }

  async function sendReply(state: EmailAgentStateType): Promise<{}> {
    // Send the email response
    // Integrate with email service
    console.log(`Sending reply: ${state.responseText!.substring(0, 100)}...`);
    return {};
  }

  const workflow = new StateGraph(EmailAgentState)
    // Add nodes with appropriate error handling
    .addNode('readEmail', readEmail)
    // classifyIntent uses Command to route dynamically
    .addNode('classifyIntent', classifyIntent, {
      ends: ['searchDocumentation', 'humanReview', 'draftResponse', 'bugTracking'],
    })
    // Add retry policy for nodes that might have transient failures
    .addNode('searchDocumentation', searchDocumentation, {
      retryPolicy: { maxAttempts: 3 },
      ends: ['draftResponse'],
    })
    .addNode('bugTracking', bugTracking, { ends: ['draftResponse'] })
    .addNode('draftResponse', draftResponse, { ends: ['humanReview', 'sendReply'] })
    .addNode('humanReview', humanReview, { ends: ['sendReply'] })
    .addNode('sendReply', sendReply)
    // Add only the essential edges
    .addEdge(START, 'readEmail')
    .addEdge('readEmail', 'classifyIntent')
    .addEdge('sendReply', END);

  // Compile with checkpointer for persistence
  const memory = new MemorySaver();
  const app = workflow.compile({ checkpointer: memory });
  return app;
}
