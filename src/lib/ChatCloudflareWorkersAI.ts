import {
  SimpleChatModel,
  type BaseChatModelParams,
} from '@langchain/core/language_models/chat_models';
import { type BaseMessage } from '@langchain/core/messages';
import type { CallbackManagerForLLMRun } from '@langchain/core/callbacks/manager';
import type { Ai } from '@cloudflare/workers-types';

export interface ChatCloudflareWorkersAIInput {
  binding: Ai;
  model?: string;
}

export class ChatCloudflareWorkersAI extends SimpleChatModel {
  binding: Ai;
  model: string = '@cf/meta/llama-2-7b-chat-int8';

  constructor(fields: ChatCloudflareWorkersAIInput & BaseChatModelParams) {
    super(fields);
    this.binding = fields.binding;
    this.model = fields.model ?? this.model;
  }

  _llmType(): string {
    return 'cloudflare_workers_ai';
  }

  async _call(
    messages: BaseMessage[],
    _options: this['ParsedCallOptions'],
    _runManager?: CallbackManagerForLLMRun
  ): Promise<string> {
    const formattedMessages = messages.map((m) => {
      let role = 'user';
      if (typeof m.content !== 'string') {
        throw new Error('ChatCloudflareWorkersAI only supports string content.');
      }

      const type = m._getType();
      if (type === 'ai') role = 'assistant';
      else if (type === 'system') role = 'system';

      return { role, content: m.content };
    });

    // @ts-ignore: Cloudflare types might be slightly different or need explicit casting
    const response = await this.binding.run(this.model as any, {
      messages: formattedMessages,
    });

    if (typeof response === 'object' && response !== null && 'response' in response) {
      return (response as any).response;
    }

    // In case of unexpected format, return empty string or throw, but stringify for debug might be safer slightly
    return '';
  }
}
