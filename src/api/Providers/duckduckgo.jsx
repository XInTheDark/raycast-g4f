export const DuckDuckGoProvider = "DuckDuckGoProvider";

import fetch from "node-fetch";
import { messages_to_json } from "../../classes/message";
import { Storage } from "../storage";

const status_url = "https://duckduckgo.com/duckchat/v1/status";
const chat_url = "https://duckduckgo.com/duckchat/v1/chat";
const referer = "https://duckduckgo.com/";
const origin = "https://duckduckgo.com";

const user_agent =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Safari/537.36";
const headers = {
  "User-Agent": user_agent,
  Accept: "text/event-stream",
  "Accept-Language": "en-US,en;q=0.5",
  "Accept-Encoding": "gzip, deflate, br, zstd",
  Referer: referer,
  "Content-Type": "application/json",
  Origin: origin,
  Connection: "keep-alive",
  Cookie: "dcm=3",
  "Sec-Fetch-Dest": "empty",
  "Sec-Fetch-Mode": "cors",
  "Sec-Fetch-Site": "same-origin",
  Pragma: "no-cache",
  TE: "trailers",
};

const get_vqd = async () => {
  const _headers = { ...headers, "x-vqd-accept": "1" };
  const response = await fetch(status_url, { headers: _headers });

  let stored_vqd = false;
  let vqd_4 = response.headers.get("x-vqd-4");
  if (!vqd_4) {
    // try to get from storage
    vqd_4 = await Storage.read("duckduckgo_vqd");
    stored_vqd = true;
  }

  await Storage.write("duckduckgo_vqd", vqd_4);
  return [vqd_4, stored_vqd];
};

export const getDuckDuckGoResponse = async function* (chat, options, max_retries = 3) {
  chat = messages_to_json(chat);

  try {
    let vqd_4, stored_vqd;
    for (let _ = 0; _ < 3; _++) {
      try {
        [vqd_4, stored_vqd] = await get_vqd();
        break;
      } catch (e) {
        // sleep for a while before retrying
        await new Promise((r) => setTimeout(r, 1000));
      }
    }

    if (!vqd_4) {
      throw new Error("Failed to get vqd");
    }

    // if starting a new conversation, only use the last message
    let messages = stored_vqd ? chat : [chat[chat.length - 1]];

    let payload = {
      model: options.model,
      messages: messages,
    };

    let _headers = {
      ...headers,
      "x-vqd-4": vqd_4,
    };

    const response = await fetch(chat_url, {
      method: "POST",
      headers: _headers,
      body: JSON.stringify(payload),
    });

    const reader = await response.text();
    const reader_lines = reader.split("\n");
    for (let chunk of reader_lines) {
      const str = chunk.toString();
      let lines = str.split("\n");
      for (let line of lines) {
        if (line.startsWith("data: ")) {
          let chunk = line.substring(6);
          if (chunk.trim() === "[DONE]") return; // trim() is important

          try {
            let data = JSON.parse(chunk);
            let delta = data["message"];
            if (delta) {
              yield delta;
            }
          } catch (e) {} // eslint-disable-line
        }
      }
    }
  } catch (e) {
    if (max_retries > 0) {
      console.log(e, "Retrying...");
      yield* getDuckDuckGoResponse(chat, options, max_retries - 1);
    } else {
      throw e;
    }
  }
};
