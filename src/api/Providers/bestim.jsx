export const BestIMProvider = "BestIMProvider";

import fetch from "node-fetch";
import { format_chat_to_prompt } from "../../classes/message";

const api_url = "https://ai-chats.org/chat/send2/";
const headers = {
  Host: "ai-chats.org",
  "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:129.0) Gecko/20100101 Firefox/129.0",
  Accept: "application/json, text/event-stream",
  "Accept-Language": "en-US,en;q=0.5",
  "Accept-Encoding": "gzip, deflate, br, zstd",
  Referer: "https://ai-chats.org/chat/",
  "content-type": "application/json",
  Origin: "https://ai-chats.org",
  DNT: "1",
  "Sec-GPC": "1",
  "Alt-Used": "ai-chats.org",
  Connection: "keep-alive",
  "Sec-Fetch-Dest": "empty",
  "Sec-Fetch-Mode": "cors",
  "Sec-Fetch-Site": "same-origin",
  Priority: "u=0",
  TE: "trailers",
};

export const getBestIMResponse = async function* (chat) {
  const payload = {
    type: "chat",
    messagesHistory: [
      {
        content: format_chat_to_prompt(chat),
        from: "you",
      },
    ],
  };
  const response = await fetch(api_url, {
    method: "POST",
    headers: headers,
    body: JSON.stringify(payload),
  });

  const reader = response.body;
  for await (let chunk of reader) {
    const str = chunk.toString();
    let lines = str.split("\n");

    for (let i = 0; i < lines.length; i++) {
      let line = lines[i];
      if (line.startsWith("data: ")) {
        let chunk = line.substring(6);
        yield chunk;
      }
    }
  }
};
