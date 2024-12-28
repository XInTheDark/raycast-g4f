import { Action, ActionPanel, Form, useNavigation } from "@raycast/api";
import { Preferences } from "#root/src/api/preferences.js";
import { updatePreferences } from "#root/src/helpers/preferences_helper.js";

// convert legacy JSON data to react component
// this should be reworked at some point
// data is an array of {title, value} objects
const legacyDataToComponent = (data) => {
  return data.map(({ title, value }) => {
    return <Form.Dropdown.Item title={title} key={value} value={value} />;
  });
};

export const ValueDropdown = ({
  id,
  title,
  description,
  dropdownComponent = null,
  legacyData = null,
  onPreferenceUpdate,
}) => {
  if (!dropdownComponent) {
    dropdownComponent = legacyDataToComponent(legacyData);
  }

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
        <Form.Dropdown id={id} title={title} defaultValue={Preferences[id]}>
          {dropdownComponent}
        </Form.Dropdown>
      </Form>
    </>
  );
};
