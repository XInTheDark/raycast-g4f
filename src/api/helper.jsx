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

// Format a series of messages into a single string
export const formatChatToPrompt = (chat) => {
  let prompt = "";
  for (let i = 0; i < chat.length; i++) {
    prompt += chat[i].role + ": " + chat[i].content + "\n";
  }
  prompt += "assistant:";
  return prompt;
};

// // Determine if a chat is active or not (updated in the last 24 hours)
export const isChatActive = (chat) => {
  const lastUpdated = new Date(chat.messages[0].creationDate);
  const now = new Date();
  const diff = now - lastUpdated;
  const hours = Math.floor(diff / 1000 / 60 / 60);
  return hours < 24;
};

// Given a chatData object, filter chats into 2 groups: active ones and inactive ones
export const filterChats = (chatData) => {
  const activeChats = [];
  const inactiveChats = [];
  const now = new Date();
  for (const chat of chatData.chats) {
    const lastUpdated = new Date(chat.messages[0].creationDate);
    const diff = now - lastUpdated;
    const hours = Math.floor(diff / 1000 / 60 / 60);
    if (hours < 24) {
      activeChats.push(chat);
    } else {
      inactiveChats.push(chat);
    }
  }
  return { activeChats, inactiveChats };
};
