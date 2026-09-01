/**
 * Base AI Provider Interface
 *
 * All AI providers (OpenAI, Anthropic, Gemini) implement this interface,
 * allowing seamless swapping between providers via configuration.
 */

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface AICompletionOptions {
  temperature?: number;
  maxTokens?: number;
}

export interface CategorizeResult {
  category: string;
  tags: string[];
  confidence: number;
}

export interface AIProvider {
  /** Provider name for logging */
  readonly name: string;

  /**
   * Generate a chat completion from a list of messages.
   */
  chat(messages: ChatMessage[], options?: AICompletionOptions): Promise<string>;

  /**
   * Generate follow-up questions to enrich a reminder or note.
   * Returns an array of intelligent questions based on the user's input.
   */
  generateQuestions(
    input: string,
    type: 'reminder' | 'note',
    existingContext?: string
  ): Promise<string[]>;

  /**
   * Generate a rich, actionable summary from the user's input
   * and the conversation history.
   */
  generateSummary(
    input: string,
    type: 'reminder' | 'note',
    conversationHistory: ChatMessage[]
  ): Promise<string>;

  /**
   * Auto-categorize input and suggest relevant tags.
   */
  categorize(input: string): Promise<CategorizeResult>;

  /**
   * Enhance a note by extracting key points and generating a structured summary.
   */
  enhanceNote(content: string): Promise<{
    summary: string;
    keyPoints: string[];
    suggestedTitle?: string;
  }>;
}
