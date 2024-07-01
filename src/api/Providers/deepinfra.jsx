import { getPreferenceValues } from "@raycast/api";

export const DeepInfraProvider = "DeepInfraProvider";
import fetch from "node-fetch";
import { messages_to_json } from "../../classes/message";
import { getWebResult, webSearchTool, webSystemPrompt_ChatGPT } from "../web";

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

// Models that support function calling
const function_supported_models = ["mistralai/Mixtral-8x22B-Instruct-v0.1", "Qwen/Qwen2-72B-Instruct"];

export const getDeepInfraResponse = async function* (chat, options, max_retries = 5) {
  const model = options.model;
  chat = messages_to_json(chat);

  const useWebSearch = getPreferenceValues()["webSearch"] && function_supported_models.includes(model);
  const tools = useWebSearch ? [webSearchTool] : null;

  // system prompt
  if (useWebSearch) {
    chat.unshift({
      role: "system",
      content: webSystemPrompt_ChatGPT,
    });
  }

  let data = {
    model: model,
    messages: chat,
    tools: tools,
    temperature: options.temperature ?? 0.7,
    max_tokens: 100000,
    stream: true,
    headers: headers,
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
    // Function calling
    let web_search_call = {
      name: null,
      query: "",
    };

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
            let delta = data["choices"][0]["delta"];

            // Function calling
            if (delta["tool_calls"]) {
              web_search_call.name = delta["tool_calls"][0]["function"]["name"];
              let args = JSON.parse(delta["tool_calls"][0]["function"]["arguments"]);
              web_search_call.query = args["query"];
              let call_id = delta["tool_calls"][0]["id"];

              let webResponse = await getWebResult(web_search_call.query, { mode: "advanced" });
              let msg = {
                role: "tool",
                content: webResponse,
                tool_call_id: call_id,
              };
              chat.push(msg);

              // Notice how the message is only temporarily added to the chat object,
              // and thus the web search results are not saved in the chat object.
              // This is due to difficulty of implementation in the current code base.
              // TODO: rewrite codebase so this is possible!

              // generate a new request
              yield* getDeepInfraResponse(chat, options, max_retries);
              return;
            }

            let content = delta["content"];
            if (first) {
              content = content.trimStart();
            }
            if (content) {
              first = false;
              yield content;
            }
          } catch (e) {
            console.log(e);
          }
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
