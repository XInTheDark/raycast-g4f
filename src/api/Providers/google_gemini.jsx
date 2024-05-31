import Gemini from "gemini-ai";
import { getPreferenceValues } from "@raycast/api";
import fetch from "node-fetch-polyfill";

export const GeminiProvider = "GeminiProvider";

export const getGoogleGeminiResponse = async (chat) => {
  const APIKey = getPreferenceValues()["GeminiAPIKey"];
  const googleGemini = new Gemini(APIKey, { fetch: fetch });
  let formattedChat = GeminiFormatChat(chat);

  // Send message
  let query = chat[chat.length - 1].content;
  const geminiChat = googleGemini.createChat({
    model: "gemini-pro",
    messages: formattedChat,
  });
  let response = await geminiChat.ask(query);
  return response;
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
