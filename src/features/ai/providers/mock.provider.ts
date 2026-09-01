import type {
  AIProvider,
  ChatMessage,
  AICompletionOptions,
  CategorizeResult,
} from './base.provider';
import { logger } from '../../../utils/logger';

export class MockProvider implements AIProvider {
  readonly name = 'MockAI';

  constructor() {
    logger.warn('⚠️ No AI API key is configured. Falling back to Mock AI Provider.');
  }

  async chat(messages: ChatMessage[], _options?: AICompletionOptions): Promise<string> {
    const lastMessage = messages.filter((m) => m.role !== 'system').slice(-1)[0];
    const content = lastMessage?.content?.toLowerCase() || '';

    if (content.includes('dentist') || content.includes('doctor') || content.includes('appointment')) {
      return "Sure! I've noted down your appointment. Which clinic are you visiting, and would you like to set a reminder 15 minutes before the time?";
    }

    if (content.includes('buy') || content.includes('groceries') || content.includes('shopping')) {
      return "Got it! Groceries list. Are there specific items you need to buy, or is there a specific store you are going to?";
    }

    return "Hello! I am your Mock AI assistant. I'm helping you test the application since there are no AI API keys configured. Tell me what you'd like to remember or note down!";
  }

  async generateQuestions(
    input: string,
    type: 'reminder' | 'note',
    existingContext?: string
  ): Promise<string[]> {
    const text = input.toLowerCase();

    if (text.includes('dentist') || text.includes('doctor') || text.includes('appointment')) {
      return [
        'What is the name of the dentist or clinic?',
        'Are there any specific preparation instructions or documents you need to bring?',
        'Would you like a reminder 15 minutes or 1 hour before the appointment?',
      ];
    }

    if (text.includes('buy') || text.includes('groceries') || text.includes('shopping')) {
      return [
        'Which grocery store or market are you planning to visit?',
        'Do you have a specific list of items or budget in mind?',
        'Would you like to set this as a recurring weekly reminder?',
      ];
    }

    if (text.includes('work') || text.includes('meeting') || text.includes('project')) {
      return [
        'Who else is participating in this work or meeting?',
        'Are there specific documents or links you want to attach to this?',
        'What is the key objective or deliverable for this task?',
      ];
    }

    return [
      `What are the specific details or objectives for this ${type}?`,
      'Are there any other people involved or resources needed?',
      'Is there a hard deadline or a flexible timeframe?',
    ];
  }

  async generateSummary(
    input: string,
    type: 'reminder' | 'note',
    conversationHistory: ChatMessage[]
  ): Promise<string> {
    const title = input.length > 50 ? input.substring(0, 47) + '...' : input;
    
    // Extract key details from conversation
    const userDetails = conversationHistory
      .filter((m) => m.role === 'user')
      .map((m) => `- ${m.content}`)
      .join('\n');

    return `### 🧠 Smart Summary (${this.name})
This is an AI-generated summary of your ${type}:

**Title**: ${title}
**Original Request**: "${input}"

${userDetails.length > 0 ? `**Additional Details Gathered**:\n${userDetails}` : '**Additional Details**: None provided.'}

*Note: This summary was generated using the Mock AI Provider. Add a real API key to your \`.env\` file to use advanced models.*`;
  }

  async categorize(input: string): Promise<CategorizeResult> {
    const text = input.toLowerCase();

    if (text.includes('dentist') || text.includes('doctor') || text.includes('health') || text.includes('clinic')) {
      return { category: 'Health', tags: ['health', 'appointment', 'medical'], confidence: 0.95 };
    }

    if (text.includes('groceries') || text.includes('buy') || text.includes('shopping') || text.includes('food')) {
      return { category: 'Personal', tags: ['groceries', 'shopping', 'errands'], confidence: 0.95 };
    }

    if (text.includes('work') || text.includes('meeting') || text.includes('office') || text.includes('project') || text.includes('task')) {
      return { category: 'Work', tags: ['work', 'meeting', 'project', 'professional'], confidence: 0.95 };
    }

    return { category: 'General', tags: ['inbox'], confidence: 0.8 };
  }

  async enhanceNote(content: string): Promise<{
    summary: string;
    keyPoints: string[];
    suggestedTitle?: string;
  }> {
    const lines = content.split('\n').map((l) => l.trim()).filter(Boolean);
    const suggestedTitle = lines[0] ? (lines[0].length > 40 ? lines[0].substring(0, 37) + '...' : lines[0]) : 'Untitled Enhanced Note';

    return {
      summary: `This note captures the main points of: "${suggestedTitle}". It is categorized and organized for quick reference.`,
      keyPoints: [
        `Main topic: ${suggestedTitle}`,
        `Contains ${lines.length} lines of detailed content`,
        'Enhanced using Mock AI insights',
      ],
      suggestedTitle,
    };
  }
}
