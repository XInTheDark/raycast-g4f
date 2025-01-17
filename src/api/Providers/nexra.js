import fetch from "#root/src/api/fetch.js";
import { format_chat_to_prompt, messages_to_json } from "../../classes/message.js";
import { sleep } from "#root/src/helpers/helper.js";

// Reference: https://nexra.aryahcr.cc/documentation/chatgpt/en (under ChatGPT v2)
const api_url_stream = "https://nexra.aryahcr.cc/api/chat/complements";
const api_url_no_stream = "https://nexra.aryahcr.cc/api/chat/gpt";
const api_url_no_stream2 = "https://nexra.aryahcr.cc/api/chat/task";
const headers = {
  "Content-Type": "application/json",
};

export const NexraProvider = {
  name: "Nexra",
  customStream: true,
  models: [
    { model: "chatgpt", stream: true },
    { model: "gpt-4o", stream: true },
    { model: "gpt-4-32k", stream: false },
    { model: "Bing", stream: true },
    { model: "llama-3.1", stream: true },
    { model: "gemini-pro", stream: true },
  ],
  model_aliases: {
    "llama-3.1-70b": "llama-3.1",
    "gpt-4": "gpt-4-32k",
  },

  generate: async (chat, options, { stream_update }) => {
    if (options.stream) {
      return getNexraResponseStream(chat, options, stream_update);
    } else {
      return await getNexraResponseNoStream(chat, options);
    }
  },
};

export const getNexraResponseStream = async function (chat, options, stream_update, max_retries = 2) {
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
        if (chunk) {
          // note that the chunk from the API is the full response, not incremental updates!
          stream_update(chunk);
        }
        if (chunkJson["finish"]) break;
      }
    }
  } catch (e) {
    if (max_retries > 0) {
      console.log(e, "Retrying...");
      return await getNexraResponseStream(chat, options, stream_update, max_retries - 1);
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
  const id = json.id;
  if (!id) {
    throw new Error(`No ID returned: ${json}`);
  }

  let url = `${api_url_no_stream2}/${encodeURIComponent(id)}`;
  let ready = false;
  let result2 = null;
  let i = 0;

  while (!ready && i < 60) {
    const response2 = await fetch(url, {
      method: "GET",
      headers: headers,
    });
    result2 = await response2.json();

    if (result2?.gpt && result2?.gpt?.length > 0) {
      break;
    }

    switch (result2?.status) {
      case "pending":
        await sleep(500);
        break;
      case "error":
        throw new Error(`Error: ${result2}`);
      case "not_found":
        throw new Error(`Error: Not found: ${result2}`);
      case "completed":
        ready = true;
        break;
    }

    i++;
  }

  if (!result2?.gpt) {
    throw new Error(`No response returned`);
  } else {
    return result2.gpt;
  }
};
