import { genkitPlugin } from 'genkit/plugin';
import {
    GenerateRequest,
    GenerateResponseData,
    MessageData,
} from 'genkit';
import {
    GenerationCommonConfigSchema,
    modelRef,
} from '@genkit-ai/ai/model';
import { z } from 'genkit';

// Define the Hugging Face Inference API endpoint (configurable)
const DEFAULT_HF_INFERENCE_ENDPOINT = 'https://api-inference.huggingface.co/models/';

// Define the plugin configuration schema
export const HuggingFaceConfigSchema = GenerationCommonConfigSchema.extend({
    model: z.string().optional(), // Add model option
    hfInferenceEndpoint: z.string().optional(), // Allow endpoint override
});

// Define the model reference (flexible)
export const huggingFaceModel = (modelName: string) =>
    modelRef({
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
        configSchema: HuggingFaceConfigSchema,
        version: '1.0.0',
    });

// Helper function to transform Genkit request to Hugging Face format
function toHuggingFaceRequest(
    request: GenerateRequest<typeof HuggingFaceConfigSchema>
): { inputs: string; parameters: any } {
    const messages = request.messages
        .filter((m) => m.role !== 'system') // Assuming HF doesn't use 'system' role
        .map((m) => `${m.role}: ${m.content[0].text}`)
        .join('\n');
    return {
        inputs: messages,
        parameters: {
            max_new_tokens: request.config?.maxOutputTokens,
            top_k: request.config?.topK,
            top_p: request.config?.topP,
            temperature: request.config?.temperature,
            return_full_text: false, // This will ensure only generated text is returned
            details: false // This will ensure only generated text is returned
            // Add other parameters as needed
        },
    };
}

// Helper function to transform Hugging Face response to Genkit format
async function toGenerateResponse(
    response: any
): Promise<GenerateResponseData> {
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
    } else {
        throw new Error('Unexpected format from Hugging Face model response');
    }
}

// // Helper function to parse the analysis from the model's text output
// function parseAnalysisFromText(text: string): string {
//     // Strip out the user prompt and format the analysis to be just the relevant content
//     const startIndex = text.indexOf('**Potential ROI:**');
//     if (startIndex === -1) return "Analysis not found in expected format.";
    
//     return text.slice(startIndex);
// }

export function huggingface(
    options: { apiKey: string; defaultModel?: string }
) {
    return genkitPlugin('huggingface', async (ai) => {
        ai.defineModel(
            {
                name: `huggingface-model`,
                ...huggingFaceModel(options.defaultModel || 'mistralai/Mistral-7B-Instruct-v0.3').info,
                configSchema: HuggingFaceConfigSchema,
            },
            async (request, streamingCallback) => {
                const modelName = options.defaultModel || 'mistralai/Mistral-7B-Instruct-v0.3'; // Removed 'mistralai/' prefix
                const hfInferenceEndpoint =
                    request.config?.hfInferenceEndpoint || DEFAULT_HF_INFERENCE_ENDPOINT;

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
                    const response = await fetch(fullInferenceEndpoint, fetchOptions);

                    if (!response.ok) {
                        console.error(
                            `Hugging Face API request failed: ${response.status} ${response.statusText}`
                        );
                        throw new Error(
                            `Hugging Face API request failed: ${response.status}`
                        );
                    }

                    const reader = response.body?.getReader();
                    if (!reader) {
                        throw new Error('Could not read response body');
                    }

                    let generatedText = '';

                    try {
                        while (true) {
                            const { done, value } = await reader.read();

                            if (done) {
                                break;
                            }

                            if (value) {
                                const chunk = new TextDecoder().decode(value);
                                generatedText += chunk;

                                const chunkMessage: MessageData = {
                                    role: 'model',
                                    content: [{ text: chunk }],
                                };

                                streamingCallback(chunkMessage);
                            }
                        }
                    } finally {
                        reader.releaseLock();
                    }

                    return toGenerateResponse({ generated_text: generatedText });
                } else {
                    const response = await fetch(fullInferenceEndpoint, fetchOptions);

                    if (!response.ok) {
                        const errorText = await response.text();
                        console.error(
                            `Hugging Face API request failed: ${response.status} ${response.statusText} ${errorText}`
                        );
                        throw new Error(
                            `Hugging Face API request failed: ${response.status}`
                        );
                    }

                    const json = await response.json();
                    return toGenerateResponse(json);
                }
            }
        );
    });
}