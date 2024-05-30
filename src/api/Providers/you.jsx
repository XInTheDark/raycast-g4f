export const YouProvider = "YouProvider";
import fetch from "node-fetch-polyfill";
import { formatChatToPrompt, uuid4 } from "../helper";

const api_url = "https://you.com/api/streamingSearch";
let default_headers = {
  "accept": "*/*",
  "accept-encoding": "gzip, deflate",
  "accept-language": "en-US",
  "referer": "",
  "sec-ch-ua": '"Google Chrome";v="123", "Not:A-Brand";v="8", "Chromium";v="123"',
  "sec-ch-ua-arch": '"x86"',
  "sec-ch-ua-bitness": '"64"',
  "sec-ch-ua-full-version": '"123.0.6312.122"',
  "sec-ch-ua-full-version-list":
    '"Google Chrome";v="123.0.6312.122", "Not:A-Brand";v="8.0.0.0", "Chromium";v="123.0.6312.122"',
  "sec-ch-ua-mobile": "?0",
  "sec-ch-ua-model": '""',
  "sec-ch-ua-platform": '"Windows"',
  "sec-ch-ua-platform-version": '"15.0.0"',
  "sec-fetch-dest": "empty",
  "sec-fetch-mode": "cors",
  "sec-fetch-site": "same-origin",
  "user-agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36",
}; // used by impersonate param in gpt4free

export const getYouResponse = async function* (chat) {
  let chat_mode = "default";

 let headers = {
    Accept: "text/event-stream",
    Referer: "https://you.com/search?fromSearchBar=true&tbm=youchat",
  };

  headers = { ...default_headers, ...headers };
  console.log(headers);

  let _data = {
    userFiles: "",
    q: formatChatToPrompt(chat),
    domain: "youchat",
    selectedChatMode: chat_mode,
    conversationTurnId: uuid4(),
    chatId: uuid4(),
  };

  let params = {
    userFiles: "",
    selectedChatMode: chat_mode,
  };
  // url search params
  let url = api_url + "?" + new URLSearchParams(params).toString();
  console.log(url);

  // POST
  const response = await fetch(url, {
    method: "POST",
    headers: headers,
    body: JSON.stringify(_data),
  });
  console.log(response);

  let reader = response.body.getReader();
  let decoder = new TextDecoder();
  let event, data;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    let str = decoder.decode(value);
    console.log(str);
    let lines = str.split("\n");
    for (let i = 0; i < lines.length; i++) {
      let line = lines[i];

      if (line.startsWith("event: ")) {
        event = line.substring(7);
      } else if (line.startsWith("data: ")) {
        if (["youChatUpdate", "youChatToken"].includes(event)) {
          data = JSON.parse(line.substring(6));
        }
        if (event === "youChatToken" && data[event]) {
          yield data[event];
        } else if (event === "youChatUpdate" && data["t"]) {
          yield data["t"];
        }
      }
    }
  }
};
