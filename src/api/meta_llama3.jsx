export const MetaLlama3Provider = "MetaLlama3Provider";
import fetch from "node-fetch-polyfill";

const url = "https://replicate.com/api/models/meta/meta-llama-3-70b-instruct/predictions";
const headers = {
  accept: "application/json",
  "Content-Type": "application/json",
};

export const getMetaLlama3Response = async function* (chat, max_retries = 6) {
  let data = {
    stream: true,
    input: {
      prompt: formatChatToPrompt(chat),
    },
  };

  try {
    // POST
    const response = await fetch(url, {
      method: "POST",
      headers: headers,
      body: JSON.stringify(data),
    });

    const responseJson = await response.json();

    // GET from response.json()["urls"]["stream"]
    const streamUrl = responseJson.urls.stream;

    const new_headers = {
      Accept: "text/event-stream",
      "Content-Type": "application/json",
    };
    const streamResponse = await fetch(streamUrl, {
      method: "GET",
      headers: new_headers,
    });

    const reader = streamResponse.body.getReader();
    // eslint-disable-next-line no-constant-condition
    let curr_event = "";
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      let str = new TextDecoder().decode(value);

      // iterate through each line
      // implementation ported from gpt4free.
      let lines = str.split("\n");
      let is_only_line = true;
      for (let i = 0; i < lines.length; i++) {
        let line = lines[i];
        if (line.startsWith("event: ")) {
          curr_event = line.substring(7);
          if (curr_event === "done") return;
        } else if (line.startsWith("data: ") && curr_event === "output") {
          let data = line.substring(6);

          if (data.length === 0) data = "\n";
          if (!is_only_line) data = "\n" + data;

          is_only_line = false;

          yield data;
        }
      }
    }
  } catch (e) {
    if (max_retries > 0) {
      console.log(e, "Retrying...");
      yield* getMetaLlama3Response(chat, max_retries - 1);
    } else {
      throw e;
    }
  }
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
