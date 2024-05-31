import Gemini from "gemini-ai";
import { getPreferenceValues } from "@raycast/api";
import fetch from "node-fetch-polyfill";

export const GeminiProvider = "GeminiProvider";

export const getGoogleGeminiResponse = async (chat, options, stream_update, max_retries = 3) => {
  let APIKeysStr = getPreferenceValues()["GeminiAPIKeys"];
  let APIKeys = APIKeysStr.split(",").map((x) => x.trim());
  let formattedChat = GeminiFormatChat(chat);

  try {
    for (const APIKey of APIKeys) {
      const googleGemini = new Gemini(APIKey, { fetch: fetch });

      // Create chat
      let query = chat[chat.length - 1].content;
      const geminiChat = googleGemini.createChat({
        model: options.model,
        messages: formattedChat,
        maxOutputTokens: 8192, // accurate as of 2024-05-31, for gemini-1.5-flash-latest
        temperature: options.temperature ?? 0.7,
      });

      // Send message
      try {
        let response = "";
        if (stream_update) {
          const handler = (chunk) => {
            response += chunk;
            stream_update(response);
          };
          await geminiChat.ask(query, { stream: handler });
          return;
        } else {
          response = await geminiChat.ask(query);
          return response;
        }
      } catch (e) {
        continue;
      }
    }
  } catch (e) {
    // if all API keys fail, we allow a few retries
    if (max_retries > 0) {
      console.log(e, "Retrying...");
      return await getGoogleGeminiResponse(chat, options, stream_update, max_retries - 1);
    } else {
      throw e;
    }
  }
};

// Reformat chat to be in google gemini format
export const GeminiFormatChat = (chat) => {
  let formattedChat = [];

  // Discard system prompt as it is not supported by the API
  if (chat.length >= 2 && chat[0].role === "user" && chat[1].role === "user") {
    chat.shift(); // remove first user message (system prompt)
  }

  let currentPair = [];
  for (let i = 0; i < chat.length; i++) {
    const message = chat[i];
    if (currentPair.length === 0) {
      currentPair.push(message.content);
    } else {
      currentPair.push(message.content);
      formattedChat.push(currentPair);
      currentPair = [];
    }
  }
  return formattedChat;
};
