export const ReplicateProvider = "ReplicateProvider";
import fetch from "node-fetch";
import { formatChatToPrompt } from "../helper";

// Implementation ported from gpt4free Replicate provider.

const url = (model) => `https://replicate.com/api/models/${model}/predictions`;
const headers = {
  accept: "application/json",
  "Content-Type": "application/json",
};

export const getReplicateResponse = async function* (chat, options, max_retries = 10) {
  const model = options.model;

  let data = {
    stream: true,
    input: {
      prompt: formatChatToPrompt(chat, model),
      max_tokens: model.includes("meta-llama-3") ? 512 : null, // respected by meta-llama-3
      max_new_tokens: model.includes("mixtral") ? 1024 : null, // respected by mixtral-8x7b
      temperature: options.temperature || 0.7,
    },
  };

  try {
    // POST
    const response = await fetch(url(model), {
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

    const reader = streamResponse.body;
    // eslint-disable-next-line no-constant-condition
    let curr_event = "";
    for await (let chunk of reader) {
      let str = chunk.toString();

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
      yield* getReplicateResponse(chat, options, max_retries - 1);
    } else {
      throw e;
    }
  }
};
