// This module allows communication and requests to the local Ollama API.
// Read more here: https://github.com/ollama/ollama/blob/main/docs/api.md

import fetch from "node-fetch";

import { Storage } from "../storage";
import { messages_to_json } from "../../classes/message";

import { Form } from "@raycast/api";

// constants
const DEFAULT_MODEL = "llama3.1";
const DEFAULT_INFO = JSON.stringify({ model: DEFAULT_MODEL });

const API_URL = "http://localhost:11434/api/chat";
const MODELS_URL = "http://localhost:11434/api/tags";

// main function
export const OllamaLocalProvider = "OllamaLocalProvider";
export const getOllamaLocalResponse = async function* (chat, options) {
  chat = messages_to_json(chat);
  const model = (await getOllamaModelInfo()).model;

  const response = await fetch(API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: model,
      stream: options.stream,
      messages: chat,
      options: {
        num_ctx: 4000,
        temperature: parseFloat(options.temperature),
      },
    }),
  });

  const reader = response.body;
  for await (let chunk of reader) {
    const str = chunk.toString();
    const json = JSON.parse(str);
    if (json["done"]) return;
    try {
      let content = json["message"]["content"];
      yield content;
    } catch (e) {
      console.log(e);
    }
  }
};

/// utilities

// get available models
const getOllamaModels = async () => {
  try {
    const response = await fetch(MODELS_URL);
    return (await response.json()).models || [];
  } catch (e) {
    return [];
  }
};

const getOllamaModelInfo = async () => {
  return JSON.parse(await Storage.read("ollama_model", DEFAULT_INFO));
};

// get available models as dropdown component
export const getOllamaModelsComponent = async () => {
  const models = await getOllamaModels();
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
