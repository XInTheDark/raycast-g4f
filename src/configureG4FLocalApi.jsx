import { getG4FExecutablePath, getG4FTimeout, DEFAULT_TIMEOUT, getG4FModelsDropdown } from "./api/Providers/g4f_local";
import { Storage } from "./api/storage";
import { Form, ActionPanel, Action, useNavigation, showToast, Toast } from "@raycast/api";
import { useState, useEffect } from "react";

export default function ConfigureG4FLocalApi() {
  const [executablePath, setExecutablePath] = useState("");
  const [timeout, setTimeout] = useState("");
  const [modelsDropdown, setModelsDropdown] = useState([]);
  const [rendered, setRendered] = useState(false);

  const { pop } = useNavigation();

  useEffect(() => {
    (async () => {
      setExecutablePath(await getG4FExecutablePath());
      setTimeout((await getG4FTimeout()).toString());
      setModelsDropdown(await getG4FModelsDropdown());
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
              await Storage.write("g4f_model", values.model);
              await showToast(Toast.Style.Success, "Configuration Saved");
            }}
          />
        </ActionPanel>
      }
    >
      <Form.Description text="Configure the GPT4Free Local API. Select 'Help' for the installation guide." />
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
      {modelsDropdown}
    </Form>
  );
}
