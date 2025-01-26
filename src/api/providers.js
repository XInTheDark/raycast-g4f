/// This module unifies all available providers.
/// It exports functions to communicate directly with each provider, as well as predefined info for each provider.
/// (Note: the actual constants are in providers_info.js)
/// Any function that needs to interact with a provider must import this module, directly or indirectly.

import { Preferences } from "./preferences.js";

import { providers_info } from "./data/providers_info.js";
export * from "./data/providers_info.js";

// Additional options
export const additional_provider_options = (provider, chatOptions = null) => {
  let options = {};
  if (chatOptions?.creativity) {
    let temperature = Number(chatOptions.creativity);
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
  const defaultProvider = Preferences["defaultProvider"];
  // make sure the default provider is valid
  return providers_info[defaultProvider] ? defaultProvider : Object.keys(providers_info)[0];
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
  // we delete the provider key since it's not an option
  return {
    ...(info || {}),
    ...(chatOptions || {}),
    ...additional_provider_options(info?.provider, chatOptions),
    provider: undefined,
  };
};

// Get provider info from alias
export const get_provider_info_from_alias = (provider, alias) => {
  const model = provider.model_aliases?.[alias] || alias;
  const modelInfo = provider.models.find((x) => x.model === model);
  if (!modelInfo) {
    throw new Error(`Model not found: ${alias}`);
  }
  return { ...modelInfo, provider };
};
