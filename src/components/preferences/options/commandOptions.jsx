import { useState, useEffect } from "react";
import { getBuiltinCommands } from "#root/src/helpers/commandsHelper.js";
import { ChatProvidersReact } from "#root/src/api/data/providers_react.jsx";
import { OptionsComponent } from "#root/src/components/preferences/base/optionsComponent.jsx";
import { Preferences } from "#root/src/api/preferences.js";
import { updatePreferences } from "#root/src/helpers/preferences_helper.js";

export const DefaultCommandOptions = () => {
  const [commandOptionsConfig, setCommandOptionsConfig] = useState({});

  useEffect(() => {
    const buildCommandOptions = async () => {
      const commands = getBuiltinCommands();
      const options = {};

      commands.forEach((command) => {
        const commandId = command.id;
        options[`command_${commandId}`] = {
          listTitle: command.title,
          listDescription: command.description,
          title: "Model",
          description: `Set the default model for "${command.title}"`,
          type: "dropdown",
          dropdownComponent: ChatProvidersReact,
          // Custom handler
          getValue: () => {
            return Preferences.commandOptions?.[commandId]?.commandProvider || "Default";
          },
          setValue: async (value) => {
            const currentCommandOptions = Preferences.commandOptions || {};
            const updatedCommandOptions = { ...currentCommandOptions };

            if (!updatedCommandOptions[commandId]) {
              updatedCommandOptions[commandId] = {};
            }

            updatedCommandOptions[commandId].commandProvider = value;
            await updatePreferences("commandOptions", updatedCommandOptions);
          },
        };
      });

      setCommandOptionsConfig(options);
    };

    buildCommandOptions();
  }, []);

  return <OptionsComponent options={commandOptionsConfig} description="Set default models for each command" />;
};
