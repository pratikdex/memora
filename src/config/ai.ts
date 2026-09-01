import { env } from './env';
import type { AIProvider } from '../features/ai/providers/base.provider';

let providerInstance: AIProvider | null = null;

export async function getAIProvider(): Promise<AIProvider> {
  if (providerInstance) return providerInstance;

  const isKeyMissing =
    (env.AI_PROVIDER === 'openai' && !env.OPENAI_API_KEY) ||
    (env.AI_PROVIDER === 'anthropic' && !env.ANTHROPIC_API_KEY) ||
    (env.AI_PROVIDER === 'gemini' && !env.GEMINI_API_KEY);

  if (isKeyMissing) {
    const { MockProvider } = await import('../features/ai/providers/mock.provider');
    providerInstance = new MockProvider();
    return providerInstance;
  }

  switch (env.AI_PROVIDER) {
    case 'openai': {
      const { OpenAIProvider } = await import('../features/ai/providers/openai.provider');
      providerInstance = new OpenAIProvider();
      break;
    }
    case 'anthropic': {
      const { AnthropicProvider } = await import('../features/ai/providers/anthropic.provider');
      providerInstance = new AnthropicProvider();
      break;
    }
    case 'gemini': {
      const { GeminiProvider } = await import('../features/ai/providers/gemini.provider');
      providerInstance = new GeminiProvider();
      break;
    }
    default:
      throw new Error(`Unsupported AI provider: ${env.AI_PROVIDER}`);
  }

  return providerInstance;
}
