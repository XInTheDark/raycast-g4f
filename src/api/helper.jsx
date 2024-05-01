// Format a series of messages into a single string
export const Capitalize = (str) => {
  return str.charAt(0).toUpperCase() + str.slice(1);
};

export const formatChatToPrompt = (chat) => {
  let prompt = "";
  for (let i = 0; i < chat.length; i++) {
    prompt += Capitalize(chat[i].role) + ": " + chat[i].content + "\n";
  }
  prompt += "Assistant:";
  return prompt;
};
