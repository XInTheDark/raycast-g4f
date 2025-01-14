import fetch from "#root/src/api/fetch.js";

import { format_chat_to_prompt } from "../../classes/message.js";

const headers = {
  accept: "*/*",
  "accept-language": "en-US,en;q=0.9",
  "cache-control": "no-cache",
  "content-type": "application/json",
  origin: "https://www.ai4chat.co",
  pragma: "no-cache",
  priority: "u=1, i",
  referer: "https://www.ai4chat.co/gpt/talkdirtytome",
  "sec-ch-ua": '"Chromium";v="129", "Not=A?Brand";v="8"',
  "sec-ch-ua-mobile": "?0",
  "sec-ch-ua-platform": '"Linux"',
  "sec-fetch-dest": "empty",
  "sec-fetch-mode": "cors",
  "sec-fetch-site": "same-origin",
  "user-agent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36",
};

const api_url = "https://www.ai4chat.co/generate-response";

export const AI4ChatProvider = {
  name: "Ai4Chat",
  models: [{ model: "gpt-4o", stream: false, context_tokens: 4096 }],
  generate: async function (chat) {
    const payload = {
      messages: [{ role: "user", content: format_chat_to_prompt(chat) }],
    };

    let response = await fetch(api_url, {
      method: "POST",
      headers: headers,
      body: JSON.stringify(payload),
    });

    const result = await response.text();
    const json_result = JSON.parse(result);
    const message = json_result.message || "";
    const clean_message = message.replace(/<[^>]+>/g, "");

    return clean_message;
  },
};
