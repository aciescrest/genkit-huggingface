import { genkitPlugin } from 'genkit/plugin';
import {
    GenerateRequest,
    GenerateResponseData,
    MessageData,
    StreamingCallback,
} from 'genkit';
import {
    GenerationCommonConfigSchema,
    modelRef,
} from '@genkit-ai/ai/model';
import { z } from 'genkit';
import { huggingface, HuggingFaceConfigSchema } from '../src/index'; // Import the module you want to test

// Mock fetch API
global.fetch = jest.fn() as jest.Mock;

const mockStreamingCallback = jest.fn() as jest.Mock<StreamingCallback<MessageData>>;

describe('huggingface plugin', () => {
    beforeEach(() => {
        (global.fetch as jest.Mock).mockClear();
        mockStreamingCallback.mockClear();
    });

    const apiKey = 'test-api-key';
    const defaultModel = 'test-model';

    it('should define a model with correct configuration', async () => {
        const plugin = huggingface({ apiKey, defaultModel });
        const ai = { defineModel: jest.fn() };
        await plugin(ai as any);
        expect(ai.defineModel).toHaveBeenCalledTimes(1);
        expect(ai.defineModel).toHaveBeenCalledWith(
            expect.objectContaining({
                name: `huggingface-model`,
                info: expect.objectContaining({
                    label: `Hugging Face Model: test-model`,
                    supports: {
                        multiturn: true,
                        tools: false,
                        media: false,
                        systemRole: true,
                        output: ['text'],
                    },
                }),
                configSchema: expect.any(Object),
            }),
            expect.any(Function)
        );
    });

    it('should handle successful non-streaming request', async () => {
        (global.fetch as jest.Mock).mockResolvedValue({
            ok: true,
            json: async () => [{ generated_text: 'Test response' }],
        });

        const plugin = huggingface({ apiKey, defaultModel });
        const ai = { defineModel: jest.fn() };
        await plugin(ai as any);

        const model = ai.defineModel.mock.calls[0][1];

        const request: GenerateRequest<typeof HuggingFaceConfigSchema> = {
            messages: [
                { role: 'user', content: [{ text: 'Hello' }] },
            ],
            config: {},
        };

        const result = await model(request);

        expect(fetch).toHaveBeenCalledTimes(1);
        expect(fetch).toHaveBeenCalledWith(
            `https://api-inference.huggingface.co/models/test-model`,
            {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${apiKey}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    inputs: 'user: Hello',
                    parameters: {
                        max_new_tokens: undefined,
                        top_k: undefined,
                        top_p: undefined,
                        temperature: undefined,
                    },
                }),
            }
        );
       expect(result).toEqual({
           candidates: [
               {
                 index: 0,
                 finishReason: 'stop',
                 message: {
                   role: 'model',
                   content: [{ text: 'Test response' }],
                 },
               },
             ],
             usage: {
               inputTokens: 0,
               outputTokens: 0,
             },
           });
   
    });


  it('should handle successful streaming request', async () => {
    const mockReader = {
      read: jest.fn(),
      releaseLock: jest.fn(),
    };
  
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      body: { getReader: () => mockReader },
    });
  
    mockReader.read
      .mockResolvedValueOnce({
        done: false,
        value: new TextEncoder().encode('Chunk 1'),
      })
      .mockResolvedValueOnce({
        done: false,
        value: new TextEncoder().encode('Chunk 2'),
      })
      .mockResolvedValueOnce({
        done: true,
      });

      const plugin = huggingface({ apiKey, defaultModel });
      const ai = { defineModel: jest.fn() };
      await plugin(ai as any);
  
      const model = ai.defineModel.mock.calls[0][1];
      const request: GenerateRequest<typeof HuggingFaceConfigSchema> = {
        messages: [{ role: 'user', content: [{ text: 'Hello' }] }],
        config: {},
      };
      
        const result = await model(request, mockStreamingCallback);

    expect(fetch).toHaveBeenCalledTimes(1);
    expect(fetch).toHaveBeenCalledWith(
        `https://api-inference.huggingface.co/models/test-model`,
        {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${apiKey}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                inputs: 'user: Hello',
                parameters: {
                    max_new_tokens: undefined,
                    top_k: undefined,
                    top_p: undefined,
                    temperature: undefined,
                },
            }),
        }
      );
  
      expect(mockStreamingCallback).toHaveBeenCalledTimes(2);
      expect(mockStreamingCallback).toHaveBeenNthCalledWith(1, {
        role: 'model',
        content: [{ text: 'Chunk 1' }],
      });
      expect(mockStreamingCallback).toHaveBeenNthCalledWith(2, {
          role: 'model',
          content: [{ text: 'Chunk 2' }],
      });
      expect(mockReader.releaseLock).toHaveBeenCalledTimes(1);
      expect(result).toEqual({
        candidates: [
          {
            index: 0,
            finishReason: 'stop',
            message: {
              role: 'model',
              content: [{ text: 'Chunk 1Chunk 2' }],
            },
          },
        ],
        usage: {
          inputTokens: 0,
          outputTokens: 0,
        },
      });
    });

    it('should handle failed fetch request (non-streaming)', async () => {
        (global.fetch as jest.Mock).mockResolvedValue({
            ok: false,
            status: 500,
            statusText: 'Internal Server Error',
            text: async () => 'Error details',
        });

        const plugin = huggingface({ apiKey, defaultModel });
        const ai = { defineModel: jest.fn() };
        await plugin(ai as any);

        const model = ai.defineModel.mock.calls[0][1];
        const request: GenerateRequest<typeof HuggingFaceConfigSchema> = {
            messages: [{ role: 'user', content: [{ text: 'Hello' }] }],
            config: {},
        };

        await expect(model(request)).rejects.toThrow(
            'Hugging Face API request failed: 500'
        );
    });

    it('should handle failed fetch request (streaming)', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        text: async () => 'Error details',
      });

      const plugin = huggingface({ apiKey, defaultModel });
      const ai = { defineModel: jest.fn() };
      await plugin(ai as any);

      const model = ai.defineModel.mock.calls[0][1];
      const request: GenerateRequest<typeof HuggingFaceConfigSchema> = {
        messages: [{ role: 'user', content: [{ text: 'Hello' }] }],
        config: {},
      };

      await expect(model(request, mockStreamingCallback)).rejects.toThrow(
        'Hugging Face API request failed: 500'
      );
    });


    it('should use a custom model if provided in the request config', async () => {
        (global.fetch as jest.Mock).mockResolvedValue({
            ok: true,
            json: async () => [{ generated_text: 'Test response' }],
        });

        const plugin = huggingface({ apiKey, defaultModel: 'default-model' });
        const ai = { defineModel: jest.fn() };
        await plugin(ai as any);

        const model = ai.defineModel.mock.calls[0][1];

        const request: GenerateRequest<typeof HuggingFaceConfigSchema> = {
            messages: [{ role: 'user', content: [{ text: 'Hello' }] }],
            config: {
                model: 'custom-model',
            },
        };

        await model(request);

        expect(fetch).toHaveBeenCalledTimes(1);
        expect(fetch).toHaveBeenCalledWith(
            `https://api-inference.huggingface.co/models/custom-model`,
            expect.anything()
        );
    });

      it('should override endpoint from config', async () => {
        (global.fetch as jest.Mock).mockResolvedValue({
            ok: true,
            json: async () => [{ generated_text: 'Test response' }],
        });

        const plugin = huggingface({ apiKey, defaultModel });
        const ai = { defineModel: jest.fn() };
        await plugin(ai as any);

        const model = ai.defineModel.mock.calls[0][1];

        const request: GenerateRequest<typeof HuggingFaceConfigSchema> = {
          messages: [{ role: 'user', content: [{ text: 'Hello' }] }],
            config: {
                hfInferenceEndpoint: 'https://test-endpoint.com/models/',
            },
        };

      await model(request);

        expect(fetch).toHaveBeenCalledTimes(1);
        expect(fetch).toHaveBeenCalledWith(
          `https://test-endpoint.com/models/test-model`,
            expect.anything()
        );
    });

    it('should send parameters from config', async () => {
        (global.fetch as jest.Mock).mockResolvedValue({
            ok: true,
            json: async () => [{ generated_text: 'Test response' }],
        });
          const plugin = huggingface({ apiKey, defaultModel });
        const ai = { defineModel: jest.fn() };
        await plugin(ai as any);

        const model = ai.defineModel.mock.calls[0][1];
        const request: GenerateRequest<typeof HuggingFaceConfigSchema> = {
            messages: [{ role: 'user', content: [{ text: 'Hello' }] }],
            config: {
              maxOutputTokens: 100,
                topK: 50,
                topP: 0.9,
                temperature: 0.7,
            },
        };
        await model(request);

        expect(fetch).toHaveBeenCalledTimes(1);
        const fetchCall = (global.fetch as jest.Mock).mock.calls[0][1];
        expect(JSON.parse(fetchCall.body)).toMatchObject({
            inputs: 'user: Hello',
            parameters: {
                max_new_tokens: 100,
                top_k: 50,
                top_p: 0.9,
                temperature: 0.7,
            },
        });
    });

     it('should transform the request correctly (system role ignored)', async () => {
       (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => [{ generated_text: 'Test response' }],
    });
      const plugin = huggingface({ apiKey, defaultModel });
    const ai = { defineModel: jest.fn() };
    await plugin(ai as any);

    const model = ai.defineModel.mock.calls[0][1];
    const request: GenerateRequest<typeof HuggingFaceConfigSchema> = {
        messages: [
          { role: 'system', content: [{ text: 'System message' }] },
          { role: 'user', content: [{ text: 'Hello' }] },
        ],
        config: {},
      };
       await model(request);

      expect(fetch).toHaveBeenCalledTimes(1);
      const fetchCall = (global.fetch as jest.Mock).mock.calls[0][1];
      expect(JSON.parse(fetchCall.body)).toEqual({
        inputs: "user: Hello\nassistant: Hi there",
        parameters: {
          max_new_tokens: undefined,
          top_k: undefined,
          top_p: undefined,
          temperature: undefined,
        },
      });
    });
});