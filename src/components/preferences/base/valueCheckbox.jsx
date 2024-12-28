import { Action, ActionPanel, Form, useNavigation } from "@raycast/api";
import { Preferences } from "#root/src/api/preferences.js";
import { updatePreferences } from "#root/src/helpers/preferences_helper.js";

export const ValueCheckbox = ({ id, title, description, onPreferenceUpdate }) => {
  const { pop } = useNavigation();
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
        <Form.Checkbox id={id} label={title} defaultValue={Preferences[id]} />
      </Form>
    </>
  );
};
