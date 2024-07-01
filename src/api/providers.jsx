/// This module unifies all available providers.
/// It provides functions to communicate directly with each provider,
/// as well as predefined info for each provider.

import { Form, getPreferenceValues } from "@raycast/api";

/// Provider modules
// G4F module
import { G4FProvider, getG4FResponse } from "./Providers/g4f";
export { G4FProvider, getG4FResponse };

// Nexra module
import { NexraProvider, getNexraResponse } from "./Providers/nexra";
export { NexraProvider, getNexraResponse };

// DeepInfra module
import { DeepInfraProvider, getDeepInfraResponse } from "./Providers/deepinfra";
export { DeepInfraProvider, getDeepInfraResponse };

// Blackbox module
import { BlackboxProvider, getBlackboxResponse } from "./Providers/blackbox";
export { BlackboxProvider, getBlackboxResponse };

// Ecosia module
import { EcosiaProvider, getEcosiaResponse } from "./Providers/ecosia";
export { EcosiaProvider, getEcosiaResponse };

// Replicate module
import { ReplicateProvider, getReplicateResponse } from "./Providers/replicate";
export { ReplicateProvider, getReplicateResponse };

// Google Gemini module
import { GeminiProvider, getGoogleGeminiResponse } from "./Providers/google_gemini";
export { GeminiProvider, getGoogleGeminiResponse };

// G4F Local module
import { G4FLocalProvider, getG4FLocalResponse } from "./Providers/g4f_local";
export { G4FLocalProvider, getG4FLocalResponse };

/// All providers info
// { provider internal name, {provider, model, stream, extra options} }
// prettier-ignore
export const providers_info = {
  GPT35: { provider: NexraProvider, model: "chatgpt", stream: true },
  GPT4: { provider: G4FProvider, model: "gpt-4-32k", stream: false, g4f_provider: G4FProvider.GPT },
  Bing: { provider: G4FProvider, model: "gpt-4", stream: true, g4f_provider: G4FProvider.Bing },
  DeepInfraMixtral_8x22B: { provider: DeepInfraProvider, model: "mistralai/Mixtral-8x22B-Instruct-v0.1", stream: true },
  DeepInfraQwen2_72B: { provider: DeepInfraProvider, model: "Qwen/Qwen2-72B-Instruct", stream: true },
  DeepInfraWizardLM2_8x22B: { provider: DeepInfraProvider, model: "microsoft/WizardLM-2-8x22B", stream: true },
  DeepInfraLlama3_8B: { provider: DeepInfraProvider, model: "meta-llama/Meta-Llama-3-8B-Instruct", stream: true },
  DeepInfraLlama3_70B: { provider: DeepInfraProvider, model: "meta-llama/Meta-Llama-3-70B-Instruct", stream: true },
  Blackbox: { provider: BlackboxProvider, model: "", stream: true },
  Ecosia: { provider: EcosiaProvider, model: "gpt-3.5-turbo-0125", stream: true },
  ReplicateLlama3_8B: { provider: ReplicateProvider, model: "meta/meta-llama-3-8b-instruct", stream: true },
  ReplicateLlama3_70B: { provider: ReplicateProvider, model: "meta/meta-llama-3-70b-instruct", stream: true },
  ReplicateMixtral_8x7B: { provider: ReplicateProvider, model: "mistralai/mixtral-8x7b-instruct-v0.1", stream: true },
  GoogleGemini: { provider: GeminiProvider, model: "gemini-1.5-flash-latest", stream: true },
  G4FLocal: { provider: G4FLocalProvider, stream: true },
};

/// Chat providers (user-friendly names)
export const chat_providers = [
  ["ChatGPT (gpt-3.5-turbo)", "GPT35"],
  ["ChatGPT (gpt-4-32k)", "GPT4"],
  ["Bing (gpt-4)", "Bing"],
  ["DeepInfra (Mixtral-8x22B)", "DeepInfraMixtral_8x22B"],
  ["DeepInfra (Qwen2-72B)", "DeepInfraQwen2_72B"],
  ["DeepInfra (WizardLM-2-8x22B)", "DeepInfraWizardLM2_8x22B"],
  ["DeepInfra (meta-llama-3-8b)", "DeepInfraLlama3_8B"],
  ["DeepInfra (meta-llama-3-70b)", "DeepInfraLlama3_70B"],
  ["Blackbox (custom-model)", "Blackbox"],
  ["Ecosia (gpt-3.5-turbo)", "Ecosia"],
  ["Replicate (meta-llama-3-8b)", "ReplicateLlama3_8B"],
  ["Replicate (meta-llama-3-70b)", "ReplicateLlama3_70B"],
  ["Replicate (mixtral-8x7b)", "ReplicateMixtral_8x7B"],
  ["Google Gemini (requires API Key)", "GoogleGemini"],
  ["GPT4Free Local API", "G4FLocal"],
];

export const ChatProvidersReact = chat_providers.map((x) => {
  return <Form.Dropdown.Item title={x[0]} value={x[1]} key={x[1]} />;
});

/// Providers that support file uploads
export const file_supported_providers = [GeminiProvider];

/// Providers that support function calling
export const function_supported_providers = [DeepInfraProvider];

// Additional options
export const provider_options = (provider, chatOptions = null) => {
  let options = {};
  if (chatOptions?.creativity) {
    let temperature = parseFloat(chatOptions.creativity);
    if (temperature >= 0.6 && getPreferenceValues()["webSearch"]) {
      temperature -= 0.2; // reduce temperature if web search is enabled

      // note that in the future when we implement web search in more places, all this logic needs to be replaced
      // with a more reliable detection mechanism as to whether we are actually using web search.
    }
    temperature = Math.max(0.0, temperature).toFixed(1);
    options.temperature = temperature;
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
