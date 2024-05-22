export const NexraProvider = "NexraProvider";
import fetch from "node-fetch-polyfill";

import { removePrefix } from "../helper";

// Reference: https://nexra.aryahcr.cc/documentation/chatgpt/en (under ChatGPT v2)
const api_url = "https://nexra.aryahcr.cc/api/chat/complements";
const headers = {
  "Content-Type": "application/json",
};

export const getNexraResponse = async function* (chat, options, max_retries = 5) {
  let data = {
    messages: chat,
    stream: true,
    markdown: false,
    model: options.model,
  };

  try {
    // POST
    const response = await fetch(api_url, {
      method: "POST",
      headers: headers,
      body: JSON.stringify(data),
    });

    const reader = response.body.getReader();
    let decoder = new TextDecoder();

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      let chunkStr = decoder.decode(value);
      if (!chunkStr) continue;

      // special fix because "\^^" is somehow added at the end of the chunk
      // and it is apparently a single character with unicode value 30.
      let arr = chunkStr.split(String.fromCharCode(30));

      for (const _chunk of arr) {
        console.log(_chunk);
        let chunkJson;
        try {
          chunkJson = JSON.parse(_chunk);
        } catch (e) {
          // maybe the chunk is incomplete
          break; // this goes on to next iteration of while loop
        }

        if (chunkJson["finish"]) break;
        // if (chunkJson["error"]) throw new Error();

        let chunk = chunkJson["message"];
        yield chunk; // note that this is the full response, not just incremental updates!
      }
    }
  } catch (e) {
    if (max_retries > 0) {
      console.log(e, "Retrying...");
      yield* getNexraResponse(chat, options, max_retries - 1);
    } else {
      throw e;
    }
  }
};
