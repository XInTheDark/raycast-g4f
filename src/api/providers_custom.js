import { removePrefix } from "#root/src/helpers/helper.js";
import { Storage } from "#root/src/api/storage.js";

import { providers_info } from "#root/src/api/data/providers_info.js";
import { chat_providers_names } from "#root/src/api/data/providers_react.jsx";

import { CustomOpenAIProvider } from "#root/src/api/Providers/special/custom_openai.js";

const customAPIsStorageKey = "customAPIs";
export const getCustomAPIInfo = async (url) => {
  const data = JSON.parse(await Storage.read(customAPIsStorageKey, "{}")) || {};
  if (url) return data[url];
  return data;
};
export const updateCustomAPIInfo = async (data) => {
  await Storage.write(customAPIsStorageKey, JSON.stringify(data));
};

export const getChatName = (api) => {
  return api.name || api.url;
};

export const customAPItoKey = (api, model) => {
  // Notice that we only need to use the url and model to uniquely identify a custom API entry.
  // We then later fetch the API data in the provider itself, using the url as the key.
  const data = { url: api.url, model: model };
  return "customOpenAI:" + JSON.stringify(data);
};
export const isCustomAPI = (key) => {
  return key.startsWith("customOpenAI:");
};
export const keyToCustomAPI = (key) => {
  return JSON.parse(removePrefix(key, "customOpenAI:"));
};

// Initialize custom APIs
// Each custom API entry uses the CustomOpenAIProvider and is identified by the url and model.
export const initCustomAPIs = async () => {
  const customAPIData = await getCustomAPIInfo();
  for (let [url, api] of Object.entries(customAPIData)) {
    const models = api?.models ?? [];
    for (let model of models) {
      const key = customAPItoKey(api, model);
      providers_info[key] = { provider: CustomOpenAIProvider, url: url, model: model, stream: true };
      chat_providers_names[key] = `${getChatName(api)} (${model})`;
    }
  }
};
