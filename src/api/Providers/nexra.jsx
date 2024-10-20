import fetch from "node-fetch";
import { format_chat_to_prompt, messages_to_json } from "../../classes/message";

// Reference: https://nexra.aryahcr.cc/documentation/chatgpt/en (under ChatGPT v2)
const api_url_stream = "https://nexra.aryahcr.cc/api/chat/complements";
const api_url_no_stream = "https://nexra.aryahcr.cc/api/chat/gpt";
const headers = {
  "Content-Type": "application/json",
};

export const NexraProvider = {
  name: "Nexra",
  generate: async (chat, options) => {
    if (options.stream) {
      return getNexraResponseStream(chat, options);
    } else {
      return await getNexraResponseNoStream(chat, options);
    }
  },
};

export const getNexraResponseStream = async function* (chat, options, max_retries = 5) {
  if (["Bing"].includes(options.model)) {
    chat = [{ role: "user", content: format_chat_to_prompt(chat) }];
  } else {
    chat = messages_to_json(chat);
  }

  let data = {
    messages: chat,
    stream: true,
    markdown: false,
    model: options.model,
  };

  try {
    // POST
    const response = await fetch(api_url_stream, {
      method: "POST",
      headers: headers,
      body: JSON.stringify(data),
    });

    const reader = response.body;

    for await (let chunk of reader) {
      let chunkStr = chunk.toString();
      if (!chunkStr) continue;

      // special fix because "\^^" is somehow added at the end of the chunk
      // and it is apparently a single character with unicode value 30.
      let arr = chunkStr.split(String.fromCharCode(30));

      for (const _chunk of arr) {
        let chunkJson;
        try {
          chunkJson = JSON.parse(_chunk);
        } catch (e) {
          // maybe the chunk is incomplete
          break; // this goes on to next iteration of while loop
        }

        // if (chunkJson["error"]) throw new Error();

        let chunk = chunkJson["message"];
        if (chunk) yield chunk; // note that this is the full response, not just incremental updates!
        if (chunkJson["finish"]) break;
      }
    }
  } catch (e) {
    if (max_retries > 0) {
      console.log(e, "Retrying...");
      yield* getNexraResponseStream(chat, options, max_retries - 1);
    } else {
      throw e;
    }
  }
};

export const getNexraResponseNoStream = async (chat, options) => {
  chat = messages_to_json(chat);
  let data = {
    messages: chat,
    stream: false,
    markdown: false,
    model: options.model,
  };

  // POST
  const response = await fetch(api_url_no_stream, {
    method: "POST",
    headers: headers,
    body: JSON.stringify(data),
  });

  const json = await response.json();
  return json["gpt"];
};
