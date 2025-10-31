import { vi } from 'vitest';

// =====================================================
// Mock OpenAI Client
// =====================================================

export const createMockOpenAIClient = () => {
  return {
    chat: {
      completions: {
        create: vi.fn().mockResolvedValue({
          id: 'chatcmpl-mock123',
          object: 'chat.completion',
          created: Date.now(),
          model: 'gpt-4',
          choices: [
            {
              index: 0,
              message: {
                role: 'assistant',
                content: 'This is a mock AI response for testing purposes.',
              },
              finish_reason: 'stop',
            },
          ],
          usage: {
            prompt_tokens: 10,
            completion_tokens: 20,
            total_tokens: 30,
          },
        }),
      },
    },
    embeddings: {
      create: vi.fn().mockResolvedValue({
        object: 'list',
        data: [
          {
            object: 'embedding',
            index: 0,
            embedding: new Array(1536).fill(0.1),
          },
        ],
        model: 'text-embedding-ada-002',
        usage: {
          prompt_tokens: 10,
          total_tokens: 10,
        },
      }),
    },
  };
};

// =====================================================
// Mock AI Responses
// =====================================================

export const mockAIResponses = {
  rfqAnalysis: {
    items: [
      {
        description: 'Industrial Steel Pipes',
        quantity: 100,
        unit: 'meters',
        specifications: 'Diameter: 50mm, Grade: A36',
      },
    ],
    estimatedBudget: 5000,
    urgency: 'normal',
    requiredBy: '2025-02-15',
  },
  quotationGeneration: {
    items: [
      {
        description: 'Industrial Steel Pipes',
        quantity: 100,
        unit: 'meters',
        unitPrice: 50,
        totalPrice: 5000,
      },
    ],
    subtotal: 5000,
    tax: 500,
    total: 5500,
    validUntil: '2025-03-15',
  },
  providerRecommendation: {
    recommendedProviders: [
      {
        id: 'provider-1',
        name: 'Steel Supply Co.',
        score: 9.5,
        reason: 'High quality and competitive pricing',
      },
      {
        id: 'provider-2',
        name: 'Metal Works Inc.',
        score: 8.7,
        reason: 'Fast delivery and good reputation',
      },
    ],
  },
};

// =====================================================
// Mock Streaming Response
// =====================================================

export const createMockStreamingResponse = (chunks: string[]) => {
  return {
    [Symbol.asyncIterator]: async function* () {
      for (const chunk of chunks) {
        yield {
          choices: [
            {
              delta: {
                content: chunk,
              },
            },
          ],
        };
      }
    },
  };
};

// =====================================================
// Helper Functions
// =====================================================

/**
 * Creates a mock OpenAI client that returns specific responses
 */
export function createMockOpenAIWithResponses(responses: {
  chatCompletion?: string;
  embedding?: number[];
}) {
  const client = createMockOpenAIClient();

  if (responses.chatCompletion) {
    client.chat.completions.create.mockResolvedValue({
      id: 'chatcmpl-mock',
      object: 'chat.completion',
      created: Date.now(),
      model: 'gpt-4',
      choices: [
        {
          index: 0,
          message: {
            role: 'assistant',
            content: responses.chatCompletion,
          },
          finish_reason: 'stop',
        },
      ],
      usage: {
        prompt_tokens: 10,
        completion_tokens: 20,
        total_tokens: 30,
      },
    });
  }

  if (responses.embedding) {
    client.embeddings.create.mockResolvedValue({
      object: 'list',
      data: [
        {
          object: 'embedding',
          index: 0,
          embedding: responses.embedding,
        },
      ],
      model: 'text-embedding-ada-002',
      usage: {
        prompt_tokens: 10,
        total_tokens: 10,
      },
    });
  }

  return client;
}

/**
 * Creates a mock error response from OpenAI
 */
export function createMockOpenAIError(message: string, type: string = 'api_error') {
  return new Error(`OpenAI API Error: ${message}`);
}
