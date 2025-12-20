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
    { model: "pro", stream: true },
    { model: "gemini-3-flash-preview", alias: "gemini-3-flash", stream: true },
    { model: "gemini-3-pro-preview", alias: "gemini-3-pro", stream: true },
    { model: "experimental", stream: true },
  ],
  model_aliases: {
    default: ["gemini-flash-latest", "gemini-pro-latest"],
    flash: ["gemini-flash-latest", "gemini-2.5-flash"],
    pro: ["gemini-2.5-pro"],
    experimental: ["gemini-2.5-flash-preview-09-2025"],
    "gemini-pro": "pro",
    "gemini-flash": "flash",
    "gemini-exp": "experimental",
  },
  maxOutputTokens: {
    default: 64000,
    "gemini-2.0-flash": 8192,
  },
  thinkingConfig: {
    default: {
      thinkingBudget: 24576,
    },
    "gemini-2.5-flash": {
      thinkingBudget: 24576,
    },
    "gemini-2.5-pro": {
      thinkingBudget: 32768,
    },
    "gemini-2.0-flash": undefined,
  },
  generate: async function (chat, options, { stream_update, max_retries = 3 }) {
    let APIKeysStr = Preferences["GeminiAPIKeys"];
    let APIKeys = APIKeysStr.split(",").map((x) => x.trim());

    const resolveModels = (modelKey) => {
      const firstPass = this.model_aliases?.[modelKey] ?? modelKey;
      const candidates = Array.isArray(firstPass) ? firstPass : [firstPass];

      const resolved = [];
      for (const candidate of candidates) {
        const secondPass = this.model_aliases?.[candidate] ?? candidate;
        if (Array.isArray(secondPass)) {
          resolved.push(...secondPass);
        } else {
          resolved.push(secondPass);
        }
      }

      return Array.from(new Set(resolved)).filter(Boolean);
    };

    const models = resolveModels(options.model);

    const useWebSearch = max_retries >= 2 && ["auto", "balanced"].includes(Preferences["webSearch"]);
    const useCodeInterpreter = Preferences["codeInterpreter"];

    const tools = [
      ...(useWebSearch ? [{ googleSearch: {} }, { urlContext: {} }] : []),
      ...(useCodeInterpreter ? [{ codeExecution: {} }] : []),
    ];

    try {
      let ok = false;
      for (const model of models) {
        for (const APIKey of APIKeys) {
          const googleGemini = new Gemini(APIKey, { fetch: fetch });
          let [formattedChat, query] = await GeminiFormatChat(chat, googleGemini);
          const geminiChat = googleGemini.createChat({
            model: model,
            history: formattedChat,
            safetySettings: constants.safetyDisabledSettings,
            generationConfig: {
              maxOutputTokens: this.maxOutputTokens[model] || this.maxOutputTokens.default,
              thinkingConfig: this.thinkingConfig[model] || this.thinkingConfig.default,
              temperature: options.temperature * 1.5, // models have temperature in [0, 2] so we scale it up
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
            ok = true;
            return;
          } catch (e) {
            console.log(e);
          }
        }
      }
      if (!ok) {
        throw new Error("All API keys failed");
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
        const filePath = typeof file === "string" ? file : file.path;
        const buffer = fs.readFileSync(filePath);
        const fileUpload = { filePath: filePath, buffer: buffer };
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
