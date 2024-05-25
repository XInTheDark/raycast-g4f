export const EcosiaProvider = "EcosiaProvider";
import fetch from "node-fetch-polyfill";

const api_url = "https://api.ecosia.org/v2/chat/?sp=productivity";
const headers = {
  authority: "api.ecosia.org",
  accept: "*/*",
  "content-type": "application/json",
  origin: "https://www.ecosia.org",
  referer: "https://www.ecosia.org/",
  "user-agent":
    "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/89.0.4389.114 Safari/537.36",
};

export const getEcosiaResponse = async function* (chat, options, max_retries = 5) {
  // python: "messages": base64.b64encode(json.dumps(chat).encode()).decode()
  let chatJson = JSON.stringify(chat);
  let encodedChat = Buffer.from(chatJson).toString("base64").toString();
  let data = {
    messages: encodedChat,
  };

  try {
    // POST
    const response = await fetch(api_url, {
      method: "POST",
      headers: headers,
      body: JSON.stringify(data),
    });

    // Check for error codes
    if (response.status !== 200) {
      throw new Error(`${response.status}`);
    }

    let reader = response.body.getReader();
    let decoder = new TextDecoder();

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      let chunk = decoder.decode(value);
      if (chunk) yield chunk;
    }
  } catch (e) {
    if (max_retries > 0) {
      console.log(e, "Retrying...");
      yield* getEcosiaResponse(chat, options, max_retries - 1);
    } else {
      throw e;
    }
  }
};
