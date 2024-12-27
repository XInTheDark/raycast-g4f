import { OptionsComponent } from "#root/src/components/preferences/base/optionsComponent.jsx";
import { languages } from "#root/src/config/config.json";

const generalOptions = {
  defaultLanguage: {
    title: "Default Language",
    description: "The default language used in AI responses. This does not affect the extension UI.",
    type: "dropdown",
    data: languages,
  },
  autoCheckForUpdates: {
    title: "Automatically Check for Updates",
    description: "Automatically check for updates from the official GitHub source.",
    required: false,
    type: "checkbox",
  },
  persistentStorage: {
    title: "Enable Persistent Storage",
    description: "Enable more persistent storage of the extension's data. Do not use if you have sensitive data.",
    required: false,
    type: "checkbox",
  },
  useCursorIcon: {
    title: "Enable Cursor Icon",
    description: "Show a cursor icon when the response is loading.",
    required: false,
    type: "checkbox",
  },
};

export const GeneralOptions = () => {
  return <OptionsComponent options={generalOptions} description="General settings for the extension." />;
};
