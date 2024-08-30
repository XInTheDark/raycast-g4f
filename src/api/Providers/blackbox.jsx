import fetch from "node-fetch";
import { messages_to_json } from "../../classes/message";
import { randomBytes, randomUUID } from "crypto";

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

const token_hex = function (nbytes) {
  // python: binascii.hexlify(token_bytes(nbytes)).decode('ascii')
  return randomBytes(nbytes).toString("hex");
};

const uuid4 = function () {
  // python: str(uuid.uuid4())
  return randomUUID();
};

export const BlackboxProvider = {
  name: "Blackbox",
  generate: async function* (chat, options, { max_retries = 5 }) {
    let random_id = token_hex(16);
    let random_user_id = uuid4();
    chat = messages_to_json(chat);

    let data = {
      messages: chat,
      id: random_id,
      userId: random_user_id,
      previewToken: null,
      codeModelMode: true,
      agentMode: {},
      trendingAgentMode: {},
      isMicMode: false,
      isChromeExt: false,
      githubToken: null,
      webSearchMode: true,
      userSystemPrompt: "",
      mobileClient: false,
      maxTokens: 4096,
    };

    try {
      // POST
      const response = await fetch(api_url, {
        method: "POST",
        headers: headers,
        body: JSON.stringify(data),
      });

      const reader = response.body;
      let search_results = false;
      let text = "";
      for await (let chunk of reader) {
        chunk = chunk.toString();

        if (chunk) {
          if (!search_results && chunk.includes("$~~~$")) {
            search_results = true;
          }
          text += chunk;
          yield chunk;
        }
      }

      // Update 29/8/24: if search results are present, the response is only generated
      // a little bit. then we need to add "mode": "continue" to the data and send another
      // request to get the rest of the response.
      if (search_results) {
        data.mode = "continue";
        data.messages.push({ content: text, role: "assistant" });

        yield " ";

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
