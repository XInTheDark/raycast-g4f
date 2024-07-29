import { getG4FExecutablePath, getG4FTimeout, DEFAULT_TIMEOUT, getG4FModelsComponent } from "./api/Providers/g4f_local";
import { getOllamaAPIPath, getOllamaCtxSize, getOllamaModelsComponent } from "./api/Providers/ollama_local";
import { Storage } from "./api/storage";
import { help_action } from "./helpers/helpPage";

import { Form, ActionPanel, Action, useNavigation, showToast, Toast } from "@raycast/api";
import { useState, useEffect } from "react";

export default function ConfigureLocalAPIs() {
  const [g4fExePath, setG4fExePath] = useState("");
  const [g4fTimeout, setG4fTimeout] = useState("");
  const [g4fModelsComponent, setG4fModelsComponent] = useState(null);
  const [ollamaAPIPath, setOllamaAPIPath] = useState("");
  const [ollamaModelsComponent, setOllamaModelsComponent] = useState(null);
  const [ollamaCtxSize, setOllamaCtxSize] = useState("");
  const [rendered, setRendered] = useState(false);

  useEffect(() => {
    (async () => {
      setG4fExePath(await getG4FExecutablePath());
      setG4fTimeout((await getG4FTimeout()).toString());
      setG4fModelsComponent(await getG4FModelsComponent());
      setOllamaAPIPath(await getOllamaAPIPath());
      setOllamaModelsComponent(await getOllamaModelsComponent());
      setOllamaCtxSize((await getOllamaCtxSize()).toString());
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
              await Storage.write("g4f_executable", values.g4f_executable);
              await Storage.write("g4f_timeout", values.g4f_timeout || DEFAULT_TIMEOUT);
              await Storage.write(
                "g4f_info",
                JSON.stringify({ model: values.g4f_model, provider: values.g4f_provider.trim() })
              );

              await Storage.write("ollama_api", values.ollama_api);
              await Storage.write("ollama_model", JSON.stringify({ model: values.ollama_model }));
              await Storage.write("ollama_ctx_size", values.ollama_ctx_size);
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
