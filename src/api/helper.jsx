export const formatDate = (dateToCheckISO) => {
  // Calculate the date difference between the current date and the date to check
  // and format it like: 2y, 3mo, 4d, 5h, 6m (no seconds because updates will be too frequent)

  const d1 = new Date(),
    t1 = d1.getTime();
  const d2 = new Date(dateToCheckISO),
    t2 = d2.getTime();
  const diff = t1 - t2;
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  const months = Math.floor(days / 30);
  const years = Math.floor(months / 12);

  let formatted = "now";
  // we only want one unit of time, and it should be the largest unit
  for (const [unit, value] of [
    ["y", years],
    ["mo", months],
    ["d", days],
    ["h", hours],
    ["m", minutes],
  ]) {
    if (value > 0) {
      formatted = `${value}${unit}`;
      break;
    }
  }

  return formatted;
};

// Format a series of messages into a GPT chat format
// Takes a chat object (that we use in AI Chat) and a query, and returns a GPT chat format
export const formatChatToGPT = (currentChat, query = null) => {
  // if (currentChat.systemPrompt.length > 0)
  //   // The system prompt is not acknowledged by most providers, so we use it as first user prompt instead
  //   chat.push({ role: "user", content: currentChat.systemPrompt });
  // The above section is deprecated because we currently already push system prompt to start of chat

  let chat = [];

  // currentChat.messages is stored in the format of [prompt, answer]. We first convert it to
  // { role: "user", content: prompt }, { role: "assistant", content: answer }, etc.
  for (let i = currentChat.messages.length - 1; i >= 0; i--) {
    // reverse order, index 0 is latest message
    let message = currentChat.messages[i];
    if (is_null_message(message)) continue;
    if (message.prompt) chat.push({ role: "user", content: message.prompt });
    else continue;
    if (message.answer) chat.push({ role: "assistant", content: message.answer });
  }
  if (query) chat.push({ role: "user", content: query });
  return chat;
};

// Format a series of messages into a single string
// Takes a GPT format chat (i.e. [{role: ..., content: ...}]) and returns a string
export const formatChatToPrompt = (chat, model = null) => {
  model = model?.toLowerCase() || "";
  let prompt = "";

  if (model.includes("meta-llama-3")) {
    prompt += "<|begin_of_text|>";
    for (let i = 0; i < chat.length; i++) {
      prompt += `<|start_header_id|>${chat[i].role}<|end_header_id|>`;
      prompt += `\n${chat[i].content}<|eot_id|>`;
    }
    prompt += "<|start_header_id|>assistant<|end_header_id|>";
  } else if (model.includes("mixtral")) {
    // <s> [INST] Prompt [/INST] answer</s> [INST] Follow-up instruction [/INST]
    for (let i = 0; i < chat.length; i++) {
      if (chat[i].role === "user") {
        prompt += `<s> [INST] ${chat[i].content} [/INST]`;
      } else if (chat[i].role === "assistant") {
        prompt += ` ${chat[i].content}</s>`;
      }
    }
    // note how prompt ends with [/INST]
  } else {
    for (let i = 0; i < chat.length; i++) {
      prompt += chat[i].role + ": " + chat[i].content + "\n";
    }
    prompt += "assistant:";
  }

  return prompt;
};

export const is_null_message = (message) => {
  return !message || ((message?.prompt || "").length === 0 && (message?.answer || "").length === 0);
};

export const removeFirstOccurrence = (str, substr) => {
  let idx = str.indexOf(substr);
  if (idx !== -1) {
    return str.substring(idx + substr.length);
  }
  return str;
};

export const removeLastOccurrence = (str, substr) => {
  let idx = str.lastIndexOf(substr);
  if (idx !== -1) {
    return str.substring(0, idx);
  }
  return str;
};

export const removePrefix = (str, prefix) => {
  if (str.startsWith(prefix)) {
    return str.substring(prefix.length);
  }
  return str;
};

export const removeSuffix = (str, suffix) => {
  if (str.endsWith(suffix)) {
    return str.substring(0, str.length - suffix.length);
  }
  return str;
};
