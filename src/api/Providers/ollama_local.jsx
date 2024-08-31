// This module allows communication and requests to the local Ollama API.
// Read more here: https://github.com/ollama/ollama/blob/main/docs/api.md

import fetch from "node-fetch";

import { Storage } from "../storage";
import { messages_to_json } from "../../classes/message";

import { Form } from "@raycast/api";

// constants
const DEFAULT_MODEL = "llama3.1";
const DEFAULT_INFO = JSON.stringify({ model: DEFAULT_MODEL });
const DEFAULT_CTX_SIZE = 2048;
const DEFAULT_API_URL = "http://localhost:11434";

// main function
export const OllamaLocalProvider = {
  name: "OllamaLocal",
  generate: async function* (chat, options) {
    chat = messages_to_json(chat);
    const model = (await getOllamaModelInfo()).model;

    const api_url = await getOllamaAPIPath();
    const chat_url = `${api_url}/api/chat`;

    const ctx_size = await getOllamaCtxSize();

    const response = await fetch(chat_url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: model,
        stream: options.stream,
        messages: chat,
        options: {
          num_ctx: ctx_size,
          temperature: parseFloat(options.temperature),
        },
      }),
    });

    const reader = response.body;
    for await (let chunk of reader) {
      const str = chunk.toString();
      try {
        const json = JSON.parse(str);
        if (json["done"]) return;
        let content = json["message"]["content"];
        yield content;
      } catch (e) {
        console.log(e);
      }
    }
  },
};

/// utilities

// get available models
const getOllamaModels = async (path = null) => {
  try {
    const api_url = path ? path : await getOllamaAPIPath();
    const models_url = `${api_url}/api/tags`;

    const response = await fetch(models_url);
    return (await response.json()).models || [];
  } catch (e) {
    return [];
  }
};

const getOllamaModelInfo = async () => {
  return JSON.parse(await Storage.read("ollama_model", DEFAULT_INFO));
};

export const getOllamaAPIPath = async () => {
  return await Storage.read("ollama_api", DEFAULT_API_URL);
};

// get available models as dropdown component
export const getOllamaModelsComponent = async (path = null) => {
  const models = await getOllamaModels(path);
  const defaultModel = (await getOllamaModelInfo()).model;
  return (
    <>
      <Form.Dropdown id="ollama_model" title="Ollama Model" defaultValue={defaultModel}>
        {models.map((model) => {
          return <Form.Dropdown.Item title={model.name} key={model.name} value={model.name} />;
        })}
      </Form.Dropdown>
    </>
  );
};

export const getOllamaCtxSize = async () => {
  const str = await Storage.read("ollama_ctx_size", DEFAULT_CTX_SIZE.toString());
  let int = parseInt(str);
  if (!int) {
    int = DEFAULT_CTX_SIZE;
    await Storage.write("ollama_ctx_size", int.toString());
  }
  return int;
};
