// This module allows communication and requests to the local G4F API.
// Read more here: https://github.com/xtekky/gpt4free/blob/main/docs/interference.md

import { exec } from "child_process";
import fetch from "node-fetch";

import { Storage } from "../storage";
import { messages_to_json } from "../../classes/message";

import { environment, Form } from "@raycast/api";

// constants
const DEFAULT_MODEL = "meta-ai";
export const DEFAULT_TIMEOUT = "900";

const BASE_URL = "http://localhost:1337/v1";
const API_URL = "http://localhost:1337/v1/chat/completions";
const MODELS_URL = "http://localhost:1337/v1/models";

// main function
export const G4FLocalProvider = "G4FLocalProvider";
export const getG4FLocalResponse = async function* (chat, options) {
  if (!(await isG4FRunning())) {
    await startG4F();
  }

  chat = messages_to_json(chat);
  const model = await getSelectedG4FModel();

  const response = await fetch(API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: model,
      stream: options.stream,
      messages: chat,
    }),
  });

  // Important! we assume that the response is a stream, as this is true for most G4F models.
  // If in the future this is not the case, we should add separate handling for non-streaming responses.
  const reader = response.body;
  for await (let chunk of reader) {
    const str = chunk.toString();
    let lines = str.split("\n");
    for (let i = 0; i < lines.length; i++) {
      let line = lines[i];
      if (line.startsWith("data: ")) {
        let chunk = line.substring(6);
        if (chunk.trim() === "[DONE]") return; // trim() is important

        try {
          let data = JSON.parse(chunk);
          let delta = data["choices"][0]["delta"]["content"];
          if (delta) {
            yield delta;
          }
        } catch (e) {} // eslint-disable-line
      }
    }
  }
};

/// utilities

// check if the G4F API is running
// with a request timeout of 0.5 seconds (since it's localhost)
const isG4FRunning = async () => {
  try {
    const controller = new AbortController();
    setTimeout(() => controller.abort(), 500);
    const response = await fetch(BASE_URL, { signal: controller.signal });
    return response.ok;
  } catch (e) {
    return false;
  }
};

// get available models
const getG4FModels = async () => {
  try {
    const response = await fetch(MODELS_URL);
    return (await response.json()).data || [];
  } catch (e) {
    return [];
  }
};

// get available models as dropdown component
export const getG4FModelsDropdown = async () => {
  const models = await getG4FModels();
  return (
    <Form.Dropdown id="model" title="Model" defaultValue={await getSelectedG4FModel()}>
      {models.map((model) => {
        return <Form.Dropdown.Item title={model.id} key={model.id} value={model.id} />;
      })}
    </Form.Dropdown>
  );
};

// get G4F executable path from storage
export const getG4FExecutablePath = async () => {
  return await Storage.read("g4f_executable", "g4f");
};

// get the currently selected G4F model from storage
const getSelectedG4FModel = async () => {
  return await Storage.read("g4f_model", DEFAULT_MODEL);
};

// get G4F API timeout (in seconds) from storage
export const getG4FTimeout = async () => {
  return parseInt(await Storage.read("g4f_timeout", DEFAULT_TIMEOUT)) || parseInt(DEFAULT_TIMEOUT);
};

// start the G4F API
const startG4F = async () => {
  const exe = await getG4FExecutablePath();
  const timeout_s = await getG4FTimeout();
  const START_COMMAND = `export PATH="/opt/homebrew/bin:$PATH"; ( ${exe} api ) & sleep ${timeout_s} ; kill $!`;
  const dirPath = environment.supportPath;
  try {
    const child = exec(START_COMMAND, { cwd: dirPath });
    console.log("G4F API Process ID:", child.pid);
    child.stderr.on("data", (data) => {
      console.log("g4f >", data);
    });
    // sleep for some time to allow the API to start
    await new Promise((resolve) => setTimeout(resolve, 2000));
    console.log(`G4F API started with timeout ${timeout_s}`);
  } catch (e) {
    console.log(e);
  }
};
