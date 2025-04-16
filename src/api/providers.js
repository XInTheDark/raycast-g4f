/// This module unifies all available providers.
/// It exports functions to communicate directly with each provider, as well as predefined info for each provider.
/// (Note: the actual constants are in providers_info.js)
/// Any function that needs to interact with a provider must import this module, directly or indirectly.

import { Preferences } from "./preferences.js";
import { updatePreferences } from "#root/src/helpers/preferences_helper.js";

import { providers, providers_info } from "./data/providers_info.js";
export * from "./data/providers_info.js";

// Initialise providers function
const providersInfoCacheTimeout = 1000 * 60 * 60 * 24;
export async function initProviders() {
  for (let provider of providers) {
    if (!provider) continue;
    if (provider.enabled === false) continue;

    let models = provider?.models || [];
    if (provider.getModels) {
      // Fetch from cache
      let cache = {};
      try {
        cache = JSON.parse(Preferences.providersInfoCache || "{}");
        if (cache?.[provider.name] && Date.now() - cache[provider.name]?.cacheTime < providersInfoCacheTimeout) {
          models = cache[provider.name].models;
        } else throw new Error("Cache expired");
      } catch (e) {
        try {
          models = await provider.getModels();
          console.log(`Fetched models for ${provider.name}:`, models);
          cache[provider.name] = {
            cacheTime: Date.now(),
            models: models,
          };
          await updatePreferences("providersInfoCache", JSON.stringify(cache));
        } catch (e) {
          console.error(`Error fetching models for ${provider.name}:`, e);
          continue;
        }
      }
    }
    for (let model of models) {
      const key = `${provider.name}_${model.alias || model.model}`;
      providers_info[key] = { provider: provider, ...model };
    }
  }
}

// Additional options
export const additional_provider_options = (provider, chatOptions = null) => {
  let options = {};
  if (chatOptions?.creativity) {
    let temperature = Number(chatOptions.creativity);
    temperature = Math.max(0.0, temperature);
    options.temperature = temperature;
  }
  return options;
};

// Utilities
export const get_provider_string = (providerString) => {
  let provider = providerString || Preferences["defaultProvider"];
  // make sure the return value is valid
  if (!providers_info[provider]) {
    throw new Error(`Invalid provider string: ${provider}`);
  }
  return provider;
};

// Get the default provider string. If the commandId is provided, it will be used to get the default provider for that command.
export const default_provider_string = (commandId) => {
  if (commandId && Preferences["commandOptions"]?.[commandId]?.commandProvider) {
    return get_provider_string(Preferences["commandOptions"][commandId].commandProvider);
  }
  return get_provider_string(Preferences["defaultProvider"]);
};

// Get provider info based on a provider STRING (i.e. the key in providers_info)
export const get_provider_info = (providerString) => {
  return providers_info[get_provider_string(providerString)];
};

// Get options from info
export const get_options_from_info = (info, chatOptions = {}) => {
  let o = {
    ...(info || {}),
    // ...(chatOptions || {}), // disabled since this is a bad way of passing options
    ...additional_provider_options(info?.provider, chatOptions),
  };
  // we delete the provider key since it's not an option
  delete o.provider;
  return o;
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
