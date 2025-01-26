import Gemini, { constants } from "gemini-ai-sdk";

import fs from "fs";
import { Preferences } from "../preferences.js";

export const GeminiProvider = {
  name: "Google Gemini",
  isCustom: true,
  customStream: true,
  models: [
    { model: "default", stream: true },
    { model: "flash", stream: true },
    { model: "experimental", stream: true },
    { model: "thinking", stream: true },
  ],
  model_aliases: {
    default: ["gemini-1.5-pro-002", "gemini-1.5-flash-002", "gemini-1.5-flash-latest"],
    flash: ["gemini-2.0-flash-exp", "gemini-1.5-flash-002"],
    experimental: ["gemini-exp-1206", "gemini-2.0-flash-exp", "gemini-2.0-flash-thinking-exp-1219"],
    thinking: ["gemini-2.0-flash-thinking-exp-01-21"],
    "gemini-pro": "default",
    "gemini-flash": "flash",
    "gemini-exp": "experimental",
    "gemini-thinking": "thinking",
  },
  generate: async function (chat, options, { stream_update, max_retries = 3 }) {
    let APIKeysStr = Preferences["GeminiAPIKeys"];
    let APIKeys = APIKeysStr.split(",").map((x) => x.trim());

    let model = this.model_aliases[options.model];
    let models = Array.isArray(model) ? model : [model];

    // disable native web search for now, as Google search tool is unavailable for free users
    const useWebSearch = options.webSearch === "auto" && false;
    const useCodeInterpreter = Preferences["codeInterpreter"];

    const tools = [
      ...(useWebSearch ? [constants.defaultTools.webSearch] : []),
      ...(useCodeInterpreter ? [constants.defaultTools.codeExecution] : []),
    ];

    try {
      for (const model of models) {
        for (const APIKey of APIKeys) {
          const googleGemini = new Gemini(APIKey, { fetch: fetch });
          let [formattedChat, query] = await GeminiFormatChat(chat, googleGemini);
          const geminiChat = googleGemini.createChat({
            model: model,
            history: formattedChat,
            safetySettings: constants.safetyDisabledSettings,
            generationConfig: {
              maxOutputTokens: 8192, // maximum for v1.5 models
              temperature: options.temperature * 1.5, // v1.5 models have temperature in [0, 2] so we scale it up
            },
            tools: tools,
          });

          // Send message
          try {
            let response = await geminiChat.ask(query, { stream: true });
            let text = "";

            for await (let chunk of response.stream) {
              chunk = chunk.text();
              text += chunk;
              stream_update(text);
            }

            // return when done
            return;
          } catch (e) {
            console.log(e);
          }
        }
      }
    } catch (e) {
      // if all API keys fail, we allow a few retries
      if (max_retries > 0) {
        console.log(e, "Retrying...");
        return await this.generate(chat, options, { stream_update, max_retries: max_retries - 1 });
      } else {
        throw e;
      }
    }
  },
};

// Reformat chat to be in google gemini format
// input: array of Message objects, output: array of gemini-ai Message objects that can be passed
// directly to the messages parameter in createChat. This includes uploading files.
// the googleGemini object is used internally in gemini-ai to upload large files via Google's files API.
export const GeminiFormatChat = async (chat, googleGemini) => {
  let formattedChat = [];

  for (let i = 0; i < chat.length; i++) {
    const message = chat[i]; // Message object
    const role = message.role === "user" ? "user" : "model"; // gemini-ai uses "user" and "model" roles

    // We now convert to a Message type as used in gemini-ai. It essentially just consists of role and parts.
    // (see gemini-g4f, types.ts)
    //
    // to do the conversion, we just call on gemini-ai's pre-existing messageToParts function.
    // (see https://github.com/XInTheDark/gemini-ai/blob/546064f5f6665793eb76765e82ad9fd8952ce29d/src/index.ts#L104)
    // messageToParts takes in an array of [String | ArrayBuffer | FileUpload] and returns an array that can be passed to parts param.
    // We use FileUpload, which is just { filePath: string, buffer: Buffer }.
    let geminiMessageParts;
    if (message.files && message.files.length > 0) {
      let arr = [message.content];
      for (const file of message.files) {
        const buffer = fs.readFileSync(file);
        const fileUpload = { filePath: file, buffer: buffer };
        arr.push(fileUpload);
      }
      geminiMessageParts = await googleGemini.messageToParts(arr);
    } else {
      geminiMessageParts = [{ text: message.content }];
    }
    let geminiMessage = { role: role, parts: geminiMessageParts };
    formattedChat.push(geminiMessage);
  }

  // remove last message and return it separately
  let last_message = formattedChat.pop();
  // get only parts instead of the whole message, to pass to gemini-ai
  last_message = last_message.parts;

  return [formattedChat, last_message];
};
