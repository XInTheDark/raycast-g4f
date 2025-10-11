import { messages_to_json } from "../../../classes/message.js";
import fetch from "#root/src/api/fetch.js";

const getHeaders = (apiKey, type) => {
  let authHeaders = {};
  switch (type) {
    case "Anthropic": {
      authHeaders = {
        "x-api-key": apiKey ? apiKey : undefined,
        "anthropic-version": "2023-06-01",
      };
      break;
    }
    case "OpenAI":
    default: {
      authHeaders = {
        Authorization: apiKey ? `Bearer ${apiKey}` : undefined,
      };
      break;
    }
  }

  return {
    "Content-Type": "application/json",
    Accept: "*/*",
    ...authHeaders,
  };
};

export const getModels = async (url, apiKey, type) => {
  url = url + "/models";
  const response = await fetch(url, {
    method: "GET",
    headers: getHeaders(apiKey, type),
  });
  const data = (await response.json()).data;
  const res = data.map((x) => x.id || x.modelId || null).filter((x) => x !== null);
  return res;
};

export const getChatCompletionsURL = (url, type) => {
  const suffix = (() => {
    switch (type) {
      case "OpenAI":
      default:
        return "/chat/completions";
      case "Anthropic":
        return "/messages";
    }
  })();
  return url.endsWith(suffix) ? url : url + suffix;
};

export const CustomOpenAIProvider = {
  name: "CustomOpenAI",
  isCustom: true,
  info: {
    type: "OpenAI",
  },
  generate: async function* (chat, options) {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    let { url, model, apiKey, config: reqConfig, ...reqBody } = options;

    // raycast-g4f exclusive implementation.
    // TODO: merge this into options.config
    let apiData = {};
    try {
      const { getCustomAPIInfo } = await import("#root/src/api/providers_custom.js");
      apiData = await getCustomAPIInfo(url);
      this.info.type = this.info.type ?? apiData.type;
      // eslint-disable-next-line no-empty
    } catch {}

    // Initialize
    const api_url = getChatCompletionsURL(url, this.info?.type);

    apiKey = apiKey || apiData.apiKey;
    // The order for applying configs: reqBody -> apiData.config -> apiData.models_config -> reqConfig
    const config = { ...reqBody, ...apiData.config, ...apiData.models_config?.[model], ...reqConfig };

    chat = messages_to_json(chat);

    let headers = {
      ...getHeaders(apiKey, this.info?.type),
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

    if (!response.ok) {
      const errorText = await response.text();
      yield `Error: ${response.status} ${response.statusText}\n${errorText}`;
      return;
    }

    const reader = response.body;
    let buffer = "";

    const processBuffer = (buffer) => {
      const lines = buffer.split("\n");
      const leftover = lines.pop();
      const chunks = [];

      for (let raw of lines) {
        let line = raw.trim();
        if (line.startsWith("data: ")) {
          line = line.slice(6);
        }
        if (!line || line === "[DONE]") continue;
        try {
          const json = JSON.parse(line);
          const chunk = this.getChunk(json);
          if (chunk) chunks.push(chunk);
        } catch (e) {
          console.log("parse error:", e);
        }
      }

      return { leftover, chunks };
    };

    // stream loop
    for await (const part of reader) {
      buffer += part.toString();
      const { leftover, chunks } = processBuffer(buffer);
      buffer = leftover;
      for (const c of chunks) yield c;
    }

    // final leftover
    const { chunks } = processBuffer(buffer);
    for (const c of chunks) yield c;
  },
  getChunk: function (json) {
    switch (this.info?.type) {
      case "Anthropic": {
        let chunk = "";
        if (json["delta"]["thinking"]) {
          if (!this.isThinking) {
            this.isThinking = true;
            chunk += "\n<thinking>\n";
          }
          chunk += json["delta"]["thinking"];
        }
        if (json["delta"]["text"]) {
          if (this.isThinking) {
            this.isThinking = false;
            chunk += "\n</thinking>\n\n";
          }
          chunk += json["delta"]["text"];
        }
        return chunk;
      }
      case "OpenAI":
      default: {
        let chunk = json["choices"][0]["delta"] ?? json["choices"][0]["message"];
        chunk = chunk?.content;
        return chunk;
      }
    }
  },
};
