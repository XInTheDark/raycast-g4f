import fetch from "#root/src/api/fetch.js";
import { format_chat_to_prompt } from "../../classes/message.js";

// Implementation ported from gpt4free Replicate provider.

const url = (model) => `https://replicate.com/api/models/${model}/predictions`;
const headers = {
  accept: "application/json",
  "Content-Type": "application/json",
};

export const ReplicateProvider = {
  name: "Replicate",
  models: [
    { model: "meta/meta-llama-3-8b-instruct", alias: "llama-3-8b", stream: true },
    { model: "meta/meta-llama-3-70b-instruct", alias: "llama-3-70b", stream: true },
    { model: "meta/meta-llama-3.1-405b-instruct", alias: "llama-3.1-405b", stream: true },
    { model: "mistralai/mixtral-8x7b-instruct-v0.1", alias: "mixtral-8x7b", stream: true },
  ],
  model_aliases: {
    "llama-3-8b": "meta/meta-llama-3-8b-instruct",
    "llama-3-70b": "meta/meta-llama-3-70b-instruct",
    "llama-3.1-405b": "meta/meta-llama-3.1-405b-instruct",
    "mixtral-8x7b": "mistralai/mixtral-8x7b-instruct-v0.1",
  },
  generate: async function* (chat, options, { max_retries = 5 }) {
    const model = options.model;

    let data = {
      stream: true,
      input: {
        prompt: format_chat_to_prompt(chat, { model: model }),
        max_tokens: model.includes("meta-llama-3") ? 512 : null, // respected by meta-llama-3
        max_new_tokens: model.includes("mixtral") ? 1024 : null, // respected by mixtral-8x7b
        temperature: options.temperature,
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
        yield* this.generate(chat, options, { max_retries: max_retries - 1 });
      } else {
        throw e;
      }
    }
  },
};
