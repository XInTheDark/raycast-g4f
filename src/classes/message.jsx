// This module defines the following classes:
// - Message
// - MessagePair
//
// It also defines the following utilities:
// - pairs_to_messages
// - format_chat_to_prompt
// - messages_to_json
//
// Note how we currently don't have a Chat class, and instead we just use an array of messages.

export class Message {
  constructor({ role = "", content = "", files = [] } = {}) {
    this.role = role;
    this.content = content;
    if (files && files.length > 0) {
      this.files = files;
    }
  }
}

export class MessagePair {
  // This class is different from Message in that it contains two messages, user and assistant.
  // It is stored in JSON format in localStorage. Therefore, special care needs to be taken so that all the data
  // is stored correctly. To make this easier and more reliable, the class is completely JSON-compatible,
  // so we don't even need to serialize/deserialize it. In particular, we can use a non-Messages object as if it were
  // a MessagePair object, as long as it has the same properties.
  // In fact, currently the objects in AI Chat are not even being stored as MessagePair objects, but as plain objects,
  // but they are still being treated as MessagePair objects, and this is fine.

  constructor({
    prompt = "",
    answer = "",
    creationDate = new Date(),
    id = new Date().getTime(),
    finished = false,
    visible = true,
    files = [],
  } = {}) {
    this.prompt = prompt;
    this.answer = answer;
    this.creationDate = creationDate;
    this.id = id;
    this.finished = finished;
    this.visible = visible;
    if (files && files.length > 0) {
      this.files = files;
    }
  }
}

// Utilities

// Format an array of MessagePairs into an array of Messages
export const pairs_to_messages = (pairs, query = null) => {
  let chat = [];

  for (let i = pairs.length - 1; i >= 0; i--) {
    // reverse order, index 0 is latest message
    let messagePair = pairs[i];
    if (!messagePair.prompt) continue;
    chat.push(
      messagePair.files
        ? new Message({ role: "user", content: messagePair.prompt, files: messagePair.files })
        : new Message({ role: "user", content: messagePair.prompt })
    );
    if (messagePair.answer) chat.push(new Message({ role: "assistant", content: messagePair.answer }));
  }
  if (query) chat.push(new Message({ role: "user", content: query }));
  return chat;
};

// Format an array of Messages into a single string
export const format_chat_to_prompt = (chat, model = null) => {
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

// Format an array of Messages (NOT pairs) into a simple JSON array consisting of role and content
// this is used in many OpenAI-based APIs
export const messages_to_json = (chat) => {
  let json = [];
  for (let i = 0; i < chat.length; i++) {
    json.push({ role: chat[i].role, content: chat[i].content });
  }
  return json;
};
