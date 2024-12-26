import { Action, ActionPanel, Form, useNavigation } from "@raycast/api";
import { Preferences, updatePreferences } from "#root/src/api/preferences.js";

// convert legacy JSON data to react component
// this should be reworked at some point
// data is an array of {title, value} objects
const legacyDataToComponent = (data) => {
  return data.map(({ title, value }) => {
    return <Form.Dropdown.Item title={title} key={value} value={value} />;
  });
};

export const ValueDropdown = ({ id, title, description, dropdownComponent = null, legacyData = null }) => {
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
