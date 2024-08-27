/// This module unifies all available providers.
/// It provides functions to communicate directly with each provider,
/// as well as predefined info for each provider.

import { Form, getPreferenceValues } from "@raycast/api";

/// Provider modules
// Nexra module
import { NexraProvider, getNexraResponse } from "./Providers/nexra";
export { NexraProvider, getNexraResponse };

// DeepInfra module
import { DeepInfraProvider, getDeepInfraResponse } from "./Providers/deepinfra";
export { DeepInfraProvider, getDeepInfraResponse };

// Blackbox module
import { BlackboxProvider, getBlackboxResponse } from "./Providers/blackbox";
export { BlackboxProvider, getBlackboxResponse };

// DuckDuckGo module
import { DuckDuckGoProvider, getDuckDuckGoResponse } from "./Providers/duckduckgo";
export { DuckDuckGoProvider, getDuckDuckGoResponse };

// BestIM module
import { BestIMProvider, getBestIMResponse } from "./Providers/bestim";
export { BestIMProvider, getBestIMResponse };

// PizzaGPT module
import { PizzaGPTProvider, getPizzaGPTResponse } from "./Providers/pizzagpt";
export { PizzaGPTProvider, getPizzaGPTResponse };

// Meta AI module
import { MetaAIProvider, getMetaAIResponse } from "./Providers/metaAI";
export { MetaAIProvider, getMetaAIResponse };

// SambaNova module
import { SambaNovaProvider, getSambaNovaResponse } from "./Providers/sambanova";
export { SambaNovaProvider, getSambaNovaResponse };

// Replicate module
import { ReplicateProvider, getReplicateResponse } from "./Providers/replicate";
export { ReplicateProvider, getReplicateResponse };

// Google Gemini module
import { GeminiProvider, getGoogleGeminiResponse } from "./Providers/google_gemini";
export { GeminiProvider, getGoogleGeminiResponse };

// G4F Local module
import { G4FLocalProvider, getG4FLocalResponse } from "./Providers/g4f_local";
export { G4FLocalProvider, getG4FLocalResponse };

// Ollama Local module
import { OllamaLocalProvider, getOllamaLocalResponse } from "./Providers/ollama_local";
export { OllamaLocalProvider, getOllamaLocalResponse };

/// All providers info
// { provider internal name, {provider, model, stream, extra options} }
// prettier-ignore
export const providers_info = {
  NexraChatGPT: { provider: NexraProvider, model: "chatgpt", stream: true },
  NexraGPT4o: { provider: NexraProvider, model: "gpt-4o", stream: true },
  NexraGPT4: { provider: NexraProvider, model: "gpt-4-32k", stream: false },
  NexraBing: { provider: NexraProvider, model: "Bing", stream: true },
  NexraLlama31: { provider: NexraProvider, model: "llama-3.1", stream: true },
  NexraGeminiPro: { provider: NexraProvider, model: "gemini-pro", stream: true },
  DeepInfraLlama31_70B: { provider: DeepInfraProvider, model: "meta-llama/Meta-Llama-3.1-70B-Instruct", stream: true },
  DeepInfraLlama31_8B: { provider: DeepInfraProvider, model: "meta-llama/Meta-Llama-3.1-8B-Instruct", stream: true },
  DeepInfraLlama31_405B: { provider: DeepInfraProvider, model: "meta-llama/Meta-Llama-3.1-405B-Instruct", stream: true },
  DeepInfraMixtral_8x22B: { provider: DeepInfraProvider, model: "mistralai/Mixtral-8x22B-Instruct-v0.1", stream: true },
  DeepInfraMixtral_8x7B: { provider: DeepInfraProvider, model: "mistralai/Mixtral-8x7B-Instruct-v0.1", stream: true },
  DeepInfraQwen2_72B: { provider: DeepInfraProvider, model: "Qwen/Qwen2-72B-Instruct", stream: true },
  DeepInfraMistral_7B: { provider: DeepInfraProvider, model: "mistralai/Mistral-7B-Instruct-v0.3", stream: true },
  DeepInfraWizardLM2_8x22B: { provider: DeepInfraProvider, model: "microsoft/WizardLM-2-8x22B", stream: true },
  DeepInfraLlama3_8B: { provider: DeepInfraProvider, model: "meta-llama/Meta-Llama-3-8B-Instruct", stream: true, context_tokens: 8000 },
  DeepInfraLlama3_70B: { provider: DeepInfraProvider, model: "meta-llama/Meta-Llama-3-70B-Instruct", stream: true, context_tokens: 8000 },
  DeepInfraOpenChat36_8B: { provider: DeepInfraProvider, model: "openchat/openchat-3.6-8b", stream: true, context_tokens: 8000 },
  DeepInfraGemma2_27B: { provider: DeepInfraProvider, model: "google/gemma-2-27b-it", stream: true, context_tokens: 4096 },
  DeepInfraLlava15_7B: { provider: DeepInfraProvider, model: "llava-hf/llava-1.5-7b-hf", stream: true, context_tokens: 4096 },
  Blackbox: { provider: BlackboxProvider, model: "", stream: true },
  DuckDuckGo_GPT4oMini: { provider: DuckDuckGoProvider, model: "gpt-4o-mini", stream: true, context_tokens: 4096 },
  DuckDuckGo_Claude3Haiku: { provider: DuckDuckGoProvider, model: "claude-3-haiku-20240307", stream: true, context_tokens: 4096 },
  DuckDuckGo_Llama31_70B: { provider: DuckDuckGoProvider, model: "meta-llama/Meta-Llama-3.1-70B-Instruct-Turbo", stream: true, context_tokens: 4096 },
  DuckDuckGo_Mixtral_8x7B: { provider: DuckDuckGoProvider, model: "mistralai/Mixtral-8x7B-Instruct-v0.1", stream: true, context_tokens: 4096 },
  BestIM_GPT4oMini: { provider: BestIMProvider, model: "", stream: true },
  PizzaGPT: { provider: PizzaGPTProvider, model: "", stream: false },
  MetaAI: { provider: MetaAIProvider, model: "", stream: true },
  SambaNovaLlama31_405B: { provider: SambaNovaProvider, model: "llama3-405b", stream: true, context_tokens: 4096 },
  SambaNovaLlama3_70B: { provider: SambaNovaProvider, model: "llama3-70b", stream: true },
  SambaNovaLlama3_8B: { provider: SambaNovaProvider, model: "llama3-8b", stream: true },
  ReplicateLlama3_8B: { provider: ReplicateProvider, model: "meta/meta-llama-3-8b-instruct", stream: true },
  ReplicateLlama3_70B: { provider: ReplicateProvider, model: "meta/meta-llama-3-70b-instruct", stream: true },
  ReplicateLlama31_405B: { provider: ReplicateProvider, model: "meta/meta-llama-3.1-405b-instruct", stream: true },
  ReplicateMixtral_8x7B: { provider: ReplicateProvider, model: "mistralai/mixtral-8x7b-instruct-v0.1", stream: true },
  GoogleGemini: { provider: GeminiProvider, model: ["gemini-1.5-pro-exp-0801", "gemini-1.5-pro-latest", "gemini-1.5-flash-latest"], stream: true },
  G4FLocal: { provider: G4FLocalProvider, stream: true },
  OllamaLocal: { provider: OllamaLocalProvider, stream: true },
};

/// Chat providers (user-friendly names)
export const chat_providers = [
  ["Nexra (chatgpt)", "NexraChatGPT"],
  ["Nexra (gpt-4o)", "NexraGPT4o"],
  ["Nexra (gpt-4-32k)", "NexraGPT4"],
  ["Nexra (Bing)", "NexraBing"],
  ["Nexra (llama-3.1)", "NexraLlama31"],
  ["Nexra (gemini-1.0-pro)", "NexraGeminiPro"],
  ["DeepInfra (meta-llama-3.1-405b)", "DeepInfraLlama31_405B"],
  ["DeepInfra (meta-llama-3.1-70b)", "DeepInfraLlama31_70B"],
  ["DeepInfra (meta-llama-3.1-8b)", "DeepInfraLlama31_8B"],
  ["DeepInfra (Mixtral-8x22B)", "DeepInfraMixtral_8x22B"],
  ["DeepInfra (Mixtral-8x7B)", "DeepInfraMixtral_8x7B"],
  ["DeepInfra (Qwen2-72B)", "DeepInfraQwen2_72B"],
  ["DeepInfra (Mistral-7B)", "DeepInfraMistral_7B"],
  ["DeepInfra (openchat-3.6-8b)", "DeepInfraOpenChat36_8B"],
  ["DeepInfra (meta-llama-3-70b)", "DeepInfraLlama3_70B"],
  ["DeepInfra (meta-llama-3-8b)", "DeepInfraLlama3_8B"],
  ["DeepInfra (gemma-2-27b)", "DeepInfraGemma2_27B"],
  ["DeepInfra (WizardLM-2-8x22B)", "DeepInfraWizardLM2_8x22B"],
  ["DeepInfra (llava-1.5-7b)", "DeepInfraLlava15_7B"],
  ["Blackbox (custom-model)", "Blackbox"],
  ["DuckDuckGo (gpt-4o-mini)", "DuckDuckGo_GPT4oMini"],
  ["DuckDuckGo (claude-3-haiku)", "DuckDuckGo_Claude3Haiku"],
  ["DuckDuckGo (meta-llama-3.1-70b)", "DuckDuckGo_Llama31_70B"],
  ["DuckDuckGo (mixtral-8x7b)", "DuckDuckGo_Mixtral_8x7B"],
  ["BestIM (gpt-4o-mini)", "BestIM_GPT4oMini"],
  ["PizzaGPT (gpt-3.5-turbo)", "PizzaGPT"],
  ["Meta AI (meta-llama-3.1)", "MetaAI"],
  ["SambaNova (llama-3.1-405b)", "SambaNovaLlama31_405B"],
  ["SambaNova (llama-3-70b)", "SambaNovaLlama3_70B"],
  ["SambaNova (llama-3-8b)", "SambaNovaLlama3_8B"],
  ["Replicate (mixtral-8x7b)", "ReplicateMixtral_8x7B"],
  ["Replicate (meta-llama-3.1-405b)", "ReplicateLlama31_405B"],
  ["Replicate (meta-llama-3-70b)", "ReplicateLlama3_70B"],
  ["Replicate (meta-llama-3-8b)", "ReplicateLlama3_8B"],
  ["Google Gemini (requires API Key)", "GoogleGemini"],
  ["GPT4Free Local API", "G4FLocal"],
  ["Ollama Local API", "OllamaLocal"],
];

export const ChatProvidersReact = chat_providers.map((x) => {
  return <Form.Dropdown.Item title={x[0]} value={x[1]} key={x[1]} />;
});

/// Providers that support file uploads
export const file_supported_providers = [GeminiProvider, DeepInfraProvider];

/// Providers that support function calling
export const function_supported_providers = [DeepInfraProvider];

// Additional options
export const provider_options = (provider, chatOptions = null) => {
  let options = {};
  if (chatOptions?.creativity) {
    let temperature = parseFloat(chatOptions.creativity);
    temperature = Math.max(0.0, temperature).toFixed(1);
    options.temperature = temperature;
  } else {
    options.temperature = 0.7;
  }
  return options;
};

// Additional properties
// providers that handle the stream update in a custom way (see chatCompletion function)
export const custom_stream_handled_providers = [GeminiProvider];

export const default_provider_string = () => {
  return getPreferenceValues()["gptProvider"];
};

// Parse provider string
export const get_provider_string = (provider) => {
  if (provider && Object.keys(providers_info).includes(provider)) return provider;
  return default_provider_string();
};

// Get provider info based on a provider STRING (i.e. the key in providers_info)
// if providerString is not supplied or is incorrect, implicitly return the default provider
export const get_provider_info = (providerString) => {
  return providers_info[get_provider_string(providerString)];
};
