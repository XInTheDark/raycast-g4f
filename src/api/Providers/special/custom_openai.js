import { messages_to_json } from "../../../classes/message.js";
import fetch from "#root/src/api/fetch.js";

const getHeaders = (apiKey) => {
  return {
    "Content-Type": "application/json",
    Authorization: apiKey ? `Bearer ${apiKey}` : undefined,
  };
};

export const getOpenAIModels = async (url, apiKey) => {
  url = url + "/models";
  const response = await fetch(url, {
    method: "GET",
    headers: getHeaders(apiKey),
  });
  const data = (await response.json()).data;
  const res = data.map((x) => x.id || x.modelId || null).filter((x) => x !== null);
  return res;
};

export const CustomOpenAIProvider = {
  name: "CustomOpenAI",
  isCustom: true,
  generate: async function* (chat, options) {
    const url = options.url;

    let apiData = {};
    try {
      const { getCustomAPIInfo } = await import("#root/src/api/providers_custom.js");
      apiData = await getCustomAPIInfo(url);
      // eslint-disable-next-line no-empty
    } catch {}

    const api_url = url + "/chat/completions";
    const model = options.model;
    const api_key = options.apiKey || apiData.apiKey;
    const config = apiData.config || {};

    chat = messages_to_json(chat);
    let body = {
      messages: chat,
      stream: true,
      model: model,
      ...config,
    };

    let response = await fetch(
      api_url,
      {
        method: "POST",
        headers: getHeaders(api_key),
        body: JSON.stringify(body),
      },
      { timeout: 0 } // disable timeout
    );

    const reader = response.body;

    for await (let chunk of reader) {
      const str = chunk.toString();
      let lines = str.split("\n");

      for (let line of lines) {
        // Although this is not technically OpenAI compatible, we handle the
        // APIs that return chunks starting with "data: " as well.
        if (line.startsWith("data: ")) {
          line = line.substring(6);
        }
        if (!line) continue;
        if (line.slice(0, 6) === "[DONE]") return;

        try {
          let json = JSON.parse(line);
          let chunk = json["choices"][0]["delta"] ?? json["choices"][0]["message"];
          chunk = chunk?.content;
          if (chunk) {
            yield chunk;
          }
        } catch (e) {
          console.log(e);
        }
      }
    }
  },
};
