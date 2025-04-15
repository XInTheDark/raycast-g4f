import { Action, ActionPanel, Detail, Form, Icon, List, showToast, Toast, useNavigation } from "@raycast/api";

import { Storage } from "#root/src/api/storage.js";
import { Preferences } from "#root/src/api/preferences.js";
import { updatePreferences } from "#root/src/helpers/preferences_helper.js";
import { init } from "#root/src/api/init.js";
import { plainTextMarkdown } from "#root/src/helpers/markdown.js";

// Initialize necessary modules
init();

// Reusable component for showing an item's value
const ShowItemDetail = ({ itemKey, itemValue }) => {
  const { pop } = useNavigation();
  const formattedValue = typeof itemValue === "object" ? JSON.stringify(itemValue, null, 2) : String(itemValue);

  return (
    <Detail
      markdown={`# ${itemKey}\n\n${plainTextMarkdown(formattedValue)}`}
      actions={
        <ActionPanel>
          <Action title="Back" icon={Icon.ArrowLeft} onAction={pop} />
          <Action.CopyToClipboard title="Copy Value" content={formattedValue} />
        </ActionPanel>
      }
    />
  );
};

// Reusable component for a form to set a key-value pair
const SetItemForm = ({ title, onSubmit, keyLabel = "Key", valueLabel = "Value" }) => {
  const { pop } = useNavigation();

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title={`Set ${title}`}
            onSubmit={async (values) => {
              if (!values.key || !values.value) {
                showToast(Toast.Style.Failure, "Both key and value are required.");
                return;
              }
              try {
                await onSubmit(values.key, values.value);
                showToast(Toast.Style.Success, `${title} updated`, `Key: ${values.key}`);
                pop();
              } catch (error) {
                console.error(`Error setting ${title}:`, error);
                showToast(Toast.Style.Failure, `Failed to set ${title}`, error.message);
              }
            }}
          />
        </ActionPanel>
      }
    >
      <Form.TextField id="key" title={keyLabel} placeholder={`Enter the ${keyLabel.toLowerCase()}`} />
      <Form.TextArea id="value" title={valueLabel} placeholder={`Enter the ${valueLabel.toLowerCase()}`} />
    </Form>
  );
};

// Reusable component for a form to get a key for showing its value
const ShowItemForm = ({ title, onSubmit, keyLabel = "Key" }) => {
  const { push } = useNavigation();

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title={`Show ${title}`}
            onSubmit={async (values) => {
              if (!values.key) {
                showToast(Toast.Style.Failure, "Key is required.");
                return;
              }
              try {
                const value = await onSubmit(values.key);
                if (value === undefined || value === null) {
                  showToast(Toast.Style.Failure, `${title} Key Not Found`, `Key: ${values.key}`);
                } else {
                  push(<ShowItemDetail itemKey={values.key} itemValue={value} />);
                }
              } catch (error) {
                console.error(`Error showing ${title}:`, error);
                showToast(Toast.Style.Failure, `Failed to show ${title}`, error.message);
              }
            }}
          />
        </ActionPanel>
      }
    >
      <Form.TextField id="key" title={keyLabel} placeholder={`Enter the ${keyLabel.toLowerCase()} to show`} />
    </Form>
  );
};

// Main Dev Panel Component
export default function DevPanel() {
  return (
    <List>
      <List.Item
        title="Set Storage Item"
        icon={Icon.TextInput}
        actions={
          <ActionPanel>
            <Action.Push
              title="Set Storage Item"
              target={<SetItemForm title="Storage" onSubmit={Storage.write} />}
              icon={Icon.TextInput}
            />
          </ActionPanel>
        }
      />
      <List.Item
        title="Show Storage Item"
        icon={Icon.MagnifyingGlass}
        actions={
          <ActionPanel>
            <Action.Push
              title="Show Storage Item"
              target={<ShowItemForm title="Storage" onSubmit={Storage.read} />}
              icon={Icon.MagnifyingGlass}
            />
          </ActionPanel>
        }
      />
      <List.Item
        title="Set Preference"
        icon={Icon.Gear}
        actions={
          <ActionPanel>
            <Action.Push
              title="Set Preference"
              target={
                <SetItemForm
                  title="Preference"
                  onSubmit={async (key, value) => {
                    // Attempt to parse value if it looks like JSON/boolean/number
                    let parsedValue = value;
                    try {
                      parsedValue = JSON.parse(value);
                    } catch (e) {
                      // Ignore error, keep as string
                    }
                    await updatePreferences(key, parsedValue);
                  }}
                />
              }
              icon={Icon.Gear}
            />
          </ActionPanel>
        }
      />
      <List.Item
        title="Show Preference"
        icon={Icon.Eye}
        actions={
          <ActionPanel>
            <Action.Push
              title="Show Preference"
              target={
                <ShowItemForm
                  title="Preference"
                  onSubmit={async (key) => {
                    return Preferences[key];
                  }}
                />
              }
              icon={Icon.Eye}
            />
          </ActionPanel>
        }
      />
    </List>
  );
}
