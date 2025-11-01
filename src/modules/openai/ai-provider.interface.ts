/**
 * Interface for AI providers (OpenAI)
 */
export interface ChatCompletionRequest {
  tenantId: string;
  virtualAgentId: string;
  conversationId: string;
  userMessage: string;
  contextLimit?: number;
  channelId?: string;           // For multimedia processing (Telegram, etc)
  channelConfig?: any;          // Channel configuration (contains bot token, etc)
}

export interface ChatCompletionResponse {
  message: {
    content: string | null;
    toolCalls?: Array<{
      id: string;
      type: string;
      function: {
        name: string;
        arguments: string;
      };
    }>;
  };
  finishReason: 'stop' | 'tool_calls' | 'length' | 'content_filter';
  model: string;
  tokens: {
    prompt: number;
    completion: number;
    total: number;
  };
}

/**
 * Abstract interface for AI provider implementations
 */
export interface IAIProvider {
  /**
   * Generates a chat completion response
   */
  generateChatCompletion(
    request: ChatCompletionRequest,
  ): Promise<ChatCompletionResponse>;

  /**
   * Generates a streaming chat completion response
   */
  generateChatCompletionStream(
    request: ChatCompletionRequest,
  ): Promise<AsyncIterable<any>>;
}
