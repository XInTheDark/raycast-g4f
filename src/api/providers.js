/// This module unifies all available providers.
/// It provides functions to communicate directly with each provider,
/// as well as predefined info for each provider.

import { Preferences } from "./preferences.js";

/// Provider modules
import { NexraProvider } from "./Providers/nexra.js";
import { DeepInfraProvider } from "./Providers/deepinfra.js";
import { BlackboxProvider } from "./Providers/blackbox.js";
import { DuckDuckGoProvider } from "./Providers/duckduckgo.js";
import { BestIMProvider } from "./Providers/bestim.js";
import { RocksProvider } from "./Providers/rocks.js";
import { ChatgptFreeProvider } from "./Providers/chatgptfree.js";
import { AI4ChatProvider } from "./Providers/ai4chat.js";
import { DarkAIProvider } from "./Providers/darkai.js";
import { MhysticalProvider } from "./Providers/mhystical.js";
import { PizzaGPTProvider } from "./Providers/pizzagpt.js";
import { MetaAIProvider } from "./Providers/metaAI.js";
import { ReplicateProvider } from "./Providers/replicate.js";
import { PhindProvider } from "./Providers/phind.js";
import { GeminiProvider } from "./Providers/google_gemini.js";

/// Special or unused providers
import { special_providers_info } from "./providers_special.js";
import { OpenAIProvider } from "./Providers/openai.js";

/// All providers info
// { provider internal name, {provider object, model, stream, extra options} }
// prettier-ignore
export const providers_info = {
  NexraChatGPT: { provider: NexraProvider, model: "chatgpt", stream: true },
  NexraGPT4o: { provider: NexraProvider, model: "gpt-4o", stream: true },
  NexraGPT4: { provider: NexraProvider, model: "gpt-4-32k", stream: false },
  NexraBing: { provider: NexraProvider, model: "Bing", stream: true },
  NexraLlama31: { provider: NexraProvider, model: "llama-3.1", stream: true },
  NexraGeminiPro: { provider: NexraProvider, model: "gemini-pro", stream: true },
  DeepInfraLlama33_70B: { provider: DeepInfraProvider, model: "meta-llama/Llama-3.3-70B-Instruct-Turbo", stream: true },
  DeepInfraLlama32_90B_Vision: { provider: DeepInfraProvider, model: "meta-llama/Llama-3.2-90B-Vision-Instruct", stream: true, context_tokens: 8000 },
  DeepInfraLlama32_11B_Vision: { provider: DeepInfraProvider, model: "meta-llama/Llama-3.2-11B-Vision-Instruct", stream: true },
  DeepInfraLlama31_70B: { provider: DeepInfraProvider, model: "meta-llama/Meta-Llama-3.1-70B-Instruct-Turbo", stream: true },
  DeepInfraLlama31_8B: { provider: DeepInfraProvider, model: "meta-llama/Meta-Llama-3.1-8B-Instruct-Turbo", stream: true },
  DeepInfraLlama31_405B: { provider: DeepInfraProvider, model: "meta-llama/Meta-Llama-3.1-405B-Instruct", stream: true },
  DeepInfraQwen25_72B: { provider: DeepInfraProvider, model: "Qwen/Qwen2.5-72B-Instruct", stream: true },
  DeepInfraQwen25Coder_32B: { provider: DeepInfraProvider, model: "Qwen/Qwen2.5-Coder-32B-Instruct", stream: true },
  DeepInfraQwQ_32B_Preview: { provider: DeepInfraProvider, model: "Qwen/QwQ-32B-Preview", stream: true },
  DeepInfraWizardLM2_8x22B: { provider: DeepInfraProvider, model: "microsoft/WizardLM-2-8x22B", stream: true },
  DeepInfraLlama31Nemotron70B: { provider: DeepInfraProvider, model: "nvidia/Llama-3.1-Nemotron-70B-Instruct", stream: true },
  DeepInfraDeepSeek25: { provider: DeepInfraProvider, model: "deepseek-ai/DeepSeek-V2.5", stream: true },
  Blackbox: { provider: BlackboxProvider, model: "blackbox", stream: true },
  BlackboxLlama31_405B: { provider: BlackboxProvider, model: "llama-3.1-405b", stream: true },
  BlackboxLlama31_70B: { provider: BlackboxProvider, model: "llama-3.1-70b", stream: true },
  BlackboxGemini15Flash: { provider: BlackboxProvider, model: "gemini-1.5-flash", stream: true },
  BlackboxQwQ32BPreview: { provider: BlackboxProvider, model: "qwq-32b-preview", stream: true },
  BlackboxGPT4o: { provider: BlackboxProvider, model: "gpt-4o", stream: true },
  BlackboxClaude35Sonnet: { provider: BlackboxProvider, model: "claude-3.5-sonnet", stream: true },
  BlackboxGeminiPro: { provider: BlackboxProvider, model: "gemini-pro", stream: true },
  DuckDuckGo_GPT4oMini: { provider: DuckDuckGoProvider, model: "gpt-4o-mini", stream: true, context_tokens: 4096 },
  DuckDuckGo_Claude3Haiku: { provider: DuckDuckGoProvider, model: "claude-3-haiku-20240307", stream: true, context_tokens: 4096 },
  DuckDuckGo_Llama31_70B: { provider: DuckDuckGoProvider, model: "meta-llama/Meta-Llama-3.1-70B-Instruct-Turbo", stream: true, context_tokens: 4096 },
  DuckDuckGo_Mixtral_8x7B: { provider: DuckDuckGoProvider, model: "mistralai/Mixtral-8x7B-Instruct-v0.1", stream: true, context_tokens: 4096 },
  BestIM_GPT4oMini: { provider: BestIMProvider, model: "", stream: true },
  RocksClaude35Sonnet: { provider: RocksProvider, model: "claude-3-5-sonnet-20241022", stream: true },
  RocksClaude3Opus: { provider: RocksProvider, model: "claude-3-opus-20240229", stream: true },
  RocksChatGPT4oLatest: { provider: RocksProvider, model: "chatgpt-4o-latest", stream: true },
  RocksGPT4o: { provider: RocksProvider, model: "gpt-4o", stream: true },
  RocksGPT4: { provider: RocksProvider, model: "gpt-4", stream: true },
  RocksWizardLM2_8x22B: { provider: RocksProvider, model: "WizardLM-2-8x22B", stream: true },
  RocksLlama31_405B: { provider: RocksProvider, model: "llama-3.1-405b-turbo", stream: true },
  RocksLlama31_70B: { provider: RocksProvider, model: "llama-3.1-70b-turbo", stream: true },
  ChatgptFree: { provider: ChatgptFreeProvider, model: "", stream: true },
  AI4Chat: { provider: AI4ChatProvider, model: "", stream: false, context_tokens: 4096 },
  DarkAI: { provider: DarkAIProvider, model: "gpt-4o", stream: true },
  Mhystical: { provider: MhysticalProvider, model: "gpt-4-32k", stream: false },
  PizzaGPT: { provider: PizzaGPTProvider, model: "", stream: false },
  MetaAI: { provider: MetaAIProvider, model: "", stream: true },
  ReplicateLlama3_8B: { provider: ReplicateProvider, model: "meta/meta-llama-3-8b-instruct", stream: true },
  ReplicateLlama3_70B: { provider: ReplicateProvider, model: "meta/meta-llama-3-70b-instruct", stream: true },
  ReplicateLlama31_405B: { provider: ReplicateProvider, model: "meta/meta-llama-3.1-405b-instruct", stream: true },
  ReplicateMixtral_8x7B: { provider: ReplicateProvider, model: "mistralai/mixtral-8x7b-instruct-v0.1", stream: true },
  Phind: { provider: PhindProvider, model: "", stream: true },
  GoogleGemini: { provider: GeminiProvider, model: ["gemini-1.5-pro-002", "gemini-1.5-flash-002", "gemini-1.5-flash-latest"], stream: true },
  GoogleGeminiFlash: { provider: GeminiProvider, model: ["gemini-2.0-flash-exp", "gemini-1.5-flash-002"], stream: true },
  GoogleGeminiExperimental: { provider: GeminiProvider, model: ["gemini-exp-1206", "gemini-2.0-flash-exp", "gemini-2.0-flash-thinking-exp-1219"], stream: true },
  GoogleGeminiThinking: { provider: GeminiProvider, model: ["gemini-2.0-flash-thinking-exp-1219"], stream: true },

  // Special providers (jsx extension)
  ...special_providers_info,

  // Providers unused in raycast-g4f
  OpenAI_API: { provider: OpenAIProvider, model: "gpt-4o", stream: true, api_key: null },
};

/// Providers that support file uploads
export const file_supported_providers = [GeminiProvider, DeepInfraProvider];

/// Provider strings that support image uploads
export const image_supported_provider_strings = [
  "GoogleGemini",
  "GoogleGeminiExperimental",
  "DeepInfraLlama32_90B_Vision",
  "DeepInfraLlama32_11B_Vision",
];

/// Providers that support function calling
export const function_supported_providers = [DeepInfraProvider, GeminiProvider];

/// Model aliases
/// Each model is aliased to an array of provider strings that support it
// prettier-ignore
export const model_aliases = {
  "gpt-4o": ["RocksGPT4o", "NexraGPT4o", "DarkAI", "BlackboxGPT4o", "NexraChatGPT", "NexraBing"],
  "gpt-4": ["RocksGPT4", "AI4Chat", "NexraGPT4", "Mhystical"],
  "gpt-4o-mini": ["DuckDuckGo_GPT4oMini", "ChatgptFree", "PizzaGPT"],
  "claude-3.5-sonnet": ["BlackboxClaude35Sonnet", "RocksClaude35Sonnet"],
  "claude-3-opus": ["RocksClaude3Opus"],
  "claude-3-haiku": ["DuckDuckGo_Claude3Haiku"],
  "gemini-1.5-pro": ["GoogleGemini", "BlackboxGeminiPro", "NexraGeminiPro"],
  "gemini-1.5-flash": ["GoogleGeminiFlash", "BlackboxGemini15Flash"],
  "gemini-exp": ["GoogleGeminiExperimental"],
  "llama-3.1-405b": ["BlackboxLlama31_405B", "RocksLlama31_405B", "MetaAI", "DeepInfraLlama31_405B"],
  "llama-3.1-70b": ["BlackboxLlama31_70B", "DeepInfraLlama31_70B", "RocksLlama31_70B", "DuckDuckGo_Llama31_70B", "NexraLlama31", "DeepInfraLlama31Nemotron70B"],
  "llama-3.1-8b": ["DeepInfraLlama31_8B", "ReplicateLlama3_8B"],
  "llama-3.2-90b": ["DeepInfraLlama32_90B_Vision"],
  "llama-3.2-11b": ["DeepInfraLlama32_11B_Vision"],
  "llama-3.3-70b": ["DeepInfraLlama33_70B"],
  "qwen-2.5-72b": ["DeepInfraQwen25_72B"],
  "qwen-2.5-coder-32b": ["DeepInfraQwen25Coder_32B"],
  "qwq-32b-preview": ["DeepInfraQwQ_32B_Preview"],
  "wizardlm-2-8x22b": ["DeepInfraWizardLM2_8x22B", "RocksWizardLM2_8x22B"],
  "deepseek-2.5": ["DeepInfraDeepSeek25"],
  "mixtral-8x7b": ["DuckDuckGo_Mixtral_8x7B", "ReplicateMixtral_8x7B"],
};

// Additional options
export const additional_provider_options = (provider, chatOptions = null) => {
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

/// Main function for generation
// note that provider is the provider object, not the provider string
export const generate = async function (provider, chat, options, { stream_update = null, max_retries = 5 }) {
  return provider.generate(chat, options, { stream_update, max_retries });
};

// Utilities
export const default_provider_string = () => {
  return Preferences["defaultProvider"];
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

// Get options from info
export const get_options_from_info = (info, chatOptions = {}) => {
  const provider = info.provider;
  // we delete the provider key since it's not an option
  return {
    ...info,
    ...chatOptions,
    ...additional_provider_options(provider, chatOptions),
    provider: undefined,
  };
};
