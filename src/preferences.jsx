import { List, Action, Form, ActionPanel, useNavigation } from "@raycast/api";

import { ChatProvidersReact } from "#root/src/api/providers_react.jsx";
import { Preferences, updatePreferences } from "#root/src/api/preferences.js";
import { ManageCustomAPIs, ManageGoogleGeminiAPI } from "#root/src/components/manageCustomAPIs.jsx";
import { ManageAIPresets } from "#root/src/components/manageAIPresets.jsx";

// Section 1. Default Provider selection
const DefaultProvider = () => {
  const providersReact = ChatProvidersReact;
  const { pop } = useNavigation();
  return (
    <>
      <Form
        actions={
          <ActionPanel>
            <Action.SubmitForm
              title="Save"
              onSubmit={async (values) => {
                await updatePreferences("defaultProvider", values.defaultProvider);
                pop();
              }}
            />
          </ActionPanel>
        }
      >
        <Form.Dropdown id={"defaultProvider"} title={"Default Provider"} defaultValue={Preferences["defaultProvider"]}>
          {providersReact}
        </Form.Dropdown>
      </Form>
    </>
  );
};

export default function ManagePreferences() {
  return (
    <List>
      <List.Section title="Defaults">
        <List.Item
          title={"Default Provider"}
          actions={
            <ActionPanel>
              <Action.Push title="Open" target={<DefaultProvider />} />
            </ActionPanel>
          }
        />
      </List.Section>

      <List.Section title="Manage APIs">
        {/* - OpenAI-compatible APIs */}
        <List.Item
          title="Custom OpenAI-compatible APIs"
          actions={
            <ActionPanel>
              <Action.Push title="Open" target={<ManageCustomAPIs />} />
            </ActionPanel>
          }
        />

        {/* - Google Gemini */}
        <List.Item
          title="Google Gemini"
          actions={
            <ActionPanel>
              <Action.Push title="Open" target={<ManageGoogleGeminiAPI />} />
            </ActionPanel>
          }
        />
      </List.Section>

      {/* AI Presets */}
      <List.Section title="AI Presets">
        <List.Item
          title="Manage AI Presets"
          actions={
            <ActionPanel>
              <Action.Push title="Open" target={<ManageAIPresets />} />
            </ActionPanel>
          }
        />
      </List.Section>
    </List>
  );
}
