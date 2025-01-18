"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const index_1 = require("../src/index"); // Import the module you want to test
// Mock fetch API
global.fetch = jest.fn();
const mockStreamingCallback = jest.fn();
describe('huggingface plugin', () => {
    beforeEach(() => {
        global.fetch.mockClear();
        mockStreamingCallback.mockClear();
    });
    const apiKey = 'test-api-key';
    const defaultModel = 'test-model';
    it('should define a model with correct configuration', () => __awaiter(void 0, void 0, void 0, function* () {
        const plugin = (0, index_1.huggingface)({ apiKey, defaultModel });
        const ai = { defineModel: jest.fn() };
        yield plugin(ai);
        expect(ai.defineModel).toHaveBeenCalledTimes(1);
        expect(ai.defineModel).toHaveBeenCalledWith(expect.objectContaining({
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
        }), expect.any(Function));
    }));
    it('should handle successful non-streaming request', () => __awaiter(void 0, void 0, void 0, function* () {
        global.fetch.mockResolvedValue({
            ok: true,
            json: () => __awaiter(void 0, void 0, void 0, function* () { return [{ generated_text: 'Test response' }]; }),
        });
        const plugin = (0, index_1.huggingface)({ apiKey, defaultModel });
        const ai = { defineModel: jest.fn() };
        yield plugin(ai);
        const model = ai.defineModel.mock.calls[0][1];
        const request = {
            messages: [
                { role: 'user', content: [{ text: 'Hello' }] },
            ],
            config: {},
        };
        const result = yield model(request);
        expect(fetch).toHaveBeenCalledTimes(1);
        expect(fetch).toHaveBeenCalledWith(`https://api-inference.huggingface.co/models/test-model`, {
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
        });
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
    }));
    it('should handle successful streaming request', () => __awaiter(void 0, void 0, void 0, function* () {
        const mockReader = {
            read: jest.fn(),
            releaseLock: jest.fn(),
        };
        global.fetch.mockResolvedValue({
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
        const plugin = (0, index_1.huggingface)({ apiKey, defaultModel });
        const ai = { defineModel: jest.fn() };
        yield plugin(ai);
        const model = ai.defineModel.mock.calls[0][1];
        const request = {
            messages: [{ role: 'user', content: [{ text: 'Hello' }] }],
            config: {},
        };
        const result = yield model(request, mockStreamingCallback);
        expect(fetch).toHaveBeenCalledTimes(1);
        expect(fetch).toHaveBeenCalledWith(`https://api-inference.huggingface.co/models/test-model`, {
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
        });
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
    }));
    it('should handle failed fetch request (non-streaming)', () => __awaiter(void 0, void 0, void 0, function* () {
        global.fetch.mockResolvedValue({
            ok: false,
            status: 500,
            statusText: 'Internal Server Error',
            text: () => __awaiter(void 0, void 0, void 0, function* () { return 'Error details'; }),
        });
        const plugin = (0, index_1.huggingface)({ apiKey, defaultModel });
        const ai = { defineModel: jest.fn() };
        yield plugin(ai);
        const model = ai.defineModel.mock.calls[0][1];
        const request = {
            messages: [{ role: 'user', content: [{ text: 'Hello' }] }],
            config: {},
        };
        yield expect(model(request)).rejects.toThrow('Hugging Face API request failed: 500');
    }));
    it('should handle failed fetch request (streaming)', () => __awaiter(void 0, void 0, void 0, function* () {
        global.fetch.mockResolvedValue({
            ok: false,
            status: 500,
            statusText: 'Internal Server Error',
            text: () => __awaiter(void 0, void 0, void 0, function* () { return 'Error details'; }),
        });
        const plugin = (0, index_1.huggingface)({ apiKey, defaultModel });
        const ai = { defineModel: jest.fn() };
        yield plugin(ai);
        const model = ai.defineModel.mock.calls[0][1];
        const request = {
            messages: [{ role: 'user', content: [{ text: 'Hello' }] }],
            config: {},
        };
        yield expect(model(request, mockStreamingCallback)).rejects.toThrow('Hugging Face API request failed: 500');
    }));
    it('should use a custom model if provided in the request config', () => __awaiter(void 0, void 0, void 0, function* () {
        global.fetch.mockResolvedValue({
            ok: true,
            json: () => __awaiter(void 0, void 0, void 0, function* () { return [{ generated_text: 'Test response' }]; }),
        });
        const plugin = (0, index_1.huggingface)({ apiKey, defaultModel: 'default-model' });
        const ai = { defineModel: jest.fn() };
        yield plugin(ai);
        const model = ai.defineModel.mock.calls[0][1];
        const request = {
            messages: [{ role: 'user', content: [{ text: 'Hello' }] }],
            config: {
                model: 'custom-model',
            },
        };
        yield model(request);
        expect(fetch).toHaveBeenCalledTimes(1);
        expect(fetch).toHaveBeenCalledWith(`https://api-inference.huggingface.co/models/custom-model`, expect.anything());
    }));
    it('should override endpoint from config', () => __awaiter(void 0, void 0, void 0, function* () {
        global.fetch.mockResolvedValue({
            ok: true,
            json: () => __awaiter(void 0, void 0, void 0, function* () { return [{ generated_text: 'Test response' }]; }),
        });
        const plugin = (0, index_1.huggingface)({ apiKey, defaultModel });
        const ai = { defineModel: jest.fn() };
        yield plugin(ai);
        const model = ai.defineModel.mock.calls[0][1];
        const request = {
            messages: [{ role: 'user', content: [{ text: 'Hello' }] }],
            config: {
                hfInferenceEndpoint: 'https://test-endpoint.com/models/',
            },
        };
        yield model(request);
        expect(fetch).toHaveBeenCalledTimes(1);
        expect(fetch).toHaveBeenCalledWith(`https://test-endpoint.com/models/test-model`, expect.anything());
    }));
    it('should send parameters from config', () => __awaiter(void 0, void 0, void 0, function* () {
        global.fetch.mockResolvedValue({
            ok: true,
            json: () => __awaiter(void 0, void 0, void 0, function* () { return [{ generated_text: 'Test response' }]; }),
        });
        const plugin = (0, index_1.huggingface)({ apiKey, defaultModel });
        const ai = { defineModel: jest.fn() };
        yield plugin(ai);
        const model = ai.defineModel.mock.calls[0][1];
        const request = {
            messages: [{ role: 'user', content: [{ text: 'Hello' }] }],
            config: {
                maxOutputTokens: 100,
                topK: 50,
                topP: 0.9,
                temperature: 0.7,
            },
        };
        yield model(request);
        expect(fetch).toHaveBeenCalledTimes(1);
        const fetchCall = global.fetch.mock.calls[0][1];
        expect(JSON.parse(fetchCall.body)).toMatchObject({
            inputs: 'user: Hello',
            parameters: {
                max_new_tokens: 100,
                top_k: 50,
                top_p: 0.9,
                temperature: 0.7,
            },
        });
    }));
    it('should transform the request correctly (system role ignored)', () => __awaiter(void 0, void 0, void 0, function* () {
        global.fetch.mockResolvedValue({
            ok: true,
            json: () => __awaiter(void 0, void 0, void 0, function* () { return [{ generated_text: 'Test response' }]; }),
        });
        const plugin = (0, index_1.huggingface)({ apiKey, defaultModel });
        const ai = { defineModel: jest.fn() };
        yield plugin(ai);
        const model = ai.defineModel.mock.calls[0][1];
        const request = {
            messages: [
                { role: 'system', content: [{ text: 'System message' }] },
                { role: 'user', content: [{ text: 'Hello' }] },
            ],
            config: {},
        };
        yield model(request);
        expect(fetch).toHaveBeenCalledTimes(1);
        const fetchCall = global.fetch.mock.calls[0][1];
        expect(JSON.parse(fetchCall.body)).toEqual({
            inputs: "user: Hello\nassistant: Hi there",
            parameters: {
                max_new_tokens: undefined,
                top_k: undefined,
                top_p: undefined,
                temperature: undefined,
            },
        });
    }));
});
//# sourceMappingURL=index.test.js.map