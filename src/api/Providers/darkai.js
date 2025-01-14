import fetch from "#root/src/api/fetch.js";

import { format_chat_to_prompt } from "../../classes/message.js";

const headers = {
  accept: "text/event-stream",
  "content-type": "application/json",
  origin: "https://www.aiuncensored.info",
  referer: "https://www.aiuncensored.info/",
  "user-agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Safari/537.36",
};

const api_url = "https://darkai.foundation/chat";

export const DarkAIProvider = {
  name: "DarkAI",
  models: [{ model: "gpt-4o", stream: true }],
  generate: async function* (chat, options) {
    chat.unshift({
      role: "system",
      content:
        "You are ChatGPT, a large language model trained by OpenAI, based on the GPT-4 architecture. You are a helpful assistant. You are now being connected with a human.",
    });
    const prompt = format_chat_to_prompt(chat);

    const data = {
      query: prompt,
      model: options.model,
    };

    const response = await fetch(api_url, {
      method: "POST",
      headers: headers,
      body: JSON.stringify(data),
    });

    const reader = response.body;

    let prevChunks = "";

    for await (let str of reader) {
      let lines = str.toString().replace(/\r/g, "\n").split("\n");
      for (let line of lines) {
        line = line.trim();
        if (!line) continue;

        const isData = line.startsWith("data: ");
        if (isData || prevChunks) {
          if (!isData) {
            // Incomplete chunk, we try to append it to the previous one and process it
            line = prevChunks + line;
          }

          try {
            let data = JSON.parse(line.slice(6));
            if (data["event"] === "text-chunk") {
              let chunk = data["data"]["text"];
              if (chunk) {
                yield chunk;
              }
            } else if (data["event"] === "stream-end") {
              return;
            }

            prevChunks = ""; // reset
          } catch {
            // either the chunk begins with "data: ", or it's a part of an incomplete chunk
            // in both cases the following assignment will build the incomplete chunk
            // (since we already appended the line to prevChunks if it's the second case)
            prevChunks = line;
          }
        }
      }
    }
  },
};
