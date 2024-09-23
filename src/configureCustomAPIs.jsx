import {
  getG4FExecutablePath,
  getG4FTimeout,
  DEFAULT_TIMEOUT,
  getG4FModelsComponent,
  getCustomAPIInfo,
} from "./api/Providers/g4f_local";
import { getOllamaAPIPath, getOllamaCtxSize, getOllamaModelsComponent } from "./api/Providers/ollama_local";
import { Storage } from "./api/storage";
import { help_action } from "./helpers/helpPage";

import { Form, ActionPanel, Action, showToast, Toast } from "@raycast/api";
import { useState, useEffect } from "react";

export default function ConfigureCustomAPIs() {
  const [g4fExePath, setG4fExePath] = useState("");
  const [g4fTimeout, setG4fTimeout] = useState("");
  const [g4fModelsComponent, setG4fModelsComponent] = useState(null);
  const [ollamaAPIPath, setOllamaAPIPath] = useState("");
  const [ollamaModelsComponent, setOllamaModelsComponent] = useState(null);
  const [ollamaCtxSize, setOllamaCtxSize] = useState("");
  const [rendered, setRendered] = useState(false);

  useEffect(() => {
    (async () => {
      const apiInfo = await getCustomAPIInfo();

      setG4fExePath(await getG4FExecutablePath(apiInfo));
      setG4fTimeout(await getG4FTimeout(apiInfo));
      setG4fModelsComponent(await getG4FModelsComponent(apiInfo));
      setOllamaAPIPath(await getOllamaAPIPath(apiInfo));
      setOllamaModelsComponent(await getOllamaModelsComponent(apiInfo));
      setOllamaCtxSize((await getOllamaCtxSize(apiInfo)).toString());
      setRendered(true);
    })();
  }, []);

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Save"
            onSubmit={async (values) => {
              values.g4f_timeout = values.g4f_timeout || DEFAULT_TIMEOUT;
              values.g4f_info = JSON.stringify({ model: values.g4f_model, provider: values.g4f_provider.trim() });
              delete values.g4f_model;
              delete values.g4f_provider;
              values.ollama_model = JSON.stringify({ model: values.ollama_model });

              let info = await getCustomAPIInfo();
              info = { ...info, ...values };

              await Storage.write("customApiInfo", JSON.stringify(info));
              await showToast(Toast.Style.Success, "Configuration saved");
            }}
          />
          {help_action("localAPI")}
        </ActionPanel>
      }
    >
      <Form.Description text="Configure the GPT4Free and Ollama Local APIs. Select 'Help' for the full guide." />
      <Form.TextField
        id="g4f_executable"
        title="G4F Executable Path"
        value={g4fExePath}
        onChange={(x) => {
          if (rendered) setG4fExePath(x);
        }}
      />
      <Form.TextField
        id="g4f_timeout"
        title="G4F API Timeout (in seconds)"
        info="After this timeout, the G4F API will be stopped. It will be automatically started again when used. This saves resources when the API is not in use."
        value={g4fTimeout}
        onChange={(x) => {
          if (rendered) setG4fTimeout(x);
        }}
      />
      {g4fModelsComponent}

      <Form.Separator />

      <Form.TextField
        id="ollama_api"
        title="Ollama API Path"
        value={ollamaAPIPath}
        onChange={(x) => {
          if (rendered) setOllamaAPIPath(x);
        }}
        onBlur={async (event) => {
          const path = event.target.value;
          setOllamaModelsComponent(await getOllamaModelsComponent(await getCustomAPIInfo(), path));
        }}
      />
      {ollamaModelsComponent}
      <Form.TextField
        id="ollama_ctx_size"
        title="Ollama Context Size"
        info="Context size (in tokens) when running inference with Ollama."
        value={ollamaCtxSize}
        onChange={(x) => {
          if (rendered) setOllamaCtxSize(x);
        }}
      />
    </Form>
  );
}
