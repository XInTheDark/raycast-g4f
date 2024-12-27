import { messages_to_json } from "../../../classes/message.js";
import fetch from "#root/src/api/fetch.js";

import { getCustomAPIInfo } from "#root/src/api/providers_custom.js";

export const getOpenAIModels = async (url, apiKey) => {
  url = url + "/models";
  const response = await fetch(url, {
    method: "GET",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
  });
  const data = (await response.json()).data;
  const res = data.map((x) => x.id);
  return res;
};

export const CustomOpenAIProvider = {
  name: "CustomOpenAI",
  generate: async function* (chat, options) {
    const url = options.url;
    const apiData = await getCustomAPIInfo(url);
    if (!apiData) {
      throw new Error("No data found for Custom OpenAI API");
    }

    const api_url = url + "/chat/completions";
    const model = options.model;
    const api_key = apiData.apiKey;
    const config = apiData.config;

    let headers = {
      "Content-Type": "application/json",
      Authorization: api_key ? `Bearer ${api_key}` : undefined,
    };

    chat = messages_to_json(chat);
    let body = {
      messages: chat,
      stream: true,
      model: model,
      ...config,
    };

    let response = await fetch(api_url, {
      method: "POST",
      headers: headers,
      body: JSON.stringify(body),
    });

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
