import { z } from 'genkit';
export declare const HuggingFaceConfigSchema: z.ZodObject<z.objectUtil.extendShape<{
    version: z.ZodOptional<z.ZodString>;
    temperature: z.ZodOptional<z.ZodNumber>;
    maxOutputTokens: z.ZodOptional<z.ZodNumber>;
    topK: z.ZodOptional<z.ZodNumber>;
    topP: z.ZodOptional<z.ZodNumber>;
    stopSequences: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
}, {
    model: z.ZodOptional<z.ZodString>;
    hfInferenceEndpoint: z.ZodOptional<z.ZodString>;
}>, "strip", z.ZodTypeAny, {
    model?: string | undefined;
    hfInferenceEndpoint?: string | undefined;
    version?: string | undefined;
    temperature?: number | undefined;
    maxOutputTokens?: number | undefined;
    topK?: number | undefined;
    topP?: number | undefined;
    stopSequences?: string[] | undefined;
}, {
    model?: string | undefined;
    hfInferenceEndpoint?: string | undefined;
    version?: string | undefined;
    temperature?: number | undefined;
    maxOutputTokens?: number | undefined;
    topK?: number | undefined;
    topP?: number | undefined;
    stopSequences?: string[] | undefined;
}>;
export declare const huggingFaceModel: (modelName: string) => import("genkit").ModelReference<z.ZodObject<z.objectUtil.extendShape<{
    version: z.ZodOptional<z.ZodString>;
    temperature: z.ZodOptional<z.ZodNumber>;
    maxOutputTokens: z.ZodOptional<z.ZodNumber>;
    topK: z.ZodOptional<z.ZodNumber>;
    topP: z.ZodOptional<z.ZodNumber>;
    stopSequences: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
}, {
    model: z.ZodOptional<z.ZodString>;
    hfInferenceEndpoint: z.ZodOptional<z.ZodString>;
}>, "strip", z.ZodTypeAny, {
    model?: string | undefined;
    hfInferenceEndpoint?: string | undefined;
    version?: string | undefined;
    temperature?: number | undefined;
    maxOutputTokens?: number | undefined;
    topK?: number | undefined;
    topP?: number | undefined;
    stopSequences?: string[] | undefined;
}, {
    model?: string | undefined;
    hfInferenceEndpoint?: string | undefined;
    version?: string | undefined;
    temperature?: number | undefined;
    maxOutputTokens?: number | undefined;
    topK?: number | undefined;
    topP?: number | undefined;
    stopSequences?: string[] | undefined;
}>>;
export declare function huggingface(options: {
    apiKey: string;
    defaultModel?: string;
}): import("genkit/plugin").GenkitPlugin;
