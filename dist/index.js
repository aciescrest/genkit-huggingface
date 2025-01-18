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
exports.huggingFaceModel = exports.HuggingFaceConfigSchema = void 0;
exports.huggingface = huggingface;
const plugin_1 = require("genkit/plugin");
const model_1 = require("@genkit-ai/ai/model");
const genkit_1 = require("genkit");
// Define the Hugging Face Inference API endpoint (configurable)
const DEFAULT_HF_INFERENCE_ENDPOINT = 'https://api-inference.huggingface.co/models/';
// Define the plugin configuration schema
exports.HuggingFaceConfigSchema = model_1.GenerationCommonConfigSchema.extend({
    model: genkit_1.z.string().optional(), // Add model option
    hfInferenceEndpoint: genkit_1.z.string().optional(), // Allow endpoint override
});
// Define the model reference (flexible)
const huggingFaceModel = (modelName) => (0, model_1.modelRef)({
    name: `huggingface/${modelName}`,
    info: {
        versions: ['1.0.0'], // Update with your model versions
        label: `Hugging Face Model: ${modelName}`, // Dynamic label
        supports: {
            multiturn: true,
            tools: false,
            media: false,
            systemRole: true,
            output: ['text'],
        },
    },
    configSchema: exports.HuggingFaceConfigSchema,
    version: '1.0.0',
});
exports.huggingFaceModel = huggingFaceModel;
// Helper function to transform Genkit request to Hugging Face format
function toHuggingFaceRequest(request) {
    var _a, _b, _c, _d;
    const messages = request.messages
        .filter((m) => m.role !== 'system') // Assuming HF doesn't use 'system' role
        .map((m) => `${m.role}: ${m.content[0].text}`)
        .join('\n');
    return {
        inputs: messages,
        parameters: {
            max_new_tokens: (_a = request.config) === null || _a === void 0 ? void 0 : _a.maxOutputTokens,
            top_k: (_b = request.config) === null || _b === void 0 ? void 0 : _b.topK,
            top_p: (_c = request.config) === null || _c === void 0 ? void 0 : _c.topP,
            temperature: (_d = request.config) === null || _d === void 0 ? void 0 : _d.temperature,
            return_full_text: false, // This will ensure only generated text is returned
            details: false // This will ensure only generated text is returned
            // Add other parameters as needed
        },
    };
}
// Helper function to transform Hugging Face response to Genkit format
function toGenerateResponse(response) {
    return __awaiter(this, void 0, void 0, function* () {
        // Assuming the response is an array with one object containing 'generated_text'
        if (Array.isArray(response) && response.length > 0 && response[0].generated_text) {
            const text = response[0].generated_text;
            // const analysis = parseAnalysisFromText(text);
            return {
                candidates: [
                    {
                        index: 0,
                        finishReason: 'stop',
                        message: {
                            role: 'model',
                            content: [{ text: text }],
                        },
                    },
                ],
                usage: {
                    inputTokens: 0,
                    outputTokens: 0,
                },
            };
        }
        else {
            throw new Error('Unexpected format from Hugging Face model response');
        }
    });
}
// // Helper function to parse the analysis from the model's text output
// function parseAnalysisFromText(text: string): string {
//     // Strip out the user prompt and format the analysis to be just the relevant content
//     const startIndex = text.indexOf('**Potential ROI:**');
//     if (startIndex === -1) return "Analysis not found in expected format.";
//     return text.slice(startIndex);
// }
function huggingface(options) {
    return (0, plugin_1.genkitPlugin)('huggingface', (ai) => __awaiter(this, void 0, void 0, function* () {
        ai.defineModel(Object.assign(Object.assign({ name: `huggingface-model` }, (0, exports.huggingFaceModel)(options.defaultModel || 'mistralai/Mistral-7B-Instruct-v0.3').info), { configSchema: exports.HuggingFaceConfigSchema }), (request, streamingCallback) => __awaiter(this, void 0, void 0, function* () {
            var _a, _b;
            const modelName = options.defaultModel || 'mistralai/Mistral-7B-Instruct-v0.3'; // Removed 'mistralai/' prefix
            const hfInferenceEndpoint = ((_a = request.config) === null || _a === void 0 ? void 0 : _a.hfInferenceEndpoint) || DEFAULT_HF_INFERENCE_ENDPOINT;
            const fullInferenceEndpoint = `${hfInferenceEndpoint}${modelName}`;
            const fetchOptions = {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${options.apiKey}`,
                    'Content-Type': 'application/json' // Added 'Content-Type' for all requests
                },
                body: JSON.stringify(toHuggingFaceRequest(request)),
            };
            if (streamingCallback) {
                const response = yield fetch(fullInferenceEndpoint, fetchOptions);
                if (!response.ok) {
                    console.error(`Hugging Face API request failed: ${response.status} ${response.statusText}`);
                    throw new Error(`Hugging Face API request failed: ${response.status}`);
                }
                const reader = (_b = response.body) === null || _b === void 0 ? void 0 : _b.getReader();
                if (!reader) {
                    throw new Error('Could not read response body');
                }
                let generatedText = '';
                try {
                    while (true) {
                        const { done, value } = yield reader.read();
                        if (done) {
                            break;
                        }
                        if (value) {
                            const chunk = new TextDecoder().decode(value);
                            generatedText += chunk;
                            const chunkMessage = {
                                role: 'model',
                                content: [{ text: chunk }],
                            };
                            streamingCallback(chunkMessage);
                        }
                    }
                }
                finally {
                    reader.releaseLock();
                }
                return toGenerateResponse({ generated_text: generatedText });
            }
            else {
                const response = yield fetch(fullInferenceEndpoint, fetchOptions);
                if (!response.ok) {
                    const errorText = yield response.text();
                    console.error(`Hugging Face API request failed: ${response.status} ${response.statusText} ${errorText}`);
                    throw new Error(`Hugging Face API request failed: ${response.status}`);
                }
                const json = yield response.json();
                return toGenerateResponse(json);
            }
        }));
    }));
}
//# sourceMappingURL=index.js.map