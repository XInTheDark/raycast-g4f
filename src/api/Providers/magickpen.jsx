export const MagickPenProvider = "MagickPenProvider";

import fetch from "node-fetch";
import { messages_to_json } from "../../classes/message";

const api_url = "https://api.magickpen.com/chat/free";

const headers = {
  accept: "application/json, text/plain, */*",
  "accept-language": "en-US,en;q=0.9",
  "access-control-allow-origin": "*",
  "content-type": "application/json",
  dnt: "1",
  origin: "https://magickpen.com",
  priority: "u=1, i",
  referer: "https://magickpen.com/",
  "sec-ch-ua": '"Not/A)Brand";v="8", "Chromium";v="126"',
  "sec-ch-ua-mobile": "?0",
  "sec-ch-ua-platform": '"Linux"',
  "sec-fetch-dest": "empty",
  "sec-fetch-mode": "cors",
  "sec-fetch-site": "same-site",
  "user-agent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36",
};

export const getMagickPenResponse = async function* (chat, options, max_retries = 3) {
  chat = messages_to_json(chat);
  let data = {
    history: chat,
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
      yield* getMagickPenResponse(chat, options, max_retries - 1);
    } else {
      throw e;
    }
  }
};
