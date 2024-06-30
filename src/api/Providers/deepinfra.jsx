export const DeepInfraProvider = "DeepInfraProvider";
import fetch from "node-fetch";
import { messages_to_json } from "../../classes/message";

// Implementation ported from gpt4free DeepInfra provider.

const api_url = "https://api.deepinfra.com/v1/openai/chat/completions";
const headers = {
  Accept: "text/event-stream",
  "Accept-Encoding": "gzip, deflate, br",
  "Accept-Language": "en-US",
  "Content-Type": "application/json",
  Connection: "keep-alive",
  Origin: "https://deepinfra.com",
  Referer: "https://deepinfra.com/",
  "Sec-Fetch-Dest": "empty",
  "Sec-Fetch-Mode": "cors",
  "Sec-Fetch-Site": "same-site",
  "User-Agent":
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36",
  "X-Deepinfra-Source": "web-embed",
  "sec-ch-ua": '"Google Chrome";v="119", "Chromium";v="119", "Not?A_Brand";v="24"',
  "sec-ch-ua-mobile": "?0",
  "sec-ch-ua-platform": '"macOS"',
};

export const getDeepInfraResponse = async function* (chat, options, max_retries = 5) {
  const model = options.model;
  chat = messages_to_json(chat);
  let data = {
    model: model,
    messages: chat,
    temperature: options.temperature ?? 0.7,
    max_tokens: 100000,
    stream: true,
    headers: headers,
    ...(model_options[model] ?? {}),
  };

  try {
    // POST
    const response = await fetch(api_url, {
      method: "POST",
      headers: headers,
      body: JSON.stringify(data),
    });

    // Implementation taken from gpt4free: g4f/Provider/needs_auth/Openai.py at async def create_async_generator()
    let first = true;
    const reader = response.body;
    for await (let chunk of reader) {
      const str = chunk.toString();
      let lines = str.split("\n");

      for (let i = 0; i < lines.length; i++) {
        let line = lines[i];
        if (line.startsWith("data: ")) {
          let chunk = line.substring(6);
          if (chunk.trim() === "[DONE]") return; // trim() is important

          try {
            let data = JSON.parse(chunk);
            let delta = data["choices"][0]["delta"]["content"];
            if (first) {
              delta = delta.trimStart();
            }
            if (delta) {
              first = false;
              yield delta;
            }
          } catch (e) {} // eslint-disable-line
        }
      }
    }
  } catch (e) {
    if (max_retries > 0) {
      console.log(e, "Retrying...");
      yield* getDeepInfraResponse(chat, options, max_retries - 1);
    } else {
      throw e;
    }
  }
};

const model_options = {
  "Qwen/Qwen2-72B-Instruct": { repetition_penalty: 1.2 },
};
