import { getG4FExecutablePath, getG4FTimeout, DEFAULT_TIMEOUT, getG4FModelsComponent } from "./api/Providers/g4f_local";
import { getOllamaModelsComponent } from "./api/Providers/ollama_local";
import { Storage } from "./api/storage";
import { help_action } from "./helpers/helpPage";

import { Form, ActionPanel, Action, useNavigation, showToast, Toast } from "@raycast/api";
import { useState, useEffect } from "react";

export default function ConfigureLocalAPIs() {
  const [executablePath, setExecutablePath] = useState("");
  const [timeout, setTimeout] = useState("");
  const [g4fModelsComponent, setG4fModelsComponent] = useState(null);
  const [ollamaModelsComponent, setOllamaModelsComponent] = useState(null);
  const [rendered, setRendered] = useState(false);

  const { pop } = useNavigation();

  useEffect(() => {
    (async () => {
      setExecutablePath(await getG4FExecutablePath());
      setTimeout((await getG4FTimeout()).toString());
      setG4fModelsComponent(await getG4FModelsComponent());
      setOllamaModelsComponent(await getOllamaModelsComponent());
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
              pop();
              await Storage.write("g4f_executable", values.g4f_executable);
              await Storage.write("g4f_timeout", values.g4f_timeout || DEFAULT_TIMEOUT);
              await Storage.write(
                "g4f_info",
                JSON.stringify({ model: values.g4f_model, provider: values.g4f_provider.trim() })
              );
              await Storage.write("ollama_model", JSON.stringify({ model: values.ollama_model }));
              await showToast(Toast.Style.Success, "Configuration Saved");
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
        value={executablePath}
        onChange={(x) => {
          if (rendered) setExecutablePath(x);
        }}
      />
      <Form.TextField
        id="g4f_timeout"
        title="G4F API Timeout (in seconds)"
        info="After this timeout, the G4F API will be stopped. It will be automatically started again when used. This saves resources when the API is not in use."
        value={timeout}
        onChange={(x) => {
          if (rendered) setTimeout(x);
        }}
      />
      {g4fModelsComponent}
      {ollamaModelsComponent}
    </Form>
  );
}
