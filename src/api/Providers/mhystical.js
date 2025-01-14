import fetch from "#root/src/api/fetch.js";
import { messages_to_json } from "#root/src/classes/message.js";

const api_url = "https://api.mhystical.cc/v1/completions";
const headers = {
  "x-api-key": "mhystical",
  "Content-Type": "application/json",
  accept: "*/*",
  "cache-control": "no-cache",
  origin: "https://api.mhystical.cc",
  referer: "https://api.mhystical.cc/",
  "user-agent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36",
};

export const MhysticalProvider = {
  name: "Mhystical",
  models: [{ model: "gpt-4", stream: false }],
  generate: async function (chat, options) {
    chat = messages_to_json(chat);
    const data = {
      model: options.model,
      messages: chat,
    };

    const response = await fetch(api_url, {
      method: "POST",
      headers: headers,
      body: JSON.stringify(data),
    });

    const json = await response.json();
    return json["choices"][0]["message"]["content"];
  },
};
