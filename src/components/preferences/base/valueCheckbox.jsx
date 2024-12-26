import { Action, ActionPanel, Form, useNavigation } from "@raycast/api";
import { Preferences, updatePreferences } from "#root/src/api/preferences.js";

export const ValueCheckbox = ({ id, title, description }) => {
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
