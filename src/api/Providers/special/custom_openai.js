import { messages_to_json } from "../../../classes/message.js";
import fetch from "#root/src/api/fetch.js";

const getHeaders = (apiKey) => {
  return {
    "Content-Type": "application/json",
    Accept: "*/*",
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
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    let { url, model, apiKey, config: reqConfig, ...reqBody } = options;

    // raycast-g4f exclusive implementation.
    // TODO: merge this into options.config
    let apiData = {};
    try {
      const { getCustomAPIInfo } = await import("#root/src/api/providers_custom.js");
      apiData = await getCustomAPIInfo(url);
      // eslint-disable-next-line no-empty
    } catch {}

    // Initialize
    const api_url = url.endsWith("/chat/completions") ? url : url + "/chat/completions";
    apiKey = apiKey || apiData.apiKey;
    // The order for applying configs: reqBody -> apiData.config -> reqConfig
    const config = { ...reqBody, ...apiData.config, ...reqConfig };

    chat = messages_to_json(chat);

    let headers = {
      ...getHeaders(apiKey),
      ...config?.HEADERS,
    };

    delete config.HEADERS;

    // Prepare the request body
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
        headers: headers,
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
