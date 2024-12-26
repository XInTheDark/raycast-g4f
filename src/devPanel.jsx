import { Storage } from "#root/src/api/storage.js";
import { Form, List, ActionPanel, Action, Toast, showToast } from "@raycast/api";

const SetStorage = () => {
  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Save"
            onSubmit={async (values) => {
              await Storage.write(values.key, values.value);
              await showToast(Toast.Style.Success, "Saved");
            }}
          />
        </ActionPanel>
      }
    >
      <Form.TextField id="key" title="Key" />
      <Form.TextField id="value" title="Value" />
    </Form>
  );
};

export default function DevPanel() {
  return (
    <List>
      <List.Section title="Storage">
        <List.Item
          title="Set Storage"
          actions={
            <ActionPanel>
              <Action.Push target={<SetStorage />} title="Set Storage" />
            </ActionPanel>
          }
        />
      </List.Section>
    </List>
  );
}
