/// Special providers that require the jsx extension, as well as some Raycast API components.

import { G4FLocalProvider } from "./Providers/special/g4f_local.jsx";
import { OllamaLocalProvider } from "./Providers/special/ollama_local.jsx";
import { CustomOpenAIProvider } from "./Providers/special/custom_openai.jsx";

export const special_providers_info = {
  G4FLocal: { provider: G4FLocalProvider, stream: true },
  OllamaLocal: { provider: OllamaLocalProvider, stream: true },
  CustomOpenAI: { provider: CustomOpenAIProvider, stream: true },
};
