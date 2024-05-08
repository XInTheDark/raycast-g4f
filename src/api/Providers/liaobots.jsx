export const LiaobotsProvider = "LiaobotsProvider";
import fetch from "node-fetch-polyfill";
import { uuid4 } from "../helper";
import https from "https";

const httpsAgent = new https.Agent({
  rejectUnauthorized: false,
});

const models = {
    "gpt-4-turbo": {
        "id": "gpt-4-turbo-preview",
        "name": "GPT-4-Turbo",
        "maxLength": 260000,
        "tokenLimit": 126000,
        "context": "128K",
    },
    "gpt-4": {
        "id": "gpt-4-plus",
        "name": "GPT-4-Plus",
        "maxLength": 130000,
        "tokenLimit": 31000,
        "context": "32K",
    },
    "claude-2.1": {
        "id": "claude-2.1",
        "name": "Claude-2.1-200k",
        "maxLength": 800000,
        "tokenLimit": 200000,
        "context": "200K",
    },
};

let headers = {
  "authority": "liaobots.com",
  "content-type": "application/json",
  "origin": "https://liaobots.site",
  "referer": "https://liaobots.site/",
  "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/112.0.0.0 Safari/537.36",
};

export const getLiaobotsResponse = async function* (chat, model, max_retries = 5) {
  // 1. get auth code
  // POST to https://liaobots.work/recaptcha/api/login
  let data = {
    "token": "abcdefghijklmnopqrst",
  };

  process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0"; // verify_ssl = False
  await fetch("https://liaobots.work/recaptcha/api/login", {
    method: "POST",
    headers: headers,
    body: JSON.stringify(data),
    agent: httpsAgent,
  });

  // POST to https://liaobots.work/api/user
  data = {"authcode": ""};
  let response = await fetch("https://liaobots.work/api/user", {
    method: "POST",
    headers: headers,
    body: JSON.stringify(data),
    agent: httpsAgent,
  });


  let responseJson = await response.json();
  console.log(responseJson);
  let auth_code = responseJson["authCode"];

  data = {
      "conversationId": uuid4(),
      "model": models[model],
      "messages": chat,
      "key": "",
      "prompt": "",
  };

  headers["x-auth-code"] = auth_code;

  // POST to https://liaobots.work/api/chat
  response = await fetch("https://liaobots.work/api/chat", {
    method: "POST",
    headers: headers,
    body: JSON.stringify(data),
    agent: httpsAgent,
  });

  let reader = response.body.getReader();
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    let chunk = new TextDecoder().decode(value);
    if (chunk) {
      yield chunk;
    }
  }

}