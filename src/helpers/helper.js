/// Helper file with no dependencies

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

export const sleep = async (ms) => {
  return new Promise((resolve) => setTimeout(resolve, ms));
};

// Estimate number of tokens in a string
export const tokens_estimate = (str) => {
  if (!str) return 0;
  let chars = str.length;
  let words = str.split(" ").length;
  return Math.max((words * 4) / 3, chars / 4);
};

// Truncate a message using the middle-out strategy, given a target context length
export const truncate_message_middle = (message, contextChars, contextTokens) => {
  let chars = message.content.length,
    tokens = tokens_estimate(message.content);

  if ((contextChars && chars <= contextChars) || (contextTokens && tokens <= contextTokens)) {
    return message;
  }

  if (contextChars) {
    contextChars -= 20; // buffer
    if (contextChars <= 0) {
      return "";
    }

    let half = Math.floor(contextChars / 2);
    return message.content.substring(0, half) + "\n...\n" + message.content.substring(chars - half);
  } else if (contextTokens) {
    contextTokens -= 10; // buffer
    if (contextTokens <= 0) {
      return "";
    }

    let half = Math.floor(contextTokens / 2);
    let words = message.content.split(" ");

    // binary search for both the start and end of the truncated message
    let start = 0,
      end = words.length;
    while (start < end) {
      let mid = Math.floor((start + end) / 2);
      let truncated = words.slice(0, mid).join(" ");
      if (tokens_estimate(truncated) > half) {
        end = mid;
      } else {
        start = mid + 1;
      }
    }
    let firstHalf = words.slice(0, start).join(" ");

    start = end;
    end = words.length;
    while (start < end) {
      let mid = Math.floor((start + end) / 2);
      let truncated = words.slice(mid).join(" ");
      if (tokens_estimate(truncated) > half) {
        start = mid + 1;
      } else {
        end = mid;
      }
    }
    let secondHalf = words.slice(start).join(" ");
    return firstHalf + "\n...\n" + secondHalf;
  }

  return message.content;
};

// Given an array of Messages and a provider info, return the
// longest chat array that fits within the context length
export const truncate_chat = (chat, providerInfo) => {
  let contextChars = providerInfo?.context_chars || null,
    contextTokens = providerInfo?.context_tokens || null;
  if (!contextChars && !contextTokens) return chat; // undefined context length

  let newChat = [];
  let totalChars = 0,
    totalTokens = 0;

  // start from end of chat to get the most recent messages
  for (let i = chat.length - 1; i >= 0; i--) {
    let message = chat[i];
    let chars = message.content.length,
      tokens = tokens_estimate(message.content);

    totalChars += chars;
    totalTokens += tokens;

    if ((contextChars && totalChars > contextChars) || (contextTokens && totalTokens > contextTokens)) {
      let truncated = truncate_message_middle(
        message,
        contextChars && contextChars - totalChars + chars,
        contextTokens && contextTokens - totalTokens + tokens
      );
      if (message) {
        message.content = truncated;
        newChat.unshift(message);
      }
      break;
    }

    newChat.unshift(message); // add to start of array
  }

  return newChat;
};

export const current_datetime = () => {
  return new Date().toLocaleString("en-US", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
};

export const escapeString = (str) => {
  // https://github.com/leoek/fetch-to-curl/blob/092db367955f80280d458c1e5af144e9b0f42114/src/main.js#L89C10-L89C37
  return str.replace(/'/g, `'\\''`);
};

export const escapeObject = (obj) => {
  return escapeString(JSON.stringify(obj));
};

// Convert a string like "cmd+opt+n" to an object like { modifiers: ["cmd", "opt"], key: "n" }
export const stringToKeyboardShortcut = (str) => {
  str = str.toLowerCase();
  let parts = str.split("+").map((x) => x.trim());
  let key = parts.pop();
  if (key.length !== 1) {
    return null;
  }

  let modifiers = parts;
  if (modifiers.length === 0) {
    return null;
  }

  return { modifiers, key };
};

// format response using some heuristics
export const formatResponse = (response, provider = null) => {
  // eslint-disable-next-line no-constant-condition
  if (false && (provider.name === "Nexra" || provider.name === "BestIM")) {
    // replace escape characters: \n with a real newline, \t with a real tab, etc.
    response = response.replace(/\\n/g, "\n");
    response = response.replace(/\\t/g, "\t");
    response = response.replace(/\\r/g, "\r");
    response = response.replace(/\\'/g, "'");
    response = response.replace(/\\"/g, '"');

    // remove all remaining backslashes
    response = response.replace(/\\/g, "");

    // remove <sup>, </sup> tags (not supported apparently)
    response = response.replace(/<sup>/g, "");
    response = response.replace(/<\/sup>/g, "");
  }

  if (provider.name === "Blackbox") {
    // remove version number - example: remove $@$v=v1.13$@$ or $@$v=undefined%@$
    response = response.replace(/\$@\$v=.{1,30}\$@\$/, "");

    // remove sources - the chunk of text starting with $~~~$[ and ending with ]$~~~$
    // as well as everything before it
    const regex = /\$~~~\$\[[^]*]\$~~~\$/;
    let match = response.match(regex);
    if (match) {
      response = response.substring(match.index + match[0].length);
    }
  }

  return response;
};

export const clamp = (num, min, max) => {
  return Math.min(Math.max(num, min), max);
};

export const getFileFromURL = (file) => {
  return decodeURIComponent(removePrefix(file, "file://"));
};
