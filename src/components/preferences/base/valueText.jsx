import { Action, ActionPanel, Form, useNavigation } from "@raycast/api";
import { Preferences, updatePreferences } from "#root/src/api/preferences.js";

export const ValueText = ({ id, title, description, type = "TextField", onPreferenceUpdate }) => {
  const { pop } = useNavigation();
  const props = { id, title, description, defaultValue: Preferences[id] };

  return (
    <>
      <Form
        actions={
          <ActionPanel>
            <Action.SubmitForm
              title="Save"
              onSubmit={async (values) => {
                await updatePreferences(id, values[id]);
                onPreferenceUpdate?.();
                pop();
              }}
            />
          </ActionPanel>
        }
      >
        {description && <Form.Description text={description} />}
        {type === "TextField" ? <Form.TextField {...props} /> : <Form.TextArea {...props} />}
      </Form>
    </>
  );
};
