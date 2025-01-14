import fetch from "#root/src/api/fetch.js";
import { messages_to_json } from "#root/src/classes/message.js";

const api_url = "https://api.openai.com/v1/chat/completions";
let headers = {
  "Content-Type": "application/json",
};

export const OpenAIProvider = {
  name: "OpenAI",
  authRequired: true,
  enabled: false,
  models: [{ model: "gpt-4o", stream: true, api_key: null }],
  generate: async function* (chat, options, { max_retries = 2 }) {
    let data = {
      model: options.model,
      messages: messages_to_json(chat),
      temperature: options.temperature,
      stream: true,
    };

    const api_key = options.api_key || process.env.OPENAI_API_KEY;
    headers = {
      ...headers,
      Authorization: `Bearer ${api_key}`,
    };

    try {
      const response = await fetch(api_url, {
        method: "POST",
        headers: headers,
        body: JSON.stringify(data),
      });

      const reader = response.body;
      for await (let chunk of reader) {
        chunk = chunk.toString();
        if (chunk) {
          yield chunk;
        }
      }
    } catch (e) {
      if (max_retries > 0) {
        console.log(e, "Retrying...");
        yield* this.generate(chat, options, { max_retries: max_retries - 1 });
      } else {
        throw e;
      }
    }
  },
};
