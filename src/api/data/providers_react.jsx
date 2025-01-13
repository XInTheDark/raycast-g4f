import { Form } from "@raycast/api";
import { useMemo } from "react";

import { isCustomAPI } from "../providers_custom.js";
import { providers_info } from "#root/src/api/data/providers_info.js";

// Initialize chat_providers_names
const chat_providers_names = {};
for (let [key, value] of Object.entries(providers_info)) {
  console.log(key, value);
  const provider = value.provider;
  chat_providers_names[key] = `${provider.name} (${value.alias || value.model})`;
}
export { chat_providers_names };

/// Chat providers (user-friendly names)
// fetched from package.json for consistency and to avoid duplicate code
export const chat_providers_names_unused = {
  NexraGPT4o: "Nexra (gpt-4o)",
  NexraGPT4: "Nexra (gpt-4-32k)",
  NexraChatGPT: "Nexra (chatgpt)",
  NexraBing: "Nexra (Bing)",
  NexraLlama31: "Nexra (llama-3.1)",
  NexraGeminiPro: "Nexra (gemini-1.0-pro)",
  DeepInfraLlama33_70B: "DeepInfra (meta-llama-3.3-70b)",
  DeepInfraLlama32_90B_Vision: "DeepInfra (meta-llama-3.2-90b-vision)",
  DeepInfraLlama32_11B_Vision: "DeepInfra (meta-llama-3.2-11b-vision)",
  DeepInfraLlama31_405B: "DeepInfra (meta-llama-3.1-405b)",
  DeepInfraLlama31_70B: "DeepInfra (meta-llama-3.1-70b)",
  DeepInfraLlama31_8B: "DeepInfra (meta-llama-3.1-8b)",
  DeepInfraLlama31Nemotron70B: "DeepInfra (llama-3.1-nemotron-70b)",
  DeepInfraWizardLM2_8x22B: "DeepInfra (WizardLM-2-8x22B)",
  DeepInfraDeepSeek25: "DeepInfra (DeepSeek-V2.5)",
  DeepInfraQwen25_72B: "DeepInfra (Qwen2.5-72B)",
  DeepInfraQwen25Coder_32B: "DeepInfra (Qwen2.5-Coder-32B)",
  DeepInfraQwQ_32B_Preview: "DeepInfra (QwQ-32B-Preview)",
  Blackbox: "Blackbox (custom-model)",
  BlackboxLlama31_405B: "Blackbox (llama-3.1-405b)",
  BlackboxLlama31_70B: "Blackbox (llama-3.1-70b)",
  BlackboxLlama33_70B: "Blackbox (llama-3.3-70b)",
  BlackboxGemini15Flash: "Blackbox (gemini-1.5-flash)",
  BlackboxQwQ32BPreview: "Blackbox (qwq-32b-preview)",
  BlackboxGPT4o: "Blackbox (gpt-4o)",
  BlackboxClaude35Sonnet: "Blackbox (claude-3.5-sonnet)",
  BlackboxGeminiPro: "Blackbox (gemini-pro)",
  DuckDuckGo_GPT4oMini: "DuckDuckGo (gpt-4o-mini)",
  DuckDuckGo_Claude3Haiku: "DuckDuckGo (claude-3-haiku)",
  DuckDuckGo_Llama31_70B: "DuckDuckGo (meta-llama-3.1-70b)",
  DuckDuckGo_Mixtral_8x7B: "DuckDuckGo (mixtral-8x7b)",
  BestIM_GPT4oMini: "BestIM (gpt-4o-mini)",
  RocksClaude35Sonnet: "Rocks (claude-3.5-sonnet)",
  RocksClaude3Opus: "Rocks (claude-3-opus)",
  RocksChatGPT4oLatest: "Rocks (chatgpt-4o-latest)",
  RocksGPT4o: "Rocks (gpt-4o)",
  RocksGPT4: "Rocks (gpt-4)",
  RocksWizardLM2_8x22B: "Rocks (WizardLM-2-8x22B)",
  RocksLlama31_405B: "Rocks (llama-3.1-405b)",
  RocksLlama31_70B: "Rocks (llama-3.1-70b)",
  ChatgptFree: "ChatgptFree (gpt-4o-mini)",
  AI4Chat: "AI4Chat (gpt-4)",
  DarkAI: "DarkAI (gpt-4o)",
  Mhystical: "Mhystical (gpt-4-32k)",
  PizzaGPT: "PizzaGPT (gpt-4o-mini)",
  MetaAI: "Meta AI (meta-llama-3.1)",
  ReplicateMixtral_8x7B: "Replicate (mixtral-8x7b)",
  ReplicateLlama31_405B: "Replicate (meta-llama-3.1-405b)",
  ReplicateLlama3_70B: "Replicate (meta-llama-3-70b)",
  ReplicateLlama3_8B: "Replicate (meta-llama-3-8b)",
  Phind: "Phind (Phind Instant)",
  GoogleGemini: "Google Gemini (requires API Key)",
  GoogleGeminiExperimental: "Google Gemini (Experimental) (requires API Key)",
  GoogleGeminiThinking: "Google Gemini (Thinking) (requires API Key)",
};

export const ChatProvidersReact = () => {
  return useMemo(() => {
    // Display custom APIs in a separate section for organization
    let providers = [],
      customProviders = [];
    for (let x of Object.entries(chat_providers_names)) {
      if (isCustomAPI(x[0])) {
        customProviders.push(x);
      } else {
        providers.push(x);
      }
    }

    return (
      <>
        {providers.map((x) => (
          <Form.Dropdown.Item title={x[1]} value={x[0]} key={x[0]} />
        ))}
        <Form.Dropdown.Section title="Custom APIs">
          {customProviders.map((x) => (
            <Form.Dropdown.Item title={x[1]} value={x[0]} key={x[0]} />
          ))}
        </Form.Dropdown.Section>
      </>
    );
  }, [chat_providers_names]);
};
