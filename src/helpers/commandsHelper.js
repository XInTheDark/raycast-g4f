import packageJson from "../../package.json";
import { Preferences } from "#root/src/api/preferences.js";

export const getBuiltinCommands = () => {
  return packageJson.commands
    .filter(() => true)
    .map((command) => ({
      id: command.name,
      title: command.title,
      description: command.description || "",
    }));
};

// Get the command provider preference
export const getCommandProvider = (commandId) => {
  if (commandId && Preferences["commandOptions"]?.[commandId]?.commandProvider) {
    return Preferences["commandOptions"][commandId].commandProvider;
  }
  return Preferences["defaultProvider"];
};
