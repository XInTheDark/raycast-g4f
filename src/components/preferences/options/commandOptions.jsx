import { List, ActionPanel, Action, useNavigation, Form } from "@raycast/api";
import { useState, useEffect } from "react";

import { getBuiltinCommands } from "#root/src/helpers/commandsHelper.js";
import { ChatProvidersReact } from "#root/src/api/data/providers_react.jsx";
import { Preferences } from "#root/src/api/preferences.js";
import { updatePreferences } from "#root/src/helpers/preferences_helper.js";
import { PreferenceComponent } from "#root/src/components/preferences/base/preferenceComponent.jsx";

// Component to edit the model for a specific command
const CommandModelForm = ({ commandId, commandTitle }) => {
  const { pop } = useNavigation();
  const commandOptions = Preferences["commandOptions"] || {};
  const defaultModel = commandOptions[commandId]?.commandProvider || "";

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Save"
            onSubmit={async (values) => {
              const newCommandOptions = { ...commandOptions };
              if (!newCommandOptions[commandId]) {
                newCommandOptions[commandId] = {};
              }
              newCommandOptions[commandId].commandProvider = values.model;

              await updatePreferences("commandOptions", newCommandOptions);
              pop();
            }}
          />
        </ActionPanel>
      }
    >
      <Form.Description text={`Configure model options for "${commandTitle}"`} />
      <Form.Dropdown id="model" title="Model" defaultValue={defaultModel}>
        <Form.Dropdown.Item title="Use Default Model" value="" />
        {ChatProvidersReact()}
      </Form.Dropdown>
    </Form>
  );
};

// Component to list all commands
export const DefaultCommandOptions = () => {
  const [commands, setCommands] = useState([]);
  const commandOptions = Preferences["commandOptions"] || {};

  useEffect(() => {
    setCommands(getBuiltinCommands());
  }, []);

  return (
    <List searchBarPlaceholder="Search commands...">
      {commands.map((command) => {
        const selectedModel = commandOptions[command.id]?.commandProvider;
        const accessories = selectedModel ? [{ tag: selectedModel }] : [{ tag: "Default" }];

        return (
          <PreferenceComponent
            key={command.id}
            title={command.title}
            subtitle={command.description}
            accessories={accessories}
            target={<CommandModelForm commandId={command.id} commandTitle={command.title} />}
          />
        );
      })}
    </List>
  );
};
