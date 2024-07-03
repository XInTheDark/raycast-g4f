import { getPreferenceValues } from "@raycast/api";

export const DeepInfraProvider = "DeepInfraProvider";
import fetch from "node-fetch";
import { messages_to_json } from "../../classes/message";
import { getWebResult, webSearchTool, webSystemPrompt_ChatGPT } from "../tools/web";
import { codeInterpreterTool, codeInterpreterPrompt, runCode } from "../tools/code";

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
const function_supported_models = [
  "mistralai/Mixtral-8x22B-Instruct-v0.1",
  "mistralai/Mistral-7B-Instruct-v0.3",
  "Qwen/Qwen2-72B-Instruct",
  "meta-llama/Meta-Llama-3-8B-Instruct",
  "meta-llama/Meta-Llama-3-70B-Instruct",
];

export const getDeepInfraResponse = async function* (chat, options, max_retries = 5) {
  const model = options.model;
  chat = messages_to_json(chat);

  const useWebSearch = getPreferenceValues()["webSearch"] && function_supported_models.includes(model);
  const useCodeInterpreter = getPreferenceValues()["codeInterpreter"] && function_supported_models.includes(model);
  const tools = [...(useWebSearch ? [webSearchTool] : []), ...(useCodeInterpreter ? [codeInterpreterTool] : [])];

  // Function calling: system prompts
  let systemPrompt = get_system_prompt(useWebSearch, useCodeInterpreter);
  if (systemPrompt && chat[0]?.role !== "system") {
    chat.unshift({
      role: "system",
      content: systemPrompt,
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

    if (!response.ok) {
      // log error message
      throw new Error(`status: ${response.status}, error: ${await response.text()}`);
    }

    // Implementation taken from gpt4free: g4f/Provider/needs_auth/Openai.py at async def create_async_generator()
    let first = true;

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
              let call_name = delta["tool_calls"][0]["function"]["name"];
              let call_args = JSON.parse(delta["tool_calls"][0]["function"]["arguments"]);
              try {
                call_args = JSON.parse(call_args.toString());
              } catch (e) {} // eslint-disable-line
              let call_id = delta["tool_calls"][0]["id"];
              console.log("Function call:", call_name, call_args);

              if (call_name === "web_search") {
                let web_search_query = call_args["query"];

                let webResponse = await getWebResult(web_search_query, { mode: "advanced" });
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
              } else if (call_name === "run_code") {
                let code = call_args["code"];
                // yield `## Running code:\n\`\`\`\n${code}\n\`\`\`\n\n`;
                let codeResponse = await runCode(code);
                codeResponse = "Code output:\n" + codeResponse;
                let msg = {
                  role: "tool",
                  content: codeResponse,
                  tool_call_id: call_id,
                };
                chat.push(msg);
                yield* getDeepInfraResponse(chat, options, max_retries);
                return;
              }
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

const get_system_prompt = (useWebSearch, useCodeInterpreter) => {
  // const useSystemPrompt = useWebSearch || useCodeInterpreter;
  // if (!useSystemPrompt) return null;
  // return `${defaultSystemPrompt}\n\n${useWebSearch ? webSystemPrompt_ChatGPT : ""}${
  //   useCodeInterpreter ? codeInterpreterPrompt : ""
  // }`;

  /// System prompts degrade the performance of function calling. They are disabled for now.
  return null;
};

const defaultSystemPrompt = "You are ChatGPT, a large language model. Be a helpful assistant.";
