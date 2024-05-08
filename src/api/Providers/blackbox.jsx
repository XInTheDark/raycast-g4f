export const BlackboxProvider = "BlackboxProvider";
import fetch from "node-fetch-polyfill";
import { token_hex, uuid4 } from "../helper";

// Implementation ported from gpt4free Blackbox provider.

const api_url = "https://www.blackbox.ai/api/chat";
const headers = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
  Accept: "*/*",
  "Accept-Language": "en-US,en;q=0.5",
  "Accept-Encoding": "gzip, deflate, br",
  Referer: "https://www.blackbox.ai",
  "Content-Type": "application/json",
  Origin: "https://www.blackbox.ai",
  DNT: "1",
  "Sec-GPC": "1",
  "Alt-Used": "www.blackbox.ai",
  Connection: "keep-alive",
};

export const getBlackboxResponse = async function* (chat, max_retries = 5) {
  let random_id = token_hex(16);
  let random_user_id = uuid4();

  let data = {
    messages: chat,
    id: random_id,
    userId: random_user_id,
    codeModelMode: true,
    agentMode: {},
    trendingAgentMode: {},
    isMicMode: false,
    isChromeExt: false,
    playgroundMode: false,
    webSearchMode: true,
    userSystemPrompt: "",
    githubToken: null,
  };

  try {
    // POST
    const response = await fetch(api_url, {
      method: "POST",
      headers: headers,
      body: JSON.stringify(data),
    });

    let reader = response.body.getReader();
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      let chunk = new TextDecoder().decode(value);
      if (chunk) {
        yield chunk;
      }
    }
  } catch (e) {
    if (max_retries > 0) {
      console.log(e, "Retrying...");
      yield* getBlackboxResponse(chat, max_retries - 1);
    } else {
      throw e;
    }
  }
};
